/**
 * WBS Estimator Agent (Phase 5)
 * Creates work breakdown structure and estimates effort/hours for each task
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

export class WBSEstimatorAgent extends BaseAgent {
  protected agentType = 'wbs_estimation';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are a PMR Project Estimation Specialist with expertise in work breakdown and effort estimation for pharmaceutical market research projects.

Your task is to create a comprehensive Work Breakdown Structure (WBS) and estimate effort for each task.

Create a detailed WBS with:

**1. Task Breakdown by Phase**:

**Phase 1: Project Setup & Recruitment (Pre-Fieldwork)**
- Project kickoff meeting with client (1-2 hours)
- Discussion guide / survey instrument development (qualitative: 8-16 hours, quantitative: 16-24 hours)
- Client review & approval of instruments (2 hours + wait time)
- Recruitment database search & HCP outreach (depends on sample size)
  * Rule: 2-4 hours per 10 recruits for common specialists
  * Rule: 4-8 hours per 10 recruits for rare specialists
- Screening & qualification (1-2 hours per 10 screened)
- Interview/survey scheduling coordination (1 hour per 10 completes)

**Phase 2: Fieldwork (Data Collection)**
- For Qualitative:
  * Interview preparation & briefing (0.5 hours per interview)
  * Conducting interviews (1-1.5 hours per interview including setup/notes)
  * Post-interview documentation (0.25 hours per interview)
  * Total: ~2 hours per interview
- For Quantitative:
  * Survey programming & testing (8-12 hours)
  * Soft launch & validation (4-8 hours)
  * Fielding & monitoring (0.1-0.2 hours per complete)
  * Data cleaning (2-4 hours per 100 completes)

**Phase 3: Analysis & Insights**
- For Qualitative:
  * Transcription coordination (external, but 0.5 hours management per interview)
  * Data review & quality check (0.5 hours per interview)
  * Thematic coding & analysis (1-2 hours per interview)
  * Synthesis & insight generation (16-32 hours depending on complexity)
- For Quantitative:
  * Data processing & weighting (8-12 hours)
  * Statistical analysis & cross-tabs (12-20 hours)
  * Data visualization & charting (8-12 hours)
  * Interpretation & insights (12-16 hours)

**Phase 4: Reporting & Delivery**
- Report writing:
  * Executive summary (4-8 hours)
  * Detailed findings report (16-32 hours)
  * Appendices & supporting materials (4-8 hours)
- PowerPoint presentation development (8-16 hours)
- Internal QA review (4-8 hours)
- Client review & revisions (8-16 hours for 2 rounds)
- Final delivery & debrief meeting (2-4 hours)

**Phase 5: Project Management (Ongoing)**
- PM oversight & coordination (15-20% of total project hours)
- Client communication & status updates (2-4 hours per week)
- Team coordination & QA (1-2 hours per week)
- Administrative tasks (timesheets, invoicing, file management) (2-3 hours per week)

**2. Team Roles & Assignments**:
- **Project Manager**: Overall coordination, client liaison, timeline management
- **Moderator/Interviewer** (Qualitative): Conducting interviews, note-taking
- **Survey Programmer** (Quantitative): Survey development, testing
- **Recruitment Coordinator**: HCP outreach, screening, scheduling
- **Analyst**: Data analysis, coding, statistical work
- **Report Writer**: Report and presentation development
- **QA Reviewer**: Quality checks at each phase

**3. Effort Estimation Rules**:
- Small project (20-30 interviews or 200-300 surveys): 150-250 hours total
- Medium project (40-60 interviews or 400-600 surveys): 250-400 hours total
- Large project (80+ interviews or 800+ surveys): 400-600 hours total
- Multi-country: Add 10-15% overhead per additional country
- Complex therapeutic area: Add 10-20% for unfamiliar disease areas
- Tight timeline: Add 15-20% for rush projects (<6 weeks)

**4. Task Dependencies**:
- Map dependencies (e.g., "Discussion guide must be approved before recruitment begins")
- Identify critical path tasks
- Flag tasks that can run in parallel

**5. Risk Buffers**:
- Add 10-15% buffer for qualitative recruitment (hard-to-reach HCPs)
- Add 5-10% buffer for analysis (unexpected data complexity)
- Add 10% buffer for client revisions (typically 2 rounds)

**6. Duration Estimates**:
- Calculate calendar duration for each phase
- Account for part-time allocation (e.g., PM at 20%, Analyst at 50%)
- Map to project timeline (weeks from kickoff)

For each task, provide:
- Task ID and name
- Phase
- Estimated hours (min-max range)
- Team role responsible
- Dependencies (task IDs that must complete first)
- Duration (calendar days)
- Notes/assumptions

Respond with structured JSON containing: taskBreakdown[], teamRoles[], effortSummary{}, durationEstimates{}, criticalPath[], riskBuffers{}, totalEffort{}, confidenceScore.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      // Get all data from previous phases
      const sql = getSql();
      const data = await sql`
        SELECT
          b.id as brief_id,
          b.research_objectives as "researchObjectives",
          b.target_audience as "targetAudience",
          b.therapeutic_area as "therapeuticArea",
          b.study_type as "studyType",
          b.timeline_requirements as "timelineRequirements",
          b.deliverables,
          o.id as opportunity_id,
          o.rfp_title as "rfpTitle",
          o.client_name as "clientName",
          o.geography,
          s.id as scope_id,
          s.methodology,
          s.project_phases as "projectPhases",
          sp.id as sample_plan_id,
          sp.sample_size_recommendation as "sampleSizeRecommendation",
          sp.sample_distribution as "sampleDistribution",
          sp.recruitment_timeline as "recruitmentTimeline",
          sp.feasibility_assessment as "feasibilityAssessment",
          h.id as shortlist_id,
          h.overall_feasibility as "overallFeasibility"
        FROM briefs b
        JOIN opportunities o ON b.opportunity_id = o.id
        LEFT JOIN scopes s ON s.brief_id = b.id
        LEFT JOIN sample_plans sp ON sp.scope_id = s.id
        LEFT JOIN hcp_shortlists h ON h.sample_plan_id = sp.id
        WHERE o.id = ${context.opportunityId}
        ORDER BY b.created_at DESC, s.created_at DESC, sp.created_at DESC, h.created_at DESC
        LIMIT 1
      `;

      if (data.length === 0) {
        return {
          success: false,
          error: 'No brief found for this opportunity',
        };
      }

      const projectData = data[0];

      if (!projectData.shortlist_id) {
        return {
          success: false,
          error: 'HCP shortlist must be created before WBS estimation',
        };
      }

      const systemPrompt = this.getSystemPrompt(context);
      const userMessage = `Create a comprehensive Work Breakdown Structure and estimate effort for this project:

**RFP Title**: ${projectData.rfpTitle}
**Client**: ${projectData.clientName}
**Therapeutic Area**: ${projectData.therapeuticArea}
**Study Type**: ${projectData.studyType}

**Research Objectives** (${(projectData.researchObjectives || []).length} objectives):
${JSON.stringify(projectData.researchObjectives, null, 2)}

**Sample Plan**:
- Sample Size: ${JSON.stringify(projectData.sampleSizeRecommendation, null, 2)}
- Distribution: ${JSON.stringify(projectData.sampleDistribution, null, 2)}
- Recruitment Feasibility: ${JSON.stringify(projectData.feasibilityAssessment, null, 2)}

**Geography**: ${JSON.stringify(projectData.geography, null, 2)}
(Multi-country projects need coordination overhead)

**Methodology**:
${JSON.stringify(projectData.methodology, null, 2)}

**Project Phases** (from scope):
${JSON.stringify(projectData.projectPhases, null, 2)}

**Timeline Requirements**: ${projectData.timelineRequirements}

**Deliverables**:
${JSON.stringify(projectData.deliverables, null, 2)}

**HCP Recruitment Feasibility**:
${JSON.stringify(projectData.overallFeasibility, null, 2)}

Based on this information:
1. Break down work into detailed tasks across all 5 phases
2. Estimate hours for each task using industry benchmarks
3. Assign team roles to each task
4. Calculate total effort (hours) and duration (weeks)
5. Identify dependencies and critical path
6. Add appropriate risk buffers

Use these estimation rules:
- Qualitative: ~2 hours per interview (prep, conduct, document)
- Qualitative analysis: 1-2 hours coding per interview + 16-32 hours synthesis
- Quantitative: 0.1-0.2 hours per complete for fielding, 12-20 hours analysis
- Report writing: 16-32 hours detailed report, 8-16 hours presentation
- PM overhead: 15-20% of total project hours
- Multi-country overhead: +10-15% per additional country
- Tight timeline: +15-20% if rushed

Respond with complete JSON containing all components listed in the system prompt.`;

      const response = await this.invokeAI(systemPrompt, userMessage, context);

      // Parse JSON response
      let wbsData;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          wbsData = JSON.parse(jsonMatch[0]);
        } else {
          wbsData = JSON.parse(response);
        }
      } catch (parseError) {
        console.error('Failed to parse WBS data:', response);
        return {
          success: false,
          error: 'Failed to parse WBS data',
        };
      }

      // Store in wbs table
      const result = await sql`
        INSERT INTO wbs (
          hcp_shortlist_id,
          task_breakdown,
          team_roles,
          effort_summary,
          duration_estimates,
          critical_path,
          risk_buffers,
          total_effort,
          llm_wbs_estimate,
          created_at,
          updated_at
        ) VALUES (
          ${projectData.shortlist_id},
          ${JSON.stringify(wbsData.taskBreakdown || [])}::jsonb,
          ${JSON.stringify(wbsData.teamRoles || [])}::jsonb,
          ${JSON.stringify(wbsData.effortSummary || {})}::jsonb,
          ${JSON.stringify(wbsData.durationEstimates || {})}::jsonb,
          ${wbsData.criticalPath || []},
          ${JSON.stringify(wbsData.riskBuffers || {})}::jsonb,
          ${JSON.stringify(wbsData.totalEffort || {})}::jsonb,
          ${JSON.stringify(wbsData)}::jsonb,
          now(),
          now()
        )
        RETURNING id
      `;

      const wbsId = result[0].id;

      // Update opportunity status
      await sql`
        UPDATE opportunities
        SET status = 'pricing', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      console.log(`✅ WBS estimation complete for opportunity ${context.opportunityId}`);

      return {
        success: true,
        data: {
          wbsId,
          ...wbsData,
          nextStatus: 'pricing',
        },
        metadata: {
          confidence: wbsData.confidenceScore || 0.85,
        },
      };
    } catch (error: any) {
      console.error('WBS estimator error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
