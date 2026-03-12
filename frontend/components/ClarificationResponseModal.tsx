'use client';

import { X, CheckCircle, AlertCircle, FileCheck, BarChart2, Save, Download } from 'lucide-react';
import { useState } from 'react';
import jsPDF from 'jspdf';

interface ClarificationResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  responses?: any;
  gapAnalysis?: any;
  brief?: any;
  rfpTitle: string;
  opportunityId?: string;
}

export default function ClarificationResponseModal({
  isOpen,
  onClose,
  responses,
  gapAnalysis,
  brief,
  rfpTitle,
  opportunityId,
}: ClarificationResponseModalProps) {
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  // If no responses provided, we're showing assumptions only (skip was used)
  const showingAssumptionsOnly = !responses && gapAnalysis;

  // Support both old and new response formats
  const questionResponses = responses?.responses?.filter((r: any) => r.type === 'question') || responses?.responses || [];
  const assumptionResponses = responses?.responses?.filter((r: any) => r.type === 'assumption') || [];

  const questionsAnsweredCount = responses?.questionsAnsweredCount ?? responses?.answeredCount ?? 0;
  const questionsUnansweredCount = responses?.questionsUnansweredCount ?? responses?.unansweredCount ?? 0;
  const assumptionsConfirmedCount = responses?.assumptionsConfirmedCount ?? 0;
  const assumptionsCorrectedCount = responses?.assumptionsCorrectedCount ?? 0;

  const totalQuestions = questionsAnsweredCount + questionsUnansweredCount;
  const totalAssumptions = assumptionsConfirmedCount + assumptionsCorrectedCount;

  const newCompleteness = responses?.newCompleteness ?? responses?.completeness ?? 0;
  const completenessPercentage = Math.round(newCompleteness * 100);
  const criticalGapsRemaining = responses?.criticalGapsRemaining || 0;
  const readyToProceed = responses?.readyToProceed || false;

  const getConfidenceColor = (confidence: string) => {
    switch (confidence?.toLowerCase()) {
      case 'high':
        return 'bg-emerald-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const formatBriefAsText = () => {
    let text = `${rfpTitle}\n${'='.repeat(rfpTitle.length)}\n\n`;

    if (brief?.raw_extraction) {
      const briefData = brief.raw_extraction;

      if (briefData.executiveSummary?.oneLinerSummary) {
        text += `EXECUTIVE SUMMARY\n${briefData.executiveSummary.oneLinerSummary}\n\n`;
      }

      if (briefData.researchObjectives && Array.isArray(briefData.researchObjectives)) {
        text += `RESEARCH OBJECTIVES\n`;
        briefData.researchObjectives.forEach((obj: any, idx: number) => {
          text += `${idx + 1}. ${typeof obj === 'object' ? JSON.stringify(obj) : obj}\n`;
        });
        text += '\n';
      }

      if (briefData.targetAudience?.primaryRespondents) {
        text += `TARGET AUDIENCE\n${briefData.targetAudience.primaryRespondents}\n\n`;
      }

      if (briefData.sampleSpecifications?.totalSampleSize) {
        text += `SAMPLE SIZE\n${briefData.sampleSpecifications.totalSampleSize}\n\n`;
      }
    }

    // Add clarification responses if provided
    if (!showingAssumptionsOnly && questionResponses.length > 0) {
      text += `\nCLARIFICATION RESPONSES\n`;
      questionResponses.forEach((response: any, idx: number) => {
        text += `Q${idx + 1}: ${response.question}\nA: ${response.answer}\n\n`;
      });
    }

    // Add assumptions
    const assumptions = gapAnalysis?.raw_gap_analysis?.assumptionsMade || gapAnalysis?.assumptions_made || [];
    if (assumptions.length > 0) {
      text += `\nASSUMPTIONS\n`;
      assumptions.forEach((assumption: any, idx: number) => {
        const assumptionText = typeof assumption === 'string' ? assumption : assumption.assumption || assumption.requirement || JSON.stringify(assumption);
        text += `${idx + 1}. ${assumptionText}\n`;
      });
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
      const content = formatBriefAsText();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunityId}/documents/updated-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          filename: `Updated_Brief_${rfpTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.txt`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save updated brief');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save updated brief to documents');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;

      // Cover Page
      doc.setFillColor(218, 54, 92);
      doc.rect(0, 0, pageWidth, 60, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.text('PETASIGHT', pageWidth / 2, 25, { align: 'center' });
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Lumina Scope', pageWidth / 2, 35, { align: 'center' });
      doc.setTextColor(218, 54, 92);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Updated Requirements Brief', pageWidth / 2, 80, { align: 'center' });
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const titleLines = doc.splitTextToSize(rfpTitle, pageWidth - 40);
      let titleY = 100;
      titleLines.forEach((line: string) => {
        doc.text(line, pageWidth / 2, titleY, { align: 'center' });
        titleY += 6;
      });
      doc.setTextColor(156, 163, 175);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, pageHeight - 30, { align: 'center' });

      // Content
      doc.addPage();
      yPos = 20;

      const addSection = (title: string, content: string) => {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }
        doc.setTextColor(218, 54, 92);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 20, yPos);
        yPos += 8;
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(content, pageWidth - 40);
        lines.forEach((line: string) => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 20, yPos);
          yPos += 5;
        });
        yPos += 8;
      };

      if (brief?.raw_extraction) {
        const briefData = brief.raw_extraction;

        if (briefData.executiveSummary?.oneLinerSummary) {
          addSection('Executive Summary', briefData.executiveSummary.oneLinerSummary);
        }

        if (briefData.researchObjectives && Array.isArray(briefData.researchObjectives)) {
          const objectives = briefData.researchObjectives.map((obj: any, idx: number) =>
            `${idx + 1}. ${typeof obj === 'object' ? JSON.stringify(obj) : obj}`
          ).join('\n');
          addSection('Research Objectives', objectives);
        }

        if (briefData.targetAudience?.primaryRespondents) {
          addSection('Target Audience', briefData.targetAudience.primaryRespondents);
        }
      }

      // Add clarification responses
      if (!showingAssumptionsOnly && questionResponses.length > 0) {
        const responsesText = questionResponses.map((response: any, idx: number) =>
          `Q${idx + 1}: ${response.question}\nAnswer: ${response.answer}`
        ).join('\n\n');
        addSection('Clarification Responses', responsesText);
      }

      // Add assumptions
      const assumptions = gapAnalysis?.raw_gap_analysis?.assumptionsMade || gapAnalysis?.assumptions_made || [];
      if (assumptions.length > 0) {
        const assumptionsText = assumptions.map((assumption: any, idx: number) => {
          const assumptionText = typeof assumption === 'string' ? assumption : assumption.assumption || assumption.requirement || JSON.stringify(assumption);
          return `${idx + 1}. ${assumptionText}`;
        }).join('\n');
        addSection('Assumptions', assumptionsText);
      }

      doc.save(`Updated_Brief_${rfpTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download updated brief as PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm py-4 px-4">
      {/* Success Toast */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 z-[60] bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in slide-in-from-top">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold">Updated brief saved successfully!</span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-500/5 to-emerald-500/10 dark:from-emerald-500/10 dark:to-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {showingAssumptionsOnly ? 'Requirements Brief' : 'Updated Requirements Brief'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{rfpTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !opportunityId}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
          {/* Complete Requirements Brief (if available) */}
          {brief?.raw_extraction && (
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {showingAssumptionsOnly ? 'Requirements Brief' : 'Original Requirements Brief'}
              </h3>
              <div className="space-y-4">
                {/* Executive Summary */}
                {brief.raw_extraction.executiveSummary && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Executive Summary</h4>
                    {brief.raw_extraction.executiveSummary.oneLinerSummary && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{brief.raw_extraction.executiveSummary.oneLinerSummary}</p>
                    )}
                    {brief.raw_extraction.executiveSummary.therapeuticAreaContext && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{brief.raw_extraction.executiveSummary.therapeuticAreaContext}</p>
                    )}
                  </div>
                )}

                {/* Research Objectives */}
                {brief.raw_extraction.researchObjectives && Array.isArray(brief.raw_extraction.researchObjectives) && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Research Objectives</h4>
                    <ul className="space-y-2">
                      {brief.raw_extraction.researchObjectives.map((obj: any, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <span className="text-primary font-bold">{idx + 1}.</span>
                          <span>{typeof obj === 'object' ? JSON.stringify(obj) : String(obj)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Scope of Work */}
                {brief.raw_extraction.scopeOfWork && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Scope of Work</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {brief.raw_extraction.scopeOfWork.studyType && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Study Type:</p>
                          <p className="font-medium text-gray-900 dark:text-white">{brief.raw_extraction.scopeOfWork.studyType}</p>
                        </div>
                      )}
                      {brief.raw_extraction.scopeOfWork.dataCollectionMode && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Data Collection:</p>
                          <p className="font-medium text-gray-900 dark:text-white">{brief.raw_extraction.scopeOfWork.dataCollectionMode}</p>
                        </div>
                      )}
                      {brief.raw_extraction.scopeOfWork.geographicCoverage && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Geographic Coverage:</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {Array.isArray(brief.raw_extraction.scopeOfWork.geographicCoverage)
                              ? brief.raw_extraction.scopeOfWork.geographicCoverage.join(', ')
                              : brief.raw_extraction.scopeOfWork.geographicCoverage}
                          </p>
                        </div>
                      )}
                      {brief.raw_extraction.scopeOfWork.methodologyDetails && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Methodology:</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{brief.raw_extraction.scopeOfWork.methodologyDetails}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Target Audience */}
                {brief.raw_extraction.targetAudience && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Target Audience</h4>
                    <div className="space-y-2 text-sm">
                      {brief.raw_extraction.targetAudience.primaryRespondents && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Primary Respondents:</p>
                          <p className="text-gray-900 dark:text-white">{brief.raw_extraction.targetAudience.primaryRespondents}</p>
                        </div>
                      )}
                      {brief.raw_extraction.targetAudience.minimumExperience && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Minimum Experience:</p>
                          <p className="text-gray-900 dark:text-white">{brief.raw_extraction.targetAudience.minimumExperience}</p>
                        </div>
                      )}
                      {brief.raw_extraction.targetAudience.selectionCriteria && Array.isArray(brief.raw_extraction.targetAudience.selectionCriteria) && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Selection Criteria:</p>
                          <ul className="space-y-1 ml-4">
                            {brief.raw_extraction.targetAudience.selectionCriteria.map((criteria: any, idx: number) => (
                              <li key={idx} className="text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                <span className="text-primary">•</span>
                                {typeof criteria === 'object' ? JSON.stringify(criteria) : String(criteria)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sample Specifications */}
                {brief.raw_extraction.sampleSpecifications && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Sample Specifications</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      {brief.raw_extraction.sampleSpecifications.totalSampleSize && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Sample Size:</p>
                          <p className="font-medium text-gray-900 dark:text-white">{brief.raw_extraction.sampleSpecifications.totalSampleSize}</p>
                        </div>
                      )}
                      {brief.raw_extraction.sampleSpecifications.segmentation && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Segmentation:</p>
                          <p className="font-medium text-gray-900 dark:text-white">{brief.raw_extraction.sampleSpecifications.segmentation}</p>
                        </div>
                      )}
                      {brief.raw_extraction.sampleSpecifications.quotas && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quotas:</p>
                          <p className="text-gray-700 dark:text-gray-300">{brief.raw_extraction.sampleSpecifications.quotas}</p>
                        </div>
                      )}
                    </div>
                    {brief.raw_extraction.sampleSpecifications.sampleBreakdown && typeof brief.raw_extraction.sampleSpecifications.sampleBreakdown === 'object' && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Sample Breakdown:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {Object.entries(brief.raw_extraction.sampleSpecifications.sampleBreakdown).map(([key, value]) => (
                            <div key={key} className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                              <p className="font-bold text-gray-900 dark:text-white mb-1 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </p>
                              <p className="text-primary font-medium">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Key Deliverables */}
                {brief.raw_extraction.keyDeliverables && Array.isArray(brief.raw_extraction.keyDeliverables) && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Key Deliverables</h4>
                    <ul className="grid grid-cols-2 gap-2">
                      {brief.raw_extraction.keyDeliverables.map((deliverable: any, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          {typeof deliverable === 'object' ? JSON.stringify(deliverable) : String(deliverable)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Timeline & Milestones */}
                {brief.raw_extraction.timelineAndMilestones && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Timeline & Milestones</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {brief.raw_extraction.timelineAndMilestones.projectDuration && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Project Duration:</p>
                          <p className="font-medium text-gray-900 dark:text-white">{brief.raw_extraction.timelineAndMilestones.projectDuration}</p>
                        </div>
                      )}
                      {brief.raw_extraction.timelineAndMilestones.proposalDueDate && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Proposal Due:</p>
                          <p className="font-medium text-gray-900 dark:text-white">{brief.raw_extraction.timelineAndMilestones.proposalDueDate}</p>
                        </div>
                      )}
                      {brief.raw_extraction.timelineAndMilestones.finalReportDate && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Final Report:</p>
                          <p className="font-medium text-gray-900 dark:text-white">{brief.raw_extraction.timelineAndMilestones.finalReportDate}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Budget & Pricing */}
                {brief.raw_extraction.budgetAndPricing && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Budget & Pricing</h4>
                    <div className="space-y-2 text-sm">
                      {brief.raw_extraction.budgetAndPricing.totalBudget && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Budget:</p>
                          <p className="font-medium text-gray-900 dark:text-white">{brief.raw_extraction.budgetAndPricing.totalBudget}</p>
                        </div>
                      )}
                      {brief.raw_extraction.budgetAndPricing.pricingStructureExpected && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pricing Structure:</p>
                          <p className="text-gray-700 dark:text-gray-300">{brief.raw_extraction.budgetAndPricing.pricingStructureExpected}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Regulatory Compliance */}
                {brief.raw_extraction.regulatoryCompliance && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Regulatory Compliance</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {brief.raw_extraction.regulatoryCompliance.gdprRequired !== undefined && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">GDPR Required:</p>
                          <p className="font-medium text-gray-900 dark:text-white">{brief.raw_extraction.regulatoryCompliance.gdprRequired ? 'Yes' : 'No'}</p>
                        </div>
                      )}
                      {brief.raw_extraction.regulatoryCompliance.hipaaRequired !== undefined && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">HIPAA Required:</p>
                          <p className="font-medium text-gray-900 dark:text-white">{brief.raw_extraction.regulatoryCompliance.hipaaRequired ? 'Yes' : 'No'}</p>
                        </div>
                      )}
                      {brief.raw_extraction.regulatoryCompliance.otherCompliance && Array.isArray(brief.raw_extraction.regulatoryCompliance.otherCompliance) && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Other Compliance:</p>
                          <ul className="space-y-1">
                            {brief.raw_extraction.regulatoryCompliance.otherCompliance.map((comp: any, idx: number) => (
                              <li key={idx} className="text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                <span className="text-primary">•</span>
                                {typeof comp === 'object' ? JSON.stringify(comp) : String(comp)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Add Assumptions as Additional Requirements (when skip was used) */}
                {showingAssumptionsOnly && gapAnalysis && (() => {
                  const assumptions = gapAnalysis.raw_gap_analysis?.assumptionsMade || gapAnalysis.assumptions_made || [];
                  return assumptions.length > 0 && (
                    <>
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border-l-4 border-orange-500 mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-500" />
                          <p className="font-bold text-orange-900 dark:text-orange-300 text-sm">Note:</p>
                        </div>
                        <p className="text-xs text-orange-800 dark:text-orange-400">
                          The following assumptions have been made based on gap analysis. These will be used to proceed with Research Design.
                        </p>
                      </div>

                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mt-3">
                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Additional Requirements & Assumptions</h4>
                        <div className="space-y-3">
                          {assumptions.map((assumption: any, idx: number) => (
                            <div key={idx} className="border-l-2 border-orange-400 pl-4 py-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                <span className="text-orange-600 dark:text-orange-400 font-bold">A{idx + 1}.</span>{' '}
                                {typeof assumption === 'string' ? assumption : assumption.assumption || assumption.requirement || JSON.stringify(assumption)}
                              </p>
                              {typeof assumption === 'object' && (assumption.basedOn || assumption.rationale) && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 ml-6 italic">
                                  → Based on: {assumption.basedOn || assumption.rationale}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Overall Summary */}
          {!showingAssumptionsOnly && (
          <div className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3 mb-4">
              <BarChart2 className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Response Summary</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-500">{questionsAnsweredCount}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold mt-1">Questions Answered</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-500">{assumptionsConfirmedCount}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold mt-1">Assumptions Confirmed</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-500">{assumptionsCorrectedCount}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold mt-1">Assumptions Corrected</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-500">{completenessPercentage}%</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold mt-1">Complete</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-500">{criticalGapsRemaining}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold mt-1">Critical Gaps</div>
              </div>
            </div>

            {responses?.summary && (
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-4 rounded-lg">
                {responses.summary}
              </p>
            )}

            <div className="mt-4 flex items-center gap-2">
              {readyToProceed ? (
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-4 py-2 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Ready to proceed to Research Design</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-4 py-2 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">Additional clarification recommended</span>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Question Responses */}
          {!showingAssumptionsOnly && questionResponses.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Question Responses ({questionResponses.length})
              </h3>
              <div className="space-y-4">
                {questionResponses.map((response: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {response.questionId || `Q${idx + 1}`}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {response.question}
                          </p>
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-3">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Client Answer:</p>
                            <p className="text-base text-gray-900 dark:text-white">{response.answer}</p>
                          </div>
                          {response.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                              <strong>Note:</strong> {response.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${getConfidenceColor(response.confidence)}`}>
                          {response.confidence}
                        </span>
                        {response.followUpNeeded && (
                          <span className="px-2 py-1 text-xs font-bold rounded uppercase bg-orange-500 text-white">
                            Follow-up
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assumption Responses */}
          {!showingAssumptionsOnly && assumptionResponses.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Assumption Responses ({assumptionResponses.length})
              </h3>
              <div className="space-y-4">
                {assumptionResponses.map((response: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                            {response.assumptionId || `A${idx + 1}`}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {response.assumption}
                          </p>
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-3">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Client Response:</p>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-3 py-1 text-sm font-bold rounded-full ${
                                response.clientResponse === 'confirmed' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' :
                                response.clientResponse === 'corrected' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400' :
                                response.clientResponse === 'rejected' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                                'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                              }`}>
                                {response.clientResponse.toUpperCase()}
                              </span>
                            </div>
                            {response.correctedValue && (
                              <div className="mt-2">
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Corrected Information:</p>
                                <p className="text-base text-gray-900 dark:text-white">{response.correctedValue}</p>
                              </div>
                            )}
                          </div>
                          {response.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                              <strong>Note:</strong> {response.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
