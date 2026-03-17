'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, BookOpen, Layers, FileText, CheckCircle, Settings2, Plus, Filter } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

interface StudyFamily {
  id: string;
  name: string;
  description: string;
  icon: string;
  studyTypes: StudyType[];
}

interface StudyType {
  id: string;
  name: string;
  description: string;
  methodology: string;
  typicalDuration: string;
  sampleSize: string;
  deliverables: string[];
  useCases: string[];
}

// Mock data based on MECE taxonomy
const studyFamilies: StudyFamily[] = [
  {
    id: 'qualitative',
    name: 'Qualitative Research',
    description: 'In-depth exploratory research to understand behaviors, motivations, and perceptions',
    icon: '💬',
    studyTypes: [
      {
        id: 'idi',
        name: 'In-Depth Interviews (IDIs)',
        description: 'One-on-one interviews with HCPs or patients for detailed insights',
        methodology: 'Qualitative',
        typicalDuration: '4-6 weeks',
        sampleSize: '20-40 interviews',
        deliverables: ['Interview transcripts', 'Thematic analysis', 'Key insights report'],
        useCases: ['Treatment decision-making', 'Product perception', 'Unmet needs exploration']
      },
      {
        id: 'focus-groups',
        name: 'Focus Groups',
        description: 'Moderated group discussions with 6-10 participants',
        methodology: 'Qualitative',
        typicalDuration: '3-5 weeks',
        sampleSize: '4-8 groups',
        deliverables: ['Session recordings', 'Discussion guides', 'Synthesis report'],
        useCases: ['Concept testing', 'Message testing', 'Group dynamics']
      },
      {
        id: 'ethnography',
        name: 'Ethnographic Studies',
        description: 'Observational research in natural settings',
        methodology: 'Qualitative',
        typicalDuration: '8-12 weeks',
        sampleSize: '10-20 observations',
        deliverables: ['Field notes', 'Video documentation', 'Behavioral insights'],
        useCases: ['Patient journey mapping', 'Clinical workflow analysis']
      }
    ]
  },
  {
    id: 'quantitative',
    name: 'Quantitative Research',
    description: 'Structured surveys to measure and quantify opinions, behaviors, and trends',
    icon: '📊',
    studyTypes: [
      {
        id: 'online-survey',
        name: 'Online Surveys',
        description: 'Web-based questionnaires for efficient data collection',
        methodology: 'Quantitative',
        typicalDuration: '3-4 weeks',
        sampleSize: '200-500 respondents',
        deliverables: ['Raw data file', 'Topline results', 'Statistical analysis'],
        useCases: ['Market sizing', 'Brand awareness', 'Satisfaction measurement']
      },
      {
        id: 'phone-survey',
        name: 'Telephone Surveys',
        description: 'CATI (Computer-Assisted Telephone Interviews)',
        methodology: 'Quantitative',
        typicalDuration: '4-6 weeks',
        sampleSize: '300-600 respondents',
        deliverables: ['Survey data', 'Cross-tabs', 'Executive summary'],
        useCases: ['Hard-to-reach populations', 'Complex questioning', 'High response quality']
      },
      {
        id: 'patient-registry',
        name: 'Patient Registry Analysis',
        description: 'Secondary analysis of existing patient databases',
        methodology: 'Quantitative',
        typicalDuration: '6-8 weeks',
        sampleSize: 'Variable',
        deliverables: ['Statistical models', 'Trend analysis', 'Predictive insights'],
        useCases: ['Real-world evidence', 'Treatment patterns', 'Outcomes research']
      }
    ]
  },
  {
    id: 'mixed-methods',
    name: 'Mixed Methods Research',
    description: 'Combining qualitative and quantitative approaches for comprehensive insights',
    icon: '🔄',
    studyTypes: [
      {
        id: 'sequential',
        name: 'Sequential Exploratory',
        description: 'Qualitative phase followed by quantitative validation',
        methodology: 'Mixed Methods',
        typicalDuration: '8-12 weeks',
        sampleSize: '30 IDIs + 300 survey',
        deliverables: ['Phase 1 qualitative report', 'Phase 2 quantitative analysis', 'Integrated findings'],
        useCases: ['New product launch', 'Hypothesis generation and testing']
      },
      {
        id: 'concurrent',
        name: 'Concurrent Triangulation',
        description: 'Qualitative and quantitative data collected simultaneously',
        methodology: 'Mixed Methods',
        typicalDuration: '6-10 weeks',
        sampleSize: '20 IDIs + 250 survey',
        deliverables: ['Qual insights', 'Quant metrics', 'Converged analysis'],
        useCases: ['Comprehensive market assessment', 'Strategy development']
      }
    ]
  },
  {
    id: 'advisory-boards',
    name: 'Advisory Boards & Panels',
    description: 'Expert consultation and ongoing engagement with key opinion leaders',
    icon: '👥',
    studyTypes: [
      {
        id: 'kol-advisory',
        name: 'KOL Advisory Boards',
        description: 'Strategic consultation with key opinion leaders',
        methodology: 'Advisory',
        typicalDuration: '1-2 days',
        sampleSize: '8-12 experts',
        deliverables: ['Meeting notes', 'Strategic recommendations', 'Action items'],
        useCases: ['Clinical development input', 'Market access strategy', 'Launch planning']
      },
      {
        id: 'patient-panels',
        name: 'Patient Advisory Panels',
        description: 'Ongoing engagement with patient advocates',
        methodology: 'Advisory',
        typicalDuration: '3-6 months',
        sampleSize: '10-15 patients',
        deliverables: ['Session summaries', 'Patient perspectives', 'Design feedback'],
        useCases: ['Patient-centric design', 'Advocacy alignment', 'Communication testing']
      }
    ]
  },
  {
    id: 'observational',
    name: 'Observational Studies',
    description: 'Non-interventional research to understand real-world clinical practice',
    icon: '🔍',
    studyTypes: [
      {
        id: 'chart-review',
        name: 'Chart Reviews',
        description: 'Retrospective analysis of medical records',
        methodology: 'Observational',
        typicalDuration: '8-12 weeks',
        sampleSize: '200-500 charts',
        deliverables: ['Data abstraction forms', 'Clinical patterns', 'Treatment pathways'],
        useCases: ['Treatment patterns', 'Outcomes assessment', 'Guideline adherence']
      },
      {
        id: 'prospective-cohort',
        name: 'Prospective Cohort Studies',
        description: 'Forward-looking observation of patient cohorts',
        methodology: 'Observational',
        typicalDuration: '12-24 months',
        sampleSize: '100-300 patients',
        deliverables: ['Baseline data', 'Longitudinal tracking', 'Outcomes analysis'],
        useCases: ['Natural history studies', 'Long-term outcomes', 'Prognostic factors']
      }
    ]
  },
  {
    id: 'digital',
    name: 'Digital Research',
    description: 'Technology-enabled research using digital platforms and tools',
    icon: '💻',
    studyTypes: [
      {
        id: 'online-community',
        name: 'Online Research Communities (ORCs)',
        description: 'Private online platforms for ongoing engagement',
        methodology: 'Digital',
        typicalDuration: '2-6 weeks',
        sampleSize: '50-150 members',
        deliverables: ['Discussion summaries', 'Activity analytics', 'Insight reports'],
        useCases: ['Continuous feedback', 'Co-creation', 'Longitudinal insights']
      },
      {
        id: 'mobile-diary',
        name: 'Mobile Diary Studies',
        description: 'Real-time data collection via smartphone apps',
        methodology: 'Digital',
        typicalDuration: '4-8 weeks',
        sampleSize: '30-60 participants',
        deliverables: ['Diary entries', 'Multimedia content', 'Behavioral patterns'],
        useCases: ['Patient experience', 'Treatment adherence', 'Daily living impact']
      }
    ]
  }
];

