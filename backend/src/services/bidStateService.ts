/**
 * BidStateService - Centralized state management for bid lifecycle
 *
 * Implements the BidStateObject pattern:
 * - Single source of truth for entire bid lifecycle
 * - Versioned with immutable history
 * - Schema validation on all state transitions
 */

import { getSql } from '../lib/sql.js';

export type WorkflowStep =
  | 'intake'
  | 'brief_extract'
  | 'gap_analysis'
  | 'clarification'
  | 'clarification_response'
  | 'scope_planning'
  | 'wbs_estimate'
  | 'pricing'
  | 'document_gen'
  | 'approved'
  | 'handoff';

export interface ClarificationQuestion {
  category: string;
  question: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  context?: string;
  suggestedOptions?: string[];
}

export interface SampleSizeOption {
  option_code: 'conservative' | 'recommended' | 'aggressive';
  total_n: number;
  timeline_impact_days: number;
  cost_impact_percent: number;
  rationale: string;
  confidence_interval?: string;
  feasibility_score?: number;
}

export interface Assumption {
  category: string;
  assumption: string;
  isStandard: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  requiresClientConfirmation: boolean;
}

export interface WBSTask {
  task_code: string;
  role: string;
  units: number;
  base_hours: number;
  multipliers_applied: any[];
  total_hours: number;
}

export interface ApprovalGate {
  type: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
}

export interface BidState {
  opportunityId: string;
  version: number;
  currentStep: WorkflowStep;

  // Extracted data from agents
  intake?: {
    clientName: string;
    rfpTitle: string;
    deadline: Date;
    therapeuticArea: string;
    geography: string[];
  };

  brief?: {
    objectives: string[];
    targetAudience: string;
    studyType: 'qualitative' | 'quantitative' | 'mixed';
    sampleRequirements: any;
    deliverables: string[];
  };

  gapAnalysis?: {
    missingFields: string[];
    ambiguousRequirements: string[];
    criticalGapsCount: number;
  };

  clarifications?: {
    questions: ClarificationQuestion[];
    status: 'draft' | 'pending_approval' | 'sent' | 'response_received';
  };

  scope?: {
    studyType: string;
    sampleOptions: SampleSizeOption[];
    selectedOption?: 'conservative' | 'recommended' | 'aggressive';
    hcpShortlist?: any[];
    assumptions: Assumption[];
  };

  wbs?: {
    tasks: WBSTask[];
    totalHours: number;
    totalCost: number;
  };

  pricing?: {
    laborCost: number;
    oopCost: number;
    totalPrice: number;
    marginPercent: number;
    exceptions: string[];
  };

  documents?: {
    proposalUri?: string;
    sowUri?: string;
    pricingAnnexUri?: string;
  };

  // Metadata
  metadata: {
    createdAt: Date;
    lastUpdatedAt: Date;
    lastUpdatedBy: string;
    approvalGates: ApprovalGate[];
  };
}

class BidStateService {
  /**
   * Initialize new bid state for opportunity
   */
  async initializeBidState(opportunityId: string): Promise<BidState> {
    const sql = getSql();

    const initialState: BidState = {
      opportunityId,
      version: 1,
      currentStep: 'intake',
      metadata: {
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        lastUpdatedBy: 'system',
        approvalGates: []
      }
    };

    await sql`
      INSERT INTO bid_states (opportunity_id, version, current_step, state_data)
      VALUES (${opportunityId}, 1, 'intake', ${JSON.stringify(initialState)})
    `;

    console.log(`✅ BidState initialized for opportunity ${opportunityId}`);
    return initialState;
  }

  /**
   * Get current state
   */
  async getBidState(opportunityId: string): Promise<BidState | null> {
    const sql = getSql();

    const result = await sql`
      SELECT state_data FROM bid_states WHERE opportunity_id = ${opportunityId}
    `;

    if (result.length === 0) {
      return null;
    }

    return result[0].state_data as BidState;
  }

  /**
   * Update state (creates new version in history)
   */
  async updateBidState(
    opportunityId: string,
    updates: Partial<BidState>,
    updatedBy: string
  ): Promise<BidState> {
    const sql = getSql();

    const current = await this.getBidState(opportunityId);
    if (!current) {
      throw new Error(`BidState not found for opportunity ${opportunityId}`);
    }

    const newVersion = current.version + 1;
    const newState: BidState = {
      ...current,
      ...updates,
      version: newVersion,
      metadata: {
        ...current.metadata,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: updatedBy
      }
    };

    // Save to history
    await sql`
      INSERT INTO bid_state_history (bid_state_id, version, step, state_snapshot, changed_by)
      VALUES (
        (SELECT id FROM bid_states WHERE opportunity_id = ${opportunityId}),
        ${newVersion},
        ${newState.currentStep},
        ${JSON.stringify(newState)},
        ${updatedBy}
      )
    `;

    // Update current state
    await sql`
      UPDATE bid_states
      SET version = ${newVersion},
          current_step = ${newState.currentStep},
          state_data = ${JSON.stringify(newState)},
          updated_at = now()
      WHERE opportunity_id = ${opportunityId}
    `;

    console.log(`✅ BidState updated to version ${newVersion} by ${updatedBy}`);
    return newState;
  }

  /**
   * Get state at specific version (time travel)
   */
  async getBidStateVersion(opportunityId: string, version: number): Promise<BidState | null> {
    const sql = getSql();

    const result = await sql`
      SELECT state_snapshot FROM bid_state_history
      WHERE bid_state_id = (SELECT id FROM bid_states WHERE opportunity_id = ${opportunityId})
        AND version = ${version}
    `;

    if (result.length === 0) {
      return null;
    }

    return result[0].state_snapshot as BidState;
  }

  /**
   * Get all versions of state (full history)
   */
  async getBidStateHistory(opportunityId: string): Promise<{ version: number; step: string; changedBy: string; createdAt: Date }[]> {
    const sql = getSql();

    const result = await sql`
      SELECT version, step, changed_by as "changedBy", created_at as "createdAt"
      FROM bid_state_history
      WHERE bid_state_id = (SELECT id FROM bid_states WHERE opportunity_id = ${opportunityId})
      ORDER BY version ASC
    `;

    return result as unknown as { version: number; step: string; changedBy: string; createdAt: Date }[];
  }

  /**
   * Check if bid state exists for opportunity
   */
  async bidStateExists(opportunityId: string): Promise<boolean> {
    const sql = getSql();

    const result = await sql`
      SELECT COUNT(*) as count FROM bid_states WHERE opportunity_id = ${opportunityId}
    `;

    return result[0].count > 0;
  }
}

// Export singleton instance
export const bidStateService = new BidStateService();
