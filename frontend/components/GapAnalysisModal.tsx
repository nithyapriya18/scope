'use client';

import { X, AlertTriangle, CheckCircle, Info, BarChart2, Download, Save } from 'lucide-react';
import { useState } from 'react';
import jsPDF from 'jspdf';

interface GapAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  gapAnalysis: any;
  rfpTitle: string;
  opportunityId?: string;
}

// Strip "sectionN_" prefix and format as readable label
function formatSection(section: string): string {
  if (!section) return '';
  return formatFieldName(section.replace(/^section\d+_/, ''));
}

// Helper function to convert snake_case/camelCase to Title Case
function formatFieldName(fieldName: string): string {
  if (!fieldName) return '';

  // Split camelCase into words first (e.g. totalSize → total Size)
  const decamel = fieldName.replace(/([a-z])([A-Z])/g, '$1_$2');

  // Replace underscores with spaces and split into words
  const words = decamel.split('_').map(word => {
    // Handle common acronyms
    const acronyms: { [key: string]: string } = {
      'sla': 'SLA',
      'slas': 'SLAs',
      'kpi': 'KPI',
      'kpis': 'KPIs',
      'api': 'API',
      'apis': 'APIs',
      'ui': 'UI',
      'ux': 'UX',
      'crm': 'CRM',
      'erp': 'ERP',
      'roi': 'ROI',
      'rfp': 'RFP',
      'hcp': 'HCP',
      'hcps': 'HCPs',
      'gdpr': 'GDPR',
      'ip': 'IP',
      'wbs': 'WBS',
      'it': 'IT',
    };

    const lowerWord = word.toLowerCase();
    if (acronyms[lowerWord]) {
      return acronyms[lowerWord];
    }

    // Capitalize first letter of each word
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return words.join(' ');
}

export default function GapAnalysisModal({ isOpen, onClose, gapAnalysis, rfpTitle, opportunityId }: GapAnalysisModalProps) {
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen || !gapAnalysis) return null;

  const llmData: any = gapAnalysis.llm_analysis || {};
  const missingFields = gapAnalysis.missing_fields || llmData.criticalGaps || [];
  const ambiguousRequirements = gapAnalysis.ambiguous_requirements || llmData.ambiguousRequirements || [];
  const conflictingInfo = gapAnalysis.conflicting_info || llmData.conflicts || [];
  const defaultAssumptions: any[] = llmData.defaultAssumptions || [];
  // completenessScore from AI is 0-100 integer; overall_completeness (old) was 0-1 fraction
  const rawScore = llmData.completenessScore ?? (gapAnalysis.overall_completeness != null ? gapAnalysis.overall_completeness * 100 : null) ?? 0;
  const criticalGapsCount = missingFields.length;
  const highPriorityGapsCount = (llmData.helpfulGaps || []).length;

  const completenessPercentage = Math.round(rawScore);
  const completenessColor = completenessPercentage >= 80 ? 'text-emerald-600' : completenessPercentage >= 60 ? 'text-yellow-600' : 'text-red-600';
  const completenessBarColor = completenessPercentage >= 80 ? 'bg-emerald-500' : completenessPercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  const formatGapAnalysisAsText = () => {
    let text = `GAP ANALYSIS REPORT\n`;
    text += `RFP: ${rfpTitle}\n`;
    text += `Generated: ${new Date().toLocaleDateString()}\n`;
    text += `═══════════════════════════════════════════════════════\n\n`;

    text += `OVERALL COMPLETENESS: ${completenessPercentage}%\n`;
    text += `Critical Gaps: ${criticalGapsCount}\n`;
    text += `High Priority Gaps: ${highPriorityGapsCount}\n\n`;

    if (missingFields.length > 0) {
      text += `═══════════════════════════════════════════════════════\n`;
      text += `MISSING CRITICAL FIELDS (${missingFields.length})\n`;
      text += `═══════════════════════════════════════════════════════\n\n`;
      missingFields.forEach((item: any, idx: number) => {
        text += `${idx + 1}. ${formatFieldName(item.field)}\n`;
        text += `   Priority: ${item.priority || item.severity || 'medium'}\n`;
        if (item.description) text += `   Description: ${item.description}\n`;
        if (item.impact) text += `   Impact: ${item.impact}\n`;
        text += `\n`;
      });
    }

    if (ambiguousRequirements.length > 0) {
      text += `═══════════════════════════════════════════════════════\n`;
      text += `AMBIGUOUS REQUIREMENTS (${ambiguousRequirements.length})\n`;
      text += `═══════════════════════════════════════════════════════\n\n`;
      ambiguousRequirements.forEach((item: any, idx: number) => {
        text += `${idx + 1}. ${item.requirement || 'Requirement'}\n`;
        text += `   Severity: ${item.severity || 'medium'}\n`;
        if (item.issue) text += `   Issue: ${item.issue}\n`;
        if (item.possibleInterpretations && Array.isArray(item.possibleInterpretations)) {
          text += `   Possible Interpretations:\n`;
          item.possibleInterpretations.forEach((interp: string) => {
            text += `      • ${interp}\n`;
          });
        }
        text += `\n`;
      });
    }

    if (conflictingInfo.length > 0) {
      text += `═══════════════════════════════════════════════════════\n`;
      text += `CONFLICTING INFORMATION (${conflictingInfo.length})\n`;
      text += `═══════════════════════════════════════════════════════\n\n`;
      conflictingInfo.forEach((item: any, idx: number) => {
        text += `${idx + 1}. ${item.area || item.conflict || 'Conflict'}\n`;
        if (item.conflict || item.details) text += `   ${item.conflict || item.details}\n`;
        if (item.statement1) text += `   Statement 1: ${item.statement1}\n`;
        if (item.statement2) text += `   Statement 2: ${item.statement2}\n`;
        text += `\n`;
      });
    }

    if (missingFields.length === 0 && ambiguousRequirements.length === 0 && conflictingInfo.length === 0) {
      text += `═══════════════════════════════════════════════════════\n`;
      text += `EXCELLENT! NO CRITICAL GAPS FOUND\n`;
      text += `═══════════════════════════════════════════════════════\n\n`;
      text += `The RFP appears to be comprehensive with all necessary information provided.\n`;
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
      const content = formatGapAnalysisAsText();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunityId}/documents/gap-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          filename: `Gap_Analysis_${rfpTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.txt`,
        }),
      });
      if (!response.ok) throw new Error('Failed to save gap analysis');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving gap analysis:', error);
      alert('Failed to save gap analysis. Please try again.');
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
      doc.text('Gap Analysis Report', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`RFP: ${rfpTitle}`, margin, yPos);
      yPos += 6;
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
      yPos += 15;

      // Overall Completeness
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Overall Completeness: ${completenessPercentage}%`, margin, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Critical Gaps: ${criticalGapsCount} | High Priority Gaps: ${highPriorityGapsCount}`, margin, yPos);
      yPos += 15;

      // Missing Fields
      if (missingFields.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Missing Critical Fields (${missingFields.length})`, margin, yPos);
        yPos += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        missingFields.forEach((item: any, idx: number) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${idx + 1}. ${formatFieldName(item.field)} [${item.priority || 'medium'}]`, margin, yPos);
          yPos += 5;
          if (item.description) {
            const descLines = doc.splitTextToSize(`   ${item.description}`, pageWidth - 2 * margin - 5);
            doc.text(descLines, margin + 5, yPos);
            yPos += descLines.length * 5;
          }
          yPos += 3;
        });
        yPos += 5;
      }

      // Ambiguous Requirements
      if (ambiguousRequirements.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Ambiguous Requirements (${ambiguousRequirements.length})`, margin, yPos);
        yPos += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        ambiguousRequirements.forEach((item: any, idx: number) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${idx + 1}. ${item.requirement || 'Requirement'}`, margin, yPos);
          yPos += 5;
          if (item.issue) {
            const issueLines = doc.splitTextToSize(`   ${item.issue}`, pageWidth - 2 * margin - 5);
            doc.text(issueLines, margin + 5, yPos);
            yPos += issueLines.length * 5;
          }
          yPos += 3;
        });
      }

      doc.save(`Gap_Analysis_${rfpTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to download gap analysis. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm py-4 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-500/5 to-orange-500/10 dark:from-orange-500/10 dark:to-orange-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-orange-600 dark:text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gap Analysis Results</h2>
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
              className="flex items-center justify-center gap-2 w-40 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
          {/* Completeness Score */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">RFP Information Completeness</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  How much of the required RFP information was provided • {criticalGapsCount} critical gaps • {highPriorityGapsCount} high priority gaps
                </p>
              </div>
              <div className={`text-4xl font-black ${completenessColor}`}>
                {completenessPercentage}%
              </div>
            </div>
            <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${completenessBarColor} rounded-full transition-all`}
                style={{ width: `${completenessPercentage}%` }}
              />
            </div>
          </div>

          {/* Missing Fields */}
          {missingFields.length > 0 && (
            <Section title="Missing Critical Fields" icon={AlertTriangle} iconColor="text-red-600">
              <div className="space-y-3">
                {missingFields.map((item: any, idx: number) => {
                  const priority = item.priority || item.severity || 'medium';
                  const fieldLabel = item.missingField || item.field || '';
                  const section = item.section || '';
                  const impact = item.reason || item.impact || '';
                  const defaultAssumption = item.defaultAssumption || '';

                  return (
                    <div
                      key={idx}
                      className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          {section && <p className="text-xs text-red-600 dark:text-red-400 mb-0.5">{formatSection(section)}</p>}
                          <h4 className="text-sm font-bold text-red-900 dark:text-red-300">{formatFieldName(fieldLabel)}</h4>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded uppercase shrink-0 ml-3 ${
                            priority === 'critical'
                              ? 'bg-red-600 text-white'
                              : priority === 'high'
                              ? 'bg-orange-500 text-white'
                              : 'bg-yellow-500 text-white'
                          }`}
                        >
                          {priority}
                        </span>
                      </div>
                      {impact && (
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          <strong>Reason:</strong> {impact}
                        </p>
                      )}
                      {defaultAssumption && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 italic">
                          <strong>Default assumption:</strong> {defaultAssumption}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Ambiguous Requirements */}
          {ambiguousRequirements.length > 0 && (
            <Section title="Ambiguous Requirements" icon={AlertTriangle} iconColor="text-yellow-600">
              <div className="space-y-3">
                {ambiguousRequirements.map((item: any, idx: number) => {
                  const fieldName = item.field || item.requirement || '';
                  const section = item.section || '';
                  const severity = item.severity || 'medium';
                  const ambiguity = item.ambiguity || item.issue || '';

                  return (
                    <div
                      key={idx}
                      className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          {section && <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-0.5">{formatSection(section)}</p>}
                          <h4 className="text-sm font-bold text-yellow-900 dark:text-yellow-300">{formatFieldName(fieldName)}</h4>
                        </div>
                        <span className="px-2 py-0.5 text-xs font-bold rounded uppercase bg-yellow-500 text-white shrink-0 ml-3">
                          {severity}
                        </span>
                      </div>
                      {ambiguity && <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1 mb-2">{ambiguity}</p>}
                      {item.possibleInterpretations && Array.isArray(item.possibleInterpretations) && item.possibleInterpretations.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-bold text-yellow-700 dark:text-yellow-300 mb-1">
                            Possible Interpretations:
                          </p>
                          <ul className="space-y-1 pl-4">
                            {item.possibleInterpretations.map((interp: string, i: number) => (
                              <li key={i} className="text-xs text-yellow-700 dark:text-yellow-300 list-disc">
                                {interp}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Conflicting Information */}
          {conflictingInfo.length > 0 && (
            <Section title="Conflicting Information" icon={AlertTriangle} iconColor="text-orange-600">
              <div className="space-y-3">
                {conflictingInfo.map((item: any, idx: number) => {
                  const title = item.field || item.conflict || item.area || 'Conflict';
                  const desc = item.clash || item.details || item.impact || '';
                  const val1 = item.value1 || item.statement1 || '';
                  const src1 = item.source1 || '';
                  const val2 = item.value2 || item.statement2 || '';
                  const src2 = item.source2 || '';
                  const resolution = item.resolution || '';

                  return (
                    <div
                      key={idx}
                      className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4"
                    >
                      <h4 className="text-sm font-bold text-orange-900 dark:text-orange-300 mb-1">{formatFieldName(title)}</h4>
                      {desc && <p className="text-xs text-orange-800 dark:text-orange-200 mb-2">{desc}</p>}
                      {(val1 || val2) && (
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <div className="bg-white dark:bg-gray-800 rounded p-3">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{src1 || 'Value 1'}</p>
                            <p className="text-xs text-gray-700 dark:text-gray-300">{val1}</p>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded p-3">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{src2 || 'Value 2'}</p>
                            <p className="text-xs text-gray-700 dark:text-gray-300">{val2}</p>
                          </div>
                        </div>
                      )}
                      {resolution && (
                        <p className="text-xs text-orange-700 dark:text-orange-300 mt-2 italic">Resolution: {resolution}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Default Assumptions */}
          {defaultAssumptions.length > 0 && (
            <Section title="Default Assumptions" icon={Info} iconColor="text-blue-600">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                PetaSight will apply these assumptions if no client response is received.
              </p>
              <div className="space-y-2">
                {defaultAssumptions.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase mr-2">
                          {item.category || 'general'}
                        </span>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {formatFieldName(item.field || '')}
                        </span>
                        <p className="text-sm text-blue-900 dark:text-blue-200 mt-1">{item.assumedValue}</p>
                        {item.rationale && (
                          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 italic">{item.rationale}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* No Gaps Found */}
          {missingFields.length === 0 && ambiguousRequirements.length === 0 && conflictingInfo.length === 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-8 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-600 dark:text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-300 mb-2">
                Excellent! No Critical Gaps Found
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                The RFP appears to be comprehensive with all necessary information provided.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  iconColor,
  children,
}: {
  title: string;
  icon: any;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}
