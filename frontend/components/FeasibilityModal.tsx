'use client';

import { X, Users, CheckCircle, AlertCircle, AlertTriangle, TrendingUp, MapPin, Target, Download, Save } from 'lucide-react';
import { useState } from 'react';
import jsPDF from 'jspdf';

interface FeasibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  feasibility: any;
  rfpTitle: string;
  opportunityId?: string;
}

export default function FeasibilityModal({ isOpen, onClose, feasibility, rfpTitle, opportunityId }: FeasibilityModalProps) {
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen || !feasibility) return null;

  const formatFeasibilityAsText = () => {
    let text = `HCP FEASIBILITY ASSESSMENT\n`;
    text += `RFP: ${rfpTitle}\n`;
    text += `Generated: ${new Date().toLocaleDateString()}\n`;
    text += `═══════════════════════════════════════════════════════\n\n`;

    if (feasibility.overallFeasibility) {
      text += `OVERALL ASSESSMENT\n`;
      text += `─────────────────────────────────────────────────────\n`;
      text += `Risk Level: ${feasibility.overallFeasibility.riskLevel?.toUpperCase()}\n`;
      if (feasibility.overallFeasibility.summary) text += `Summary: ${feasibility.overallFeasibility.summary}\n`;
      if (feasibility.overallFeasibility.recommendation) text += `Recommendation: ${feasibility.overallFeasibility.recommendation}\n`;
      text += `\n`;
    }

    if (feasibility.matchAnalysis) {
      text += `DATABASE MATCH SUMMARY\n`;
      text += `─────────────────────────────────────────────────────\n`;
      if (feasibility.matchAnalysis.totalHCPsFound !== undefined) {
        text += `Total HCPs Found: ${feasibility.matchAnalysis.totalHCPsFound}\n`;
      }
      if (feasibility.matchAnalysis.matchQualityScore !== undefined) {
        text += `Match Quality Score: ${feasibility.matchAnalysis.matchQualityScore}/100\n`;
      }
      text += `\n`;
    }

    if (feasibility.geographicFeasibility && feasibility.geographicFeasibility.length > 0) {
      text += `GEOGRAPHIC FEASIBILITY\n`;
      text += `─────────────────────────────────────────────────────\n`;
      feasibility.geographicFeasibility.forEach((geo: any) => {
        text += `\n${geo.geography || geo.market}:\n`;
        text += `  Risk Level: ${geo.riskLevel}\n`;
        text += `  Required Sample: ${geo.requiredSample || geo.sampleNeeded}\n`;
        text += `  Available HCPs: ${geo.qualifiedHCPs || geo.availableHCPs}\n`;
        text += `  Recruitment Ratio: ${geo.recruitmentRatio || geo.ratio}x\n`;
        if (geo.recommendation) text += `  Recommendation: ${geo.recommendation}\n`;
      });
      text += `\n`;
    }

    if (feasibility.riskFactors && feasibility.riskFactors.length > 0) {
      text += `RECRUITMENT RISK FACTORS (${feasibility.riskFactors.length})\n`;
      text += `─────────────────────────────────────────────────────\n`;
      feasibility.riskFactors.forEach((risk: any, idx: number) => {
        if (typeof risk === 'string') {
          text += `${idx + 1}. ${risk}\n`;
        } else {
          text += `${idx + 1}. ${risk.risk || risk.factor}\n`;
          if (risk.mitigation) text += `   Mitigation: ${risk.mitigation}\n`;
        }
      });
      text += `\n`;
    }

    if (feasibility.alternativeStrategies && feasibility.alternativeStrategies.length > 0) {
      text += `ALTERNATIVE STRATEGIES\n`;
      text += `─────────────────────────────────────────────────────\n`;
      feasibility.alternativeStrategies.forEach((strategy: any, idx: number) => {
        if (typeof strategy === 'string') {
          text += `${idx + 1}. ${strategy}\n`;
        } else {
          text += `${idx + 1}. ${strategy.strategy}\n`;
          if (strategy.description) text += `   ${strategy.description}\n`;
        }
      });
      text += `\n`;
    }

    if (feasibility.topCandidates && feasibility.topCandidates.length > 0) {
      text += `TOP HCP CANDIDATES (${Math.min(feasibility.topCandidates.length, 10)})\n`;
      text += `─────────────────────────────────────────────────────\n`;
      feasibility.topCandidates.slice(0, 10).forEach((candidate: any, idx: number) => {
        text += `\n${idx + 1}. ${candidate.name || `HCP ${idx + 1}`}\n`;
        text += `   Specialty: ${candidate.specialty}\n`;
        if (candidate.geography) text += `   Location: ${candidate.geography}\n`;
        if (candidate.practiceType) text += `   Practice: ${candidate.practiceType}\n`;
        if (candidate.yearsInPractice) text += `   Experience: ${candidate.yearsInPractice} years\n`;
        if (candidate.matchScore) text += `   Match Score: ${candidate.matchScore}/100\n`;
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
      const content = formatFeasibilityAsText();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunityId}/documents/feasibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          filename: `HCP_Feasibility_${rfpTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.txt`,
        }),
      });
      if (!response.ok) throw new Error('Failed to save feasibility assessment');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving feasibility assessment:', error);
      alert('Failed to save feasibility assessment. Please try again.');
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
      doc.text('HCP Feasibility Assessment', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`RFP: ${rfpTitle}`, margin, yPos);
      yPos += 6;
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
      yPos += 15;

      // Overall Assessment
      if (feasibility.overallFeasibility) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Overall Assessment', margin, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Risk Level: ${feasibility.overallFeasibility.riskLevel?.toUpperCase()}`, margin, yPos);
        yPos += 6;
        if (feasibility.overallFeasibility.summary) {
          const summaryLines = doc.splitTextToSize(feasibility.overallFeasibility.summary, pageWidth - 2 * margin);
          doc.text(summaryLines, margin, yPos);
          yPos += summaryLines.length * 5 + 5;
        }
        yPos += 5;
      }

      // Match Analysis
      if (feasibility.matchAnalysis) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Database Match Summary', margin, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (feasibility.matchAnalysis.totalHCPsFound !== undefined) {
          doc.text(`Total HCPs Found: ${feasibility.matchAnalysis.totalHCPsFound}`, margin, yPos);
          yPos += 6;
        }
        if (feasibility.matchAnalysis.matchQualityScore !== undefined) {
          doc.text(`Match Quality: ${feasibility.matchAnalysis.matchQualityScore}/100`, margin, yPos);
          yPos += 10;
        }
      }

      // Geographic Feasibility
      if (feasibility.geographicFeasibility && feasibility.geographicFeasibility.length > 0) {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Geographic Feasibility', margin, yPos);
        yPos += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        feasibility.geographicFeasibility.forEach((geo: any) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${geo.geography || geo.market}: ${geo.riskLevel} (Required: ${geo.requiredSample || geo.sampleNeeded}, Available: ${geo.qualifiedHCPs || geo.availableHCPs})`, margin, yPos);
          yPos += 6;
        });
        yPos += 5;
      }

      doc.save(`HCP_Feasibility_${rfpTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to download feasibility assessment. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'green':
      case 'low':
        return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400';
      case 'yellow':
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400';
      case 'red':
      case 'high':
        return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'green':
      case 'low':
        return <CheckCircle className="w-4 h-4" />;
      case 'yellow':
      case 'medium':
        return <AlertTriangle className="w-4 h-4" />;
      case 'red':
      case 'high':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm py-4 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-500/5 to-pink-500/10 dark:from-purple-500/10 dark:to-pink-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">HCP Feasibility Assessment</h2>
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
              className="flex items-center justify-center gap-2 w-40 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
          {/* Overall Feasibility */}
          {feasibility.overallFeasibility && (
            <div className={`rounded-xl p-6 border-2 ${
              feasibility.overallFeasibility.riskLevel?.toLowerCase() === 'green' || feasibility.overallFeasibility.riskLevel?.toLowerCase() === 'low'
                ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-400 dark:border-emerald-700'
                : feasibility.overallFeasibility.riskLevel?.toLowerCase() === 'yellow' || feasibility.overallFeasibility.riskLevel?.toLowerCase() === 'medium'
                ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-400 dark:border-yellow-700'
                : 'bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-400 dark:border-red-700'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Overall Assessment</h3>
                <span className={`px-3 py-1 text-sm font-bold rounded-full ${getRiskColor(feasibility.overallFeasibility.riskLevel)}`}>
                  {feasibility.overallFeasibility.riskLevel?.toUpperCase()}
                </span>
              </div>
              {feasibility.overallFeasibility.summary && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{feasibility.overallFeasibility.summary}</p>
              )}
              {feasibility.overallFeasibility.recommendation && (
                <p className="text-sm font-medium text-gray-900 dark:text-white">{feasibility.overallFeasibility.recommendation}</p>
              )}
            </div>
          )}

          {/* Match Analysis */}
          {feasibility.matchAnalysis && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                Database Match Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {feasibility.matchAnalysis.totalHCPsFound !== undefined && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-500">{feasibility.matchAnalysis.totalHCPsFound}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold mt-1">Total HCPs Found</div>
                  </div>
                )}
                {feasibility.matchAnalysis.matchQualityScore !== undefined && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-500">{feasibility.matchAnalysis.matchQualityScore}/100</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold mt-1">Match Quality</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Geographic Feasibility */}
          {feasibility.geographicFeasibility && feasibility.geographicFeasibility.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                Geographic Feasibility
              </h3>
              <div className="space-y-3">
                {feasibility.geographicFeasibility.map((geo: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-gray-900 dark:text-white">{geo.geography || geo.market}</h4>
                      <div className="flex items-center gap-2">
                        {getRiskIcon(geo.riskLevel)}
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${getRiskColor(geo.riskLevel)}`}>
                          {geo.riskLevel}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Required</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{geo.requiredSample || geo.sampleNeeded}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Available</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{geo.qualifiedHCPs || geo.availableHCPs}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Ratio</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{geo.recruitmentRatio || geo.ratio}x</p>
                      </div>
                    </div>
                    {geo.recommendation && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 italic">{geo.recommendation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Factors */}
          {feasibility.riskFactors && feasibility.riskFactors.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                Recruitment Risk Factors ({feasibility.riskFactors.length})
              </h3>
              <div className="space-y-2">
                {feasibility.riskFactors.map((risk: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800"
                  >
                    <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      {typeof risk === 'string' ? (
                        <p className="text-sm text-gray-700 dark:text-gray-300">{risk}</p>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{risk.risk || risk.factor}</p>
                          {risk.mitigation && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              <strong>Mitigation:</strong> {risk.mitigation}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alternative Strategies */}
          {feasibility.alternativeStrategies && feasibility.alternativeStrategies.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                Alternative Strategies
              </h3>
              <div className="grid gap-3">
                {feasibility.alternativeStrategies.map((strategy: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800"
                  >
                    {typeof strategy === 'string' ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300">{strategy}</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{strategy.strategy}</p>
                        {strategy.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">{strategy.description}</p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Candidate Profiles */}
          {feasibility.topCandidates && feasibility.topCandidates.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Top HCP Candidates ({feasibility.topCandidates.length})
              </h3>
              <div className="grid gap-3">
                {feasibility.topCandidates.slice(0, 10).map((candidate: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">{candidate.name || `HCP ${idx + 1}`}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{candidate.specialty}</p>
                      </div>
                      {candidate.matchScore && (
                        <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400">
                          {candidate.matchScore}/100
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {candidate.geography && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Location:</span>
                          <span className="ml-2 text-gray-900 dark:text-white font-medium">{candidate.geography}</span>
                        </div>
                      )}
                      {candidate.practiceType && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Practice:</span>
                          <span className="ml-2 text-gray-900 dark:text-white font-medium">{candidate.practiceType}</span>
                        </div>
                      )}
                      {candidate.yearsInPractice && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Experience:</span>
                          <span className="ml-2 text-gray-900 dark:text-white font-medium">{candidate.yearsInPractice}y</span>
                        </div>
                      )}
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
