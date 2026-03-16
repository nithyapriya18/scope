/**
 * LLM Usage Tracking Service
 * Tracks token usage and costs for all LLM operations
 */

import { getSql } from '../lib/sql';
import { TokenUsage } from './aiServiceTypes';

export type OperationType =
  | 'intake'
  | 'brief_extraction'
  | 'gap_analysis'
  | 'clarification_generation'
  | 'scope_building'
  | 'wbs_estimation'
  | 'pricing_calculation'
  | 'document_generation'
  | 'chat';

interface UsageRecord {
  userId: string;
  opportunityId?: string;
  operationType: OperationType;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  requestDurationMs?: number;
  success: boolean;
  errorMessage?: string;
}

class UsageTrackingService {
  // Claude Model Pricing (as of Jan 2025)
  private readonly MODEL_PRICING: Record<string, { input: number; output: number }> = {
    // Claude Haiku 4.5
    'global.anthropic.claude-haiku-4-5-20251001-v1:0': {
      input: 0.80 / 1_000_000,
      output: 4.00 / 1_000_000,
    },
    'us.anthropic.claude-haiku-4-5-20251001-v1:0': {
      input: 0.80 / 1_000_000,
      output: 4.00 / 1_000_000,
    },
    // Claude Sonnet 4.6
    'global.anthropic.claude-sonnet-4-6': {
      input: 3.00 / 1_000_000,
      output: 15.00 / 1_000_000,
    },
    // Claude Sonnet 4.5 (for reference)
    'us.anthropic.claude-sonnet-4-5-20250929-v1:0': {
      input: 3.00 / 1_000_000,
      output: 15.00 / 1_000_000,
    },
  };

  /**
   * Track LLM usage
   */
  async trackUsage(
    usage: TokenUsage,
    operationType: OperationType,
    userId: string,
    opportunityId?: string,
    requestDurationMs?: number,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    const pricing = this.MODEL_PRICING[usage.modelId] || this.MODEL_PRICING['global.anthropic.claude-sonnet-4-6'];

    const inputCost = usage.inputTokens * pricing.input;
    const outputCost = usage.outputTokens * pricing.output;

    const sql = getSql();

    await sql`
      INSERT INTO llm_usage (
        user_id,
        opportunity_id,
        operation_type,
        model_id,
        input_tokens,
        output_tokens,
        input_cost,
        output_cost,
        request_duration_ms,
        success,
        error_message,
        created_at
      ) VALUES (
        ${userId},
        ${opportunityId || null},
        ${operationType},
        ${usage.modelId},
        ${usage.inputTokens},
        ${usage.outputTokens},
        ${inputCost},
        ${outputCost},
        ${requestDurationMs || null},
        ${success},
        ${errorMessage || null},
        now()
      )
    `;

    console.log(
      `💰 LLM Usage: ${operationType} | ${usage.inputTokens} in + ${usage.outputTokens} out = $${(inputCost + outputCost).toFixed(4)}`
    );
  }

  /**
   * Get usage summary for a user
   */
  async getUserUsageSummary(userId: string, days: number = 30) {
    const sql = getSql();

    const result = await sql`
      SELECT
        operation_type as "operationType",
        COUNT(*) as requests,
        SUM(input_tokens) as "totalInputTokens",
        SUM(output_tokens) as "totalOutputTokens",
        SUM(total_tokens) as "totalTokens",
        SUM(total_cost) as "totalCost",
        AVG(request_duration_ms) as "avgDurationMs"
      FROM llm_usage
      WHERE user_id = ${userId}
        AND created_at >= now() - interval '${days} days'
      GROUP BY operation_type
      ORDER BY "totalCost" DESC
    `;

    return result;
  }

  /**
   * Get usage summary for an opportunity
   */
  async getOpportunityUsageSummary(opportunityId: string) {
    const sql = getSql();

    const result = await sql`
      SELECT
        operation_type as "operationType",
        COUNT(*) as requests,
        SUM(input_tokens) as "totalInputTokens",
        SUM(output_tokens) as "totalOutputTokens",
        SUM(total_tokens) as "totalTokens",
        SUM(total_cost) as "totalCost",
        AVG(request_duration_ms) as "avgDurationMs"
      FROM llm_usage
      WHERE opportunity_id = ${opportunityId}
      GROUP BY operation_type
      ORDER BY created_at ASC
    `;

    return result;
  }

  /**
   * Get total usage stats
   */
  async getTotalUsageStats(days: number = 30) {
    const sql = getSql();

    const result = await sql`
      SELECT
        COUNT(*) as "totalRequests",
        SUM(input_tokens) as "totalInputTokens",
        SUM(output_tokens) as "totalOutputTokens",
        SUM(total_tokens) as "totalTokens",
        SUM(total_cost) as "totalCost",
        AVG(request_duration_ms) as "avgDurationMs",
        COUNT(DISTINCT user_id) as "uniqueUsers",
        COUNT(DISTINCT opportunity_id) as "uniqueOpportunities"
      FROM llm_usage
      WHERE created_at >= now() - interval '${days} days'
    `;

    return result[0];
  }
}

export const usageTrackingService = new UsageTrackingService();
