/**
 * Gap Analyzer Agent
 * Detects missing or ambiguous information in the brief
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

export class GapAnalyzerAgent extends BaseAgent {
  protected agentType = 'gap_analysis';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are a PMR Gap Analysis Specialist. Analyze RFP completeness against the 13-section template.

**TEMPLATE SECTIONS**:
1. Contact & Issuer Information
2. Introduction & Company Overview
3. Confidentiality & Legal Terms
4. Project Background & Context
5. Business & Research Objectives
6. Methodology & Scope
7. Markets & Geography
8. Target Audience & Sample
9. Timeline & Key Dates
10. Deliverables
11. Budget & Cost Requirements
12. Proposal Submission Requirements
13. Evaluation Criteria

**YOUR TASK**: Identify FOUR gap categories (concise, max 80 chars each):

**1. Missing Template Sections** (entire sections absent):
{
  "section": "Section name + number (e.g., 'Section 7: Markets & Geography')",
  "impact": "Why needed (80 chars max)",
  "priority": "critical" | "high" | "medium"
}

**2. Incomplete Sections** (section present but key fields missing):
{
  "section": "Section name",
  "missingField": "Specific field name",
  "priority": "critical" | "high" | "medium"
}

**3. Ambiguous Requirements** (unclear language, vague terms):
Examples: "small sample" (size?), "experienced docs" (years?), "ASAP" (exact date?), "major markets" (which?)
{
  "section": "Section name",
  "field": "Field name",
  "ambiguity": "What's unclear (80 chars max)",
  "possibleInterpretations": ["A", "B", "C"]
}

**4. Conflicting Information** (contradictions within or across sections):
{
  "section": "Section name",
  "conflict": "Brief description (100 chars max)",
  "statement1": "First value",
  "statement2": "Second value (conflicting)"
}

**LIMITS**: Max 10 per category

Respond with valid JSON:
{
  "missingSections": [],
  "incompleteFields": [],
  "ambiguousRequirements": [],
  "conflicts": [],
  "sectionsPresent": 7,
  "sectionsMissing": 6,
  "overallCompletenessPercent": 54
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
      const userMessage = `Analyze this template-mapped RFP extraction and identify ALL gaps:

${JSON.stringify(brief, null, 2)}

**TASK**: Analyze completeness against the 13-section template

For each section status (COMPLETE/PARTIAL/MISSING):
1. If MISSING: Entire section absent → HIGH/CRITICAL priority
2. If PARTIAL: Some fields missing → Map which specific fields
3. If COMPLETE: Look for ambiguous language, vague terms, conflicting values

Look for:
- Vague terms: "small sample" (how many?), "ASAP" (exact date?), "major markets" (which?)
- Conflicting values: Budget "$50K" vs "$75K", deadline "Q1" vs "March 31"
- Incomplete specifications: Methodology mentioned but not detailed
- Missing standard fields: No timeline, budget range not stated, etc.

Return structured gap analysis by section.

Respond with ONLY JSON.`;

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
      } catch (parseError: any) {
        console.error('Failed to parse gap analysis response');
        console.error('Parse error:', parseError);
        console.error('AI Response (first 500 chars):', response.substring(0, 500));
        console.error('AI Response (last 500 chars):', response.substring(Math.max(0, response.length - 500)));
        return {
          success: false,
          error: `Failed to parse gap analysis: ${parseError?.message || 'Unknown error'}`,
        };
      }

      // Update progress: 80% - Saving to database
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 80, 'Saving gap analysis to database');
      }

      // Convert to snake_case for database storage (template-aware)
      const dbData = {
        missing_sections: gapAnalysis.missingSections || [],
        incomplete_fields: gapAnalysis.incompleteFields || [],
        ambiguous_requirements_new: gapAnalysis.ambiguousRequirements || [],
        conflicting_info: gapAnalysis.conflicts || [],
        sections_present: gapAnalysis.sectionsPresent || 0,
        sections_missing: gapAnalysis.sectionsMissing || 0,
        overall_completeness: Math.max(0, Math.min(1, (gapAnalysis.overallCompletenessPercent || 0) / 100)),
        // Backward compatibility
        missing_fields: gapAnalysis.incompleteFields || [],
        ambiguous_requirements: gapAnalysis.ambiguousRequirements || [],
        assumptions_made: [],
        critical_gaps_count: gapAnalysis.missingSections?.length || 0,
        high_priority_gaps_count: (gapAnalysis.incompleteFields?.length || 0) + (gapAnalysis.ambiguousRequirements?.length || 0),
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
      const hasCriticalGaps = dbData.sections_missing > 0 || dbData.critical_gaps_count > 0 || dbData.high_priority_gaps_count > 0;
      const nextStatus = hasCriticalGaps ? 'clarification' : 'scope_build';

      console.log(`✅ Gap analysis complete (template-aware)`);
      console.log(`   Sections Present: ${dbData.sections_present}/13`);
      console.log(`   Sections Missing: ${dbData.sections_missing}`);
      console.log(`   Incomplete Fields: ${dbData.incomplete_fields.length}`);
      console.log(`   Ambiguous Requirements: ${dbData.ambiguous_requirements.length}`);
      console.log(`   Conflicting Info: ${dbData.conflicting_info.length}`);
      console.log(`   Overall Completeness: ${Math.round(dbData.overall_completeness * 100)}%`);

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
