'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Loader2, X, BarChart2, MessageSquare, ClipboardList, Search, FileCheck, CheckCircle, Eye, Users, RefreshCw } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

const workflowSteps = [
  { id: 'intake',                 label: 'RFP Intake',                         description: 'Upload RFP document or paste text',              icon: FileText,      uiOnly: false },
  { id: 'brief_extract',          label: 'Requirements & Brief Creation',       description: 'Extract and map to 13-section template',        icon: Search,        uiOnly: false },
  { id: 'gap_analysis',           label: 'Gaps & Assumptions Identification',   description: 'Identify missing info and flag assumptions',     icon: BarChart2,     uiOnly: false },
  { id: 'clarification',          label: 'Clarification Request',               description: 'AI generates clarification email for client',   icon: MessageSquare, uiOnly: false },
  { id: 'human_review',           label: 'Human Review Point',                  description: 'Review, approve & send email to client',        icon: Eye,           uiOnly: true  },
  { id: 'clarification_response', label: 'Response Parsing & Brief Update',     description: 'Parse client response and update brief',        icon: RefreshCw,     uiOnly: false },
  { id: 'feasibility',            label: 'Feasibility Analysis',                description: 'Match HCP profiles and score panel availability', icon: Users,        uiOnly: false },
  { id: 'scope_planning',         label: 'Research Plan',                       description: 'Design methodology and sample size options',     icon: ClipboardList, uiOnly: false },
  { id: 'wbs_estimate',           label: 'Pricing & Budgeting',                 description: 'Build WBS, estimate hours, apply rate card',    icon: BarChart2,     uiOnly: false },
  { id: 'document_gen',           label: 'Proposal Creation',                   description: 'Generate proposal narrative and SoW',           icon: FileCheck,     uiOnly: false },
  { id: 'approvals',              label: 'Approvals & Closure',                 description: 'Route for stakeholder review and sign-off',     icon: CheckCircle,   uiOnly: false },
];

