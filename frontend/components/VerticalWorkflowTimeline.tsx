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
    label: 'RFP Upload',
    agentName: 'RFP Intake',
    description: 'Upload RFP document and extract basic metadata (client, deadline, therapeutic area)',
    icon: FileText,
    statusMapping: ['intake']
  },
  {
    id: 'brief_extract',
    label: 'Requirements Extraction',
    agentName: 'Requirements Extraction',
    description: 'Deep analysis: Extracting research objectives, target audience, sample requirements, and deliverables',
    icon: Search,
    statusMapping: ['brief_extract']
  },
  {
    id: 'gap_analysis',
    label: 'Gap Analysis',
    agentName: 'Gap Analysis',
    description: 'Identify missing critical fields, ambiguous terms, and incomplete requirements',
    icon: BarChart2,
  },
  {
    id: 'clarification',
    label: 'Clarification Generator',
    agentName: 'Clarification Generator',
    description: 'Draft clarification email with questions for client',
    icon: MessageSquare,
    requiresApproval: true
  },
  {
    id: 'clarification_response',
    label: 'Response Processing',
    agentName: 'Response Processing',
    description: 'Parse client responses and update requirements brief with clarified information',
    icon: FileCheck,
    statusMapping: ['clarification_response']
  },
  {
    id: 'scope_planning',
    label: 'Research Design',
    agentName: 'Research Design',
    description: 'Design detailed scope, methodology, sample size, delivery plan, project stages, and full execution roadmap',
    icon: ClipboardList,
    requiresApproval: true,
    statusMapping: ['scope_planning']
  },
  {
    id: 'feasibility',
    label: 'Feasibility',
    agentName: 'Feasibility',
    description: 'Check HCP database for best interview candidates; if unavailable, suggest HCP profiles and specialties to recruit',
    icon: Users,
    statusMapping: ['feasibility', 'scope_planning']
  },
  {
    id: 'wbs_estimate',
    label: 'Pricing & Budgeting',
    agentName: 'Pricing & Budgeting',
    description: 'Generate pricing tiers and cost breakdown',
    icon: BarChart2,
    statusMapping: ['wbs_estimate', 'pricing']
  },
  {
    id: 'proposal',
    label: 'Document Generation',
    agentName: 'Document Generation',
    description: 'Generate proposal document, SoW, pricing annex',
    icon: FileText,
    requiresApproval: true
  },
  {
    id: 'approvals',
    label: 'Approval Routing',
    agentName: 'Approval Routing',
    description: 'Route to finance, legal, compliance approvers',
    icon: CheckCircle,
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
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [redoConfirmStep, setRedoConfirmStep] = useState<string | null>(null);
  const [redoing, setRedoing] = useState(false);
  const backendStatus = opportunity?.status || 'intake';
  const currentJob = opportunity?.currentJob;

  // Find the current step index
  const currentStepIndex = workflowSteps.findIndex(step => {
    if (step.statusMapping && Array.isArray(step.statusMapping)) {
      return step.statusMapping.includes(backendStatus);
    }
    return step.id === backendStatus;
  });

  const getStepStatus = (stepIndex: number) => {
    const step = workflowSteps[stepIndex];

    // Check if this step matches the current backend status (for parallel steps)
    const isCurrentStep = step.statusMapping && Array.isArray(step.statusMapping)
      ? step.statusMapping.includes(backendStatus)
      : step.id === backendStatus;

    if (stepIndex < currentStepIndex && !isCurrentStep) return 'completed';

    if (isCurrentStep || stepIndex === currentStepIndex) {
      // Special case: If clarification is sent/approved, mark as completed
      if (backendStatus === 'clarification' && opportunity?.clarification?.status === 'sent') {
        return 'completed';
      }
      // If at current step, always show as in-progress (since we haven't moved to next step yet)
      // This includes pending jobs, processing jobs, and uploaded files awaiting processing
      return 'in-progress';
    }
    if (stepIndex === currentStepIndex + 1) return 'waiting';
    return 'locked';
  };

  // Get actual progress for the current step
  const getCurrentProgress = () => {
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
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
    setUploadingResponse(true);
    setShowUploadDialog(false);

    try {
      const formData = new FormData();
      formData.append('responseFile', file);
      formData.append('userId', 'a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0'); // Demo user UUID

      console.log('Uploading to:', `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunity?.id}/clarification-response`);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunity?.id}/clarification-response`, {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('Upload error:', error);
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();
      console.log('✅ Response uploaded successfully:', result);
      alert('Client response uploaded successfully! Processing...');

      // Refresh opportunity data
      if (onRefresh) {
        setTimeout(() => onRefresh(), 2000);
      }
    } catch (error) {
      console.error('❌ Error uploading response:', error);
      alert(`Failed to upload response file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingResponse(false);
    }
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
  const visibleSteps = showAlls
    ? workflowSteps
    : workflowSteps.filter((step, index) => {
        const status = getStepStatus(index);
        return index < 4 || status === 'completed' || status === 'in-progress';
      });

  // Show upload/skip section if clarification is sent OR if we're past clarification step (keep visible after completion)
  // Check if clarification step (index 3) is completed
  const clarificationStepIndex = workflowSteps.findIndex(s => s.id === 'clarification');
  const clarificationCompleted = clarificationStepIndex >= 0 && getStepStatus(clarificationStepIndex) === 'completed';

  const showResponseDecision = clarificationCompleted ||
                               (opportunity?.clarification?.status === 'sent') ||
                               ['clarification_response', 'scope_planning', 'feasibility', 'wbs_estimate', 'proposal'].includes(backendStatus);
  const responseDecisionCompleted = backendStatus !== 'clarification' && showResponseDecision;

  return (
    <div className="max-w-6xl mx-auto py-6 px-8 space-y-5">
      {visibleSteps.map((step, index) => {
        const status = getStepStatus(index);
        const Icon = step.icon;
        const isLast = index === workflowSteps.length - 1;

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
                  ? 'bg-primary text-white ring-4 ring-primary/20 dark:ring-primary/30'
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
                      {index + 1}. {step.label}
                    </h4>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-black rounded-lg uppercase tracking-wider ${
                        status === 'completed'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : status === 'in-progress'
                          ? 'bg-primary text-white'
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
                  {/* Progress percentage for in-progress */}
                  {status === 'in-progress' && getCurrentProgress() > 0 && (
                    <span className="text-sm font-black text-primary">{getCurrentProgress()}%</span>
                  )}
                  {status === 'in-progress' && getCurrentProgress() === 0 && (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  )}

                  {/* Time info - same for all steps */}
                  {(status === 'completed' || status === 'in-progress') && (
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      2m ago
                    </span>
                  )}

                  {/* Always show refresh button, disable for waiting/locked */}
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
                </div>
              </div>

              {/* Progress Bar for In Progress */}
              {status === 'in-progress' && (
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full mb-6 overflow-hidden relative">
                  {getCurrentProgress() > 0 ? (
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${getCurrentProgress()}%` }} />
                  ) : (
                    <div className="h-full bg-primary/70 rounded-full absolute"
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

              {/* Output Preview - In Progress */}
              {status === 'in-progress' && (
                <div className="space-y-4">
                  <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-4 border border-primary/10 dark:border-primary/20">
                    <h5 className="text-[10px] font-bold text-primary/60 dark:text-primary/70 uppercase mb-2 tracking-widest">
                      Current Task
                    </h5>
                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg border border-white/50 dark:border-gray-700/50">
                      {getCurrentProgressMessage() || (
                        <>
                          {step.id === 'intake' && "Processing RFP upload and extracting basic metadata (client name, deadline, therapeutic area)..."}
                          {step.id === 'brief_extract' && "Deep requirements analysis: Extracting objectives, target audience, sample specifications, deliverables, and timeline from RFP..."}
                          {step.id === 'gap_analysis' && "Analyzing requirements for completeness. Identifying missing fields, ambiguous terms, and gaps..."}
                          {step.id === 'clarification' && "Drafting clarification questions for client based on identified gaps and ambiguities..."}
                          {step.id === 'clarification_response' && "Parsing client responses to clarification questions and assumptions. Extracting answers and updating requirements brief with clarified information..."}
                          {step.id === 'scope_planning' && "Designing research methodology, calculating sample size, and preparing feasibility assessment..."}
                          {step.id === 'workplan' && "Evaluating project feasibility, resource requirements, and timeline constraints..."}
                          {step.id === 'wbs_estimate' && "Calculating pricing tiers and generating cost breakdown based on scope and requirements..."}
                          {step.id === 'proposal' && "Generating proposal document, Statement of Work, and pricing annex..."}
                          {step.id === 'approvals' && "Routing documents to finance, legal, and compliance for approval..."}
                          {!['intake', 'brief_extract', 'gap_analysis', 'clarification', 'clarification_response', 'scope_planning', 'workplan', 'wbs_estimate', 'proposal', 'approvals'].includes(step.id) &&
                            "Processing current workflow step..."}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Human Intervention Alert - Only show when step is completed, not in progress */}
                  {step.requiresApproval && status === 'completed' && !(step.id === 'clarification' && opportunity?.clarification?.status === 'sent') && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="text-orange-600" size={20} />
                          <h5 className="text-sm font-bold text-orange-900 tracking-tight">
                            Human Intervention Required
                          </h5>
                        </div>
                        <span className="px-2 py-0.5 bg-orange-200 text-orange-800 text-[10px] font-bold rounded-lg uppercase">
                          Urgent Task
                        </span>
                      </div>
                      <p className="text-sm text-orange-800/80 mb-4">
                        {step.id === 'clarification' && "Review and approve clarification questions before sending to client."}
                        {step.id === 'scope_planning' && "Review and approve research design and methodology before proceeding."}
                        {step.id === 'proposal' && "Review and approve final proposal documents before submitting to client."}
                        {!['clarification', 'scope_planning', 'proposal'].includes(step.id) && "Review and approve this step before proceeding to the next stage."}
                      </p>
                      <div className="flex gap-3">
                        {/* Review/View button for steps requiring approval */}
                        {step.id === 'clarification' && opportunity?.clarification && (
                          <button
                            onClick={() => setClarificationModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                          >
                            <Eye size={14} />
                            Review Questions
                          </button>
                        )}
                        {step.id === 'gap_analysis' && opportunity?.gapAnalysis && (
                          <button
                            onClick={() => setGapModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-orange-800 border-2 border-orange-300 text-xs font-bold rounded-lg hover:bg-orange-50 transition-colors shadow-sm"
                          >
                            <Eye size={14} />
                            Review Analysis
                          </button>
                        )}
                        {step.id === 'scope_planning' && (
                          <>
                            {opportunity?.scope && (
                              <button
                                onClick={() => setScopeModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-orange-800 border-2 border-orange-300 text-xs font-bold rounded-lg hover:bg-orange-50 transition-colors shadow-sm"
                              >
                                <Eye size={14} />
                                Review Design
                              </button>
                            )}
                            {opportunity?.feasibility && (
                              <button
                                onClick={() => setFeasibilityModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-orange-800 border-2 border-orange-300 text-xs font-bold rounded-lg hover:bg-orange-50 transition-colors shadow-sm"
                              >
                                <Eye size={14} />
                                Review Feasibility
                              </button>
                            )}
                            <button
                              onClick={onApprove || onProcessNext}
                              disabled={processing}
                              className="px-6 py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50"
                            >
                              {processing ? (
                                <>
                                  <Loader2 className="inline w-3 h-3 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                'Approve Design'
                              )}
                            </button>
                          </>
                        )}
                        {/* For other approval steps, keep the approve button */}
                        {!['clarification', 'gap_analysis', 'scope_planning'].includes(step.id) && (
                          <button
                            onClick={onApprove || onProcessNext}
                            disabled={processing}
                            className="px-6 py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50"
                          >
                            {processing ? (
                              <>
                                <Loader2 className="inline w-3 h-3 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                {step.id === 'proposal' && 'Approve Proposal'}
                                {!['clarification', 'scope_planning', 'proposal'].includes(step.id) && 'Approve'}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
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


          {/* Upload/Skip Decision Point - Render after clarification step */}
          {step.id === 'clarification' && showResponseDecision && (
        <div className="relative pl-16 mt-6 mb-6">
          {/* Connecting Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 to-slate-200 dark:to-slate-700" />

          {/* Decision Point Card */}
          <div className={`rounded-xl p-6 shadow-lg border-2 border-dashed transition-all ${
            responseDecisionCompleted
              ? 'bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 border-slate-300 dark:border-slate-700'
              : 'bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-300 dark:border-blue-700'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                responseDecisionCompleted
                  ? 'bg-slate-500/10 dark:bg-slate-500/20'
                  : 'bg-blue-500/10 dark:bg-blue-500/20'
              }`}>
                <FileCheck className={`w-5 h-5 ${
                  responseDecisionCompleted
                    ? 'text-slate-600 dark:text-slate-500'
                    : 'text-blue-600 dark:text-blue-500'
                }`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Client Response Required
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {responseDecisionCompleted
                    ? 'Decision completed. Click refresh icon to re-upload or change choice.'
                    : 'Choose how to proceed with clarification questions'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {responseDecisionCompleted && (
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    2m ago
                  </span>
                )}
                {responseDecisionCompleted && (
                  <button
                    onClick={handleResetDecision}
                    disabled={uploadingResponse}
                    className="p-1.5 text-slate-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh to re-upload or change choice"
                  >
                    <RefreshCw size={16} className={uploadingResponse ? 'animate-spin' : ''} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Upload Response Option */}
              <div className={`bg-white dark:bg-gray-800 rounded-lg p-5 border-2 transition-all ${
                backendStatus === 'clarification'
                  ? 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600'
                  : 'border-gray-300 dark:border-gray-700'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <Upload className={`w-5 h-5 ${backendStatus === 'clarification' ? 'text-emerald-600 dark:text-emerald-500' : 'text-gray-400'}`} />
                  <h4 className="font-bold text-gray-900 dark:text-white">Upload Client Responses</h4>
                  {backendStatus !== 'clarification' && opportunity?.clarification?.client_responses && (
                    <span className="ml-auto px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded uppercase">
                      Used
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                  Upload the client's response file (PDF, Word, Excel, email, or txt). We'll parse and validate their answers.
                </p>
                <label className="block">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.eml"
                    onChange={handleFileUpload}
                    disabled={uploadingResponse || backendStatus !== 'clarification'}
                    className="hidden"
                    id="response-file-upload"
                  />
                  <span
                    className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
                      uploadingResponse || backendStatus !== 'clarification'
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-600'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg cursor-pointer'
                    }`}
                    onClick={(e) => {
                      if (!uploadingResponse && backendStatus === 'clarification') {
                        document.getElementById('response-file-upload')?.click();
                      }
                    }}
                  >
                    {uploadingResponse ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Choose File
                      </>
                    )}
                  </span>
                </label>
              </div>

              {/* Skip Option */}
              <div className={`bg-white dark:bg-gray-800 rounded-lg p-5 border-2 transition-all ${
                backendStatus === 'clarification'
                  ? 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                  : 'border-gray-300 dark:border-gray-700'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className={`w-5 h-5 ${backendStatus === 'clarification' ? 'text-orange-600 dark:text-orange-500' : 'text-gray-400'}`} />
                  <h4 className="font-bold text-gray-900 dark:text-white">Continue with Assumptions</h4>
                  {backendStatus !== 'clarification' && !opportunity?.clarification?.client_responses && (
                    <span className="ml-auto px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded uppercase">
                      Used
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                  Proceed to Research Design without client responses. We'll work with the assumptions made during gap analysis.
                </p>
                <button
                  onClick={handleSkipResponses}
                  disabled={uploadingResponse || backendStatus !== 'clarification'}
                  className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
                    uploadingResponse || backendStatus !== 'clarification'
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-600'
                      : 'bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white shadow-md hover:shadow-lg'
                  }`}
                >
                  {uploadingResponse ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Skip & Proceed
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
          )}

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
