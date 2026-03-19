/**
 * Scope Planner Agent
 *
 * Responsibilities:
 * 1. Detect study type from RFP brief
 * 2. Generate 3 sample size options (conservative, recommended, aggressive)
 * 3. Create HCP shortlist if applicable
 * 4. Generate scope assumptions with risk flags
 *
 * Outputs:
 * - Study type detection with confidence
 * - 3 sample size options with cost estimates
 * - HCP shortlist (if HCP study)
 * - Scope assumptions log
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';

interface SampleSizeOption {
  label: string; // 'conservative' | 'recommended' | 'aggressive'
  n: number;
  segments?: { segment: string; n: number }[];
  confidenceInterval: string; // e.g., "±3% at 95% CI"
  estimatedCost: number;
  fieldDurationWeeks: number;
  feasibilityScore: number; // 0-100
  rationale: string;
}

interface HCPShortlistEntry {
  npi: string;
  name: string;
  specialty: string;
  subSpecialty?: string;
  geography: string;
  practiceType: string;
  patientVolume: string;
  yearsInPractice: number;
  languagesSpoken: string[];
  internalSignal: boolean; // 50% should be true
  matchScore: number; // 0-100
}

interface ScopeAssumption {
  assumptionId: string;
  category: string; // 'sample' | 'timeline' | 'methodology' | 'deliverables' | 'costs'
  assumption: string;
  isStandard: boolean; // Standard industry practice vs custom
  riskLevel: 'low' | 'medium' | 'high';
  requiresClientConfirmation: boolean;
}

interface ScopePlanOutput {
  detectedStudyType: {
    typeCode: string;
    displayName: string;
    familyCode: string;
    confidence: number; // 0-1
    rationale: string;
  };
  sampleSizeOptions: SampleSizeOption[];
  hcpShortlist?: HCPShortlistEntry[];
  scopeAssumptions: ScopeAssumption[];
  estimatedTotalCost: {
    conservative: number;
    recommended: number;
    aggressive: number;
  };
}

export class ScopePlannerAgent extends BaseAgent {
  protected agentType = 'scope_planner';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are an expert research methodology and scope designer for pharmaceutical market research projects.

Your task is to design a comprehensive research plan including:

**1. Study Type Detection**: Analyze the RFP and select the most appropriate study type from 27 options across 6 families:
- Understanding & Diagnosis (U&A, deep dive qual, patient journey, KOL advisory)
- Tracking & Monitoring (brand tracker, awareness tracker, patient registry)
- Testing & Optimization (concept test, positioning, message, creative, usability)
- Trade-off & Choice Modeling (conjoint, DCE, MaxDiff, priority mapping)
- Segmentation & Targeting (seg build, validation, sizing, personas)
- Pricing & Market Access (WTP, payer research, HTA, formulary)

**2. Methodology Design**: Create detailed methodology including:
- Research approach (qualitative, quantitative, mixed methods)
- Data collection methods (IDIs, focus groups, online surveys, CATI, etc.)
- Interview/survey duration and structure
- Discussion guide outline or questionnaire structure
- Analysis approach and techniques

**3. Sample Size Recommendations**: Provide 3 options (conservative, recommended, aggressive) with:
- Total sample size
- Segment breakdowns
- Statistical justification (confidence intervals, margin of error)
- Estimated fieldwork duration
- Feasibility score

**4. Project Delivery Plan**: Create full execution roadmap including:
- Project phases and stages (kickoff, guide development, fieldwork, analysis, reporting)
- Milestone dates and deliverable schedule
- Resource requirements
- Quality control checkpoints
- Risk mitigation strategies

**5. Deliverables Specification**: List all deliverables with specifications:
- Report formats and page counts
- Presentation formats
- Data files and formats
- Supporting materials

**6. Scope Assumptions**: Document all assumptions with:
- Assumption category (sample, timeline, methodology, deliverables, costs)
- Risk level (low/medium/high)
- Whether client confirmation is required

Guidelines:
- Design for actionability - ensure methodology will answer research objectives
- Be conservative with sample sizes for rare audiences or complex studies
- Factor in segments/subgroups when calculating total n
- Consider timeline constraints and feasibility
- Flag high-risk assumptions that need client confirmation
- Use industry-standard assumptions (15-20% oversample, etc.)

Output structured JSON matching the expected schema.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    const sql = getSql();

    try {
      // 1. Fetch brief and gap analysis
      const [brief] = await sql`
        SELECT * FROM briefs
        WHERE opportunity_id = ${context.opportunityId}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (!brief) {
        return {
          success: false,
          error: 'No brief found for this opportunity',
        };
      }

      const [gapAnalysis] = await sql`
        SELECT ga.* FROM gap_analyses ga
        JOIN briefs b ON ga.brief_id = b.id
        WHERE b.opportunity_id = ${context.opportunityId}
        ORDER BY ga.created_at DESC
        LIMIT 1
      `;

      // 2. Fetch study library for context
      const studyTypes = await sql`
        SELECT
          st.type_code,
          st.display_name,
          st.family_code,
          st.description,
          st.tags,
          sf.display_name as family_name,
          sd.task_set_code,
          sd.question_set_code,
          sd.multiplier_set_code,
          sd.default_deliverables
        FROM study_types st
        JOIN study_families sf ON sf.family_code = st.family_code
        LEFT JOIN study_definitions sd ON sd.type_code = st.type_code
        WHERE st.tenant_id IS NULL
        ORDER BY sf.sort_order, st.type_code
      `;

      // 3. Build prompt with brief context
      const userPrompt = `Analyze this RFP and create a scope plan:

**RFP BRIEF:**
${JSON.stringify(brief, null, 2)}

${gapAnalysis ? `\n**GAP ANALYSIS:**\n${JSON.stringify(gapAnalysis, null, 2)}` : ''}

**AVAILABLE STUDY TYPES:**
${studyTypes.map((st: any) =>
  `- ${st.type_code}: ${st.display_name} (${st.family_name})\n  Tags: ${JSON.stringify(st.tags)}\n  Description: ${st.description}`
).join('\n\n')}

**YOUR TASK:**
1. Detect the most appropriate study type based on the brief's objectives, methodology clues, and audience
2. Generate 3 sample size options:
   - Conservative: Higher n for tighter confidence intervals, safe feasibility
   - Recommended: Balanced n for good precision and reasonable cost
   - Aggressive: Lower n for cost efficiency, acceptable precision
3. For each option, provide:
   - Total n
   - Breakdown by segments (if applicable)
   - Confidence interval (e.g., "±3% at 95% CI" for quant, "saturation expected" for qual)
   - Estimated field cost (panel + incentives + 15% contingency)
   - Field duration in weeks
   - Feasibility score (0-100, considering audience difficulty, geography, timeline)
   - Rationale
4. Generate scope assumptions covering:
   - Sample assumptions (oversample, replacements, incidence)
   - Timeline assumptions (holidays, response rates)
   - Methodology assumptions (LOI, completion rate, dropout)
   - Deliverables assumptions (formats, review cycles)
   - Cost assumptions (buffer, OOP escalation)
5. Flag high-risk assumptions that require client confirmation

Return ONLY valid JSON matching this schema:
{
  "detectedStudyType": {
    "typeCode": "string",
    "displayName": "string",
    "familyCode": "string",
    "confidence": 0.0-1.0,
    "rationale": "string"
  },
  "sampleSizeOptions": [
    {
      "label": "conservative",
      "n": 400,
      "segments": [{"segment": "Oncologists", "n": 200}, {"segment": "PCPs", "n": 200}],
      "confidenceInterval": "±5% at 95% CI",
      "estimatedCost": 45000,
      "fieldDurationWeeks": 6,
      "feasibilityScore": 85,
      "rationale": "..."
    }
  ],
  "scopeAssumptions": [
    {
      "assumptionId": "A001",
      "category": "sample",
      "assumption": "15% oversample to account for screen-outs and quota management",
      "isStandard": true,
      "riskLevel": "low",
      "requiresClientConfirmation": false
    }
  ],
  "estimatedTotalCost": {
    "conservative": 65000,
    "recommended": 50000,
    "aggressive": 38000
  }
}`;

      // 4. Call LLM
      const responseText = await this.invokeAI(
        this.getSystemPrompt(context),
        userPrompt,
        context
      );

      // 5. Parse JSON response
      let scopePlanOutput: ScopePlanOutput;
      try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonText = responseText.trim();
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
        }
        scopePlanOutput = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('Failed to parse LLM JSON response:', responseText);
        return {
          success: false,
          error: 'Failed to parse scope plan from LLM response',
        };
      }

      // 6. Validate and enrich with HCP shortlist (if HCP study)
      if (brief.target_audience && brief.target_audience.includes('hcp')) {
        const hcpShortlist = await this.generateHCPShortlist(brief);
        scopePlanOutput.hcpShortlist = hcpShortlist;
      }

      // 7. Save scope plan to database
      const [scope] = await sql`
        INSERT INTO scopes (
          opportunity_id,
          brief_id,
          tenant_id,
          detected_study_type,
          study_type_confidence,
          sample_size_options,
          hcp_shortlist,
          scope_assumptions,
          estimated_total_cost,
          status,
          created_at,
          updated_at
        ) VALUES (
          ${context.opportunityId},
          ${brief.id},
          ${brief.tenant_id},
          ${scopePlanOutput.detectedStudyType.typeCode},
          ${scopePlanOutput.detectedStudyType.confidence},
          ${JSON.stringify(scopePlanOutput.sampleSizeOptions)},
          ${scopePlanOutput.hcpShortlist ? JSON.stringify(scopePlanOutput.hcpShortlist) : null},
          ${JSON.stringify(scopePlanOutput.scopeAssumptions)},
          ${JSON.stringify(scopePlanOutput.estimatedTotalCost)},
          'draft',
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      console.log(`✅ Scope plan created: ${scope.id}`);
      console.log(`   Study type detected: ${scopePlanOutput.detectedStudyType.typeCode} (${scopePlanOutput.detectedStudyType.confidence * 100}% confidence)`);
      console.log(`   Sample size options: ${scopePlanOutput.sampleSizeOptions.map(o => o.n).join(', ')}`);
      console.log(`   Assumptions: ${scopePlanOutput.scopeAssumptions.length}`);

      return {
        success: true,
        data: {
          scopeId: scope.id,
          ...scopePlanOutput,
        },
        metadata: {
          tokensUsed: response.usage.totalTokens,
          confidence: scopePlanOutput.detectedStudyType.confidence,
        },
      };
    } catch (error: any) {
      console.error('❌ Scope Planner Agent error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error in scope planner',
      };
    }
  }

  /**
   * Generate HCP shortlist from internal database
   * Filter by criteria and ensure 50% internal signal overlap
   */
  private async generateHCPShortlist(brief: any): Promise<HCPShortlistEntry[]> {
    const sql = getSql();

    try {
      // Extract filter criteria from brief
      const specialty = brief.specialty || brief.target_audience_specialty || null;
      const geography = brief.geography || brief.countries?.[0] || 'US';
      const targetN = brief.target_n || 30;

      // Query HCP database with filters
      // Target: 2x the sample size to allow for selection
      const hcps = await sql`
        SELECT
          npi,
          name,
          specialty,
          sub_specialty as "subSpecialty",
          geography,
          practice_type as "practiceType",
          patient_volume as "patientVolume",
          years_in_practice as "yearsInPractice",
          languages_spoken as "languagesSpoken",
          internal_signal as "internalSignal",
          100 as match_score
        FROM hcp_database
        WHERE
          ${specialty ? sql`specialty = ${specialty}` : sql`1=1`}
          AND ${geography ? sql`geography = ${geography}` : sql`1=1`}
          AND is_active = true
        ORDER BY
          internal_signal DESC,
          patient_volume DESC,
          years_in_practice DESC
        LIMIT ${targetN * 2}
      `;

      // Ensure 50% internal signal
      const withSignal = hcps.filter((h: any) => h.internalSignal);
      const withoutSignal = hcps.filter((h: any) => !h.internalSignal);

      const targetSignal = Math.ceil(targetN * 0.5);
      const targetNoSignal = targetN - targetSignal;

      const shortlist = [
        ...withSignal.slice(0, targetSignal),
        ...withoutSignal.slice(0, targetNoSignal),
      ];

      console.log(`   Generated HCP shortlist: ${shortlist.length} (${withSignal.length} with internal signal)`);

      return shortlist as HCPShortlistEntry[];
    } catch (error) {
      console.warn('Failed to generate HCP shortlist:', error);
      return [];
    }
  }
}
