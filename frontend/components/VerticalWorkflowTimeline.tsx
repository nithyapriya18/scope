'use client';

import React, { useState } from 'react';
import { Check, Loader2, FileText, BarChart2, MessageSquare, ClipboardList, CheckCircle, AlertTriangle, Eye, ChevronDown, Users, Search, Info, Upload, FileCheck, RefreshCw } from 'lucide-react';
import BriefModal from './BriefModal';
import GapAnalysisModal from './GapAnalysisModal';
import ClarificationModal from './ClarificationModal';
import ClarificationResponseModal from './ClarificationResponseModal';
import ScopeModal from './ScopeModal';
import FeasibilityModal from './FeasibilityModal';

interface WorkflowStep {
  id: string;
  label: string;
  agentName: string;
  description: string;
  icon: any;
  requiresApproval?: boolean;
  statusMapping?: string[];
  uiOnly?: boolean; // step exists only in UI, shares a DB status with another step
}

const STEP_SUBTASKS: Record<string, string[]> = {
  intake: ['Parse RFP document', 'Extract client metadata', 'Identify therapeutic area', 'Extract deadline & geography'],
  brief_extract: ['Map to 13-section template', 'Extract research objectives', 'Extract sample requirements', 'Calculate completeness score'],
  gap_analysis: ['Identify missing sections', 'Flag ambiguous requirements', 'Detect conflicting data', 'Run assumption analysis', 'Score overall completeness'],
  clarification: ['Prioritize gaps by severity', 'Draft clarification questions', 'Format email with assumptions', 'Prepare send-ready email'],
  clarification_response: ['Parse uploaded response', 'Match answers to questions', 'Update requirements brief', 'Finalize assumptions'],
  feasibility: ['Match HCP profiles', 'Score panel availability', 'Flag recruitment risks', 'Summarize feasibility'],
  scope_planning: ['Detect study type', 'Generate sample size options', 'Design delivery timeline', 'Create scope assumptions'],
  wbs_estimate: ['Build work breakdown structure', 'Estimate task hours', 'Apply rate card', 'Calculate total cost'],
  document_gen: ['Generate proposal narrative', 'Build pricing annex', 'Create Statement of Work'],
  approvals: ['Route to reviewers', 'Track approval status', 'Log final decision'],
};

function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

interface VerticalWorkflowTimelineProps {
  opportunity: any;
  onProcessNext?: () => void;
  onApprove?: () => void;
  onRefresh?: () => void;
  processing?: boolean;
}

const workflowSteps: WorkflowStep[] = [
  {
    id: 'intake',
    label: 'RFP Intake',
    agentName: 'RFP Intake Agent',
    description: 'Parse RFP document and extract key metadata: client, deadline, therapeutic area, geography',
    icon: FileText,
    statusMapping: ['intake'],
  },
  {
    id: 'brief_extract',
    label: 'Requirements & Brief Creation',
    agentName: 'Brief Extractor Agent',
    description: 'Map RFP to 13-section template. Extract objectives, audience, sample, timeline, deliverables, and budget.',
    icon: Search,
    statusMapping: ['brief_extract'],
  },
  {
    id: 'gap_analysis',
    label: 'Gaps & Assumptions Identification',
    agentName: 'Gap & Assumption Agents',
    description: 'Identify missing sections, ambiguous terms, conflicting data, and document all assumptions made',
    icon: BarChart2,
    statusMapping: ['gap_analysis', 'assumption_analysis'],
  },
  {
    id: 'clarification',
    label: 'Clarification Request',
    agentName: 'Clarification Generator Agent',
    description: 'Generate a ready-to-send email with prioritised questions, assumptions, and conflict resolutions for the RFP provider',
    icon: MessageSquare,
    statusMapping: ['clarification'],
  },
  {
    id: 'human_review',
    label: 'Human Review Point',
    agentName: 'Human Action Required',
    description: 'Review the generated clarification email, approve & send it, then upload the client response or continue with assumptions',
    icon: Eye,
    uiOnly: true,
    statusMapping: ['clarification'],
  },
  {
    id: 'clarification_response',
    label: 'Response Parsing & Brief Update',
    agentName: 'Response Parser Agent',
    description: 'Parse client responses, extract answers, and enrich the requirements brief. If skipped, assumptions are finalised.',
    icon: FileCheck,
    statusMapping: ['clarification_response'],
  },
  {
    id: 'feasibility',
    label: 'Feasibility Analysis',
    agentName: 'HCP Matcher Agent',
    description: 'Match HCP profiles from internal database, score availability, and assess recruitment feasibility',
    icon: Users,
    statusMapping: ['feasibility'],
  },
  {
    id: 'scope_planning',
    label: 'Research Plan',
    agentName: 'Scope Planner Agent',
    description: 'Detect study type, generate sample size options, design methodology, timeline, and scope assumptions',
    icon: ClipboardList,
    statusMapping: ['scope_planning'],
  },
  {
    id: 'wbs_estimate',
    label: 'Pricing & Budgeting',
    agentName: 'WBS & Pricer Agents',
    description: 'Build work breakdown structure, estimate hours, apply rate card, and generate full cost breakdown',
    icon: BarChart2,
    statusMapping: ['wbs_estimate', 'pricing'],
  },
  {
    id: 'document_gen',
    label: 'Proposal Creation',
    agentName: 'Document Generator Agent',
    description: 'Generate proposal narrative, Statement of Work, and pricing annex ready for client submission',
    icon: FileText,
    requiresApproval: true,
    statusMapping: ['document_gen'],
  },
  {
    id: 'approvals',
    label: 'Approvals & Closure',
    agentName: 'Approval Router',
    description: 'Route documents to finance, legal, and compliance approvers. Log final bid decision.',
    icon: CheckCircle,
    statusMapping: ['approvals'],
  },
];

