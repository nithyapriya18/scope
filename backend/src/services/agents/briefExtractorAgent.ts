/**
 * Brief Extractor Agent — Step 2
 * RAG-based: uses tools to read specific RFP sections iteratively.
 * Extracts structured 13-section brief, computes weighted completeness score,
 * fieldConfidence per field, studyFamily classification, criticalGaps, conflicts.
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';
import { Tool } from '../aiServiceTypes';
import { jobQueueService } from '../jobQueue';

const STUDY_FAMILIES = `
1. UNDERSTANDING_DIAGNOSIS: U&A studies, deep-dive qualitative, patient journey, KOL advisory boards, ethnography
2. TRACKING_MONITORING: Brand trackers, awareness trackers, patient registries, longitudinal panels
3. TESTING_OPTIMIZATION: Concept tests, positioning tests, message testing, creative testing, usability testing
4. TRADEOFF_CHOICE: Conjoint analysis, DCE (Discrete Choice Experiment), MaxDiff, priority mapping
5. SEGMENTATION_TARGETING: Segmentation builds, segment validation, market sizing, persona development
6. PRICING_MARKET_ACCESS: WTP (willingness to pay), payer research, HTA landscape, formulary research
`;

const COMPLETENESS_WEIGHTS = `
Weighted completeness formula — assign partial credit proportionally (total = 100 pts):
  research_objectives (section5): 15 pts
  target_audience (section8 audience + sample): 15 pts
  methodology (section6): 15 pts
  sample_requirements (section8 sample size details): 15 pts
  geography / countries (section7): 10 pts
  deliverables (section10): 10 pts
  timeline (section9): 10 pts
  compliance_budget (section3 + section11): 10 pts
Score 0 if missing, partial weight if partial, full weight if complete. Sum = completenessScore (0-100).
`;

// ── RFP Section chunker ────────────────────────────────────────────
function chunkRfpText(rfpText: string): Map<string, string> {
  const chunks = new Map<string, string>();
  chunks.set('full_document', rfpText);

  // Try to split by common RFP section headers
  const sectionPatterns = [
    { key: 'background', pattern: /(?:background|introduction|overview|context)[\s:.\-]*/i },
    { key: 'objectives', pattern: /(?:objectives?|purpose|goals?|aims?)[\s:.\-]*/i },
    { key: 'methodology', pattern: /(?:methodology|research design|approach|method)[\s:.\-]*/i },
    { key: 'sample', pattern: /(?:sample|respondent|participant|audience|target|recruit)[\s:.\-]*/i },
    { key: 'geography', pattern: /(?:geograph|country|countries|market|region|location)[\s:.\-]*/i },
    { key: 'timeline', pattern: /(?:timeline|schedule|timing|milestones?|key dates?|deadline)[\s:.\-]*/i },
    { key: 'deliverables', pattern: /(?:deliverable|output|reporting|report)[\s:.\-]*/i },
    { key: 'budget', pattern: /(?:budget|cost|pricing|fee|financial|payment)[\s:.\-]*/i },
    { key: 'submission', pattern: /(?:submission|proposal|format|requirements for)[\s:.\-]*/i },
    { key: 'evaluation', pattern: /(?:evaluation|criteria|scoring|selection|award)[\s:.\-]*/i },
    { key: 'confidentiality', pattern: /(?:confidential|nda|non.disclosure|proprietary)[\s:.\-]*/i },
    { key: 'contact', pattern: /(?:contact|issuer|issued by|from:|client info)[\s:.\-]*/i },
    { key: 'scope', pattern: /(?:scope|study design|research scope)[\s:.\-]*/i },
  ];

  // Split text into lines and find section boundaries
  const lines = rfpText.split('\n');
  const sectionStarts: { key: string; lineIdx: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length < 3 || line.length > 200) continue;
    for (const { key, pattern } of sectionPatterns) {
      if (pattern.test(line)) {
        sectionStarts.push({ key, lineIdx: i });
        break;
      }
    }
  }

  // Extract content between section boundaries
  for (let i = 0; i < sectionStarts.length; i++) {
    const start = sectionStarts[i].lineIdx;
    const end = i + 1 < sectionStarts.length ? sectionStarts[i + 1].lineIdx : lines.length;
    const content = lines.slice(start, end).join('\n').trim();
    if (content.length > 50) {
      chunks.set(sectionStarts[i].key, content);
    }
  }

  // Also create overlapping chunks of ~2000 chars for general search
  const chunkSize = 2000;
  const overlap = 200;
  for (let i = 0; i < rfpText.length; i += chunkSize - overlap) {
    const chunk = rfpText.slice(i, i + chunkSize);
    chunks.set(`chunk_${Math.floor(i / (chunkSize - overlap))}`, chunk);
  }

  return chunks;
}

