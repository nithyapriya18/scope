/**
 * HCP Matcher / Feasibility Agent
 * Assesses recruitment feasibility using PetaSight's actual HCP panel database.
 * Feasibility = availability only. Costs (CPI) are handled by the Pricing step.
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';
import fs from 'fs';
import path from 'path';

interface PanelEntry {
  specialty: string;
  country: string;
  group: number;
  panelSize: number;
  activeRate: number;
  recruitmentWeeks: number;
}

interface HcpPanelDb {
  panel: PanelEntry[];
  specialtyAliases: Record<string, string>;
}

function loadPanelDb(): HcpPanelDb {
  const p = path.join(__dirname, '../../../config/hcp_panel.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

/** Lookup panel entries for a given specialty + countries */
function lookupPanel(db: HcpPanelDb, specialty: string, countries: string[]): PanelEntry[] {
  const normSpec = specialty.toLowerCase().trim();
  // Resolve alias
  const resolved = db.specialtyAliases[normSpec] || specialty;
  return db.panel.filter(e =>
    e.specialty.toLowerCase() === resolved.toLowerCase() &&
    (countries.length === 0 || countries.some(c => e.country.toLowerCase() === c.toLowerCase()))
  );
}

/** Map overall risk from ratio */
function riskFromRatio(ratio: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (ratio >= 3) return 'LOW';
  if (ratio >= 1.5) return 'MEDIUM';
  return 'HIGH';
}

