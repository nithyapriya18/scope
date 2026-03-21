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
        panelData = panel.slice(0, 10).map((p: any) =>
          `${p.specialty}/${p.country}: panel=${p.panelSize}, activeRate=${Math.round(p.activeRate * 100)}%, recruitWeeks=${p.recruitmentWeeks}`
        ).join('\n');
      } catch { /* non-fatal */ }

      // ── 3. Build compact prompt — trim all inputs to avoid AI timeout ─────
      const rx: any = brief.raw_extraction || {};
      // Only pass key brief sections — not the full raw_extraction blob
      const briefSummary = {
        therapeuticArea: brief.therapeutic_area || opp?.therapeutic_area,
        targetAudience: brief.target_audience,
        objectives: (brief.research_objectives || []).slice(0, 5),
        methodology: rx.section6_methodology_scope || rx.methodology || '',
        geography: rx.section7_markets_geography || rx.geography || '',
        sample: rx.section8_target_audience_sample || rx.sampleRequirements || brief.sample_requirements || '',
        timeline: brief.timeline_requirements || rx.section9_timeline_key_dates || '',
        deliverables: (brief.deliverables || []).slice(0, 4),
        budget: brief.budget_indication || 'Not disclosed',
      };

      const rfpSnippet = (opp?.email_body || '').slice(0, 4000) +
        ((opp?.email_body || '').length > 4000 ? '\n...[truncated]' : '');

      // Compact gap analysis — top 5 critical gaps only
      const gapSummary = gapAnalysis ? {
        completenessScore: (gapAnalysis.llm_analysis as any)?.completenessScore,
        criticalGaps: (gapAnalysis.missing_fields || []).slice(0, 5).map((g: any) => ({ field: g.field, defaultAssumption: g.defaultAssumption })),
        ambiguous: (gapAnalysis.ambiguous_requirements || []).slice(0, 3).map((a: any) => ({ field: a.field, ambiguity: a.ambiguity })),
      } : null;

      // Normalize clarification questions — top 6 only
      let clarQs: any[] = [];
      if (clarification?.questions) {
        const raw = typeof clarification.questions === 'string'
          ? JSON.parse(clarification.questions)
          : clarification.questions;
        const arr = Array.isArray(raw) ? raw : (raw.questions || []);
        clarQs = arr.slice(0, 6);
      }

      const userPrompt = `
=== GOAL ===
Design a research plan for PetaSight's pharma RFP bid. All decisions must be specific to this RFP.

=== INPUT 1: RFP TEXT ===
${rfpSnippet || 'Not available — use brief below'}

=== INPUT 2: STRUCTURED BRIEF ===
${JSON.stringify(briefSummary)}

=== INPUT 3: GAP ANALYSIS ===
${gapSummary ? JSON.stringify(gapSummary) : 'None available'}

=== INPUT 4: CLARIFICATION Q&A ===
Questions: ${JSON.stringify(clarQs.map((q: any) => ({ topic: q.topic || q.category, q: q.questionText || q.question, default: q.defaultAssumption })))}
Responses: ${clarification?.client_responses ? JSON.stringify(clarification.client_responses) : (clarification?.client_response_text || 'None — use default assumptions')}

=== INPUT 5: FEASIBILITY ===
${feasibility ? JSON.stringify({ score: (feasibility.overall_feasibility as any)?.feasibilityScore || (feasibility.overall_feasibility as any)?.score, hcpAvailable: (feasibility.hcp_availability as any)?.panelSize || (feasibility.hcp_availability as any)?.total_available, recommendations: feasibility.recommendations }) : 'Not available'}

=== INPUT 6: PANEL DATA ===
${panelData || 'Not available'}

=== INPUT 7: STUDY TYPES ===
${studyTypes.map((s: any) => `${s.type_code}: ${s.display_name}`).join(', ')}

=== OUTPUT REQUIREMENTS ===
Return a JSON object with these fields:

1. executiveSummary: 2-3 sentences — client objective, PetaSight methodology, expected outcome.

2. detectedStudyType: { typeCode, displayName, familyCode, confidence (0-1), rationale }

3. methodology: { approach, dataCollectionMethod, instrumentType, lengthOfInterviewMinutes, approximateQuestions, analysisApproach[], rationale }

4. discussionGuide: {
     format, totalDurationMinutes,
     keyThemes[]: 3-4 themes from RFP objectives,
     sections[]: 4 sections each with { section, durationMinutes, objective, keyQuestions[3 real questions] },
     interviewerNotes
   }

5. sampleSizeOptions: 3 options [{label:"conservative"|"recommended"|"aggressive", n, segments[{name,n}], country, fieldDurationWeeks, rationale}]

6. projectTimeline: { totalWeeks, phases[{phase, startWeek, durationWeeks, milestone}] }

7. deliverables: [{deliverable, format, timing, description}] — max 5 items

8. scopeAssumptions: 4 items [{assumptionId, category, assumption, riskLevel}]

=== CONSTRAINTS ===
- Output ONLY valid JSON. No markdown.
- All content must reference the actual RFP therapeutic area, HCP type, and objectives.
- Do NOT include any cost, price, or budget fields.

Return the JSON now:`;

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI call timed out after 240s')), 240000)
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

      // Safely extract nested fields (AI may return null/string instead of expected object)
      const detectedStudyType = plan.detectedStudyType || {};
      const studyTypeCode = typeof detectedStudyType === 'object'
        ? (detectedStudyType.typeCode || detectedStudyType.type_code || 'qualitative_idi')
        : String(detectedStudyType);
      const studyTypeConfidence = typeof detectedStudyType === 'object'
        ? (detectedStudyType.confidence ?? 0.8)
        : 0.8;
      const methodology = plan.methodology || {};
      const methodologyApproach = typeof methodology === 'object'
        ? (methodology.approach || 'qualitative')
        : String(methodology);

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
          ${plan.executiveSummary || ''},
          ${studyTypeCode},
          ${studyTypeConfidence},
          ${methodologyApproach},
          ${JSON.stringify(methodology)},
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