// ── Tool definitions ───────────────────────────────────────────────
const TOOLS: Tool[] = [
  {
    name: 'read_rfp_section',
    description: `Read a specific section of the RFP document. Available sections: background, objectives, methodology, sample, geography, timeline, deliverables, budget, submission, evaluation, confidentiality, contact, scope. You can also use "full_document" for the entire text, or "search:<keyword>" to search for a keyword across the entire document.`,
    input_schema: {
      type: 'object',
      properties: {
        section_name: {
          type: 'string',
          description: 'Section name (e.g., "methodology", "sample", "budget") or "search:<keyword>" to search the full document for a keyword',
        },
      },
      required: ['section_name'],
    },
  },
  {
    name: 'lookup_similar_briefs',
    description: 'Look up past briefs for similar studies by therapeutic area and study type. Returns summary of what previous briefs typically contain for this type of study.',
    input_schema: {
      type: 'object',
      properties: {
        therapeutic_area: { type: 'string', description: 'e.g., "Oncology", "CNS", "Immunology"' },
        study_type: { type: 'string', description: 'e.g., "Qualitative", "Quantitative", "Brand Tracker"' },
      },
      required: ['therapeutic_area'],
    },
  },
];

export class BriefExtractorAgent extends BaseAgent {
  protected agentType = 'brief_extract';