export class HCPMatcherAgent extends BaseAgent {
  protected agentType = 'hcp_matching';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are a PMR Feasibility Specialist at PetaSight. You receive structured panel availability data from PetaSight's HCP database and must produce a concise feasibility verdict.

Your job is to:
1. Interpret the panel data provided (do NOT invent numbers — they are given to you)
2. Assess whether the required sample can realistically be recruited
3. Identify geographic risks and recommend any mitigations
4. Produce an overall feasibility verdict

Recruitment ratio interpretation:
- ≥3x needed sample available → LOW risk (GREEN)
- 1.5–3x → MEDIUM risk (YELLOW)
- <1.5x → HIGH risk (RED) — may need extended timeline or adjusted scope

Respond with this JSON (no extra text):
{
  "overallFeasibility": {
    "riskLevel": "LOW|MEDIUM|HIGH",
    "feasible": true|false,
    "summary": "2-3 sentence executive summary",
    "keyRisks": ["risk1", "risk2", "risk3"],
    "recommendations": ["rec1", "rec2", "rec3"],
    "estimatedFieldworkWeeks": <number>,
    "confidenceScore": <0-1>
  },
  "hcpAvailability": [
    { "segment": "specialty+country", "panelSize": <n>, "activePool": <n>, "neededSample": <n>, "recruitmentRatio": <n>, "riskLevel": "LOW|MEDIUM|HIGH", "recruitmentWeeks": <n>, "notes": "..." }
  ],
  "geographicFeasibility": [
    { "market": "country", "accessibility": "Open|Restricted|Challenging", "panelDepth": <n>, "recruitmentWeeks": <n>, "riskLevel": "LOW|MEDIUM|HIGH", "notes": "..." }
  ]
}`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const sql = getSql();

      const data = await sql`
        SELECT
          b.id as "briefId",
          b.target_audience as "targetAudience",
          b.therapeutic_area as "therapeuticArea",
          b.study_type as "studyType",
          b.raw_extraction as "rawExtraction",
          o.rfp_title as "rfpTitle",
          o.client_name as "clientName",
          o.geography
        FROM briefs b
        JOIN opportunities o ON b.opportunity_id = o.id
        WHERE o.id = ${context.opportunityId}
        ORDER BY b.created_at DESC
        LIMIT 1
      `;

      if (data.length === 0) {
        return { success: false, error: 'No brief found for this opportunity' };
      }

      const brief = data[0];
      const raw = brief.rawExtraction || {};
      const sampleSection = raw.section8_target_audience_sample || {};
      const timelineSection = raw.section9_timeline_key_dates || {};
      const methodSection = raw.section6_methodology_scope || {};

      const { jobQueueService } = await import('../jobQueue');
      const jobs = await jobQueueService.getJobsByOpportunity(context.opportunityId);
      const currentJob = jobs.find((j: any) => j.jobType === this.agentType && j.status === 'processing');

      if (currentJob) await jobQueueService.updateProgress(currentJob.id, 20, 'Loading HCP panel database');

      // ── Load panel DB and compute availability ────────────────────────────
      const panelDb = loadPanelDb();

      // Extract target specialties and countries from brief
      const geographies: string[] = Array.isArray(brief.geography) ? brief.geography
        : (typeof brief.geography === 'string' ? [brief.geography] : []);
      const countries = geographies.map((g: string) => g.trim()).filter(Boolean);

      // Try to extract specialty from targetAudience or therapeuticArea
      const audienceText = (brief.targetAudience || '').toLowerCase();
      const therapeuticArea = (brief.therapeuticArea || '').toLowerCase();

      // Find panel matches — try matching against known specialties
      const specialtyKeywords = [
        ...Object.keys(panelDb.specialtyAliases),
        ...panelDb.panel.map(p => p.specialty.toLowerCase()),
      ];
      const matchedSpecialties = new Set<string>();
      for (const kw of specialtyKeywords) {
        if (audienceText.includes(kw) || therapeuticArea.includes(kw)) {
          const resolved = panelDb.specialtyAliases[kw] ||
            panelDb.panel.find(p => p.specialty.toLowerCase() === kw)?.specialty;
          if (resolved) matchedSpecialties.add(resolved);
        }
      }

      // Fallback — if nothing matched, use all entries for matched countries or all entries
      let panelEntries: PanelEntry[] = matchedSpecialties.size > 0
        ? panelDb.panel.filter(e =>
            matchedSpecialties.has(e.specialty) &&
            (countries.length === 0 || countries.some(c => e.country.toLowerCase() === c.toLowerCase()))
          )
        : panelDb.panel.filter(e =>
            countries.length === 0 || countries.some(c => e.country.toLowerCase() === c.toLowerCase())
          );

      // If still nothing, use all panel entries as a fallback
      if (panelEntries.length === 0) panelEntries = panelDb.panel;

      // Cap to 20 most relevant entries to keep prompt size manageable
      if (panelEntries.length > 20) {
        panelEntries = panelEntries
          .sort((a, b) => b.panelSize - a.panelSize)
          .slice(0, 20);
      }

      const neededSample = parseInt(String(sampleSection.targetSampleSize || '50'), 10) || 50;

      // Compute availability per entry
      const availabilityData = panelEntries.map(e => {
        const activePool = Math.round(e.panelSize * e.activeRate);
        const ratio = Math.round((activePool / neededSample) * 10) / 10;
        return {
          specialty: e.specialty,
          country: e.country,
          group: e.group,
          panelSize: e.panelSize,
          activePool,
          activeRate: e.activeRate,
          recruitmentWeeks: e.recruitmentWeeks,
          neededSample,
          recruitmentRatio: ratio,
          riskLevel: riskFromRatio(ratio),
        };
      });

      if (currentJob) await jobQueueService.updateProgress(currentJob.id, 50, 'Running AI feasibility analysis');

      // ── AI interprets the panel data ──────────────────────────────────────
      const systemPrompt = this.getSystemPrompt(context);
      const userMessage = `Assess recruitment feasibility for this PMR study using the panel data below.

**Study**: ${brief.rfpTitle}
**Client**: ${brief.clientName}
**Therapeutic Area**: ${brief.therapeuticArea || 'Not specified'}
**Study Type**: ${brief.studyType || 'Not specified'}
**Methodology**: ${methodSection.researchDesign || methodSection.dataCollection || 'Not specified'}
**Target Audience**: ${brief.targetAudience || JSON.stringify(sampleSection) || 'Not specified'}
**Sample Size Needed**: ${neededSample}
**Geography**: ${countries.length > 0 ? countries.join(', ') : 'Not specified'}
**Timeline**: ${timelineSection.projectEndDate || timelineSection.contractLength || 'Not specified'}

**PetaSight Panel Availability Data** (use these exact numbers):
${JSON.stringify(availabilityData, null, 2)}

Interpret this data and return the feasibility verdict JSON. Do NOT invent numbers — use only the panelSize, activePool, recruitmentRatio values provided above. Note: costs/CPI are NOT part of feasibility — they are handled in the pricing step.`;

      // Race the AI call against a 45s timeout — if it hangs, fall through to computed fallback
      let aiResponse: string | null = null;
      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI call timed out after 45s')), 45000)
        );
        aiResponse = await Promise.race([this.invokeAI(systemPrompt, userMessage, context), timeout]);
      } catch (aiErr) {
        console.warn('HCPMatcherAgent: AI call failed/timed out — using computed fallback:', (aiErr as Error).message);
      }

      if (currentJob) await jobQueueService.updateProgress(currentJob.id, 80, 'Storing feasibility assessment');

      let result: any;
      try {
        if (!aiResponse) throw new Error('No AI response');
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        result = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
      } catch {
        // Fallback: build result from computed availability data
        const maxWeeks = Math.max(...availabilityData.map(e => e.recruitmentWeeks), 3);
        const avgRatio = availabilityData.reduce((s, e) => s + e.recruitmentRatio, 0) / (availabilityData.length || 1);
        result = {
          overallFeasibility: {
            riskLevel: riskFromRatio(avgRatio),
            feasible: avgRatio >= 1.5,
            summary: `Panel data available for ${availabilityData.length} specialty-country combinations. Average recruitment ratio: ${avgRatio.toFixed(1)}x.`,
            keyRisks: avgRatio < 1.5 ? ['Insufficient panel depth for required sample'] : [],
            recommendations: ['Monitor recruitment weekly', 'Pre-qualify respondents'],
            estimatedFieldworkWeeks: maxWeeks,
            confidenceScore: 0.75,
          },
          hcpAvailability: availabilityData.map(e => ({
            segment: `${e.specialty} — ${e.country}`,
            panelSize: e.panelSize,
            activePool: e.activePool,
            neededSample: e.neededSample,
            recruitmentRatio: e.recruitmentRatio,
            riskLevel: e.riskLevel,
            recruitmentWeeks: e.recruitmentWeeks,
            notes: '',
          })),
          geographicFeasibility: countries.map(c => {
            const countryEntries = availabilityData.filter(e => e.country.toLowerCase() === c.toLowerCase());
            const totalPanel = countryEntries.reduce((s, e) => s + e.panelSize, 0);
            const weeks = Math.max(...countryEntries.map(e => e.recruitmentWeeks), 3);
            return {
              market: c,
              accessibility: 'Open',
              panelDepth: totalPanel,
              recruitmentWeeks: weeks,
              riskLevel: totalPanel > neededSample * 3 ? 'LOW' : totalPanel > neededSample * 1.5 ? 'MEDIUM' : 'HIGH',
              notes: '',
            };
          }),
        };
      }

      // Attach raw panel data for reference in pricing step
      result._panelData = availabilityData;

      const inserted = await sql`
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
          ${brief.briefId},
          ${JSON.stringify(result.overallFeasibility || {})}::jsonb,
          ${JSON.stringify(result.geographicFeasibility || [])}::jsonb,
          ${JSON.stringify([])}::jsonb,
          ${JSON.stringify(result.hcpAvailability || [])}::jsonb,
          ${JSON.stringify(result.overallFeasibility?.keyRisks || [])}::jsonb,
          ${JSON.stringify(result.overallFeasibility?.recommendations || [])}::jsonb,
          ${JSON.stringify(result)}::jsonb,
          now()
        )
        RETURNING id
      `;

      console.log(`✅ Feasibility assessment complete for opportunity ${context.opportunityId}`);

      return {
        success: true,
        data: {
          feasibilityId: inserted[0].id,
          ...result,
        },
        metadata: {
          confidence: result.overallFeasibility?.confidenceScore || 0.80,
        },
      };
    } catch (error: any) {
      console.error('HCP matcher error:', error);
      return { success: false, error: error.message };
    }
  }
}
