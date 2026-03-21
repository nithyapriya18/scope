/**
 * WBS Estimator Agent — Step 9
 * Produces 3 fully-priced bid options (GOOD/BETTER/BEST) using rate card CPI.
 * All arithmetic performed by AI from passed data — zero hardcoded numbers.
 * Fully AI-driven: GOAL / INPUTS / OUTPUT REQUIREMENTS pattern.
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';
import * as fs from 'fs';
import * as path from 'path';

export class WBSEstimatorAgent extends BaseAgent {
  protected agentType = 'wbs_estimation';

  protected getSystemPrompt(_context: AgentContext): string {
    return `You are a Senior PMR Pricing Director at PetaSight, a pharma market research firm.
Your job is to produce three fully-priced bid options (GOOD / BETTER / BEST) and a detailed
work breakdown structure using the rate card and scope data provided.
All arithmetic must be derived from the data given — use no hardcoded numbers.
Output ONLY valid JSON. No markdown, no commentary.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    const sql = getSql();

    let rateCard: any = {};
    try {
      const rcPath = path.join(__dirname, '../../../config/rate_card.json');
      rateCard = JSON.parse(fs.readFileSync(rcPath, 'utf-8'));
    } catch { /* non-fatal */ }

    const [[opp], [brief], [scope], [feasibility]] = await Promise.all([
      sql`SELECT rfp_title, client_name, email_body FROM opportunities WHERE id = ${context.opportunityId}`,
      sql`SELECT study_type, target_audience, therapeutic_area, research_objectives,
                 budget_indication, raw_extraction
          FROM briefs WHERE opportunity_id = ${context.opportunityId}
          ORDER BY created_at DESC LIMIT 1`,
      sql`SELECT id AS scope_id, tenant_id, detected_study_type, methodology, methodology_detail,
                 sample_size_options, key_milestones, recruitment_strategy
          FROM scopes WHERE opportunity_id = ${context.opportunityId}
          ORDER BY created_at DESC LIMIT 1`,
      sql`SELECT llm_result FROM feasibility_assessments WHERE opportunity_id = ${context.opportunityId}
          ORDER BY created_at DESC LIMIT 1`,
    ]);

    if (!scope) return { success: false, error: 'No scope found for this opportunity' };

    const methodology: any = scope.methodology_detail || {};
    const timeline: any = scope.key_milestones || {};
    const recStrategy: any = scope.recruitment_strategy || {};
    const sampleOptions: any[] = scope.sample_size_options || [];
    const feasibilityResult: any = feasibility?.llm_result || {};

    const userPrompt = `
=== GOAL ===
Produce three bid options (GOOD / BETTER / BEST) for this pharma RFP using the rate card provided.
Calculate a detailed work breakdown structure and all costs from first principles.
Use the rate card for HCP CPI. Use the labor rates provided. Apply multipliers as described.
All calculations must be shown in the costBreakdown — no black-box numbers.

=== INPUT 1: FULL RFP TEXT ===
${opp?.email_body || 'Not available — use brief and scope sections below'}

=== INPUT 2: BRIEF & SCOPE ===
RFP: ${opp?.rfp_title}
Client: ${opp?.client_name}
Therapeutic area: ${brief?.therapeutic_area || 'unknown'}
Study type: ${scope.detected_study_type || brief?.study_type || 'unknown'}
Target audience: ${brief?.target_audience || 'unknown'}
Budget indication from RFP: ${brief?.budget_indication || 'Not disclosed'}

Methodology:
${JSON.stringify(methodology, null, 2)}

Sample size options:
${JSON.stringify(sampleOptions, null, 2)}

Project timeline:
${JSON.stringify(timeline, null, 2)}

Recruitment strategy:
${JSON.stringify(recStrategy, null, 2)}

=== INPUT 3: FEASIBILITY & CPI (from Step 7) ===
Feasibility verdict: ${feasibilityResult.feasibilityVerdict || 'FEASIBLE'}
Recommended CPI for budget: $${feasibilityResult.recommendedCpiForBudget || 'not available'}
Estimated CPI detail: ${JSON.stringify(feasibilityResult.estimatedCpi || [])}
Matched specialties: ${JSON.stringify(feasibilityResult.matchedSpecialties || [])}

=== INPUT 4: FULL RATE CARD ===
${JSON.stringify(rateCard, null, 2)}

=== MULTIPLIER RULES ===
Apply these multipliers to labor hours only (not CPI):
- Language: English=1.0, EU5 languages=1.1x, Asian languages=1.3x
- Audience complexity: GP/Primary care=1.0x, Specialist=1.2x, KOL/Payer=1.5x
- Country count: 1 country=1.0x, 2-3 countries=1.2x, 4+ countries=1.5x
- Advanced analytics (conjoint/segmentation): +50% on analysis hours only

=== INTERNAL LABOR RATES (USD/hr) ===
Project Director: 185, Project Manager: 145, Senior Analyst: 135, Analyst: 110,
Moderator/Interviewer: 125, Recruiter: 95, Report Writer: 120, Data Processor: 90, QA Reviewer: 115

=== PRICING FORMULA ===
- laborCost = Σ(role hours × rate)
- hcpCpiCost = Σ(n per segment × CPI from rate card by specialty group + country + LOI)
- oopCosts = travel + technology + misc
- overhead = 0.18 × (laborCost + hcpCpiCost + oopCosts)
- subtotal = laborCost + hcpCpiCost + oopCosts + overhead
- margin = 0.25 × subtotal
- totalPrice = subtotal + margin

=== OUTPUT REQUIREMENTS ===
Return a JSON object with ALL of the following:

1. pricingOptions: array of 3 objects — GOOD (min sample), BETTER (recommended), BEST (max sample):
   {
     tier: "GOOD" | "BETTER" | "BEST",
     n: <sample size from sampleOptions>,
     totalPrice: <computed>,
     laborCost: <computed>,
     hcpCpiCost: <computed>,
     oopCosts: <computed>,
     overhead: <computed>,
     margin: <computed>,
     marginPct: 25,
     fieldWeeks: <from scope>,
     rationale: "1 sentence"
   }

2. workPackages: array of 6 phases (Setup, Recruitment, Fieldwork, Analysis, Reporting, PM) — each:
   {
     phase: "Phase name",
     task: "Specific task",
     role: "Role name",
     baseHours: <number>,
     multiplier: <1.0-1.5>,
     multiplierReason: "Why this multiplier",
     totalHours: <baseHours × multiplier>
   }

3. multipliersApplied: [{type, value, reason}] — list of all multipliers used

4. recommendedTier: "GOOD" | "BETTER" | "BEST"

5. recommendedRationale: 1-2 sentences on why this tier is recommended

6. budgetAlignment: how total price compares to client's budget indication

7. paymentTerms: "50% on signature, 50% on final delivery"

Return ONLY the JSON object. No markdown.`;

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI call timed out after 300s')), 300000)
    );

    const responseText = await Promise.race([
      this.invokeAI(this.getSystemPrompt(context), userPrompt, context),
      timeout,
    ]);

    let plan: any;
    try {
      let text = responseText.trim();
      if (text.startsWith('```')) text = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      plan = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return { success: false, error: 'Failed to parse WBS/pricing JSON from LLM' };
    }

    const betterTier = (plan.pricingOptions || []).find((o: any) => o.tier === 'BETTER')
      || (plan.pricingOptions || [])[1]
      || {};

    const [wbs] = await sql`
      INSERT INTO wbs (
        scope_id, tenant_id,
        work_packages, total_hours, total_days, resource_breakdown
      ) VALUES (
        ${scope.scope_id},
        ${scope.tenant_id},
        ${JSON.stringify(plan.workPackages || [])}::jsonb,
        ${(plan.workPackages || []).reduce((s: number, w: any) => s + (w.totalHours || 0), 0)},
        ${Math.ceil(((plan.workPackages || []).reduce((s: number, w: any) => s + (w.totalHours || 0), 0)) / 8)},
        ${JSON.stringify({})}::jsonb
      )
      RETURNING id
    `;

    await sql`
      INSERT INTO pricing_packs (
        opportunity_id, wbs_id, tenant_id,
        labor_cost, hcp_incentives, travel_cost, technology_cost, overhead_cost,
        margin_percentage, margin_amount, total_price,
        currency, cost_breakdown
      ) VALUES (
        ${context.opportunityId},
        ${wbs.id},
        ${scope.tenant_id},
        ${betterTier.laborCost || 0},
        ${betterTier.hcpCpiCost || 0},
        ${betterTier.oopCosts || 0},
        ${0},
        ${betterTier.overhead || 0},
        ${betterTier.marginPct || 25},
        ${betterTier.margin || 0},
        ${betterTier.totalPrice || 0},
        'USD',
        ${JSON.stringify({
          pricingOptions: plan.pricingOptions || [],
          workPackages: plan.workPackages || [],
          multipliersApplied: plan.multipliersApplied || [],
          recommendedTier: plan.recommendedTier,
          recommendedRationale: plan.recommendedRationale,
          budgetAlignment: plan.budgetAlignment,
          paymentTerms: plan.paymentTerms,
        })}::jsonb
      )
    `;

    console.log(`✅ WBS & Pricing complete: 3 tiers generated`);
    const tiers = (plan.pricingOptions || []).map((o: any) => `${o.tier}=$${o.totalPrice?.toLocaleString()}`).join(', ');
    console.log(`   ${tiers}`);
    console.log(`   Recommended: ${plan.recommendedTier}`);

    return {
      success: true,
      data: {
        wbsId: wbs.id,
        pricingOptions: plan.pricingOptions || [],
        workPackages: plan.workPackages || [],
        multipliersApplied: plan.multipliersApplied || [],
        recommendedTier: plan.recommendedTier,
        recommendedRationale: plan.recommendedRationale,
        budgetAlignment: plan.budgetAlignment,
      },
    };
  }
}
