/**
 * Anthropic direct API integration (Claude Max)
 * Drop-in replacement for BedrockService — same AIService interface
 */

import Anthropic from '@anthropic-ai/sdk';
import { AIService, AgentResponse, ConversationMessage, Tool, TokenUsage } from './aiServiceTypes';

export class AnthropicService implements AIService {
  private client: Anthropic;
  private modelId: string;

  constructor(modelIdOverride?: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required for AnthropicService');
    }

    this.client = new Anthropic({
      apiKey,
      timeout: 480000,
      maxRetries: 2,
    });

    this.modelId = modelIdOverride || process.env.ANTHROPIC_MODEL_ID || 'claude-sonnet-4-6';

    console.log(`✅ Anthropic direct API initialized with model: ${this.modelId}`);
  }

  getModelId(): string {
    return this.modelId;
  }

  async invoke(
    systemPrompt: string,
    userMessage: string,
    conversationHistory?: ConversationMessage[]
  ): Promise<AgentResponse> {
    const messages = this.buildMessages(userMessage, conversationHistory);

    const startTime = Date.now();
    const response = await this.client.messages.create({
      model: this.modelId,
      max_tokens: 32000,
      system: systemPrompt,
      messages,
    });
    const duration = Date.now() - startTime;

    const usage: TokenUsage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      modelId: this.modelId,
    };

    console.log(`🤖 Anthropic response: ${usage.outputTokens} output tokens, ${duration}ms`);

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n');

    return { response: text, usage };
  }

  async invokeWithTools(
    systemPrompt: string,
    userMessage: string | any[],
    tools: Tool[],
    conversationHistory?: ConversationMessage[]
  ): Promise<AgentResponse> {
    const messages = this.buildMessages(userMessage, conversationHistory);

    const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }));

    const startTime = Date.now();
    const response = await this.client.messages.create({
      model: this.modelId,
      max_tokens: 32000,
      system: systemPrompt,
      messages,
      tools: anthropicTools,
    });
    const duration = Date.now() - startTime;

    const usage: TokenUsage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      modelId: this.modelId,
    };

    console.log(`🤖 Anthropic response (with tools): ${usage.outputTokens} output tokens, ${duration}ms`);

    const toolCalls = response.content
      .filter((b) => b.type === 'tool_use')
      .map((b) => {
        const tb = b as Anthropic.ToolUseBlock;
        return { id: tb.id, name: tb.name, input: tb.input };
      });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n');

    return {
      response: text,
      toolCalls,
      usage,
      rawContent: response.content as any[],
      stopReason: response.stop_reason ?? undefined,
    };
  }

  private buildMessages(
    userMessage: string | any[],
    conversationHistory?: ConversationMessage[]
  ): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = [];

    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        if (msg.role !== 'system') {
          messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
        }
      }
    }

    messages.push({ role: 'user', content: userMessage });
    return messages;
  }
}
