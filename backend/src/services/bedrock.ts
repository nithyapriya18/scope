/**
 * AWS Bedrock integration for conversational AI
 * Uses Claude Haiku 4.5 for cost-effective, fast responses
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { AIService, AgentResponse, ConversationMessage, Tool, TokenUsage } from './aiServiceTypes';

export class BedrockService implements AIService {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor(modelIdOverride?: string) {
    // Initialize Bedrock client
    const clientConfig: any = {
      region: process.env.AWS_REGION || 'us-east-1',
      requestHandler: {
        requestTimeout: 480000, // 8 minute timeout — account for stream delays on complex extractions
        socketTimeout: 300000, // 5 minute socket timeout to catch dropped connections
      },
      maxAttempts: 2, // Reduce retries: 3x on a slow model wastes minutes before surfacing the error
    };

    // Only add explicit credentials if provided (not using AWS_PROFILE)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN }),
      };
    }

    this.client = new BedrockRuntimeClient(clientConfig);

    // Use Claude Sonnet 4.6 by default (more capable)
    this.modelId = modelIdOverride || process.env.BEDROCK_MODEL_ID || 'global.anthropic.claude-sonnet-4-6';

    console.log(`✅ Bedrock initialized with model: ${this.modelId} in region: ${clientConfig.region}`);
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

    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 32000,
      system: systemPrompt,
      messages,
    };

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    const startTime = Date.now();
    const response = await this.client.send(command);
    const duration = Date.now() - startTime;

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    const usage: TokenUsage = {
      inputTokens: responseBody.usage?.input_tokens || 0,
      outputTokens: responseBody.usage?.output_tokens || 0,
      modelId: this.modelId,
    };

    console.log(
      `🤖 Bedrock response: ${usage.outputTokens} output tokens, ${duration}ms`
    );

    return {
      response: responseBody.content[0]?.text || '',
      usage,
    };
  }

  async invokeWithTools(
    systemPrompt: string,
    userMessage: string,
    tools: Tool[],
    conversationHistory?: ConversationMessage[]
  ): Promise<AgentResponse> {
    const messages = this.buildMessages(userMessage, conversationHistory);

    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 32000,
      system: systemPrompt,
      messages,
      tools,
    };

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    const startTime = Date.now();
    const response = await this.client.send(command);
    const duration = Date.now() - startTime;

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    const usage: TokenUsage = {
      inputTokens: responseBody.usage?.input_tokens || 0,
      outputTokens: responseBody.usage?.output_tokens || 0,
      modelId: this.modelId,
    };

    console.log(
      `🤖 Bedrock response (with tools): ${usage.outputTokens} output tokens, ${duration}ms`
    );

    // Extract tool calls if present
    const toolCalls = responseBody.content
      ?.filter((item: any) => item.type === 'tool_use')
      .map((item: any) => ({
        name: item.name,
        input: item.input,
      }));

    // Extract text response
    const textContent = responseBody.content
      ?.filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('\n');

    return {
      response: textContent || '',
      toolCalls,
      usage,
    };
  }

  private buildMessages(
    userMessage: string,
    conversationHistory?: ConversationMessage[]
  ) {
    const messages: any[] = [];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        if (msg.role !== 'system') {
          // Content may be a JSON string representing an array (tool_use/tool_result blocks)
          let content = msg.content;
          if (typeof content === 'string') {
            try {
              const parsed = JSON.parse(content);
              if (Array.isArray(parsed)) content = parsed;
            } catch { /* keep as string */ }
          }
          messages.push({
            role: msg.role,
            content,
          });
        }
      }
    }

    // Add current user message (skip if empty — tool-use loop passes messages via history)
    if (userMessage) {
      messages.push({
        role: 'user',
        content: userMessage,
      });
    }

    return messages;
  }
}
