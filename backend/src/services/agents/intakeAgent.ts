/**
 * Intake Agent — Step 1
 * Extracts RFP metadata AND classifies the study family/type from raw RFP text.
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

export class IntakeAgent extends BaseAgent {
  protected agentType = 'intake';

  protected getSystemPrompt(_context: AgentContext): string {
    return `You are an RFP Intake Specialist at PetaSight, a pharma primary market research firm.
Your job is to read the raw RFP text and extract every piece of metadata with high accuracy.
Every field you extract must come directly from the text — do not invent or assume values not present.
Output ONLY valid JSON. No markdown, no commentary.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const { rfpText, fileName } = context.data;
      if (!rfpText) return { success: false, error: 'No RFP text provided' };

      const rfpSnippet = rfpText.length > 6000
        ? rfpText.slice(0, 6000) + '\n...[truncated]'
        : rfpText;

      const userMessage = `
=== GOAL ===
Extract all RFP metadata from the document below. In addition, classify the study family and
initial study type. Output confidence scores for each key field so downstream agents know
which fields are reliable vs. uncertain.

=== INPUT: RFP TEXT (first 6000 chars) ===
Filename: ${fileName || 'unknown'}

${rfpSnippet}

=== REFERENCE: STUDY FAMILIES ===
${STUDY_FAMILIES}

=== OUTPUT REQUIREMENTS ===
1. rfpTitle: The actual project/study name from inside the document (NOT the filename)
2. clientName: Organisation issuing the RFP (pharma company name)
3. clientEmail: Submission/contact email address (null if not found)
4. clientContact: Named contact person (null if not found)
5. rfpDeadline: Proposal submission deadline as YYYY-MM-DD (null if not stated)
6. therapeuticArea: Disease/indication area (e.g. Oncology, Cardiology, Diabetes, CNS)
7. geography: Array of country/region strings where research will be conducted
8. researchObjectives: Array of 2-5 verbatim or near-verbatim research objectives from the RFP
9. studyType: "Qualitative" | "Quantitative" | "Mixed Methods"
10. studyFamily: One of the 6 family codes from the reference above (e.g. UNDERSTANDING_DIAGNOSIS)
11. studyFamilyRationale: 1 sentence explaining why this family was chosen
12. domain: "pharma" | "medtech" | "consumer_health" | "unknown"
13. languageDetected: ISO 639-1 code of the RFP language (e.g. "en", "de", "fr")
14. confidenceScores: object with keys clientName, therapeuticArea, rfpDeadline, geography,
    studyFamily — each value is "high" | "medium" | "low"
15. isDuplicate: false (always false at intake; duplicate detection is a future feature)

Return ONLY this JSON:
{
  "rfpTitle": "",
  "clientName": "",
  "clientEmail": null,
  "clientContact": null,
  "rfpDeadline": null,
  "therapeuticArea": "",
  "geography": [],
  "researchObjectives": [],
  "studyType": "Qualitative",
  "studyFamily": "UNDERSTANDING_DIAGNOSIS",
  "studyFamilyRationale": "",
  "domain": "pharma",
  "languageDetected": "en",
  "confidenceScores": {
    "clientName": "high",
    "therapeuticArea": "high",
    "rfpDeadline": "low",
    "geography": "high",
    "studyFamily": "high"
  },
  "isDuplicate": false
}`;

      const response = await this.invokeAI(this.getSystemPrompt(context), userMessage, context);

      let extractedData: any;
      try {
        let json = response.trim();
        if (json.startsWith('```')) json = json.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        extractedData = JSON.parse(json);
      } catch {
        console.error('IntakeAgent: failed to parse JSON:', response.substring(0, 300));
        return { success: false, error: 'Failed to parse AI response as JSON' };
      }

      const sql = getSql();
      await sql`
        UPDATE opportunities
        SET
          client_name    = ${extractedData.clientName || null},
          client_email   = ${extractedData.clientEmail || null},
          rfp_title      = ${extractedData.rfpTitle || null},
          rfp_deadline   = ${extractedData.rfpDeadline || null},
          therapeutic_area = ${extractedData.therapeuticArea || null},
          geography      = ${extractedData.geography || []},
          domain         = ${extractedData.domain || 'unknown'},
          status         = 'intake',
          updated_at     = now()
        WHERE id = ${context.opportunityId}
      `;

      console.log(`✅ Intake complete: ${extractedData.rfpTitle} | ${extractedData.studyFamily} | ${extractedData.therapeuticArea}`);

      return {
        success: true,
        data: { ...extractedData, currentStatus: 'intake', nextStatus: 'brief_extract' },
        metadata: { confidence: extractedData.confidenceScores?.clientName === 'high' ? 0.9 : 0.7 },
      };
    } catch (error: any) {
      console.error('IntakeAgent error:', error);
      return { success: false, error: error.message };
    }
  }
}