export default function StudyLibraryPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<StudyType | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
  }, [router]);

  const filteredFamilies = studyFamilies.filter((family) =>
    family.name.toLowerCase().includes(search.toLowerCase()) ||
    family.studyTypes.some(type => type.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 z-10 flex-shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Study Library</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="Search study types..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => alert('Custom study template creation coming soon')}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-opacity"
          >
            <Plus size={16} />
            Custom Template
          </button>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-8 bg-background-light dark:bg-background-dark">
        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-primary rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <BookOpen className="text-primary mt-0.5" size={20} />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                MECE Study Taxonomy
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Our library contains {studyFamilies.length} study families with {studyFamilies.reduce((sum, f) => sum + f.studyTypes.length, 0)} pre-defined study types.
                Each study type includes standard methodologies, deliverables, and typical timelines to streamline proposal generation.
              </p>
            </div>
          </div>
        </div>

        {/* Study Families Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredFamilies.map((family) => (
            <div
              key={family.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all"
            >
              {/* Family Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-3xl">{family.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                      {family.name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {family.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Layers size={14} />
                  {family.studyTypes.length} study types
                </div>
              </div>

              {/* Study Types List */}
              <div className="p-4 space-y-2">
                {family.studyTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSelectedFamily(family.id);
                      setSelectedType(type);
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                          {type.name}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          {type.typicalDuration} • {type.sampleSize}
                        </p>
                      </div>
                      <CheckCircle className="text-slate-300 dark:text-slate-700 group-hover:text-primary transition-colors" size={16} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredFamilies.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No study types found</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Try adjusting your search terms</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedType(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {selectedType.name}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {selectedType.description}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
              {/* Quick Facts */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Methodology</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedType.methodology}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Duration</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedType.typicalDuration}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Sample Size</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedType.sampleSize}</p>
                </div>
              </div>

              {/* Deliverables */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  Standard Deliverables
                </h3>
                <ul className="space-y-2">
                  {selectedType.deliverables.map((deliverable, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      {deliverable}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Use Cases */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Settings2 size={16} className="text-primary" />
                  Common Use Cases
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedType.useCases.map((useCase, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg"
                    >
                      {useCase}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setSelectedType(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert(`Use "${selectedType.name}" template for new proposal`);
                  setSelectedType(null);
                }}
                className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white rounded-lg transition-colors"
              >
                Use Template
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
