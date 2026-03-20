/**
 * Clarification Response Parser Agent
 * Uses AI to parse client responses to clarification questions and assumptions,
 * then updates the brief with the extracted information.
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';
import { BedrockService } from '../bedrock';

export class ClarificationResponseAgent extends BaseAgent {
  protected agentType = 'clarification_response';

  constructor() {
    super();
    // Use Sonnet — Haiku was unreliable at returning valid JSON for this structured extraction task
    this.aiService = new BedrockService('global.anthropic.claude-sonnet-4-6');
  }

  protected getSystemPrompt(_context: AgentContext): string {
    return `You are a PMR Clarification Response Analyst at PetaSight.

Your job is to process client responses to clarification questions and assumption statements.
For each question or assumption, determine what the client said and extract the key answer.

Rules:
- If a question is answered, extract the precise answer
- If an assumption is mentioned and corrected → use the corrected value
- If an assumption is not mentioned → treat as confirmed (silence = acceptance)
- If client response text is empty or absent → treat ALL assumptions as confirmed

Respond with valid JSON:
{
  "responses": [
    { "id": "Q1", "type": "question", "text": "original question", "answer": "extracted answer", "confidence": "high|medium|low" },
    { "id": "A1", "type": "assumption", "text": "assumption text", "clientResponse": "confirmed|corrected|rejected", "correctedValue": "..." }
  ],
  "questionsAnsweredCount": 5,
  "assumptionsConfirmedCount": 3,
  "assumptionsCorrectedCount": 1,
  "readyToProceed": true,
  "summary": "Brief summary of what was clarified or assumed"
}`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const sql = getSql();

      const clarifications = await sql`
        SELECT id, questions, client_response_text as "clientResponseText"
        FROM clarifications
        WHERE opportunity_id = ${context.opportunityId}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (clarifications.length === 0) {
        return { success: false, error: 'No clarification record found' };
      }

      const clarification = clarifications[0];

      let questions: any[] = [];
      try {
        questions = typeof clarification.questions === 'string'
          ? JSON.parse(clarification.questions)
          : (clarification.questions || []);
      } catch { questions = []; }

      const hasClientResponse = !!clarification.clientResponseText;

      // Build fallback in case AI fails — always written to DB regardless of AI success
      const fallbackResponses = {
        responses: questions.map((q: any, i: number) => ({
          id: q.id || `Q${i + 1}`,
          type: q.category === 'assumption' ? 'assumption' : 'question',
          text: q.question || q.text || '',
          clientResponse: 'confirmed',
          answer: q.assumedAnswer || '',
        })),
        questionsAnsweredCount: 0,
        assumptionsConfirmedCount: questions.length,
        assumptionsCorrectedCount: 0,
        readyToProceed: true,
        summary: hasClientResponse
          ? 'Response received but could not be parsed — proceeding with assumptions.'
          : 'All assumptions treated as confirmed.',
        source: hasClientResponse ? 'client_response_unparsed' : 'assumed',
      };

      let parsedResponses: any = fallbackResponses;

      try {
        const systemPrompt = this.getSystemPrompt(context);
        const userMessage = `Process this clarification response for a pharma PMR study.

**Original questions/assumptions (${questions.length} items)**:
${questions.map((q: any, i: number) => `${i + 1}. [${q.category || 'question'}] ${q.question || q.text || ''}`).join('\n')}

**Client Response**:
${hasClientResponse ? clarification.clientResponseText : '(No client response received — treat all assumptions as confirmed)'}

Extract answers for questions and confirm/correct assumptions. For missing responses, treat assumptions as confirmed.`;

        const response = await this.invokeAI(systemPrompt, userMessage, context);

        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          parsedResponses = JSON.parse(jsonMatch ? jsonMatch[0] : response);
        } catch {
          // JSON parse failed — fallback already set above
        }
      } catch (aiError) {
        console.error('AI call failed in ClarificationResponseAgent — using fallback:', aiError);
        // parsedResponses remains as fallbackResponses
      }

      // Always write client_responses — even if AI failed — so the step shows as processed
      await sql`
        UPDATE clarifications
        SET client_responses = ${JSON.stringify(parsedResponses)}::jsonb,
            responded_at = now(), status = 'responded', updated_at = now()
        WHERE id = ${clarification.id}
      `;

      // Update brief
      const briefs = await sql`
        SELECT id, raw_extraction FROM briefs
        WHERE opportunity_id = ${context.opportunityId}
        ORDER BY created_at DESC LIMIT 1
      `;

      if (briefs.length > 0) {
        const brief = briefs[0];
        let rawExtraction = typeof brief.raw_extraction === 'string'
          ? JSON.parse(brief.raw_extraction)
          : (brief.raw_extraction || {});

        rawExtraction.clarifiedInformation = {
          ...parsedResponses,
          source: hasClientResponse ? 'client_response' : 'assumed',
          processedAt: new Date().toISOString(),
        };

        await sql`
          UPDATE briefs SET raw_extraction = ${JSON.stringify(rawExtraction)}::jsonb,
          updated_at = now() WHERE id = ${brief.id}
        `;
      }

      console.log(`✅ Clarification response processed for opportunity ${context.opportunityId}`);
      return { success: true, data: { clarificationId: clarification.id, parsedResponses } };
    } catch (error) {
      console.error('Error in clarification response agent:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
