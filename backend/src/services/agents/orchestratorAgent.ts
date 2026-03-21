/**
 * Orchestrator Agent
 * Coordinates workflow and manages state transitions
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';
import { IntakeAgent } from './intakeAgent';
import { BriefExtractorAgent } from './briefExtractorAgent';
import { GapAnalyzerAgent } from './gapAnalyzerAgent';
import { AssumptionAnalyzerAgent } from './assumptionAnalyzerAgent';
import { ClarificationGeneratorAgent } from './clarificationGeneratorAgent';
import { ScopePlannerAgent } from './scopePlannerAgent';
import { HCPMatcherAgent } from './hcpMatcherAgent';
import { WBSEstimatorAgent } from './wbsEstimatorAgent';
import { DocumentGeneratorAgent } from './documentGeneratorAgent';

export type WorkflowStatus =
  | 'intake'
  | 'brief_extract'
  | 'gap_analysis'
  | 'assumption_analysis'
  | 'clarification'
  | 'clarification_response'
  | 'feasibility'     // Phase 2: HCP matching and recruitment feasibility
  | 'scope_planning'  // Phase 2: Research design (methodology, sample, delivery plan) — runs after feasibility
  | 'wbs_estimate'    // Phase 3: Work breakdown structure
  | 'pricing'         // Phase 3: Pricing calculation
  | 'document_gen'    // Phase 3: Document generation
  | 'approvals'       // Phase 3: Submit bid to client
  | 'approved'
  | 'rejected'
  | 'handoff';

export class OrchestratorAgent extends BaseAgent {
  protected agentType = 'orchestrator';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are the Workflow Orchestrator for the Lumina Scope RFP response system.

Your role is to coordinate agent execution based on the current workflow state.`;
  }

  /**
   * Execute the next agent based on current status
   */
  async executeNextStep(
    opportunityId: string,
    userId: string,
    currentStatus: WorkflowStatus
  ): Promise<AgentResult> {
    const context: AgentContext = { opportunityId, userId };

    console.log(`🎯 Orchestrator: Processing status '${currentStatus}' for opportunity ${opportunityId}`);

    try {
      switch (currentStatus) {
        case 'intake':
          // If we're at intake status and user clicks Continue,
          // move to brief extraction (intake already completed during upload)
          return await this.executeBriefExtraction(context);

        case 'brief_extract': {
          // Completeness gate (from pipeline spec):
          // ≥ 70% completeness → skip gap + assumption analysis → go straight to clarification
          // < 70% completeness → run full gap analysis pipeline
          const sql = getSql();
          const [briefRow] = await sql`
            SELECT confidence_score FROM briefs
            WHERE opportunity_id = ${context.opportunityId}
            ORDER BY created_at DESC LIMIT 1
          `;
          const completeness = briefRow ? Math.round((briefRow.confidence_score || 0) * 100) : 0;

          if (completeness >= 90) {
            console.log(`⚡ Brief completeness ${completeness}% ≥ 90 — skipping gap & assumption analysis`);
            // Advance status past skipped steps so display is correct
            await sql`UPDATE opportunities SET status = 'assumption_analysis', updated_at = now() WHERE id = ${context.opportunityId}`;
            return await this.executeClarificationGeneration(context);
          } else {
            console.log(`🔍 Brief completeness ${completeness}% < 90 — running full gap analysis`);
            return await this.executeGapAnalysis(context);
          }
        }

        case 'gap_analysis':
          // Gap analysis complete, move to assumption analysis
          return await this.executeAssumptionAnalysis(context);

        case 'assumption_analysis': {
          // If gap analysis says no clarification needed, skip straight to feasibility
          const sql = getSql();
          const [gaRow] = await sql`
            SELECT ga.llm_analysis FROM gap_analyses ga JOIN briefs b ON ga.brief_id = b.id
            WHERE b.opportunity_id = ${context.opportunityId}
            ORDER BY ga.created_at DESC LIMIT 1
          `;
          const gaAnalysis: any = gaRow?.llm_analysis || {};
          if (gaAnalysis.shouldSendClarification === false) {
            console.log('⚡ shouldSendClarification=false — skipping clarification, going to feasibility');
            await sql`UPDATE opportunities SET status = 'clarification_response', updated_at = now() WHERE id = ${context.opportunityId}`;
            return await this.executeClarificationParsing(context);
          }
          // Assumption analysis complete, move to clarification generation
          return await this.executeClarificationGeneration(context);
        }

        case 'clarification':
          // Clarifications generated, need approval before proceeding
          return {
            success: true,
            data: {
              message: 'Clarifications generated. Awaiting approval.',
              nextStatus: 'clarification_response',
            },
          };

        case 'clarification_response':
          // Step 5: parse client response (or finalise assumptions), update brief, then run HCP matching
          return await this.executeClarificationParsing(context);

        case 'feasibility':
          // Run HCP matching — on success advances status to scope_planning
          return await this.executeHCPMatching(context);

        case 'scope_planning':
          // HCP matching done — now run research plan design, then WBS
          return await this.executeResearchPlan(context);

        case 'wbs_estimate':
          return await this.executeWBSEstimation(context);

        case 'pricing':
          return await this.executePricing(context);

        case 'document_gen':
          return await this.executeDocumentGeneration(context);

        default:
          return {
            success: false,
            error: `Unknown status: ${currentStatus}`,
          };
      }
    } catch (error: any) {
      console.error('Orchestrator error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async executeBriefExtraction(context: AgentContext): Promise<AgentResult> {
    console.log('📝 Executing Brief Extraction...');

    // Get RFP text from opportunity
    const sql = getSql();
    const opps = await sql`
      SELECT email_body, rfp_title
      FROM opportunities
      WHERE id = ${context.opportunityId}
    `;

    if (opps.length === 0) {
      return { success: false, error: 'Opportunity not found' };
    }

    const agent = new BriefExtractorAgent();
    const result = await agent.execute({
      ...context,
      data: {
        rfpText: opps[0].email_body,
        fileName: opps[0].rfp_title || 'RFP Document',
      },
    });

    // Update opportunity status on success
    if (result.success) {
      await sql`
        UPDATE opportunities
        SET status = 'brief_extract', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;
      console.log(`✅ Opportunity status updated to: brief_extract`);
    }

    return result;
  }

  private async executeGapAnalysis(context: AgentContext): Promise<AgentResult> {
    console.log('🔍 Executing Gap Analysis...');
    const sql = getSql();
    // Advance status immediately so UI shows step 3 in-progress while AI runs
    await sql`UPDATE opportunities SET status = 'gap_analysis', updated_at = now() WHERE id = ${context.opportunityId}`;
    const agent = new GapAnalyzerAgent();
    return await agent.execute(context);
  }

  private async executeAssumptionAnalysis(context: AgentContext): Promise<AgentResult> {
    console.log('🤔 Executing Assumption & Clash Analysis...');
    const sql = getSql();
    await sql`UPDATE opportunities SET status = 'assumption_analysis', updated_at = now() WHERE id = ${context.opportunityId}`;
    const agent = new AssumptionAnalyzerAgent();
    return await agent.execute(context);
  }

  private async executeClarificationGeneration(context: AgentContext): Promise<AgentResult> {
    console.log('❓ Executing Clarification Generation...');
    const sql = getSql();
    await sql`UPDATE opportunities SET status = 'clarification', updated_at = now() WHERE id = ${context.opportunityId}`;
    const agent = new ClarificationGeneratorAgent();
    return await agent.execute(context);
  }

  private async executeClarificationParsing(context: AgentContext): Promise<AgentResult> {
    console.log('📝 Step 5: Parsing clarification response and updating brief...');
    const sql = getSql();
    await sql`UPDATE opportunities SET status = 'clarification_response', updated_at = now() WHERE id = ${context.opportunityId}`;
    const { ClarificationResponseAgent } = await import('./clarificationResponseAgent');
    const agent = new ClarificationResponseAgent();
    const result = await agent.execute(context);
    if (!result.success) {
      console.error('❌ Clarification parsing failed:', result.error);
      // Non-fatal: proceed to HCP matching anyway
    }
    // Advance to feasibility after parsing
    await sql`UPDATE opportunities SET status = 'feasibility', updated_at = now() WHERE id = ${context.opportunityId}`;
    return result;
  }

  private async executeHCPMatching(context: AgentContext): Promise<AgentResult> {
    console.log('👥 Executing Feasibility Analysis (HCP Matching)...');
    const sql = getSql();
    // Status stays 'feasibility' while running — advance to scope_planning on success
    const hcpAgent = new HCPMatcherAgent();
    const result = await hcpAgent.execute(context);
    if (result.success) {
      await sql`UPDATE opportunities SET status = 'scope_planning', updated_at = now() WHERE id = ${context.opportunityId}`;
      console.log('✅ Feasibility analysis complete — advancing to scope_planning');
    }
    return result;
  }

  private async executeResearchPlan(context: AgentContext): Promise<AgentResult> {
    console.log('📋 Executing Research Plan (Scope Design)...');
    const sql = getSql();
    // Status stays 'scope_planning' while running — advance to wbs_estimate on success
    const scopeAgent = new ScopePlannerAgent();
    const result = await scopeAgent.execute(context);
    if (result.success) {
      await sql`UPDATE opportunities SET status = 'wbs_estimate', updated_at = now() WHERE id = ${context.opportunityId}`;
      console.log('✅ Research plan complete — advancing to wbs_estimate');
    }
    return result;
  }

  private async proceedToWBSEstimation(context: AgentContext): Promise<AgentResult> {
    console.log('📋 Proceeding to WBS Estimation (Phase 3)...');

    // Update status to wbs_estimate
    const sql = getSql();
    await sql`
      UPDATE opportunities
      SET status = 'wbs_estimate', updated_at = now()
      WHERE id = ${context.opportunityId}
    `;

    return {
      success: true,
      data: {
        message: 'Scope planning complete. Ready for WBS estimation (Phase 3)',
        nextStatus: 'wbs_estimate',
      },
    };
  }

  private async executeWBSEstimation(context: AgentContext): Promise<AgentResult> {
    console.log('📋 Executing WBS + Pricing...');

    const sql = getSql();
    const agent = new WBSEstimatorAgent();
    const result = await agent.execute(context);

    if (result.success) {
      await sql`UPDATE opportunities SET status = 'document_gen', updated_at = now() WHERE id = ${context.opportunityId}`;
      console.log('✅ WBS & Pricing complete — advancing to document_gen');
    }

    return result;
  }

  private async executePricing(context: AgentContext): Promise<AgentResult> {
    // Pricing is combined with WBS in the wbs_estimate step.
    // If status somehow lands on pricing, skip straight to document_gen.
    const sql = getSql();
    await sql`UPDATE opportunities SET status = 'document_gen', updated_at = now() WHERE id = ${context.opportunityId}`;
    return { success: true, data: { message: 'Pricing combined with WBS step — advancing to document_gen' } };
  }

  private async executeDocumentGeneration(context: AgentContext): Promise<AgentResult> {
    console.log('📄 Executing Document Generation...');

    const sql = getSql();
    const agent = new DocumentGeneratorAgent();
    const result = await agent.execute(context);

    if (result.success) {
      await sql`UPDATE opportunities SET status = 'approvals', updated_at = now() WHERE id = ${context.opportunityId}`;
      console.log('✅ Document generation complete — advancing to approvals (Submit Bid)');
    }

    return result;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    // Not used directly - use executeNextStep instead
    return {
      success: false,
      error: 'Use executeNextStep() method',
    };
  }
}
