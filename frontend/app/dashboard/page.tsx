'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Bell, TrendingUp, Calendar, Trash2, Download, FileText } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import * as XLSX from 'xlsx';

interface Opportunity {
  id: string;
  rfpTitle: string | null;
  clientName: string | null;
  status: string;
  createdAt: string;
  rfpDeadline: string | null;
  therapeuticArea: string | null;
}

const statusMap: Record<string, string> = {
  intake: 'Intake Agent',
  brief_extract: 'Brief Parser Agent',
  gap_analysis: 'Gap Analyzer Agent',
  clarification: 'Clarifications Agent',
  scope_planning: 'Research Design Agent',
  feasibility: 'Feasibility Agent',
  workplan: 'Workplan Agent',
  wbs_estimate: 'Estimation Agent',
  pricing: 'Pricing Agent',
  proposal: 'Proposal Agent',
  approvals: 'Approvals Agent',
};

const studyTypeMap: Record<string, { label: string; color: string }> = {
  oncology: { label: 'CLINICAL', color: 'bg-blue-100 text-blue-700' },
  cardiology: { label: 'OBSERVATIONAL', color: 'bg-emerald-100 text-emerald-700' },
  immunology: { label: 'CLINICAL', color: 'bg-blue-100 text-blue-700' },
  device: { label: 'PILOT', color: 'bg-purple-100 text-purple-700' },
  behavioral: { label: 'BEHAVIORAL', color: 'bg-orange-100 text-orange-700' },
  genomic: { label: 'R&D', color: 'bg-pink-100 text-pink-700' },
};

const getStudyType = (area: string | null) => {
  if (!area) return studyTypeMap.genomic;
  const key = area.toLowerCase();
  return studyTypeMap[key] || { label: 'GENERAL', color: 'bg-gray-100 text-gray-700' };
};

const getProgressPercent = (status: string): number => {
  const steps = ['intake', 'brief_extract', 'gap_analysis', 'clarification', 'scope_planning', 'feasibility', 'workplan', 'wbs_estimate', 'pricing', 'proposal', 'approvals'];
  const index = steps.indexOf(status);
  return index >= 0 ? Math.round(((index + 1) / steps.length) * 100) : 5;
};

const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    intake: 'Intake',
    brief_extract: 'Brief Parsing',
    gap_analysis: 'Gap Analysis',
    clarification: 'Clarifications',
    scope_planning: 'Research Design',
    feasibility: 'Feasibility Check',
    workplan: 'Workplan',
    wbs_estimate: 'WBS Estimation',
    pricing: 'Pricing',
    proposal: 'Proposal Generation',
    approvals: 'Internal Approvals',
  };
  return statusLabels[status] || 'Unknown';
};

