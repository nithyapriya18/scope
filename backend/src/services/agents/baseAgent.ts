/**
 * Base Agent Class
 * Foundation for all specialized agents in the multi-agent system
 */

import { getAIService } from '../aiServiceFactory';
import { jobQueueService } from '../jobQueue';
import { usageTrackingService } from '../usageTracking';
import { AIService, Tool, ConversationMessage, ToolCall } from '../aiServiceTypes';

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

  /**
   * Run an agentic tool loop: call AI with tools, execute tool calls,
   * feed results back, repeat until the model returns a final text response.
   *
   * @param systemPrompt - System prompt for the model
   * @param userMessage - Initial user message
   * @param tools - Tool definitions
   * @param toolHandler - Function that executes a tool call and returns the result string
   * @param context - Agent context for usage tracking
   * @param maxIterations - Safety limit on loop iterations (default 10)
   */
  protected async runToolLoop(
    systemPrompt: string,
    userMessage: string,
    tools: Tool[],
    toolHandler: (toolCall: ToolCall) => Promise<string>,
    context: AgentContext,
    maxIterations: number = 10
  ): Promise<string> {
    const history: ConversationMessage[] = [];
    let currentMessage = userMessage;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const loopStartTime = Date.now();

    for (let i = 0; i < maxIterations; i++) {
      const startTime = Date.now();
      const response = await this.aiService.invokeWithTools(
        systemPrompt,
        currentMessage,
        tools,
        history
      );
      const durationMs = Date.now() - startTime;

      // Accumulate usage
      if (response.usage) {
        totalInputTokens += response.usage.inputTokens;
        totalOutputTokens += response.usage.outputTokens;
      }

      // If no tool calls or stop_reason is end_turn, return the text response
      if (!response.toolCalls?.length || response.stopReason === 'end_turn') {
        // Track total usage for the full loop
        if (response.usage) {
          await usageTrackingService.trackUsage(
            { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, modelId: response.usage.modelId },
            this.agentType as any,
            context.userId,
            context.opportunityId,
            Date.now() - loopStartTime,
            true
          );
        }
        return response.response;
      }

      // Add the assistant's response (with tool_use blocks) to history
      history.push({
        role: 'user',
        content: currentMessage,
      });
      history.push({
        role: 'assistant',
        content: response.rawContent || [],
      });

      // Execute each tool call and build tool_result blocks
      const toolResults: any[] = [];
      for (const toolCall of response.toolCalls) {
        console.log(`  🔧 Tool call [${this.agentType}]: ${toolCall.name}(${JSON.stringify(toolCall.input).substring(0, 100)})`);
        try {
          const result = await toolHandler(toolCall);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolCall.id,
            content: result,
          });
        } catch (err: any) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolCall.id,
            content: `Error: ${err.message}`,
            is_error: true,
          });
        }
      }

      // The next "user" message is the tool results
      currentMessage = toolResults as any;

      console.log(`  📍 Tool loop [${this.agentType}] iteration ${i + 1}: ${response.toolCalls.length} tool(s) called`);
    }

    throw new Error(`Tool loop exceeded ${maxIterations} iterations`);
  }
}
