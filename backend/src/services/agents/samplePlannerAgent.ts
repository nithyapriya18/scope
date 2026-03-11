/**
 * Sample Planner Agent (Phase 4)
 * Calculates sample sizes, determines quotas, and estimates recruitment feasibility
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

export class SamplePlannerAgent extends BaseAgent {
  protected agentType = 'sample_planning';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are a PMR Sample Planning Specialist with expertise in healthcare professional recruitment and sampling methodology.

Your task is to design a comprehensive sample plan based on the research scope and budget constraints.

Calculate and design:

**1. Sample Size Calculation**:
   - For Qualitative: Recommend sample size based on:
     * Number of research objectives (more objectives = larger sample)
     * Geographic markets (ensure saturation per market)
     * Target audience segments
     * Budget constraints
     * Industry benchmarks: 20-60 interviews per geography for qualitative
   - For Quantitative: Calculate sample size based on:
     * Confidence level (typically 95%)
     * Margin of error (typically ±5%)
     * Population size (HCPs in therapeutic area)
     * Expected response rate
     * Industry benchmarks: 200-1,000 surveys typical

**2. Sample Distribution by Geography**:
   - Allocate sample across markets proportionally or equally
   - Consider:
     * Market size (US larger than UK)
     * Budget allocation
     * Recruitment difficulty (rare specialists need larger sample)
   - Example: If 60 total interviews across US, UK, Germany
     * US: 30 (50%), UK: 15 (25%), Germany: 15 (25%)

**3. Sample Quotas & Stratification**:
   - Practice setting: Academic (40%), Community (40%), Private (20%)
   - Experience level: 5-10 years (30%), 10-15 years (40%), 15+ years (30%)
   - Gender: Male (60%), Female (40%) - or as specified
   - Patient volume: High (40%), Medium (40%), Low (20%)
   - Geography within country: Metro (60%), Non-metro (40%)

**4. Recruitment Strategy**:
   - Recruitment channels: Panel vendors, medical associations, referrals
   - Screening ratio: Typically 3-5 screened per 1 completed
   - Recruitment timeline: 2-4 weeks for common specialists, 4-8 weeks for rare
   - Incentive recommendations: Based on specialty and geography
     * Oncologists/Cardiologists: $400-500 per 60-min interview
     * General specialists: $300-400 per 60-min interview
     * Rare specialists: $500-750 per interview

**5. Recruitment Feasibility Assessment**:
   - Assess difficulty for each target segment:
     * Easy: Primary care, common specialties, broad criteria
     * Medium: Subspecialties, specific experience requirements
     * Hard: Rare diseases, very specific criteria, small populations
   - Identify potential recruitment risks:
     * Too narrow inclusion criteria
     * Short timelines for rare specialists
     * Budget too low for incentives
     * Geographic challenges (rural areas)

**6. Cost Estimates**:
   - Recruitment costs: Screening fees, vendor fees
     * Typical: $200-400 per completed recruit
   - Incentive costs: Honoraria for HCPs
     * Typical: $300-500 per interview
   - Total sample cost = (Recruitment cost + Incentive) × Sample size
   - Compare to budget and flag if over budget

**7. Recruitment Timeline**:
   - Phase 1: Database search & initial outreach (3-5 days)
   - Phase 2: Screening & qualification (5-10 days)
   - Phase 3: Scheduling interviews (3-7 days)
   - Total: 2-4 weeks for common specialists, longer for rare

**8. Backup Plans & Contingencies**:
   - If recruitment falls short, recommend:
     * Expand inclusion criteria
     * Add recruitment channels
     * Increase incentives
     * Extend fieldwork timeline

For each element, provide specific numbers, rationale, and recommendations.

Respond with structured JSON containing: sampleSizeRecommendation{}, sampleDistribution{}, quotas{}, recruitmentStrategy{}, feasibilityAssessment{}, costEstimates{}, recruitmentTimeline{}, contingencyPlans[], confidenceScore.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      // Get brief, scope, and gap analysis
      const sql = getSql();
      const data = await sql`
        SELECT
          b.id as brief_id,
          b.research_objectives as "researchObjectives",
          b.target_audience as "targetAudience",
          b.therapeutic_area as "therapeuticArea",
          b.study_type as "studyType",
          b.sample_requirements as "sampleRequirements",
          b.timeline_requirements as "timelineRequirements",
          b.budget_indication as "budgetIndication",
          o.id as opportunity_id,
          o.rfp_title as "rfpTitle",
          o.client_name as "clientName",
          o.geography,
          s.id as scope_id,
          s.methodology,
          s.screener_criteria as "screenerCriteria",
          s.estimated_timeline as "estimatedTimeline"
        FROM briefs b
        JOIN opportunities o ON b.opportunity_id = o.id
        LEFT JOIN scopes s ON s.brief_id = b.id
        WHERE o.id = ${context.opportunityId}
        ORDER BY b.created_at DESC, s.created_at DESC
        LIMIT 1
      `;

      if (data.length === 0) {
        return {
          success: false,
          error: 'No brief found for this opportunity',
        };
      }

      const briefData = data[0];

      if (!briefData.scope_id) {
        return {
          success: false,
          error: 'Scope must be built before sample planning',
        };
      }

      const systemPrompt = this.getSystemPrompt(context);
      const userMessage = `Design a comprehensive sample plan for this research project:

**RFP Title**: ${briefData.rfpTitle}
**Client**: ${briefData.clientName}
**Therapeutic Area**: ${briefData.therapeuticArea}
**Study Type**: ${briefData.studyType}

**Target Audience**: ${briefData.targetAudience}

**Sample Requirements from RFP**:
${JSON.stringify(briefData.sampleRequirements, null, 2)}

**Geography**: ${JSON.stringify(briefData.geography, null, 2)}

**Budget**: ${briefData.budgetIndication}

**Timeline**: ${briefData.timelineRequirements}

**Methodology Design**:
${JSON.stringify(briefData.methodology, null, 2)}

**Screener Criteria from Scope**:
${JSON.stringify(briefData.screenerCriteria, null, 2)}

**Research Objectives** (complexity affects sample size):
${JSON.stringify(briefData.researchObjectives, null, 2)}

Based on this information:
1. Calculate appropriate sample sizes for each geography
2. Define quotas to ensure representative sample
3. Assess recruitment feasibility (difficulty level)
4. Estimate costs (recruitment + incentives)
5. Develop recruitment timeline
6. Identify risks and backup plans

Use industry benchmarks:
- Qualitative: 20-60 interviews per geography, $300-500 per HCP
- Quantitative: 200-1,000 surveys, $50-100 per complete
- Recruitment cost: $200-400 per complete
- Screening ratio: 3-5 screened per 1 completed
- Timeline: 2-4 weeks (common specialists), 4-8 weeks (rare)

Ensure the plan is feasible within budget and timeline constraints.

Respond with complete JSON containing all components listed in the system prompt.`;

      const response = await this.invokeAI(systemPrompt, userMessage, context);

      // Parse JSON response
      let samplePlan;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          samplePlan = JSON.parse(jsonMatch[0]);
        } else {
          samplePlan = JSON.parse(response);
        }
      } catch (parseError) {
        console.error('Failed to parse sample plan:', response);
        return {
          success: false,
          error: 'Failed to parse sample plan',
        };
      }

      // Store in sample_plans table
      const result = await sql`
        INSERT INTO sample_plans (
          scope_id,
          sample_size_recommendation,
          sample_distribution,
          quotas,
          recruitment_strategy,
          feasibility_assessment,
          cost_estimates,
          recruitment_timeline,
          contingency_plans,
          llm_sample_plan,
          created_at,
          updated_at
        ) VALUES (
          ${briefData.scope_id},
          ${JSON.stringify(samplePlan.sampleSizeRecommendation || {})}::jsonb,
          ${JSON.stringify(samplePlan.sampleDistribution || {})}::jsonb,
          ${JSON.stringify(samplePlan.quotas || {})}::jsonb,
          ${JSON.stringify(samplePlan.recruitmentStrategy || {})}::jsonb,
          ${JSON.stringify(samplePlan.feasibilityAssessment || {})}::jsonb,
          ${JSON.stringify(samplePlan.costEstimates || {})}::jsonb,
          ${JSON.stringify(samplePlan.recruitmentTimeline || {})}::jsonb,
          ${samplePlan.contingencyPlans || []},
          ${JSON.stringify(samplePlan)}::jsonb,
          now(),
          now()
        )
        RETURNING id
      `;

      const samplePlanId = result[0].id;

      // Update opportunity status
      await sql`
        UPDATE opportunities
        SET status = 'hcp_shortlist', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      console.log(`✅ Sample planning complete for opportunity ${context.opportunityId}`);

      return {
        success: true,
        data: {
          samplePlanId,
          ...samplePlan,
          nextStatus: 'hcp_shortlist',
        },
        metadata: {
          confidence: samplePlan.confidenceScore || 0.85,
        },
      };
    } catch (error: any) {
      console.error('Sample planner error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
