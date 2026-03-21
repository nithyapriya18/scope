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

      // ── 3. Build shared context inputs ───────────────────────────────────
      const rx: any = brief.raw_extraction || {};
      const rfpSnippet = (opp?.email_body || '').slice(0, 6000) +
        ((opp?.email_body || '').length > 6000 ? '\n...[truncated — brief extraction covers full content]' : '');

      const briefSummary = {
        therapeuticArea: brief.therapeutic_area || opp?.therapeutic_area,
        targetAudience: brief.target_audience,
        objectives: brief.research_objectives || [],
        methodology: rx.section6_methodology_scope || rx.methodology || '',
        geography: rx.section7_markets_geography || rx.geography || '',
        sample: rx.section8_target_audience_sample || brief.sample_requirements || '',
        timeline: brief.timeline_requirements || rx.section9_timeline_key_dates || '',
        deliverables: brief.deliverables || [],
        budget: brief.budget_indication || 'Not disclosed',
      };

      // Parse double-encoded JSONB fields from gap_analyses table
      const parseJsonbField = (v: any): any[] => {
        if (!v) return [];
        if (Array.isArray(v)) return v;
        if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
        return [];
      };
      const parseJsonbObj = (v: any): any => {
        if (!v) return {};
        if (typeof v === 'object' && !Array.isArray(v)) return v;
        if (typeof v === 'string') { try { return JSON.parse(v); } catch { return {}; } }
        return {};
      };

      const missingFields = parseJsonbField(gapAnalysis?.missing_fields);
      const ambiguousReqs = parseJsonbField(gapAnalysis?.ambiguous_requirements);
      const llmAnalysis = parseJsonbObj(gapAnalysis?.llm_analysis);

      const gapSummary = gapAnalysis ? {
        completenessScore: llmAnalysis?.completenessScore,
        criticalGaps: missingFields.map((g: any) => ({ field: g.field, defaultAssumption: g.defaultAssumption })),
        ambiguous: ambiguousReqs.map((a: any) => ({ field: a.field, ambiguity: a.ambiguity })),
        defaultAssumptions: llmAnalysis?.defaultAssumptions || [],
      } : null;

      let clarQs: any[] = [];
      if (clarification?.questions) {
        const raw = typeof clarification.questions === 'string'
          ? JSON.parse(clarification.questions)
          : clarification.questions;
        clarQs = Array.isArray(raw) ? raw : (raw.questions || []);
      }

      const sharedContext = `
=== INPUT 1: RFP TEXT (first 6000 chars) ===
${rfpSnippet || 'Not available — use brief sections below'}

=== INPUT 2: STRUCTURED BRIEF ===
${JSON.stringify(briefSummary)}

=== INPUT 3: GAP ANALYSIS ===
${gapSummary ? JSON.stringify(gapSummary) : 'None available'}

=== INPUT 4: CLARIFICATION Q&A ===
Questions sent: ${JSON.stringify(clarQs.map((q: any) => ({ topic: q.topic || q.category, q: q.questionText || q.question, default: q.defaultAssumption })))}
Client responses: ${clarification?.client_responses ? JSON.stringify(clarification.client_responses) : (clarification?.client_response_text || 'No response — use default assumptions')}

=== INPUT 5: FEASIBILITY INTELLIGENCE ===
${feasibility ? JSON.stringify({ feasibilityScore: (feasibility.overall_feasibility as any)?.feasibilityScore || (feasibility.overall_feasibility as any)?.score, hcpAvailable: (feasibility.hcp_availability as any)?.panelSize || (feasibility.hcp_availability as any)?.total_available, geographies: feasibility.geographic_feasibility, recommendations: feasibility.recommendations }) : 'Not available'}

=== INPUT 6: PANEL REFERENCE DATA ===
${panelData || 'Not available'}

=== INPUT 7: AVAILABLE STUDY TYPES ===
${studyTypes.map((s: any) => `${s.type_code}: ${s.display_name} (family: ${s.family_code})`).join('\n')}`;

      // ── 4. Two parallel AI calls to avoid single-call timeout ────────────
      // Call A: Core plan (studyType, methodology, sample, timeline, deliverables, assumptions)
      const promptA = `
=== GOAL ===
Design the core research plan for PetaSight's pharma RFP bid. Every decision must be derived from the RFP and supporting inputs — not templates.

${sharedContext}

=== OUTPUT REQUIREMENTS ===
Return a JSON object with EXACTLY these fields:

1. executiveSummary: 3-4 sentences — (1) what the client wants to understand, (2) PetaSight's proposed methodology and why, (3) how our approach generates the insights needed. First-person plural. Specific to THIS RFP.

2. detectedStudyType: { typeCode (from study types list), displayName, familyCode, confidence (0-1), rationale }

3. methodology: { approach (qualitative/quantitative/mixed), dataCollectionMethod, instrumentType, lengthOfInterviewMinutes, approximateQuestions, analysisApproach[], advancedAnalytics[], rationale }

4. sampleSizeOptions: 3 options — each: { label ("conservative"|"recommended"|"aggressive"), n, segments[{name,n}], country, confidenceInterval, fieldDurationWeeks, feasibilityScore, rationale }. NO estimatedCost.

5. recruitmentStrategy: { primarySource, sources[{vendor, role, coverage, estimatedContribution%, notes}], incidenceRateAssumption, contactsNeeded, fraudControlMeasures[], complianceNotes }

6. projectTimeline: { totalWeeks, phases[{phase, startWeek, durationWeeks, tasks[], milestone}] }

7. deliverables: [{deliverable, format, timing (Week N), description}]

8. scopeAssumptions: 4-6 items [{assumptionId (A001...), category, assumption, isStandard, riskLevel, requiresClientConfirmation: false}]

=== CONSTRAINTS ===
- Output ONLY valid JSON. No markdown, no commentary.
- All segment names, HCP types, and deliverable names must reference the actual RFP content.
- Do NOT include any cost, price, or WBS fields.

Return the JSON now:`;

      // Call B: Discussion guide only (content-heavy — deserves its own call)
      const promptB = `
=== GOAL ===
Create a complete, client-ready discussion guide for PetaSight's pharma research study. Every question must directly address the stated research objectives from the RFP.

${sharedContext}

=== OUTPUT REQUIREMENTS ===
Return a JSON object with a SINGLE field: discussionGuide

discussionGuide: {
  format: e.g. "Semi-structured IDI" or "Online CAWI survey",
  totalDurationMinutes: match the study methodology,
  keyThemes[]: 3-5 major research themes derived DIRECTLY from the RFP objectives,
  sections[]: minimum 5 sections — each section MUST have:
    {
      section: descriptive name tied to a specific RFP objective,
      durationMinutes: integer,
      objective: what this section aims to uncover (specific to this RFP),
      keyQuestions[]: 3-5 REAL questions (not placeholders). Include probes labelled "Probe: ..."
    }
  interviewerNotes: specific moderator/interviewer guidance for this therapeutic area and study type
}

=== CONSTRAINTS ===
- Output ONLY valid JSON: { "discussionGuide": { ... } }
- Every question must reference the actual therapeutic area, indication, and HCP/patient audience from the RFP.
- Questions must be substantive and interview-ready — not generic templates.

Return the JSON now:`;

      console.log('🔄 ScopePlanner: running two parallel AI calls (core plan + discussion guide)...');

      const callTimeout = 240000;
      const makeTimeout = (label: string) => new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after 240s`)), callTimeout)
      );

      const [responseA, responseB] = await Promise.all([
        Promise.race([this.invokeAI(this.getSystemPrompt(context), promptA, context), makeTimeout('Call A (core plan)')]),
        Promise.race([this.invokeAI(this.getSystemPrompt(context), promptB, context), makeTimeout('Call B (discussion guide)')]),
      ]);

      // ── 5. Parse both responses ───────────────────────────────────────────
      const parseJson = (text: string, label: string) => {
        let t = text.trim();
        if (t.startsWith('```')) t = t.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        try { return JSON.parse(t); }
        catch (e) {
          console.error(`Failed to parse ${label}:`, t.substring(0, 300));
          return null;
        }
      };

      const planA = parseJson(responseA, 'Call A');
      const planB = parseJson(responseB, 'Call B');

      if (!planA) return { success: false, error: 'Failed to parse core research plan from AI response' };

      // Merge: core plan + discussion guide
      const plan = { ...planA, discussionGuide: planB?.discussionGuide || null };

      if (!plan.discussionGuide) {
        console.warn('⚠️  Call B did not return discussionGuide — saving core plan without it');
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
