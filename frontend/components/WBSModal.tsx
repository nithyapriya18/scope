'use client';

import { useState } from 'react';
import { X, DollarSign, ClipboardList, Users, Package, TrendingUp, ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';

interface WBSModalProps {
  isOpen: boolean;
  onClose: () => void;
  pricingPack: any;
  rfpTitle: string;
}

type Tab = 'pricing' | 'wbs' | 'cost_detail';

const TIER_COLOURS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  GOOD:   { bg: 'bg-slate-50 dark:bg-slate-800/60',   border: 'border-slate-300 dark:border-slate-600',   badge: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300',   text: 'text-slate-700 dark:text-slate-300' },
  BETTER: { bg: 'bg-blue-50 dark:bg-blue-900/20',     border: 'border-blue-400 dark:border-blue-600',     badge: 'bg-blue-500 text-white',                                               text: 'text-blue-700 dark:text-blue-400' },
  BEST:   { bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-400 dark:border-violet-600', badge: 'bg-violet-500 text-white',                                             text: 'text-violet-700 dark:text-violet-400' },
};

const fmt = (n: number) => n == null ? '—' : `$${Math.round(n).toLocaleString()}`;
const fmtH = (n: number) => n == null ? '—' : `${Math.round(n * 10) / 10}h`;

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'pricing',     label: 'Pricing Tiers',   icon: DollarSign },
  { id: 'wbs',         label: 'Work Breakdown',  icon: ClipboardList },
  { id: 'cost_detail', label: 'Cost Detail',      icon: TrendingUp },
];