const getDaysUntilDeadline = (deadline: string | null): number => {
  if (!deadline) return 999;
  const now = new Date();
  const due = new Date(deadline);
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default function DashboardPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchOpportunities = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities`);
      if (response.ok) {
        const data = await response.json();
        setOpportunities(data.opportunities || []);
      }
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }

    fetchOpportunities();
  }, [router]);

  const filtered = useMemo(() => {
    return opportunities.filter((o) =>
      o.rfpTitle?.toLowerCase().includes(search.toLowerCase()) ||
      o.clientName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, opportunities]);

  const stats = useMemo(() => {
    const urgent = opportunities.filter(o => getDaysUntilDeadline(o.rfpDeadline) <= 2).length;
    const inProgress = opportunities.filter(o => !['proposal', 'approvals'].includes(o.status)).length;
    return {
      total: opportunities.length,
      inProgress,
      urgent,
    };
  }, [opportunities]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filtered.map(o => o.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const isAllSelected = filtered.length > 0 && filtered.every(o => selectedIds.has(o.id));
  const isSomeSelected = filtered.some(o => selectedIds.has(o.id)) && !isAllSelected;

  // Bulk export to Excel
  const handleBulkExport = () => {
    const selectedOpportunities = opportunities.filter(o => selectedIds.has(o.id));

    if (selectedOpportunities.length === 0) {
      alert('No bids selected for export');
      return;
    }

    const exportData = selectedOpportunities.map(opp => ({
      'Bid ID': `BID-${opp.id.substring(0, 3).toUpperCase()}`,
      'Client Name': opp.clientName || 'Unknown Client',
      'Study Title': opp.rfpTitle || 'Untitled Study',
      'Therapeutic Area': opp.therapeuticArea || 'N/A',
      'Status': getStatusLabel(opp.status),
      'Progress %': getProgressPercent(opp.status),
      'Due Date': opp.rfpDeadline ? new Date(opp.rfpDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
      'Days Until Deadline': opp.rfpDeadline ? getDaysUntilDeadline(opp.rfpDeadline) : 'N/A',
      'Created At': new Date(opp.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bids');

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.min(
        maxWidth,
        Math.max(
          key.length,
          ...exportData.map(row => String(row[key as keyof typeof row]).length)
        )
      )
    }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `Lumina_Bids_Export_${new Date().toISOString().split('T')[0]}.xlsx`);

    alert(`${selectedOpportunities.length} bid(s) exported successfully`);
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    const selectedOpportunities = opportunities.filter(o => selectedIds.has(o.id));

    if (selectedOpportunities.length === 0) {
      alert('No bids selected for deletion');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedOpportunities.length} bid(s)?\n\n${selectedOpportunities.map(o => `- ${o.clientName}: ${o.rfpTitle}`).join('\n')}\n\nThis action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);

    try {
      const deletePromises = Array.from(selectedIds).map(id =>
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${id}`, {
          method: 'DELETE',
        })
      );

      const results = await Promise.allSettled(deletePromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed > 0) {
        alert(`Deleted ${successful} bid(s). ${failed} deletion(s) failed.`);
      } else {
        alert(`Successfully deleted ${successful} bid(s)`);
      }

      // Refresh the list
      setSelectedIds(new Set());
      await fetchOpportunities();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert('Failed to delete bids. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-900">
        <div className="text-sm text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 z-10 flex-shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Bid Pipeline</h2>
          {selectedIds.size === 0 ? (
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder="Search bids..."
                type="text"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-lg">
              <span className="text-sm font-semibold text-primary">
                {selectedIds.size} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkExport}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  title="Export to Excel"
                >
                  <Download size={14} />
                  Export
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete selected"
                >
                  <Trash2 size={14} />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1.5 text-sm font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>
          <button
            onClick={() => router.push('/opportunities/new')}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            New Bid
          </button>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-8 bg-background-light dark:bg-background-dark">
        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Total Active Bids</p>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</h3>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg-lg">
                <TrendingUp className="text-primary" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">In Progress</p>
                <h3 className="text-3xl font-bold text-blue-600">{stats.inProgress}</h3>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg-lg">
                <TrendingUp className="text-blue-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Due Within 48h</p>
                <h3 className="text-3xl font-bold text-red-600">{stats.urgent}</h3>
              </div>
              <div className="p-2 bg-red-100 rounded-lg-lg">
                <Calendar className="text-red-600" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Main Data Table */}
        <div className="bg-white dark:bg-slate-900 rounded-lg-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-4 w-12">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = isSomeSelected;
                        }
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-primary bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Bid ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[300px]">Client & Study Title</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Study Type</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-64">Pipeline Progress</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">Due Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Comp %</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-600 dark:text-slate-400">
                      No bids found
                    </td>
                  </tr>
                ) : (
                  filtered.map((opp) => {
                    const daysLeft = getDaysUntilDeadline(opp.rfpDeadline);
                    const studyType = getStudyType(opp.therapeuticArea);
                    const progress = getProgressPercent(opp.status);
                    const isUrgent = daysLeft <= 2;
                    const statusLabel = getStatusLabel(opp.status);
                    const isSelected = selectedIds.has(opp.id);

                    return (
                      <tr
                        key={opp.id}
                        className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                      >
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectOne(opp.id, e.target.checked)}
                            className="w-4 h-4 text-primary bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                          />
                        </td>
                        <td
                          className="px-6 py-4 text-sm font-mono text-slate-500 cursor-pointer"
                          onClick={() => router.push(`/opportunities/${opp.id}`)}
                        >
                          BID-{opp.id.substring(0, 3).toUpperCase()}
                        </td>
                        <td
                          className="px-6 py-4 cursor-pointer"
                          onClick={() => router.push(`/opportunities/${opp.id}`)}
                        >
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {opp.clientName || 'Unknown Client'}
                          </div>
                          <div className="text-xs text-slate-500">{opp.rfpTitle || 'Untitled Study'}</div>
                        </td>
                        <td
                          className="px-6 py-4 cursor-pointer"
                          onClick={() => router.push(`/opportunities/${opp.id}`)}
                        >
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg ${studyType.color}`}>
                            {studyType.label}
                          </span>
                        </td>
                        <td
                          className="px-6 py-4 cursor-pointer"
                          onClick={() => router.push(`/opportunities/${opp.id}`)}
                        >
                          <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                            {statusLabel}
                          </span>
                        </td>
                        <td
                          className="px-6 py-4 cursor-pointer"
                          onClick={() => router.push(`/opportunities/${opp.id}`)}
                        >
                          <div className="flex gap-1">
                            {Array.from({ length: 11 }).map((_, i) => (
                              <div
                                key={i}
                                className={`h-1.5 w-4 rounded-full ${
                                  i < Math.floor(progress / 10)
                                    ? 'bg-primary'
                                    : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                        </td>
                        <td
                          className="px-6 py-4 cursor-pointer"
                          onClick={() => router.push(`/opportunities/${opp.id}`)}
                        >
                          {opp.rfpDeadline ? (
                            <div>
                              <div className={`font-bold text-sm ${isUrgent ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                {new Date(opp.rfpDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                              <div className="text-xs text-slate-400 italic">({daysLeft} days left)</div>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td
                          className="px-6 py-4 cursor-pointer"
                          onClick={() => router.push(`/opportunities/${opp.id}`)}
                        >
                          <div className="text-base font-bold text-primary">{progress}%</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: View files
                                alert('View files for ' + opp.rfpTitle);
                              }}
                              className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="View files"
                            >
                              <FileText size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Export
                                alert('Export ' + opp.rfpTitle);
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Export"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this bid?')) {
                                  // TODO: Delete
                                  alert('Delete ' + opp.rfpTitle);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500 font-medium">Overall Pipeline Progress</p>
            <div className="w-64 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: opportunities.length > 0 ? `${Math.round(opportunities.reduce((sum, o) => sum + getProgressPercent(o.status), 0) / opportunities.length)}%` : '0%' }}
              ></div>
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {opportunities.length > 0 ? Math.round(opportunities.reduce((sum, o) => sum + getProgressPercent(o.status), 0) / opportunities.length) : 0}%
            </span>
          </div>
          <p className="text-xs text-slate-400 italic">
            Data last updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </>
  );
}
