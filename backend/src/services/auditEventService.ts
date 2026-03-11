/**
 * AuditEventService - Immutable audit trail for all decisions and state changes
 *
 * Provides full provenance tracking:
 * - Every agent execution logged
 * - Every LLM invocation tracked with cost
 * - Every approval decision recorded
 * - Evidence snippets link decisions back to RFP source
 */

import { getSql } from '../lib/sql.js';

export type AuditEventType =
  | 'AgentStarted'
  | 'AgentCompleted'
  | 'AgentFailed'
  | 'DataExtracted'
  | 'QualityGatePassed'
  | 'QualityGateFailed'
  | 'ApprovalRequested'
  | 'ApprovalGranted'
  | 'ApprovalRejected'
  | 'StateTransition'
  | 'DocumentGenerated'
  | 'LLMInvoked'
  | 'EventPublished';

export interface Evidence {
  field: string;
  snippet: string;
  confidence: number;
}

export interface AuditEvent {
  id: string;
  bid_state_id: string;
  event_type: AuditEventType;
  event_source: string;
  event_data: any;
  evidence?: Evidence[];
  created_at: Date;
}

class AuditEventService {
  /**
   * Log audit event
   */
  async logEvent(
    opportunityId: string,
    eventType: AuditEventType,
    eventSource: string,
    eventData: any,
    evidence?: Evidence[]
  ): Promise<void> {
    const sql = getSql();

    try {
      await sql`
        INSERT INTO audit_events (bid_state_id, event_type, event_source, event_data, evidence)
        VALUES (
          (SELECT id FROM bid_states WHERE opportunity_id = ${opportunityId}),
          ${eventType},
          ${eventSource},
          ${JSON.stringify(eventData)},
          ${evidence ? JSON.stringify(evidence) : null}
        )
      `;

      // Log to console for debugging
      const evidenceStr = evidence ? ` (${evidence.length} evidence snippets)` : '';
      console.log(`📝 Audit: [${eventType}] ${eventSource}${evidenceStr}`);
    } catch (error) {
      // Don't throw - audit logging should never block workflow
      console.error(`⚠️ Failed to log audit event:`, error);
    }
  }

  /**
   * Get audit trail for opportunity
   */
  async getAuditTrail(opportunityId: string): Promise<AuditEvent[]> {
    const sql = getSql();

    const events = await sql`
      SELECT * FROM audit_events
      WHERE bid_state_id = (SELECT id FROM bid_states WHERE opportunity_id = ${opportunityId})
      ORDER BY created_at ASC
    `;

    return events as unknown as AuditEvent[];
  }

  /**
   * Get events by type (for analytics)
   */
  async getEventsByType(eventType: AuditEventType, days: number = 30): Promise<AuditEvent[]> {
    const sql = getSql();

    const events = await sql`
      SELECT * FROM audit_events
      WHERE event_type = ${eventType}
        AND created_at >= now() - INTERVAL '${days} days'
      ORDER BY created_at DESC
    `;

    return events as unknown as AuditEvent[];
  }

  /**
   * Get events by source (agent name)
   */
  async getEventsBySource(eventSource: string, days: number = 30): Promise<AuditEvent[]> {
    const sql = getSql();

    const events = await sql`
      SELECT * FROM audit_events
      WHERE event_source = ${eventSource}
        AND created_at >= now() - INTERVAL '${days} days'
      ORDER BY created_at DESC
    `;

    return events as unknown as AuditEvent[];}

  /**
   * Get recent events (last N)
   */
  async getRecentEvents(limit: number = 100): Promise<AuditEvent[]> {
    const sql = getSql();

    const events = await sql`
      SELECT * FROM audit_events
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return events as unknown as AuditEvent[];
  }

  /**
   * Get events with evidence (for provenance tracking)
   */
  async getEventsWithEvidence(opportunityId: string): Promise<AuditEvent[]> {
    const sql = getSql();

    const events = await sql`
      SELECT * FROM audit_events
      WHERE bid_state_id = (SELECT id FROM bid_states WHERE opportunity_id = ${opportunityId})
        AND evidence IS NOT NULL
      ORDER BY created_at ASC
    `;

    return events as unknown as AuditEvent[];
  }

  /**
   * Get agent execution timeline
   */
  async getAgentTimeline(opportunityId: string): Promise<{
    agent: string;
    started_at: Date;
    completed_at?: Date;
    duration_ms?: number;
    status: 'running' | 'completed' | 'failed';
  }[]> {
    const sql = getSql();

    const events = await sql`
      SELECT * FROM audit_events
      WHERE bid_state_id = (SELECT id FROM bid_states WHERE opportunity_id = ${opportunityId})
        AND event_type IN ('AgentStarted', 'AgentCompleted', 'AgentFailed')
      ORDER BY created_at ASC
    `;

    // Group by agent to calculate durations
    const timeline: Map<string, any> = new Map();

    for (const event of events) {
      const agentName = event.event_data.agentName || event.event_source;

      if (event.event_type === 'AgentStarted') {
        timeline.set(agentName, {
          agent: agentName,
          started_at: event.created_at,
          status: 'running'
        });
      } else if (event.event_type === 'AgentCompleted') {
        const existing = timeline.get(agentName);
        if (existing) {
          const duration = new Date(event.created_at).getTime() - new Date(existing.started_at).getTime();
          timeline.set(agentName, {
            ...existing,
            completed_at: event.created_at,
            duration_ms: duration,
            status: 'completed'
          });
        }
      } else if (event.event_type === 'AgentFailed') {
        const existing = timeline.get(agentName);
        if (existing) {
          const duration = new Date(event.created_at).getTime() - new Date(existing.started_at).getTime();
          timeline.set(agentName, {
            ...existing,
            completed_at: event.created_at,
            duration_ms: duration,
            status: 'failed'
          });
        }
      }
    }

    return Array.from(timeline.values());
  }

  /**
   * Get LLM usage summary from audit events
   */
  async getLLMUsageSummary(opportunityId: string): Promise<{
    total_invocations: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_cost: number;
  }> {
    const sql = getSql();

    const events = await sql`
      SELECT event_data FROM audit_events
      WHERE bid_state_id = (SELECT id FROM bid_states WHERE opportunity_id = ${opportunityId})
        AND event_type = 'LLMInvoked'
    `;

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;

    for (const event of events) {
      const data = event.event_data;
      totalInputTokens += data.inputTokens || 0;
      totalOutputTokens += data.outputTokens || 0;
      totalCost += data.cost || 0;
    }

    return {
      total_invocations: events.length,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      total_cost: totalCost
    };
  }
}

// Export singleton instance
export const auditEventService = new AuditEventService();
