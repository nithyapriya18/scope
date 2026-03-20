import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

export class AssumptionAnalyzerAgent extends BaseAgent {
  protected agentType = 'assumption_analysis';

  protected getSystemPrompt(_context: AgentContext): string {
    return `You are a Senior PMR Research Strategist at PetaSight, a pharma market research firm.
Your job is to classify every assumption as either PetaSight-owned (we decide unilaterally) or
client-dependent (we need client input), determine whether the brief is ready to design from,
and identify any risks or clashes that could affect the proposal.
Output ONLY valid JSON. No markdown, no commentary.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const sql = getSql();

      const [[opp], [brief], [gapAnalysis]] = await Promise.all([
        sql`SELECT email_body, rfp_title, client_name, therapeutic_area FROM opportunities WHERE id = ${context.opportunityId}`,
        sql`SELECT id, tenant_id, study_type, target_audience, therapeutic_area,
                   research_objectives, sample_requirements, timeline_requirements,
                   deliverables, budget_indication, raw_extraction
            FROM briefs WHERE opportunity_id = ${context.opportunityId}
            ORDER BY created_at DESC LIMIT 1`,
        sql`SELECT llm_analysis, missing_fields, ambiguous_requirements
            FROM gap_analyses ga JOIN briefs b ON ga.brief_id = b.id
            WHERE b.opportunity_id = ${context.opportunityId}
            ORDER BY ga.created_at DESC LIMIT 1`,
      ]);

      if (!brief) return { success: false, error: 'No brief found for this opportunity' };

      const rx: any = brief.raw_extraction || {};
      const rfpText = opp?.email_body || '';
      const rfpSnippet = rfpText.length > 4000
        ? rfpText.slice(0, 4000) + '\n...[truncated — brief extraction above covers full content]'
        : rfpText || 'Not available — use brief sections below';

      const userMessage = `
=== GOAL ===
Classify every assumption required to design a research proposal for this RFP.
For each assumption: is it PetaSight-owned (we decide unilaterally based on expertise) or
client-dependent (the client must confirm before we can proceed)?
Assess overall design readiness and identify any clashes or risks.

=== INPUT 1: RFP TEXT (first 4000 chars) ===
${rfpSnippet}

=== INPUT 2: STRUCTURED BRIEF (from Step 2) ===
Study type: ${brief.study_type || 'unknown'}
Therapeutic area: ${brief.therapeutic_area || 'unknown'}
Target audience: ${brief.target_audience || 'unknown'}
Research objectives: ${JSON.stringify(brief.research_objectives || [])}
Sample requirements: ${JSON.stringify(brief.sample_requirements || {})}
Timeline: ${brief.timeline_requirements || 'Not specified'}
Deliverables: ${JSON.stringify(brief.deliverables || [])}
Budget: ${brief.budget_indication || 'Not disclosed'}
Full extraction: ${JSON.stringify(rx)}

=== INPUT 3: GAP ANALYSIS (from Step 3) ===
${gapAnalysis ? JSON.stringify({
  criticalGaps: gapAnalysis.missing_fields,
  ambiguous: gapAnalysis.ambiguous_requirements,
  analysis: gapAnalysis.llm_analysis,
}) : 'None available'}

=== OUTPUT REQUIREMENTS ===
Return a JSON object with ALL of the following:

1. assumptions: array of all assumptions needed to design the proposal — each item:
   {
     assumptionId: "A001", "A002", etc.,
     category: "sample" | "methodology" | "timeline" | "geography" | "scope" | "compliance",
     assumption: "The specific design decision or working assumption",
     type: "petasightOwned" | "clientDependent",
     typeRationale: "1 sentence explaining why this is petasightOwned or clientDependent",
     riskLevel: "low" | "medium" | "high",
     defaultValue: "what PetaSight will use if no client response"
   }

2. clashes: array of requirement contradictions — each item:
   {clash, elements: string[], severity: "critical"|"high"|"medium", impact, resolution}

3. feasibilityConcerns: array of delivery risks — each item:
   {concern, reason, severity: "critical"|"high"|"medium"}

4. designReadiness: "ready_to_design" | "needs_clarification" | "critical_blocker"
   - ready_to_design: enough information to write a strong proposal
   - needs_clarification: missing client-dependent info but can proceed with assumptions
   - critical_blocker: cannot design without client response (e.g., no audience defined at all)

5. designReadinessRationale: 1-2 sentences explaining the designReadiness verdict

6. overallRiskLevel: "low" | "medium" | "high"

7. recommendedClarifications: integer count of questions to send

Return ONLY the JSON object. No markdown.`;

      const response = await this.invokeAI(this.getSystemPrompt(context), userMessage, context);

      let analysis: any;
      try {
        let json = response.trim();
        if (json.startsWith('```')) json = json.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        const jsonMatch = json.match(/\{[\s\S]*\}/);
        analysis = JSON.parse(jsonMatch ? jsonMatch[0] : json);
      } catch {
        console.error('AssumptionAnalyzerAgent: failed to parse JSON:', response.substring(0, 300));
        return { success: false, error: 'Failed to parse AI response as JSON' };
      }

      const [aaRow] = await sql`
        INSERT INTO assumption_analyses (
          brief_id,
          assumptions,
          clashes,
          feasibility_concerns,
          overall_risk_level,
          recommended_clarifications,
          llm_analysis,
          created_at
        ) VALUES (
          ${brief.id},
          ${JSON.stringify(analysis.assumptions || [])}::jsonb,
          ${JSON.stringify(analysis.clashes || [])}::jsonb,
          ${JSON.stringify(analysis.feasibilityConcerns || [])}::jsonb,
          ${analysis.overallRiskLevel || 'medium'},
          ${analysis.recommendedClarifications || 0},
          ${JSON.stringify(analysis)}::jsonb,
          now()
        )
        RETURNING id
      `;

      await sql`
        UPDATE opportunities
        SET status = 'assumption_analysis', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      const petasightOwned = (analysis.assumptions || []).filter((a: any) => a.type === 'petasightOwned').length;
      const clientDependent = (analysis.assumptions || []).filter((a: any) => a.type === 'clientDependent').length;
      console.log(`✅ Assumption analysis complete: ${petasightOwned} petasightOwned, ${clientDependent} clientDependent`);
      console.log(`   designReadiness: ${analysis.designReadiness}`);

      return {
        success: true,
        data: {
          analysisId: aaRow.id,
          assumptions: analysis.assumptions || [],
          clashes: analysis.clashes || [],
          feasibilityConcerns: analysis.feasibilityConcerns || [],
          designReadiness: analysis.designReadiness || 'needs_clarification',
          overallRiskLevel: analysis.overallRiskLevel || 'medium',
          recommendedClarifications: analysis.recommendedClarifications || 0,
          currentStatus: 'assumption_analysis',
          nextStatus: 'clarification',
        },
        metadata: { confidence: analysis.overallRiskLevel === 'low' ? 0.9 : 0.7 },
      };
    } catch (error: any) {
      console.error('AssumptionAnalyzerAgent error:', error);
      return { success: false, error: error.message };
    }
  }
}
