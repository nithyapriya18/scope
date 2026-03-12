'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Upload, FileText, Loader2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

interface NewOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (opportunityId?: string) => void;
}

export default function NewOpportunityModal({ isOpen, onClose, onSuccess }: NewOpportunityModalProps) {
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

      // Reset form
      setRfpTitle('');
      setClientName('');
      setEmailSubject('');
      setEmailBody('');
      onClose();

      // Redirect to the opportunity page
      if (opportunityId) {
        router.push(`/opportunities/${opportunityId}`);
      } else {
        onSuccess();
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

    try {
      const user = getCurrentUser();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user?.id || 'demo-user');
      formData.append('rfpTitle', fileRfpTitle || file.name);
      formData.append('clientName', fileClientName);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload RFP');
      }

      const result = await response.json();
      const opportunityId = result.opportunity?.id;

      // Reset form
      setFile(null);
      setFileRfpTitle('');
      setFileClientName('');
      onClose();

      // Redirect to the opportunity page
      if (opportunityId) {
        router.push(`/opportunities/${opportunityId}`);
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload RFP');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/80 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Opportunity</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setMode('text')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                mode === 'text'
                  ? 'text-ps-primary-600 border-b-2 border-ps-primary-600'
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
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                mode === 'file'
                  ? 'text-ps-primary-600 border-b-2 border-ps-primary-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" />
                Upload RFP
              </div>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Form Content */}
          {mode === 'text' ? (
            <form onSubmit={handleTextSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  RFP Title *
                </label>
                <input
                  type="text"
                  value={rfpTitle}
                  onChange={(e) => setRfpTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ps-primary-500"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ps-primary-500"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ps-primary-500"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ps-primary-500 font-mono text-sm"
                  placeholder="Paste the RFP text here..."
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-ps-primary-600 hover:bg-ps-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Opportunity'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFileSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  RFP Title
                </label>
                <input
                  type="text"
                  value={fileRfpTitle}
                  onChange={(e) => setFileRfpTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ps-primary-500"
                  placeholder="e.g., NSCLC Treatment Patterns Study"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  value={fileClientName}
                  onChange={(e) => setFileClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ps-primary-500"
                  placeholder="e.g., Pfizer, Merck, Novartis"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  PDF File *
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-ps-primary-600" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Drag and drop or click to upload (PDF, DOC, DOCX)
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const selectedFile = e.target.files?.[0];
                          if (selectedFile) setFile(selectedFile);
                        }}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="inline-block px-4 py-2 bg-ps-primary-600 hover:bg-ps-primary-700 text-white rounded-lg cursor-pointer text-sm font-medium transition-colors"
                      >
                        Select File
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !file}
                  className="flex-1 px-4 py-2 bg-ps-primary-600 hover:bg-ps-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload & Create'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
