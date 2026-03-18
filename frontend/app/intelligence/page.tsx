'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  TrendingUp,
  Newspaper,
  Building2,
  Calendar,
  ExternalLink,
  AlertCircle,
  FileText,
  Sparkles,
} from 'lucide-react';

// Mock data - would come from APIs/web scraping
const mockIntelligence = {
  potentialRFPs: [
    {
      id: '1',
      company: 'Novartis',
      signal: 'Posted job opening for "Senior Manager, Market Research"',
      category: 'Hiring Signal',
      likelihood: 'High',
      timeframe: '2-4 weeks',
      details: 'Job posting mentions "conducting physician surveys for oncology portfolio"',
      source: 'LinkedIn',
      date: '2024-02-28',
    },
    {
      id: '2',
      company: 'Pfizer',
      signal: 'Announced Phase 3 trial results for new obesity drug',
      category: 'Pipeline Update',
      likelihood: 'Medium',
      timeframe: '4-8 weeks',
      details: 'Likely to conduct HCP perception study pre-launch',
      source: 'Press Release',
      date: '2024-02-25',
    },
    {
      id: '3',
      company: 'AstraZeneca',
      signal: 'Speaking at ASCO 2024 about new lung cancer therapy',
      category: 'Conference',
      likelihood: 'Medium',
      timeframe: '6-12 weeks',
      details: 'Historical pattern: market research RFPs issued post-major conferences',
      source: 'ASCO Website',
      date: '2024-02-20',
    },
  ],
  pharmaNews: [
    {
      id: '1',
      title: 'FDA Approves Breakthrough Alzheimer\'s Treatment',
      company: 'Biogen',
      summary: 'New antibody therapy shows significant cognitive benefits in Phase 3 trials',
      relevance: 'Post-approval HCP education and perception studies typically follow',
      source: 'FDA.gov',
      date: '2024-03-01',
      url: '#',
    },
    {
      id: '2',
      title: 'Merck Expands Oncology Pipeline with $2.5B Acquisition',
      company: 'Merck',
      summary: 'Acquired biotech focused on novel immunotherapy combinations',
      relevance: 'Portfolio expansion often triggers landscape and market sizing studies',
      source: 'Bloomberg',
      date: '2024-02-28',
      url: '#',
    },
    {
      id: '3',
      title: 'Eli Lilly Reports Record Diabetes Drug Sales',
      company: 'Eli Lilly',
      summary: 'Q4 earnings show 45% growth in GLP-1 category',
      relevance: 'Success may drive competitive intelligence and treatment pattern research',
      source: 'Reuters',
      date: '2024-02-27',
      url: '#',
    },
    {
      id: '4',
      title: 'GSK Announces Major Restructuring of R&D Division',
      company: 'GSK',
      summary: 'New Chief Scientific Officer to focus on precision medicine',
      relevance: 'Organizational changes often precede strategic market research initiatives',
      source: 'FiercePharma',
      date: '2024-02-26',
      url: '#',
    },
  ],
  upcomingEvents: [
    {
      id: '1',
      name: 'ASCO Annual Meeting 2024',
      date: 'May 31 - June 4, 2024',
      location: 'Chicago, IL',
      relevance: 'Major oncology conference - expect post-event RFPs',
      companies: ['Pfizer', 'Merck', 'BMS', 'Roche'],
    },
    {
      id: '2',
      name: 'ACC Scientific Sessions',
      date: 'April 6-8, 2024',
      location: 'Atlanta, GA',
      relevance: 'Cardiology updates often trigger HCP perception studies',
      companies: ['Novartis', 'Amgen', 'AstraZeneca'],
    },
    {
      id: '3',
      name: 'ADA Scientific Sessions',
      date: 'June 21-24, 2024',
      location: 'Orlando, FL',
      relevance: 'Diabetes/obesity focus - high research activity area',
      companies: ['Eli Lilly', 'Novo Nordisk', 'Sanofi'],
    },
  ],
};

export default function IntelligencePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'signals' | 'news' | 'events'>('signals');

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
    } else {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-secondary" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Market Intelligence</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Track pharma industry signals, news, and potential RFP opportunities
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex gap-8 px-6">
              <button
                onClick={() => setActiveTab('signals')}
                className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'signals'
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  RFP Signals ({mockIntelligence.potentialRFPs.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('news')}
                className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'news'
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Newspaper className="w-4 h-4" />
                  Pharma News ({mockIntelligence.pharmaNews.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'events'
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Upcoming Events ({mockIntelligence.upcomingEvents.length})
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'signals' && (
          <div className="space-y-4">
            {mockIntelligence.potentialRFPs.map((signal) => (
              <div key={signal.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="w-5 h-5 text-secondary" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{signal.company}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          signal.likelihood === 'High'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                        }`}
                      >
                        {signal.likelihood} Likelihood
                      </span>
                    </div>
                    <p className="text-gray-900 dark:text-white mb-2">{signal.signal}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{signal.details}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {signal.category}
                      </span>
                      <span>Expected: {signal.timeframe}</span>
                      <span>Source: {signal.source}</span>
                      <span>{signal.date}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'news' && (
          <div className="space-y-4">
            {mockIntelligence.pharmaNews.map((news) => (
              <div key={news.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="w-5 h-5 text-secondary" />
                      <span className="text-sm font-medium text-secondary">{news.company}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{news.date}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{news.title}</h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">{news.summary}</p>
                    <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-500 p-3 mb-3">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Research Opportunity:</strong> {news.relevance}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Source: {news.source}</span>
                      <a
                        href={news.url}
                        className="text-sm text-secondary hover:text-ps-primary-700 flex items-center gap-1"
                      >
                        Read More <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-4">
            {mockIntelligence.upcomingEvents.map((event) => (
              <div key={event.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-5 h-5 text-secondary" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{event.name}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <span>{event.date}</span>
                      <span>•</span>
                      <span>{event.location}</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">{event.relevance}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Expected Exhibitors:</span>
                      {event.companies.map((company, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300"
                        >
                          {company}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
