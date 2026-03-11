/**
 * Brief Extractor Agent
 * Extracts structured requirements from RFP document
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';
import { Tool } from '../aiServiceTypes';

export class BriefExtractorAgent extends BaseAgent {
  protected agentType = 'brief_extraction';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are a PMR Brief Extraction Specialist with deep expertise in pharmaceutical market research RFPs.

Your task is to analyze RFP documents and extract comprehensive, structured requirements. You MUST extract information even from incomplete, poorly formatted, or ambiguous RFPs. Always provide your best interpretation.

**CRITICAL RULES**:
1. Never fail - Always return complete JSON even if RFP is incomplete
2. Use "Not specified" for missing fields, not null
3. Infer reasonable values when explicit data is missing
4. Extract ALL information, even if partially mentioned

Extract the following sections (matching standard pharma RFP structure):

**1. coverInformation** (object):
   - rfpTitle: RFP title/subject line (or infer from content)
   - issuedBy: Company name (extract from context)
   - contactPerson: Contact name (or "Not specified")
   - contactEmail: Email address (or "Not specified")
   - contactPhone: Phone number (or "Not specified")
   - submissionDeadline: Proposal due date (or "Not specified")
   - budgetRange: Budget mentioned (e.g., "$80,000 - $120,000" or "Not specified")

**2. executiveSummary** (object):
   - companyOverview: Brief about the issuing company (or "Not specified")
   - therapeuticAreaContext: Therapeutic area background (e.g., "Oncology - NSCLC market")
   - marketChallenges: Why research is needed (or "Not specified")
   - strategicImportance: Business rationale (or "Not specified")
   - oneLinerSummary: 1-sentence summary of the RFP (ALWAYS provide)

**3. researchObjectives** (array of strings):
   - Extract 2-5 specific, measurable objectives
   - If not explicit, infer from context (e.g., ["Understand treatment patterns", "Identify barriers"])
   - MUST provide at least 1 objective

**4. scopeOfWork** (object):
   - studyType: "Qualitative", "Quantitative", "Mixed Methods", or "Not specified"
   - methodologyDetails: Specific methods (e.g., "40 in-depth interviews, 60 min phone")
   - geographicCoverage: Countries/regions (e.g., ["United States", "United Kingdom", "Germany"])
   - interviewDuration: Duration mentioned (e.g., "60 minutes" or "Not specified")
   - surveyLength: For quant studies (e.g., "15 minutes" or "Not specified")
   - dataCollectionMode: "Telephone", "Online", "In-person", "Mixed", or "Not specified"

**5. targetAudience** (object):
   - primaryRespondents: Who to interview (e.g., "Medical Oncologists")
   - selectionCriteria: Array of requirements (e.g., ["Board-certified", "5+ years experience", "Treating NSCLC"])
   - practiceSettings: Array (e.g., ["Academic Medical Center 40%", "Private Practice 40%", "Community Hospital 20%"])
   - minimumExperience: Years required (e.g., "5 years" or "Not specified")
   - minimumPatientVolume: Patients per month (e.g., "10 NSCLC patients/month" or "Not specified")
   - exclusionCriteria: Array (e.g., ["Pharma employees", "Recent study participants"])
   - geographicDistribution: Regional mix (e.g., "Northeast 30%, South 30%, Midwest 20%, West 20%")

**6. sampleSpecifications** (object):
   - totalSampleSize: Total respondents (number or "Not specified")
   - sampleBreakdown: By country/region (e.g., {"US": 30, "UK": 20, "Germany": 20})
   - quotas: Quota requirements (e.g., "50% academic, 50% community; Min 30% female")
   - segmentation: Any subgroup splits (or "Not specified")

**7. keyDeliverables** (array of strings):
   - List all expected outputs
   - Standard pharma deliverables include:
     * "Executive Summary (5-10 pages)"
     * "Detailed Findings Report (30-50 pages)"
     * "PowerPoint Presentation (20-30 slides)"
     * "Verbatim Transcripts" (for qual)
     * "Raw Data File" (Excel/SPSS for quant)
     * "Discussion Guide / Survey Instrument"
     * "Respondent Demographics Table"
   - If none mentioned, provide reasonable defaults

**8. timelineAndMilestones** (object):
   - projectDuration: Overall timeline (e.g., "10 weeks" or "Not specified")
   - proposalDueDate: Submission deadline (or "Not specified")
   - kickoffDate: Start date (or "Not specified")
   - fieldworkWindow: Data collection period (e.g., "Weeks 4-6" or "Not specified")
   - draftReportDate: Draft delivery (or "Not specified")
   - finalReportDate: Final delivery (or "Not specified")
   - keyMilestones: Array of dates/phases (e.g., ["Week 1: Kickoff", "Weeks 2-3: Guide dev"])

**9. budgetAndPricing** (object):
   - totalBudget: Budget amount or range (or "Not specified")
   - pricingStructureExpected: Format expected (e.g., "Itemized by phase" or "Not specified")
   - paymentTerms: Milestone-based, NET 30/60 (or "Not specified")
   - budgetConstraints: Any limitations (or "Not specified")

**10. evaluationCriteria** (object):
   - scoringWeights: How proposals scored (e.g., {"Experience": "25%", "Methodology": "25%", "Cost": "20%"})
   - keyFactors: What they value (e.g., ["Therapeutic area expertise", "HCP recruitment track record"])
   - referenceRequirements: References needed (or "Not specified")

**11. regulatoryCompliance** (object):
   - gdprRequired: true/false (if EU countries involved)
   - hipaaRequired: true/false (if US patient data)
   - otherCompliance: Array (e.g., ["FDA guidance adherence", "FCPA compliance"])
   - dataSecurity: Requirements mentioned (or "Not specified")

**12. additionalContext** (object):
   - backgroundInformation: Market/competitive context
   - priorResearch: Previous studies mentioned
   - assumptionsMade: Key assumptions you made during extraction
   - missingInformation: Critical gaps you identified

**13. confidenceScores** (object):
   - overall: 0-1 (how complete is this RFP?)
   - objectives: 0-1
   - methodology: 0-1
   - sample: 0-1
   - timeline: 0-1
   - budget: 0-1

Respond ONLY with valid JSON. No markdown code blocks, no explanation. Just the JSON object starting with { and ending with }.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const { rfpText, fileName } = context.data;

      const systemPrompt = this.getSystemPrompt(context);
      const userMessage = `Extract comprehensive requirements from this RFP document.

Document: ${fileName}

RFP Content:
${rfpText}

Extract ALL sections as specified. If information is missing, use "Not specified". Make reasonable inferences when needed.

Respond with ONLY the JSON object (no markdown, no code blocks).`;

      const response = await this.invokeAI(systemPrompt, userMessage, context);

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

      // Store in briefs table - map new structure to existing columns
      const sql = getSql();

      // Extract key fields from new structure for backward compatibility
      const researchObjectives = extractedData.researchObjectives || [];
      const targetAudience = extractedData.targetAudience?.primaryRespondents || "Not specified";
      const therapeuticArea = extractedData.executiveSummary?.therapeuticAreaContext ||
                              extractedData.coverInformation?.rfpTitle || "Not specified";
      const studyType = extractedData.scopeOfWork?.studyType || "Not specified";
      const deliverables = extractedData.keyDeliverables || [];
      const budgetIndication = extractedData.budgetAndPricing?.totalBudget ||
                               extractedData.coverInformation?.budgetRange || null;
      const timelineRequirements = extractedData.timelineAndMilestones?.projectDuration ||
                                   extractedData.coverInformation?.submissionDeadline || null;

      // Build comprehensive sample requirements object
      const sampleRequirements = {
        totalSize: extractedData.sampleSpecifications?.totalSampleSize || "Not specified",
        breakdown: extractedData.sampleSpecifications?.sampleBreakdown || {},
        quotas: extractedData.sampleSpecifications?.quotas || "Not specified",
        geographicCoverage: extractedData.scopeOfWork?.geographicCoverage || [],
        targetAudience: extractedData.targetAudience || {}
      };

      const confidenceScore = extractedData.confidenceScores?.overall || 0.75;

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
      console.log(`   Study Type: ${studyType}`);
      console.log(`   Sample Size: ${sampleRequirements.totalSize}`);
      console.log(`   Objectives: ${researchObjectives.length} identified`);
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
          extractionTimestamp: new Date().toISOString(),
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
