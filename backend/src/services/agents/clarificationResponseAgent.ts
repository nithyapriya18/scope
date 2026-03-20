/**
 * Clarification Response Agent — Step 6
 * Parses client response, matches answers to question IDs, updates brief columns directly.
 * Fully AI-driven: GOAL / INPUT / OUTPUT REQUIREMENTS pattern.
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

export class ClarificationResponseAgent extends BaseAgent {
  protected agentType = 'clarification_response';

  protected getSystemPrompt(_context: AgentContext): string {
    return `You are a Senior PMR Research Strategist at PetaSight, a pharma market research firm.
Your job is to read a client's email response to clarification questions and map each answer to
the specific question it addresses. For any question not answered, apply the stated default assumption.
Output ONLY valid JSON. No markdown, no commentary.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const sql = getSql();

      const [[clarification], [brief]] = await Promise.all([
        sql`SELECT id, questions, client_response_text FROM clarifications
            WHERE opportunity_id = ${context.opportunityId}
            ORDER BY created_at DESC LIMIT 1`,
        sql`SELECT id, study_type, target_audience, therapeutic_area, research_objectives,
                   sample_requirements, timeline_requirements, deliverables, budget_indication,
                   raw_extraction
            FROM briefs WHERE opportunity_id = ${context.opportunityId}
            ORDER BY created_at DESC LIMIT 1`,
      ]);

      if (!clarification) return { success: false, error: 'No clarification record found' };
      if (!brief) return { success: false, error: 'No brief found for this opportunity' };

      // Extract questions array from the stored payload
      let questionsPayload: any = clarification.questions || {};
      if (typeof questionsPayload === 'string') {
        try { questionsPayload = JSON.parse(questionsPayload); } catch { questionsPayload = {}; }
      }
      const questions: any[] = questionsPayload.questions || (Array.isArray(questionsPayload) ? questionsPayload : []);

      const hasClientResponse = !!clarification.client_response_text;

      const userMessage = `
=== GOAL ===
Parse the client's response to the clarification questions below.
For each question ID: extract the answer if given, or apply the default assumption.
Then produce a briefUpdates map of field names → updated values to patch the brief directly.

=== INPUT 1: CLARIFICATION QUESTIONS (with IDs and defaults) ===
${JSON.stringify(questions, null, 2)}

=== INPUT 2: CLIENT RESPONSE ===
${hasClientResponse
  ? clarification.client_response_text
  : '(No client response received — apply ALL default assumptions)'}

=== INPUT 3: CURRENT BRIEF STATE ===
Study type: ${brief.study_type}
Therapeutic area: ${brief.therapeutic_area}
Target audience: ${brief.target_audience}
Research objectives: ${JSON.stringify(brief.research_objectives || [])}
Sample requirements: ${JSON.stringify(brief.sample_requirements || {})}
Timeline: ${brief.timeline_requirements}
Deliverables: ${JSON.stringify(brief.deliverables || [])}
Budget: ${brief.budget_indication}

=== OUTPUT REQUIREMENTS ===
Return a JSON object with ALL of the following:

1. answeredQuestions: array of questions the client explicitly addressed — each item:
   {id, answer, confidence: "high"|"medium"|"low", fieldMapped}

2. assumedQuestions: array of questions the client did NOT address (default applied) — each item:
   {id, appliedDefault, reason: "not addressed in response"|"no response received"}

3. briefUpdates: object mapping brief field names to new values extracted from answers/defaults.
   Only include fields where the value actually changed or was newly provided.
   Keys: "study_type", "target_audience", "therapeutic_area", "timeline_requirements",
         "budget_indication", "deliverables" (array), "sample_requirements" (object)

4. updatedCompleteness: 0-100 integer — estimated completeness after applying these updates

5. readyToProceed: boolean — can we move to feasibility assessment?

6. summary: 2-3 sentences describing what was confirmed, corrected, or assumed.

Return ONLY the JSON object. No markdown.`;

      let parsedResponses: any = null;

      try {
        const response = await this.invokeAI(this.getSystemPrompt(context), userMessage, context);
        let json = response.trim();
        if (json.startsWith('```')) json = json.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        const jsonMatch = json.match(/\{[\s\S]*\}/);
        parsedResponses = JSON.parse(jsonMatch ? jsonMatch[0] : json);
      } catch (aiError) {
        console.error('ClarificationResponseAgent: AI/parse failed — using fallback:', aiError);
        // Fallback: confirm all with defaults
        parsedResponses = {
          answeredQuestions: [],
          assumedQuestions: questions.map((q: any) => ({
            id: q.id,
            appliedDefault: q.defaultAssumption || 'Not specified',
            reason: hasClientResponse ? 'not addressed in response' : 'no response received',
          })),
          briefUpdates: {},
          updatedCompleteness: 60,
          readyToProceed: true,
          summary: hasClientResponse
            ? 'Response received but could not be fully parsed — proceeding with default assumptions.'
            : 'No client response received — all default assumptions applied.',
        };
      }

      // Always mark clarification as responded
      await sql`
        UPDATE clarifications
        SET client_responses = ${JSON.stringify(parsedResponses)}::jsonb,
            responded_at = now(), status = 'responded', updated_at = now()
        WHERE id = ${clarification.id}
      `;

      // Apply briefUpdates to the brief table directly
      const updates = parsedResponses.briefUpdates || {};
      const patchFields: Record<string, any> = {};

      if (updates.study_type) patchFields.study_type = updates.study_type;
      if (updates.target_audience) patchFields.target_audience = updates.target_audience;
      if (updates.therapeutic_area) patchFields.therapeutic_area = updates.therapeutic_area;
      if (updates.timeline_requirements) patchFields.timeline_requirements = updates.timeline_requirements;
      if (updates.budget_indication) patchFields.budget_indication = updates.budget_indication;
      if (updates.deliverables) patchFields.deliverables = updates.deliverables;

      // Always patch raw_extraction with clarifiedInformation
      let rawExtraction = brief.raw_extraction || {};
      if (typeof rawExtraction === 'string') {
        try { rawExtraction = JSON.parse(rawExtraction); } catch { rawExtraction = {}; }
      }
      rawExtraction.clarifiedInformation = {
        answeredQuestions: parsedResponses.answeredQuestions || [],
        assumedQuestions: parsedResponses.assumedQuestions || [],
        briefUpdates: updates,
        source: hasClientResponse ? 'client_response' : 'assumed',
        processedAt: new Date().toISOString(),
      };
      if (updates.sample_requirements) {
        rawExtraction.clarifiedSampleRequirements = updates.sample_requirements;
      }

      await sql`
        UPDATE briefs
        SET
          study_type           = ${patchFields.study_type           ?? brief.study_type},
          target_audience      = ${patchFields.target_audience      ?? brief.target_audience},
          therapeutic_area     = ${patchFields.therapeutic_area     ?? brief.therapeutic_area},
          timeline_requirements= ${patchFields.timeline_requirements?? brief.timeline_requirements},
          budget_indication    = ${patchFields.budget_indication    ?? brief.budget_indication},
          deliverables         = ${patchFields.deliverables         ?? brief.deliverables},
          raw_extraction       = ${JSON.stringify(rawExtraction)}::jsonb,
          updated_at           = now()
        WHERE id = ${brief.id}
      `;

      await sql`
        UPDATE opportunities
        SET status = 'clarification_response', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      console.log(`✅ Clarification response processed: ${(parsedResponses.answeredQuestions || []).length} answered, ${(parsedResponses.assumedQuestions || []).length} assumed`);
      console.log(`   briefUpdates applied: ${Object.keys(updates).join(', ') || 'none'}`);

      return {
        success: true,
        data: {
          clarificationId: clarification.id,
          answeredQuestions: parsedResponses.answeredQuestions || [],
          assumedQuestions: parsedResponses.assumedQuestions || [],
          briefUpdatesApplied: Object.keys(updates),
          updatedCompleteness: parsedResponses.updatedCompleteness || 60,
          readyToProceed: parsedResponses.readyToProceed ?? true,
          currentStatus: 'clarification_response',
          nextStatus: 'feasibility',
        },
        metadata: { confidence: 0.85 },
      };
    } catch (error: any) {
      console.error('ClarificationResponseAgent error:', error);
      return { success: false, error: error.message };
    }
  }
}
