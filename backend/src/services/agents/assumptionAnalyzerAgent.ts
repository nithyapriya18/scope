/**
 * Assumption & Clash Analyzer Agent
 * Identifies required assumptions and potential conflicts/clashes in RFP requirements
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

export class AssumptionAnalyzerAgent extends BaseAgent {
  protected agentType = 'assumption_analysis';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are a PMR Assumptions & Clashes Analyst. Identify what we must ASSUME to proceed and what CLASHES exist in the RFP.

**YOUR TASK**: Analyze the RFP to identify:

**1. ASSUMPTIONS REQUIRED** (explicit or implicit assumptions we must make):
- What must we assume to move forward?
- What's the default interpretation if not specified?
- Industry standard assumptions vs. client-specific assumptions?
{
  "category": "Sample|Timeline|Budget|Methodology|Scope|Compliance|Other",
  "assumption": "Specific assumption (80 chars max)",
  "basedOn": "Why we're making this assumption (60 chars)",
  "riskLevel": "low" | "medium" | "high",
  "canValidate": true | false,
  "validateVia": "How to confirm this assumption (60 chars)" OR null
}

**2. CLASHES / CONFLICTS** (requirement contradictions or tensions):
Examples:
- "Budget $50K but wants 10 countries (impossible)"
- "4-week timeline but requests 500 interviews (too fast)"
- "Requires statistical significance but sample=50 (too small)"
- "GDPR + US-only respondents (data location conflict)"
- "Says confidential but requests raw data (IP conflict)"
{
  "clash": "Clear description of the clash (100 chars max)",
  "elements": ["Element A", "Element B"],
  "severity": "critical" | "high" | "medium",
  "impact": "What could go wrong (80 chars)",
  "resolution": "Possible workaround (80 chars)"
}

**3. FEASIBILITY CONCERNS** (realistic delivery concerns):
{
  "concern": "What's potentially difficult (80 chars)",
  "reason": "Why (60 chars)",
  "severity": "critical" | "high" | "medium"
}

**LIMITS**: Max 10 per category

Respond with valid JSON:
{
  "assumptions": [],
  "clashes": [],
  "feasibilityConcerns": [],
  "overallRiskLevel": "low" | "medium" | "high",
  "recommendedClarifications": 3
}`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      // Get the latest brief and gap analysis
      const sql = getSql();

      const briefs = await sql`
        SELECT
          id,
          raw_extraction as "rawExtraction",
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

      const gaps = await sql`
        SELECT
          id,
          missing_fields as "missingFields",
          ambiguous_requirements as "ambiguousRequirements",
          conflicting_info as "conflictingInfo",
          llm_analysis as "llmAnalysis"
        FROM gap_analyses
        WHERE brief_id = ${brief.id}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      // Get job ID for progress tracking
      const { jobQueueService } = await import('../jobQueue');
      const jobs = await jobQueueService.getJobsByOpportunity(context.opportunityId);
      const currentJob = jobs.find(j => j.jobType === this.agentType && j.status === 'processing');

      // Update progress: 30% - Analyzing RFP context
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 30, 'Analyzing RFP context and assumptions');
      }

      const systemPrompt = this.getSystemPrompt(context);

      // Parse rawExtraction if double-encoded (stored as JSON string in JSONB column)
      let rawExtractionData = brief.rawExtraction;
      if (typeof rawExtractionData === 'string') {
        try { rawExtractionData = JSON.parse(rawExtractionData); } catch {}
      }
      let gapLlmAnalysis = gaps.length > 0 ? gaps[0].llmAnalysis : null;
      if (typeof gapLlmAnalysis === 'string') {
        try { gapLlmAnalysis = JSON.parse(gapLlmAnalysis); } catch {}
      }

      const userMessage = `Analyze this RFP and identify all assumptions we must make and potential clashes/conflicts.

**BRIEF EXTRACTION**:
${JSON.stringify(rawExtractionData || brief, null, 2)}

${gapLlmAnalysis ? `**GAP ANALYSIS**:
${JSON.stringify(gapLlmAnalysis, null, 2)}` : ''}

**TASK**:
1. Identify all ASSUMPTIONS we must make to move forward
   - Are sample sizes realistic for the methodology?
   - Is the timeline feasible given the scope?
   - Are budget and scope aligned?
   - What compliance/regulatory assumptions are being made?

2. Identify all CLASHES between requirements
   - Budget vs. Scope: Is budget sufficient for the scope?
   - Timeline vs. Scope: Can we deliver in the timeframe?
   - Methodology vs. Sample: Does method fit the sample size?
   - Compliance conflicts: Are there regulatory contradictions?
   - Resource conflicts: Do we have capacity/expertise?

3. Identify FEASIBILITY CONCERNS
   - What aspects might be challenging to deliver?
   - What external dependencies exist?
   - What could impact timeline or quality?

Respond with ONLY JSON.`;

      // Update progress: 40% - Running analysis
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 40, 'Identifying assumptions and conflicts');
      }

      const response = await this.invokeAI(systemPrompt, userMessage, context);

      // Update progress: 70% - Processing results
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 70, 'Processing assumption analysis');
      }

      // Parse JSON response
      let analysis;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          analysis = JSON.parse(response);
        }
      } catch (parseError: any) {
        console.error('Failed to parse assumption analysis response');
        console.error('Parse error:', parseError);
        return {
          success: false,
          error: `Failed to parse assumption analysis: ${parseError?.message || 'Unknown error'}`,
        };
      }

      // Update progress: 80% - Saving to database
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 80, 'Saving assumption analysis to database');
      }

      // Store assumption analysis
      const result = await sql`
        INSERT INTO assumption_analyses (
          brief_id,
          assumptions,
          clashes,
          feasibility_concerns,
          overall_risk_level,
          recommended_clarifications,
          llm_analysis,
          created_at
        ) VALUES (
          ${brief.id},
          ${JSON.stringify(analysis.assumptions || [])}::jsonb,
          ${JSON.stringify(analysis.clashes || [])}::jsonb,
          ${JSON.stringify(analysis.feasibilityConcerns || [])}::jsonb,
          ${analysis.overallRiskLevel || 'medium'},
          ${analysis.recommendedClarifications || 0},
          ${JSON.stringify(analysis)}::jsonb,
          now()
        )
        RETURNING id
      `;

      const analysisId = result[0].id;

      // Update opportunity status
      await sql`
        UPDATE opportunities
        SET status = 'assumption_analysis', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      // Update progress: 90% - Complete
      if (currentJob) {
        await jobQueueService.updateProgress(currentJob.id, 90, 'Analysis complete');
      }

      console.log(`✅ Assumption analysis complete for opportunity ${context.opportunityId}`);
      console.log(`   Assumptions: ${(analysis.assumptions || []).length} identified`);
      console.log(`   Clashes: ${(analysis.clashes || []).length} identified`);
      console.log(`   Feasibility Concerns: ${(analysis.feasibilityConcerns || []).length}`);
      console.log(`   Overall Risk Level: ${analysis.overallRiskLevel || 'medium'}`);
      console.log(`   Recommended Clarifications: ${analysis.recommendedClarifications || 0}`);

      return {
        success: true,
        data: {
          analysisId,
          ...analysis,
          currentStatus: 'assumption_analysis',
          nextStatus: 'clarification',
        },
      };
    } catch (error: any) {
      console.error('Assumption analyzer error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
