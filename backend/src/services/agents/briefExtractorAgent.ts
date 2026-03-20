/**
 * Brief Extractor Agent — Step 2
 * Extracts structured 13-section brief, computes weighted completeness score,
 * fieldConfidence per field, studyFamily classification, criticalGaps, conflicts.
 * Fully AI-driven: GOAL / INPUT / OUTPUT REQUIREMENTS pattern.
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

const STUDY_FAMILIES = `
1. UNDERSTANDING_DIAGNOSIS: U&A studies, deep-dive qualitative, patient journey, KOL advisory boards, ethnography
2. TRACKING_MONITORING: Brand trackers, awareness trackers, patient registries, longitudinal panels
3. TESTING_OPTIMIZATION: Concept tests, positioning tests, message testing, creative testing, usability testing
4. TRADEOFF_CHOICE: Conjoint analysis, DCE (Discrete Choice Experiment), MaxDiff, priority mapping
5. SEGMENTATION_TARGETING: Segmentation builds, segment validation, market sizing, persona development
6. PRICING_MARKET_ACCESS: WTP (willingness to pay), payer research, HTA landscape, formulary research
`;

const COMPLETENESS_WEIGHTS = `
Weighted completeness formula — assign partial credit proportionally (total = 100 pts):
  research_objectives (section5): 15 pts
  target_audience (section8 audience + sample): 15 pts
  methodology (section6): 15 pts
  sample_requirements (section8 sample size details): 15 pts
  geography / countries (section7): 10 pts
  deliverables (section10): 10 pts
  timeline (section9): 10 pts
  compliance_budget (section3 + section11): 10 pts
Score 0 if missing, partial weight if partial, full weight if complete. Sum = completenessScore (0-100).
`;

export class BriefExtractorAgent extends BaseAgent {
  protected agentType = 'brief_extract';

  protected getSystemPrompt(_context: AgentContext): string {
    return `You are a Senior PMR Brief Specialist at PetaSight, a pharma market research firm.
Your job is to extract every structured requirement from a pharma RFP — regardless of format.
Every field you extract must come directly from the RFP text. Do not invent or assume values.
Output ONLY valid JSON. No markdown, no commentary.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const { rfpText, fileName } = context.data;
      if (!rfpText) return { success: false, error: 'No RFP text provided' };

      const sql = getSql();

      const [opp] = await sql`
        SELECT rfp_title, client_name, therapeutic_area FROM opportunities WHERE id = ${context.opportunityId}
      `;

      const rfpSnippet = rfpText.length > 8000
        ? rfpText.slice(0, 8000) + '\n...[truncated — extract all visible sections above]'
        : rfpText;

      const userMessage = `
=== GOAL ===
Extract a fully-structured brief from the pharma RFP below. Map content to all 13 sections of the
PetaSight standard template. Assign fieldConfidence per key field, compute a weighted completenessScore,
identify criticalGaps and conflicts, and classify studyFamily + studyType separately.

=== INPUT: RFP TEXT (first 8000 chars) ===
Filename: ${fileName || 'unknown'}
Title (from intake): ${opp?.rfp_title || 'unknown'}
Client (from intake): ${opp?.client_name || 'unknown'}

${rfpSnippet}

=== REFERENCE: STUDY FAMILIES ===
${STUDY_FAMILIES}

=== REFERENCE: COMPLETENESS SCORING ===
${COMPLETENESS_WEIGHTS}

=== OUTPUT REQUIREMENTS ===
Return a JSON object with ALL of the following fields:

1. templateCoverage: object with keys section1_contact_issuer through section13_evaluation_criteria,
   each value "COMPLETE" | "PARTIAL" | "MISSING"

2. section1_contact_issuer: {issuerName, contactPerson, contactTitle, contactEmail, submissionEmail, submissionDeadline}
3. section2_company: {companyName, division, description}
4. section3_confidentiality: {nda_required: boolean, confidentialityLevel: "CONFIDENTIAL"|"PROPRIETARY"|"PUBLIC", terms}
5. section4_project_background_context: {therapeuticArea, diseaseArea, productBrand, lifecycleStage, background, problemStatement}
6. section5_business_research_objectives: {businessObjectives: string[], researchObjectives: string[], keyQuestions: string[]}
7. section6_methodology_scope: {primaryMethodology, studySubtype, researchDesign, dataCollection, numberOfWaves, supplierDiscretion}
8. section7_markets_geography: {markets: string[], primaryMarkets: string[], globalStudy: boolean, numberOfCountries: number, excludedMarkets: string[]}
9. section8_target_audience_sample: {primaryTargetAudience, audienceDescription, targetSampleSize, sampleBreakdown: object, quotas, specialRequirements}
10. section9_timeline_key_dates: {rfpIssueDate, proposalDeadline, questionsDeadline, projectStartDate, projectEndDate, projectDuration, contractLength}
11. section10_deliverables: {deliverables: string[], reportFormat, presentations, dataAccess}
12. section11_budget_cost: {budgetRange, currency, costingTemplate, paymentTerms}
13. section12_submission_requirements: {format, maxPages, submissionDeadline, exclusionGrounds}
14. section13_evaluation_criteria: {criteria: string[], weightings: object, evaluationProcess}

15. studyFamily: one of UNDERSTANDING_DIAGNOSIS | TRACKING_MONITORING | TESTING_OPTIMIZATION |
    TRADEOFF_CHOICE | SEGMENTATION_TARGETING | PRICING_MARKET_ACCESS
16. studyFamilyRationale: 1 sentence explaining the classification
17. studyType: "Qualitative" | "Quantitative" | "Mixed Methods" | "Conjoint / Choice Modeling" |
    "Chart Review / Retrospective" | "Message Testing / Concept Testing" | "Segmentation"
18. studySubtype: specific program name (e.g. "Brand Equity Tracker", "Patient Journey", "TPP Conjoint")

19. fieldConfidence: object with "high"|"medium"|"low" for each key:
    therapeuticArea, targetAudience, sampleSize, methodology, geography, deliverables, timeline, budget

20. completenessScore: 0-100 integer using the weighted formula from the reference above

21. criticalGaps: string array of field names that are null/missing AND required for research design.
    Examples: "sampleSize", "methodology", "targetAudience", "geography", "researchObjectives"

22. conflicts: array of {field, value1, source1, value2, source2} for any contradictions in the RFP

23. completeSections: integer count of COMPLETE sections (0-13)
24. missingSections: integer count of MISSING sections (0-13)
25. overallCompletenessPercent: (completeSections / 13) * 100

RULES:
- Redacted placeholders like [CLIENT_ORG], [DATE], [BRAND_A], [PAYER_ORG] → "Redacted"
- Fields truly absent from RFP → null
- Fields left open to supplier → "Supplier discretion"
- Extract ALL items for array fields — do not truncate
- Output ONLY the JSON object. No markdown, no text outside.`;

      const response = await this.invokeAI(this.getSystemPrompt(context), userMessage, context);

      let extractedData: any;
      try {
        let json = response.trim();
        if (json.startsWith('```')) json = json.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        const jsonMatch = json.match(/\{[\s\S]*\}/);
        extractedData = JSON.parse(jsonMatch ? jsonMatch[0] : json);
      } catch {
        console.error('BriefExtractorAgent: failed to parse JSON:', response.substring(0, 300));
        return { success: false, error: 'Failed to parse AI response as JSON' };
      }

      // Flexible key resolver — AI may vary key names slightly
      const getSection = (data: any, ...keys: string[]) => {
        for (const k of keys) if (data[k] && typeof data[k] === 'object') return data[k];
        return {};
      };

      const section4 = getSection(extractedData, 'section4_project_background_context', 'section4_background', 'section4');
      const section5 = getSection(extractedData, 'section5_business_research_objectives', 'section5_objectives', 'section5');
      const section6 = getSection(extractedData, 'section6_methodology_scope', 'section6_methodology', 'section6');
      const section7 = getSection(extractedData, 'section7_markets_geography', 'section7_geography', 'section7');
      const section8 = getSection(extractedData, 'section8_target_audience_sample', 'section8_audience', 'section8');
      const section9 = getSection(extractedData, 'section9_timeline_key_dates', 'section9_timeline', 'section9');
      const section10 = getSection(extractedData, 'section10_deliverables', 'section10');
      const section11 = getSection(extractedData, 'section11_budget_cost', 'section11_budget', 'section11');

      const researchObjectives = section5.researchObjectives || [];
      const targetAudience = section8.primaryTargetAudience || section8.audienceDescription || 'Not specified';
      const therapeuticArea = section4.therapeuticArea || opp?.therapeutic_area || 'Not specified';

      const studySubtype = extractedData.studySubtype || section6.studySubtype || null;
      const studyType = studySubtype
        ? `${extractedData.studyType || section6.primaryMethodology || 'Not specified'} — ${studySubtype}`
        : (extractedData.studyType || section6.primaryMethodology || 'Not specified');

      const sampleRequirements = {
        totalSize: section8.targetSampleSize || 'Not specified',
        breakdown: section8.sampleBreakdown || {},
        quotas: section8.quotas || 'Not specified',
        geographicCoverage: section7.markets || [],
        targetAudience: section8,
        templateCoverage: extractedData.templateCoverage || {},
      };

      const completenessScore = extractedData.completenessScore ?? extractedData.overallCompletenessPercent ?? 0;
      const confidenceScore = Math.max(0, Math.min(1, completenessScore / 100));

      const [brief] = await sql`
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
          ${section9.projectDuration || section9.contractLength || null},
          ${section10.deliverables || []},
          ${section11.budgetRange || null},
          ${JSON.stringify(extractedData)}::jsonb,
          ${confidenceScore},
          now(),
          now()
        )
        RETURNING id
      `;

      await sql`
        UPDATE opportunities
        SET status = 'brief_extract', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      const completeSections = extractedData.completeSections || 0;
      console.log(`✅ Brief extraction complete: ${studyType} | ${therapeuticArea}`);
      console.log(`   Completeness: ${completenessScore}/100 | Sections: ${completeSections}/13`);
      console.log(`   Study family: ${extractedData.studyFamily}`);
      console.log(`   Critical gaps: ${(extractedData.criticalGaps || []).length}`);

      return {
        success: true,
        data: {
          briefId: brief.id,
          studyType,
          studyFamily: extractedData.studyFamily,
          targetAudience,
          therapeuticArea,
          completenessScore,
          criticalGaps: extractedData.criticalGaps || [],
          currentStatus: 'brief_extract',
          nextStatus: 'gap_analysis',
        },
        metadata: { confidence: confidenceScore },
      };
    } catch (error: any) {
      console.error('BriefExtractorAgent error:', error);
      return { success: false, error: error.message };
    }
  }
}
