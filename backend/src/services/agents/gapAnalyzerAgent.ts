/**
 * Gap Analyzer Agent — Step 3
 * Identifies all information gaps and produces default assumptions for every missing field.
 * Fully AI-driven: GOAL / INPUT / OUTPUT REQUIREMENTS pattern.
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

export class GapAnalyzerAgent extends BaseAgent {
  protected agentType = 'gap_analysis';

  protected getSystemPrompt(_context: AgentContext): string {
    return `You are a Senior PMR Research Strategist at PetaSight, a pharma market research firm.
Your job is to critically review a pharma RFP and the brief extracted from it, identify every
information gap, and propose concrete default assumptions PetaSight will use if the client never replies.
Output ONLY valid JSON. No markdown, no commentary.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const sql = getSql();

      const [[opp], [brief]] = await Promise.all([
        sql`SELECT email_body, rfp_title, client_name, therapeutic_area FROM opportunities WHERE id = ${context.opportunityId}`,
        sql`SELECT id, tenant_id, study_type, target_audience, therapeutic_area,
                   research_objectives, sample_requirements, timeline_requirements,
                   deliverables, budget_indication, raw_extraction, confidence_score
            FROM briefs WHERE opportunity_id = ${context.opportunityId}
            ORDER BY created_at DESC LIMIT 1`,
      ]);

      if (!brief) return { success: false, error: 'No brief found for this opportunity' };

      const rx: any = brief.raw_extraction || {};
      const rfpText = opp?.email_body || '';
      const rfpSnippet = rfpText.length > 4000
        ? rfpText.slice(0, 4000) + '\n...[truncated — brief extraction above covers full content]'
        : rfpText || 'Not available — use brief sections below';

      const userMessage = `
=== GOAL ===
Identify every information gap in this pharma RFP. For each gap, produce a default assumption
PetaSight will use if no client response is received. Classify gaps as critical (blocks research design)
or helpful (improves quality). Determine whether a clarification email should be sent.

=== INPUT 1: RFP TEXT (first 4000 chars) ===
${rfpSnippet}

=== INPUT 2: STRUCTURED BRIEF (from Step 2) ===
Study type: ${brief.study_type || 'unknown'}
Therapeutic area: ${brief.therapeutic_area || 'unknown'}
Target audience: ${brief.target_audience || 'unknown'}
Research objectives: ${JSON.stringify(brief.research_objectives || [])}
Sample requirements: ${JSON.stringify(brief.sample_requirements || {})}
Timeline requirements: ${brief.timeline_requirements || 'Not specified'}
Deliverables: ${JSON.stringify(brief.deliverables || [])}
Budget indication: ${brief.budget_indication || 'Not disclosed'}
Full extraction (raw_extraction):
${JSON.stringify(rx)}

=== OUTPUT REQUIREMENTS ===
Return a JSON object with ALL of the following:

1. criticalGaps: array of gaps that BLOCK research design — each item:
   {field, section, currentValue, reason, defaultAssumption, assumptionRationale}
   Examples: null sampleSize, missing methodology, no geography, no target audience

2. helpfulGaps: array of gaps that would IMPROVE quality but are NOT blockers — each item:
   {field, section, currentValue, reason, defaultAssumption, assumptionRationale}
   Examples: unclear LOI, no budget range, missing evaluation criteria

3. ambiguousRequirements: array of fields with vague or multi-interpretable values — each item:
   {field, section, currentValue, ambiguity, possibleInterpretations: string[], defaultAssumption}
   Examples: "experienced doctors" (how many years?), "major markets" (which ones?), "ASAP" (exact date?)

4. conflicts: array of contradictions found in the RFP — each item:
   {field, value1, source1, value2, source2}

5. defaultAssumptions: consolidated array of ALL assumptions (from criticalGaps + helpfulGaps) — each item:
   {field, assumedValue, rationale, category: "sample"|"methodology"|"geography"|"timeline"|"scope"}

6. shouldSendClarification: boolean — true if there are ANY criticalGaps OR more than 3 ambiguousRequirements

7. clarificationPriority: "urgent"|"normal"|"low" — based on how many critical gaps exist

8. completenessScore: 0-100 integer — your assessment of how complete this brief is for design purposes
   (independent of the section-count measure: this reflects research-design readiness)

9. missing_fields: same as criticalGaps array (for backward compatibility)
10. ambiguous_requirements: same as ambiguousRequirements array (for backward compatibility)

Return ONLY the JSON object. No markdown.`;

      const response = await this.invokeAI(this.getSystemPrompt(context), userMessage, context);

      let gapAnalysis: any;
      try {
        let json = response.trim();
        if (json.startsWith('```')) json = json.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        const jsonMatch = json.match(/\{[\s\S]*\}/);
        gapAnalysis = JSON.parse(jsonMatch ? jsonMatch[0] : json);
      } catch {
        console.error('GapAnalyzerAgent: failed to parse JSON:', response.substring(0, 300));
        return { success: false, error: 'Failed to parse AI response as JSON' };
      }

      const missingFields = gapAnalysis.missing_fields || gapAnalysis.criticalGaps || [];
      const ambiguousReqs = gapAnalysis.ambiguous_requirements || gapAnalysis.ambiguousRequirements || [];

      const [gaRow] = await sql`
        INSERT INTO gap_analyses (
          brief_id,
          missing_fields,
          ambiguous_requirements,
          conflicting_info,
          llm_analysis,
          created_at
        ) VALUES (
          ${brief.id},
          ${JSON.stringify(missingFields)}::jsonb,
          ${JSON.stringify(ambiguousReqs)}::jsonb,
          ${JSON.stringify(gapAnalysis.conflicts || [])}::jsonb,
          ${JSON.stringify(gapAnalysis)}::jsonb,
          now()
        )
        RETURNING id
      `;

      await sql`
        UPDATE opportunities
        SET status = 'gap_analysis', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      console.log(`✅ Gap analysis complete: ${(gapAnalysis.criticalGaps || []).length} critical, ${(gapAnalysis.helpfulGaps || []).length} helpful, ${(gapAnalysis.ambiguousRequirements || []).length} ambiguous`);
      console.log(`   shouldSendClarification: ${gapAnalysis.shouldSendClarification}`);
      console.log(`   completenessScore: ${gapAnalysis.completenessScore}`);

      return {
        success: true,
        data: {
          gapAnalysisId: gaRow.id,
          criticalGaps: gapAnalysis.criticalGaps || [],
          helpfulGaps: gapAnalysis.helpfulGaps || [],
          ambiguousRequirements: ambiguousReqs,
          defaultAssumptions: gapAnalysis.defaultAssumptions || [],
          shouldSendClarification: gapAnalysis.shouldSendClarification ?? true,
          completenessScore: gapAnalysis.completenessScore || 0,
          currentStatus: 'gap_analysis',
          nextStatus: 'assumption_analysis',
        },
        metadata: { confidence: (gapAnalysis.completenessScore || 50) / 100 },
      };
    } catch (error: any) {
      console.error('GapAnalyzerAgent error:', error);
      return { success: false, error: error.message };
    }
  }
}
