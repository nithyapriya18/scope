'use client';

import { Check, Loader2, FileText, BarChart2, MessageSquare, ClipboardList, CheckCircle, AlertTriangle, Eye, ChevronDown, Users } from 'lucide-react';
import { useState } from 'react';

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
  onRequestRevision?: () => void;
  processing?: boolean;
}

const workflowSteps: WorkflowStep[] = [
  {
    id: 'brief_extract',
    label: 'RFP Analysis',
    agentName: 'RFP Analysis',
    description: 'Extracted core parameters from client RFP documents',
    icon: FileText,
    statusMapping: ['intake', 'brief_extract']
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
    id: 'scope_planning',
    label: 'Research Design',
    agentName: 'Research Design',
    description: 'Current Task: Synthesizing Methodology & Benchmarking',
    icon: ClipboardList,
    requiresApproval: true,
    statusMapping: ['scope_planning', 'feasibility']
  },
  {
    id: 'workplan',
    label: 'Feasibility',
    agentName: 'Feasibility',
    description: 'Awaiting output from Research Design',
    icon: BarChart2,
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
  onRequestRevision,
  processing = false,
}: VerticalWorkflowTimelineProps) {
  const [showAlls, setShowAlls] = useState(false);
  const backendStatus = opportunity?.status || 'intake';

  // Find the current step index
  const currentStepIndex = workflowSteps.findIndex(step => {
    if (step.statusMapping && Array.isArray(step.statusMapping)) {
      return step.statusMapping.includes(backendStatus);
    }
    return step.id === backendStatus;
  });

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'in-progress';
    if (stepIndex === currentStepIndex + 1) return 'waiting';
    return 'locked';
  };

  const visibleSteps = showAlls ? workflowSteps : workflowSteps.slice(0, 4);

  return (
    <div className="max-w-6xl mx-auto py-6 px-8 space-y-5">
      {visibleSteps.map((step, index) => {
        const status = getStepStatus(index);
        const Icon = step.icon;
        const isLast = index === workflowSteps.length - 1;

        return (
          <div key={step.id} className="relative pl-16 group">
            {/* Connecting Line */}
            {!isLast && (
              <div
                className={`absolute left-6 top-12 bottom-0 w-0.5 -mb-6 ${
                  status === 'completed'
                    ? 'bg-gradient-to-b from-emerald-500 to-slate-200'
                    : status === 'in-progress'
                    ? 'bg-gradient-to-b from-primary to-slate-200'
                    : 'bg-slate-200'
                }`}
              />
            )}

            {/* Step Icon Circle */}
            <div
              className={`absolute left-0 top-0 w-12 h-12 rounded-full flex items-center justify-center z-10 shadow-lg ${
                status === 'completed'
                  ? 'bg-emerald-500 text-white'
                  : status === 'in-progress'
                  ? 'bg-primary text-white ring-4 ring-primary/20'
                  : status === 'waiting'
                  ? 'bg-slate-200 text-slate-500 border-2 border-white'
                  : 'bg-slate-100 text-slate-400 border-2 border-white'
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
                  ? 'bg-white border-2 border-primary'
                  : status === 'completed'
                  ? 'bg-white border border-slate-200'
                  : 'bg-white border border-slate-200 opacity-70'
              }`}
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-base font-bold text-slate-900">
                      {index + 1}. {step.label}
                    </h4>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-black rounded-lg uppercase tracking-wider ${
                        status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : status === 'in-progress'
                          ? 'bg-primary text-white'
                          : status === 'waiting'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-slate-50 text-slate-400'
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
                  <p className="text-xs text-slate-500">{step.description}</p>
                </div>
                {status === 'completed' && (
                  <span className="text-[10px] font-medium text-slate-400">
                    2m ago
                  </span>
                )}
                {status === 'in-progress' && (
                  <div className="text-right">
                    <span className="text-sm font-black text-primary">85%</span>
                    <p className="text-[10px] font-medium text-slate-400">Last activity: 2m ago</p>
                  </div>
                )}
              </div>

              {/* Progress Bar for In Progress */}
              {status === 'in-progress' && (
                <div className="w-full h-2.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: '85%' }} />
                </div>
              )}

              {/* Output Preview - Completed */}
              {status === 'completed' && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">
                    Output Preview
                  </h5>
                  <div className="flex items-start gap-4">
                    <div className="flex-1 text-sm text-slate-600 leading-relaxed italic border-l-2 border-slate-200 pl-4">
                      {step.id === 'brief_extract' && opportunity?.brief?.research_objectives && (
                        `Research Objectives: ${opportunity.brief.research_objectives.slice(0, 150)}...`
                      )}
                      {step.id === 'gap_analysis' && opportunity?.gapAnalysis?.missing_fields && (
                        `Identified ${opportunity.gapAnalysis.missing_fields.length} missing fields. Gap analysis complete.`
                      )}
                      {step.id === 'clarification' && opportunity?.clarification?.questions && (
                        `Generated ${opportunity.clarification.questions.length} clarification questions for client.`
                      )}
                      {!opportunity?.brief && !opportunity?.gapAnalysis && !opportunity?.clarification && (
                        "Step completed. Click View Analysis for details."
                      )}
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-primary hover:text-primary transition-all">
                      <Eye size={14} />
                      View Analysis
                    </button>
                  </div>
                </div>
              )}

              {/* Output Preview - In Progress */}
              {status === 'in-progress' && (
                <div className="space-y-4">
                  <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                    <h5 className="text-[10px] font-bold text-primary/60 uppercase mb-2 tracking-widest">
                      Current Task
                    </h5>
                    <div className="text-sm text-slate-700 leading-relaxed bg-white/50 p-3 rounded-lg border border-white/50">
                      {step.id === 'brief_extract' && "Extracting research objectives, target audience, study requirements, and deliverables from RFP..."}
                      {step.id === 'gap_analysis' && "Analyzing requirements for completeness. Identifying missing fields, ambiguous terms, and gaps..."}
                      {step.id === 'clarification' && "Drafting clarification questions for client based on identified gaps and ambiguities..."}
                      {step.id === 'scope_planning' && "Designing research methodology, calculating sample size, and preparing feasibility assessment..."}
                      {step.id === 'workplan' && "Evaluating project feasibility, resource requirements, and timeline constraints..."}
                      {step.id === 'wbs_estimate' && "Calculating pricing tiers and generating cost breakdown based on scope and requirements..."}
                      {step.id === 'proposal' && "Generating proposal document, Statement of Work, and pricing annex..."}
                      {step.id === 'approvals' && "Routing documents to finance, legal, and compliance for approval..."}
                      {!['brief_extract', 'gap_analysis', 'clarification', 'scope_planning', 'workplan', 'wbs_estimate', 'proposal', 'approvals'].includes(step.id) &&
                        "Processing current workflow step..."}
                    </div>
                  </div>

                  {/* Human Intervention Alert */}
                  {step.requiresApproval && (
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
                              {step.id === 'clarification' && 'Approve & Send'}
                              {step.id === 'scope_planning' && 'Approve Design'}
                              {step.id === 'proposal' && 'Approve Proposal'}
                              {!['clarification', 'scope_planning', 'proposal'].includes(step.id) && 'Approve'}
                            </>
                          )}
                        </button>
                        <button
                          onClick={onRequestRevision}
                          disabled={processing}
                          className="px-4 py-2 bg-white text-orange-800 border border-orange-200 text-xs font-bold rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50"
                        >
                          Request Revision
                        </button>
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
        );
      })}

      {/* Show More s Button */}
      {!showAlls && workflowSteps.length > 4 && (
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
                +{workflowSteps.length - 4}
              </div>
            </div>
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest group-hover:text-primary transition-colors">
              Show {workflowSteps.length - 4} additional pipeline agents
            </span>
            <ChevronDown className="text-slate-400 group-hover:text-primary group-hover:translate-y-1 transition-all" size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
