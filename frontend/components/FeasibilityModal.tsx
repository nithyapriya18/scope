'use client';

import { X, Users, CheckCircle, AlertCircle, AlertTriangle, MapPin, Target, Download, Save } from 'lucide-react';
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

  if (!isOpen) return null;

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
              disabled={saving || !opportunityId || !feasibility}
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
              disabled={downloading || !feasibility}
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
          {!feasibility && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
              <Users className="w-12 h-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">No feasibility data yet</p>
              <p className="text-sm mt-1">The feasibility assessment will appear here once the step completes.</p>
            </div>
          )}
          {/* Overall Feasibility */}
          {feasibility?.overallFeasibility && (
            <div className={`rounded-xl p-6 border-2 ${
              feasibility.overallFeasibility.riskLevel?.toLowerCase() === 'low'
                ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-400 dark:border-emerald-700'
                : feasibility.overallFeasibility.riskLevel?.toLowerCase() === 'medium'
                ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-400 dark:border-yellow-700'
                : 'bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-400 dark:border-red-700'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Overall Assessment</h3>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-sm font-bold rounded-full ${getRiskColor(feasibility.overallFeasibility.riskLevel)}`}>
                      {feasibility.overallFeasibility.riskLevel?.toUpperCase()} RISK
                    </span>
                    {feasibility.overallFeasibility.feasible !== undefined && (
                      <span className={`px-3 py-1 text-sm font-bold rounded-full ${feasibility.overallFeasibility.feasible ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'}`}>
                        {feasibility.overallFeasibility.feasible ? 'FEASIBLE' : 'NOT FEASIBLE'}
                      </span>
                    )}
                    {feasibility.overallFeasibility.estimatedFieldworkWeeks && (
                      <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
                        ~{feasibility.overallFeasibility.estimatedFieldworkWeeks}w fieldwork
                      </span>
                    )}
                  </div>
                </div>
                {feasibility.overallFeasibility.confidenceScore !== undefined && (
                  <div className="text-right">
                    <div className="text-2xl font-black text-gray-900 dark:text-white">{Math.round(feasibility.overallFeasibility.confidenceScore * 100)}%</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Confidence</div>
                  </div>
                )}
              </div>
              {feasibility.overallFeasibility.summary && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{feasibility.overallFeasibility.summary}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {feasibility.overallFeasibility.keyRisks && feasibility.overallFeasibility.keyRisks.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Key Risks</p>
                    <ul className="space-y-1">
                      {feasibility.overallFeasibility.keyRisks.map((r: string, i: number) => (
                        <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {feasibility.overallFeasibility.recommendations && feasibility.overallFeasibility.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Recommendations</p>
                    <ul className="space-y-1">
                      {feasibility.overallFeasibility.recommendations.map((r: string, i: number) => (
                        <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HCP Availability */}
          {Array.isArray(feasibility?.hcpAvailability) && feasibility.hcpAvailability.length > 0 && (() => {
            const segs = feasibility.hcpAvailability;
            const totalPanel = segs.reduce((s: number, e: any) => s + (e.panelSize || e.estimatedPoolSize || 0), 0);
            const totalActive = segs.reduce((s: number, e: any) => s + (e.activePool || 0), 0);
            const targetSample = segs[0]?.neededSample || 0;
            const specialties = [...new Set(segs.map((e: any) => e.specialty || e.segment?.split(' — ')[0]))].filter(Boolean);
            return (
              <div className="space-y-4">
                {/* Summary header */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-500" />
                    HCP Panel Coverage
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800 text-center">
                      <div className="text-2xl font-black text-purple-700 dark:text-purple-400">{totalPanel.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Total Panel</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800 text-center">
                      <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{totalActive.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Active Respondents</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 text-center">
                      <div className="text-2xl font-black text-blue-700 dark:text-blue-400">{targetSample}</div>
                      <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Target Sample</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-center">
                      <div className="text-2xl font-black text-slate-700 dark:text-slate-300">{segs.length}</div>
                      <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Segments</div>
                    </div>
                  </div>
                  {specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      <span className="text-xs text-gray-500 font-semibold uppercase self-center">Specialties:</span>
                      {specialties.map((sp: any, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-full">{sp}</span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Per-segment table */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">By Specialty & Market</h4>
                  {segs.map((seg: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">{seg.segment || `${seg.specialty} — ${seg.country}`}</h4>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${getRiskColor(seg.riskLevel)}`}>{seg.riskLevel}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-2">
                        <Stat label="Panel Size" value={(seg.panelSize || seg.estimatedPoolSize || 0).toLocaleString()} />
                        <Stat label="Active Pool" value={(seg.activePool || 0).toLocaleString()} />
                        <Stat label="Active Rate" value={`${Math.round((seg.activeRate || 0) * 100)}%`} />
                        <Stat label="Target Sample" value={seg.neededSample || '—'} />
                        <Stat label="Recruit Ratio" value={seg.recruitmentRatio ? `${seg.recruitmentRatio}x` : '—'} />
                      </div>
                      {seg.recruitmentWeeks && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">Est. recruitment time: <span className="font-semibold text-gray-700 dark:text-gray-300">{seg.recruitmentWeeks} weeks</span></div>
                      )}
                      {seg.notes && <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-1">{seg.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Geographic Feasibility */}
          {Array.isArray(feasibility?.geographicFeasibility) && feasibility.geographicFeasibility.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                Geographic Feasibility
              </h3>
              <div className="space-y-3">
                {(Array.isArray(feasibility.geographicFeasibility) ? feasibility.geographicFeasibility : []).map((geo: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-gray-900 dark:text-white">{geo.market || geo.geography}</h4>
                      <div className="flex items-center gap-2">
                        {geo.accessibility && <span className="text-xs text-gray-500 dark:text-gray-400">{geo.accessibility}</span>}
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${getRiskColor(geo.riskLevel)}`}>{geo.riskLevel}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
                      {geo.panelDepth && <Stat label="Panel Depth" value={geo.panelDepth.toLocaleString()} />}
                      {geo.recruitmentWeeks && <Stat label="Est. Weeks" value={`${geo.recruitmentWeeks}w`} />}
                    </div>
                    {geo.notes && <p className="text-xs text-gray-600 dark:text-gray-400 italic">{geo.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendor Assessment */}
          {Array.isArray(feasibility?.vendorAssessment) && feasibility.vendorAssessment.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                Vendor Assessment
              </h3>
              <div className="space-y-3">
                {(Array.isArray(feasibility.vendorAssessment) ? feasibility.vendorAssessment : []).map((v: any, idx: number) => (
                  <div key={idx} className={`rounded-xl p-4 border ${v.recommended ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 dark:text-white">{v.vendor}</h4>
                        {v.recommended && <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-500 text-white">RECOMMENDED</span>}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        {v.estimatedCPI && <span className="text-gray-600 dark:text-gray-400">CPI: <strong>{v.estimatedCPI}</strong></span>}
                        {v.estimatedWeeks && <span className="text-gray-600 dark:text-gray-400">~{v.estimatedWeeks}w</span>}
                      </div>
                    </div>
                    {v.coverage && <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{v.coverage}</p>}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {v.strengths && <div><p className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">Strengths</p><p className="text-gray-600 dark:text-gray-400">{v.strengths}</p></div>}
                      {v.weaknesses && <div><p className="font-bold text-orange-600 dark:text-orange-400 mb-1">Weaknesses</p><p className="text-gray-600 dark:text-gray-400">{v.weaknesses}</p></div>}
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
      <div className="text-base font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold">{label}</div>
    </div>
  );
}
