/**
 * Analytics API Routes
 * Provides business intelligence and performance metrics
 */

import express from 'express';
import { getSql } from '../lib/sql';

const router = express.Router();

/**
 * GET /api/analytics
 * Get comprehensive analytics data
 */
router.get('/', async (req, res) => {
  try {
    const sql = getSql();

    // Calculate overall win rate
    const winRateResult = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'approved') as wins
      FROM opportunities
      WHERE created_at >= NOW() - INTERVAL '2 years'
    `;

    const totalRfps = Number(winRateResult[0]?.total || 0);
    const totalWins = Number(winRateResult[0]?.wins || 0);
    const overallWinRate = totalRfps > 0 ? ((totalWins / totalRfps) * 100).toFixed(1) : 0;

    // Win rate by therapeutic area
    const byTherapeuticArea = await sql`
      SELECT
        therapeutic_area as area,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'approved') as won
      FROM opportunities
      WHERE therapeutic_area IS NOT NULL
        AND created_at >= NOW() - INTERVAL '2 years'
      GROUP BY therapeutic_area
      ORDER BY total DESC
      LIMIT 10
    `;

    const therapeuticAreaData = byTherapeuticArea.map((row: any) => ({
      area: row.area,
      total: Number(row.total),
      won: Number(row.won),
      winRate: Number(row.total) > 0 ? parseFloat((((Number(row.won) / Number(row.total))) * 100).toFixed(1)) : 0,
    }));

    // Monthly RFP volume (last 6 months)
    const monthlyVolume = await sql`
      SELECT
        TO_CHAR(created_at, 'Mon YYYY') as month,
        COUNT(*) as rfps_received,
        COUNT(*) FILTER (WHERE status NOT IN ('intake', 'brief_extract')) as proposals_submitted,
        COUNT(*) FILTER (WHERE status = 'approved') as projects_won
      FROM opportunities
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `;

    const monthlyData = monthlyVolume.map((row: any) => ({
      month: row.month,
      rfpsReceived: Number(row.rfps_received),
      proposalsSubmitted: Number(row.proposals_submitted),
      projectsWon: Number(row.projects_won),
    }));

    // Agent performance metrics
    const agentPerformance = await sql`
      SELECT
        agent_type as agent,
        AVG(EXTRACT(EPOCH FROM (ended_at - started_at))) as avg_time,
        AVG(cost) as avg_cost,
        COUNT(*) as total_runs,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_runs
      FROM llm_usage
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY agent_type
      ORDER BY agent_type
    `;

    const agentData = agentPerformance.map((row: any) => ({
      agent: row.agent,
      avgTime: parseFloat(Number(row.avg_time || 0).toFixed(1)),
      avgCost: parseFloat(Number(row.avg_cost || 0).toFixed(3)),
      successRate: Number(row.total_runs) > 0
        ? parseFloat(((Number(row.successful_runs) / Number(row.total_runs)) * 100).toFixed(1))
        : 0,
    }));

    // Total processing stats
    const processingStats = await sql`
      SELECT
        COUNT(DISTINCT opportunity_id) as rfps_processed,
        SUM(cost) as total_cost,
        AVG(EXTRACT(EPOCH FROM (ended_at - started_at))) as avg_time
      FROM llm_usage
      WHERE created_at >= NOW() - INTERVAL '6 months'
    `;

    const stats = processingStats[0] || {};

    // Respond with analytics data
    res.json({
      winRate: {
        overall: parseFloat(overallWinRate.toString()),
        byTherapeuticArea: therapeuticAreaData,
        byClientType: [
          // Mock data for client types (can be enhanced later)
          { type: 'Big Pharma (Top 10)', total: Math.floor(totalRfps * 0.45), won: Math.floor(totalWins * 0.52), winRate: 50.9 },
          { type: 'Mid-Size Pharma', total: Math.floor(totalRfps * 0.33), won: Math.floor(totalWins * 0.28), winRate: 37.5 },
          { type: 'Biotech', total: Math.floor(totalRfps * 0.22), won: Math.floor(totalWins * 0.20), winRate: 44.0 },
        ],
      },
      pricingIntelligence: {
        // Mock data for pricing (can be enhanced with actual pricing_packs data)
        avgProposalValue: 125000,
        avgWinValue: 132000,
        priceVsWinRate: [
          { priceRange: '$0-$50K', proposals: 28, wins: 15, winRate: 53.6 },
          { priceRange: '$50K-$100K', proposals: 45, wins: 22, winRate: 48.9 },
          { priceRange: '$100K-$200K', proposals: 32, wins: 12, winRate: 37.5 },
          { priceRange: '$200K+', proposals: 15, wins: 5, winRate: 33.3 },
        ],
        competitorPricing: [
          { competitor: 'Insight Co', avgPrice: 115000, marketShare: 28 },
          { competitor: 'Research Partners', avgPrice: 105000, marketShare: 22 },
          { competitor: 'PetaSight (Us)', avgPrice: 125000, marketShare: 18 },
          { competitor: 'DataViz Inc', avgPrice: 98000, marketShare: 15 },
        ],
      },
      volumeTrends: {
        monthlyRfps: monthlyData,
        yearOverYear: [
          // Mock data for year-over-year (can be enhanced with historical data)
          { year: 2023, rfps: 125, wins: 48, revenue: 5800000 },
          { year: 2024, rfps: 158, wins: 64, revenue: 7950000 },
          { year: 2025, rfps: totalRfps, wins: totalWins, revenue: 10250000 },
        ],
      },
      agentPerformance: {
        avgProcessingTime: parseFloat(Number(stats.avg_time || 34).toFixed(1)),
        totalRfpsProcessed: Number(stats.rfps_processed || 0),
        totalLlmCost: parseFloat(Number(stats.total_cost || 0).toFixed(2)),
        byAgent: agentData,
      },
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics', message: error.message });
  }
});

/**
 * GET /api/analytics/win-rate/:therapeuticArea
 * Get detailed win rate analysis for specific therapeutic area
 */
router.get('/win-rate/:therapeuticArea', async (req, res) => {
  try {
    const { therapeuticArea } = req.params;
    const sql = getSql();

    const result = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'approved') as wins,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) / 86400 as avg_days_to_close
      FROM opportunities
      WHERE therapeutic_area = ${therapeuticArea}
        AND created_at >= NOW() - INTERVAL '2 years'
    `;

    const data = result[0];

    res.json({
      therapeuticArea,
      total: Number(data?.total || 0),
      wins: Number(data?.wins || 0),
      winRate: Number(data?.total) > 0
        ? parseFloat((((Number(data.wins) / Number(data.total))) * 100).toFixed(1))
        : 0,
      avgDaysToClose: parseFloat(Number(data?.avg_days_to_close || 0).toFixed(1)),
    });
  } catch (error: any) {
    console.error('Win rate analysis error:', error);
    res.status(500).json({ error: 'Failed to fetch win rate data', message: error.message });
  }
});

export default router;
