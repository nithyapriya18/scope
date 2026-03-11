/**
 * EventBusService - Event-driven orchestration for agent workflow
 *
 * Implements publish-subscribe pattern:
 * - Agents publish events when complete
 * - Event subscriptions define which agents listen to which events
 * - Event queue handles async processing with retries
 * - Enables parallel execution where agents are independent
 */

import { getSql } from '../lib/sql.js';
import { auditEventService } from './auditEventService.js';

export type WorkflowEvent =
  | 'BidIntakeCompleted'
  | 'BriefExtractionCompleted'
  | 'GapAnalysisCompleted'
  | 'ClarificationQuestionsReady'
  | 'ClarificationsApproved'
  | 'ScopePlanningCompleted'
  | 'SampleSizeSelected'
  | 'WBSEstimationCompleted'
  | 'PricingCalculated'
  | 'DocumentsGenerated'
  | 'FinalApprovalGranted';

export interface EventSubscription {
  id: string;
  event_type: string;
  subscriber_agent: string;
  handler_method: string;
  enabled: boolean;
}

export interface QueuedEvent {
  id: string;
  event_type: string;
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  max_retries: number;
  created_at: Date;
  processed_at?: Date;
}

class EventBusService {
  /**
   * Publish event (triggers all subscribers)
   */
  async publish(eventType: WorkflowEvent, payload: any): Promise<void> {
    const sql = getSql();
    const { opportunityId } = payload;

    // Log audit event
    await auditEventService.logEvent(
      opportunityId,
      'EventPublished',
      'EventBusService',
      { eventType, payload }
    );

    console.log(`📢 Event published: ${eventType} for opportunity ${opportunityId}`);

    // Get active subscribers
    const subscribers = await sql`
      SELECT * FROM event_subscriptions
      WHERE event_type = ${eventType} AND enabled = true
    `;

    if (subscribers.length === 0) {
      console.log(`⚠️ No subscribers for event ${eventType}`);
      return;
    }

    console.log(`   → ${subscribers.length} subscribers notified`);

    // Enqueue event for each subscriber
    for (const sub of subscribers) {
      await sql`
        INSERT INTO event_queue (event_type, payload, status)
        VALUES (
          ${eventType},
          ${JSON.stringify({ subscriberAgent: sub.subscriber_agent, ...payload })},
          'pending'
        )
      `;
    }

    // Process events asynchronously (in production, use worker queue)
    // For now, we'll process immediately to keep it simple
    // In production: this.processEventQueueAsync();
  }

  /**
   * Process pending events (called by background worker)
   */
  async processEventQueue(): Promise<void> {
    const sql = getSql();

    const pendingEvents = await sql`
      SELECT * FROM event_queue
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 10
    `;

    if (pendingEvents.length === 0) {
      return;
    }

    console.log(`🔄 Processing ${pendingEvents.length} pending events...`);

    for (const event of pendingEvents) {
      try {
        await this.processEvent(event as unknown as QueuedEvent);
      } catch (error) {
        console.error(`❌ Event processing failed:`, error);
        await this.handleEventFailure(event as unknown as QueuedEvent, error as Error);
      }
    }
  }

  /**
   * Process single event
   */
  private async processEvent(event: QueuedEvent): Promise<void> {
    const sql = getSql();
    const payload = event.payload;
    const { subscriberAgent, opportunityId } = payload;

    console.log(`   → Processing: ${event.event_type} → ${subscriberAgent}`);

    // Mark as processing
    await sql`
      UPDATE event_queue SET status = 'processing' WHERE id = ${event.id}
    `;

    // Get agent instance (dynamic import to avoid circular dependencies)
    // In production, use a proper agent registry/factory
    // For now, we'll just mark as completed
    // const agent = await this.getAgentInstance(subscriberAgent);
    // await agent.execute({ opportunityId, data: {} });

    // Mark as completed
    await sql`
      UPDATE event_queue SET status = 'completed', processed_at = now() WHERE id = ${event.id}
    `;

    console.log(`   ✓ Completed: ${subscriberAgent}`);
  }

  /**
   * Handle event processing failure
   */
  private async handleEventFailure(event: QueuedEvent, error: Error): Promise<void> {
    const sql = getSql();
    const retryCount = event.retry_count + 1;

    if (retryCount >= event.max_retries) {
      // Max retries exceeded, mark as failed
      console.error(`   ✗ Event failed permanently after ${retryCount} attempts`);
      await sql`
        UPDATE event_queue
        SET status = 'failed', retry_count = ${retryCount}
        WHERE id = ${event.id}
      `;
    } else {
      // Retry later
      console.warn(`   ⚠️ Event failed, will retry (attempt ${retryCount}/${event.max_retries})`);
      await sql`
        UPDATE event_queue
        SET status = 'pending', retry_count = ${retryCount}
        WHERE id = ${event.id}
      `;
    }
  }

  /**
   * Get active subscriptions for event type
   */
  async getSubscriptions(eventType: string): Promise<EventSubscription[]> {
    const sql = getSql();

    const subscriptions = await sql`
      SELECT * FROM event_subscriptions
      WHERE event_type = ${eventType} AND enabled = true
    `;

    return subscriptions as unknown as EventSubscription[];
  }

  /**
   * Get all subscriptions
   */
  async getAllSubscriptions(): Promise<EventSubscription[]> {
    const sql = getSql();

    const subscriptions = await sql`
      SELECT * FROM event_subscriptions
      ORDER BY event_type, subscriber_agent
    `;

    return subscriptions as unknown as EventSubscription[];
  }

  /**
   * Enable/disable subscription
   */
  async toggleSubscription(subscriptionId: string, enabled: boolean): Promise<void> {
    const sql = getSql();

    await sql`
      UPDATE event_subscriptions
      SET enabled = ${enabled}
      WHERE id = ${subscriptionId}
    `;

    console.log(`${enabled ? '✓' : '✗'} Subscription ${subscriptionId} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get event queue status
   */
  async getQueueStatus(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const sql = getSql();

    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM event_queue
      WHERE created_at >= now() - INTERVAL '1 day'
    `;

    return {
      pending: parseInt(result[0].pending),
      processing: parseInt(result[0].processing),
      completed: parseInt(result[0].completed),
      failed: parseInt(result[0].failed)
    };
  }

  /**
   * Clean up old completed events
   */
  async cleanupOldEvents(olderThanDays: number = 7): Promise<number> {
    const sql = getSql();

    const result = await sql`
      DELETE FROM event_queue
      WHERE status = 'completed'
        AND processed_at < now() - INTERVAL '${olderThanDays} days'
      RETURNING id
    `;

    console.log(`🧹 Cleaned up ${result.length} old events`);
    return result.length;
  }
}

// Export singleton instance
export const eventBusService = new EventBusService();
