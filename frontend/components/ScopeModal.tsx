'use client';

import {
  X, ClipboardList, Target, Users, Calendar, FileText,
  AlertTriangle, CheckCircle, Save, MessageSquare,
  Truck, Clock, ChevronRight, Activity, BookOpen, HelpCircle,
} from 'lucide-react';
import { useState } from 'react';

interface ScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: any;
  rfpTitle: string;
  opportunityId?: string;
}

type Tab = 'overview' | 'methodology' | 'sample' | 'recruitment' | 'timeline' | 'guide' | 'deliverables' | 'assumptions';

// Normalize an AI field that should be an array of strings but may be an object or array of objects
function toStringArray(val: any): string[] {
  if (!val) return [];
  if (typeof val === 'string') return [val];
  if (Array.isArray(val)) return val.map((item: any) =>
    typeof item === 'string' ? item : typeof item === 'object' ? Object.entries(item).map(([k, v]) => `${k}: ${v}`).join('; ') : String(item)
  );
  if (typeof val === 'object') return Object.entries(val).map(([k, v]) => `${k}: ${v}`);
  return [String(val)];
}

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: Target },
  { id: 'methodology', label: 'Methodology', icon: Activity },
  { id: 'sample', label: 'Sample Plan', icon: Users },
  { id: 'recruitment', label: 'Recruitment', icon: Truck },
  { id: 'timeline', label: 'Timeline', icon: Calendar },
  { id: 'guide', label: 'Discussion Guide', icon: MessageSquare },
  { id: 'deliverables', label: 'Deliverables', icon: FileText },
  { id: 'assumptions', label: 'Assumptions', icon: BookOpen },
];

const RISK_COLOURS: Record<string, string> = {
  low: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  medium: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
  high: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
};

const PHASE_COLOURS = [
  'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500',
  'bg-pink-500', 'bg-rose-500', 'bg-orange-500', 'bg-amber-500',
];

