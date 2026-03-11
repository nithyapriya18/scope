/**
 * Base Agent Class (Refactored for Phase 2)
 *
 * NEW ARCHITECTURE:
 * - Reads/writes BidState (not direct database access)
 * - Validates transitions with Quality Gates
 * - Logs all actions to AuditEvents
 * - Publishes events to Event Bus
 */

import { getAIService } from '../aiServiceFactory.js';
import { jobQueueService } from '../jobQueue.js';
import { usageTrackingService } from '../usageTracking.js';
import { bidStateService, BidState, WorkflowStep } from '../bidStateService.js';
import { qualityGateService } from '../qualityGateService.js';
import { auditEventService } from '../auditEventService.js';
import { eventBusService, WorkflowEvent } from '../eventBusService.js';
import { AIService, Tool } from '../aiServiceTypes.js';

export interface AgentContext {
  opportunityId: string;
  userId: string;
  data?: any;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    tokensUsed?: number;
    durationMs?: number;
    confidence?: number;
  };
}

export interface AgentProcessResult {
  stateUpdates: Partial<BidState>;
  nextStep?: WorkflowStep;
  event?: WorkflowEvent;
  data?: any;
  metadata?: any;
}

export abstract class BaseAgent {
  protected aiService: AIService;
  protected abstract agentType: string;

  constructor() {
    this.aiService = getAIService();
  }

  /**
   * Get the system prompt for this agent
   * Must be implemented by each agent
   */
  protected abstract getSystemPrompt(context: AgentContext): string;

  /**
   * Get tools for this agent (optional)
   */
  protected getTools(): Tool[] {
    return [];
  }

  /**
   * Process the agent's specific logic (NEW SIGNATURE)
   * Returns state updates + next step + event
   */
  protected abstract process(
    bidState: BidState,
    context: AgentContext
  ): Promise<AgentProcessResult>;

  /**
   * Execute the agent with full orchestration (REFACTORED)
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    const { opportunityId, userId } = context;
    const jobType = this.agentType;

    console.log(`🤖 Agent [${this.agentType}] starting for opportunity ${opportunityId}`);

    const startTime = Date.now();

    // Create job for tracking
    const job = await jobQueueService.createJob(jobType, opportunityId);
    const jobId = job.id;

    try {
      // 1. Load BidState
      let bidState = await bidStateService.getBidState(opportunityId);

      if (!bidState) {
        // Initialize BidState if not exists
        bidState = await bidStateService.initializeBidState(opportunityId);
      }

      // 2. Log agent started
      await auditEventService.logEvent(
        opportunityId,
        'AgentStarted',
        this.agentType,
        {
          agentType: this.agentType,
          currentStep: bidState.currentStep,
          version: bidState.version
        }
      );

      // 3. Update job progress
      await jobQueueService.updateProgress(jobId, 10, `${this.agentType} started`);

      // 4. Execute agent-specific logic
      const processResult = await this.process(bidState, context);

      // 5. Update BidState with agent's output
      const updatedBidState = await bidStateService.updateBidState(
        opportunityId,
        processResult.stateUpdates,
        this.agentType
      );

      // 6. Log agent completed
      await auditEventService.logEvent(
        opportunityId,
        'AgentCompleted',
        this.agentType,
        {
          agentType: this.agentType,
          stateVersion: updatedBidState.version,
          hasNextStep: !!processResult.nextStep,
          nextStep: processResult.nextStep
        }
      );

      // 7. Run quality gate (if next step specified)
      if (processResult.nextStep) {
        const gateCode = `${bidState.currentStep}_to_${processResult.nextStep}`;

        console.log(`   → Running quality gate: ${gateCode}`);

        const gateResult = await qualityGateService.executeGate(gateCode, updatedBidState);

        if (!gateResult.passed) {
          // Quality gate failed - don't progress
          await auditEventService.logEvent(
            opportunityId,
            'QualityGateFailed',
            this.agentType,
            {
              gateCode,
              checks: gateResult.checks,
              failedChecks: gateResult.checks.filter(c => !c.passed)
            }
          );

          throw new Error(`Quality gate failed: ${gateCode}`);
        }

        await auditEventService.logEvent(
          opportunityId,
          'QualityGatePassed',
          this.agentType,
          { gateCode, checks: gateResult.checks }
        );

        // Update current step in BidState
        await bidStateService.updateBidState(
          opportunityId,
          { currentStep: processResult.nextStep },
          this.agentType
        );
      }

      // 8. Publish event (triggers next agents)
      if (processResult.event) {
        console.log(`   → Publishing event: ${processResult.event}`);

        await eventBusService.publish(processResult.event, {
          opportunityId,
          bidState: updatedBidState
        });
      }

      // 9. Mark job complete
      const durationMs = Date.now() - startTime;
      await jobQueueService.updateProgress(jobId, 90, `${this.agentType} completed`);
      await jobQueueService.completeJob(jobId, processResult.data);

      console.log(`✅ Agent [${this.agentType}] completed in ${durationMs}ms`);

      return {
        success: true,
        data: processResult.data,
        metadata: {
          ...processResult.metadata,
          durationMs
        }
      };

    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      console.error(`❌ Agent [${this.agentType}] exception:`, error);

      // Log failure
      await auditEventService.logEvent(
        opportunityId,
        'AgentFailed',
        this.agentType,
        {
          error: error.message,
          stack: error.stack
        }
      );

      // Mark job as failed
      await jobQueueService.failJob(jobId, error.message || 'Unknown error');

      return {
        success: false,
        error: error.message || 'Unknown error',
        metadata: { durationMs }
      };
    }
  }

  /**
   * Invoke AI service and track usage (ENHANCED)
   */
  protected async invokeAI(
    systemPrompt: string,
    userMessage: string,
    opportunityId: string
  ): Promise<{ response: string; usage: any }> {
    const startTime = Date.now();

    const response = await this.aiService.invoke(systemPrompt, userMessage);

    const durationMs = Date.now() - startTime;

    // Track usage
    if (response.usage) {
      await usageTrackingService.trackUsage(
        response.usage,
        this.agentType as any,
        'system',
        opportunityId,
        durationMs,
        true
      );

      // Log LLM invocation to audit trail
      await auditEventService.logEvent(
        opportunityId,
        'LLMInvoked',
        this.agentType,
        {
          model: this.aiService.getModelId(),
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cost: response.usage.total_cost,
          durationMs
        }
      );
    }

    return { response: response.response, usage: response.usage };
  }

  /**
   * Invoke AI service with tools and track usage (ENHANCED)
   */
  protected async invokeAIWithTools(
    systemPrompt: string,
    userMessage: string,
    tools: Tool[],
    opportunityId: string
  ): Promise<{ response: string; toolCalls?: any[]; usage: any }> {
    const startTime = Date.now();

    const response = await this.aiService.invokeWithTools(
      systemPrompt,
      userMessage,
      tools
    );

    const durationMs = Date.now() - startTime;

    // Track usage
    if (response.usage) {
      await usageTrackingService.trackUsage(
        response.usage,
        this.agentType as any,
        'system',
        opportunityId,
        durationMs,
        true
      );

      // Log LLM invocation to audit trail
      await auditEventService.logEvent(
        opportunityId,
        'LLMInvoked',
        this.agentType,
        {
          model: this.aiService.getModelId(),
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cost: response.usage.total_cost,
          durationMs,
          toolsUsed: tools.map(t => t.name)
        }
      );
    }

    return {
      response: response.response,
      toolCalls: response.toolCalls,
      usage: response.usage
    };
  }
}
