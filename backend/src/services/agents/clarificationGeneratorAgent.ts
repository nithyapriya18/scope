/**
 * Clarification Generator Agent
 * Generates intelligent clarification questions based on gap analysis
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

export class ClarificationGeneratorAgent extends BaseAgent {
  protected agentType = 'clarification';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are a PMR Clarification Specialist.

Your task is to generate professional, clear clarification questions based on identified gaps in the RFP brief.

Guidelines for generating questions:

1. **Be Specific**: Don't ask "What are your requirements?" - ask "What is the target sample size per market?"

2. **Prioritize**: Focus on critical and high-priority gaps first

3. **Group Logically**: Organize questions by category (Sample, Timeline, Deliverables, etc.)

4. **Professional Tone**: Maintain a helpful, consultative tone

5. **Provide Context**: Explain why you're asking (helps client understand importance)

6. **Offer Options**: Where appropriate, suggest options to make it easier for client to respond

For each question, provide:
- **category**: "sample", "timeline", "methodology", "deliverables", "budget", "other"
- **question**: The actual question text
- **priority**: "critical", "high", "medium", "low"
- **context**: Why this matters for the proposal (1 sentence)
- **suggestedOptions**: Array of possible answers (if applicable)

Generate 3-8 questions depending on gap selumina. Don't overwhelm the client with too many questions.

Respond with JSON containing: questions[], emailSubject, emailIntro, emailClosing.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      // Get gap analysis
      const sql = getSql();
      const gaps = await sql`
        SELECT
          ga.id,
          ga.missing_fields as "missingFields",
          ga.ambiguous_requirements as "ambiguousRequirements",
          ga.conflicting_info as "conflictingInfo",
          ga.llm_analysis as "llmAnalysis",
          b.research_objectives as "researchObjectives",
          b.target_audience as "targetAudience",
          o.rfp_title as "rfpTitle",
          o.client_name as "clientName"
        FROM gap_analyses ga
        JOIN briefs b ON ga.brief_id = b.id
        JOIN opportunities o ON b.opportunity_id = o.id
        WHERE o.id = ${context.opportunityId}
        ORDER BY ga.created_at DESC
        LIMIT 1
      `;

      if (gaps.length === 0) {
        return {
          success: false,
          error: 'No gap analysis found',
        };
      }

      const gapData = gaps[0];

      // Get job ID for progress tracking
      const { jobQueueService } = await import('../jobQueue');
      const jobs = await jobQueueService.getJobsByOpportunity(context.opportunityId);
      const currentJob = jobs.find(j => j.jobType === this.agentType && j.status === 'processing');

      // Update progress: 30% - Preparing questions
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 30, 'Analyzing gaps and preparing questions');
      }

      const systemPrompt = this.getSystemPrompt(context);
      const userMessage = `Generate professional clarification questions for this RFP:

**RFP Title**: ${gapData.rfpTitle}
**Client**: ${gapData.clientName}

**Identified Gaps**:
- Missing Fields: ${JSON.stringify(gapData.missingFields)}
- Ambiguous Requirements: ${JSON.stringify(gapData.ambiguousRequirements)}
- Conflicting Info: ${JSON.stringify(gapData.conflictingInfo)}

**Brief Context**:
- Research Objectives: ${JSON.stringify(gapData.researchObjectives)}
- Target Audience: ${gapData.targetAudience}

Generate 3-8 clarification questions with category, priority, context, and optional suggestedOptions for each.

Respond with JSON containing: questions[], emailSubject, emailIntro, emailClosing.`;

      // Update progress: 40% - Generating clarifications
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 40, 'Generating clarification questions with AI');
      }

      const response = await this.invokeAI(systemPrompt, userMessage, context);

      // Update progress: 70% - Formatting questions
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 70, 'Formatting clarification email');
      }

      // Parse JSON response
      let clarificationData;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          clarificationData = JSON.parse(jsonMatch[0]);
        } else {
          clarificationData = JSON.parse(response);
        }
      } catch (parseError) {
        console.error('Failed to parse clarification response:', response);
        return {
          success: false,
          error: 'Failed to parse clarification response',
        };
      }

      // Update progress: 80% - Saving to database
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 80, 'Saving clarification questions to database');
      }

      // Store clarification
      const result = await sql`
        INSERT INTO clarifications (
          opportunity_id,
          gap_analysis_id,
          questions,
          status,
          created_at,
          updated_at
        ) VALUES (
          ${context.opportunityId},
          ${gapData.id},
          ${JSON.stringify(clarificationData.questions)}::jsonb,
          'pending_approval',
          now(),
          now()
        )
        RETURNING id
      `;

      const clarificationId = result[0].id;

      // Update status to 'clarification' to show user this step
      await sql`
        UPDATE opportunities
        SET status = 'clarification', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      console.log(`✅ Generated ${clarificationData.questions.length} clarification questions for opportunity ${context.opportunityId}`);

      return {
        success: true,
        data: {
          clarificationId,
          ...clarificationData,
          questionsCount: clarificationData.questions.length,
          requiresApproval: true,
          currentStatus: 'clarification',
          nextStatus: 'clarification_response',
        },
      };
    } catch (error: any) {
      console.error('Clarification generator error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