export default function ScopeModal({ isOpen, onClose, scope, rfpTitle, opportunityId }: ScopeModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen || !scope) return null;

  // Normalise field names — API returns snake_case DB columns
  const prettifyCode = (code: string) =>
    code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const studyType = scope.detectedStudyType || (scope.detected_study_type ? {
    typeCode: scope.detected_study_type,
    displayName: scope.study_type_display_name
      || (scope.detected_study_type && !scope.detected_study_type.includes(' ')
          ? prettifyCode(scope.detected_study_type)
          : scope.detected_study_type),
    familyCode: scope.study_family_display_name || '',
    confidence: parseFloat(scope.study_type_confidence) || 0,
    rationale: '',
  } : null);

  const methodology: any = scope.methodology_detail || null;
  const sampleOptions: any[] = scope.sample_size_options || scope.sampleSizeOptions || [];
  const recruitment: any = scope.recruitment_strategy || null;
  const timeline: any = scope.key_milestones || scope.projectTimeline || null;
  const deliverables: any[] = scope.deliverables || [];
  const assumptions: any[] = scope.scope_assumptions || scope.scopeAssumptions || [];
  const discussionGuide: any = scope.discussion_guide_outline || scope.discussionGuide || null;
  const execSummary: string = scope.executive_summary || '';

  const handleSave = async () => {
    if (!opportunityId) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunityId}/documents/scope`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: JSON.stringify(scope, null, 2),
            filename: `Research_Plan_${rfpTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`,
          }),
        }
      );
      if (!res.ok) throw new Error('Failed to save');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert('Failed to save research plan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm py-4 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Research Plan</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{rfpTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveSuccess && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
            <button
              onClick={handleSave}
              disabled={saving || !opportunityId}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-800 text-white text-sm rounded-lg transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-6 pt-3 pb-0 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── OVERVIEW ─────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Executive Summary */}
              {execSummary && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                  <h3 className="text-sm font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-2">Executive Summary</h3>
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{execSummary}</p>
                </div>
              )}

              {/* Study Type */}
              {studyType && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 col-span-2">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-blue-500" />
                      <h3 className="font-bold text-gray-900 dark:text-white">Study Type Detected</h3>
                      <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                        {Math.round((studyType.confidence || 0) * 100)}% confidence
                      </span>
                    </div>
                    <div className="flex items-start gap-4">
                      <div>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{studyType.displayName}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{studyType.familyCode}</p>
                      </div>
                    </div>
                    {studyType.rationale && (
                      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
                        {studyType.rationale}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Quick stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Sample Options', value: sampleOptions.length || '—', icon: Users, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
                  { label: 'Timeline', value: timeline?.totalWeeks ? `${timeline.totalWeeks} wks` : '—', icon: Clock, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
                  { label: 'Discussion Sections', value: discussionGuide?.sections?.length || '—', icon: MessageSquare, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30' },
                  { label: 'Deliverables', value: deliverables.length || '—', icon: FileText, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-2`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── METHODOLOGY ──────────────────────────────────────────── */}
          {activeTab === 'methodology' && (
            <div className="space-y-5">
              {methodology ? (
                <>
                  {/* Approach badge */}
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      methodology.approach === 'quantitative'
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                        : methodology.approach === 'qualitative'
                        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400'
                        : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400'
                    }`}>
                      {(methodology.approach || 'quantitative').charAt(0).toUpperCase() + (methodology.approach || '').slice(1)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">{methodology.dataCollectionMethod}</span>
                  </div>

                  {/* Key specs grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Instrument', value: methodology.instrumentType },
                      { label: 'Length of Interview', value: typeof methodology.lengthOfInterviewMinutes === 'object' ? Object.entries(methodology.lengthOfInterviewMinutes).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v} min`).join(' · ') : `${methodology.lengthOfInterviewMinutes} minutes` },
                      { label: 'Approx. Questions', value: typeof methodology.approximateQuestions === 'object' ? Object.entries(methodology.approximateQuestions).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' · ') : methodology.approximateQuestions },
                      { label: 'Data Collection Mode', value: methodology.dataCollectionMethod },
                    ].filter(r => r.value).map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{label}</p>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Analysis approach */}
                  {toStringArray(methodology.analysisApproach).length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase mb-3">Analysis Approach</h4>
                      <div className="flex flex-wrap gap-2">
                        {toStringArray(methodology.analysisApproach).map((a: string, i: number) => (
                          <span key={i} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-lg font-medium">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Advanced analytics */}
                  {toStringArray(methodology.advancedAnalytics).length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase mb-3">Advanced Analytics</h4>
                      <div className="flex flex-wrap gap-2">
                        {toStringArray(methodology.advancedAnalytics).map((a: string, i: number) => (
                          <span key={i} className="px-3 py-1.5 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm rounded-lg font-medium">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rationale */}
                  {methodology.rationale && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                      <h4 className="text-sm font-bold text-blue-700 dark:text-blue-400 uppercase mb-2">Why This Approach</h4>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{methodology.rationale}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-400">Methodology details not available</div>
              )}
            </div>
          )}

          {/* ── SAMPLE PLAN ──────────────────────────────────────────── */}
          {activeTab === 'sample' && (
            <div className="space-y-5">
              {sampleOptions.length > 0 ? (
                sampleOptions.map((option: any, idx: number) => {
                  const isRec = option.label === 'recommended';
                  return (
                    <div key={idx} className={`rounded-xl border-2 overflow-hidden ${isRec ? 'border-emerald-400 dark:border-emerald-700' : 'border-gray-200 dark:border-gray-700'}`}>
                      {/* Option header */}
                      <div className={`flex items-center justify-between px-5 py-3 ${isRec ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-gray-50 dark:bg-gray-800/60'}`}>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-bold uppercase tracking-wide ${isRec ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {option.label}
                          </span>
                          {isRec && <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full">Recommended</span>}
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">n={option.n}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Fieldwork</p>
                            <p className="font-bold text-gray-900 dark:text-white">{option.fieldDurationWeeks}w</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Feasibility</p>
                            <p className={`font-bold ${option.feasibilityScore >= 75 ? 'text-emerald-600' : option.feasibilityScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {option.feasibilityScore}/100
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">CI</p>
                            <p className="font-bold text-gray-900 dark:text-white">{option.confidenceInterval}</p>
                          </div>
                        </div>
                      </div>

                      {/* Segment breakdown */}
                      {option.segments?.length > 0 && (
                        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-3">Segment Breakdown</p>
                          <div className="grid grid-cols-3 gap-2">
                            {option.segments.map((seg: any, si: number) => (
                              <div key={si} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm">
                                <span className="text-gray-600 dark:text-gray-400">{seg.segment}{seg.country ? ` (${seg.country})` : ''}</span>
                                <span className="font-bold text-gray-900 dark:text-white">n={seg.n}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Rationale */}
                      {option.rationale && (
                        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                          <p className="text-sm text-gray-600 dark:text-gray-400 italic">{option.rationale}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-gray-400">No sample size options available</div>
              )}
            </div>
          )}

          {/* ── RECRUITMENT ──────────────────────────────────────────── */}
          {activeTab === 'recruitment' && (
            <div className="space-y-5">
              {recruitment ? (
                <>
                  {/* Summary bar */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                      <p className="text-xs font-bold text-blue-600 uppercase mb-1">Primary Source</p>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{recruitment.primarySource}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-1">Incidence Rate</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{Math.round((recruitment.incidenceRateAssumption || 0) * 100)}%</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-1">Contacts Needed</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{(recruitment.contactsNeeded || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Vendor cards */}
                  {recruitment.sources?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase mb-3">Vendor Sources</h4>
                      <div className="space-y-3">
                        {recruitment.sources.map((src: any, i: number) => (
                          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white">{src.vendor}</p>
                                <p className="text-sm text-gray-500 mt-0.5">{src.coverage}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                  src.role === 'primary'
                                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                                    : src.role === 'specialist'
                                    ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}>
                                  {src.role}
                                </span>
                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{src.estimatedContribution}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm border-t border-gray-100 dark:border-gray-700 pt-3">
                              <span className="text-gray-500">Cost per complete:</span>
                              <span className="font-bold text-gray-900 dark:text-white">${src.costPerComplete}</span>
                            </div>
                            {src.notes && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">{src.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fraud control */}
                  {recruitment.fraudControlMeasures?.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase mb-3">Quality & Fraud Controls</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {recruitment.fraudControlMeasures.map((m: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            {m}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compliance */}
                  {recruitment.complianceNotes && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">Compliance Notes</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{recruitment.complianceNotes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-400">Recruitment strategy not available</div>
              )}
            </div>
          )}

          {/* ── TIMELINE ─────────────────────────────────────────────── */}
          {activeTab === 'timeline' && (
            <div className="space-y-5">
              {timeline?.phases?.length > 0 ? (
                <>
                  {/* Gantt-style bar chart */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-x-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">Project Gantt</h4>
                      <span className="text-sm text-gray-500">Total: {timeline.totalWeeks} weeks</span>
                    </div>
                    {/* Week header */}
                    <div className="min-w-[600px]">
                      <div className="flex mb-2">
                        <div className="w-40 shrink-0" />
                        <div className="flex-1 flex">
                          {Array.from({ length: timeline.totalWeeks }, (_, i) => (
                            <div key={i} className="flex-1 text-center text-xs text-gray-400 font-medium">
                              W{i + 1}
                            </div>
                          ))}
                        </div>
                      </div>
                      {timeline.phases.map((phase: any, i: number) => (
                        <div key={i} className="flex items-center mb-2">
                          <div className="w-40 shrink-0 pr-2">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{phase.phase}</p>
                          </div>
                          <div className="flex-1 flex relative h-7">
                            {Array.from({ length: timeline.totalWeeks }, (_, w) => {
                              const week = w + 1;
                              const inPhase = week >= phase.startWeek && week < phase.startWeek + phase.durationWeeks;
                              const isStart = week === phase.startWeek;
                              const isEnd = week === phase.startWeek + phase.durationWeeks - 1;
                              return (
                                <div
                                  key={w}
                                  className={`flex-1 ${
                                    inPhase
                                      ? `${PHASE_COLOURS[i % PHASE_COLOURS.length]} ${isStart ? 'rounded-l-md' : ''} ${isEnd ? 'rounded-r-md' : ''} opacity-80`
                                      : 'bg-gray-100 dark:bg-gray-700'
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Phase details */}
                  <div className="space-y-3">
                    {timeline.phases.map((phase: any, i: number) => (
                      <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className={`flex items-center gap-3 px-5 py-3 ${PHASE_COLOURS[i % PHASE_COLOURS.length]} bg-opacity-10`}>
                          <div className={`w-6 h-6 rounded-full ${PHASE_COLOURS[i % PHASE_COLOURS.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 dark:text-white text-sm">{phase.phase}</p>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>Week {phase.startWeek}{phase.durationWeeks > 1 ? `–${phase.startWeek + phase.durationWeeks - 1}` : ''}</span>
                            <span className="text-gray-400">·</span>
                            <span>{phase.durationWeeks}w</span>
                          </div>
                        </div>
                        <div className="px-5 py-3">
                          <ul className="space-y-1">
                            {phase.tasks?.map((task: string, ti: number) => (
                              <li key={ti} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                                {task}
                              </li>
                            ))}
                          </ul>
                          {phase.milestone && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Milestone: {phase.milestone}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-400">Timeline not available</div>
              )}
            </div>
          )}

          {/* ── DISCUSSION GUIDE ─────────────────────────────────────── */}
          {activeTab === 'guide' && (
            <div className="space-y-5">
              {discussionGuide ? (
                <>
                  {/* Header */}
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl p-5 border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-indigo-700 dark:text-indigo-400 text-sm uppercase tracking-wide">
                        {discussionGuide.format || 'Discussion Guide'}
                      </h3>
                      {discussionGuide.totalDurationMinutes && (
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
                          {discussionGuide.totalDurationMinutes} min total
                        </span>
                      )}
                    </div>
                    {toStringArray(discussionGuide.keyThemes).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {toStringArray(discussionGuide.keyThemes).map((theme: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-lg">
                            {theme}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sections */}
                  {discussionGuide.sections?.length > 0 && (
                    <div className="space-y-4">
                      {discussionGuide.sections.map((section: any, si: number) => (
                        <div key={si} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold shrink-0">
                                {si + 1}
                              </div>
                              <p className="font-bold text-gray-900 dark:text-white text-sm">{section.section}</p>
                            </div>
                            {section.durationMinutes && (
                              <span className="text-xs text-gray-400 font-medium">{section.durationMinutes} min</span>
                            )}
                          </div>
                          {section.objective && (
                            <div className="px-5 py-2 border-b border-gray-50 dark:border-gray-700/50 bg-blue-50/30 dark:bg-blue-900/10">
                              <p className="text-xs text-blue-700 dark:text-blue-400 italic">{section.objective}</p>
                            </div>
                          )}
                          <ul className="divide-y divide-gray-50 dark:divide-gray-700/50">
                            {toStringArray(section.keyQuestions).map((q: string, qi: number) => {
                              const isProbe = q.toLowerCase().startsWith('probe:') || q.toLowerCase().startsWith('follow');
                              return (
                                <li key={qi} className={`flex items-start gap-3 px-5 py-2.5 ${isProbe ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''}`}>
                                  <span className="shrink-0 mt-0.5">
                                    {isProbe
                                      ? <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                                      : <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                                    }
                                  </span>
                                  <p className={`text-sm ${isProbe ? 'text-amber-700 dark:text-amber-400 italic' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {q}
                                  </p>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Interviewer notes */}
                  {discussionGuide.interviewerNotes && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase mb-1">Interviewer Notes</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{discussionGuide.interviewerNotes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-400">Discussion guide not yet generated for this plan</div>
              )}
            </div>
          )}

          {/* ── DELIVERABLES ─────────────────────────────────────────── */}
          {activeTab === 'deliverables' && (
            <div className="space-y-3">
              {deliverables.length > 0 ? (
                deliverables.map((d: any, i: number) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white">{d.deliverable}</p>
                      </div>
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg">
                        {d.timing}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 ml-9">{d.format}</p>
                    {d.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 ml-9">{d.description}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">No deliverables specified</div>
              )}
            </div>
          )}

          {/* ── ASSUMPTIONS ──────────────────────────────────────────── */}
          {activeTab === 'assumptions' && (
            <div className="space-y-3">
              {assumptions.length > 0 ? (
                assumptions.map((a: any, i: number) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{a.category}</span>
                        {a.isStandard && (
                          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">Standard</span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${RISK_COLOURS[a.riskLevel] || RISK_COLOURS.low}`}>
                        {(a.riskLevel || 'low').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{a.assumption}</p>
                    {a.requiresClientConfirmation && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-orange-600 dark:text-orange-400 font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        Requires client confirmation
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">No assumptions logged</div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
