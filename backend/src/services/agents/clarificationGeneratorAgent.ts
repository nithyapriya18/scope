/**
 * Clarification Generator Agent — Step 5
 * Generates up to 8 prioritised clarification questions with stable IDs and default assumptions.
 * Only asks critical gaps; helpful gaps use defaultAssumptions silently.
 * Fully AI-driven: GOAL / INPUT / OUTPUT REQUIREMENTS pattern.
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

export class ClarificationGeneratorAgent extends BaseAgent {
  protected agentType = 'clarification';

  protected getSystemPrompt(_context: AgentContext): string {
    return `You are a Senior Research Director at PetaSight, a pharma market research firm.
Your job is to write a professional clarification email to the RFP client asking ONLY the most
critical questions needed to design a proposal. Keep questions concise, specific, and client-friendly.
Each question must have a default assumption PetaSight will use if no reply is received.
Output ONLY valid JSON. No markdown, no commentary.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const sql = getSql();

      const [[opp], [brief], [gapAnalysis], [assumptionAnalysis]] = await Promise.all([
        sql`SELECT email_body, rfp_title, client_name, client_email, client_company FROM opportunities WHERE id = ${context.opportunityId}`,
        sql`SELECT research_objectives, target_audience, therapeutic_area FROM briefs
            WHERE opportunity_id = ${context.opportunityId} ORDER BY created_at DESC LIMIT 1`,
        sql`SELECT ga.id, ga.llm_analysis, ga.missing_fields, ga.ambiguous_requirements
            FROM gap_analyses ga JOIN briefs b ON ga.brief_id = b.id
            WHERE b.opportunity_id = ${context.opportunityId} ORDER BY ga.created_at DESC LIMIT 1`,
        sql`SELECT aa.assumptions, aa.recommended_clarifications
            FROM assumption_analyses aa JOIN briefs b ON aa.brief_id = b.id
            WHERE b.opportunity_id = ${context.opportunityId} ORDER BY aa.created_at DESC LIMIT 1`,
      ]);

      if (!brief) return { success: false, error: 'No brief found for this opportunity' };

      const rawAssumptions = assumptionAnalysis?.assumptions;
      const assumptionsArr: any[] = Array.isArray(rawAssumptions)
        ? rawAssumptions
        : (typeof rawAssumptions === 'string' ? JSON.parse(rawAssumptions) : []);
      // Strip to minimal fields only — reduces token count significantly
      const clientDependent = assumptionsArr
        .filter((a: any) => a.type === 'clientDependent')
        .map((a: any) => ({ category: a.category, assumption: a.assumption, defaultValue: a.defaultValue }));

      const rawGaps = gapAnalysis?.missing_fields;
      const gapsArr: any[] = Array.isArray(rawGaps) ? rawGaps
        : (typeof rawGaps === 'string' ? JSON.parse(rawGaps) : []);
      const criticalGaps = gapsArr.slice(0, 10)
        .map((g: any) => ({ field: g.field || g.missingField, defaultAssumption: g.defaultAssumption }));

      const rawAmbiguous = gapAnalysis?.ambiguous_requirements;
      const ambiguousArr: any[] = Array.isArray(rawAmbiguous) ? rawAmbiguous
        : (typeof rawAmbiguous === 'string' ? JSON.parse(rawAmbiguous) : []);
      const ambiguous = ambiguousArr.slice(0, 6)
        .map((a: any) => ({ field: a.field, ambiguity: a.ambiguity }));

      const userMessage = `
=== GOAL ===
Write a professional clarification email to ${opp?.client_name || 'the client'} asking up to 8
critical questions about their RFP. Only ask about client-dependent gaps. For every question,
state the default assumption PetaSight will apply if no response is received within 5 business days.

=== INPUT 1: RFP CONTEXT ===
RFP Title: ${opp?.rfp_title || 'Not specified'}
Client: ${opp?.client_name || 'Not specified'}
Therapeutic area: ${brief.therapeutic_area || 'Not specified'}
Target audience: ${brief.target_audience || 'Not specified'}
Research objectives: ${JSON.stringify(brief.research_objectives || [])}

=== INPUT 2: CRITICAL GAPS ===
${JSON.stringify(criticalGaps)}

=== INPUT 3: AMBIGUOUS REQUIREMENTS ===
${JSON.stringify(ambiguous)}

=== INPUT 4: CLIENT-DEPENDENT ASSUMPTIONS ===
${JSON.stringify(clientDependent)}

=== OUTPUT REQUIREMENTS ===
Return a JSON object with ALL of the following:

1. questions: array of UP TO 8 questions, sorted by priority (critical first) — each item:
   {
     id: "Q001", "Q002", etc.,
     topic: short topic label (e.g. "Sample Size", "Target Audience"),
     questionText: the actual question to ask the client (professional, specific),
     fieldMapped: which brief field this answers (e.g. "sampleSize", "geography"),
     defaultAssumption: what PetaSight will assume if no reply,
     priority: "critical" | "helpful"
   }
   RULES:
   - Include ONLY "critical" priority questions (questions where no design is possible without answer)
   - Do NOT ask about things already clearly stated in the RFP
   - Do NOT ask for information PetaSight can decide unilaterally (methodology approach, discussion guide format)
   - Maximum 8 questions total

2. emailSubject: professional subject line for the clarification email

3. emailIntro: 2-3 sentence paragraph opening the email. Acknowledge the RFP, express interest,
   explain we have a few questions to ensure our proposal is fully aligned.

4. emailClosing: 2-3 sentence paragraph closing the email. State the 5-business-day default assumption
   policy. Professional and friendly tone.

Return ONLY the JSON object. No markdown.`;

      const response = await this.invokeAI(this.getSystemPrompt(context), userMessage, context);

      let clarificationData: any;
      try {
        let json = response.trim();
        if (json.startsWith('```')) json = json.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        const jsonMatch = json.match(/\{[\s\S]*\}/);
        clarificationData = JSON.parse(jsonMatch ? jsonMatch[0] : json);
      } catch {
        console.error('ClarificationGeneratorAgent: failed to parse JSON:', response.substring(0, 300));
        return { success: false, error: 'Failed to parse AI response as JSON' };
      }

      // Store full email content in the questions JSONB (includes intro/subject/closing)
      const questionsPayload = {
        questions: clarificationData.questions || [],
        emailSubject: clarificationData.emailSubject || `Clarification Questions — ${opp?.rfp_title || 'RFP'}`,
        emailIntro: clarificationData.emailIntro || '',
        emailClosing: clarificationData.emailClosing || '',
      };

      const [clarRow] = await sql`
        INSERT INTO clarifications (
          opportunity_id,
          gap_analysis_id,
          questions,
          status,
          created_at,
          updated_at
        ) VALUES (
          ${context.opportunityId},
          ${gapAnalysis?.id || null},
          ${JSON.stringify(questionsPayload)}::jsonb,
          'pending_approval',
          now(),
          now()
        )
        RETURNING id
      `;

      await sql`
        UPDATE opportunities
        SET status = 'clarification', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      console.log(`✅ Clarification generated: ${(clarificationData.questions || []).length} questions for ${opp?.client_name}`);

      return {
        success: true,
        data: {
          clarificationId: clarRow.id,
          questions: clarificationData.questions || [],
          emailSubject: questionsPayload.emailSubject,
          questionsCount: (clarificationData.questions || []).length,
          requiresApproval: true,
          currentStatus: 'clarification',
          nextStatus: 'clarification_response',
        },
      };
    } catch (error: any) {
      console.error('ClarificationGeneratorAgent error:', error);
      return { success: false, error: error.message };
    }
  }
}
