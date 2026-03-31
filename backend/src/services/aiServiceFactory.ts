/**
 * AI Service Factory
 * Returns the appropriate AI service based on environment configuration
 */

import { AIService } from './aiServiceTypes';
import { BedrockService } from './bedrock';
import { AnthropicService } from './anthropicService';

// Lazy-load AI service to avoid crashing on startup if credentials are missing
let aiServiceInstance: AIService | null = null;

/**
 * Get the configured AI service
 * Supports: bedrock (AWS), anthropic (direct API — Claude Max)
 */
export function getAIService(): AIService {
  if (aiServiceInstance) {
    return aiServiceInstance;
  }

  const serviceType = process.env.AI_SERVICE_TYPE || 'bedrock';

  console.log(`🤖 Initializing AI service: ${serviceType}`);

  switch (serviceType) {
    case 'anthropic':
      aiServiceInstance = new AnthropicService();
      break;
    case 'bedrock':
    default:
      aiServiceInstance = new BedrockService();
      break;
  }

  return aiServiceInstance;
}

/**
 * Reset the AI service instance (useful for testing or switching services)
 */
export function resetAIService(): void {
  aiServiceInstance = null;
}
