'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Users, TrendingUp, Globe, AlertTriangle, CheckCircle, Filter } from 'lucide-react';

interface PanelEntry {
  specialty: string;
  country: string;
  group: number;
  panelSize: number;
  activeRate: number;
  recruitmentWeeks: number;
}

interface PanelDb {
  panel: PanelEntry[];
  specialtyAliases: Record<string, string>;
  _meta: { description: string; countries: string[]; last_updated: string };
}

const GROUP_LABELS: Record<number, string> = {
  1: 'Group 1 — PCP / Nurse / GP',
  2: 'Group 2 — Cardio / Endo / Pulmo',
  3: 'Group 3 — Onco / Haem / ID',
  4: 'Group 4 — IV Cards / Vascular / Pathology',
};

const GROUP_COLORS: Record<number, string> = {
  1: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  2: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  3: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  4: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

function availabilityLabel(panelSize: number, activeRate: number) {
  const active = Math.round(panelSize * activeRate);
  if (active >= 500) return { label: 'High', color: 'text-emerald-600 dark:text-emerald-400' };
  if (active >= 150) return { label: 'Medium', color: 'text-amber-600 dark:text-amber-400' };
  return { label: 'Limited', color: 'text-rose-600 dark:text-rose-400' };
}

export default function HcpPanelPage() {
  const [db, setDb] = useState<PanelDb | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterGroup, setFilterGroup] = useState('');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/hcp-panel`)
      .then(r => r.json())
      .then(d => { setDb(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const specialties = useMemo(() => {
    if (!db) return [];
    return Array.from(new Set(db.panel.map(e => e.specialty))).sort();
  }, [db]);

  const countries = useMemo(() => {
    if (!db) return [];
    return Array.from(new Set(db.panel.map(e => e.country))).sort();
  }, [db]);

  const filtered = useMemo(() => {
    if (!db) return [];
    return db.panel.filter(e => {
      const q = search.toLowerCase();
      if (q && !e.specialty.toLowerCase().includes(q) && !e.country.toLowerCase().includes(q)) return false;
      if (filterSpecialty && e.specialty !== filterSpecialty) return false;
      if (filterCountry && e.country !== filterCountry) return false;
      if (filterGroup && e.group !== parseInt(filterGroup)) return false;
      return true;
    });
  }, [db, search, filterSpecialty, filterCountry, filterGroup]);

  const stats = useMemo(() => {
    if (!db) return null;
    const total = db.panel.reduce((s, e) => s + e.panelSize, 0);
    const activeTotal = db.panel.reduce((s, e) => s + Math.round(e.panelSize * e.activeRate), 0);
    const countryCount = new Set(db.panel.map(e => e.country)).size;
    const specialtyCount = new Set(db.panel.map(e => e.specialty)).size;
    return { total, activeTotal, countryCount, specialtyCount };
  }, [db]);

  if (loading) return (
    <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
      Loading panel data…
    </div>
  );

  if (!db) return (
    <div className="flex items-center justify-center h-full text-rose-500">
      Failed to load panel data
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">HCP Panel</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              PetaSight validated respondent network — used by the Feasibility agent
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
            Mock Data
          </span>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mt-5">
            {[
              { label: 'Total Panel', value: stats.total.toLocaleString(), icon: Users, color: 'text-secondary' },
              { label: 'Active Respondents', value: stats.activeTotal.toLocaleString(), icon: TrendingUp, color: 'text-emerald-500' },
              { label: 'Countries', value: stats.countryCount, icon: Globe, color: 'text-primary' },
              { label: 'Specialties', value: stats.specialtyCount, icon: CheckCircle, color: 'text-amber-500' },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 dark:bg-gray-700 rounded-xl px-4 py-3 flex items-center gap-3">
                <s.icon className={`w-5 h-5 flex-shrink-0 ${s.color}`} />
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{s.value}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-slate-700 px-8 py-3">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search specialty or country…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={filterSpecialty}
            onChange={e => setFilterSpecialty(e.target.value)}
            className="text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Specialties</option>
            {specialties.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterCountry}
            onChange={e => setFilterCountry(e.target.value)}
            className="text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Countries</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
            className="text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Groups</option>
            {[1,2,3,4].map(g => <option key={g} value={g}>Group {g}</option>)}
          </select>
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} entries</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8 py-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              <th className="text-left pb-3 pr-4">Specialty</th>
              <th className="text-left pb-3 pr-4">Country</th>
              <th className="text-left pb-3 pr-4">Group</th>
              <th className="text-right pb-3 pr-4">Panel Size</th>
              <th className="text-right pb-3 pr-4">Active Pool</th>
              <th className="text-right pb-3 pr-4">Response Rate</th>
              <th className="text-right pb-3 pr-4">Recruit Weeks</th>
              <th className="text-right pb-3">Availability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((e, i) => {
              const active = Math.round(e.panelSize * e.activeRate);
              const avail = availabilityLabel(e.panelSize, e.activeRate);
              return (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{e.specialty}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{e.country}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${GROUP_COLORS[e.group] || ''}`}>
                      G{e.group}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                    {e.panelSize.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                    {active.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-500 dark:text-slate-400 tabular-nums">
                    {Math.round(e.activeRate * 100)}%
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-500 dark:text-slate-400 tabular-nums">
                    {e.recruitmentWeeks}w
                  </td>
                  <td className="py-3 text-right">
                    <span className={`font-semibold text-xs ${avail.color}`}>{avail.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p className="text-sm">No entries match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
