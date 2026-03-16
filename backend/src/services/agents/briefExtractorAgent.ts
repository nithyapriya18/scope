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
    return `You are a PMR Brief Extraction Specialist. Map RFP content to the standard 13-section template.

**STANDARD RFP TEMPLATE SECTIONS**:
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

**EXTRACTION RULES**:
- Map RFP content to template sections (some may be missing/incomplete)
- Mark each section: COMPLETE (all fields filled), PARTIAL (some fields missing), MISSING (no content)
- Keep responses SHORT: 1-2 sentences per field
- Extract EXACTLY what is in the RFP (don't infer or assume)
- Use "Not specified" for missing fields

**OUTPUT JSON STRUCTURE**:
{
  "templateCoverage": {
    "section1_contact": "COMPLETE|PARTIAL|MISSING",
    "section2_company": "COMPLETE|PARTIAL|MISSING",
    ... (all 13 sections)
  },
  "section1_contact": {field1: value, field2: value, ...},
  "section2_company": {...},
  ...
  "section13_evaluation": {...},
  "overallCompletenessPercent": 0-100,
  "completeSections": 5,
  "missingSections": 3
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
      const userMessage = `Extract and map this RFP to the standard 13-section template.

Document: ${fileName}

RFP Content:
${rfpText}

**TASK**:
1. Identify which template sections are present in the RFP (COMPLETE/PARTIAL/MISSING)
2. Extract all fields from each present section
3. Mark missing sections clearly

For each section present in the RFP:
- Extract EXACT values (don't infer)
- Use "Not specified" for fields mentioned but without detail
- Preserve section hierarchy

Return templateCoverage map + extracted data for each section.

Respond with ONLY JSON (no markdown).`;

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

      // Extract from template-mapped structure
      const templateCoverage = extractedData.templateCoverage || {};
      const completeSections = extractedData.completeSections || 0;
      const missingSections = extractedData.missingSections || 0;
      const overallCompletenessPercent = extractedData.overallCompletenessPercent || 0;

      // Extract key fields for backward compatibility
      const section1 = extractedData.section1_contact_issuer || {};
      const section4 = extractedData.section4_project_background_context || {};
      const section5 = extractedData.section5_business_research_objectives || {};
      const section6 = extractedData.section6_methodology_scope || {};
      const section7 = extractedData.section7_markets_geography || {};
      const section8 = extractedData.section8_target_audience_sample || {};
      const section9 = extractedData.section9_timeline_key_dates || {};
      const section10 = extractedData.section10_deliverables || {};
      const section11 = extractedData.section11_budget_cost || {};

      const researchObjectives = section5.researchObjectives || [];
      const businessObjectives = section5.businessObjectives || [];
      const targetAudience = section8.primaryTargetAudience || "Not specified";
      const therapeuticArea = section4.therapeuticArea || section1.therapeuticArea || "Not specified";
      const studyType = section6.primaryMethodology || "Not specified";
      const deliverables = section10.deliverables || [];
      const budgetIndication = section11.budgetRange || null;
      const timelineRequirements = section9.projectTimeline || null;

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
