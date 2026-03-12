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
    return `You are a PMR Brief Extraction Specialist. Extract key requirements from RFP documents in a CONCISE format.

**CRITICAL**: Keep responses SHORT. Maximum 1-2 sentences per field. Use bullet points where appropriate.

Extract these sections:

**1. coverInformation**: {rfpTitle, issuedBy, submissionDeadline, budgetRange}
**2. executiveSummary**: {therapeuticAreaContext (1 sentence), oneLinerSummary (1 sentence)}
**3. researchObjectives**: Array of 2-5 brief objectives
**4. scopeOfWork**: {studyType, methodologyDetails (2-3 sentences max), geographicCoverage (array), interviewDuration, dataCollectionMode}
**5. targetAudience**: {primaryRespondents, selectionCriteria (array of 3-5 items), minimumExperience, minimumPatientVolume}
**6. sampleSpecifications**: {totalSampleSize, sampleBreakdown (brief object), quotas (brief string)}
**7. keyDeliverables**: Array of 5-8 deliverable names (no descriptions)
**8. timelineAndMilestones**: {projectDuration, proposalDueDate, finalReportDate, keyMilestones (array of 3-5 brief items)}
**9. budgetAndPricing**: {totalBudget, pricingStructureExpected (brief)}
**10. evaluationCriteria**: {keyFactors (array of 3-5 brief items)}
**11. regulatoryCompliance**: {gdprRequired (boolean), hipaaRequired (boolean), otherCompliance (array of 2-3 items)}
**12. confidenceScores**: {overall, objectives, methodology, sample, timeline, budget} (all 0-1)

**RULES**:
- Use "Not specified" for missing info
- Keep ALL text concise - no long explanations
- Respond with ONLY valid JSON (no markdown, no explanation)`;
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
      const userMessage = `Extract requirements from this RFP. Keep responses BRIEF and CONCISE.

Document: ${fileName}

RFP Content:
${rfpText}

Extract ALL sections. Be CONCISE - maximum 1-2 sentences per field. Use "Not specified" for missing info.

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