export default function VerticalWorkflowTimeline({
  opportunity,
  onProcessNext,
  onApprove,
  onRefresh,
  processing = false,
}: VerticalWorkflowTimelineProps) {
  const [showAlls, setShowAlls] = useState(false);
  const [intakeModalOpen, setIntakeModalOpen] = useState(false);
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  const [gapModalOpen, setGapModalOpen] = useState(false);
  const [clarificationModalOpen, setClarificationModalOpen] = useState(false);
  const [clarificationResponseModalOpen, setClarificationResponseModalOpen] = useState(false);
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [feasibilityModalOpen, setFeasibilityModalOpen] = useState(false);
  const [uploadingResponse, setUploadingResponse] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [redoConfirmStep, setRedoConfirmStep] = useState<string | null>(null);
  const [redoing, setRedoing] = useState(false);
  const backendStatus = opportunity?.status || 'intake';
  const currentJob = opportunity?.currentJob;
  const allJobs: any[] = opportunity?.allJobs || [];

  // Determine if the human_review step is active
  const clarificationHasQuestions = Array.isArray(opportunity?.clarification?.questions) && opportunity.clarification.questions.length > 0;

  // Find the current step index — handles uiOnly steps
  const currentStepIndex = (() => {
    // Special case: clarification status with questions generated → human_review is current
    if (backendStatus === 'clarification' && clarificationHasQuestions) {
      return workflowSteps.findIndex(s => s.id === 'human_review');
    }
    // For all other statuses, skip uiOnly steps in lookup
    return workflowSteps.findIndex(step => {
      if (step.uiOnly) return false;
      if (step.statusMapping && Array.isArray(step.statusMapping)) {
        return step.statusMapping.includes(backendStatus);
      }
      return step.id === backendStatus;
    });
  })();

  // Get duration for a completed step from allJobs
  const getStepDuration = (stepId: string): string | null => {
    // Map step id to job type
    const jobTypeMap: Record<string, string> = {
      intake: 'intake',
      brief_extract: 'brief_extract',
      gap_analysis: 'gap_analysis',
      clarification: 'clarification',
      clarification_response: 'clarification_response',
      feasibility: 'feasibility',
      scope_planning: 'scope_planner',
      wbs_estimate: 'wbs_estimate',
      document_gen: 'document_gen',
      approvals: 'approvals',
    };
    const jobType = jobTypeMap[stepId];
    if (!jobType) return null;
    const job = allJobs.find((j: any) => j.jobType === jobType && j.status === 'completed' && j.durationMs);
    return job ? formatDuration(job.durationMs) : null;
  };

  const getStepStatus = (stepIndex: number) => {
    const step = workflowSteps[stepIndex];

    // Special handling for the uiOnly human_review step
    if (step.id === 'human_review') {
      if (backendStatus !== 'clarification') return 'completed'; // moved past
      if (!clarificationHasQuestions) return 'locked'; // AI hasn't finished yet
      return 'in-progress'; // questions ready, awaiting human action
    }

    // For the clarification step: completed once questions are generated (human_review takes over)
    if (step.id === 'clarification') {
      if (backendStatus === 'clarification' && clarificationHasQuestions) return 'completed';
      if (backendStatus !== 'clarification') {
        const clarIdx = workflowSteps.findIndex(s => s.id === 'clarification');
        return stepIndex < currentStepIndex ? 'completed' : 'locked';
      }
    }

    const isCurrentStep = step.statusMapping && Array.isArray(step.statusMapping)
      ? step.statusMapping.includes(backendStatus) && !step.uiOnly
      : step.id === backendStatus;

    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'in-progress';
    if (stepIndex === currentStepIndex + 1) return 'waiting';
    return 'locked';
  };

  // Get actual progress for the current step
  const getCurrentProgress = () => {
    // Special case: If clarification exists (questions generated), show 100%
    if (backendStatus === 'clarification' && opportunity?.clarification) {
      return 100;
    }
    // Special case: If clarification is sent/approved, show 100% even if job is still processing
    if (backendStatus === 'clarification' && opportunity?.clarification?.status === 'sent') {
      return 100;
    }

    if (!currentJob) return 0;
    // Show progress for pending (queued), processing, and recently completed jobs
    if (currentJob.status === 'pending') {
      return 0; // Queued but not started yet
    }
    if (currentJob.status === 'processing') {
      return currentJob.progress || 0;
    }
    if (currentJob.status === 'completed') {
      return 100; // Completed
    }
    return 0;
  };

  // Calculate overall workflow completion percentage
  const getOverallProgress = () => {
    const totalSteps = workflowSteps.length;
    const completedSteps = currentStepIndex;
    const currentStepProgress = getCurrentProgress() / 100;
    return Math.round(((completedSteps + currentStepProgress) / totalSteps) * 100);
  };

  // Get actual progress message
  const getCurrentProgressMessage = () => {
    if (!currentJob) return null;
    if (currentJob.status === 'pending') {
      return 'Queued for processing...';
    }
    if (currentJob.status === 'processing') {
      return currentJob.progress_message || 'Processing...';
    }
    if (currentJob.status === 'completed') {
      return currentJob.progress_message || 'Processing complete';
    }
    return null;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    console.log('📁 File selected:', {
      name: file.name,
      size: file.size,
      type: file.type,
      opportunityId: opportunity?.id,
      backendStatus: backendStatus,
    });

    if (backendStatus !== 'clarification') {
      alert(`⚠️ Cannot upload file. Opportunity must be in "clarification" status.\n\nCurrent status: ${backendStatus}`);
      console.error('❌ Wrong status for upload:', backendStatus);
      event.target.value = '';
      return;
    }

    if (!opportunity?.id) {
      alert('⚠️ No opportunity ID found. Please refresh the page and try again.');
      console.error('❌ No opportunity ID');
      event.target.value = '';
      return;
    }

    setUploadingResponse(true);

    try {
      const formData = new FormData();
      formData.append('responseFile', file);
      formData.append('userId', 'a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0'); // Demo user UUID

      const uploadUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunity.id}/clarification-response`;
      console.log('🚀 Uploading to:', uploadUrl);
      console.log('📦 FormData contents:', {
        file: file.name,
        userId: 'a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0',
      });

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let error;

        if (contentType && contentType.includes('application/json')) {
          error = await response.json();
        } else {
          const text = await response.text();
          error = { message: text || 'Upload failed', status: response.status };
        }

        console.error('❌ Upload error:', error);
        throw new Error(error.message || error.error || 'Upload failed');
      }

      const result = await response.json();
      console.log('✅ Response uploaded successfully:', result);

      // Show success message but keep processing state
      alert(`✅ File "${file.name}" uploaded successfully!\n\n⏳ Parsing client responses with AI... This may take 15-30 seconds.\n\nThe buttons will re-enable automatically once processing completes.`);

      // Keep refreshing and check if processing is complete
      let checkCount = 0;
      const maxChecks = 20; // 20 checks * 3s = 60 seconds max

      const refreshInterval = setInterval(async () => {
        checkCount++;
        console.log(`🔄 Polling check ${checkCount}/${maxChecks}`);

        if (onRefresh) {
          await onRefresh();
        }

        // Re-fetch opportunity status to check if it's changed
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunity.id}`);
          if (response.ok) {
            const updatedOpp = await response.json();
            console.log(`📊 Current status: ${updatedOpp.status}`);

            // Check if status has changed from 'clarification'
            if (updatedOpp.status !== 'clarification') {
              console.log('✅ Processing complete, status changed to:', updatedOpp.status);
              clearInterval(refreshInterval);
              setUploadingResponse(false);
              alert('✅ Client responses parsed successfully!\n\nYou can now proceed to the next step.');
              return;
            }
          }
        } catch (err) {
          console.error('Error checking opportunity status:', err);
        }

        // Timeout after max checks
        if (checkCount >= maxChecks) {
          clearInterval(refreshInterval);
          setUploadingResponse(false);
          console.log('⏱️ Stopped polling after', maxChecks * 3, 'seconds');
          alert('⏱️ Processing is taking longer than expected.\n\nPlease check back in a moment or refresh the page.');
        }
      }, 3000);

    } catch (error) {
      console.error('❌ Error uploading response:', error);
      alert(`Failed to upload response file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploadingResponse(false);
    }

    // Reset file input
    event.target.value = '';
  };

  const handleSkipResponses = async () => {
    if (!confirm('Proceed to Research Design with current assumptions? No client responses will be recorded.')) {
      return;
    }

    setUploadingResponse(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunity?.id}/clarification-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skipResponses: true,
          userId: 'a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', // Demo user UUID
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to skip responses');
      }

      // Refresh opportunity data
      if (onRefresh) {
        setTimeout(() => onRefresh(), 1000);
      }
    } catch (error) {
      console.error('Error skipping responses:', error);
      alert('Failed to proceed. Please try again.');
    } finally {
      setUploadingResponse(false);
    }
  };

  const handleSendEmail = async () => {
    setEmailSending(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunity?.id}/send-clarification-email`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to send email');
      }
      if (onRefresh) onRefresh();
    } catch (error) {
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setEmailSending(false);
    }
  };

  const handleResetDecision = async () => {
    // Reset just the upload/skip decision without redoing step 4
    setUploadingResponse(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunity?.id}/reset-clarification-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', // Demo user UUID
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reset decision');
      }

      // Refresh opportunity data
      if (onRefresh) {
        setTimeout(() => onRefresh(), 500);
      }
    } catch (error) {
      console.error('Error resetting decision:', error);
      alert('Failed to reset decision. Please try again.');
    } finally {
      setUploadingResponse(false);
    }
  };

  const handleRedo = async (stepId: string) => {
    setRedoing(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunity?.id}/redo/${stepId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', // Demo user UUID
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to redo step');
      }

      // Close confirmation dialog
      setRedoConfirmStep(null);

      // Refresh opportunity data
      if (onRefresh) {
        setTimeout(() => onRefresh(), 1500);
      } else if (onProcessNext) {
        setTimeout(() => onProcessNext(), 1500);
      }
    } catch (error) {
      console.error('Error redoing step:', error);
      alert('Failed to redo step. Please try again.');
    } finally {
      setRedoing(false);
    }
  };

  // Show all steps if showAlls is true, otherwise show first 4 + any completed or in-progress steps
  // uiOnly steps (human_review) only appear when active or completed
  const visibleSteps = showAlls
    ? workflowSteps
    : workflowSteps.filter((step, index) => {
        const status = getStepStatus(index);
        if (step.uiOnly) return status === 'in-progress' || status === 'completed';
        return index < 4 || status === 'completed' || status === 'in-progress';
      });

  return (
    <div className="max-w-6xl mx-auto py-6 px-8 space-y-5">
      {visibleSteps.map((step) => {
        const stepIndex = workflowSteps.indexOf(step);
        const status = getStepStatus(stepIndex);
        const Icon = step.icon;
        const isLast = stepIndex === workflowSteps.length - 1;

        return (
          <React.Fragment key={step.id}>
            <div className="relative pl-16 group">
            {/* Connecting Line */}
            {!isLast && (
              <div
                className={`absolute left-6 top-12 bottom-0 w-0.5 -mb-6 ${
                  status === 'completed'
                    ? 'bg-gradient-to-b from-emerald-500 to-slate-200 dark:to-slate-700'
                    : status === 'in-progress'
                    ? 'bg-gradient-to-b from-primary to-slate-200 dark:to-slate-700'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            )}

            {/* Step Icon Circle */}
            <div
              className={`absolute left-0 top-0 w-12 h-12 rounded-full flex items-center justify-center z-10 shadow-lg ${
                status === 'completed'
                  ? 'bg-emerald-500 text-white'
                  : status === 'in-progress'
                  ? 'bg-gradient-to-br from-primary to-secondary text-white ring-4 ring-primary/20 dark:ring-primary/30'
                  : status === 'waiting'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-2 border-white dark:border-gray-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-2 border-white dark:border-gray-800'
              }`}
            >
              {status === 'completed' ? (
                <Check className="w-6 h-6" strokeWidth={3} />
              ) : status === 'in-progress' ? (
                <Icon className="w-6 h-6" />
              ) : (
                <Icon className="w-6 h-6" />
              )}
            </div>

            {/* Step Card */}
            <div
              className={`rounded-xl p-6 shadow-sm hover:shadow-md transition-all ${
                status === 'in-progress'
                  ? 'bg-white dark:bg-gray-800 border-2 border-primary'
                  : status === 'completed'
                  ? 'bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700'
                  : 'bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 opacity-70'
              }`}
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {step.uiOnly ? '↳' : `${stepIndex + 1}.`} {step.label}
                    </h4>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-black rounded-lg uppercase tracking-wider ${
                        status === 'completed'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : status === 'in-progress'
                          ? 'bg-gradient-to-r from-primary to-secondary text-white'
                          : status === 'waiting'
                          ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-400'
                      }`}
                    >
                      {status === 'completed'
                        ? 'Completed'
                        : status === 'in-progress'
                        ? 'In Progress'
                        : status === 'waiting'
                        ? 'Waiting'
                        : 'Locked'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{step.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Duration for completed steps */}
                  {status === 'completed' && (() => {
                    const dur = getStepDuration(step.id);
                    return dur ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                        {dur}
                      </span>
                    ) : null;
                  })()}

                  {/* Spinner for in-progress with no progress yet */}
                  {status === 'in-progress' && getCurrentProgress() === 0 && (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  )}

                  {/* Redo button — only for non-uiOnly steps */}
                  {!step.uiOnly && (
                    <button
                      onClick={() => status === 'completed' || status === 'in-progress' ? setRedoConfirmStep(step.id) : null}
                      disabled={status === 'waiting' || status === 'locked'}
                      className={`p-1.5 transition-colors ${
                        status === 'waiting' || status === 'locked'
                          ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                          : 'text-slate-400 hover:text-orange-600 dark:hover:text-orange-500 cursor-pointer'
                      }`}
                      title={status === 'waiting' || status === 'locked' ? 'Cannot redo this step yet' : 'Redo this step'}
                    >
                      <RefreshCw size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar for In Progress */}
              {status === 'in-progress' && (
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full mb-6 overflow-hidden relative">
                  {getCurrentProgress() > 0 ? (
                    <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500" style={{ width: `${getCurrentProgress()}%` }} />
                  ) : (
                    <div className="h-full bg-gradient-to-r from-primary to-secondary opacity-70 rounded-full absolute"
                         style={{
                           width: '20%',
                           animation: 'slideProgress 2s ease-in-out infinite'
                         }} />
                  )}
                </div>
              )}
              <style jsx>{`
                @keyframes slideProgress {
                  0% { left: 0%; }
                  50% { left: 80%; }
                  100% { left: 0%; }
                }
              `}</style>

              {/* Output Preview - Completed */}
              {status === 'completed' && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                  <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 tracking-widest">
                    Output Summary
                  </h5>
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      {step.id === 'intake' && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            RFP metadata extracted successfully
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Client: {opportunity?.clientName || 'Unknown'} •
                            Area: {opportunity?.therapeuticArea || 'Not specified'} •
                            Deadline: {opportunity?.rfpDeadline ? new Date(opportunity.rfpDeadline).toLocaleDateString() : 'Not set'}
                          </p>
                        </div>
                      )}
                      {step.id === 'brief_extract' && opportunity?.brief && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Requirements brief generated with {(() => {
                              const rawData = opportunity.brief.raw_extraction || {};
                              return (rawData.researchObjectives?.length || 0) + ' objectives';
                            })()} and comprehensive scope details
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {(() => {
                              const rawData = opportunity.brief.raw_extraction || {};
                              const confidence = Math.round((rawData.confidenceScores?.overall || 0) * 100);
                              return `Confidence: ${confidence}% • Study Type: ${rawData.scopeOfWork?.studyType || 'Not specified'} • Geography: ${Array.isArray(rawData.scopeOfWork?.geographicCoverage) ? rawData.scopeOfWork.geographicCoverage[0] : 'Not specified'}`;
                            })()}
                          </p>
                        </div>
                      )}
                      {step.id === 'gap_analysis' && opportunity?.gapAnalysis && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Identified {opportunity.gapAnalysis.missing_fields?.length || 0} missing fields, {opportunity.gapAnalysis.ambiguous_requirements?.length || 0} ambiguous items
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Critical gaps: {opportunity.gapAnalysis.critical_gaps_count || 0} •
                            Completeness: {Math.round((opportunity.gapAnalysis.overall_completeness || 0) * 100)}%
                          </p>
                        </div>
                      )}
                      {step.id === 'clarification' && opportunity?.clarification && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Generated {opportunity.clarification.questions?.length || 0} clarification questions for client
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Ready for review and approval before sending
                          </p>
                        </div>
                      )}
                      {step.id === 'clarification_response' && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {opportunity?.clarification?.client_responses
                              ? 'Requirements brief updated with client responses'
                              : 'Requirements brief updated with assumptions (no client response received)'}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {opportunity?.clarification?.client_responses
                              ? 'Client provided answers to clarification questions'
                              : 'Proceeding with internally generated assumptions'}
                          </p>
                        </div>
                      )}
                      {!opportunity?.brief && !opportunity?.gapAnalysis && !opportunity?.clarification && step.id !== 'clarification_response' && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                          Step completed. Click View Analysis for details.
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (step.id === 'intake') setIntakeModalOpen(true);
                          else if (step.id === 'brief_extract') setBriefModalOpen(true);
                          else if (step.id === 'gap_analysis') setGapModalOpen(true);
                          else if (step.id === 'clarification') setClarificationModalOpen(true);
                          else if (step.id === 'clarification_response') setClarificationResponseModalOpen(true);
                          else if (step.id === 'scope_planning') setScopeModalOpen(true);
                          else if (step.id === 'feasibility') setFeasibilityModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-gray-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-primary hover:text-primary transition-all shrink-0"
                      >
                        <Eye size={14} />
                        View {step.id === 'intake' ? 'Details' : step.id === 'clarification_response' ? 'Updated Brief' : step.id === 'scope_planning' ? 'Design' : step.id === 'feasibility' ? 'Feasibility' : 'Analysis'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Human Review Point — two-box layout for email send + upload/skip */}
              {step.id === 'human_review' && status === 'in-progress' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Box A: Email Preview + Approve & Send */}
                  <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">Clarification Email</h4>
                    </div>
                    {opportunity?.clarification?.sent_at && (
                      <div className="mb-3 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                          Sent to nithya@petasight.com
                        </p>
                      </div>
                    )}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-4 max-h-44 overflow-y-auto">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Questions Preview</p>
                      <ol className="space-y-1.5 list-none">
                        {(opportunity?.clarification?.questions || []).slice(0, 5).map((q: any, i: number) => (
                          <li key={i} className="text-xs text-slate-600 dark:text-slate-400">
                            {i + 1}. {typeof q === 'string' ? q : q.question || JSON.stringify(q)}
                          </li>
                        ))}
                        {(opportunity?.clarification?.questions?.length || 0) > 5 && (
                          <li className="text-xs text-slate-400 italic">
                            +{opportunity.clarification.questions.length - 5} more…
                          </li>
                        )}
                      </ol>
                    </div>
                    <button
                      onClick={handleSendEmail}
                      disabled={emailSending || !!opportunity?.clarification?.sent_at}
                      className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
                        opportunity?.clarification?.sent_at
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-not-allowed'
                          : emailSending
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-secondary to-primary text-white shadow-md hover:opacity-90 cursor-pointer'
                      }`}
                    >
                      {emailSending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
                      ) : opportunity?.clarification?.sent_at ? (
                        <><Check className="w-4 h-4" strokeWidth={3} />Email Sent</>
                      ) : (
                        <><MessageSquare className="w-4 h-4" />Approve &amp; Send</>
                      )}
                    </button>
                    {!opportunity?.clarification?.sent_at && (
                      <p className="text-[10px] text-slate-400 mt-2 text-center">Sends to nithya@petasight.com</p>
                    )}
                  </div>

                  {/* Box B: Upload Response or Skip */}
                  <div className="space-y-3">
                    <div className="rounded-lg border-2 border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-800 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Upload Client Response</h4>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Upload the client's reply (.pdf, .docx, .txt, .msg)
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.eml,.msg"
                        onChange={handleFileUpload}
                        disabled={uploadingResponse}
                        className="hidden"
                        id="response-file-upload"
                      />
                      <span
                        role="button"
                        className={`flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                          uploadingResponse
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                        }`}
                        onClick={() => !uploadingResponse && document.getElementById('response-file-upload')?.click()}
                      >
                        {uploadingResponse ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />Parsing…</>
                        ) : (
                          <><Upload className="w-4 h-4" />Choose File</>
                        )}
                      </span>
                    </div>

                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Skip &amp; Continue</h4>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Proceed with current assumptions — no client response needed
                      </p>
                      <button
                        onClick={handleSkipResponses}
                        disabled={uploadingResponse}
                        className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg font-bold text-sm bg-slate-600 hover:bg-slate-700 text-white transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Skip &amp; Proceed
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Subtask List - In Progress */}
              {status === 'in-progress' && !step.uiOnly && (
                <div className="space-y-4">
                  {(() => {
                    const subtasks = STEP_SUBTASKS[step.id] || [];
                    if (subtasks.length === 0) return null;
                    const progress = getCurrentProgress(); // 0-100
                    // Map progress to current subtask index
                    const currentSubIdx = progress === 0
                      ? 0
                      : Math.min(Math.floor((progress / 100) * subtasks.length), subtasks.length - 1);
                    return (
                      <div className="rounded-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tasks</span>
                          {progress > 0 && (
                            <span className="float-right text-[10px] font-bold text-primary">{progress}%</span>
                          )}
                        </div>
                        <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                          {subtasks.map((task, ti) => {
                            const isDone = ti < currentSubIdx;
                            const isCurrent = ti === currentSubIdx;
                            const isNext = ti === currentSubIdx + 1;
                            return (
                              <li key={ti} className={`flex items-center gap-3 px-4 py-2.5 ${isCurrent ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                                <span className="flex-shrink-0">
                                  {isDone ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={3} />
                                  ) : isCurrent ? (
                                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                                  ) : (
                                    <span className="w-3.5 h-3.5 block rounded-full border border-slate-200 dark:border-slate-600" />
                                  )}
                                </span>
                                <span className={`text-xs ${
                                  isDone ? 'line-through text-slate-400 dark:text-slate-500' :
                                  isCurrent ? 'text-slate-900 dark:text-white font-semibold' :
                                  isNext ? 'text-slate-500 dark:text-slate-400' :
                                  'text-slate-300 dark:text-slate-600'
                                }`}>
                                  {task}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })()}
                  </div>

              {/* Approval required banner for document_gen (shown when in-progress) */}
              {step.id === 'document_gen' && status === 'in-progress' && (
                <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="text-amber-600 dark:text-amber-400 flex-shrink-0" size={16} />
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      Review generated proposal documents before final approval
                    </p>
                  </div>
                  <button
                    onClick={onApprove || onProcessNext}
                    disabled={processing}
                    className="ml-4 px-4 py-1.5 bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0"
                  >
                    {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve & Close'}
                  </button>
                </div>
              )}

              {/* Waiting State */}
              {status === 'waiting' && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">
                    Queued
                  </p>
                  <p className="text-xs text-slate-400 italic">
                    Waiting for previous step to complete before processing...
                  </p>
                </div>
              )}
            </div>
          </div>



          </React.Fragment>
        );
      })}

      {/* Show More Button - only show if there are hidden steps */}
      {!showAlls && visibleSteps.length < workflowSteps.length && (
        <div className="pl-16 flex flex-col items-center">
          <div className="w-px h-12 bg-slate-200 mb-4" />
          <button
            onClick={() => setShowAlls(true)}
            className="group flex flex-col items-center gap-2 p-6 w-full border-2 border-dashed border-slate-200 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <div className="flex -space-x-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-400">
                <CheckCircle size={20} />
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-400">
                <FileText size={20} />
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-400">
                <Users size={20} />
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-500">
                +{workflowSteps.length - visibleSteps.length}
              </div>
            </div>
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest group-hover:text-primary transition-colors">
              Show {workflowSteps.length - visibleSteps.length} additional pipeline agents
            </span>
            <ChevronDown className="text-slate-400 group-hover:text-primary group-hover:translate-y-1 transition-all" size={20} />
          </button>
        </div>
      )}


      {/* Intake Modal */}
      {intakeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">RFP Metadata</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Extracted information from intake</p>
                </div>
              </div>
              <button
                onClick={() => setIntakeModalOpen(false)}
                className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all"
                title="Close"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">RFP Title</label>
                    <p className="text-base font-medium text-gray-900 dark:text-white">{opportunity?.rfpTitle || 'Untitled'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Client Name</label>
                    <p className="text-base font-medium text-gray-900 dark:text-white">{opportunity?.clientName || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Therapeutic Area</label>
                    <p className="text-base font-medium text-gray-900 dark:text-white">{opportunity?.therapeuticArea || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">RFP Deadline</label>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {opportunity?.rfpDeadline ? new Date(opportunity.rfpDeadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Brief Modal */}
      {opportunity?.brief && (
        <BriefModal
          isOpen={briefModalOpen}
          onClose={() => setBriefModalOpen(false)}
          brief={opportunity.brief}
          opportunityId={opportunity.id}
          rfpTitle={opportunity.rfpTitle || 'Untitled RFP'}
          clientName={opportunity.clientName}
        />
      )}

      {/* Gap Analysis Modal */}
      {opportunity?.gapAnalysis && (
        <GapAnalysisModal
          isOpen={gapModalOpen}
          onClose={() => setGapModalOpen(false)}
          gapAnalysis={opportunity.gapAnalysis}
          rfpTitle={opportunity.rfpTitle || 'Untitled RFP'}
          opportunityId={opportunity.id}
        />
      )}

      {/* Clarification Modal */}
      {opportunity?.clarification && (
        <ClarificationModal
          isOpen={clarificationModalOpen}
          onClose={() => setClarificationModalOpen(false)}
          clarification={opportunity.clarification}
          gapAnalysis={opportunity.gapAnalysis}
          rfpTitle={opportunity.rfpTitle || 'Untitled RFP'}
          clientName={opportunity.clientName}
          onApprove={onApprove || onProcessNext}
          isCompleted={clarificationCompleted}
        />
      )}

      {/* Clarification Response Modal - Show either client responses or assumptions */}
      {(opportunity?.clarification?.client_responses || (opportunity?.clarification && ['clarification_response', 'scope_planning', 'feasibility', 'wbs_estimate', 'proposal'].includes(backendStatus))) && (
        <ClarificationResponseModal
          isOpen={clarificationResponseModalOpen}
          onClose={() => setClarificationResponseModalOpen(false)}
          responses={opportunity.clarification?.client_responses}
          gapAnalysis={opportunity.gapAnalysis}
          brief={opportunity.brief}
          rfpTitle={opportunity.rfpTitle || 'Untitled RFP'}
          opportunityId={opportunity.id}
        />
      )}

      {/* Scope Modal */}
      {opportunity?.scope && (
        <ScopeModal
          isOpen={scopeModalOpen}
          onClose={() => setScopeModalOpen(false)}
          scope={opportunity.scope}
          rfpTitle={opportunity.rfpTitle || 'Untitled RFP'}
          opportunityId={opportunity.id}
        />
      )}

      {/* Feasibility Modal */}
      {opportunity?.feasibility && (
        <FeasibilityModal
          isOpen={feasibilityModalOpen}
          onClose={() => setFeasibilityModalOpen(false)}
          feasibility={opportunity.feasibility}
          rfpTitle={opportunity.rfpTitle || 'Untitled RFP'}
          opportunityId={opportunity.id}
        />
      )}

      {/* Redo Confirmation Dialog */}
      {redoConfirmStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Redo Step?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">This will clear all succeeding steps</p>
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 mb-6 border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <strong>Warning:</strong> Redoing <strong className="text-orange-600 dark:text-orange-400">{workflowSteps.find(s => s.id === redoConfirmStep)?.label}</strong> will:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                <li>• Re-run this step with the AI agent</li>
                <li>• Delete all data from steps after this one</li>
                <li>• Reset those steps to waiting/locked state</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRedoConfirmStep(null)}
                disabled={redoing}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRedo(redoConfirmStep)}
                disabled={redoing}
                className="flex-1 px-4 py-2.5 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {redoing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Redo Step
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