export default function NewOpportunityPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'text' | 'file'>('text');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Text mode state
  const [rfpTitle, setRfpTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // File mode state
  const [file, setFile] = useState<File | null>(null);
  const [fileRfpTitle, setFileRfpTitle] = useState('');
  const [fileClientName, setFileClientName] = useState('');
  const [fileTherapeuticArea, setFileTherapeuticArea] = useState('');
  const [fileDeadline, setFileDeadline] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile);
    setError('');
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = getCurrentUser();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'demo-user',
          rfpTitle,
          clientName,
          emailSubject,
          emailBody,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create opportunity');
      }

      const result = await response.json();
      const opportunityId = result.opportunity?.id;

      if (opportunityId) {
        router.push(`/opportunities/${opportunityId}`);
      } else {
        setError('Failed to get opportunity ID');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create opportunity');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setError('');
    setLoading(true);
    setUploadProgress(0);

    // Simulate progress: ramp to ~85% over ~8s, then wait for real response
    let progress = 0;
    progressIntervalRef.current = setInterval(() => {
      progress = Math.min(progress + (progress < 40 ? 4 : progress < 70 ? 2 : 0.5), 85);
      setUploadProgress(Math.round(progress));
    }, 300);

    try {
      const user = getCurrentUser();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user?.id || 'demo-user');
      formData.append('rfpTitle', fileRfpTitle || file.name);
      formData.append('clientName', fileClientName);
      formData.append('therapeuticArea', fileTherapeuticArea);
      formData.append('rfpDeadline', fileDeadline);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload RFP');
      }

      const result = await response.json();
      const opportunityId = result.opportunity?.id;

      if (opportunityId) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setUploadProgress(100);
        router.push(`/opportunities/${opportunityId}`);
      } else {
        setError('Failed to get opportunity ID');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload RFP');
    } finally {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-5">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2 tracking-tight">
              Create New Opportunity
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-base text-gray-600 dark:text-gray-400">
              <span>Upload an RFP document or paste the text to get started</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-6 py-6 pb-12">
        {/* Upload Form */}
        <div className="max-w-5xl mx-auto">
          {/* Step 1: RFP Intake - Active */}
          <div className="relative pl-16 mb-8">
            {/* Connecting Line */}
            <div className="absolute left-6 top-12 bottom-0 w-0.5 -mb-8 bg-slate-200 dark:bg-slate-700" />

            {/* Step Icon Circle */}
            <div className="absolute left-0 top-0 w-12 h-12 rounded-full flex items-center justify-center z-10 shadow-lg bg-primary text-white ring-4 ring-primary/20 dark:ring-primary/30">
              <FileText className="w-6 h-6" />
            </div>

            {/* Step Card - Upload Form */}
            <div className="rounded-xl p-6 shadow-sm bg-white dark:bg-gray-800 border-2 border-primary dark:border-primary">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      1. RFP Intake
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-black rounded-lg uppercase tracking-wider bg-gradient-to-r from-primary to-secondary text-white">
                      In Progress
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Upload RFP document or paste text to begin processing</p>
                </div>
              </div>

              {/* Mode Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                <button
                  onClick={() => setMode('text')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    mode === 'text'
                      ? 'text-secondary border-b-2 border-secondary'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    Paste Text
                  </div>
                </button>
                <button
                  onClick={() => setMode('file')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    mode === 'file'
                      ? 'text-secondary border-b-2 border-secondary'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload PDF
                  </div>
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              {/* Form Content */}
              {mode === 'text' ? (
                <form key="text-form" onSubmit={handleTextSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      RFP Title *
                    </label>
                    <input
                      type="text"
                      value={rfpTitle}
                      onChange={(e) => setRfpTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary"
                      placeholder="e.g., NSCLC Treatment Patterns Study"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Client Name
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary"
                      placeholder="e.g., Pfizer, Merck, Novartis"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary"
                      placeholder="e.g., RFP: Oncology Research Study"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      RFP Content *
                    </label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary font-mono text-sm"
                      placeholder="Paste the RFP text here..."
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard')}
                      className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-8 py-3 bg-secondary hover:opacity-90 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg text-base"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Opportunity'
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form key="file-form" onSubmit={handleFileSubmit} className="space-y-4">
                  {file && (
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        ✨ <strong>AI will automatically extract:</strong> RFP Title, Client Name, Therapeutic Area, Deadline, and all metadata
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      RFP File (PDF, DOC, DOCX) *
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0];
                        if (selectedFile) handleFileSelection(selectedFile);
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    {file ? (
                      <div className="flex items-center justify-between gap-3 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <FileText className="w-5 h-5 text-secondary shrink-0" />
                          <div className="text-left min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setFile(null);
                            setFileRfpTitle('');
                            setFileClientName('');
                          }}
                          className="text-red-500 hover:text-red-600 shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="file-upload"
                        className="block border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-secondary dark:hover:border-secondary transition-colors bg-white dark:bg-gray-900"
                      >
                        <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Drag and drop or click to upload
                        </p>
                        <span className="inline-block px-4 py-2 bg-secondary hover:opacity-90 text-white rounded-lg text-sm font-medium transition-colors">
                          Select File
                        </span>
                      </label>
                    )}
                  </div>

                  {loading && (
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                          {uploadProgress < 30 ? 'Uploading file...' : uploadProgress < 60 ? 'Extracting text...' : uploadProgress < 85 ? 'Parsing RFP content...' : 'Creating opportunity...'}
                        </span>
                        <span className="text-sm font-bold text-secondary">{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-secondary to-primary rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard')}
                      className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !file}
                      className="flex-1 px-8 py-3 bg-secondary hover:opacity-90 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg text-base"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Upload & Create Opportunity'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Remaining Steps - Locked */}
          {workflowSteps.slice(1).map((step, index) => {
            const Icon = step.icon;
            // Count non-uiOnly steps before this one (including step 0) to get display number
            const displayNumber = workflowSteps.slice(0, index + 1).filter(s => !s.uiOnly).length + 1;
            const isLast = index === workflowSteps.length - 2;

            return (
              <div key={step.id} className="relative pl-16 mb-8">
                {/* Connecting Line */}
                {!isLast && (
                  <div className="absolute left-6 top-12 bottom-0 w-0.5 -mb-8 bg-slate-200 dark:bg-slate-700" />
                )}

                {/* Step Icon Circle */}
                <div className="absolute left-0 top-0 w-12 h-12 rounded-full flex items-center justify-center z-10 shadow-sm bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-2 border-white dark:border-gray-800">
                  <Icon className="w-6 h-6" />
                </div>

                {/* Step Card */}
                <div className="rounded-xl p-6 shadow-sm bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 opacity-70">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {step.uiOnly ? '↳' : `${displayNumber}.`} {step.label}
                        </h4>
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-lg uppercase tracking-wider bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-400">
                          Locked
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{step.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