  protected getSystemPrompt(_context: AgentContext): string {
    return `You are a Senior PMR Brief Specialist at PetaSight, a pharma market research firm.
Your job is to extract every structured requirement from a pharma RFP — regardless of format.

You have tools to read specific sections of the RFP. USE THEM to find all information.
Do NOT guess or assume — if you need data, call read_rfp_section to find it.

Strategy:
1. First read the full_document to get an overview
2. Then read specific sections (methodology, sample, geography, timeline, budget, deliverables, etc.) to extract detailed requirements
3. If a section is missing, search for keywords using "search:<keyword>"
4. When you have enough data, output the final JSON

Every field you extract must come directly from the RFP text. Do not invent values.
When you are done extracting, output ONLY the final JSON — no markdown, no commentary.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const { rfpText, fileName } = context.data;
      if (!rfpText) return { success: false, error: 'No RFP text provided' };

      const sql = getSql();
      const [opp] = await sql`
        SELECT rfp_title, client_name, therapeutic_area FROM opportunities WHERE id = ${context.opportunityId}
      `;

      // Chunk the RFP for tool-based retrieval
      const rfpChunks = chunkRfpText(rfpText);
      console.log(`📄 BriefExtractor: RFP has ${rfpText.length} chars, ${rfpChunks.size} chunks`);

      // Find the job for progress updates
      const jobs = await jobQueueService.getJobsByOpportunity(context.opportunityId);
      const currentJob = jobs.find((j: any) => j.jobType === 'brief_extract' && j.status === 'in_progress');

      // ── Tool handler ─────────────────────────────────────────
      const handleToolCall = async (toolName: string, input: any): Promise<string> => {
        if (toolName === 'read_rfp_section') {
          const sectionName = input.section_name?.toLowerCase() || '';

          // Handle search queries
          if (sectionName.startsWith('search:')) {
            const keyword = sectionName.replace('search:', '').trim().toLowerCase();
            const results: string[] = [];
            for (const [key, content] of rfpChunks) {
              if (key.startsWith('chunk_') && content.toLowerCase().includes(keyword)) {
                results.push(content);
              }
            }
            if (results.length === 0) {
              // Search in section chunks too
              for (const [key, content] of rfpChunks) {
                if (!key.startsWith('chunk_') && content.toLowerCase().includes(keyword)) {
                  results.push(`[Section: ${key}]\n${content}`);
                }
              }
            }
            return results.length > 0
              ? results.slice(0, 3).join('\n---\n').slice(0, 6000)
              : `No content found matching "${keyword}" in the RFP.`;
          }

          // Handle full document (give first 4000 + last 2000 as overview)
          if (sectionName === 'full_document') {
            const full = rfpChunks.get('full_document') || '';
            if (full.length <= 6000) return full;
            return full.slice(0, 4000) + '\n\n...[middle sections omitted — use read_rfp_section with specific section names to read them]...\n\n' + full.slice(-2000);
          }

          // Handle specific sections
          const content = rfpChunks.get(sectionName);
          if (content) return content;

          // Fuzzy match
          for (const [key, val] of rfpChunks) {
            if (key.includes(sectionName) || sectionName.includes(key)) return val;
          }

          return `Section "${sectionName}" not found. Available sections: ${Array.from(rfpChunks.keys()).filter(k => !k.startsWith('chunk_')).join(', ')}. Try "search:<keyword>" to search across the full document.`;
        }

        if (toolName === 'lookup_similar_briefs') {
          const area = input.therapeutic_area || '';
          const studyType = input.study_type || '';

          // Query past briefs from DB
          const pastBriefs = await sql`
            SELECT b.study_type, b.research_objectives, b.target_audience, b.therapeutic_area,
                   b.sample_requirements, b.confidence_score
            FROM briefs b
            JOIN opportunities o ON o.id = b.opportunity_id
            WHERE (b.therapeutic_area ILIKE ${'%' + area + '%'} OR o.therapeutic_area ILIKE ${'%' + area + '%'})
              ${studyType ? sql`AND b.study_type ILIKE ${'%' + studyType + '%'}` : sql``}
            ORDER BY b.confidence_score DESC NULLS LAST
            LIMIT 3
          `;

          if (pastBriefs.length === 0) {
            return `No past briefs found for therapeutic area "${area}"${studyType ? ` and study type "${studyType}"` : ''}. Proceed with extraction based solely on the RFP.`;
          }

          return pastBriefs.map((b: any, i: number) =>
            `Brief ${i + 1}: ${b.study_type || 'Unknown type'} | ${b.therapeutic_area || area}
  Objectives: ${JSON.stringify(b.research_objectives || []).slice(0, 200)}
  Audience: ${b.target_audience || 'N/A'}
  Sample: ${JSON.stringify(b.sample_requirements || {}).slice(0, 200)}
  Confidence: ${b.confidence_score || 'N/A'}`
          ).join('\n\n');
        }

        return 'Unknown tool';
      };

      // ── Build the initial user message ───────────────────────
      const userMessage = `
=== GOAL ===
Extract a fully-structured brief from the pharma RFP. Map content to all 13 sections of the
PetaSight standard template. Use your tools to read different parts of the RFP thoroughly.

=== RFP METADATA ===
Filename: ${fileName || 'unknown'}
Title (from intake): ${opp?.rfp_title || 'unknown'}
Client (from intake): ${opp?.client_name || 'unknown'}
Total document length: ${rfpText.length} characters

=== INSTRUCTIONS ===
1. Start by reading the full_document for an overview
2. Then read specific sections: methodology, sample, geography, timeline, budget, deliverables, objectives, background, contact, confidentiality, submission, evaluation
3. Use lookup_similar_briefs if you want to see what past briefs for similar studies looked like
4. When confident you have all data, output the final JSON

=== REFERENCE: STUDY FAMILIES ===
${STUDY_FAMILIES}

=== REFERENCE: COMPLETENESS SCORING ===
${COMPLETENESS_WEIGHTS}

=== OUTPUT REQUIREMENTS (output this JSON when done) ===
Return a JSON object with ALL of the following fields:

1. templateCoverage: object with keys section1_contact_issuer through section13_evaluation_criteria,
   each value "COMPLETE" | "PARTIAL" | "MISSING"

2. section1_contact_issuer: {issuerName, contactPerson, contactTitle, contactEmail, submissionEmail, submissionDeadline}
3. section2_company: {companyName, division, description}
4. section3_confidentiality: {nda_required: boolean, confidentialityLevel: "CONFIDENTIAL"|"PROPRIETARY"|"PUBLIC", terms}
5. section4_project_background_context: {therapeuticArea, diseaseArea, productBrand, lifecycleStage, background, problemStatement}
6. section5_business_research_objectives: {businessObjectives: string[], researchObjectives: string[], keyQuestions: string[]}
7. section6_methodology_scope: {primaryMethodology, studySubtype, researchDesign, dataCollection, numberOfWaves, supplierDiscretion}
8. section7_markets_geography: {markets: string[], primaryMarkets: string[], globalStudy: boolean, numberOfCountries: number, excludedMarkets: string[]}
9. section8_target_audience_sample: {primaryTargetAudience, audienceDescription, targetSampleSize, sampleBreakdown: object, quotas, specialRequirements}
10. section9_timeline_key_dates: {rfpIssueDate, proposalDeadline, questionsDeadline, projectStartDate, projectEndDate, projectDuration, contractLength}
11. section10_deliverables: {deliverables: string[], reportFormat, presentations, dataAccess}
12. section11_budget_cost: {budgetRange, currency, costingTemplate, paymentTerms}
13. section12_submission_requirements: {format, maxPages, submissionDeadline, exclusionGrounds}
14. section13_evaluation_criteria: {criteria: string[], weightings: object, evaluationProcess}

15. studyFamily: one of UNDERSTANDING_DIAGNOSIS | TRACKING_MONITORING | TESTING_OPTIMIZATION |
    TRADEOFF_CHOICE | SEGMENTATION_TARGETING | PRICING_MARKET_ACCESS
16. studyFamilyRationale: 1 sentence explaining the classification
17. studyType: "Qualitative" | "Quantitative" | "Mixed Methods" | "Conjoint / Choice Modeling" |
    "Chart Review / Retrospective" | "Message Testing / Concept Testing" | "Segmentation"
18. studySubtype: specific program name (e.g. "Brand Equity Tracker", "Patient Journey", "TPP Conjoint")

19. fieldConfidence: object with "high"|"medium"|"low" for each key:
    therapeuticArea, targetAudience, sampleSize, methodology, geography, deliverables, timeline, budget

20. completenessScore: 0-100 integer using the weighted formula from the reference above

21. criticalGaps: string array of field names that are null/missing AND required for research design.
22. conflicts: array of {field, value1, source1, value2, source2} for any contradictions in the RFP
23. completeSections: integer count of COMPLETE sections (0-13)
24. missingSections: integer count of MISSING sections (0-13)
25. overallCompletenessPercent: (completeSections / 13) * 100

RULES:
- Redacted placeholders like [CLIENT_ORG], [DATE], [BRAND_A] → "Redacted"
- Fields truly absent from RFP → null
- Fields left open to supplier → "Supplier discretion"
- Extract ALL items for array fields — do not truncate
- Output ONLY the JSON object when done. No markdown, no text outside.

Start by calling read_rfp_section with "full_document" to get an overview.`;

      // ── Tool-use loop ────────────────────────────────────────
      const MAX_ITERATIONS = 8;
      let conversationHistory: any[] = [];
      let finalResponse = '';
      let totalToolCalls = 0;

      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        if (currentJob) {
          const progress = Math.min(80, 15 + (iteration * 10));
          await jobQueueService.updateProgress(
            currentJob.id,
            progress,
            iteration === 0 ? 'Reading RFP document...' : `Extracting sections (pass ${iteration + 1})...`
          );
        }

        const result = await this.invokeAIWithTools(
          this.getSystemPrompt(context),
          iteration === 0 ? userMessage : '', // Only send user message on first iteration
          TOOLS,
          context,
          conversationHistory
        );

        // Check if the response contains tool calls
        if (result.toolCalls && result.toolCalls.length > 0) {
          // Add assistant message with tool calls to history
          const assistantContent: any[] = [];
          if (result.response) {
            assistantContent.push({ type: 'text', text: result.response });
          }
          for (const tc of result.toolCalls) {
            assistantContent.push({
              type: 'tool_use',
              id: `tool_${totalToolCalls++}`,
              name: tc.name,
              input: tc.input,
            });
          }
          conversationHistory.push({ role: 'assistant', content: assistantContent });

          // Execute tools and add results
          const toolResults: any[] = [];
          for (let i = 0; i < result.toolCalls.length; i++) {
            const tc = result.toolCalls[i];
            console.log(`  🔧 Tool call: ${tc.name}(${JSON.stringify(tc.input).slice(0, 100)})`);
            const toolResult = await handleToolCall(tc.name, tc.input);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: `tool_${totalToolCalls - result.toolCalls.length + i}`,
              content: toolResult,
            });
          }
          conversationHistory.push({ role: 'user', content: toolResults });
        } else {
          // No tool calls — this is the final response
          finalResponse = result.response;
          break;
        }
      }

      if (!finalResponse) {
        // If we ran out of iterations, do one final call without tools to force JSON output
        const forceResult = await this.invokeAI(
          this.getSystemPrompt(context),
          'Based on all the RFP sections you have read, output the final JSON brief now. Output ONLY the JSON object.',
          context
        );
        finalResponse = forceResult;
      }

      // ── Parse JSON response ──────────────────────────────────
      let extractedData: any;
      try {
        let json = finalResponse.trim();
        if (json.startsWith('```')) json = json.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        const jsonMatch = json.match(/\{[\s\S]*\}/);
        extractedData = JSON.parse(jsonMatch ? jsonMatch[0] : json);
      } catch {
        console.error('BriefExtractorAgent: failed to parse JSON:', finalResponse.substring(0, 300));
        return { success: false, error: 'Failed to parse AI response as JSON' };
      }

