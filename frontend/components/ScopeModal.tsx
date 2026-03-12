'use client';

import { X, ClipboardList, Target, Users, Calendar, FileText, AlertTriangle, CheckCircle, Download, Save } from 'lucide-react';
import { useState } from 'react';
import jsPDF from 'jspdf';

interface ScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: any;
  rfpTitle: string;
  opportunityId?: string;
}

export default function ScopeModal({ isOpen, onClose, scope, rfpTitle, opportunityId }: ScopeModalProps) {
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen || !scope) return null;

  const formatScopeAsText = () => {
    let text = `RESEARCH DESIGN (SCOPE)\n`;
    text += `RFP: ${rfpTitle}\n`;
    text += `Generated: ${new Date().toLocaleDateString()}\n`;
    text += `═══════════════════════════════════════════════════════\n\n`;

    if (scope.detectedStudyType) {
      text += `STUDY TYPE\n`;
      text += `─────────────────────────────────────────────────────\n`;
      text += `Study Type: ${scope.detectedStudyType.displayName}\n`;
      text += `Family: ${scope.detectedStudyType.familyCode}\n`;
      text += `Confidence: ${Math.round(scope.detectedStudyType.confidence * 100)}%\n`;
      text += `Rationale: ${scope.detectedStudyType.rationale}\n\n`;
    }

    if (scope.sampleSizeOptions && scope.sampleSizeOptions.length > 0) {
      text += `SAMPLE SIZE RECOMMENDATIONS\n`;
      text += `─────────────────────────────────────────────────────\n`;
      scope.sampleSizeOptions.forEach((option: any) => {
        text += `\n${option.label.toUpperCase()}:\n`;
        text += `  Sample Size: n=${option.n}\n`;
        text += `  Confidence Interval: ${option.confidenceInterval}\n`;
        text += `  Estimated Cost: $${option.estimatedCost?.toLocaleString()}\n`;
        text += `  Duration: ${option.fieldDurationWeeks} weeks\n`;
        text += `  Feasibility Score: ${option.feasibilityScore}/100\n`;
        if (option.rationale) text += `  Rationale: ${option.rationale}\n`;
      });
      text += `\n`;
    }

    if (scope.scopeAssumptions && scope.scopeAssumptions.length > 0) {
      text += `SCOPE ASSUMPTIONS (${scope.scopeAssumptions.length})\n`;
      text += `─────────────────────────────────────────────────────\n`;
      scope.scopeAssumptions.forEach((assumption: any, idx: number) => {
        text += `\n${idx + 1}. [${assumption.category}] ${assumption.assumption}\n`;
        text += `   Risk Level: ${assumption.riskLevel}\n`;
        if (assumption.isStandard) text += `   Standard Assumption: Yes\n`;
        if (assumption.requiresClientConfirmation) text += `   ⚠️  Requires Client Confirmation\n`;
      });
      text += `\n`;
    }

    if (scope.estimatedTotalCost) {
      text += `ESTIMATED TOTAL COST\n`;
      text += `─────────────────────────────────────────────────────\n`;
      text += `Conservative: $${scope.estimatedTotalCost.conservative?.toLocaleString()}\n`;
      text += `Recommended: $${scope.estimatedTotalCost.recommended?.toLocaleString()}\n`;
      text += `Aggressive: $${scope.estimatedTotalCost.aggressive?.toLocaleString()}\n`;
    }

    return text;
  };

  const handleSave = async () => {
    if (!opportunityId) {
      alert('Cannot save: Opportunity ID not provided');
      return;
    }
    setSaving(true);
    try {
      const content = formatScopeAsText();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunityId}/documents/scope`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          filename: `Research_Design_${rfpTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.txt`,
        }),
      });
      if (!response.ok) throw new Error('Failed to save research design');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving research design:', error);
      alert('Failed to save research design. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    setDownloading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Research Design (Scope)', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`RFP: ${rfpTitle}`, margin, yPos);
      yPos += 6;
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
      yPos += 15;

      // Study Type
      if (scope.detectedStudyType) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Study Type', margin, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Type: ${scope.detectedStudyType.displayName}`, margin, yPos);
        yPos += 6;
        doc.text(`Family: ${scope.detectedStudyType.familyCode}`, margin, yPos);
        yPos += 6;
        doc.text(`Confidence: ${Math.round(scope.detectedStudyType.confidence * 100)}%`, margin, yPos);
        yPos += 15;
      }

      // Sample Size Options
      if (scope.sampleSizeOptions && scope.sampleSizeOptions.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Sample Size Recommendations', margin, yPos);
        yPos += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        scope.sampleSizeOptions.forEach((option: any) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFont('helvetica', 'bold');
          doc.text(`${option.label.toUpperCase()}:`, margin, yPos);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          doc.text(`n=${option.n}, CI: ${option.confidenceInterval}, Cost: $${option.estimatedCost?.toLocaleString()}`, margin + 5, yPos);
          yPos += 8;
        });
        yPos += 5;
      }

      // Scope Assumptions
      if (scope.scopeAssumptions && scope.scopeAssumptions.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Scope Assumptions (${scope.scopeAssumptions.length})`, margin, yPos);
        yPos += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        scope.scopeAssumptions.forEach((assumption: any, idx: number) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          const assumptionText = `${idx + 1}. [${assumption.category}] ${assumption.assumption}`;
          const lines = doc.splitTextToSize(assumptionText, pageWidth - 2 * margin);
          doc.text(lines, margin, yPos);
          yPos += lines.length * 5 + 3;
        });
      }

      doc.save(`Research_Design_${rfpTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to download research design. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm py-4 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500/5 to-purple-500/10 dark:from-blue-500/10 dark:to-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Research Design</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{rfpTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Saved!</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !opportunityId}
              className="flex items-center justify-center gap-2 w-40 px-4 py-2 bg-gray-700 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title={!opportunityId ? 'Opportunity ID required to save' : 'Save to Files'}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save to Files
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center justify-center gap-2 w-40 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Study Type Detection */}
          {scope.detectedStudyType && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-6 h-6 text-blue-600 dark:text-blue-500" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Study Type</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Study Type</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-500">{scope.detectedStudyType.displayName}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Family</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{scope.detectedStudyType.familyCode}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Confidence</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{Math.round(scope.detectedStudyType.confidence * 100)}%</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 col-span-2">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Rationale</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{scope.detectedStudyType.rationale}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sample Size Options */}
          {scope.sampleSizeOptions && scope.sampleSizeOptions.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-500" />
                Sample Size Recommendations
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {scope.sampleSizeOptions.map((option: any, idx: number) => (
                  <div
                    key={idx}
                    className={`rounded-xl p-5 border-2 ${
                      option.label === 'recommended'
                        ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-400 dark:border-emerald-700'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">{option.label}</span>
                      {option.label === 'recommended' && (
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                      )}
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">n={option.n}</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">CI:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{option.confidenceInterval}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Cost:</span>
                        <span className="font-medium text-gray-900 dark:text-white">${option.estimatedCost?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{option.fieldDurationWeeks}w</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Feasibility:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{option.feasibilityScore}/100</span>
                      </div>
                    </div>
                    {option.rationale && (
                      <p className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 italic">
                        {option.rationale}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scope Assumptions */}
          {scope.scopeAssumptions && scope.scopeAssumptions.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                Scope Assumptions ({scope.scopeAssumptions.length})
              </h3>
              <div className="space-y-3">
                {scope.scopeAssumptions.map((assumption: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{assumption.category}</span>
                        {assumption.isStandard && (
                          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
                            Standard
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        assumption.riskLevel === 'high'
                          ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                          : assumption.riskLevel === 'medium'
                          ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                          : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                      }`}>
                        {assumption.riskLevel.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{assumption.assumption}</p>
                    {assumption.requiresClientConfirmation && (
                      <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="font-medium">Requires client confirmation</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estimated Costs */}
          {scope.estimatedTotalCost && (
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Estimated Total Cost</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Conservative</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">${scope.estimatedTotalCost.conservative?.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase mb-1">Recommended</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">${scope.estimatedTotalCost.recommended?.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Aggressive</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">${scope.estimatedTotalCost.aggressive?.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
