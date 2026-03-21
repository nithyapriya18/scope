'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const [redoConfirmStep, setRedoConfirmStep] = useState<string | null>(null);
  const [redoing, setRedoing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backendStatus = opportunity?.status || 'intake';
  const currentJob = opportunity?.currentJob;
  const allJobs: any[] = opportunity?.allJobs || [];

  const clarificationHasQuestions = Array.isArray(opportunity?.clarification?.questions) && opportunity.clarification.questions.length > 0;

  // Find the current step index
  const currentStepIndex = workflowSteps.findIndex(step => {
    if (step.uiOnly) return false;
    if (step.statusMapping && Array.isArray(step.statusMapping)) {
      return step.statusMapping.includes(backendStatus);
    }
    return step.id === backendStatus;
  });

  // Live timer for in-progress step
  useEffect(() => {
    const inProgressStep = workflowSteps[currentStepIndex];
    const isRunning = inProgressStep && !inProgressStep.uiOnly &&
      (inProgressStep.statusMapping?.includes(backendStatus) ?? inProgressStep.id === backendStatus);
    if (isRunning) {
      setElapsedSeconds(1);
      timerRef.current = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStepIndex]);

  // Auto-scroll to the active step or action area whenever progress advances
  useEffect(() => {
    const id = (backendStatus === 'clarification' && clarificationHasQuestions)
      ? 'workflow-action-area'
      : 'workflow-active-step';
    const el = document.getElementById(id);
    if (el) {
      // Small delay so the DOM has rendered the newly visible step
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    }
  }, [currentStepIndex, clarificationHasQuestions]);

  const formatElapsed = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  // Get duration for a completed step from allJobs
  const getStepDuration = (stepId: string): string | null => {
    // Map step id to job type
    const jobTypeMap: Record<string, string> = {
      intake: 'intake',
      brief_extract: 'brief_extract',
      gap_analysis: 'gap_analysis',
      clarification: 'clarification',
      clarification_response: 'clarification_response',
      feasibility: 'hcp_matching',
      scope_planning: 'scope_planner',
      wbs_estimate: 'wbs_estimation',
      document_gen: 'document_gen',
      approvals: 'approvals',
    };
    const jobType = jobTypeMap[stepId];
    if (!jobType) return null;
    const job = allJobs.find((j: any) => j.jobType === jobType && j.status === 'completed' && j.durationMs);
    return job ? formatDuration(job.durationMs) : null;
  };

  const getStepStatus = (stepIndex: number) => {
    // Step 4 (clarification) completes as soon as questions are generated — action area handles the human step
    if (workflowSteps[stepIndex].id === 'clarification' && backendStatus === 'clarification' && clarificationHasQuestions) {
      return 'completed';
    }
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
      console.error('❌ Wrong status for upload:', backendStatus);
      event.target.value = '';
      return;
    }

    if (!opportunity?.id) {
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

      // Status is already set to clarification_response by the backend.
      // The page's polling will detect the change and auto-advance to Step 5.
      setUploadingResponse(false);
      if (onRefresh) onRefresh();

    } catch (error) {
      console.error('❌ Error uploading response:', error);
      setUploadingResponse(false);
    }

    // Reset file input
    event.target.value = '';
  };

  const handleSkipResponses = async () => {
    if (!confirm('Proceed to Feasibility with current assumptions? No client responses will be recorded.')) {
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
    } finally {
      setUploadingResponse(false);
    }
  };

  const handleResetClarificationDecision = async () => {
    setUploadingResponse(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunity?.id}/reset-clarification-decision`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      if (res.ok && onRefresh) onRefresh();
    } catch (err) {
      console.error('Error resetting clarification decision:', err);
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
    } finally {
      setRedoing(false);
    }
  };

  // Determine what action was taken in the human review area
  const clarificationStatus = opportunity?.clarification?.status;
  const clientResponseText = opportunity?.clarification?.client_response_text;
  const actionTakenUpload = !!clientResponseText;
  // Skip: either explicitly 'skipped', or locked and no file was uploaded (agent changed status to 'responded')
  const actionTakenSkip = clarificationStatus === 'skipped' ||
    (backendStatus !== 'clarification' && !clientResponseText && !!opportunity?.clarification);
  const actionTaken = actionTakenUpload || actionTakenSkip; // any action was taken
  const actionAreaLocked = backendStatus !== 'clarification'; // once past clarification, lock it

  // Show first 4 steps + any completed or in-progress + the step that follows the action area
  const visibleSteps = showAlls
    ? workflowSteps
    : workflowSteps.filter((step, index) => {
        const status = getStepStatus(index);
        // Always show clarification_response (step 5) when clarificationHasQuestions (action area stays visible)
        if (step.id === 'clarification_response' && clarificationHasQuestions) return true;
        // Always show the waiting step immediately after in-progress so the queue is visible
        if (status === 'waiting' && index === currentStepIndex + 1) return true;
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
            {/* Human review action area — always visible when clarification has questions */}
            {step.id === 'clarification_response' && clarificationHasQuestions && (
              <div id="workflow-action-area" className="relative pl-16">
                {/* Connecting line stub */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                <div className={`rounded-xl border-2 p-5 space-y-3 ${
                  actionAreaLocked
                    ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30'
                    : 'border-dashed border-primary/40 dark:border-primary/30 bg-primary/[0.03] dark:bg-primary/[0.05]'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className={`w-3.5 h-3.5 ${actionAreaLocked ? 'text-slate-400' : 'text-primary'}`} />
                      <span className={`text-[11px] font-black uppercase tracking-widest ${
                        actionAreaLocked ? 'text-slate-400 dark:text-slate-500' : 'text-primary'
                      }`}>
                        {actionTaken
                          ? (actionTakenUpload ? 'Response uploaded' : 'Skipped — using assumptions')
                          : 'Your Action Required'}
                      </span>
                    </div>
                    <button
                      onClick={handleResetClarificationDecision}
                      disabled={uploadingResponse || !actionAreaLocked}
                      title="Reset and choose again"
                      className="p-1.5 text-slate-400 hover:text-primary transition-colors disabled:opacity-30"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Upload button */}
                    <div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.eml,.msg"
                        onChange={handleFileUpload}
                        disabled={uploadingResponse || actionAreaLocked}
                        className="hidden"
                        id="response-file-upload"
                      />
                      <button
                        onClick={() => !uploadingResponse && !actionAreaLocked && document.getElementById('response-file-upload')?.click()}
                        disabled={uploadingResponse || actionAreaLocked}
                        className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-bold text-sm transition-all relative ${
                          actionTakenUpload
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-400 text-emerald-700 dark:text-emerald-400 cursor-not-allowed'
                            : uploadingResponse
                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                            : actionAreaLocked
                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                            : 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 shadow-md hover:shadow-lg'
                        }`}
                      >
                        {uploadingResponse
                          ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</>
                          : actionTakenUpload
                          ? <><Check className="w-4 h-4" />Response Uploaded</>
                          : <><Upload className="w-4 h-4" />Upload Client Response</>
                        }
                      </button>
                      <p className="text-[10px] text-slate-400 text-center mt-1">.pdf · .docx · .txt · .msg</p>
                    </div>
                    {/* Skip button */}
                    <div>
                      <button
                        onClick={handleSkipResponses}
                        disabled={uploadingResponse || actionAreaLocked}
                        className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-bold text-sm transition-all shadow-md ${
                          actionTakenSkip
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-400 text-emerald-700 dark:text-emerald-400 cursor-not-allowed'
                            : actionAreaLocked
                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50'
                            : 'bg-slate-700 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 text-white hover:shadow-lg'
                        }`}
                      >
                        {actionTakenSkip
                          ? <><Check className="w-4 h-4" />Skipped — Assumptions Used</>
                          : <><CheckCircle className="w-4 h-4" />Skip — Use Assumptions</>
                        }
                      </button>
                      <p className="text-[10px] text-slate-400 text-center mt-1">Proceed without client input</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
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

                  {/* Live elapsed timer for in-progress step */}
                  {status === 'in-progress' && !step.uiOnly && elapsedSeconds > 0 && (
                    <span className="text-[10px] font-semibold text-primary tabular-nums">
                      {formatElapsed(elapsedSeconds)}
                    </span>
                  )}

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
                           width: '30%',
                           animation: 'slideProgress 1.6s linear infinite'
                         }} />
                  )}
                </div>
              )}
              <style jsx>{`
                @keyframes slideProgress {
                  0% { left: -30%; }
                  100% { left: 100%; }
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
                            {(() => {
                              const brief = opportunity.brief;
                              const rx: any = brief.raw_extraction || {};
                              // objectives: DB column first, then section5, then top-level
                              const objs: any[] = brief.research_objectives?.length
                                ? brief.research_objectives
                                : (rx.section5_business_research_objectives?.researchObjectives
                                   || rx.section5?.researchObjectives
                                   || rx.researchObjectives
                                   || []);
                              return `Requirements brief generated with ${objs.length} objective${objs.length !== 1 ? 's' : ''} and comprehensive scope details`;
                            })()}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {(() => {
                              const brief = opportunity.brief;
                              const rx: any = brief.raw_extraction || {};
                              // confidence: DB column (0-1 fraction)
                              const confidence = Math.round((brief.confidence_score || rx.completenessScore / 100 || 0) * 100);
                              // study type: DB column first
                              const studyType = brief.study_type
                                || rx.studyType
                                || rx.section6_methodology_scope?.primaryMethodology
                                || 'Not specified';
                              // geography: sample_requirements → section7 → top-level
                              const geoArr: string[] =
                                brief.sample_requirements?.geographicCoverage
                                || rx.section7_markets_geography?.markets
                                || rx.section7?.markets
                                || rx.geography
                                || [];
                              const geo = Array.isArray(geoArr) && geoArr.length > 0
                                ? (geoArr.length === 1 ? geoArr[0] : `${geoArr[0]} +${geoArr.length - 1} more`)
                                : 'Not specified';
                              return `Confidence: ${confidence}% • Study Type: ${studyType} • Geography: ${geo}`;
                            })()}
                          </p>
                        </div>
                      )}
                      {step.id === 'gap_analysis' && (
                        <div className="space-y-1">
                          {opportunity?.gapAnalysis ? (() => {
                            const ga = opportunity.gapAnalysis;
                            const llm = ga.llm_analysis || {};
                            const score = llm.completenessScore ?? Math.round((ga.overall_completeness || 0) * 100);
                            const critical = ga.missing_fields?.length || llm.criticalGaps?.length || 0;
                            const ambiguous = ga.ambiguous_requirements?.length || llm.ambiguousRequirements?.length || 0;
                            return (
                              <>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  Identified {critical} critical gaps, {ambiguous} ambiguous items
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Completeness: {score}% • shouldSendClarification: {llm.shouldSendClarification === false ? 'No' : 'Yes'}
                                </p>
                              </>
                            );
                          })() : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">Analysis complete — click View Analysis for details</p>
                          )}
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
                            {(opportunity?.clarification?.client_responses || opportunity?.clarification?.client_response_text)
                              ? 'Requirements brief updated with client responses'
                              : 'Requirements brief updated with assumptions (no client response received)'}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {opportunity?.clarification?.client_response_text
                              ? 'Client response parsed and applied to brief'
                              : opportunity?.clarification?.client_responses
                              ? 'Clarification processing complete'
                              : 'Proceeding with internally generated assumptions'}
                          </p>
                        </div>
                      )}
                      {step.id === 'human_review' && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {opportunity?.clarification?.client_responses
                              ? 'Client clarifications received and accepted'
                              : 'Proceeded with assumptions — no client response'}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {opportunity?.clarification?.client_responses
                              ? 'Client provided answers to all open questions'
                              : 'All assumptions treated as confirmed for the brief'}
                          </p>
                        </div>
                      )}
                      {step.id === 'feasibility' && opportunity?.feasibility && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {(() => {
                              const of_ = opportunity.feasibility.overallFeasibility;
                              const score = of_?.feasibilityScore ?? of_?.score ?? of_?.overall_score;
                              const rec = of_?.recommendation || of_?.summary || '';
                              return score != null
                                ? `Feasibility score: ${score}/100 — ${rec || 'Assessment complete'}`
                                : 'HCP feasibility assessment complete';
                            })()}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {(() => {
                              const avail = opportunity.feasibility.hcpAvailability;
                              const geo = opportunity.feasibility.geographicFeasibility;
                              const panels = avail?.panelSize ?? avail?.total_available ?? avail?.hcpsAvailable;
                              const countries = geo?.countriesAssessed ?? geo?.countries_assessed ?? [];
                              return [
                                panels != null ? `${panels.toLocaleString()} HCPs available` : null,
                                Array.isArray(countries) && countries.length > 0 ? `across ${countries.join(', ')}` : null,
                              ].filter(Boolean).join(' ') || 'Recruitment feasibility confirmed';
                            })()}
                          </p>
                        </div>
                      )}
                      {step.id === 'scope_planning' && opportunity?.scope && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {(() => {
                              const sc = opportunity.scope;
                              const opts: any[] = sc.sample_size_options || sc.sampleSizeOptions || [];
                              const rec = opts.find((o: any) => o.label === 'recommended') || opts[0];
                              const md: any = sc.methodology_detail || {};
                              const rawType = sc.detected_study_type || sc.study_type || 'Study';
                              const studyLabel = rawType.includes(' ') ? rawType : rawType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                              return `${studyLabel} — ${md.dataCollectionMethod || (md.approach === 'qualitative' ? 'IDI' : 'Online survey')}${rec ? `, n=${rec.n}` : ''}`;
                            })()}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {(() => {
                              const sc = opportunity.scope;
                              const timeline: any = sc.key_milestones || {};
                              const opts: any[] = sc.sample_size_options || sc.sampleSizeOptions || [];
                              const rec = opts.find((o: any) => o.label === 'recommended') || opts[0];
                              return [
                                timeline.totalWeeks ? `${timeline.totalWeeks}-week timeline` : null,
                                timeline.phases ? `${timeline.phases.length} project phases` : null,
                              ].filter(Boolean).join(' · ') || 'Research design complete';
                            })()}
                          </p>
                        </div>
                      )}
                      {step.id === 'wbs_estimate' && opportunity?.pricingPack && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {(() => {
                              const pp = opportunity.pricingPack;
                              const cb = pp.cost_breakdown || {};
                              const rec = (cb.pricingOptions || []).find((o: any) => o.tier === cb.recommendedTier) || (cb.pricingOptions || [])[1];
                              const tiers = (cb.pricingOptions || []).map((o: any) => `${o.tier}: $${(o.totalPrice || 0).toLocaleString()}`).join(' · ');
                              return tiers || `Total: $${(pp.total_price || 0).toLocaleString()}`;
                            })()}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {(() => {
                              const cb = opportunity.pricingPack.cost_breakdown || {};
                              return cb.recommendedTier ? `Recommended tier: ${cb.recommendedTier} — ${cb.recommendedRationale || ''}` : 'Pricing complete';
                            })()}
                          </p>
                        </div>
                      )}
                      {!opportunity?.brief && !opportunity?.gapAnalysis && !opportunity?.clarification
                        && step.id !== 'clarification_response' && step.id !== 'human_review'
                        && step.id !== 'feasibility' && step.id !== 'scope_planning'
                        && step.id !== 'wbs_estimate' && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                          Step completed. Click View Analysis for details.
                        </p>
                      )}
                    </div>
                    {step.id !== 'human_review' && (
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
                    )}
                  </div>
                </div>
              )}

              {/* Subtask List or Human Action — In Progress */}
              {status === 'in-progress' && !step.uiOnly && (
                <div className="space-y-4">
                  {(() => {
                    const subtasks = STEP_SUBTASKS[step.id] || [];
                    if (subtasks.length === 0) return null;
                    const progress = getCurrentProgress();
                    // When no real backend progress, advance sub-tasks by time (every 12s per task, cap at last-1)
                    const currentSubIdx = progress > 0
                      ? Math.min(Math.floor((progress / 100) * subtasks.length), subtasks.length - 1)
                      : Math.min(Math.floor(elapsedSeconds / 12), subtasks.length - 1);
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
              )}

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
      <BriefModal
        isOpen={briefModalOpen}
        onClose={() => setBriefModalOpen(false)}
        brief={opportunity?.brief ?? null}
        opportunityId={opportunity?.id}
        rfpTitle={opportunity?.rfpTitle || 'Untitled RFP'}
        clientName={opportunity?.clientName}
      />

      {/* Gap Analysis Modal */}
      <GapAnalysisModal
        isOpen={gapModalOpen}
        onClose={() => setGapModalOpen(false)}
        gapAnalysis={opportunity?.gapAnalysis ?? null}
        rfpTitle={opportunity?.rfpTitle || 'Untitled RFP'}
        opportunityId={opportunity?.id}
      />

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
          isCompleted={backendStatus !== 'clarification'}
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
      <FeasibilityModal
        isOpen={feasibilityModalOpen}
        onClose={() => setFeasibilityModalOpen(false)}
        feasibility={opportunity?.feasibility ?? null}
        rfpTitle={opportunity?.rfpTitle || 'Untitled RFP'}
        opportunityId={opportunity?.id}
      />

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