      // ── Extract fields and save ──────────────────────────────
      const getSection = (data: any, ...keys: string[]) => {
        for (const k of keys) if (data[k] && typeof data[k] === 'object') return data[k];
        return {};
      };

      const section4 = getSection(extractedData, 'section4_project_background_context', 'section4_background', 'section4');
      const section5 = getSection(extractedData, 'section5_business_research_objectives', 'section5_objectives', 'section5');
      const section6 = getSection(extractedData, 'section6_methodology_scope', 'section6_methodology', 'section6');
      const section7 = getSection(extractedData, 'section7_markets_geography', 'section7_geography', 'section7');
      const section8 = getSection(extractedData, 'section8_target_audience_sample', 'section8_audience', 'section8');
      const section9 = getSection(extractedData, 'section9_timeline_key_dates', 'section9_timeline', 'section9');
      const section10 = getSection(extractedData, 'section10_deliverables', 'section10');
      const section11 = getSection(extractedData, 'section11_budget_cost', 'section11_budget', 'section11');

      const researchObjectives = section5.researchObjectives || [];
      const targetAudience = section8.primaryTargetAudience || section8.audienceDescription || 'Not specified';
      const therapeuticArea = section4.therapeuticArea || opp?.therapeutic_area || 'Not specified';

      const studySubtype = extractedData.studySubtype || section6.studySubtype || null;
      const studyType = studySubtype
        ? `${extractedData.studyType || section6.primaryMethodology || 'Not specified'} — ${studySubtype}`
        : (extractedData.studyType || section6.primaryMethodology || 'Not specified');

