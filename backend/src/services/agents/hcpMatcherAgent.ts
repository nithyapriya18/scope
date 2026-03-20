/**
 * HCP Matcher / Feasibility Agent — Step 7
 * Assesses recruitment feasibility and derives CPI from the full rate card.
 * Fully AI-driven: GOAL / INPUTS / OUTPUT REQUIREMENTS pattern.
 * AI does all semantic matching, CPI derivation, and feasibility verdict.
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';
import fs from 'fs';
import path from 'path';

function loadJson(filename: string): any {
  const p = path.join(__dirname, '../../../config', filename);
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

export class HCPMatcherAgent extends BaseAgent {
  protected agentType = 'hcp_matching';

  protected getSystemPrompt(_context: AgentContext): string {
    return `You are a Senior Panel & Feasibility Specialist at PetaSight, a pharma market research firm.
Your job is to assess HCP recruitment feasibility and estimate cost-per-interview (CPI) from the
rate card for a pharma RFP. Use the FULL panel database and rate card provided — do not invent numbers.
Output ONLY valid JSON. No markdown, no commentary.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const sql = getSql();

      const [[opp], [brief]] = await Promise.all([
        sql`SELECT email_body, rfp_title, client_name, therapeutic_area, geography FROM opportunities WHERE id = ${context.opportunityId}`,
        sql`SELECT id, target_audience, therapeutic_area, study_type, sample_requirements,
                   timeline_requirements, raw_extraction
            FROM briefs WHERE opportunity_id = ${context.opportunityId}
            ORDER BY created_at DESC LIMIT 1`,
      ]);

      if (!brief) return { success: false, error: 'No brief found for this opportunity' };

      const panelData = loadJson('hcp_panel.json');
      const rateCard = loadJson('rate_card.json');

      const rx: any = brief.raw_extraction || {};
      const sampleSection = rx.section8_target_audience_sample || {};
      const methodSection = rx.section6_methodology_scope || {};

      const geographies: string[] = Array.isArray(opp?.geography) ? opp.geography
        : (typeof opp?.geography === 'string' ? JSON.parse(opp.geography || '[]') : []);

      const userMessage = `
=== GOAL ===
Assess HCP recruitment feasibility for this pharma RFP using PetaSight's panel database.
Identify the correct specialty/country combinations for the study, determine panel availability,
and derive CPI estimates from the rate card. Produce a feasibility verdict and a recommended
per-interview cost for the WBS pricing step.

=== INPUT 1: FULL RFP TEXT ===
${opp?.email_body || 'Not available — use brief sections below'}

=== INPUT 2: STRUCTURED BRIEF ===
Therapeutic area: ${brief.therapeutic_area || opp?.therapeutic_area || 'unknown'}
Target audience: ${brief.target_audience || 'unknown'}
Study type: ${brief.study_type || 'unknown'}
Geography: ${geographies.join(', ') || 'Not specified'}
Sample requirements: ${JSON.stringify(brief.sample_requirements || {})}
Target sample size (from brief): ${sampleSection.targetSampleSize || 'Not specified'}
Sample breakdown: ${JSON.stringify(sampleSection.sampleBreakdown || {})}
Methodology: ${methodSection.primaryMethodology || 'Not specified'}
LOI: ${methodSection.loi || 'Not specified — assume 30 minutes if qualitative, 20 minutes if quantitative'}

=== INPUT 3: PETASIGHT HCP PANEL DATABASE ===
${JSON.stringify(panelData, null, 2)}

=== INPUT 4: PETASIGHT RATE CARD ===
CPI = recruitment fee + HCP incentive. Rate card keys: specialty group → LOI → country.
Specialty group mapping is in the specialtyGroups object.
${JSON.stringify(rateCard, null, 2)}

=== OUTPUT REQUIREMENTS ===
Return a JSON object with ALL of the following:

1. matchedSpecialties: array of specialties AI identified as relevant to this RFP — each item:
   {specialty, country, panelSize, activeRate, activePool, recruitmentWeeks, group}
   - Use EXACT specialty names from the panel database
   - Match ALL relevant countries from the brief geography
   - If a specialty is not in the panel, note it in notes field but still include it with 0 panel

2. estimatedCpi: CPI per matched specialty/country/LOI — each item:
   {specialty, country, loiMinutes, recruitmentFee, incentive, cpiAmount, group}
   - Look up recruitment fee from rate_card.recruitment[groupN][loi][country]
   - Look up incentive from rate_card.incentive[groupN][loi][country]
   - CPI = recruitment fee + incentive
   - Use the LOI from the brief (default 30 min for qualitative, 20 min for quantitative)

3. recruitmentRatio: {targetN, contactsNeeded, universeSize, ratio}
   - contactsNeeded = targetN × 3 (standard 3:1 contact-to-complete ratio)
   - universeSize = sum of activePool across all matched specialties/countries
   - ratio = universeSize / targetN

4. feasibilityVerdict: "FEASIBLE" | "CHALLENGING" | "IMPOSSIBLE"
   - FEASIBLE: ratio ≥ 3, all specialties available in target countries
   - CHALLENGING: ratio 1.5-3, or some specialties limited in target countries
   - IMPOSSIBLE: ratio < 1.5, or critical specialties absent from panel in target countries

5. feasibilityScore: 0-100 integer (higher = more feasible)

6. overall_feasibility: {feasibilityScore, riskLevel: "LOW"|"MEDIUM"|"HIGH", summary, keyRisks[], recommendations[]}

7. geographic_feasibility: array per country — {market, panelDepth, recruitmentWeeks, riskLevel, notes}

8. hcp_availability: same as matchedSpecialties but formatted for DB storage

9. backupOptions: array of alternative specialties or countries if verdict is CHALLENGING/IMPOSSIBLE

10. recommendedCpiForBudget: single CPI number (USD) PetaSight should use for WBS estimation.
    Use the weighted average CPI across all matched specialty/country/LOI combinations.

11. recommendations: string array of 3-5 actionable recommendations

Return ONLY the JSON object. No markdown.`;

      const responseText = await this.invokeAI(this.getSystemPrompt(context), userMessage, context);

      let result: any;
      try {
        let json = responseText.trim();
        if (json.startsWith('```')) json = json.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        const jsonMatch = json.match(/\{[\s\S]*\}/);
        result = JSON.parse(jsonMatch ? jsonMatch[0] : json);
      } catch {
        console.error('HCPMatcherAgent: failed to parse JSON:', responseText.substring(0, 300));
        return { success: false, error: 'Failed to parse AI response as JSON' };
      }

      const [inserted] = await sql`
        INSERT INTO feasibility_assessments (
          opportunity_id,
          brief_id,
          overall_feasibility,
          geographic_feasibility,
          vendor_assessment,
          hcp_availability,
          risk_factors,
          recommendations,
          llm_result,
          created_at
        ) VALUES (
          ${context.opportunityId},
          ${brief.id},
          ${JSON.stringify(result.overall_feasibility || result.overallFeasibility || {})}::jsonb,
          ${JSON.stringify(result.geographic_feasibility || result.geographicFeasibility || [])}::jsonb,
          ${JSON.stringify([])}::jsonb,
          ${JSON.stringify(result.hcp_availability || result.matchedSpecialties || [])}::jsonb,
          ${JSON.stringify(result.overall_feasibility?.keyRisks || [])}::jsonb,
          ${JSON.stringify(result.recommendations || [])}::jsonb,
          ${JSON.stringify(result)}::jsonb,
          now()
        )
        RETURNING id
      `;

      console.log(`✅ HCP feasibility complete: ${result.feasibilityVerdict} | CPI=$${result.recommendedCpiForBudget}`);
      console.log(`   Matched specialties: ${(result.matchedSpecialties || []).length}`);
      console.log(`   Recruitment ratio: ${result.recruitmentRatio?.ratio?.toFixed(1)}x`);

      return {
        success: true,
        data: {
          feasibilityId: inserted.id,
          feasibilityVerdict: result.feasibilityVerdict,
          matchedSpecialties: result.matchedSpecialties || [],
          estimatedCpi: result.estimatedCpi || [],
          recommendedCpiForBudget: result.recommendedCpiForBudget,
          recruitmentRatio: result.recruitmentRatio || {},
          overallFeasibility: result.overall_feasibility || result.overallFeasibility || {},
        },
        metadata: { confidence: (result.feasibilityScore || 70) / 100 },
      };
    } catch (error: any) {
      console.error('HCPMatcherAgent error:', error);
      return { success: false, error: error.message };
    }
  }
}