export default function WBSModal({ isOpen, onClose, pricingPack, rfpTitle }: WBSModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('pricing');
  const [selectedTier, setSelectedTier] = useState<string>('BETTER');
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({0: true});

  if (!isOpen || !pricingPack) return null;

  const cb = pricingPack.cost_breakdown || {};
  const pricingOptions: any[] = cb.pricingOptions || [];
  const workPackages: any[] = cb.workPackages || [];
  const multipliersApplied: any[] = cb.multipliersApplied || [];
  const recommendedTier: string = cb.recommendedTier || 'BETTER';

  const activeTierData = pricingOptions.find((o: any) => o.tier === selectedTier) || pricingOptions[1] || {};
  const activeCb = activeTierData.costBreakdown || {};
  const laborDetail = activeCb.laborCostDetail || {};
  const hcpDetail = activeCb.hcpCpiCostDetail || {};
  const oopDetail = activeCb.oopCostsDetail || {};

  const togglePhase = (i: number) => setExpandedPhases(prev => ({ ...prev, [i]: !prev[i] }));

  // Compute WBS totals
  const allTasks = workPackages.flatMap((ph: any) => ph.tasks || []);
  const totalBaseHours = allTasks.reduce((s: number, t: any) => s + (t.baseHours || 0), 0);
  const totalBilledHours = allTasks.reduce((s: number, t: any) => s + (t.totalHours || 0), 0);

  // Group WBS tasks by role for summary
  const byRole: Record<string, { baseHours: number; totalHours: number }> = {};
  allTasks.forEach((t: any) => {
    if (!byRole[t.role]) byRole[t.role] = { baseHours: 0, totalHours: 0 };
    byRole[t.role].baseHours += t.baseHours || 0;
    byRole[t.role].totalHours += t.totalHours || 0;
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm py-4 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-violet-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pricing & WBS</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{rfpTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 pb-0 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
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

          {/* ── PRICING TIERS ─────────────────────────────────────── */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              {/* Budget alignment + payment */}
              {(cb.budgetAlignment || cb.paymentTerms) && (
                <div className="grid grid-cols-2 gap-4">
                  {cb.budgetAlignment && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-700">
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">Budget Alignment</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{cb.budgetAlignment}</p>
                    </div>
                  )}
                  {cb.paymentTerms && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-1">Payment Terms</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{cb.paymentTerms}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 3 tier cards */}
              <div className="grid grid-cols-3 gap-4">
                {pricingOptions.map((tier: any) => {
                  const c = TIER_COLOURS[tier.tier] || TIER_COLOURS.GOOD;
                  const isRec = tier.tier === recommendedTier;
                  return (
                    <div key={tier.tier} className={`rounded-xl border-2 ${c.border} ${c.bg} overflow-hidden`}>
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${c.badge}`}>{tier.tier}</span>
                        {isRec && <span className="text-xs font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full">Recommended</span>}
                      </div>
                      <div className="px-4 py-4 space-y-3">
                        <div className="text-center">
                          <p className={`text-3xl font-bold ${c.text}`}>{fmt(tier.totalPrice)}</p>
                          <p className="text-xs text-gray-500 mt-0.5">n={tier.n} participants</p>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-gray-700">
                          {[
                            { label: 'Labor',    value: tier.laborCost },
                            { label: 'HCP/Respondent Incentives', value: tier.hcpCpiCost },
                            { label: 'Out-of-Pocket', value: tier.oopCosts },
                            { label: 'Overhead (18%)', value: tier.overhead },
                            { label: 'Subtotal', value: tier.subtotal, bold: true },
                            { label: `Margin (${tier.marginPct || 25}%)`, value: tier.margin },
                            { label: 'Total', value: tier.totalPrice, bold: true, large: true },
                          ].map(row => row.value != null && (
                            <div key={row.label} className={`flex justify-between text-sm ${row.bold ? 'font-bold border-t border-gray-200 dark:border-gray-700 pt-1' : ''}`}>
                              <span className={`text-gray-600 dark:text-gray-400 ${row.large ? 'text-gray-900 dark:text-white' : ''}`}>{row.label}</span>
                              <span className={`${row.large ? `${c.text} text-base` : 'text-gray-900 dark:text-white'}`}>{fmt(row.value)}</span>
                            </div>
                          ))}
                        </div>
                        {tier.fieldWeeks && (
                          <p className="text-xs text-gray-500 text-center border-t border-gray-200 dark:border-gray-700 pt-2">
                            Field: {tier.fieldWeeks} weeks
                          </p>
                        )}
                        {tier.rationale && (
                          <p className="text-xs text-gray-500 italic border-t border-gray-200 dark:border-gray-700 pt-2">{tier.rationale}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Multipliers applied */}
              {multipliersApplied.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase mb-3">Multipliers Applied</h4>
                  <div className="space-y-2">
                    {multipliersApplied.map((m: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <span className="shrink-0 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-bold rounded text-xs">{m.value}x</span>
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">{m.type}</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-2">{m.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── WORK BREAKDOWN ────────────────────────────────────── */}
          {activeTab === 'wbs' && (
            <div className="space-y-5">
              {/* Summary by role */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    Personnel Summary
                  </h4>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Base: {Math.round(totalBaseHours)}h</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">Billed: {Math.round(totalBilledHours)}h</span>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/60">
                      <th className="px-5 py-2 text-left">Role</th>
                      <th className="px-5 py-2 text-right">Base Hours</th>
                      <th className="px-5 py-2 text-right">Billed Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {Object.entries(byRole).map(([role, data]: [string, any]) => (
                      <tr key={role} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-5 py-2.5 font-medium text-gray-900 dark:text-white">{role}</td>
                        <td className="px-5 py-2.5 text-right text-gray-600 dark:text-gray-400">{fmtH(data.baseHours)}</td>
                        <td className="px-5 py-2.5 text-right font-bold text-gray-900 dark:text-white">{fmtH(data.totalHours)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 dark:bg-gray-800/60 font-bold">
                      <td className="px-5 py-2.5 text-gray-900 dark:text-white">TOTAL</td>
                      <td className="px-5 py-2.5 text-right text-gray-600 dark:text-gray-400">{fmtH(totalBaseHours)}</td>
                      <td className="px-5 py-2.5 text-right text-blue-600 dark:text-blue-400">{fmtH(totalBilledHours)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Phase breakdown */}
              <div className="space-y-3">
                {workPackages.map((phase: any, pi: number) => {
                  const phTasks = phase.tasks || [];
                  const phBase = phTasks.reduce((s: number, t: any) => s + (t.baseHours || 0), 0);
                  const phBilled = phTasks.reduce((s: number, t: any) => s + (t.totalHours || 0), 0);
                  const isOpen = expandedPhases[pi] !== false;
                  return (
                    <div key={pi} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <button
                        onClick={() => togglePhase(pi)}
                        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">
                          {pi + 1}
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm flex-1">{phase.phase}</p>
                        <div className="flex gap-4 text-xs text-gray-500 mr-2">
                          <span>{phTasks.length} tasks</span>
                          <span className="font-bold text-gray-700 dark:text-gray-300">{fmtH(phBilled)} billed</span>
                        </div>
                        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                      </button>
                      {isOpen && (
                        <div className="border-t border-gray-100 dark:border-gray-700">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs font-bold text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/60">
                                <th className="px-5 py-2 text-left">Task</th>
                                <th className="px-5 py-2 text-left">Role</th>
                                <th className="px-4 py-2 text-right">Base</th>
                                <th className="px-3 py-2 text-right">×</th>
                                <th className="px-5 py-2 text-right">Billed</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                              {phTasks.map((task: any, ti: number) => (
                                <tr key={ti} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                  <td className="px-5 py-2.5 text-gray-700 dark:text-gray-300 max-w-xs">
                                    <p className="leading-snug">{task.task}</p>
                                    {task.multiplierReason && (
                                      <p className="text-xs text-gray-400 mt-0.5 italic">{task.multiplierReason}</p>
                                    )}
                                  </td>
                                  <td className="px-5 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{task.role}</td>
                                  <td className="px-4 py-2.5 text-right text-gray-500">{fmtH(task.baseHours)}</td>
                                  <td className="px-3 py-2.5 text-right text-xs text-blue-600 dark:text-blue-400 font-bold">{task.multiplier}x</td>
                                  <td className="px-5 py-2.5 text-right font-bold text-gray-900 dark:text-white">{fmtH(task.totalHours)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── COST DETAIL ───────────────────────────────────────── */}
          {activeTab === 'cost_detail' && (
            <div className="space-y-5">
              {/* Tier selector */}
              <div className="flex gap-2">
                {pricingOptions.map((tier: any) => {
                  const c = TIER_COLOURS[tier.tier] || TIER_COLOURS.GOOD;
                  const isRec = tier.tier === recommendedTier;
                  return (
                    <button
                      key={tier.tier}
                      onClick={() => setSelectedTier(tier.tier)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-bold transition ${
                        selectedTier === tier.tier ? `${c.border} ${c.bg} ${c.text}` : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {tier.tier}
                      {isRec && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                      <span className="text-xs font-normal">{fmt(tier.totalPrice)}</span>
                    </button>
                  );
                })}
              </div>

              {/* Labor cost detail */}
              {laborDetail.roles?.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      Internal Labor
                    </h4>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{fmt(activeTierData.laborCost)}</span>
                  </div>
                  {laborDetail.multipliers && (
                    <div className="px-5 py-2 bg-blue-50 dark:bg-blue-900/10 border-b border-gray-100 dark:border-gray-700 text-xs text-blue-700 dark:text-blue-400">
                      Combined multiplier: <strong>{laborDetail.combinedLaborMultiplier}x</strong>
                      {laborDetail.multipliers.note && ` — ${laborDetail.multipliers.note}`}
                    </div>
                  )}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs font-bold text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/60">
                        <th className="px-5 py-2 text-left">Role</th>
                        <th className="px-5 py-2 text-right">Rate/hr</th>
                        <th className="px-5 py-2 text-right">Base hrs</th>
                        <th className="px-5 py-2 text-right">Billed hrs</th>
                        <th className="px-5 py-2 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {laborDetail.roles.map((r: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                          <td className="px-5 py-2.5 font-medium text-gray-900 dark:text-white">{r.role}</td>
                          <td className="px-5 py-2.5 text-right text-gray-500">${r.rate}</td>
                          <td className="px-5 py-2.5 text-right text-gray-500">{fmtH(r.baseHours)}</td>
                          <td className="px-5 py-2.5 text-right text-gray-700 dark:text-gray-300">{fmtH(r.multipliedHours)}</td>
                          <td className="px-5 py-2.5 text-right font-bold text-gray-900 dark:text-white">{fmt(r.cost)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 dark:bg-gray-800/60 font-bold">
                        <td className="px-5 py-2.5 text-gray-900 dark:text-white" colSpan={2}>Total Labor</td>
                        <td className="px-5 py-2.5 text-right text-gray-500">{fmtH(laborDetail.totalBaseHours)}</td>
                        <td className="px-5 py-2.5 text-right text-gray-700 dark:text-gray-300">{fmtH(laborDetail.totalMultipliedHours)}</td>
                        <td className="px-5 py-2.5 text-right text-blue-600 dark:text-blue-400">{fmt(activeTierData.laborCost)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* HCP / Respondent incentive detail */}
              {(Array.isArray(hcpDetail) ? hcpDetail : hcpDetail.segments || []).length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-500" />
                      HCP / Respondent Incentives &amp; Recruitment (CPI)
                    </h4>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{fmt(activeTierData.hcpCpiCost)}</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs font-bold text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/60">
                        <th className="px-5 py-2 text-left">Segment</th>
                        <th className="px-4 py-2 text-right">n</th>
                        <th className="px-4 py-2 text-right">CPI (adj.)</th>
                        <th className="px-5 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {(Array.isArray(hcpDetail) ? hcpDetail : hcpDetail.segments || []).map((seg: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                          <td className="px-5 py-2.5 text-gray-700 dark:text-gray-300">
                            {seg.segment}
                            {seg.specialty && <span className="ml-1 text-xs text-gray-400">({seg.specialty})</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-400">{seg.n}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-400">
                            {seg.cpiAdjustedUSD != null ? `$${seg.cpiAdjustedUSD}` : seg.cpiBaseUSD != null ? `$${seg.cpiBaseUSD}` : '—'}
                          </td>
                          <td className="px-5 py-2.5 text-right font-bold text-gray-900 dark:text-white">{fmt(seg.totalCost)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 dark:bg-gray-800/60 font-bold">
                        <td className="px-5 py-2.5 text-gray-900 dark:text-white" colSpan={3}>Total HCP / CPI</td>
                        <td className="px-5 py-2.5 text-right text-purple-600 dark:text-purple-400">{fmt(activeTierData.hcpCpiCost)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* OOP detail */}
              {(oopDetail.items || []).length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-500" />
                      Out-of-Pocket Costs
                    </h4>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{fmt(activeTierData.oopCosts)}</span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {oopDetail.items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.item}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{fmt(item.cost)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-5 py-2.5 bg-gray-50 dark:bg-gray-800/60 font-bold">
                      <span className="text-sm text-gray-900 dark:text-white">Total OOP</span>
                      <span className="text-sm text-orange-600 dark:text-orange-400">{fmt(activeTierData.oopCosts)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary roll-up */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-5">
                <h4 className="text-sm font-bold text-blue-700 dark:text-blue-400 uppercase mb-4">Cost Roll-Up — {selectedTier} Tier</h4>
                <div className="space-y-2">
                  {[
                    { label: 'Labor',                       value: activeTierData.laborCost,    color: 'text-blue-700 dark:text-blue-400' },
                    { label: 'HCP / Respondent Incentives', value: activeTierData.hcpCpiCost,   color: 'text-purple-700 dark:text-purple-400' },
                    { label: 'Out-of-Pocket',               value: activeTierData.oopCosts,     color: 'text-orange-700 dark:text-orange-400' },
                    { label: `Overhead (18%)`,              value: activeTierData.overhead,     color: 'text-gray-700 dark:text-gray-300' },
                    { label: 'Subtotal',                    value: activeTierData.subtotal,     color: 'text-gray-900 dark:text-white', bold: true },
                    { label: `Margin (${activeTierData.marginPct || 25}%)`, value: activeTierData.margin, color: 'text-emerald-700 dark:text-emerald-400' },
                  ].map(row => row.value != null && (
                    <div key={row.label} className={`flex justify-between text-sm ${row.bold ? 'border-t border-blue-200 dark:border-blue-700 pt-2 font-bold' : ''}`}>
                      <span className="text-gray-600 dark:text-gray-400">{row.label}</span>
                      <span className={row.color}>{fmt(row.value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-lg font-bold border-t-2 border-blue-300 dark:border-blue-600 pt-3 mt-1">
                    <span className="text-gray-900 dark:text-white">TOTAL PRICE</span>
                    <span className={TIER_COLOURS[selectedTier]?.text || 'text-blue-700'}>{fmt(activeTierData.totalPrice)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