      const sampleRequirements = {
        totalSize: section8.targetSampleSize || 'Not specified',
        breakdown: section8.sampleBreakdown || {},
        quotas: section8.quotas || 'Not specified',
        geographicCoverage: section7.markets || [],
        targetAudience: section8,
        templateCoverage: extractedData.templateCoverage || {},
      };

      const completenessScore = extractedData.completenessScore ?? extractedData.overallCompletenessPercent ?? 0;
      const confidenceScore = Math.max(0, Math.min(1, completenessScore / 100));

      const [brief] = await sql`
        INSERT INTO briefs (
          opportunity_id,
          research_objectives,
          target_audience,
          therapeutic_area,
          study_type,
          sample_requirements,
          timeline_requirements,
          deliverables,
          budget_indication,
          raw_extraction,
          confidence_score,
          created_at,
          updated_at
        ) VALUES (
          ${context.opportunityId},
          ${researchObjectives},
          ${targetAudience},
          ${therapeuticArea},
          ${studyType},
          ${JSON.stringify(sampleRequirements)}::jsonb,
          ${section9.projectDuration || section9.contractLength || null},
          ${section10.deliverables || []},
          ${section11.budgetRange || null},
          ${JSON.stringify(extractedData)}::jsonb,
          ${confidenceScore},
          now(),
          now()
        )
        RETURNING id
      `;

