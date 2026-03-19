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

          {/* Applied changes banner */}
          {(() => {
            const clarInfo = brief?.raw_extraction?.clarifiedInformation;
            const isSkipped = clarInfo?.skipped || showingAssumptionsOnly;
            const summary = clarInfo?.summary || responses?.summary;
            return (
              <div className={`rounded-xl p-4 border ${isSkipped ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'}`}>
                <div className="flex items-start gap-3">
                  {isSkipped
                    ? <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                    : <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white mb-0.5">
                      {isSkipped ? 'Proceeding with PetaSight assumptions' : 'Brief updated with client responses'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {summary || (isSkipped
                        ? 'No client response received. All clarification questions are treated as assumed/confirmed by PetaSight.'
                        : 'Client responses have been parsed and incorporated into the requirements brief below.')}
                    </p>
                  </div>
                </div>
                {!isSkipped && (
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    {[
                      { label: 'Answered', value: questionsAnsweredCount, color: 'text-emerald-600 dark:text-emerald-400' },
                      { label: 'Unanswered', value: questionsUnansweredCount, color: 'text-orange-600 dark:text-orange-400' },
                      { label: 'Confirmed', value: assumptionsConfirmedCount, color: 'text-blue-600 dark:text-blue-400' },
                      { label: 'Corrected', value: assumptionsCorrectedCount, color: 'text-purple-600 dark:text-purple-400' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
                        <div className={`text-xl font-bold ${color}`}>{value}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold">{label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Updated Requirements Brief using section* keys */}
          {brief?.raw_extraction && (() => {
            const b = brief.raw_extraction;
            const s4 = b.section4_project_background_context || {};
            const s5 = b.section5_business_research_objectives || {};
            const s6 = b.section6_methodology_scope || {};
            const s7 = b.section7_markets_geography || {};
            const s8 = b.section8_target_audience_sample || {};
            const s9 = b.section9_timeline_key_dates || {};
            const s10 = b.section10_deliverables || {};
            const s11 = b.section11_budget_cost || {};
            const clarInfo = b.clarifiedInformation;

            const BriefSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</h4>
                </div>
                <div className="p-4 space-y-3">{children}</div>
              </div>
            );

            const Field = ({ label, value, fullWidth = false }: { label: string; value: any; fullWidth?: boolean }) => {
              if (!value) return null;
              const text = Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value);
              return (
                <div className={fullWidth ? 'col-span-2' : ''}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm text-gray-900 dark:text-white">{text}</p>
                </div>
              );
            };

            return (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Updated Requirements Brief</h3>

                {(s4.background || s4.productBrand || s4.problemStatement) && (
                  <BriefSection title="Project Background">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Brand / Product" value={s4.productBrand} />
                      <Field label="Lifecycle Stage" value={s4.lifecycleStage} />
                      <Field label="Background" value={s4.background} fullWidth />
                      <Field label="Problem Statement" value={s4.problemStatement} fullWidth />
                    </div>
                  </BriefSection>
                )}

                {(s5.primaryObjectives || s5.secondaryObjectives || s5.researchQuestions) && (
                  <BriefSection title="Business & Research Objectives">
                    <Field label="Primary Objectives" value={Array.isArray(s5.primaryObjectives) ? s5.primaryObjectives.join('\n') : s5.primaryObjectives} fullWidth />
                    <Field label="Secondary Objectives" value={Array.isArray(s5.secondaryObjectives) ? s5.secondaryObjectives.join('\n') : s5.secondaryObjectives} fullWidth />
                    <Field label="Research Questions" value={Array.isArray(s5.researchQuestions) ? s5.researchQuestions.join('\n') : s5.researchQuestions} fullWidth />
                  </BriefSection>
                )}

                {(s6.researchDesign || s6.dataCollection || s6.numberOfWaves) && (
                  <BriefSection title="Methodology & Scope">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Data Collection" value={s6.dataCollection} />
                      <Field label="Number of Waves" value={s6.numberOfWaves} />
                      <Field label="Research Design" value={s6.researchDesign} fullWidth />
                      <Field label="Supplier Discretion" value={s6.supplierDiscretion} fullWidth />
                    </div>
                  </BriefSection>
                )}

                {(s7.countries || s7.regions || s7.markets) && (
                  <BriefSection title="Markets & Geography">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Countries" value={s7.countries} />
                      <Field label="Regions" value={s7.regions} />
                      <Field label="Markets" value={s7.markets} fullWidth />
                    </div>
                  </BriefSection>
                )}

                {(s8.targetSampleSize || s8.targetAudience || s8.quotas) && (
                  <BriefSection title="Target Audience & Sample">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Target Sample Size" value={s8.targetSampleSize} />
                      <Field label="Target Audience" value={s8.targetAudience} />
                      <Field label="Quotas" value={s8.quotas} fullWidth />
                      <Field label="Special Requirements" value={s8.specialRequirements} fullWidth />
                    </div>
                  </BriefSection>
                )}

                {(s9.projectEndDate || s9.contractLength || s9.keyMilestones) && (
                  <BriefSection title="Timeline & Key Dates">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Project End Date" value={s9.projectEndDate} />
                      <Field label="Contract Length" value={s9.contractLength} />
                      <Field label="Key Milestones" value={s9.keyMilestones} fullWidth />
                    </div>
                  </BriefSection>
                )}

                {(s10.reports || s10.presentations || s10.dataAccess) && (
                  <BriefSection title="Deliverables">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Reports" value={s10.reports} />
                      <Field label="Presentations" value={s10.presentations} />
                      <Field label="Data Access" value={s10.dataAccess} fullWidth />
                    </div>
                  </BriefSection>
                )}

                {(s11.budget || s11.currency || s11.pricingNotes) && (
                  <BriefSection title="Budget & Cost">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Budget" value={s11.budget} />
                      <Field label="Currency" value={s11.currency} />
                      <Field label="Pricing Notes" value={s11.pricingNotes} fullWidth />
                    </div>
                  </BriefSection>
                )}

                {/* Clarifications applied section */}
                {clarInfo && clarInfo.responses && clarInfo.responses.length > 0 && (
                  <BriefSection title={clarInfo.skipped ? 'Assumptions Applied' : 'Clarifications & Responses'}>
                    <div className="space-y-2">
                      {clarInfo.responses.map((r: any, idx: number) => (
                        <div key={idx} className={`rounded-lg p-3 border-l-4 ${clarInfo.skipped ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/10' : r.clientResponse === 'corrected' ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/10' : 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10'}`}>
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">{r.questionId || `Q${idx + 1}`} — {r.question}</p>
                          {clarInfo.skipped
                            ? <p className="text-xs text-orange-700 dark:text-orange-400 italic">Assumed: {r.assumedValue || 'PetaSight standard assumption'}</p>
                            : r.type === 'assumption'
                              ? <p className="text-xs text-gray-700 dark:text-gray-300">Status: <span className="font-bold">{r.clientResponse?.toUpperCase()}</span>{r.correctedValue ? ` → ${r.correctedValue}` : ''}</p>
                              : <p className="text-xs text-gray-700 dark:text-gray-300">{r.answer}</p>
                          }
                        </div>
                      ))}
                    </div>
                  </BriefSection>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
