'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VerticalWorkflowTimeline from '@/components/VerticalWorkflowTimeline';
import ChatInterface from '@/components/ChatInterface';
import { Loader2, Settings } from 'lucide-react';
import { getWorkflowMode, getCurrentUser } from '@/lib/auth';
import { useRunningPipeline } from '@/contexts/RunningPipelineContext';

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const opportunityId = params.id as string;
  const { setRunning, clearRunning } = useRunningPipeline();

  const [opportunity, setOpportunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  // Track which status we last auto-advanced for — prevents re-triggering same step multiple times
  // while the background agent runs (status stays unchanged for up to 2 mins)
  const lastAutoAdvancedStatus = useRef<string | null>(null);

  // Settings form state
  const [editedRfpTitle, setEditedRfpTitle] = useState('');
  const [editedClientName, setEditedClientName] = useState('');
  const [editedTherapeuticArea, setEditedTherapeuticArea] = useState('');
  const [editedDueDate, setEditedDueDate] = useState('');

  useEffect(() => {
    fetchOpportunity();
    const interval = setInterval(fetchOpportunity, 3000); // Poll every 3 seconds
    return () => {
      clearInterval(interval);
      clearRunning(); // Clean up when leaving the page
    };
  }, [opportunityId]);

  // Keep global running state in sync with this opportunity's pipeline.
  // Pipeline is "running" when status is anything except clarification (waiting for human) or approved (done).
  useEffect(() => {
    const status = opportunity?.status;
    const isPipelineRunning = !!status && status !== 'clarification' && status !== 'approved';
    if (isPipelineRunning) {
      setRunning({
        opportunityId,
        opportunityTitle: opportunity?.rfpTitle || 'Untitled RFP',
        currentStep: status,
      });
    } else {
      clearRunning();
    }
  }, [opportunity?.status, opportunityId]);

  // Initialize form fields when opportunity loads
  useEffect(() => {
    if (opportunity) {
      setEditedRfpTitle(opportunity.rfpTitle || '');
      setEditedClientName(opportunity.clientName || '');
      setEditedTherapeuticArea(opportunity.therapeuticArea || '');
      setEditedDueDate(opportunity.rfpDeadline ? opportunity.rfpDeadline.split('T')[0] : '');
    }
  }, [opportunity]);

  // Auto-process in automated mode (or always for intake step)
  useEffect(() => {
    if (!opportunity || processing) return;

    const status = opportunity.status;
    const workflowMode = getWorkflowMode();

    // Clear the "already fired" marker when status genuinely changes
    if (lastAutoAdvancedStatus.current && lastAutoAdvancedStatus.current !== status) {
      lastAutoAdvancedStatus.current = null;
    }

    // Steps that always auto-advance (no approval needed)
    const alwaysAutoAdvance = [
      'intake',
      'brief_extract',
      'gap_analysis',
      'assumption_analysis',     // After gap analysis, runs assumption analyzer
      'clarification_response',  // After parsing client responses
      'feasibility',             // After HCP matching completes
      'scope_planning',          // After scope design completes — advances to wbs_estimate
      'wbs_estimate',            // After WBS+pricing completes — advances to document_gen
      'pricing',                 // Pricing combined with WBS — skip straight to document_gen
    ];

    // Other steps respect workflow mode setting
    const conditionalAutoAdvance: string[] = [];

    // Don't auto-advance if the last job for this status failed — prevents infinite retry loops
    const allJobs: any[] = opportunity.allJobs || [];
    const jobTypeMap: Record<string, string> = {
      intake: 'intake', brief_extract: 'brief_extract', gap_analysis: 'gap_analysis',
      assumption_analysis: 'assumption_analysis', clarification: 'clarification',
      clarification_response: 'clarification_response', feasibility: 'hcp_matching',
      scope_planning: 'scope_planner', wbs_estimate: 'wbs_estimation', pricing: 'pricing',
    };
    const jobType = jobTypeMap[status];
    // Check only the MOST RECENT job of this type — older failed jobs (e.g. from before a redo) should not block
    const jobsForType = jobType ? allJobs.filter((j: any) => j.jobType === jobType) : [];
    const mostRecentJob = jobsForType.length > 0 ? jobsForType[jobsForType.length - 1] : null;
    const recentFailedJob = mostRecentJob?.status === 'failed' ? mostRecentJob : null;

    const shouldAutoAdvance =
      !processing &&
      !recentFailedJob &&
      (alwaysAutoAdvance.includes(status) ||
      (workflowMode === 'automated' && conditionalAutoAdvance.includes(status)));

    if (shouldAutoAdvance && lastAutoAdvancedStatus.current !== status) {
      lastAutoAdvancedStatus.current = status; // Mark fired — won't re-fire until status changes
      // Small delay to let UI update
      const timeout = setTimeout(() => {
        handleProcessNext();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [opportunity?.status, processing]);

  const fetchOpportunity = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunityId}`);
      if (response.ok) {
        const data = await response.json();
        setOpportunity(data);
      }
    } catch (error) {
      console.error('Error fetching opportunity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessNext = async () => {
    setProcessing(true);
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        console.error('No user logged in');
        router.push('/login');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunityId}/process`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('Process result:', result);
        fetchOpportunity(); // Refresh data
      } else {
        const error = await response.json();
        console.error('Process error:', error);
      }
    } catch (error) {
      console.error('Error processing:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessBack = async () => {
    setProcessing(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunityId}/back`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('Back result:', result);
        fetchOpportunity(); // Refresh data
      }
    } catch (error) {
      console.error('Error going back:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunityId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rfpTitle: editedRfpTitle,
            clientName: editedClientName,
            therapeuticArea: editedTherapeuticArea,
            rfpDeadline: editedDueDate ? new Date(editedDueDate).toISOString() : null,
          }),
        }
      );

      if (response.ok) {
        await fetchOpportunity(); // Refresh data
        setSettingsOpen(false);
      } else {
        const error = await response.json();
        console.error('Error saving settings:', error);
        alert('Failed to save changes. Please try again.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <Loader2 className="w-10 h-10 animate-spin text-ps-primary-600" />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Opportunity Not Found</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">The requested opportunity could not be found.</p>
        </div>
      </div>
    );
  }

  const getBidId = () => {
    return `BID-${opportunityId.substring(0, 3).toUpperCase()}`;
  };

  return (
    <>
      {/* Single Consolidated Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                Bid Detail: {getBidId()}
              </h2>
              <span className="text-[10px] text-slate-500">Pipeline Orchestration Hub</span>
            </div>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              {opportunity.rfpTitle || 'RFP Title Not Available'}
            </h1>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Client</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {opportunity.clientName || 'Unknown'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Therapeutic Area</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {opportunity.therapeuticArea || 'Not Specified'}
              </span>
            </div>
            <div className="flex flex-col min-w-[140px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Due Date</span>
              <span className="text-sm font-bold text-primary">
                {opportunity.rfpDeadline
                  ? new Date(opportunity.rfpDeadline).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Not Set'}
              </span>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 text-slate-400 hover:text-primary transition-colors"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
        <VerticalWorkflowTimeline
          opportunity={opportunity}
          onProcessNext={handleProcessNext}
          onApprove={handleProcessNext}
          onRefresh={fetchOpportunity}
          processing={processing}
        />
      </main>

      {/* Footer */}
      <footer className="h-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">
        <div className="flex gap-4">
          <span>Status: Research Phase Active</span>
          <span>Completion %: {(() => {
            // Calculate overall progress
            const workflowSteps = ['intake', 'brief_extract', 'gap_analysis', 'clarification', 'scope_planning', 'workplan', 'wbs_estimate', 'proposal', 'approvals'];
            const currentStepIndex = workflowSteps.indexOf(opportunity?.status || 'intake');
            const totalSteps = workflowSteps.length;
            const completedSteps = currentStepIndex;
            const currentJob = opportunity?.currentJob;
            const currentStepProgress = (currentJob && currentJob.status === 'processing' ? currentJob.progress || 0 : 0) / 100;
            return Math.round(((completedSteps + currentStepProgress) / totalSteps) * 100);
          })()}%</span>
        </div>
        <div className="flex gap-4">
          <span>Bid ID: {getBidId()}</span>
          <span>Region: Global (Focus EU/US)</span>
          <span>Next Step: Feasibility Check</span>
        </div>
      </footer>

      {/* Floating Chat Button & Panel */}
      <ChatInterface
        opportunityId={opportunityId}
        isOpen={chatOpen}
        onToggle={setChatOpen}
      />

      {/* Settings Modal */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Edit Bid Details
              </h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <Settings size={20} className="rotate-90" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  RFP Title
                </label>
                <input
                  type="text"
                  value={editedRfpTitle}
                  onChange={(e) => setEditedRfpTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={editedClientName}
                    onChange={(e) => setEditedClientName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Therapeutic Area
                  </label>
                  <input
                    type="text"
                    value={editedTherapeuticArea}
                    onChange={(e) => setEditedTherapeuticArea(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Due Date <span className="text-primary">*</span>
                </label>
                <input
                  type="date"
                  value={editedDueDate}
                  onChange={(e) => setEditedDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  * Important: This is the final submission deadline for the proposal
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Budget
                </label>
                <input
                  type="text"
                  defaultValue="$250,000"
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Budget will be calculated based on scope and pricing
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setSettingsOpen(false)}
                disabled={savingSettings}
                className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSettings ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
