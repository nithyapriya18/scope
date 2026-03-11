/**
 * Job Queue API Routes
 */

import express from 'express';
import { jobQueueService } from '../services/jobQueue';

const router = express.Router();

/**
 * GET /api/jobs/:id
 * Get job status and result
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const job = await jobQueueService.getJob(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error: any) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job', message: error.message });
  }
});

/**
 * GET /api/jobs
 * Get all jobs (for monitoring)
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const jobs = await jobQueueService.getAllJobs(limit);

    res.json({ jobs, count: jobs.length });
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs', message: error.message });
  }
});

/**
 * GET /api/jobs/opportunity/:opportunityId
 * Get all jobs for an opportunity
 */
router.get('/opportunity/:opportunityId', async (req, res) => {
  try {
    const { opportunityId } = req.params;

    const jobs = await jobQueueService.getJobsByOpportunity(opportunityId);

    res.json({ jobs, count: jobs.length });
  } catch (error: any) {
    console.error('Error fetching opportunity jobs:', error);
    res.status(500).json({ error: 'Failed to fetch opportunity jobs', message: error.message });
  }
});

export default router;
