/**
 * Type definitions for AI services
 */

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  modelId: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: any;
}

export interface AgentResponse {
  response: string;
  toolCalls?: ToolCall[];
  usage?: TokenUsage;
  /** Raw content blocks from the model (for building multi-turn tool loops) */
  rawContent?: any[];
  /** Stop reason: 'end_turn' | 'tool_use' */
  stopReason?: string;
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
   * Invoke the AI model with tool use capability.
   * userMessage can be a string or content block array (for tool_result turns).
   */
  invokeWithTools(
    systemPrompt: string,
    userMessage: string | any[],
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
  /** String for simple messages, or content block array for tool_use/tool_result turns */
  content: string | any[];
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
