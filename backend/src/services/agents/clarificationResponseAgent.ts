/**
 * Clarification Response Parser Agent
 * Parses client responses to clarification questions and validates understanding
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

export class ClarificationResponseAgent extends BaseAgent {
  protected agentType = 'clarification_response';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are a PMR Clarification Response Analyst.

Your task is to parse client responses to:
1. **Clarification Questions** - questions we asked about missing/unclear information
2. **Assumptions** - assumptions we stated that the client can confirm, correct, or reject

CRITICAL: Parse EVERY question and EVERY assumption from the client's response. Do not skip any.

**For each answered question**, extract:
- **type**: "question"
- **questionId**: The original question number/ID (e.g., "Q1", "Q2")
- **question**: The original question text
- **answer**: The client's answer (extract the key information clearly)
- **confidence**: "high" | "medium" | "low" - how clear/complete is the answer
- **followUpNeeded**: true | false - does this need more clarification?
- **notes**: Any additional context or concerns

**For each assumption response**, extract:
- **type**: "assumption"
- **assumptionId**: The original assumption number/ID (e.g., "A1", "A2")
- **assumption**: The original assumption text we stated
- **clientResponse**: "confirmed" | "corrected" | "rejected" | "no response"
- **correctedValue**: If corrected, what is the corrected information?
- **notes**: Any clarification provided by the client

Also provide summary metrics:
- **questionsAnsweredCount**: Number of questions answered
- **questionsUnansweredCount**: Number of questions still unanswered
- **assumptionsConfirmedCount**: Number of assumptions confirmed
- **assumptionsCorrectedCount**: Number of assumptions corrected/rejected
- **newCompleteness**: Updated completeness score (0.0 - 1.0) based on responses received
- **criticalGapsRemaining**: Count of critical gaps still unresolved
- **readyToProceed**: true | false - do we have enough information to proceed?
- **summary**: Brief summary of what was clarified

**IMPORTANT PARSING RULES**:
1. Match questions/assumptions to answers even if formatting varies
2. Look for numbered responses (1., 2., Q1:, A:, etc.)
3. Look for inline responses (e.g., "Re: Question 3 about sample size...")
4. Extract key facts, numbers, dates, specifications precisely
5. If client says "TBD", "Not sure", "Will confirm later" → mark as unanswered/no response
6. If an assumption is not mentioned at all → treat as "confirmed" (silence = acceptance)
7. Associate EVERY item - do not leave any question or assumption unprocessed

Respond with valid JSON containing:
{
  "responses": [
    {
      "type": "question",
      "questionId": "Q1",
      "question": "What is the target sample size?",
      "answer": "30 HCPs across 3 therapeutic areas",
      "confidence": "high",
      "followUpNeeded": false,
      "notes": "Clear and specific"
    },
    {
      "type": "assumption",
      "assumptionId": "A1",
      "assumption": "Study will be conducted in US only",
      "clientResponse": "corrected",
      "correctedValue": "Study should include US and Canada",
      "notes": "Client wants to expand to Canada as well"
    }
  ],
  "questionsAnsweredCount": 5,
  "questionsUnansweredCount": 2,
  "assumptionsConfirmedCount": 3,
  "assumptionsCorrectedCount": 1,
  "newCompleteness": 0.85,
  "criticalGapsRemaining": 1,
  "readyToProceed": true,
  "summary": "Client answered 5/7 questions and corrected 1 assumption. Ready to proceed with minor gaps."
}`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const sql = getSql();

      // Get clarification questions, assumptions, and client response
      const clarifications = await sql`
        SELECT
          c.id,
          c.questions,
          c.assumptions,
          c.client_response_text as "clientResponseText",
          c.client_response_file as "clientResponseFile",
          ga.missing_fields as "missingFields",
          ga.ambiguous_requirements as "ambiguousRequirements"
        FROM clarifications c
        JOIN gap_analyses ga ON c.gap_analysis_id = ga.id
        WHERE c.opportunity_id = ${context.opportunityId}
        ORDER BY c.created_at DESC
        LIMIT 1
      `;

      if (clarifications.length === 0) {
        return {
          success: false,
          error: 'No clarification record found',
        };
      }

      const clarification = clarifications[0];

      if (!clarification.clientResponseText) {
        return {
          success: false,
          error: 'No client response text provided',
        };
      }

      // Get job for progress tracking
      const { jobQueueService } = await import('../jobQueue');
      const jobs = await jobQueueService.getJobsByOpportunity(context.opportunityId);
      const currentJob = jobs.find(j => j.jobType === this.agentType && j.status === 'processing');

      // Update progress: 30%
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 30, 'Analyzing client responses');
      }

      const systemPrompt = this.getSystemPrompt(context);

      const questions = JSON.parse(clarification.questions || '[]');
      const assumptions = JSON.parse(clarification.assumptions || '[]');

      const userMessage = `Parse the client's responses to our clarification questions and assumptions.

**Original Questions (${questions.length} total)**:
${JSON.stringify(questions, null, 2)}

**Original Assumptions (${assumptions.length} total)**:
${JSON.stringify(assumptions, null, 2)}

**Client Response Text**:
${clarification.clientResponseText}

**Original Gaps**:
- Missing Fields: ${JSON.stringify(clarification.missingFields)}
- Ambiguous Requirements: ${JSON.stringify(clarification.ambiguousRequirements)}

CRITICAL INSTRUCTIONS:
1. Parse EVERY question and find its answer in the client response
2. Parse EVERY assumption and determine if it was confirmed, corrected, or rejected
3. If an assumption is not mentioned in the response, treat it as "confirmed" (silence = acceptance)
4. Associate each response with its original question/assumption ID
5. Extract precise, complete answers - do not summarize or abbreviate

Analyze the responses and provide structured output with all questions and assumptions processed.`;

      // Update progress: 50%
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 50, 'Processing responses with AI');
      }

      const response = await this.invokeAI(systemPrompt, userMessage, context);

      // Update progress: 80%
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 80, 'Validating parsed responses');
      }

      // Parse JSON response
      let parsedResponses;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponses = JSON.parse(jsonMatch[0]);
        } else {
          parsedResponses = JSON.parse(response);
        }
      } catch (parseError) {
        console.error('Failed to parse response:', response);
        return {
          success: false,
          error: 'Failed to parse AI response',
        };
      }

      // Update clarification record with parsed responses
      console.log('Updating clarification:', {
        id: clarification.id,
        hasResponses: !!parsedResponses,
        questionsAnswered: parsedResponses.questionsAnsweredCount || 0,
        assumptionsConfirmed: parsedResponses.assumptionsConfirmedCount || 0,
        assumptionsCorrected: parsedResponses.assumptionsCorrectedCount || 0
      });

      await sql`
        UPDATE clarifications
        SET
          client_responses = ${JSON.stringify(parsedResponses)}::jsonb,
          responded_at = now(),
          status = 'responded',
          updated_at = now()
        WHERE id = ${clarification.id}
      `;

      // Update the brief with clarified information
      const brief = await sql`
        SELECT id, raw_extraction
        FROM briefs
        WHERE opportunity_id = ${context.opportunityId}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (brief.length > 0) {
        const currentBrief = brief[0];

        // Parse raw_extraction if it's a string
        let rawExtraction = currentBrief.raw_extraction;
        if (typeof rawExtraction === 'string') {
          try {
            rawExtraction = JSON.parse(rawExtraction);
          } catch (e) {
            console.error('Failed to parse raw_extraction:', e);
            rawExtraction = {};
          }
        } else if (!rawExtraction) {
          rawExtraction = {};
        }

        // Separate questions and assumptions from responses
        const questionResponses = parsedResponses.responses.filter((r: any) => r.type === 'question');
        const assumptionResponses = parsedResponses.responses.filter((r: any) => r.type === 'assumption');

        // Add clarified responses to the brief
        rawExtraction.clarifiedInformation = {
          questionResponses,
          assumptionResponses,
          questionsAnsweredCount: parsedResponses.questionsAnsweredCount || 0,
          questionsUnansweredCount: parsedResponses.questionsUnansweredCount || 0,
          assumptionsConfirmedCount: parsedResponses.assumptionsConfirmedCount || 0,
          assumptionsCorrectedCount: parsedResponses.assumptionsCorrectedCount || 0,
          completeness: parsedResponses.newCompleteness,
          criticalGapsRemaining: parsedResponses.criticalGapsRemaining,
          readyToProceed: parsedResponses.readyToProceed,
          summary: parsedResponses.summary,
          processedAt: new Date().toISOString(),
        };

        // Update brief with clarified information
        await sql`
          UPDATE briefs
          SET
            raw_extraction = ${JSON.stringify(rawExtraction)}::jsonb,
            updated_at = now()
          WHERE id = ${currentBrief.id}
        `;

        console.log(`✅ Brief updated with ${questionResponses.length} question responses and ${assumptionResponses.length} assumption responses`);
      }

      // Update opportunity status to clarification_response (new step)
      await sql`
        UPDATE opportunities
        SET
          status = 'clarification_response',
          updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      const totalProcessed = (parsedResponses.questionsAnsweredCount || 0) +
                              (parsedResponses.assumptionsConfirmedCount || 0) +
                              (parsedResponses.assumptionsCorrectedCount || 0);

      return {
        success: true,
        data: {
          clarificationId: clarification.id,
          parsedResponses,
          message: `Successfully processed ${totalProcessed} items: ${parsedResponses.questionsAnsweredCount || 0} questions answered, ${parsedResponses.assumptionsConfirmedCount || 0} assumptions confirmed, ${parsedResponses.assumptionsCorrectedCount || 0} assumptions corrected`,
        },
      };
    } catch (error) {
      console.error('Error in clarification response agent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
