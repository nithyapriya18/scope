'use client';

import { X, Download, Save, FileText, Target, Users, MapPin, Calendar, DollarSign, CheckCircle, Shield, Info, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
// @ts-ignore - jspdf-autotable types not available
import 'jspdf-autotable';

interface BriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  brief: any;
  opportunityId: string;
  rfpTitle: string;
  clientName?: string;
}

export default function BriefModal({ isOpen, onClose, brief, opportunityId, rfpTitle, clientName }: BriefModalProps) {
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  // Early return AFTER all hooks
  if (!isOpen || !brief) return null;

  const briefData = brief.raw_extraction || {};

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save brief document to backend
      const content = formatBriefAsText(briefData, rfpTitle);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunityId}/documents/brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          filename: `Brief_${rfpTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.txt`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save brief');
      }

      setLastSaveTime(new Date());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save brief to documents');
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

      const fieldLabels: Record<string, string> = {
        issuedBy: 'Issued By',
        contactPerson: 'Contact Person',
        contactEmail: 'Contact Email',
        contactPhone: 'Contact Phone',
        submissionDeadline: 'Submission Deadline',
        budgetRange: 'Budget Range',
        oneLinerSummary: 'Summary',
        primaryAudience: 'Primary Audience',
        selectionCriteria: 'Selection Criteria',
        practiceSettings: 'Practice Settings',
        minimumExperience: 'Minimum Experience',
        minimumPatientVolume: 'Minimum Patient Volume',
        exclusionCriteria: 'Exclusion Criteria',
        geographicDistribution: 'Geographic Distribution',
        totalSampleSize: 'Total Sample Size',
        segmentation: 'Segmentation',
        quotas: 'Quotas',
        projectDuration: 'Project Duration',
        proposalDueDate: 'Proposal Due Date',
        kickoffDate: 'Kickoff Date',
        fieldworkWindow: 'Fieldwork Window',
        draftReportDate: 'Draft Report Date',
        finalReportDate: 'Final Report Date',
        keyMilestones: 'Key Milestones'
      };

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
      doc.text('RFP Requirements Brief', pageWidth / 2, 80, { align: 'center' });
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const titleLines = doc.splitTextToSize(rfpTitle, pageWidth - 40);
      let titleY = 100;
      titleLines.forEach((line: string) => {
        doc.text(line, pageWidth / 2, titleY, { align: 'center' });
        titleY += 6;
      });
      if (clientName) {
        doc.setFontSize(11);
        doc.text(`Prepared for: ${clientName}`, pageWidth / 2, titleY + 10, { align: 'center' });
      }
      doc.setTextColor(156, 163, 175);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, pageHeight - 30, { align: 'center' });

      const addSectionHeader = (title: string) => {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFillColor(253, 242, 248);
        doc.rect(15, yPos, pageWidth - 30, 10, 'F');
        doc.setTextColor(218, 54, 92);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 20, yPos + 7);
        yPos += 15;
      };

      const addField = (label: string, value: any) => {
        if (!value || value === 'Not specified') return;
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(label.toUpperCase(), 20, yPos);
        yPos += 5;
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const valueText = String(value);
        const lines = doc.splitTextToSize(valueText, pageWidth - 40);
        lines.forEach((line: string) => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 20, yPos);
          yPos += 5;
        });
        yPos += 3;
      };

      const addBulletList = (items: any[]) => {
        items.forEach((item: any) => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          const itemText = String(item);
          const lines = doc.splitTextToSize(itemText, pageWidth - 50);
          lines.forEach((line: string, idx: number) => {
            if (yPos > pageHeight - 20) {
              doc.addPage();
              yPos = 20;
            }
            doc.setTextColor(17, 24, 39);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(idx === 0 ? `• ${line}` : `  ${line}`, 25, yPos);
            yPos += 5;
          });
          yPos += 2;
        });
      };

      // Content Pages
      doc.addPage();
      yPos = 20;

      if (briefData.coverInformation) {
        addSectionHeader('Cover Information');
        Object.entries(briefData.coverInformation).forEach(([key, value]) => {
          const label = fieldLabels[key] || key;
          addField(label, value);
        });
        yPos += 5;
      }

      if (briefData.executiveSummary?.oneLinerSummary) {
        addSectionHeader('Executive Summary');
        const lines = doc.splitTextToSize(briefData.executiveSummary.oneLinerSummary, pageWidth - 40);
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        lines.forEach((line: string) => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 20, yPos);
          yPos += 5;
        });
        yPos += 8;
      }

      if (briefData.researchObjectives && Array.isArray(briefData.researchObjectives) && briefData.researchObjectives.length > 0) {
        addSectionHeader('Research Objectives');
        addBulletList(briefData.researchObjectives);
        yPos += 5;
      }

      if (briefData.targetAudience) {
        addSectionHeader('Target Audience');
        Object.entries(briefData.targetAudience).forEach(([key, value]) => {
          const label = fieldLabels[key] || key;
          if (Array.isArray(value)) {
            if (yPos > pageHeight - 20) {
              doc.addPage();
              yPos = 20;
            }
            doc.setTextColor(107, 114, 128);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(label.toUpperCase(), 20, yPos);
            yPos += 5;
            addBulletList(value);
          } else {
            addField(label, value);
          }
        });
        yPos += 5;
      }

      if (briefData.sampleSpecifications) {
        addSectionHeader('Sample Specifications');
        Object.entries(briefData.sampleSpecifications).forEach(([key, value]) => {
          if (key === 'sampleBreakdown' && typeof value === 'object') return;
          const label = fieldLabels[key] || key;
          addField(label, value);
        });
        yPos += 5;
      }

      if (briefData.keyDeliverables && Array.isArray(briefData.keyDeliverables) && briefData.keyDeliverables.length > 0) {
        addSectionHeader('Key Deliverables');
        addBulletList(briefData.keyDeliverables);
        yPos += 5;
      }

      if (briefData.timelineAndMilestones) {
        addSectionHeader('Timeline & Milestones');
        Object.entries(briefData.timelineAndMilestones).forEach(([key, value]) => {
          if (key === 'keyMilestones' && Array.isArray(value)) {
            if (yPos > pageHeight - 80) {
              doc.addPage();
              yPos = 20;
            }
            doc.setTextColor(107, 114, 128);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('KEY MILESTONES', 20, yPos);
            yPos += 7;

            // Create table for milestones
            const tableData = value.map((milestone: string) => [milestone]);
            // @ts-ignore
            doc.autoTable({
              startY: yPos,
              head: [['Milestone']],
              body: tableData,
              theme: 'grid',
              headStyles: { fillColor: [218, 54, 92], textColor: 255, fontStyle: 'bold', fontSize: 9 },
              bodyStyles: { fontSize: 9, cellPadding: 3 },
              alternateRowStyles: { fillColor: [253, 242, 248] },
              margin: { left: 20, right: 20 },
              tableWidth: pageWidth - 40,
            });
            // @ts-ignore
            yPos = doc.lastAutoTable.finalY + 8;
          } else {
            const label = fieldLabels[key] || key;
            addField(label, value);
          }
        });
      }

      // Add page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 2; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(156, 163, 175);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 10);
      }

      doc.save(`Brief_${rfpTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download brief as PDF');
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
          <span className="font-semibold">Brief saved to opportunity files successfully!</span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">RFP Requirements Brief</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{rfpTitle}</p>
              {lastSaveTime && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Last saved on: {lastSaveTime.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 w-40 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="flex items-center justify-center gap-2 w-40 px-4 py-2 bg-gray-700 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
          {/* Completeness Banner */}
          {briefData.overallCompletenessPercent !== undefined && (
            <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Brief Completeness</span>
                  <span className="text-xs font-bold text-primary">{briefData.overallCompletenessPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-secondary to-primary rounded-full" style={{ width: `${briefData.overallCompletenessPercent}%` }} />
                </div>
              </div>
              <div className="flex gap-3 text-xs shrink-0">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{briefData.completeSections} complete</span>
                <span className="text-red-500 dark:text-red-400 font-semibold">{briefData.missingSections} missing</span>
              </div>
            </div>
          )}

          {/* Section 1: Contact & Issuer */}
          {briefData.section1_contact_issuer && (
            <Section title="Contact & Issuer" icon={FileText}>
              <Grid>
                <Field label="Issuer Name" value={briefData.section1_contact_issuer.issuerName} />
                <Field label="Contact Person" value={briefData.section1_contact_issuer.contactPerson} />
                <Field label="Contact Title" value={briefData.section1_contact_issuer.contactTitle} />
                <Field label="Contact Email" value={briefData.section1_contact_issuer.contactEmail} />
                <Field label="Phone" value={briefData.section1_contact_issuer.phoneNumber} />
                <Field label="Submission Deadline" value={briefData.section1_contact_issuer.submissionDeadline || briefData.section1_contact_issuer.rfpIssueDate} />
              </Grid>
            </Section>
          )}

          {/* Section 2: Company */}
          {briefData.section2_company && (
            <Section title="Company" icon={FileText}>
              <Grid>
                <Field label="Company Name" value={briefData.section2_company.companyName} />
                <Field label="Division" value={briefData.section2_company.division} />
                <Field label="Description" value={briefData.section2_company.description} fullWidth />
              </Grid>
            </Section>
          )}

          {/* Section 4: Project Background */}
          {briefData.section4_project_background_context && (
            <Section title="Project Background & Context" icon={Info}>
              <div className="space-y-3">
                <Grid>
                  <Field label="Therapeutic Area" value={briefData.section4_project_background_context.therapeuticArea} />
                  <Field label="Disease Area" value={briefData.section4_project_background_context.diseaseArea} />
                  <Field label="Brand / Product" value={briefData.section4_project_background_context.productBrand} />
                  <Field label="Lifecycle Stage" value={briefData.section4_project_background_context.lifecycleStage} />
                </Grid>
                <Field label="Project Background" value={briefData.section4_project_background_context.background} fullWidth />
                <Field label="Problem Statement" value={briefData.section4_project_background_context.problemStatement} fullWidth />
              </div>
            </Section>
          )}

          {/* Section 5: Business & Research Objectives */}
          {briefData.section5_business_research_objectives && (
            <Section title="Business & Research Objectives" icon={Target}>
              {briefData.section5_business_research_objectives.businessObjectives?.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Business Objectives</h5>
                  <ul className="space-y-2">
                    {briefData.section5_business_research_objectives.businessObjectives.map((obj: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="w-5 h-5 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-primary">{idx + 1}</span>
                        </div>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {briefData.section5_business_research_objectives.researchObjectives?.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Research Objectives</h5>
                  <ul className="space-y-2">
                    {briefData.section5_business_research_objectives.researchObjectives.map((obj: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="w-5 h-5 rounded-full bg-secondary/10 dark:bg-secondary/20 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-secondary">{idx + 1}</span>
                        </div>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          )}

          {/* Section 6: Methodology & Scope */}
          {briefData.section6_methodology_scope && (
            <Section title="Methodology & Scope" icon={CheckCircle}>
              <Grid>
                <Field label="Primary Methodology" value={briefData.section6_methodology_scope.primaryMethodology} />
                <Field label="Study Subtype" value={briefData.section6_methodology_scope.studySubtype} />
                <Field label="Data Collection" value={briefData.section6_methodology_scope.dataCollection} />
                <Field label="Number of Waves" value={briefData.section6_methodology_scope.numberOfWaves} />
                <Field label="Research Design" value={briefData.section6_methodology_scope.researchDesign} fullWidth />
                <Field label="Supplier Discretion Items" value={briefData.section6_methodology_scope.supplierDiscretion} fullWidth />
              </Grid>
            </Section>
          )}

          {/* Section 7: Markets & Geography */}
          {briefData.section7_markets_geography && (
            <Section title="Markets & Geography" icon={MapPin}>
              <Grid>
                <Field
                  label="Markets"
                  value={Array.isArray(briefData.section7_markets_geography.markets)
                    ? briefData.section7_markets_geography.markets.join(', ')
                    : briefData.section7_markets_geography.markets}
                  fullWidth
                />
                <Field
                  label="Primary Markets"
                  value={Array.isArray(briefData.section7_markets_geography.primaryMarkets)
                    ? briefData.section7_markets_geography.primaryMarkets.join(', ')
                    : briefData.section7_markets_geography.primaryMarkets}
                  fullWidth
                />
                <Field label="Global Study" value={briefData.section7_markets_geography.globalStudy ? 'Yes' : 'No'} />
                <Field label="Number of Countries" value={briefData.section7_markets_geography.numberOfCountries} />
              </Grid>
            </Section>
          )}

          {/* Section 8: Target Audience & Sample */}
          {briefData.section8_target_audience_sample && (
            <Section title="Target Audience & Sample" icon={Users}>
              <div className="space-y-3">
                <Grid>
                  <Field label="Primary Target Audience" value={briefData.section8_target_audience_sample.primaryTargetAudience} />
                  <Field label="Target Sample Size" value={briefData.section8_target_audience_sample.targetSampleSize} />
                  <Field label="Audience Description" value={briefData.section8_target_audience_sample.audienceDescription} fullWidth />
                  <Field label="Quotas" value={briefData.section8_target_audience_sample.quotas} fullWidth />
                  <Field label="Special Requirements" value={briefData.section8_target_audience_sample.specialRequirements} fullWidth />
                </Grid>
              </div>
            </Section>
          )}

          {/* Section 9: Timeline & Key Dates */}
          {briefData.section9_timeline_key_dates && (
            <Section title="Timeline & Key Dates" icon={Calendar}>
              <Grid>
                <Field label="RFP Issue Date" value={briefData.section9_timeline_key_dates.rfpIssueDate} />
                <Field label="Proposal Deadline" value={briefData.section9_timeline_key_dates.proposalDeadline} />
                <Field label="Questions Deadline" value={briefData.section9_timeline_key_dates.questionsDeadline} />
                <Field label="Project Start Date" value={briefData.section9_timeline_key_dates.projectStartDate} />
                <Field label="Project End Date" value={briefData.section9_timeline_key_dates.projectEndDate} />
                <Field label="Contract Length" value={briefData.section9_timeline_key_dates.contractLength} />
                <Field label="Project Duration" value={briefData.section9_timeline_key_dates.projectDuration} fullWidth />
              </Grid>
            </Section>
          )}

          {/* Section 10: Deliverables */}
          {briefData.section10_deliverables && (
            <Section title="Deliverables" icon={FileText}>
              {briefData.section10_deliverables.deliverables?.length > 0 && (
                <ul className="grid grid-cols-2 gap-2 mb-3">
                  {briefData.section10_deliverables.deliverables.map((d: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />{d}
                    </li>
                  ))}
                </ul>
              )}
              <Grid>
                <Field label="Report Format" value={briefData.section10_deliverables.reportFormat} />
                <Field label="Presentations" value={briefData.section10_deliverables.presentations} />
                <Field label="Data Access" value={briefData.section10_deliverables.dataAccess} />
              </Grid>
            </Section>
          )}

          {/* Section 11: Budget & Cost */}
          {briefData.section11_budget_cost && (
            <Section title="Budget & Cost" icon={DollarSign}>
              <Grid>
                <Field label="Budget Range" value={briefData.section11_budget_cost.budgetRange} />
                <Field label="Currency" value={briefData.section11_budget_cost.currency} />
                <Field label="Costing Template" value={briefData.section11_budget_cost.costingTemplate} fullWidth />
              </Grid>
            </Section>
          )}

          {/* Section 12: Submission Requirements */}
          {briefData.section12_submission_requirements && (
            <Section title="Submission Requirements" icon={AlertCircle}>
              <Grid>
                <Field label="Format" value={briefData.section12_submission_requirements.format} />
                <Field label="Max Pages" value={briefData.section12_submission_requirements.maxPages} />
                <Field label="Submission Deadline" value={briefData.section12_submission_requirements.submissionDeadline} fullWidth />
                <Field label="Contact for Questions" value={briefData.section12_submission_requirements.contactForQuestions} fullWidth />
              </Grid>
            </Section>
          )}

          {/* Section 13: Evaluation Criteria */}
          {briefData.section13_evaluation_criteria && (
            <Section title="Evaluation Criteria" icon={Target}>
              {briefData.section13_evaluation_criteria.criteria?.length > 0 && (
                <ul className="space-y-2 mb-3">
                  {briefData.section13_evaluation_criteria.criteria.map((c: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <span className="text-primary shrink-0">•</span>{c}
                    </li>
                  ))}
                </ul>
              )}
              <Field label="Evaluation Process" value={briefData.section13_evaluation_criteria.evaluationProcess} fullWidth />
            </Section>
          )}

          {/* Section 3: Confidentiality */}
          {briefData.section3_confidentiality && (
            <Section title="Confidentiality" icon={Shield}>
              <Grid>
                <Field label="NDA Required" value={briefData.section3_confidentiality.nda_required ? 'Yes' : 'No'} />
                <Field label="Confidentiality Level" value={briefData.section3_confidentiality.confidentialityLevel} />
                <Field label="Terms" value={briefData.section3_confidentiality.terms} fullWidth />
              </Grid>
            </Section>
          )}

          {/* Old schema fallback: coverInformation */}
          {!briefData.section1_contact_issuer && briefData.coverInformation && (
            <Section title="Cover Information" icon={FileText}>
              <Grid>
                <Field label="Issued By" value={briefData.coverInformation.issuedBy} />
                <Field label="Contact Person" value={briefData.coverInformation.contactPerson} />
                <Field label="Contact Email" value={briefData.coverInformation.contactEmail} />
                <Field label="Contact Phone" value={briefData.coverInformation.contactPhone} />
                <Field label="Submission Deadline" value={briefData.coverInformation.submissionDeadline} />
                <Field label="Budget Range" value={briefData.coverInformation.budgetRange} />
              </Grid>
            </Section>
          )}

          {/* Executive Summary */}
          {briefData.executiveSummary && (
            <Section title="Executive Summary" icon={Target}>
              <div className="space-y-4">
                <Field label="One-Liner Summary" value={briefData.executiveSummary.oneLinerSummary} fullWidth />
                <Field label="Company Overview" value={briefData.executiveSummary.companyOverview} fullWidth />
                <Field label="Therapeutic Area Context" value={briefData.executiveSummary.therapeuticAreaContext} fullWidth />
                <Field label="Market Challenges" value={briefData.executiveSummary.marketChallenges} fullWidth />
                <Field label="Strategic Importance" value={briefData.executiveSummary.strategicImportance} fullWidth />
              </div>
            </Section>
          )}

          {/* Research Objectives */}
          {briefData.researchObjectives && Array.isArray(briefData.researchObjectives) && (
            <Section title="Research Objectives" icon={Target}>
              <ul className="space-y-2">
                {briefData.researchObjectives.map((obj: any, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">{idx + 1}</span>
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{typeof obj === 'object' ? JSON.stringify(obj) : String(obj)}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Scope of Work */}
          {briefData.scopeOfWork && (
            <Section title="Scope of Work" icon={CheckCircle}>
              <Grid>
                <Field label="Study Type" value={briefData.scopeOfWork.studyType} />
                <Field label="Data Collection Mode" value={briefData.scopeOfWork.dataCollectionMode} />
                <Field label="Interview Duration" value={briefData.scopeOfWork.interviewDuration} />
                <Field label="Survey Length" value={briefData.scopeOfWork.surveyLength} />
                <Field
                  label="Geographic Coverage"
                  value={Array.isArray(briefData.scopeOfWork.geographicCoverage)
                    ? briefData.scopeOfWork.geographicCoverage.join(', ')
                    : briefData.scopeOfWork.geographicCoverage}
                  fullWidth
                />
                <Field label="Methodology Details" value={briefData.scopeOfWork.methodologyDetails} fullWidth />
              </Grid>
            </Section>
          )}

          {/* Target Audience */}
          {briefData.targetAudience && (
            <Section title="Target Audience" icon={Users}>
              <Grid>
                <Field label="Primary Respondents" value={briefData.targetAudience.primaryRespondents} fullWidth />
                <Field label="Minimum Experience" value={briefData.targetAudience.minimumExperience} />
                <Field label="Minimum Patient Volume" value={briefData.targetAudience.minimumPatientVolume} />
                <Field label="Geographic Distribution" value={briefData.targetAudience.geographicDistribution} fullWidth />
              </Grid>
              {briefData.targetAudience.selectionCriteria && Array.isArray(briefData.targetAudience.selectionCriteria) && (
                <div className="mt-4">
                  <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Selection Criteria</h5>
                  <ul className="space-y-1">
                    {briefData.targetAudience.selectionCriteria.map((criteria: any, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {typeof criteria === 'object' ? JSON.stringify(criteria) : String(criteria)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          )}

          {/* Sample Specifications */}
          {briefData.sampleSpecifications && (
            <Section title="Sample Specifications" icon={Users}>
              <Grid>
                <Field label="Total Sample Size" value={briefData.sampleSpecifications.totalSampleSize} />
                <Field label="Segmentation" value={briefData.sampleSpecifications.segmentation} />
                <Field label="Quotas" value={briefData.sampleSpecifications.quotas} fullWidth />
              </Grid>
              {briefData.sampleSpecifications.sampleBreakdown && typeof briefData.sampleSpecifications.sampleBreakdown === 'object' && (
                <div className="mt-4">
                  <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Sample Breakdown</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(briefData.sampleSpecifications.sampleBreakdown).map(([key, value]) => {
                      const renderValue = () => {
                        if (typeof value === 'object' && value !== null) {
                          return (
                            <div className="space-y-1">
                              {Object.entries(value).map(([subKey, subValue]) => (
                                <div key={subKey} className="text-xs">
                                  <span className="font-medium text-gray-600 dark:text-gray-400">{subKey}:</span>{' '}
                                  <span className="text-gray-900 dark:text-white">{String(subValue)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        // Check if value contains semicolons or commas for splitting
                        const str = String(value);
                        if (str.includes(';') || (str.includes(',') && str.length > 50)) {
                          const parts = str.split(/[;,]/).map(s => s.trim()).filter(Boolean);
                          return (
                            <ul className="space-y-0.5">
                              {parts.map((part, idx) => (
                                <li key={idx} className="text-sm text-primary font-medium flex items-start gap-1">
                                  <span className="text-primary mt-1">•</span>
                                  <span className="flex-1">{part}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        }
                        return <div className="text-sm text-primary font-medium whitespace-pre-wrap">{str}</div>;
                      };

                      return (
                        <div key={key} className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-xs font-bold text-gray-900 dark:text-white mb-2 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          {renderValue()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Key Deliverables */}
          {briefData.keyDeliverables && Array.isArray(briefData.keyDeliverables) && (
            <Section title="Key Deliverables" icon={FileText}>
              <ul className="grid grid-cols-2 gap-2">
                {briefData.keyDeliverables.map((deliverable: any, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {typeof deliverable === 'object' ? JSON.stringify(deliverable) : String(deliverable)}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Timeline & Milestones */}
          {briefData.timelineAndMilestones && (
            <Section title="Timeline & Milestones" icon={Calendar}>
              <Grid>
                <Field label="Project Duration" value={briefData.timelineAndMilestones.projectDuration} />
                <Field label="Proposal Due Date" value={briefData.timelineAndMilestones.proposalDueDate} />
                <Field label="Kickoff Date" value={briefData.timelineAndMilestones.kickoffDate} />
                <Field label="Fieldwork Window" value={briefData.timelineAndMilestones.fieldworkWindow} />
                <Field label="Draft Report Date" value={briefData.timelineAndMilestones.draftReportDate} />
                <Field label="Final Report Date" value={briefData.timelineAndMilestones.finalReportDate} />
              </Grid>
              {briefData.timelineAndMilestones.keyMilestones && Array.isArray(briefData.timelineAndMilestones.keyMilestones) && (
                <div className="mt-4">
                  <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Key Milestones</h5>
                  <table className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden table-fixed">
                    <colgroup>
                      <col style={{ width: '50%' }} />
                      <col style={{ width: '30%' }} />
                      <col style={{ width: '20%' }} />
                    </colgroup>
                    <thead className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">Milestone</th>
                        <th className="text-center px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">Date</th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {briefData.timelineAndMilestones.keyMilestones.map((milestone: any, idx: number) => {
                        let description = '';
                        let dateStr = '';
                        let parsedDate: Date | null = null;

                        if (typeof milestone === 'object' && milestone !== null) {
                          description = milestone.milestone || milestone.description || milestone.name || JSON.stringify(milestone);
                          dateStr = milestone.date || milestone.dueDate || '-';
                          if (dateStr !== '-') {
                            parsedDate = new Date(dateStr);
                          }
                        } else {
                          let milestoneStr = String(milestone);
                          let timeStr = '';

                          // Extract time patterns (HH:MM AM/PM, HH:MM:SS AM/PM) before removing
                          const timeMatch = milestoneStr.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i);
                          if (timeMatch) {
                            timeStr = timeMatch[1];
                          }

                          // Try to extract date patterns: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.
                          const datePatterns = [
                            /(\d{2}[-\/]\d{2}[-\/]\d{4})/,  // DD-MM-YYYY or DD/MM/YYYY
                            /(\d{4}[-\/]\d{2}[-\/]\d{2})/,  // YYYY-MM-DD or YYYY/MM/DD
                            /(\d{2}\s+[A-Za-z]+\s+\d{4})/,  // DD Month YYYY
                          ];

                          let foundDate = '';
                          for (const pattern of datePatterns) {
                            const match = milestoneStr.match(pattern);
                            if (match) {
                              foundDate = match[1];
                              break;
                            }
                          }

                          if (foundDate) {
                            // Combine date and time if available
                            dateStr = timeStr ? `${foundDate} ${timeStr}` : foundDate;

                            // Parse the date
                            try {
                              // Handle DD-MM-YYYY format
                              if (foundDate.match(/^\d{2}[-\/]\d{2}[-\/]\d{4}$/)) {
                                const parts = foundDate.split(/[-\/]/);
                                parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                              } else {
                                parsedDate = new Date(foundDate);
                              }
                            } catch (e) {
                              parsedDate = null;
                            }

                            // Remove date and time from description
                            description = milestoneStr
                              .replace(foundDate, '')
                              .replace(/\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)/gi, '')
                              .replace(/^[:\s-]+|[:\s-]+$/g, '')
                              .trim();
                          } else {
                            description = milestoneStr;
                            dateStr = '-';
                          }
                        }

                        // Calculate days difference from previous milestone
                        let daysDiff = '-';
                        if (idx > 0 && parsedDate) {
                          const prevMilestone = briefData.timelineAndMilestones.keyMilestones[idx - 1];
                          let prevDate: Date | null = null;

                          if (typeof prevMilestone === 'object' && prevMilestone !== null) {
                            const prevDateStr = prevMilestone.date || prevMilestone.dueDate;
                            if (prevDateStr) {
                              prevDate = new Date(prevDateStr);
                            }
                          } else {
                            const prevMilestoneStr = String(prevMilestone);
                            const datePatterns = [
                              /(\d{2}[-\/]\d{2}[-\/]\d{4})/,
                              /(\d{4}[-\/]\d{2}[-\/]\d{2})/,
                            ];

                            for (const pattern of datePatterns) {
                              const match = prevMilestoneStr.match(pattern);
                              if (match) {
                                const foundDate = match[1];
                                try {
                                  if (foundDate.match(/^\d{2}[-\/]\d{2}[-\/]\d{4}$/)) {
                                    const parts = foundDate.split(/[-\/]/);
                                    prevDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                                  } else {
                                    prevDate = new Date(foundDate);
                                  }
                                } catch (e) {
                                  prevDate = null;
                                }
                                break;
                              }
                            }
                          }

                          if (prevDate && parsedDate && !isNaN(prevDate.getTime()) && !isNaN(parsedDate.getTime())) {
                            const diffTime = parsedDate.getTime() - prevDate.getTime();
                            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                            daysDiff = diffDays.toString();
                          }
                        }

                        return (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{description}</td>
                            <td className="px-3 py-2 text-center text-gray-900 dark:text-white font-medium">{dateStr}</td>
                            <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-medium">{daysDiff}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          )}

          {/* Budget & Pricing */}
          {briefData.budgetAndPricing && (
            <Section title="Budget & Pricing" icon={DollarSign}>
              <Grid>
                <Field label="Total Budget" value={briefData.budgetAndPricing.totalBudget} fullWidth />
                <Field label="Pricing Structure Expected" value={briefData.budgetAndPricing.pricingStructureExpected} fullWidth />
                <Field label="Payment Terms" value={briefData.budgetAndPricing.paymentTerms} fullWidth />
                <Field label="Budget Constraints" value={briefData.budgetAndPricing.budgetConstraints} fullWidth />
              </Grid>
            </Section>
          )}

          {/* Evaluation Criteria */}
          {briefData.evaluationCriteria && (
            <Section title="Evaluation Criteria" icon={Target}>
              <Grid>
                <Field label="Reference Requirements" value={briefData.evaluationCriteria.referenceRequirements} fullWidth />
              </Grid>
              {briefData.evaluationCriteria.scoringWeights && typeof briefData.evaluationCriteria.scoringWeights === 'object' && (
                <div className="mt-4">
                  <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Scoring Weights</h5>
                  <div className="space-y-4">
                    {Object.entries(briefData.evaluationCriteria.scoringWeights).map(([criteria, weight]) => (
                      <div key={criteria}>
                        {typeof weight === 'object' && weight !== null ? (
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{criteria}</p>
                            <table className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                              <thead className="bg-gray-100 dark:bg-gray-800">
                                <tr>
                                  <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">Criteria</th>
                                  <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">Marks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(weight).map(([subCriteria, marks], idx) => (
                                  <tr key={subCriteria} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{subCriteria}</td>
                                    <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-medium">{String(marks)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{criteria}</span>
                            <span className="text-sm font-bold text-primary">{String(weight)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {briefData.evaluationCriteria.keyFactors && Array.isArray(briefData.evaluationCriteria.keyFactors) && (
                <div className="mt-4">
                  <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Key Factors</h5>
                  <ul className="space-y-1">
                    {briefData.evaluationCriteria.keyFactors.map((factor: any, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {typeof factor === 'object' ? JSON.stringify(factor) : String(factor)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          )}

          {/* Regulatory Compliance */}
          {briefData.regulatoryCompliance && (
            <Section title="Regulatory Compliance" icon={Shield}>
              <Grid>
                <Field
                  label="GDPR Required"
                  value={briefData.regulatoryCompliance.gdprRequired ? 'Yes' : 'No'}
                />
                <Field
                  label="HIPAA Required"
                  value={briefData.regulatoryCompliance.hipaaRequired ? 'Yes' : 'No'}
                />
                <Field label="Data Security" value={briefData.regulatoryCompliance.dataSecurity} fullWidth />
              </Grid>
              {briefData.regulatoryCompliance.otherCompliance && Array.isArray(briefData.regulatoryCompliance.otherCompliance) && briefData.regulatoryCompliance.otherCompliance.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Other Compliance Requirements</h5>
                  <ul className="grid grid-cols-2 gap-2">
                    {briefData.regulatoryCompliance.otherCompliance.map((compliance: any, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        {typeof compliance === 'object' ? JSON.stringify(compliance) : String(compliance)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          )}

          {/* Additional Context */}
          {briefData.additionalContext && (
            <Section title="Additional Context & Assumptions" icon={Info}>
              {briefData.additionalContext.backgroundInformation && (
                <div className="mb-4">
                  <Field label="Background Information" value={briefData.additionalContext.backgroundInformation} fullWidth />
                </div>
              )}
              {briefData.additionalContext.priorResearch && (
                <div className="mb-4">
                  <Field label="Prior Research" value={briefData.additionalContext.priorResearch} fullWidth />
                </div>
              )}
              {briefData.additionalContext.assumptionsMade && Array.isArray(briefData.additionalContext.assumptionsMade) && briefData.additionalContext.assumptionsMade.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Assumptions Made</h5>
                  <ul className="space-y-2">
                    {briefData.additionalContext.assumptionsMade.map((assumption: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        {assumption}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {briefData.additionalContext.missingInformation && Array.isArray(briefData.additionalContext.missingInformation) && briefData.additionalContext.missingInformation.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Missing Information</h5>
                  <ul className="space-y-2">
                    {briefData.additionalContext.missingInformation.map((missing: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                        {missing}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          )}

          {/* Confidence Scores */}
          {briefData.confidenceScores && (
            <Section title="Confidence Scores" icon={Target}>
              <div className="grid grid-cols-3 gap-4">
                <ScoreBar label="Overall" score={briefData.confidenceScores.overall} />
                <ScoreBar label="Objectives" score={briefData.confidenceScores.objectives} />
                <ScoreBar label="Methodology" score={briefData.confidenceScores.methodology} />
                <ScoreBar label="Sample" score={briefData.confidenceScores.sample} />
                <ScoreBar label="Timeline" score={briefData.confidenceScores.timeline} />
                <ScoreBar label="Budget" score={briefData.confidenceScores.budget} />
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, value, fullWidth }: { label: string; value: any; fullWidth?: boolean }) {
  // Special handling for Fieldwork Window - format phases on separate lines with bold labels
  if (label === 'Fieldwork Window' && typeof value === 'string' && value.includes('Phase')) {
    const phases = value.split(/;\s*(?=Phase)/i);
    return (
      <div className={fullWidth ? 'col-span-2' : ''}>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
          {label}
        </label>
        <div className="text-sm text-gray-900 dark:text-white space-y-1">
          {phases.map((phase, idx) => {
            // Extract "Phase I", "Phase II", etc. and make it bold
            const match = phase.match(/^(Phase\s+[IVX]+)[:.]?\s*(.*)/i);
            if (match) {
              return (
                <div key={idx}>
                  <span className="font-bold">{match[1]}:</span> {match[2]}
                </div>
              );
            }
            return <div key={idx}>{phase}</div>;
          })}
        </div>
      </div>
    );
  }

  const displayValue = value === 'Not specified' || value === 'Not applicable' || !value
    ? <span className="text-gray-400 dark:text-gray-600 italic">Not specified</span>
    : typeof value === 'object' && value !== null
    ? <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
    : <span className="text-gray-900 dark:text-white">{value}</span>;

  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
        {label}
      </label>
      <div className="text-sm">{displayValue}</div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const percentage = Math.round((score || 0) * 100);
  const color = percentage >= 80 ? 'bg-emerald-500' : percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-xs font-bold text-gray-900 dark:text-white">{percentage}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function formatBriefAsText(briefData: any, rfpTitle: string): string {
  let text = `RFP REQUIREMENTS BRIEF\n`;
  text += `${'='.repeat(80)}\n\n`;
  text += `RFP Title: ${rfpTitle}\n`;
  text += `Generated: ${new Date().toLocaleString()}\n\n`;

  if (briefData.coverInformation) {
    text += `COVER INFORMATION\n${'-'.repeat(80)}\n`;
    text += `RFP Title: ${briefData.coverInformation.rfpTitle || 'Not specified'}\n`;
    text += `Issued By: ${briefData.coverInformation.issuedBy || 'Not specified'}\n`;
    text += `Contact Person: ${briefData.coverInformation.contactPerson || 'Not specified'}\n`;
    text += `Contact Email: ${briefData.coverInformation.contactEmail || 'Not specified'}\n`;
    text += `Contact Phone: ${briefData.coverInformation.contactPhone || 'Not specified'}\n`;
    text += `Submission Deadline: ${briefData.coverInformation.submissionDeadline || 'Not specified'}\n`;
    text += `Budget Range: ${briefData.coverInformation.budgetRange || 'Not specified'}\n\n`;
  }

  if (briefData.executiveSummary) {
    text += `EXECUTIVE SUMMARY\n${'-'.repeat(80)}\n`;
    if (briefData.executiveSummary.oneLinerSummary) {
      text += `Summary: ${briefData.executiveSummary.oneLinerSummary}\n\n`;
    }
    if (briefData.executiveSummary.companyOverview) {
      text += `Company Overview:\n${briefData.executiveSummary.companyOverview}\n\n`;
    }
    if (briefData.executiveSummary.therapeuticAreaContext) {
      text += `Therapeutic Area Context:\n${briefData.executiveSummary.therapeuticAreaContext}\n\n`;
    }
    if (briefData.executiveSummary.marketChallenges) {
      text += `Market Challenges:\n${briefData.executiveSummary.marketChallenges}\n\n`;
    }
    if (briefData.executiveSummary.strategicImportance) {
      text += `Strategic Importance:\n${briefData.executiveSummary.strategicImportance}\n\n`;
    }
  }

  if (briefData.researchObjectives && Array.isArray(briefData.researchObjectives)) {
    text += `RESEARCH OBJECTIVES\n${'-'.repeat(80)}\n`;
    briefData.researchObjectives.forEach((obj: string, idx: number) => {
      text += `${idx + 1}. ${obj}\n`;
    });
    text += `\n`;
  }

  if (briefData.scopeOfWork) {
    text += `SCOPE OF WORK\n${'-'.repeat(80)}\n`;
    text += `Study Type: ${briefData.scopeOfWork.studyType || 'Not specified'}\n`;
    text += `Data Collection Mode: ${briefData.scopeOfWork.dataCollectionMode || 'Not specified'}\n`;
    text += `Interview Duration: ${briefData.scopeOfWork.interviewDuration || 'Not specified'}\n`;
    text += `Survey Length: ${briefData.scopeOfWork.surveyLength || 'Not specified'}\n`;
    text += `Geographic Coverage: ${Array.isArray(briefData.scopeOfWork.geographicCoverage) ? briefData.scopeOfWork.geographicCoverage.join(', ') : briefData.scopeOfWork.geographicCoverage || 'Not specified'}\n`;
    if (briefData.scopeOfWork.methodologyDetails) {
      text += `Methodology Details:\n${briefData.scopeOfWork.methodologyDetails}\n`;
    }
    text += `\n`;
  }

  if (briefData.targetAudience) {
    text += `TARGET AUDIENCE\n${'-'.repeat(80)}\n`;
    text += `Primary Respondents: ${briefData.targetAudience.primaryRespondents || 'Not specified'}\n`;
    text += `Minimum Experience: ${briefData.targetAudience.minimumExperience || 'Not specified'}\n`;
    text += `Minimum Patient Volume: ${briefData.targetAudience.minimumPatientVolume || 'Not specified'}\n`;
    if (briefData.targetAudience.selectionCriteria && Array.isArray(briefData.targetAudience.selectionCriteria)) {
      text += `Selection Criteria:\n`;
      briefData.targetAudience.selectionCriteria.forEach((criteria: string) => {
        text += `  • ${criteria}\n`;
      });
    }
    text += `\n`;
  }

  if (briefData.sampleSpecifications) {
    text += `SAMPLE SPECIFICATIONS\n${'-'.repeat(80)}\n`;
    text += `Total Sample Size: ${briefData.sampleSpecifications.totalSampleSize || 'Not specified'}\n`;
    text += `Quotas: ${briefData.sampleSpecifications.quotas || 'Not specified'}\n`;
    if (briefData.sampleSpecifications.sampleBreakdown && typeof briefData.sampleSpecifications.sampleBreakdown === 'object') {
      text += `Sample Breakdown:\n`;
      Object.entries(briefData.sampleSpecifications.sampleBreakdown).forEach(([country, count]) => {
        text += `  ${country}: ${count}\n`;
      });
    }
    text += `\n`;
  }

  if (briefData.keyDeliverables && Array.isArray(briefData.keyDeliverables)) {
    text += `KEY DELIVERABLES\n${'-'.repeat(80)}\n`;
    briefData.keyDeliverables.forEach((del: string) => {
      text += `• ${del}\n`;
    });
    text += `\n`;
  }

  if (briefData.timelineAndMilestones) {
    text += `TIMELINE & MILESTONES\n${'-'.repeat(80)}\n`;
    text += `Project Duration: ${briefData.timelineAndMilestones.projectDuration || 'Not specified'}\n`;
    text += `Proposal Due Date: ${briefData.timelineAndMilestones.proposalDueDate || 'Not specified'}\n`;
    text += `Kickoff Date: ${briefData.timelineAndMilestones.kickoffDate || 'Not specified'}\n`;
    text += `Fieldwork Window: ${briefData.timelineAndMilestones.fieldworkWindow || 'Not specified'}\n`;
    text += `Draft Report Date: ${briefData.timelineAndMilestones.draftReportDate || 'Not specified'}\n`;
    text += `Final Report Date: ${briefData.timelineAndMilestones.finalReportDate || 'Not specified'}\n`;
    if (briefData.timelineAndMilestones.keyMilestones && Array.isArray(briefData.timelineAndMilestones.keyMilestones)) {
      text += `Key Milestones:\n`;
      briefData.timelineAndMilestones.keyMilestones.forEach((milestone: string) => {
        text += `  → ${milestone}\n`;
      });
    }
    text += `\n`;
  }

  if (briefData.budgetAndPricing) {
    text += `BUDGET & PRICING\n${'-'.repeat(80)}\n`;
    text += `Total Budget: ${briefData.budgetAndPricing.totalBudget || 'Not specified'}\n`;
    text += `Pricing Structure: ${briefData.budgetAndPricing.pricingStructureExpected || 'Not specified'}\n`;
    text += `Payment Terms: ${briefData.budgetAndPricing.paymentTerms || 'Not specified'}\n`;
    text += `Budget Constraints: ${briefData.budgetAndPricing.budgetConstraints || 'Not specified'}\n\n`;
  }

  if (briefData.regulatoryCompliance) {
    text += `REGULATORY COMPLIANCE\n${'-'.repeat(80)}\n`;
    text += `GDPR Required: ${briefData.regulatoryCompliance.gdprRequired ? 'Yes' : 'No'}\n`;
    text += `HIPAA Required: ${briefData.regulatoryCompliance.hipaaRequired ? 'Yes' : 'No'}\n`;
    if (briefData.regulatoryCompliance.otherCompliance && Array.isArray(briefData.regulatoryCompliance.otherCompliance)) {
      text += `Other Compliance Requirements:\n`;
      briefData.regulatoryCompliance.otherCompliance.forEach((comp: string) => {
        text += `  • ${comp}\n`;
      });
    }
    text += `\n`;
  }

  if (briefData.additionalContext) {
    text += `ADDITIONAL CONTEXT\n${'-'.repeat(80)}\n`;
    if (briefData.additionalContext.assumptionsMade && Array.isArray(briefData.additionalContext.assumptionsMade)) {
      text += `Assumptions Made:\n`;
      briefData.additionalContext.assumptionsMade.forEach((assumption: string) => {
        text += `  • ${assumption}\n`;
      });
      text += `\n`;
    }
    if (briefData.additionalContext.missingInformation && Array.isArray(briefData.additionalContext.missingInformation)) {
      text += `Missing Information:\n`;
      briefData.additionalContext.missingInformation.forEach((missing: string) => {
        text += `  • ${missing}\n`;
      });
      text += `\n`;
    }
  }

  if (briefData.confidenceScores) {
    text += `CONFIDENCE SCORES\n${'-'.repeat(80)}\n`;
    text += `Overall: ${Math.round((briefData.confidenceScores.overall || 0) * 100)}%\n`;
    text += `Objectives: ${Math.round((briefData.confidenceScores.objectives || 0) * 100)}%\n`;
    text += `Methodology: ${Math.round((briefData.confidenceScores.methodology || 0) * 100)}%\n`;
    text += `Sample: ${Math.round((briefData.confidenceScores.sample || 0) * 100)}%\n`;
    text += `Timeline: ${Math.round((briefData.confidenceScores.timeline || 0) * 100)}%\n`;
    text += `Budget: ${Math.round((briefData.confidenceScores.budget || 0) * 100)}%\n\n`;
  }

  text += `${'='.repeat(80)}\n`;
  text += `End of Brief\n`;

  return text;
}
