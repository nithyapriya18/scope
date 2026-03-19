/**
 * Clarification Generator Agent
 * Generates intelligent clarification questions based on gap analysis
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

export class ClarificationGeneratorAgent extends BaseAgent {
  protected agentType = 'clarification';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are a PMR Clarification Specialist preparing a formal email to the RFP issuer.

Your task: generate ONE question/item for EVERY gap identified in the analysis. Do not skip any gap.

**You MUST cover all four categories — generate one entry per item in each list:**

1. **Missing Information** — one question per missing field asking for the specific data
2. **Ambiguous Requirements** — one item per ambiguity stating the assumption PetaSight will proceed with, and asking the client to approve or correct it
3. **Conflicting Information** — one item per conflict presenting both statements and asking which is correct
4. **Assumptions Requiring Approval** — for any gap where PetaSight must proceed regardless, state the assumption explicitly and ask for sign-off

**Rules:**
- Be specific, not generic. Reference the actual field/section name.
- For ambiguous items: state "We will assume [X] unless you advise otherwise."
- For conflicts: quote both statements and ask which applies.
- Professional, consultative tone throughout.
- No arbitrary question limit — cover every identified gap.

For each entry output:
- **category**: "missing" | "ambiguous" | "conflict" | "assumption"
- **question**: The question or assumption statement
- **priority**: "critical" | "high" | "medium"
- **context**: One sentence on why this affects the proposal
- **suggestedOptions**: Array of options if applicable (optional)

Respond with JSON: { questions[], emailSubject, emailIntro, emailClosing }`;
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

**Identified Gaps** (MUST address ALL THREE types):

1. **Missing Fields** (Information not provided):
${JSON.stringify(gapData.missingFields, null, 2)}

2. **Ambiguous Requirements** (Unclear or vague information):
${JSON.stringify(gapData.ambiguousRequirements, null, 2)}

3. **Conflicting Information** (Contradictory statements):
${JSON.stringify(gapData.conflictingInfo, null, 2)}

**Brief Context**:
- Research Objectives: ${JSON.stringify(gapData.researchObjectives)}
- Target Audience: ${gapData.targetAudience}

**REQUIREMENT**: Generate one entry for EVERY item in each list above — do not merge or skip any gap.
- Missing fields → ask for the specific data
- Ambiguous requirements → state the assumption PetaSight will proceed with, ask for approval or correction
- Conflicting info → quote both values, ask which is correct
- Any critical/high gap without a clear answer → add as an explicit assumption requiring sign-off

Respond with JSON: { questions[], emailSubject, emailIntro, emailClosing }`;

      // Update progress: 40% - Generating clarifications
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 40, 'Generating clarification questions with AI');
      }

      const response = await this.invokeAI(systemPrompt, userMessage, context);

      // Update progress: 70% - Formatting questions
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 70, 'Formatting clarification email');
      }

      // Parse JSON response — strip markdown code fences if present
      let clarificationData;
      try {
        let cleaned = response.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
        }
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        clarificationData = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
      } catch (parseError) {
        console.error('Failed to parse clarification response:', response.slice(0, 500));
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
