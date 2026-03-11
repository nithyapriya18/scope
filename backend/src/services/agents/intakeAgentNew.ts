/**
 * Intake Agent (Migrated to Phase 2 Architecture)
 *
 * Parses uploaded RFP files and extracts initial metadata
 * Now uses BidStateObject instead of direct database updates
 */

import { BaseAgent, AgentContext, AgentProcessResult } from './baseAgentNew.js';
import { BidState } from '../bidStateService.js';

export class IntakeAgent extends BaseAgent {
  protected agentType = 'intake';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are an RFP Intake Specialist for pharmaceutical primary market research.

Your task is to analyze the provided RFP document and extract initial metadata:

1. **Client Information**:
   - Client name/company
   - Contact person (if mentioned)
   - Email address

2. **RFP Metadata**:
   - RFP title/project name
   - Deadline for submission
   - Therapeutic area (e.g., Oncology, Cardiology, Diabetes)
   - Target geography/markets (countries/regions)

3. **Basic Requirements**:
   - High-level research objectives (brief summary)
   - Study type (Qualitative, Quantitative, Mixed Methods)

Extract as much information as possible from the document. If information is missing, note it as null.
Provide your response in structured JSON format.`;
  }

  protected async process(
    bidState: BidState,
    context: AgentContext
  ): Promise<AgentProcessResult> {
    const { rfpText, fileName } = context.data;

    if (!rfpText) {
      throw new Error('No RFP text provided');
    }

    // Invoke AI to extract metadata
    const systemPrompt = this.getSystemPrompt(context);
    const userMessage = `Please analyze this RFP document and extract the metadata:

Document filename: ${fileName}

Document content:
${rfpText}

**IMPORTANT INSTRUCTIONS:**

1. **rfpTitle**: Extract the ACTUAL project title or study name from INSIDE the document content (e.g., "Understanding Treatment Patterns for NSCLC in India", "Oncology Market Research Study"). Do NOT use the filename "${fileName}". Look for:
   - "Title:", "Project Title:", "Study Title:"
   - Header sections with the project name
   - Subject lines in email RFPs
   - The main heading of the RFP

2. **clientName**: Extract the organization issuing the RFP (pharma company, government agency, research institution)

3. **clientEmail**: Contact email if provided

4. **rfpDeadline**: Proposal submission deadline (extract as ISO date format YYYY-MM-DD)

5. **therapeuticArea**: Disease area/medical specialty (e.g., Oncology, Cardiology, Diabetes, CNS, etc.)

6. **geography**: Array of countries/regions where research will be conducted

7. **researchObjectives**: Brief array of key research goals (2-3 main objectives)

8. **studyType**: "Qualitative", "Quantitative", or "Mixed Methods"

9. **domain**: Classify as:
   - "pharma": Pharmaceutical market research (prescription drugs, treatment patterns, HCP prescribing behavior, clinical insights)
   - "medtech": Medical device/technology research (surgical devices, diagnostics, hospital equipment, healthcare IT)
   - "consumer_health": OTC products, wellness, nutrition, self-care, pharmacy research
   - "unknown": Cannot determine or not healthcare-related

Respond with a JSON object ONLY. If a field cannot be found, use null (not "Not specified" or empty string).`;

    const { response } = await this.invokeAI(systemPrompt, userMessage, bidState.opportunityId);

    // Parse JSON response
    let extractedData;
    try {
      // Extract JSON from response (may be wrapped in markdown)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        extractedData = JSON.parse(response);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', response);
      throw new Error('Failed to parse AI response');
    }

    console.log(`✅ Intake complete for opportunity ${bidState.opportunityId}`);

    // Return state updates (will be applied by BaseAgent)
    return {
      stateUpdates: {
        intake: {
          clientName: extractedData.clientName || '',
          rfpTitle: extractedData.rfpTitle || '',
          deadline: extractedData.rfpDeadline ? new Date(extractedData.rfpDeadline) : new Date(),
          therapeuticArea: extractedData.therapeuticArea || '',
          geography: extractedData.geography || []
        }
      },
      nextStep: 'brief_extract',
      event: 'BidIntakeCompleted',
      data: {
        ...extractedData,
        currentStatus: 'intake',
        nextStatus: 'brief_extract'
      },
      metadata: {
        confidence: 0.9
      }
    };
  }
}
