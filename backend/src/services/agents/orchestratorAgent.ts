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
// Phase 3+ agents (to be implemented)
// import { WBSEstimatorAgent} from './wbsEstimatorAgent';
// import { PricerAgent } from './pricerAgent';
// import { DocumentGeneratorAgent } from './documentGeneratorAgent';

export type WorkflowStatus =
  | 'intake'
  | 'brief_extract'
  | 'gap_analysis'
  | 'assumption_analysis'
  | 'clarification'
  | 'clarification_response'
  | 'scope_planning'  // Phase 2: Research design (methodology, sample, delivery plan)
  | 'feasibility'     // Phase 2: HCP matching and recruitment feasibility (runs parallel to scope_planning)
  | 'wbs_estimate'    // Phase 3: Work breakdown structure
  | 'pricing'         // Phase 3: Pricing calculation
  | 'document_gen'    // Phase 3: Document generation
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

        case 'brief_extract':
          // Brief extraction complete, move to gap analysis
          return await this.executeGapAnalysis(context);

        case 'gap_analysis':
          // Gap analysis complete, move to assumption analysis
          return await this.executeAssumptionAnalysis(context);

        case 'assumption_analysis':
          // Assumption analysis complete, move to clarification generation
          return await this.executeClarificationGeneration(context);

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
          // After clarification responses received, proceed to scope planning
          return await this.executeScopePlanning(context);

        case 'scope_planning':
        case 'feasibility':
          // Both research design and feasibility complete, proceed to WBS estimation
          return await this.proceedToWBSEstimation(context);

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
    const agent = new GapAnalyzerAgent();
    const result = await agent.execute(context);

    // Update opportunity status on success
    if (result.success) {
      await sql`
        UPDATE opportunities
        SET status = 'gap_analysis', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;
      console.log(`✅ Opportunity status updated to: gap_analysis`);
    }

    return result;
  }

  private async executeAssumptionAnalysis(context: AgentContext): Promise<AgentResult> {
    console.log('🤔 Executing Assumption & Clash Analysis...');

    const sql = getSql();
    const agent = new AssumptionAnalyzerAgent();
    const result = await agent.execute(context);

    // Update opportunity status on success
    if (result.success) {
      await sql`
        UPDATE opportunities
        SET status = 'assumption_analysis', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;
      console.log(`✅ Opportunity status updated to: assumption_analysis`);
    }

    return result;
  }

  private async executeClarificationGeneration(context: AgentContext): Promise<AgentResult> {
    console.log('❓ Executing Clarification Generation...');

    const sql = getSql();
    const agent = new ClarificationGeneratorAgent();
    const result = await agent.execute(context);

    // Update opportunity status on success
    if (result.success) {
      await sql`
        UPDATE opportunities
        SET status = 'clarification', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;
      console.log(`✅ Opportunity status updated to: clarification`);
    }

    return result;
  }

  private async executeScopePlanning(context: AgentContext): Promise<AgentResult> {
    console.log('🎯 Executing Research Design & Feasibility (Phase 2) - Running in parallel...');
    console.log('   📋 Research Design: Study type, methodology, sample size, delivery plan');
    console.log('   👥 Feasibility: HCP matching and recruitment assessment');

    const sql = getSql();

    // Execute both agents in parallel
    const scopeAgent = new ScopePlannerAgent();
    const hcpAgent = new HCPMatcherAgent();

    const [scopeResult, hcpResult] = await Promise.all([
      scopeAgent.execute(context),
      hcpAgent.execute(context)
    ]);

    // Check if both succeeded
    const bothSucceeded = scopeResult.success && hcpResult.success;

    // Update opportunity status on success
    if (bothSucceeded) {
      await sql`
        UPDATE opportunities
        SET status = 'scope_planning', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;
      console.log(`✅ Research Design & Feasibility complete`);
    }

    return {
      success: bothSucceeded,
      data: {
        scopePlanning: scopeResult.data,
        feasibility: hcpResult.data,
        message: bothSucceeded
          ? 'Research design and feasibility analysis complete'
          : 'One or more agents failed',
      },
      error: !bothSucceeded
        ? `Scope: ${scopeResult.error || 'OK'}, HCP: ${hcpResult.error || 'OK'}`
        : undefined,
    };
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
    console.log('📋 Executing WBS Estimation (Phase 3)...');

    // TODO: Implement WBSEstimatorAgent in Phase 3
    return {
      success: false,
      error: 'WBS Estimation agent not yet implemented (Phase 3)',
    };
  }

  private async executePricing(context: AgentContext): Promise<AgentResult> {
    console.log('💰 Executing Pricing (Phase 3)...');

    // TODO: Implement PricerAgent in Phase 3
    return {
      success: false,
      error: 'Pricing agent not yet implemented (Phase 3)',
    };
  }

  private async executeDocumentGeneration(context: AgentContext): Promise<AgentResult> {
    console.log('📄 Executing Document Generation (Phase 3)...');

    // TODO: Implement DocumentGeneratorAgent in Phase 3
    return {
      success: false,
      error: 'Document generation agent not yet implemented (Phase 3)',
    };
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    // Not used directly - use executeNextStep instead
    return {
      success: false,
      error: 'Use executeNextStep() method',
    };
  }
}
