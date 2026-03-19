/**
 * Brief Extractor Agent
 * Extracts structured requirements from RFP document
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';
import { Tool } from '../aiServiceTypes';

export class BriefExtractorAgent extends BaseAgent {
  protected agentType = 'brief_extract';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are a PMR Brief Extraction Specialist for PetaSight. Your task is to extract structured requirements from ANY pharma primary market research (PMR) RFP — whether it follows our 13-section template or is a freeform document.

**STANDARD 13-SECTION TEMPLATE**:
1. Contact & Issuer Information
2. Introduction & Company Overview
3. Confidentiality & Legal Terms
4. Project Background & Context
5. Business & Research Objectives
6. Methodology & Scope
7. Markets & Geography
8. Target Audience & Sample
9. Timeline & Key Dates
10. Deliverables
11. Budget & Cost Requirements
12. Proposal Submission Requirements
13. Evaluation Criteria

**CRITICAL EXTRACTION RULES**:
- Work with ANY RFP format: structured template, freeform Word doc, or Excel spreadsheet
- Redacted placeholders like [CLIENT_ORG], [BRAND_A], [CONTACT_EMAIL], [DATE], [YEAR], [PHONE], [PAYER_ORG] are masked data — treat as "Redacted" not "Not specified"
- "Open to supplier suggestions" / "vendor discretion" fields → use "Supplier discretion" (NOT "Not specified")
- "Not specified" → only when the RFP truly omits the information with no indication it exists
- Extract EXACTLY what is stated — no inference or assumptions
- Keep field values concise: 1-2 sentences max
- Do NOT skip sections; mark them PARTIAL/MISSING if info is incomplete/absent
- For array fields (markets, deliverables, objectives): extract ALL items mentioned, not just examples

**STUDY TYPE CLASSIFICATION** — set primaryMethodology to one of:
- "Qualitative" — IDIs, focus groups, ethnography, KOL interviews, pharmacist interviews
- "Quantitative" — surveys, online quant, tracking studies, market pulse
- "Mixed Methods" — combination of qual and quant
- "Conjoint / Choice Modeling" — DCE, conjoint analysis, preference share modeling
- "Chart Review / Retrospective" — medical record audit, real-world evidence
- "Observational / Non-interventional" — patient registries, longitudinal observation
- "Pilot / Exploratory" — small-scale preliminary research
- "Message Testing / Concept Testing" — ad testing, claim testing, concept evaluation
- "Segmentation" — consumer or HCP segmentation studies

ALSO set studySubtype to capture the specific program type (e.g., "Expert Performance Tracking", "Patient Journey", "Brand Equity Tracking", "TPP Conjoint", "Disease Insights").

**OUTPUT JSON STRUCTURE** (use EXACTLY these key names):
{
  "templateCoverage": {
    "section1_contact_issuer": "COMPLETE|PARTIAL|MISSING",
    "section2_company": "COMPLETE|PARTIAL|MISSING",
    "section3_confidentiality": "COMPLETE|PARTIAL|MISSING",
    "section4_project_background_context": "COMPLETE|PARTIAL|MISSING",
    "section5_business_research_objectives": "COMPLETE|PARTIAL|MISSING",
    "section6_methodology_scope": "COMPLETE|PARTIAL|MISSING",
    "section7_markets_geography": "COMPLETE|PARTIAL|MISSING",
    "section8_target_audience_sample": "COMPLETE|PARTIAL|MISSING",
    "section9_timeline_key_dates": "COMPLETE|PARTIAL|MISSING",
    "section10_deliverables": "COMPLETE|PARTIAL|MISSING",
    "section11_budget_cost": "COMPLETE|PARTIAL|MISSING",
    "section12_submission_requirements": "COMPLETE|PARTIAL|MISSING",
    "section13_evaluation_criteria": "COMPLETE|PARTIAL|MISSING"
  },
  "section1_contact_issuer": {
    "issuerName": "Company name (or 'Redacted' if placeholder)",
    "contactPerson": "Name or 'Redacted'",
    "contactTitle": "Title or null",
    "contactEmail": "Email or 'Redacted'",
    "submissionEmail": "Email or null",
    "submissionDeadline": "Date/time string or null"
  },
  "section2_company": {
    "companyName": "...",
    "division": "...",
    "description": "1-2 sentences about the company"
  },
  "section3_confidentiality": {
    "nda_required": true,
    "confidentialityLevel": "CONFIDENTIAL|PROPRIETARY|PUBLIC",
    "terms": "Key confidentiality terms"
  },
  "section4_project_background_context": {
    "therapeuticArea": "e.g. Oncology, Immunology, Consumer Healthcare, Vaccines",
    "diseaseArea": "Specific disease or condition",
    "productBrand": "Brand name (or 'Redacted')",
    "lifecycleStage": "Launch|Growth|Established|Pre-launch",
    "background": "2-3 sentence project context",
    "problemStatement": "Core business problem"
  },
  "section5_business_research_objectives": {
    "businessObjectives": ["Primary business goal 1", "..."],
    "researchObjectives": ["Research question 1", "..."],
    "keyQuestions": ["Specific question 1", "..."]
  },
  "section6_methodology_scope": {
    "primaryMethodology": "One of the study types listed above",
    "studySubtype": "Specific program type e.g. Brand Equity Tracking, Patient Journey",
    "researchDesign": "Description of approach",
    "dataCollection": "IDIs|Online survey|Chart review|Mixed|etc.",
    "numberOfWaves": "e.g. 3 waves annually or null",
    "supplierDiscretion": "List any methodology elements left to supplier suggestion"
  },
  "section7_markets_geography": {
    "markets": ["US", "EU5", "Japan", "..."],
    "primaryMarkets": ["..."],
    "globalStudy": true,
    "numberOfCountries": 0,
    "excludedMarkets": ["..."]
  },
  "section8_target_audience_sample": {
    "primaryTargetAudience": "HCPs|Patients|Payers|Pharmacists|Consumers|KOLs",
    "audienceDescription": "Specific HCP specialty, patient profile, etc.",
    "targetSampleSize": "n=X or 'Supplier discretion' if open",
    "sampleBreakdown": {"Oncologists": 50, "Cardiologists": 30},
    "quotas": "Quota requirements or 'Supplier discretion'",
    "specialRequirements": "Prescribing thresholds, tenure requirements, etc."
  },
  "section9_timeline_key_dates": {
    "rfpIssueDate": "...",
    "proposalDeadline": "...",
    "questionsDeadline": "...",
    "projectStartDate": "...",
    "projectEndDate": "...",
    "projectDuration": "e.g. 6 months",
    "contractLength": "e.g. 3 years for tracking programs"
  },
  "section10_deliverables": {
    "deliverables": ["Topline report", "Full debrief", "Data tables", "Dashboard"],
    "reportFormat": "PPT|Word|Excel|Dashboard",
    "presentations": "Who receives presentations",
    "dataAccess": "Raw data, crosstabs, etc."
  },
  "section11_budget_cost": {
    "budgetRange": "Dollar amount, range, or 'Not disclosed'",
    "currency": "USD|EUR|GBP",
    "costingTemplate": "Whether a costing template is provided",
    "paymentTerms": "..."
  },
  "section12_submission_requirements": {
    "format": "PDF|Word|Portal upload",
    "maxPages": null,
    "submissionDeadline": "...",
    "exclusionGrounds": "Conditions for disqualification"
  },
  "section13_evaluation_criteria": {
    "criteria": ["Technical approach", "Team expertise", "Price", "Timeline"],
    "weightings": {"technical": "40%", "price": "30%"},
    "evaluationProcess": "Describe selection process"
  },
  "overallCompletenessPercent": 0,
  "completeSections": 0,
  "missingSections": 0
}

Respond with ONLY valid JSON (no markdown).`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const { rfpText, fileName } = context.data;

      // Get job ID for progress tracking
      const { jobQueueService } = await import('../jobQueue');
      const jobs = await jobQueueService.getJobsByOpportunity(context.opportunityId);
      const currentJob = jobs.find(j => j.jobType === this.agentType && j.status === 'processing');

      // Update progress: 30% - Analyzing RFP content
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 30, 'Analyzing RFP structure and content');
      }

      const systemPrompt = this.getSystemPrompt(context);
      const userMessage = `Extract structured requirements from this RFP and map to the 13-section template.

Document: ${fileName}

RFP Content:
${rfpText}

**EXTRACTION REQUIREMENTS**:
1. This may be a structured template RFP or a freeform document — adapt accordingly
2. For each of the 13 sections: mark COMPLETE / PARTIAL / MISSING in templateCoverage
3. Extract every field you can find — even from freeform text that doesn't use section headers
4. Placeholders like [CLIENT_ORG], [BRAND_A], [DATE], [YEAR], [PHONE], [CONTACT_EMAIL], [PAYER_ORG] = "Redacted"
5. Fields explicitly left open for supplier input = "Supplier discretion"
6. Fields truly absent from the RFP = "Not specified"
7. Classify study type precisely (Qualitative / Quantitative / Conjoint / Chart Review / etc.)
8. Set studySubtype to the specific program name (e.g. "Expert Performance Tracking", "Patient Journey", "Brand Equity Tracking")

**COMPLETENESS CALCULATION**:
- Count completed (COMPLETE) sections for completeSections
- Count missing (MISSING) sections for missingSections
- Calculate: overallCompletenessPercent = (COMPLETE / 13) * 100

Return ONLY valid JSON matching the exact schema. No markdown.`;

      // Update progress: 40% - Sending to AI
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 40, 'Deep analysis: Extracting objectives, deliverables, and sample specifications');
      }

      const response = await this.invokeAI(systemPrompt, userMessage, context);

      // Update progress: 70% - Parsing AI response
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 70, 'Processing comprehensive requirements brief');
      }

      // Parse JSON response
      let extractedData;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          extractedData = JSON.parse(response);
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', response);
        return {
          success: false,
          error: 'Failed to parse AI response',
        };
      }

      // Update progress: 80% - Saving to database
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 80, 'Saving extracted data to database');
      }

      // Store in briefs table - map new structure to existing columns
      const sql = getSql();

      // Flexible key resolver — AI may vary key names slightly
      const getSection = (data: any, ...keys: string[]) => {
        for (const k of keys) if (data[k] && typeof data[k] === 'object') return data[k];
        return {};
      };

      // Extract from template-mapped structure
      const templateCoverage = extractedData.templateCoverage || {};
      const completeSections = extractedData.completeSections || 0;
      const missingSections = extractedData.missingSections || 0;
      const overallCompletenessPercent = extractedData.overallCompletenessPercent || 0;

      // Extract sections with fallback key variants
      const section1 = getSection(extractedData, 'section1_contact_issuer', 'section1_contact', 'section1');
      const section4 = getSection(extractedData, 'section4_project_background_context', 'section4_background', 'section4_project_background', 'section4');
      const section5 = getSection(extractedData, 'section5_business_research_objectives', 'section5_objectives', 'section5_business_objectives', 'section5');
      const section6 = getSection(extractedData, 'section6_methodology_scope', 'section6_methodology', 'section6');
      const section7 = getSection(extractedData, 'section7_markets_geography', 'section7_geography', 'section7_markets', 'section7');
      const section8 = getSection(extractedData, 'section8_target_audience_sample', 'section8_audience', 'section8_sample', 'section8');
      const section9 = getSection(extractedData, 'section9_timeline_key_dates', 'section9_timeline', 'section9');
      const section10 = getSection(extractedData, 'section10_deliverables', 'section10');
      const section11 = getSection(extractedData, 'section11_budget_cost', 'section11_budget', 'section11');

      const researchObjectives = section5.researchObjectives || [];
      const businessObjectives = section5.businessObjectives || [];
      const targetAudience = section8.primaryTargetAudience || section8.audienceDescription || "Not specified";
      const therapeuticArea = section4.therapeuticArea || section1.therapeuticArea || "Not specified";
      // Store "<primaryMethodology> — <studySubtype>" so dashboard shows specific study type
      const studySubtype = section6.studySubtype || null;
      const studyType = studySubtype
        ? `${section6.primaryMethodology || 'Not specified'} — ${studySubtype}`
        : (section6.primaryMethodology || "Not specified");
      const deliverables = section10.deliverables || [];
      const budgetIndication = section11.budgetRange || null;
      const timelineRequirements = section9.projectDuration || section9.projectTimeline || null;

      // Build comprehensive template-aware sample requirements
      const sampleRequirements = {
        totalSize: section8.targetSampleSize || "Not specified",
        breakdown: section8.sampleBreakdown || {},
        quotas: section8.quotas || "Not specified",
        geographicCoverage: section7.markets || [],
        targetAudience: section8 || {},
        templateCoverage: templateCoverage
      };

      // Calculate confidence from completeness
      const confidenceScore = Math.max(0, Math.min(1, overallCompletenessPercent / 100));

      const result = await sql`
        INSERT INTO briefs (
          opportunity_id,
          research_objectives,
          target_audience,
          therapeutic_area,
          study_type,
          sample_requirements,
          timeline_requirements,
          deliverables,
          budget_indication,
          raw_extraction,
          confidence_score,
          created_at,
          updated_at
        ) VALUES (
          ${context.opportunityId},
          ${researchObjectives},
          ${targetAudience},
          ${therapeuticArea},
          ${studyType},
          ${JSON.stringify(sampleRequirements)}::jsonb,
          ${timelineRequirements},
          ${deliverables},
          ${budgetIndication},
          ${JSON.stringify(extractedData)}::jsonb,
          ${confidenceScore},
          now(),
          now()
        )
        RETURNING id, confidence_score as "confidenceScore"
      `;

      const briefId = result[0].id;

      // Update opportunity status
      await sql`
        UPDATE opportunities
        SET status = 'brief_extract', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      console.log(`✅ Brief extraction complete for opportunity ${context.opportunityId}`);
      console.log(`   Template Coverage: ${completeSections}/13 sections complete`);
      console.log(`   Completeness: ${overallCompletenessPercent}%`);
      console.log(`   Study Type: ${studyType}`);
      console.log(`   Sample Size: ${sampleRequirements.totalSize}`);
      console.log(`   Research Objectives: ${researchObjectives.length} identified`);
      console.log(`   Business Objectives: ${businessObjectives.length} identified`);
      console.log(`   Confidence: ${Math.round(result[0].confidenceScore * 100)}%`);

      return {
        success: true,
        data: {
          briefId,
          // Return full structured data
          structuredExtraction: extractedData,
          // Return summary for quick access
          summary: {
            studyType,
            targetAudience,
            therapeuticArea,
            sampleSize: sampleRequirements.totalSize,
            objectivesCount: researchObjectives.length,
            deliverablesCount: deliverables.length,
          },
          currentStatus: 'brief_extract',
          nextStatus: 'gap_analysis',
        },
        metadata: {
          confidence: result[0].confidenceScore,
        },
      };
    } catch (error: any) {
      console.error('Brief extractor error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
