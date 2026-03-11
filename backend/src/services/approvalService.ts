/**
 * Approval Service
 * Manages human-in-loop approval workflow
 */

import { getSql } from '../lib/sql';

export type ApprovalType =
  | 'clarification_questions'
  | 'scope'
  | 'pricing'
  | 'final_documents';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested';

export interface Approval {
  id: string;
  opportunityId: string;
  approvalType: ApprovalType;
  referenceId: string;
  referenceType: string;
  approvalData: any;
  status: ApprovalStatus;
  requestedFrom?: string;
  requestedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewerNotes?: string;
  revisionInstructions?: string;
}

class ApprovalService {
  /**
   * Request approval for an item
   */
  async requestApproval(
    opportunityId: string,
    approvalType: ApprovalType,
    referenceId: string,
    referenceType: string,
    approvalData: any,
    requestedFrom?: string
  ): Promise<Approval> {
    const sql = getSql();

    const result = await sql`
      INSERT INTO approvals (
        opportunity_id,
        approval_type,
        reference_id,
        reference_type,
        approval_data,
        status,
        requested_from,
        requested_at,
        created_at,
        updated_at
      ) VALUES (
        ${opportunityId},
        ${approvalType},
        ${referenceId},
        ${referenceType},
        ${JSON.stringify(approvalData)}::jsonb,
        'pending',
        ${requestedFrom || null},
        now(),
        now(),
        now()
      )
      RETURNING
        id,
        opportunity_id as "opportunityId",
        approval_type as "approvalType",
        reference_id as "referenceId",
        reference_type as "referenceType",
        approval_data as "approvalData",
        status,
        requested_from as "requestedFrom",
        requested_at as "requestedAt",
        reviewed_by as "reviewedBy",
        reviewed_at as "reviewedAt",
        reviewer_notes as "reviewerNotes",
        revision_instructions as "revisionInstructions"
    `;

    console.log(`📋 Approval requested: ${approvalType} for opportunity ${opportunityId}`);

    return result[0] as Approval;
  }

  /**
   * Get pending approvals for a user
   */
  async getPendingApprovals(userId?: string): Promise<Approval[]> {
    const sql = getSql();

    const query = userId
      ? sql`
          SELECT
            id,
            opportunity_id as "opportunityId",
            approval_type as "approvalType",
            reference_id as "referenceId",
            reference_type as "referenceType",
            approval_data as "approvalData",
            status,
            requested_from as "requestedFrom",
            requested_at as "requestedAt"
          FROM approvals
          WHERE status = 'pending'
            AND (requested_from = ${userId} OR requested_from IS NULL)
          ORDER BY requested_at DESC
        `
      : sql`
          SELECT
            id,
            opportunity_id as "opportunityId",
            approval_type as "approvalType",
            reference_id as "referenceId",
            reference_type as "referenceType",
            approval_data as "approvalData",
            status,
            requested_from as "requestedFrom",
            requested_at as "requestedAt"
          FROM approvals
          WHERE status = 'pending'
          ORDER BY requested_at DESC
        `;

    return (await query) as Approval[];
  }

  /**
   * Get approval by ID
   */
  async getApproval(approvalId: string): Promise<Approval | null> {
    const sql = getSql();

    const result = await sql`
      SELECT
        id,
        opportunity_id as "opportunityId",
        approval_type as "approvalType",
        reference_id as "referenceId",
        reference_type as "referenceType",
        approval_data as "approvalData",
        status,
        requested_from as "requestedFrom",
        requested_at as "requestedAt",
        reviewed_by as "reviewedBy",
        reviewed_at as "reviewedAt",
        reviewer_notes as "reviewerNotes",
        revision_instructions as "revisionInstructions"
      FROM approvals
      WHERE id = ${approvalId}
    `;

    return (result[0] as Approval) || null;
  }

  /**
   * Approve an item
   */
  async approve(
    approvalId: string,
    reviewedBy: string,
    reviewerNotes?: string
  ): Promise<Approval> {
    const sql = getSql();

    const result = await sql`
      UPDATE approvals
      SET
        status = 'approved',
        reviewed_by = ${reviewedBy},
        reviewed_at = now(),
        reviewer_notes = ${reviewerNotes || null},
        updated_at = now()
      WHERE id = ${approvalId}
      RETURNING
        id,
        opportunity_id as "opportunityId",
        approval_type as "approvalType",
        reference_id as "referenceId",
        reference_type as "referenceType",
        status
    `;

    const approval = result[0] as Approval;

    // Handle post-approval actions based on type
    await this.handleApprovalAction(approval);

    console.log(`✅ Approval granted: ${approval.approvalType} for opportunity ${approval.opportunityId}`);

    return approval;
  }

  /**
   * Reject an item
   */
  async reject(
    approvalId: string,
    reviewedBy: string,
    reviewerNotes?: string
  ): Promise<Approval> {
    const sql = getSql();

    const result = await sql`
      UPDATE approvals
      SET
        status = 'rejected',
        reviewed_by = ${reviewedBy},
        reviewed_at = now(),
        reviewer_notes = ${reviewerNotes || null},
        updated_at = now()
      WHERE id = ${approvalId}
      RETURNING
        id,
        opportunity_id as "opportunityId",
        approval_type as "approvalType",
        reference_id as "referenceId"
    `;

    console.log(`❌ Approval rejected: ${result[0].approvalType}`);

    return result[0] as Approval;
  }

  /**
   * Request revision
   */
  async requestRevision(
    approvalId: string,
    reviewedBy: string,
    revisionInstructions: string,
    reviewerNotes?: string
  ): Promise<Approval> {
    const sql = getSql();

    const result = await sql`
      UPDATE approvals
      SET
        status = 'revision_requested',
        reviewed_by = ${reviewedBy},
        reviewed_at = now(),
        reviewer_notes = ${reviewerNotes || null},
        revision_instructions = ${revisionInstructions},
        updated_at = now()
      WHERE id = ${approvalId}
      RETURNING
        id,
        opportunity_id as "opportunityId",
        approval_type as "approvalType",
        reference_id as "referenceId"
    `;

    console.log(`🔄 Revision requested: ${result[0].approvalType}`);

    return result[0] as Approval;
  }

  /**
   * Handle post-approval actions
   */
  private async handleApprovalAction(approval: Approval): Promise<void> {
    const sql = getSql();

    switch (approval.approvalType) {
      case 'clarification_questions':
        // Update clarification status to 'sent'
        await sql`
          UPDATE clarifications
          SET status = 'sent', approved_at = now(), updated_at = now()
          WHERE id = ${approval.referenceId}
        `;

        // Update opportunity status (waiting for response)
        await sql`
          UPDATE opportunities
          SET status = 'clarification_response', updated_at = now()
          WHERE id = ${approval.opportunityId}
        `;
        break;

      case 'final_documents':
        // Update document status to 'approved'
        await sql`
          UPDATE documents
          SET status = 'approved', approved_at = now(), updated_at = now()
          WHERE opportunity_id = ${approval.opportunityId}
        `;

        // Update opportunity status to 'approved'
        await sql`
          UPDATE opportunities
          SET status = 'approved', updated_at = now()
          WHERE id = ${approval.opportunityId}
        `;
        break;

      default:
        // No automatic action for other approval types
        break;
    }
  }
}

export const approvalService = new ApprovalService();
