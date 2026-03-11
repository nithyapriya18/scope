/**
 * Brief Extractor Agent (Migrated to Phase 2 Architecture)
 *
 * Extracts structured requirements from RFP document
 * Now uses BidStateObject instead of direct database updates
 */

import { BaseAgent, AgentContext, AgentProcessResult } from './baseAgentNew.js';
import { BidState } from '../bidStateService.js';

export class BriefExtractorAgent extends BaseAgent {
  protected agentType = 'brief_extraction';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are a PMR Brief Extraction Specialist with deep expertise in pharmaceutical market research.

Your task is to analyze RFP documents and extract comprehensive, structured requirements for primary market research studies.

Extract the following information:

**1. Research Objectives** (array of strings):
   - What insights does the client want to gain?
   - What questions need to be answered?
   - Be specific and actionable

**2. Target Audience**:
   - Who should be interviewed/surveyed? (e.g., "Oncologists treating NSCLC", "Cardiologists in private practice")

**3. Therapeutic Area**:
   - Disease/condition focus (e.g., "Non-Small Cell Lung Cancer", "Heart Failure")

**4. Study Type**:
   - "Qualitative", "Quantitative", or "Mixed Methods"

**5. Sample Requirements** (JSON object):
   - Markets: Array of countries/regions
   - Sample sizes: { "US": 30, "UK": 20, ... }
   - HCP criteria: { "specialties": [], "yearsExperience": [min, max], "practiceSettings": [] }

**6. Timeline Requirements**:
   - Project duration, key milestones, deadline

**7. Deliverables** (array):
   - What outputs are expected? (e.g., "Final Report", "Executive Summary", "Raw Data")

**8. Budget Indication** (if mentioned):
   - Budget range or constraints

For each extracted field, assess your confidence (0-1). If information is missing or unclear, mark it as null and set confidence accordingly.

Respond with JSON containing all fields plus a confidenceScore (overall).`;
  }

  protected async process(
    bidState: BidState,
    context: AgentContext
  ): Promise<AgentProcessResult> {
    const { rfpText, fileName } = context.data;

    const systemPrompt = this.getSystemPrompt(context);
    const userMessage = `Extract comprehensive requirements from this RFP:

Document: ${fileName}

Content:
${rfpText}

Respond with JSON containing: researchObjectives[], targetAudience, therapeuticArea, studyType, sampleRequirements{}, timelineRequirements, deliverables[], budgetIndication, confidenceScore.`;

    const { response } = await this.invokeAI(systemPrompt, userMessage, bidState.opportunityId);

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
      throw new Error('Failed to parse AI response');
    }

    console.log(`✅ Brief extraction complete for opportunity ${bidState.opportunityId}, confidence: ${extractedData.confidenceScore || 0.8}`);

    // Return state updates (will be applied by BaseAgent)
    return {
      stateUpdates: {
        brief: {
          objectives: extractedData.researchObjectives || [],
          targetAudience: extractedData.targetAudience || '',
          studyType: extractedData.studyType || 'qualitative',
          sampleRequirements: extractedData.sampleRequirements || {},
          deliverables: extractedData.deliverables || []
        }
      },
      nextStep: 'gap_analysis',
      event: 'BriefExtractionCompleted',
      data: {
        ...extractedData,
        currentStatus: 'brief_extract',
        nextStatus: 'gap_analysis'
      },
      metadata: {
        confidence: extractedData.confidenceScore || 0.8
      }
    };
  }
}
