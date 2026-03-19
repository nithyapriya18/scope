/**
 * HCP Matcher / Feasibility Agent
 * Assesses recruitment feasibility: HCP availability, vendor capacity, geographic coverage
 * Based on VERITY SAMPLE framework — uses brief data + AI-generated feasibility assessment
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

export class HCPMatcherAgent extends BaseAgent {
  protected agentType = 'hcp_matching';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are a PMR Feasibility Specialist at PetaSight, assessing whether a study can be recruited within scope.

You assess feasibility across three dimensions per the VERITY SAMPLE framework:

**1. HCP Availability Assessment**
For each target audience segment:
- Estimated pool size in relevant geographies (use realistic industry benchmarks)
- Incidence rate estimate (% of HCPs who qualify AND would participate)
- Recruitment ratio vs needed sample (GREEN ≥3x, YELLOW 1.5–3x, RED <1.5x)
- Key risks (specialty rarity, burnout, participation fatigue)

**2. Geographic Feasibility**
For each market/country in scope:
- Market accessibility (Open / Restricted / Challenging)
- Panel depth estimate
- Typical recruitment timeline (weeks)
- Risk level (LOW / MEDIUM / HIGH)
- Any compliance/regulatory notes (e.g., HIPAA, GDPR)

**3. Vendor Assessment**
Assess 2-3 recommended panel vendors for this study type:
- Vendor name (use realistic panel vendors: Schlesinger, Ipsos, M3, Sermo, Dedoose, etc.)
- Coverage for target specialty & geographies
- Estimated CPI range ($ per complete)
- Estimated timeline contribution
- Strengths and weaknesses for this study

**4. Overall Feasibility Verdict**
- overallRisk: "LOW" | "MEDIUM" | "HIGH"
- feasible: true | false
- summary: 2–3 sentence executive summary
- keyRisks: top 3 risks
- recommendations: top 3 actionable recommendations
- estimatedFieldworkWeeks: number
- confidenceScore: 0–1

Use realistic pharma PMR benchmarks. For dummy/placeholder data, use plausible industry-standard numbers.

Respond with JSON:
{
  "overallFeasibility": { "riskLevel", "feasible", "summary", "keyRisks", "recommendations", "estimatedFieldworkWeeks", "confidenceScore" },
  "hcpAvailability": [ { "segment", "estimatedPoolSize", "incidenceRate", "neededSample", "recruitmentRatio", "riskLevel", "notes" } ],
  "geographicFeasibility": [ { "market", "accessibility", "panelDepth", "recruitmentWeeks", "riskLevel", "notes" } ],
  "vendorAssessment": [ { "vendor", "coverage", "estimatedCPI", "estimatedWeeks", "strengths", "weaknesses", "recommended" } ]
}`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const sql = getSql();

      // Get brief data — no sample_plan dependency
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

      // Extract sample/audience details from raw brief if available
      const raw = brief.rawExtraction || {};
      const sampleSection = raw.section8_target_audience_sample || {};
      const timelineSection = raw.section9_timeline_key_dates || {};
      const methodSection = raw.section6_methodology_scope || {};

      const { jobQueueService } = await import('../jobQueue');
      const jobs = await jobQueueService.getJobsByOpportunity(context.opportunityId);
      const currentJob = jobs.find((j: any) => j.jobType === this.agentType && j.status === 'processing');

      if (currentJob) await jobQueueService.updateProgress(currentJob.id, 30, 'Assessing HCP availability');

      const systemPrompt = this.getSystemPrompt(context);
      const userMessage = `Assess recruitment feasibility for this PMR study:

**RFP**: ${brief.rfpTitle}
**Client**: ${brief.clientName}
**Therapeutic Area**: ${brief.therapeuticArea || 'Not specified'}
**Study Type**: ${brief.studyType || 'Not specified'}
**Methodology**: ${methodSection.researchDesign || methodSection.dataCollection || 'Not specified'}

**Target Audience**:
${brief.targetAudience || JSON.stringify(sampleSection, null, 2) || 'Not specified'}

**Sample Requirements**:
- Target sample size: ${sampleSection.targetSampleSize || 'Not specified'}
- Quotas: ${JSON.stringify(sampleSection.quotas || 'Not specified')}
- Special requirements: ${sampleSection.specialRequirements || 'None'}

**Geography / Markets**:
${JSON.stringify(brief.geography || [], null, 2)}

**Timeline**:
- Project end: ${timelineSection.projectEndDate || 'Not specified'}
- Contract length: ${timelineSection.contractLength || 'Not specified'}

Note: Use realistic dummy benchmark data for HCP pool sizes, incidence rates, CPI estimates, and vendor names. Base estimates on industry standards for this therapeutic area and study type.`;

      if (currentJob) await jobQueueService.updateProgress(currentJob.id, 50, 'Running AI feasibility analysis');

      const response = await this.invokeAI(systemPrompt, userMessage, context);

      if (currentJob) await jobQueueService.updateProgress(currentJob.id, 80, 'Storing feasibility assessment');

      let result: any;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        result = JSON.parse(jsonMatch ? jsonMatch[0] : response);
      } catch {
        return { success: false, error: 'Failed to parse feasibility assessment' };
      }

      // Store in feasibility_assessments (not hcp_shortlists — no sample_plan_id dependency)
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
          ${JSON.stringify(result.vendorAssessment || [])}::jsonb,
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
