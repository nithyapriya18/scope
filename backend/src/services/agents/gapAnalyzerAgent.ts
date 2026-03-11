/**
 * Gap Analyzer Agent
 * Detects missing or ambiguous information in the brief
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

export class GapAnalyzerAgent extends BaseAgent {
  protected agentType = 'gap_analysis';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are a PMR Gap Analysis Specialist.

Your task is to analyze extracted RFP briefs and identify information gaps that need clarification.

Analyze the brief and categorize gaps into:

**1. Missing Fields** (array):
   - Critical information that is completely absent
   - Examples: "sample_size", "timeline", "budget", "specific_hcp_criteria"

**2. Ambiguous Requirements** (array):
   - Information that is present but unclear or vague
   - Examples: "Unclear target specialty", "Vague research objectives", "Unspecified deliverable format"

**3. Conflicting Information** (array):
   - Contradictions or inconsistencies in the brief
   - Examples: "Timeline conflicts with sample size", "Budget too low for scope"

For each gap, assess:
- **Selumina**: "critical", "high", "medium", "low"
- **Impact**: How does this gap affect the proposal?

Prioritize gaps by selumina. Critical and high-selumina gaps MUST be clarified before proceeding.

Respond with JSON containing: missingFields[], ambiguousRequirements[], conflictingInfo[], overallCompleteness (0-1).`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      // Get the brief
      const sql = getSql();
      const briefs = await sql`
        SELECT
          id,
          research_objectives as "researchObjectives",
          target_audience as "targetAudience",
          therapeutic_area as "therapeuticArea",
          study_type as "studyType",
          sample_requirements as "sampleRequirements",
          timeline_requirements as "timelineRequirements",
          deliverables,
          budget_indication as "budgetIndication",
          confidence_score as "confidenceScore"
        FROM briefs
        WHERE opportunity_id = ${context.opportunityId}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (briefs.length === 0) {
        return {
          success: false,
          error: 'No brief found for this opportunity',
        };
      }

      const brief = briefs[0];

      const systemPrompt = this.getSystemPrompt(context);
      const userMessage = `Analyze this extracted brief and identify all information gaps:

${JSON.stringify(brief, null, 2)}

Respond with JSON containing: missingFields[], ambiguousRequirements[], conflictingInfo[], overallCompleteness, criticalGapsCount, highPriorityGapsCount.`;

      const response = await this.invokeAI(systemPrompt, userMessage, context);

      // Parse JSON response
      let gapAnalysis;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          gapAnalysis = JSON.parse(jsonMatch[0]);
        } else {
          gapAnalysis = JSON.parse(response);
        }
      } catch (parseError) {
        console.error('Failed to parse gap analysis:', response);
        return {
          success: false,
          error: 'Failed to parse gap analysis',
        };
      }

      // Store gap analysis
      const result = await sql`
        INSERT INTO gap_analyses (
          brief_id,
          missing_fields,
          ambiguous_requirements,
          conflicting_info,
          llm_analysis,
          created_at
        ) VALUES (
          ${brief.id},
          ${gapAnalysis.missingFields || []},
          ${gapAnalysis.ambiguousRequirements || []},
          ${gapAnalysis.conflictingInfo || []},
          ${JSON.stringify(gapAnalysis)}::jsonb,
          now()
        )
        RETURNING id
      `;

      const gapAnalysisId = result[0].id;

      // Update opportunity status to gap_analysis (user should see this step)
      await sql`
        UPDATE opportunities
        SET status = 'gap_analysis', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      // Determine next recommended step
      const hasCriticalGaps = gapAnalysis.criticalGapsCount > 0 || gapAnalysis.highPriorityGapsCount > 0;
      const nextStatus = hasCriticalGaps ? 'clarification' : 'scope_build';

      console.log(`✅ Gap analysis complete: ${gapAnalysis.criticalGapsCount} critical, ${gapAnalysis.highPriorityGapsCount} high priority gaps`);

      return {
        success: true,
        data: {
          gapAnalysisId,
          ...gapAnalysis,
          needsClarification: hasCriticalGaps,
          currentStatus: 'gap_analysis',
          nextStatus,
        },
        metadata: {
          confidence: gapAnalysis.overallCompleteness || 0.7,
        },
      };
    } catch (error: any) {
      console.error('Gap analyzer error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
