/**
 * Gap Analyzer Agent
 * Detects missing or ambiguous information in the brief
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

export class GapAnalyzerAgent extends BaseAgent {
  protected agentType = 'gap_analysis';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are a PMR Gap Analysis Specialist. Identify critical information gaps in RFPs.

Analyze the brief and categorize gaps. **BE CONCISE** - keep descriptions under 100 characters:

**1. Missing Critical Fields**:
{
  "field": "Brief field name (e.g., 'Sample Size')",
  "priority": "critical" | "high" | "medium",
  "description": "What's missing (MAX 80 chars)",
  "impact": "Why it matters (MAX 80 chars)"
}

**2. Ambiguous Requirements**:
{
  "requirement": "Requirement name",
  "severity": "high" | "medium" | "low",
  "issue": "What's unclear (MAX 80 chars)",
  "possibleInterpretations": ["option 1 (MAX 50 chars)", "option 2", "option 3"]
}

**3. Conflicting Information**:
{
  "area": "Conflict topic",
  "conflict": "Brief description (MAX 100 chars)",
  "statement1": "First statement (MAX 60 chars)",
  "statement2": "Second statement (MAX 60 chars)"
}

**4. Assumptions Made**:
{
  "assumption": "Brief assumption (MAX 80 chars)",
  "basedOn": "Reasoning (MAX 60 chars)",
  "needsValidation": true | false
}

**Limits**: Max 10 missing fields, 8 ambiguous requirements, 5 conflicts, 8 assumptions.

Respond with valid JSON:
{
  "missingFields": [],
  "ambiguousRequirements": [],
  "conflictingInfo": [],
  "assumptionsMade": [],
  "overallCompleteness": 0.75,
  "criticalGapsCount": 2,
  "highPriorityGapsCount": 5
}`;
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

      // Get job ID for progress tracking
      const { jobQueueService } = await import('../jobQueue');
      const jobs = await jobQueueService.getJobsByOpportunity(context.opportunityId);
      const currentJob = jobs.find(j => j.jobType === this.agentType && j.status === 'processing');

      // Update progress: 30% - Analyzing brief
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 30, 'Analyzing requirements brief for gaps');
      }

      const systemPrompt = this.getSystemPrompt(context);
      const userMessage = `Analyze this extracted brief and identify all information gaps:

${JSON.stringify(brief, null, 2)}

Identify:
1. What information is completely MISSING (not in the RFP at all)
2. What information is AMBIGUOUS (present but unclear/vague)
3. Any CONFLICTS or contradictions
4. What ASSUMPTIONS you must make due to missing information

Respond with JSON containing: missingFields[], ambiguousRequirements[], conflictingInfo[], assumptionsMade[], overallCompleteness, criticalGapsCount, highPriorityGapsCount.`;

      // Update progress: 40% - Running AI analysis
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 40, 'Identifying missing and ambiguous information');
      }

      const response = await this.invokeAI(systemPrompt, userMessage, context);

      // Update progress: 70% - Processing results
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 70, 'Processing gap analysis results');
      }

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
        console.error('Failed to parse gap analysis response');
        console.error('Parse error:', parseError);
        console.error('AI Response (first 500 chars):', response.substring(0, 500));
        console.error('AI Response (last 500 chars):', response.substring(Math.max(0, response.length - 500)));
        return {
          success: false,
          error: `Failed to parse gap analysis: ${parseError.message}`,
        };
      }

      // Update progress: 80% - Saving to database
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 80, 'Saving gap analysis to database');
      }

      // Convert to snake_case for database storage
      const dbData = {
        missing_fields: gapAnalysis.missingFields || [],
        ambiguous_requirements: gapAnalysis.ambiguousRequirements || [],
        conflicting_info: gapAnalysis.conflictingInfo || [],
        assumptions_made: gapAnalysis.assumptionsMade || [],
        overall_completeness: gapAnalysis.overallCompleteness || 0,
        critical_gaps_count: gapAnalysis.criticalGapsCount || 0,
        high_priority_gaps_count: gapAnalysis.highPriorityGapsCount || 0,
      };

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
          ${JSON.stringify(dbData.missing_fields)}::jsonb,
          ${JSON.stringify(dbData.ambiguous_requirements)}::jsonb,
          ${JSON.stringify(dbData.conflicting_info)}::jsonb,
          ${JSON.stringify(dbData)}::jsonb,
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
      const hasCriticalGaps = dbData.critical_gaps_count > 0 || dbData.high_priority_gaps_count > 0;
      const nextStatus = hasCriticalGaps ? 'clarification' : 'scope_build';

      console.log(`✅ Gap analysis complete: ${dbData.critical_gaps_count} critical, ${dbData.high_priority_gaps_count} high priority gaps`);

      return {
        success: true,
        data: {
          gapAnalysisId,
          ...dbData,
          needsClarification: hasCriticalGaps,
          currentStatus: 'gap_analysis',
          nextStatus,
        },
        metadata: {
          confidence: dbData.overall_completeness || 0.7,
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
