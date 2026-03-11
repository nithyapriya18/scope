/**
 * Pricer Agent (Phase 5)
 * Calculates comprehensive project pricing based on WBS, sample plan, and rate card
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';
import * as fs from 'fs';
import * as path from 'path';

export class PricerAgent extends BaseAgent {
  protected agentType = 'pricing';

  private rateCard: any;

  constructor() {
    super();
    // Load rate card
    const rateCardPath = path.join(__dirname, '../../../config/rate_card.json');
    this.rateCard = JSON.parse(fs.readFileSync(rateCardPath, 'utf-8'));
  }

  protected getSystemPrompt(context: AgentContext): string {
    return `You are a PMR Pricing Specialist with expertise in pharmaceutical market research cost estimation and pricing strategy.

Your task is to calculate comprehensive project pricing based on the Work Breakdown Structure, sample plan, and organizational rate card.

Calculate pricing across these categories:

**1. Labor Costs** (from WBS):
- For each task in WBS, calculate: Hours × Labor rate for assigned role
- Example: "Report writing: 24 hours × $135/hour (Report Writer) = $3,240"
- Sum all labor costs by phase:
  * Project Setup & Recruitment
  * Fieldwork
  * Analysis
  * Reporting & Delivery
  * Project Management

**2. Recruitment Costs** (from Sample Plan):
- HCP Recruitment fees: Sample size × Recruitment cost per difficulty level
  * Easy: $200 per recruit
  * Medium: $300 per recruit
  * Hard: $400 per recruit (rare specialists)
  * Very Hard: $500 per recruit (ultra-rare)
- Calculate per geography based on sample distribution

**3. Respondent Incentives** (from Sample Plan):
- HCP incentives: Sample size × Incentive rate per geography & specialty
  * Oncologists: $450-500 per interview
  * Cardiologists: $350-450 per interview
  * Rare disease: $550-750 per interview
  * General specialists: $250-350 per interview
- Calculate per geography (US rates higher than EU)

**4. Data Processing Costs**:
- For Qualitative:
  * Transcription: Interview duration × Sample size × $2.50 per audio minute
  * Example: 60 min × 60 interviews × $2.50 = $9,000
- For Quantitative:
  * Survey programming: $1,200 setup
  * Per-complete costs: Sample size × $8-15 per complete
  * Data processing: $800 base fee

**5. Technology & Tools**:
- Video platform (if virtual interviews): $5 per interview
- Survey platform license (if quantitative): $500
- Data analysis tools: $300
- Reporting tools: $200

**6. Pass-Through Costs** (if applicable):
- Travel (if in-person fieldwork): Flights, hotels, per diem
- Translation (if multi-country): Per-minute transcription translation

**7. Subtotal Calculation**:
- Direct Labor + Recruitment + Incentives + Data Processing + Technology + Pass-Through

**8. Overhead Markup**:
- Apply 18% overhead on subtotal
- Covers administrative costs, insurance, facilities, general operations

**9. Total Cost (Before Margin)**:
- Subtotal + Overhead

**10. Margin/Fee**:
- Apply margin percentage based on project type:
  * Standard: 25%
  * Rush project: 30%
  * Complex methodology: 28%
  * Preferred client: 20%
- Calculate: Total cost × Margin percentage

**11. Total Project Price**:
- Total cost + Margin

**12. Budget Alignment Check**:
- Compare total price to RFP budget indication
- Calculate variance (over/under budget)
- If over budget:
  * Identify cost-saving opportunities (reduce sample, simplify analysis, etc.)
  * Suggest adjustments to fit budget
  * Calculate revised pricing scenarios

**13. Payment Terms**:
- Recommend payment schedule:
  * 50% on contract execution
  * 25% on fieldwork completion
  * 25% on final report delivery

**14. Pricing Pack Breakdown**:
- Create itemized cost breakdown by category and phase
- Show unit costs and quantities for transparency
- Include assumptions and exclusions
- Provide pricing summary table

For each cost element, show:
- Line item description
- Quantity/units
- Unit cost
- Extended cost
- Calculation notes

Respond with structured JSON containing: laborCosts{}, recruitmentCosts{}, incentiveCosts{}, dataProcessingCosts{}, technologyCosts{}, passThroughCosts{}, subtotal{}, overhead{}, totalCostBeforeMargin{}, margin{}, totalPrice{}, budgetComparison{}, costSavingOptions[], pricingPackBreakdown{}, paymentTerms{}, assumptions[], confidenceScore.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      // Get all project data including WBS
      const sql = getSql();
      const data = await sql`
        SELECT
          b.id as brief_id,
          b.research_objectives as "researchObjectives",
          b.target_audience as "targetAudience",
          b.therapeutic_area as "therapeuticArea",
          b.study_type as "studyType",
          b.budget_indication as "budgetIndication",
          o.id as opportunity_id,
          o.rfp_title as "rfpTitle",
          o.client_name as "clientName",
          o.geography,
          s.id as scope_id,
          s.methodology,
          sp.id as sample_plan_id,
          sp.sample_size_recommendation as "sampleSizeRecommendation",
          sp.sample_distribution as "sampleDistribution",
          sp.cost_estimates as "costEstimates",
          sp.feasibility_assessment as "feasibilityAssessment",
          w.id as wbs_id,
          w.task_breakdown as "taskBreakdown",
          w.team_roles as "teamRoles",
          w.effort_summary as "effortSummary",
          w.total_effort as "totalEffort"
        FROM briefs b
        JOIN opportunities o ON b.opportunity_id = o.id
        LEFT JOIN scopes s ON s.brief_id = b.id
        LEFT JOIN sample_plans sp ON sp.scope_id = s.id
        LEFT JOIN hcp_shortlists h ON h.sample_plan_id = sp.id
        LEFT JOIN wbs w ON w.hcp_shortlist_id = h.id
        WHERE o.id = ${context.opportunityId}
        ORDER BY b.created_at DESC, s.created_at DESC, sp.created_at DESC, h.created_at DESC, w.created_at DESC
        LIMIT 1
      `;

      if (data.length === 0) {
        return {
          success: false,
          error: 'No brief found for this opportunity',
        };
      }

      const projectData = data[0];

      if (!projectData.wbs_id) {
        return {
          success: false,
          error: 'WBS must be created before pricing',
        };
      }

      const systemPrompt = this.getSystemPrompt(context);
      const userMessage = `Calculate comprehensive pricing for this project:

**RFP Title**: ${projectData.rfpTitle}
**Client**: ${projectData.clientName}
**Therapeutic Area**: ${projectData.therapeuticArea}
**Study Type**: ${projectData.studyType}

**Budget Indication from RFP**: ${projectData.budgetIndication}
(This is the client's budget - our price should ideally be at or below this)

**Work Breakdown Structure**:
${JSON.stringify(projectData.taskBreakdown, null, 2)}

**Effort Summary**:
${JSON.stringify(projectData.effortSummary, null, 2)}

**Total Effort**:
${JSON.stringify(projectData.totalEffort, null, 2)}

**Team Roles**:
${JSON.stringify(projectData.teamRoles, null, 2)}

**Sample Plan**:
- Sample Size: ${JSON.stringify(projectData.sampleSizeRecommendation, null, 2)}
- Distribution: ${JSON.stringify(projectData.sampleDistribution, null, 2)}
- Feasibility: ${JSON.stringify(projectData.feasibilityAssessment, null, 2)}

**Geography**: ${JSON.stringify(projectData.geography, null, 2)}

**Methodology** (affects costs):
${JSON.stringify(projectData.methodology, null, 2)}

**Cost Estimates from Sample Planner**:
${JSON.stringify(projectData.costEstimates, null, 2)}

**Rate Card** (use these rates):
${JSON.stringify(this.rateCard, null, 2)}

Based on this information:
1. Calculate labor costs from WBS (hours × rates by role)
2. Calculate recruitment costs (sample size × difficulty-based rate)
3. Calculate incentive costs (sample size × geography × specialty)
4. Calculate data processing costs (transcription or survey programming)
5. Add technology and pass-through costs
6. Apply 18% overhead markup
7. Apply appropriate margin (25% standard, 30% rush, etc.)
8. Compare to RFP budget and flag if over/under
9. Provide cost-saving options if over budget
10. Create itemized pricing pack breakdown

**IMPORTANT**:
- Show all calculations transparently with unit costs and quantities
- If total price exceeds RFP budget, suggest realistic adjustments
- Include assumptions (e.g., "Assumes 60-minute interviews", "Excludes travel costs")

Respond with complete JSON containing all components listed in the system prompt.`;

      const response = await this.invokeAI(systemPrompt, userMessage, context);

      // Parse JSON response
      let pricingData;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          pricingData = JSON.parse(jsonMatch[0]);
        } else {
          pricingData = JSON.parse(response);
        }
      } catch (parseError) {
        console.error('Failed to parse pricing data:', response);
        return {
          success: false,
          error: 'Failed to parse pricing data',
        };
      }

      // Store in pricing_packs table
      const result = await sql`
        INSERT INTO pricing_packs (
          wbs_id,
          labor_costs,
          recruitment_costs,
          incentive_costs,
          data_processing_costs,
          technology_costs,
          pass_through_costs,
          subtotal,
          overhead,
          total_cost_before_margin,
          margin,
          total_price,
          budget_comparison,
          cost_saving_options,
          pricing_pack_breakdown,
          payment_terms,
          assumptions,
          llm_pricing,
          created_at,
          updated_at
        ) VALUES (
          ${projectData.wbs_id},
          ${JSON.stringify(pricingData.laborCosts || {})}::jsonb,
          ${JSON.stringify(pricingData.recruitmentCosts || {})}::jsonb,
          ${JSON.stringify(pricingData.incentiveCosts || {})}::jsonb,
          ${JSON.stringify(pricingData.dataProcessingCosts || {})}::jsonb,
          ${JSON.stringify(pricingData.technologyCosts || {})}::jsonb,
          ${JSON.stringify(pricingData.passThroughCosts || {})}::jsonb,
          ${JSON.stringify(pricingData.subtotal || {})}::jsonb,
          ${JSON.stringify(pricingData.overhead || {})}::jsonb,
          ${JSON.stringify(pricingData.totalCostBeforeMargin || {})}::jsonb,
          ${JSON.stringify(pricingData.margin || {})}::jsonb,
          ${JSON.stringify(pricingData.totalPrice || {})}::jsonb,
          ${JSON.stringify(pricingData.budgetComparison || {})}::jsonb,
          ${pricingData.costSavingOptions || []},
          ${JSON.stringify(pricingData.pricingPackBreakdown || {})}::jsonb,
          ${JSON.stringify(pricingData.paymentTerms || {})}::jsonb,
          ${pricingData.assumptions || []},
          ${JSON.stringify(pricingData)}::jsonb,
          now(),
          now()
        )
        RETURNING id
      `;

      const pricingPackId = result[0].id;

      // Update opportunity status
      await sql`
        UPDATE opportunities
        SET status = 'document_gen', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      console.log(`✅ Pricing complete for opportunity ${context.opportunityId}`);

      return {
        success: true,
        data: {
          pricingPackId,
          ...pricingData,
          nextStatus: 'document_gen',
        },
        metadata: {
          confidence: pricingData.confidenceScore || 0.90,
        },
      };
    } catch (error: any) {
      console.error('Pricer error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
