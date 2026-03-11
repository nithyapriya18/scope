'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VerticalWorkflowTimeline from '@/components/VerticalWorkflowTimeline';
import ChatInterface from '@/components/ChatInterface';
import { Loader2, ArrowLeft, Bell, Zap, Settings, Users } from 'lucide-react';
import { getWorkflowMode, getCurrentUser } from '@/lib/auth';

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const opportunityId = params.id as string;

  const [opportunity, setOpportunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    fetchOpportunity();
    const interval = setInterval(fetchOpportunity, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [opportunityId]);

  // Auto-process in automated mode (or always for intake step)
  useEffect(() => {
    if (!opportunity || processing) return;

    const status = opportunity.status;
    const workflowMode = getWorkflowMode();

    // Step 1 → Step 2 always auto-advances (no approval needed)
    const alwaysAutoAdvance = ['intake'];

    // Other steps respect workflow mode setting
    const conditionalAutoAdvance = ['brief_extract', 'gap_analysis'];

    const shouldAutoAdvance =
      alwaysAutoAdvance.includes(status) ||
      (workflowMode === 'automated' && conditionalAutoAdvance.includes(status));

    if (shouldAutoAdvance) {
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
      {/* Top Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Dashboard</span>
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
              Bid Detail: {getBidId()} - {opportunity.clientName || 'Client'}
            </h2>
            <span className="text-[10px] text-slate-500">Pipeline Orchestration Hub</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4">
            <span className="text-[10px] text-slate-400 font-bold uppercase">System Status</span>
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full flex items-center gap-1">
              <span className="w-1 h-1 bg-primary rounded-full animate-pulse" />
              Auto-Pilot Active
            </span>
          </div>
          <button
            onClick={() => alert('Generate Proposal')}
            className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg shadow-sm hover:bg-primary/90 transition-colors"
          >
            Generate Proposal
          </button>
          <button className="p-2 text-slate-400 hover:text-primary transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
          </button>
        </div>
      </header>

      {/* Project Info Bar - Compact */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              {opportunity.rfpTitle || 'RFP Title Not Available'}
            </h1>
          </div>
          <div className="flex gap-5 border-l border-slate-200 dark:border-slate-700 pl-5">
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
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Due Date</span>
              <span className="text-xs font-bold text-primary">
                {opportunity.rfpDeadline
                  ? new Date(opportunity.rfpDeadline).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Not Set'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
              JD
            </div>
            <div className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
              SJ
            </div>
            <div className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
              +2
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 text-slate-400 hover:text-primary transition-colors"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
        <VerticalWorkflowTimeline
          opportunity={opportunity}
          onProcessNext={handleProcessNext}
          onApprove={handleProcessNext}
          onRequestRevision={() => alert('Request revision')}
          processing={processing}
        />
      </main>

      {/* Footer */}
      <footer className="h-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">
        <div>Status: Research Phase Active</div>
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
                  defaultValue={opportunity.rfpTitle || ''}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    defaultValue={opportunity.clientName || ''}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Therapeutic Area
                  </label>
                  <input
                    type="text"
                    defaultValue={opportunity.therapeuticArea || ''}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Budget
                  </label>
                  <input
                    type="text"
                    defaultValue="$250,000"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    defaultValue={opportunity.rfpDeadline ? opportunity.rfpDeadline.split('T')[0] : ''}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Region
                </label>
                <input
                  type="text"
                  defaultValue="Global (Focus EU/US)"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Team Members
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                      JD
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      SJ
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                      +2
                    </div>
                  </div>
                  <button className="ml-2 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors">
                    Manage Team
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Save changes functionality coming soon');
                  setSettingsOpen(false);
                }}
                className="px-4 py-2 text-sm font-semibold bg-primary hover:bg-cyan-800 text-white rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
