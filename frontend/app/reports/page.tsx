'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, TrendingUp, DollarSign, Target, Users, Clock, Award, AlertCircle } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

export default function ReportsPage() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState('last-30-days');

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
  }, [router]);

  // Mock analytics data
  const pipelineMetrics = {
    totalBids: 156,
    wonBids: 98,
    lostBids: 42,
    activeBids: 16,
    winRate: 63,
    avgBidValue: 125000,
    totalRevenue: 12250000,
    avgCycleTime: 18 // days
  };

  const agentPerformance = [
    { name: 'RFP Analysis Agent', executions: 156, avgTime: 2.3, successRate: 100, cost: 0.002 },
    { name: 'Brief Parser Agent', executions: 156, avgTime: 3.8, successRate: 98, cost: 0.005 },
    { name: 'Gap Analyzer Agent', executions: 152, avgTime: 2.7, successRate: 100, cost: 0.003 },
    { name: 'Clarification Generator', executions: 149, avgTime: 3.2, successRate: 99, cost: 0.004 },
    { name: 'Research Design Agent', executions: 98, avgTime: 5.1, successRate: 96, cost: 0.008 },
    { name: 'Feasibility Agent', executions: 94, avgTime: 4.3, successRate: 98, cost: 0.006 },
    { name: 'Pricing Agent', executions: 92, avgTime: 3.9, successRate: 100, cost: 0.007 },
    { name: 'Proposal Generator', executions: 89, avgTime: 6.2, successRate: 97, cost: 0.012 }
  ];

  const therapeuticAreaBreakdown = [
    { area: 'Oncology', bids: 45, won: 32, revenue: 4200000 },
    { area: 'Cardiology', bids: 38, won: 24, revenue: 3100000 },
    { area: 'Immunology', bids: 27, won: 18, revenue: 2400000 },
    { area: 'Neuroscience', bids: 22, won: 12, revenue: 1800000 },
    { area: 'Respiratory', bids: 15, won: 8, revenue: 950000 },
    { area: 'Other', bids: 9, won: 4, revenue: 800000 }
  ];

  const monthlyTrends = [
    { month: 'Sep', bids: 18, won: 11, revenue: 1375000 },
    { month: 'Oct', bids: 22, won: 14, revenue: 1750000 },
    { month: 'Nov', bids: 25, won: 17, revenue: 2125000 },
    { month: 'Dec', bids: 19, won: 13, revenue: 1625000 },
    { month: 'Jan', bids: 28, won: 19, revenue: 2375000 },
    { month: 'Feb', bids: 24, won: 15, revenue: 1875000 }
  ];

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 z-10 flex-shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTimeRange('last-7-days')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                timeRange === 'last-7-days'
                  ? 'bg-gradient-to-r from-primary to-secondary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange('last-30-days')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                timeRange === 'last-30-days'
                  ? 'bg-gradient-to-r from-primary to-secondary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeRange('last-90-days')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                timeRange === 'last-90-days'
                  ? 'bg-gradient-to-r from-primary to-secondary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              90 Days
            </button>
            <button
              onClick={() => setTimeRange('year-to-date')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                timeRange === 'year-to-date'
                  ? 'bg-gradient-to-r from-primary to-secondary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              YTD
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => alert('Export reports functionality coming soon')}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-opacity"
          >
            <BarChart3 size={16} />
            Export Report
          </button>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-8 bg-background-light dark:bg-background-dark">
        {/* Top KPIs */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Total Bids</p>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{pipelineMetrics.totalBids}</h3>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="text-primary" size={20} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={14} />
              +12% vs last period
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Win Rate</p>
                <h3 className="text-3xl font-bold text-emerald-600">{pipelineMetrics.winRate}%</h3>
              </div>
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Award className="text-emerald-600" size={20} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={14} />
              +5% vs last period
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Total Revenue</p>
                <h3 className="text-3xl font-bold text-primary">${(pipelineMetrics.totalRevenue / 1000000).toFixed(1)}M</h3>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="text-primary" size={20} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={14} />
              +18% vs last period
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Avg Cycle Time</p>
                <h3 className="text-3xl font-bold text-secondary">{pipelineMetrics.avgCycleTime}d</h3>
              </div>
              <div className="p-2 bg-secondary/10 rounded-lg">
                <Clock className="text-secondary" size={20} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={14} />
              -3 days vs last period
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Monthly Trends */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Monthly Bid Trends</h3>
            <div className="space-y-3">
              {monthlyTrends.map((month) => (
                <div key={month.month}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{month.month}</span>
                    <span className="text-slate-500">{month.bids} bids</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                        style={{ width: `${(month.won / month.bids) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 w-12 text-right">
                      {Math.round((month.won / month.bids) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Therapeutic Area Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Therapeutic Area Performance</h3>
            <div className="space-y-4">
              {therapeuticAreaBreakdown.map((area) => (
                <div key={area.area} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{area.area}</span>
                      <span className="text-xs text-slate-500">{area.bids} bids</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-cyan-600 rounded-full"
                          style={{ width: `${(area.won / area.bids) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-20">
                        ${(area.revenue / 1000).toFixed(0)}K
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agent Performance Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Agent Performance</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Real-time metrics for all workflow automation agents
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Agent Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Executions</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Time</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Success Rate</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {agentPerformance.map((agent) => (
                  <tr key={agent.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{agent.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{agent.executions}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{agent.avgTime}s</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[100px] h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              agent.successRate >= 98 ? 'bg-emerald-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${agent.successRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white w-12">
                          {agent.successRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-slate-700 dark:text-slate-300">
                        ${agent.cost.toFixed(3)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cost Efficiency Banner */}
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <DollarSign className="text-emerald-600" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                AI Automation Cost Efficiency
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                Average cost per RFP processing: <strong className="text-secondary">$0.014</strong> (~1.4 cents).
                Total AI costs this period: <strong className="text-secondary">$2.18</strong> across {pipelineMetrics.totalBids} bids.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-lg font-semibold text-emerald-600">
                  99% cost reduction vs manual
                </span>
                <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-lg font-semibold text-secondary">
                  85% time saved
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
