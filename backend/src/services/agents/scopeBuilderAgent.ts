/**
 * Scope Builder Agent (Phase 4)
 * Designs research methodology and creates comprehensive project scope
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

export class ScopeBuilderAgent extends BaseAgent {
  protected agentType = 'scope_building';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are a PMR Scope Design Specialist with deep expertise in pharmaceutical market research methodologies.

Your task is to design a comprehensive research scope based on the extracted RFP brief.

Design the following components:

**1. Research Methodology Design**:
   - Study approach (Qualitative/Quantitative/Mixed Methods)
   - Data collection method:
     * Qualitative: In-depth interviews (IDIs), focus groups, ethnography
     * Quantitative: Online surveys, CATI, mail surveys
   - Interview/survey duration (recommend based on objectives)
   - Data quality assurance measures
   - Analysis approach (thematic coding, statistical methods)

**2. Discussion Guide / Survey Structure**:
   - For Qualitative: Outline discussion guide with:
     * Opening/warm-up questions
     * Main topic areas (aligned with objectives)
     * Probing questions
     * Closing questions
   - For Quantitative: Survey flow with:
     * Screener questions
     * Core question modules
     * Demographics
     * Estimated completion time

**3. Recruitment Screener Criteria**:
   - Inclusion criteria (must-have qualifications)
   - Exclusion criteria (disqualifiers)
   - Quota requirements (practice setting, geography, experience)
   - Screening questions to validate eligibility

**4. Compliance & Regulatory Requirements**:
   - Data protection: GDPR (EU), HIPAA (US patients), FCPA (global)
   - Informed consent requirements
   - Data security measures
   - Recording/transcription permissions
   - IRB requirements (if applicable)

**5. Project Phases & Workflow**:
   - Phase 1: Recruitment (timeline, activities)
   - Phase 2: Fieldwork (interview scheduling, data collection)
   - Phase 3: Analysis (coding, synthesis, reporting)
   - Phase 4: Delivery (report writing, client review, revisions)

**6. Quality Assurance**:
   - Respondent verification process
   - Interviewer training requirements
   - Data validation checks
   - Quality control milestones

For each component, provide specific, actionable recommendations based on industry best practices.

Respond with structured JSON containing: methodology{}, discussionGuideOutline{}, screenerCriteria{}, complianceRequirements[], projectPhases[], qualityAssurance{}, estimatedTimeline{}, confidenceScore.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      // Get the latest brief and gap analysis
      const sql = getSql();
      const data = await sql`
        SELECT
          b.id as brief_id,
          b.research_objectives as "researchObjectives",
          b.target_audience as "targetAudience",
          b.therapeutic_area as "therapeuticArea",
          b.study_type as "studyType",
          b.sample_requirements as "sampleRequirements",
          b.timeline_requirements as "timelineRequirements",
          b.deliverables,
          b.budget_indication as "budgetIndication",
          o.id as opportunity_id,
          o.rfp_title as "rfpTitle",
          o.client_name as "clientName",
          o.geography,
          ga.missing_fields as "missingFields",
          ga.ambiguous_requirements as "ambiguousRequirements"
        FROM briefs b
        JOIN opportunities o ON b.opportunity_id = o.id
        LEFT JOIN gap_analyses ga ON ga.brief_id = b.id
        WHERE o.id = ${context.opportunityId}
        ORDER BY b.created_at DESC, ga.created_at DESC
        LIMIT 1
      `;

      if (data.length === 0) {
        return {
          success: false,
          error: 'No brief found for this opportunity',
        };
      }

      const briefData = data[0];

      const systemPrompt = this.getSystemPrompt(context);
      const userMessage = `Design a comprehensive research scope for this RFP:

**RFP Title**: ${briefData.rfpTitle}
**Client**: ${briefData.clientName}
**Therapeutic Area**: ${briefData.therapeuticArea}

**Research Brief**:
${JSON.stringify(briefData, null, 2)}

**Key Objectives**:
${JSON.stringify(briefData.researchObjectives, null, 2)}

**Study Type**: ${briefData.studyType}
**Target Audience**: ${briefData.targetAudience}
**Sample Requirements**: ${JSON.stringify(briefData.sampleRequirements, null, 2)}
**Timeline**: ${briefData.timelineRequirements}
**Budget**: ${briefData.budgetIndication}
**Geography**: ${JSON.stringify(briefData.geography, null, 2)}

**Known Gaps** (address these in your design):
- Missing fields: ${JSON.stringify(briefData.missingFields || [], null, 2)}
- Ambiguous requirements: ${JSON.stringify(briefData.ambiguousRequirements || [], null, 2)}

Design a professional, feasible research scope that:
1. Aligns with the research objectives
2. Is realistic given the budget and timeline constraints
3. Follows pharmaceutical market research best practices
4. Includes appropriate compliance measures for the geography
5. Addresses or works around any identified gaps

Respond with complete JSON containing all components listed in the system prompt.`;

      const response = await this.invokeAI(systemPrompt, userMessage, context);

      // Parse JSON response
      let scopeDesign;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          scopeDesign = JSON.parse(jsonMatch[0]);
        } else {
          scopeDesign = JSON.parse(response);
        }
      } catch (parseError) {
        console.error('Failed to parse scope design:', response);
        return {
          success: false,
          error: 'Failed to parse scope design',
        };
      }

      // Store in scopes table
      const result = await sql`
        INSERT INTO scopes (
          brief_id,
          methodology,
          discussion_guide_outline,
          screener_criteria,
          compliance_requirements,
          project_phases,
          quality_assurance,
          estimated_timeline,
          llm_scope_design,
          created_at,
          updated_at
        ) VALUES (
          ${briefData.brief_id},
          ${JSON.stringify(scopeDesign.methodology || {})}::jsonb,
          ${JSON.stringify(scopeDesign.discussionGuideOutline || {})}::jsonb,
          ${JSON.stringify(scopeDesign.screenerCriteria || {})}::jsonb,
          ${scopeDesign.complianceRequirements || []},
          ${JSON.stringify(scopeDesign.projectPhases || [])}::jsonb,
          ${JSON.stringify(scopeDesign.qualityAssurance || {})}::jsonb,
          ${JSON.stringify(scopeDesign.estimatedTimeline || {})}::jsonb,
          ${JSON.stringify(scopeDesign)}::jsonb,
          now(),
          now()
        )
        RETURNING id
      `;

      const scopeId = result[0].id;

      // Update opportunity status
      await sql`
        UPDATE opportunities
        SET status = 'sample_plan', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      console.log(`✅ Scope building complete for opportunity ${context.opportunityId}`);

      return {
        success: true,
        data: {
          scopeId,
          ...scopeDesign,
          nextStatus: 'sample_plan',
        },
        metadata: {
          confidence: scopeDesign.confidenceScore || 0.85,
        },
      };
    } catch (error: any) {
      console.error('Scope builder error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
