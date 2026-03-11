/**
 * Type definitions for AI services
 */

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  modelId: string;
}

export interface ToolCall {
  name: string;
  input: any;
}

export interface AgentResponse {
  response: string;
  toolCalls?: ToolCall[];
  usage?: TokenUsage;
}

export interface AIService {
  /**
   * Invoke the AI model with a system prompt and user message
   */
  invoke(
    systemPrompt: string,
    userMessage: string,
    conversationHistory?: ConversationMessage[]
  ): Promise<AgentResponse>;

  /**
   * Invoke the AI model with tool use capability
   */
  invokeWithTools(
    systemPrompt: string,
    userMessage: string,
    tools: Tool[],
    conversationHistory?: ConversationMessage[]
  ): Promise<AgentResponse>;

  /**
   * Get the model ID being used
   */
  getModelId(): string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}
