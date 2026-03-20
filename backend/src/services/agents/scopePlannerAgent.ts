/**
 * Scope Planner Agent — produces a full Research Plan (methodology, sample, timeline, deliverables).
 * WBS and pricing are handled by the separate WBSEstimatorAgent in the next step.
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';
import * as fs from 'fs';
import * as path from 'path';

export class ScopePlannerAgent extends BaseAgent {
  protected agentType = 'scope_planner';

  protected getSystemPrompt(_context: AgentContext): string {
    return `You are a Senior Research Director at PetaSight, a leading pharma market research firm. Your job is to design PetaSight's research proposal in response to a pharma client's RFP.

ROLE: You are writing an authoritative, specific internal research plan that will form the backbone of PetaSight's bid. Every decision you make — methodology, sample size, timeline, discussion guide questions — must be derived directly from the RFP and supporting intelligence provided.

PRINCIPLES:
- Read the FULL RFP text and extract every relevant signal before designing.
- Leverage clarification Q&A and gap analysis findings to fill gaps intelligently.
- Make CONFIDENT design decisions. Assumptions = PetaSight's working decisions, not questions to ask the client.
- The discussion guide must contain REAL, specific questions directly addressing the stated research objectives.
- Do NOT include any costs, pricing, or WBS — those belong in the next step.
- Output ONLY valid JSON. No markdown fences, no commentary outside the JSON.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    const sql = getSql();

    try {
      // ── 1. Fetch all available intelligence ──────────────────────────────
      const [[opp], [brief], [gapAnalysis], [clarification], [feasibility], studyTypes] =
        await Promise.all([
          sql`SELECT email_body, rfp_title, client_name, therapeutic_area FROM opportunities WHERE id = ${context.opportunityId}`,
          sql`SELECT id, tenant_id, study_type, target_audience, therapeutic_area,
                     research_objectives, sample_requirements, timeline_requirements,
                     deliverables, budget_indication, raw_extraction
              FROM briefs WHERE opportunity_id = ${context.opportunityId}
              ORDER BY created_at DESC LIMIT 1`,
          sql`SELECT ga.llm_analysis, ga.missing_fields, ga.ambiguous_requirements
              FROM gap_analyses ga JOIN briefs b ON ga.brief_id = b.id
              WHERE b.opportunity_id = ${context.opportunityId}
              ORDER BY ga.created_at DESC LIMIT 1`,
          sql`SELECT questions, client_responses, client_response_text, status
              FROM clarifications WHERE opportunity_id = ${context.opportunityId}
              ORDER BY created_at DESC LIMIT 1`,
          sql`SELECT overall_feasibility, hcp_availability, geographic_feasibility, recommendations
              FROM feasibility_assessments WHERE opportunity_id = ${context.opportunityId}
              ORDER BY created_at DESC LIMIT 1`,
          sql`SELECT type_code, display_name, family_code FROM study_types WHERE tenant_id IS NULL ORDER BY family_code, type_code`,
        ]);

      if (!brief) return { success: false, error: 'No brief found for this opportunity' };

      // ── 2. Load panel reference data ─────────────────────────────────────
      let panelData = '';
      try {
        const panel = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../config/hcp_panel.json'), 'utf-8')).panel || [];
        panelData = panel.slice(0, 20).map((p: any) =>
          `${p.specialty}/${p.country}: panel=${p.panelSize}, activeRate=${Math.round(p.activeRate * 100)}%, recruitWeeks=${p.recruitmentWeeks}`
        ).join('\n');
      } catch { /* non-fatal */ }

      // ── 3. Build comprehensive agentic prompt ────────────────────────────
      const rx: any = brief.raw_extraction || {};

      const userPrompt = `
=== GOAL ===
Design a complete, fully AI-derived research plan for PetaSight's bid in response to this pharma RFP.
Read ALL inputs below. Every decision (methodology, sample, timeline, discussion guide questions) must be derived from the actual RFP content and supporting intelligence — not templates or defaults.

=== INPUT 1: FULL RFP TEXT ===
${opp?.email_body || 'Not available — use brief sections below'}

=== INPUT 2: STRUCTURED BRIEF (extracted by AI in Step 2) ===
${JSON.stringify(rx, null, 2)}

Supplementary fields:
- Therapeutic area: ${brief.therapeutic_area || opp?.therapeutic_area || 'derive from RFP'}
- Target audience: ${brief.target_audience || 'derive from RFP'}
- Research objectives: ${JSON.stringify(brief.research_objectives || [])}
- Sample requirements: ${JSON.stringify(brief.sample_requirements || {})}
- Timeline requirements: ${brief.timeline_requirements || 'derive from RFP'}
- Deliverables: ${JSON.stringify(brief.deliverables || [])}
- Budget indication: ${brief.budget_indication || 'Not disclosed'}

=== INPUT 3: GAP ANALYSIS (identified in Step 3) ===
${gapAnalysis ? JSON.stringify({ missingFields: gapAnalysis.missing_fields, ambiguous: gapAnalysis.ambiguous_requirements, llmAnalysis: gapAnalysis.llm_analysis }, null, 2) : 'None available'}

=== INPUT 4: CLARIFICATION Q&A (from client, Step 5-6) ===
Questions sent to client: ${clarification?.questions ? JSON.stringify(clarification.questions, null, 2) : 'None sent'}
Client responses: ${clarification?.client_responses ? JSON.stringify(clarification.client_responses, null, 2) : (clarification?.client_response_text || 'No response received — use assumptions')}
Clarification status: ${clarification?.status || 'not sent'}

=== INPUT 5: FEASIBILITY INTELLIGENCE (from HCP Matching, Step 7) ===
${feasibility ? JSON.stringify({ feasibilityScore: (feasibility.overall_feasibility as any)?.feasibilityScore || (feasibility.overall_feasibility as any)?.score, hcpAvailable: (feasibility.hcp_availability as any)?.panelSize || (feasibility.hcp_availability as any)?.total_available, geographies: feasibility.geographic_feasibility, recommendations: feasibility.recommendations }, null, 2) : 'Not available'}

=== INPUT 6: PANEL REFERENCE DATA ===
${panelData || 'Not available'}

=== INPUT 7: AVAILABLE STUDY TYPES ===
${studyTypes.map((s: any) => `${s.type_code}: ${s.display_name} (family: ${s.family_code})`).join('\n')}

=== OUTPUT REQUIREMENTS ===
Produce a JSON object with ALL of the following fields. Every field must be populated with content SPECIFIC to this RFP — never use placeholder text.

1. executiveSummary: 3-4 sentences. (1) What the client wants to understand, (2) PetaSight's proposed methodology and why, (3) how our approach generates the insights needed. First-person plural. Specific to THIS RFP.

2. detectedStudyType: Pick best-fit typeCode from the list above. Include typeCode, displayName, familyCode, confidence (0-1), rationale.

3. methodology: approach (qualitative/quantitative/mixed), dataCollectionMethod, instrumentType, lengthOfInterviewMinutes, approximateQuestions, analysisApproach[], advancedAnalytics[], rationale. ALL derived from RFP objectives.

4. discussionGuide: THIS IS CRITICAL. Generate a complete, RFP-specific discussion guide.
   - format: e.g. "Semi-structured IDI" or "Online CAWI survey"
   - totalDurationMinutes: match the methodology
   - keyThemes[]: 3-5 themes derived DIRECTLY from the research objectives in the RFP
   - sections[]: minimum 5 sections. Each section must have:
     * section: descriptive name tied to a specific RFP objective
     * durationMinutes: integer
     * objective: what this section aims to uncover (specific to RFP)
     * keyQuestions[]: 3-5 actual questions (not placeholders). Include probes labelled "Probe: ..."
   - interviewerNotes: specific guidance for this study type and therapeutic area

5. sampleSizeOptions: 3 options (conservative/recommended/aggressive). Each must have label, n, segments (with actual segment names from RFP audience), country, confidenceInterval, fieldDurationWeeks, feasibilityScore, rationale. NO estimatedCost.

6. recruitmentStrategy: primarySource, sources[] (with vendor, role, coverage, estimatedContribution%, notes), incidenceRateAssumption, contactsNeeded, fraudControlMeasures[], complianceNotes.

7. projectTimeline: totalWeeks, phases[]. Each phase: phase name, startWeek, durationWeeks, tasks[], milestone. Derive durations from RFP timeline hints and feasibility data.

8. deliverables: list of deliverables with deliverable name, format, timing (Week N), description. Derived from RFP deliverables section.

9. scopeAssumptions: 4-6 assumptions. Each: assumptionId (A001...), category (sample/methodology/timeline/scope), assumption (specific PetaSight design decision), isStandard, riskLevel (low/medium/high), requiresClientConfirmation: false.

=== CONSTRAINTS ===
- Output ONLY the JSON object. No markdown, no text before or after.
- All section names, question topics, and segment names must reference the actual therapeutic area, indication, and HCP type from the RFP.
- discussionGuide.sections must have 5+ sections with genuine questions — this is the most important deliverable.
- Do NOT include any cost, price, or WBS fields anywhere.

Return the JSON now:`;

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI call timed out after 180s')), 180000)
      );

      const responseText = await Promise.race([
        this.invokeAI(this.getSystemPrompt(context), userPrompt, context),
        timeout,
      ]);

      // Parse JSON
      let plan: any;
      try {
        let jsonText = responseText.trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        }
        plan = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('Failed to parse LLM JSON response:', responseText.substring(0, 500));
        return { success: false, error: 'Failed to parse research plan from LLM response' };
      }

      if (!plan.discussionGuide) {
        console.warn('⚠️  LLM did not return discussionGuide — plan may be incomplete');
      }

      // Save to DB
      const [scope] = await sql`
        INSERT INTO scopes (
          opportunity_id, brief_id, tenant_id,
          executive_summary,
          detected_study_type, study_type_confidence,
          methodology, methodology_detail,
          sample_size_options,
          scope_assumptions,
          deliverables, key_milestones,
          recruitment_strategy,
          discussion_guide_outline,
          status, created_at, updated_at
        ) VALUES (
          ${context.opportunityId},
          ${brief.id},
          ${brief.tenant_id},
          ${plan.executiveSummary},
          ${plan.detectedStudyType.typeCode},
          ${plan.detectedStudyType.confidence},
          ${plan.methodology.approach},
          ${JSON.stringify(plan.methodology)},
          ${JSON.stringify(plan.sampleSizeOptions)},
          ${JSON.stringify(plan.scopeAssumptions)},
          ${JSON.stringify(plan.deliverables)},
          ${JSON.stringify(plan.projectTimeline)},
          ${JSON.stringify(plan.recruitmentStrategy)},
          ${JSON.stringify(plan.discussionGuide || null)},
          'draft',
          NOW(), NOW()
        )
        RETURNING *
      `;

      console.log(`✅ Research plan created: ${scope.id}`);
      console.log(`   Study type: ${plan.detectedStudyType.typeCode} (${Math.round(plan.detectedStudyType.confidence * 100)}%)`);
      console.log(`   Recommended: n=${plan.sampleSizeOptions?.find((o: any) => o.label === 'recommended')?.n}, ${plan.projectTimeline.totalWeeks}w`);

      return {
        success: true,
        data: { scopeId: scope.id, ...plan },
      };
    } catch (error: any) {
      console.error('Scope Planner Agent error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error in scope planner',
      };
    }
  }
}
