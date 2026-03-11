/**
 * Base Agent Class
 * Foundation for all specialized agents in the multi-agent system
 */

import { getAIService } from '../aiServiceFactory';
import { jobQueueService } from '../jobQueue';
import { usageTrackingService } from '../usageTracking';
import { AIService, Tool } from '../aiServiceTypes';

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
   * Override if the agent needs tool use capability
   */
  protected getTools(): Tool[] {
    return [];
  }

  /**
   * Process the agent's specific logic
   * Must be implemented by each agent
   */
  protected abstract process(context: AgentContext): Promise<AgentResult>;

  /**
   * Execute the agent with job tracking
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    const jobType = this.agentType;
    const job = await jobQueueService.createJob(jobType, context.opportunityId);
    const jobId = job.id;

    console.log(`🤖 Agent [${this.agentType}] starting for opportunity ${context.opportunityId}`);

    const startTime = Date.now();

    try {
      // Update progress: started
      await jobQueueService.updateProgress(jobId, 10, `${this.agentType} started`);

      // Execute agent-specific logic
      const result = await this.process(context);

      const durationMs = Date.now() - startTime;

      if (result.success) {
        // Update progress: completed
        await jobQueueService.updateProgress(jobId, 90, `${this.agentType} completed`);
        await jobQueueService.completeJob(jobId, result.data);

        console.log(`✅ Agent [${this.agentType}] completed in ${durationMs}ms`);

        return {
          ...result,
          metadata: {
            ...result.metadata,
            durationMs,
          },
        };
      } else {
        // Mark as failed
        await jobQueueService.failJob(jobId, result.error || 'Unknown error');

        console.error(`❌ Agent [${this.agentType}] failed: ${result.error}`);

        return result;
      }
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      console.error(`❌ Agent [${this.agentType}] exception:`, error);

      // Mark job as failed
      await jobQueueService.failJob(jobId, error.message || 'Unknown error');

      return {
        success: false,
        error: error.message || 'Unknown error',
        metadata: {
          durationMs,
        },
      };
    }
  }

  /**
   * Invoke AI service and track usage
   */
  protected async invokeAI(
    systemPrompt: string,
    userMessage: string,
    context: AgentContext
  ): Promise<string> {
    const startTime = Date.now();

    const response = await this.aiService.invoke(systemPrompt, userMessage);

    const durationMs = Date.now() - startTime;

    // Track usage
    if (response.usage) {
      await usageTrackingService.trackUsage(
        response.usage,
        this.agentType as any,
        context.userId,
        context.opportunityId,
        durationMs,
        true
      );
    }

    return response.response;
  }

  /**
   * Invoke AI service with tools and track usage
   */
  protected async invokeAIWithTools(
    systemPrompt: string,
    userMessage: string,
    tools: Tool[],
    context: AgentContext
  ): Promise<{ response: string; toolCalls?: any[] }> {
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
        context.userId,
        context.opportunityId,
        durationMs,
        true
      );
    }

    return {
      response: response.response,
      toolCalls: response.toolCalls,
    };
  }
}