      await sql`
        UPDATE opportunities
        SET status = 'brief_extract', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      const completeSections = extractedData.completeSections || 0;
      console.log(`✅ Brief extraction complete (RAG): ${studyType} | ${therapeuticArea}`);
      console.log(`   Completeness: ${completenessScore}/100 | Sections: ${completeSections}/13`);
      console.log(`   Study family: ${extractedData.studyFamily}`);
      console.log(`   Critical gaps: ${(extractedData.criticalGaps || []).length}`);
      console.log(`   Tool calls made: ${totalToolCalls}`);

      return {
        success: true,
        data: {
          briefId: brief.id,
          studyType,
          studyFamily: extractedData.studyFamily,
          targetAudience,
          therapeuticArea,
          completenessScore,
          criticalGaps: extractedData.criticalGaps || [],
          toolCallsMade: totalToolCalls,
          currentStatus: 'brief_extract',
          nextStatus: 'gap_analysis',
        },
        metadata: { confidence: confidenceScore },
      };
    } catch (error: any) {
      console.error('BriefExtractorAgent error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Override invokeAIWithTools to support conversation history for tool-use loop
   */
  private async invokeAIWithTools(
    systemPrompt: string,
    userMessage: string,
    tools: Tool[],
    context: AgentContext,
    conversationHistory: any[] = []
  ): Promise<{ response: string; toolCalls?: any[] }> {
    const startTime = Date.now();

    // Build messages array
    const messages = [...conversationHistory];
    if (userMessage) {
      messages.push({ role: 'user', content: userMessage });
    }

    const response = await this.aiService.invokeWithTools(
      systemPrompt,
      '', // Empty — we pass messages via conversationHistory
      tools,
      messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      }))
    );

    const durationMs = Date.now() - startTime;

    if (response.usage) {
      const { usageTrackingService } = await import('../usageTracking');
      await usageTrackingService.trackUsage(
        response.usage,
        this.agentType as any,
        context.userId,
        context.opportunityId,
        durationMs,
        true
      );
    }

    return {
      response: response.response,
      toolCalls: response.toolCalls,
    };
  }
}
