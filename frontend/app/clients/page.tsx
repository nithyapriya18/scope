'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Building2, Users, TrendingUp, DollarSign, Phone, Mail, MapPin, ExternalLink, FileText, Calendar } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

interface Client {
  id: string;
  name: string;
  industry: string;
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  totalBids: number;
  wonBids: number;
  activeBids: number;
  totalRevenue: number;
  lastContact: string;
  primaryContact: {
    name: string;
    email: string;
    phone: string;
  };
  therapeuticAreas: string[];
  location: string;
}

// Mock data
const mockClients: Client[] = [
  {
    id: '1',
    name: 'Pfizer Inc.',
    industry: 'Pharmaceutical',
    tier: 'Tier 1',
    totalBids: 24,
    wonBids: 18,
    activeBids: 3,
    totalRevenue: 4500000,
    lastContact: '2026-03-08',
    primaryContact: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@pfizer.com',
      phone: '+1 (212) 555-0123'
    },
    therapeuticAreas: ['Oncology', 'Cardiology', 'Immunology'],
    location: 'New York, NY'
  },
  {
    id: '2',
    name: 'Merck & Co.',
    industry: 'Pharmaceutical',
    tier: 'Tier 1',
    totalBids: 19,
    wonBids: 14,
    activeBids: 2,
    totalRevenue: 3800000,
    lastContact: '2026-03-10',
    primaryContact: {
      name: 'Michael Chen',
      email: 'michael.chen@merck.com',
      phone: '+1 (908) 555-0456'
    },
    therapeuticAreas: ['Oncology', 'Vaccines', 'Diabetes'],
    location: 'Rahway, NJ'
  },
  {
    id: '3',
    name: 'Johnson & Johnson',
    industry: 'Pharmaceutical',
    tier: 'Tier 1',
    totalBids: 16,
    wonBids: 12,
    activeBids: 1,
    totalRevenue: 3200000,
    lastContact: '2026-03-05',
    primaryContact: {
      name: 'Emily Rodriguez',
      email: 'emily.rodriguez@jnj.com',
      phone: '+1 (732) 555-0789'
    },
    therapeuticAreas: ['Cardiology', 'Neuroscience', 'Immunology'],
    location: 'New Brunswick, NJ'
  },
  {
    id: '4',
    name: 'AstraZeneca',
    industry: 'Pharmaceutical',
    tier: 'Tier 2',
    totalBids: 12,
    wonBids: 8,
    activeBids: 2,
    totalRevenue: 2100000,
    lastContact: '2026-03-07',
    primaryContact: {
      name: 'David Thompson',
      email: 'david.thompson@astrazeneca.com',
      phone: '+44 20 7555 0123'
    },
    therapeuticAreas: ['Oncology', 'Respiratory', 'Cardiovascular'],
    location: 'Cambridge, UK'
  },
  {
    id: '5',
    name: 'Novartis AG',
    industry: 'Pharmaceutical',
    tier: 'Tier 2',
    totalBids: 10,
    wonBids: 7,
    activeBids: 1,
    totalRevenue: 1900000,
    lastContact: '2026-03-09',
    primaryContact: {
      name: 'Anna Mueller',
      email: 'anna.mueller@novartis.com',
      phone: '+41 61 555 0234'
    },
    therapeuticAreas: ['Oncology', 'Cardiology', 'Ophthalmology'],
    location: 'Basel, Switzerland'
  }
];

export default function ClientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [filterTier, setFilterTier] = useState<string>('all');

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
  }, [router]);

  const filtered = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.primaryContact.name.toLowerCase().includes(search.toLowerCase());
    const matchesTier = filterTier === 'all' || client.tier === filterTier;
    return matchesSearch && matchesTier;
  });

  const stats = {
    total: clients.length,
    tier1: clients.filter(c => c.tier === 'Tier 1').length,
    tier2: clients.filter(c => c.tier === 'Tier 2').length,
    activeBids: clients.reduce((sum, c) => sum + c.activeBids, 0),
    totalRevenue: clients.reduce((sum, c) => sum + c.totalRevenue, 0),
    avgWinRate: Math.round((clients.reduce((sum, c) => sum + (c.totalBids > 0 ? c.wonBids / c.totalBids : 0), 0) / clients.length) * 100)
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Tier 1': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Tier 2': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Tier 3': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 z-10 flex-shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Clients</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="Search clients..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterTier('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filterTier === 'all'
                  ? 'bg-gradient-to-r from-primary to-secondary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterTier('Tier 1')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filterTier === 'Tier 1'
                  ? 'bg-gradient-to-r from-primary to-secondary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Tier 1
            </button>
            <button
              onClick={() => setFilterTier('Tier 2')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filterTier === 'Tier 2'
                  ? 'bg-gradient-to-r from-primary to-secondary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Tier 2
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => alert('Add new client functionality coming soon')}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-opacity"
          >
            <Plus size={16} />
            Add Client
          </button>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-8 bg-background-light dark:bg-background-dark">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Total Clients</p>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</h3>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="text-primary" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Active Bids</p>
                <h3 className="text-3xl font-bold text-blue-600">{stats.activeBids}</h3>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="text-blue-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Avg Win Rate</p>
                <h3 className="text-3xl font-bold text-emerald-600">{stats.avgWinRate}%</h3>
              </div>
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrendingUp className="text-emerald-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Total Revenue</p>
                <h3 className="text-3xl font-bold text-primary">${(stats.totalRevenue / 1000000).toFixed(1)}M</h3>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="text-primary" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Client Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((client) => (
            <div
              key={client.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/clients/${client.id}`)}
            >
              {/* Card Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-cyan-600 flex items-center justify-center">
                      <Building2 className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{client.name}</h3>
                      <p className="text-sm text-slate-500">{client.industry}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg ${getTierColor(client.tier)}`}>
                    {client.tier}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin size={14} />
                  {client.location}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4">
                {/* Primary Contact */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Primary Contact</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-white">
                      <Users size={14} className="text-slate-400" />
                      {client.primaryContact.name}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Mail size={14} className="text-slate-400" />
                      {client.primaryContact.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Phone size={14} className="text-slate-400" />
                      {client.primaryContact.phone}
                    </div>
                  </div>
                </div>

                {/* Therapeutic Areas */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Therapeutic Areas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {client.therapeuticAreas.map((area) => (
                      <span
                        key={area}
                        className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Bids</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{client.totalBids}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Won</p>
                    <p className="text-lg font-bold text-emerald-600">{client.wonBids}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Active</p>
                    <p className="text-lg font-bold text-primary">{client.activeBids}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500">
                    <Calendar size={12} className="inline mr-1" />
                    Last contact: {new Date(client.lastContact).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/clients/${client.id}`);
                    }}
                    className="text-xs font-semibold text-primary hover:text-cyan-800 flex items-center gap-1"
                  >
                    View Details
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No clients found</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </>
  );
}
