import { AlertTriangle } from 'lucide-react';

type WorkflowStatus = 'intake' | 'brief_extract' | 'gap_analysis' | 'clarification' | 'scope_plan' | 'proposal';

const config: Record<WorkflowStatus, { label: string; className: string; hasAlert?: boolean }> = {
  intake: { label: 'Intake', className: 'bg-ps-secondary-100 text-ps-secondary-800 dark:bg-ps-secondary-900/30 dark:text-ps-secondary-300' },
  brief_extract: { label: 'Extracting', className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  gap_analysis: { label: 'Gap Analysis', className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  clarification: { label: 'Clarification', className: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', hasAlert: true },
  scope_plan: { label: 'Scoping', className: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  proposal: { label: 'Proposal', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

export const StatusBadge = ({ status }: { status: WorkflowStatus }) => {
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${c.className}`}>
      {c.hasAlert && <AlertTriangle className="h-3.5 w-3.5" />}
      {c.label}
    </span>
  );
};

export default StatusBadge;
