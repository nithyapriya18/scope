/**
 * Intake Agent
 * Parses uploaded RFP files and extracts initial metadata
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

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

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const { rfpText, fileName } = context.data;

      if (!rfpText) {
        return {
          success: false,
          error: 'No RFP text provided',
        };
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

      const response = await this.invokeAI(systemPrompt, userMessage, context);

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
        return {
          success: false,
          error: 'Failed to parse AI response',
        };
      }

      // Update opportunity record
      const sql = getSql();
      await sql`
        UPDATE opportunities
        SET
          client_name = ${extractedData.clientName || null},
          client_email = ${extractedData.clientEmail || null},
          rfp_title = ${extractedData.rfpTitle || null},
          rfp_deadline = ${extractedData.rfpDeadline || null},
          therapeutic_area = ${extractedData.therapeuticArea || null},
          geography = ${extractedData.geography || []},
          domain = ${extractedData.domain || 'unknown'},
          status = 'intake',
          updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      console.log(`✅ Intake complete for opportunity ${context.opportunityId}`);

      return {
        success: true,
        data: {
          ...extractedData,
          currentStatus: 'intake',
          nextStatus: 'brief_extract',
        },
        metadata: {
          confidence: 0.9,
        },
      };
    } catch (error: any) {
      console.error('Intake agent error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
