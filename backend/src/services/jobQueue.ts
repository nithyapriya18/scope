/**
 * Job Queue Service for Async Processing
 * Handles long-running agent tasks with database persistence
 */

import { getSql } from '../lib/sql';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  opportunityId?: string;
  jobType: string;
  status: JobStatus;
  progress?: number; // 0-100
  progressMessage?: string;
  result?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

class JobQueueService {
  private readonly JOB_RETENTION_MS = 3600000; // 1 hour

  /**
   * Create a new job
   */
  async createJob(jobType: string, opportunityId?: string): Promise<Job> {
    const sql = getSql();

    const result = await sql`
      INSERT INTO jobs (job_type, opportunity_id, status, progress, created_at, updated_at)
      VALUES (${jobType}, ${opportunityId || null}, 'pending', 0, now(), now())
      RETURNING
        id,
        opportunity_id as "opportunityId",
        job_type as "jobType",
        status,
        progress,
        progress_message as "progressMessage",
        result,
        error,
        started_at as "startedAt",
        completed_at as "completedAt",
        duration_ms as "durationMs",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    // Clean up old jobs periodically
    this.cleanupOldJobs();

    return result[0] as Job;
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    const sql = getSql();

    const result = await sql`
      SELECT
        id,
        opportunity_id as "opportunityId",
        job_type as "jobType",
        status,
        progress,
        progress_message as "progressMessage",
        result,
        error,
        started_at as "startedAt",
        completed_at as "completedAt",
        duration_ms as "durationMs",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM jobs
      WHERE id = ${jobId}
    `;

    return (result[0] as Job) || null;
  }

  /**
   * Update job progress
   */
  async updateProgress(
    jobId: string,
    progress: number,
    message?: string
  ): Promise<Job | null> {
    const sql = getSql();

    const clampedProgress = Math.min(100, Math.max(0, progress));

    const result = await sql`
      UPDATE jobs
      SET
        status = 'processing',
        progress = ${clampedProgress},
        progress_message = ${message || null},
        started_at = COALESCE(started_at, now()),
        updated_at = now()
      WHERE id = ${jobId}
      RETURNING
        id,
        opportunity_id as "opportunityId",
        job_type as "jobType",
        status,
        progress,
        progress_message as "progressMessage",
        result,
        error,
        started_at as "startedAt",
        completed_at as "completedAt",
        duration_ms as "durationMs",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    return (result[0] as Job) || null;
  }

  /**
   * Mark job as completed
   */
  async completeJob(jobId: string, result: any): Promise<Job | null> {
    const sql = getSql();

    const resultJson = JSON.stringify(result);

    const rows = await sql`
      UPDATE jobs
      SET
        status = 'completed',
        progress = 100,
        result = ${resultJson}::jsonb,
        completed_at = now(),
        duration_ms = EXTRACT(EPOCH FROM (now() - COALESCE(started_at, now()))) * 1000,
        updated_at = now()
      WHERE id = ${jobId}
      RETURNING
        id,
        opportunity_id as "opportunityId",
        job_type as "jobType",
        status,
        progress,
        progress_message as "progressMessage",
        result,
        error,
        started_at as "startedAt",
        completed_at as "completedAt",
        duration_ms as "durationMs",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    return (rows[0] as Job) || null;
  }

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, error: string): Promise<Job | null> {
    const sql = getSql();

    const rows = await sql`
      UPDATE jobs
      SET
        status = 'failed',
        error = ${error},
        completed_at = now(),
        duration_ms = EXTRACT(EPOCH FROM (now() - COALESCE(started_at, now()))) * 1000,
        updated_at = now()
      WHERE id = ${jobId}
      RETURNING
        id,
        opportunity_id as "opportunityId",
        job_type as "jobType",
        status,
        progress,
        progress_message as "progressMessage",
        result,
        error,
        started_at as "startedAt",
        completed_at as "completedAt",
        duration_ms as "durationMs",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    return (rows[0] as Job) || null;
  }

  /**
   * Get all jobs for an opportunity
   */
  async getJobsByOpportunity(opportunityId: string): Promise<Job[]> {
    const sql = getSql();

    const result = await sql`
      SELECT
        id,
        opportunity_id as "opportunityId",
        job_type as "jobType",
        status,
        progress,
        progress_message as "progressMessage",
        result,
        error,
        started_at as "startedAt",
        completed_at as "completedAt",
        duration_ms as "durationMs",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM jobs
      WHERE opportunity_id = ${opportunityId}
      ORDER BY created_at DESC
    `;

    return result as Job[];
  }

  /**
   * Clean up jobs older than retention period
   */
  private async cleanupOldJobs() {
    try {
      const sql = getSql();
      const cutoffTime = new Date(Date.now() - this.JOB_RETENTION_MS);

      await sql`
        DELETE FROM jobs
        WHERE created_at < ${cutoffTime.toISOString()}
      `;
    } catch (error) {
      console.error('Error cleaning up old jobs:', error);
    }
  }

  /**
   * Get all jobs (for monitoring/debugging)
   */
  async getAllJobs(limit: number = 100): Promise<Job[]> {
    const sql = getSql();

    const result = await sql`
      SELECT
        id,
        opportunity_id as "opportunityId",
        job_type as "jobType",
        status,
        progress,
        progress_message as "progressMessage",
        error,
        started_at as "startedAt",
        completed_at as "completedAt",
        duration_ms as "durationMs",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM jobs
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return result as Job[];
  }
}

export const jobQueueService = new JobQueueService();
