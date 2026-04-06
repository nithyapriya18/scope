/**
 * Intake Agent — Step 1
 * RAG-based: uses extract_metadata tool to search the full RFP for each field.
 * Extracts RFP metadata AND classifies the study family/type from raw RFP text.
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

// ── Tool definitions ───────────────────────────────────────────────
const TOOLS: Tool[] = [
  {
    name: 'extract_metadata',
    description: `Search the RFP document for specific metadata. Provide a query describing what you're looking for. The tool will return relevant excerpts from the document. Use this to find: client name, contact info, deadlines, therapeutic area, geography, research objectives, methodology hints, sample requirements, etc.`,
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'What to search for, e.g., "client name and contact email", "submission deadline", "therapeutic area and disease indication", "countries and geography", "research objectives", "study methodology qualitative or quantitative"',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_section',
    description: 'Read a portion of the RFP by position. Use "start" for the first 3000 chars, "middle" for the middle section, "end" for the last 3000 chars, or "all" for the full document (may be long).',
    input_schema: {
      type: 'object',
      properties: {
        position: {
          type: 'string',
          enum: ['start', 'middle', 'end', 'all'],
          description: 'Which part of the document to read',
        },
      },
      required: ['position'],
    },
  },
];

export class IntakeAgent extends BaseAgent {
  protected agentType = 'intake';

  protected getSystemPrompt(_context: AgentContext): string {
    return `You are an RFP Intake Specialist at PetaSight, a pharma primary market research firm.
Your job is to read the raw RFP text and extract every piece of metadata with high accuracy.

You have tools to search and read the RFP document. USE THEM to find all information.
Do NOT guess — if you need to find a field, use extract_metadata to search for it.

DOCUMENT SECTIONS AND PRECEDENCE:
The document may contain multiple sections marked with headers like [REQUIREMENTS BRIEF: filename] or [CONCEPT NOTE: filename] or [SUPPLEMENTARY DOCUMENT: filename].
Apply these precedence rules when fields conflict between sections:
- Primary source for all fields: the main RFP text (before any bracketed section headers)
- [REQUIREMENTS BRIEF]: overrides the RFP for methodology, sample_requirements, research_objectives, and study design details — the brief is the authoritative scope specification
- [CONCEPT NOTE]: supplementary context only; use for background and TA confirmation but do not override RFP or brief values
- [SUPPLEMENTARY DOCUMENT]: low-priority context; only use if the field is completely absent elsewhere

Strategy:
1. First read the start of the document for title, client, and overview
2. Use extract_metadata to search for: deadline, therapeutic area, geography, objectives, methodology
3. Read the end of the document for submission requirements, contact info, deadlines
4. If a [REQUIREMENTS BRIEF] section exists, re-check methodology, objectives, and sample requirements from it
5. When confident you have all data, output the final JSON

Every field you extract must come directly from the text. Do not invent values.
When done, output ONLY valid JSON. No markdown, no commentary.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const { rfpText, fileName } = context.data;
      if (!rfpText) return { success: false, error: 'No RFP text provided' };

      console.log(`📄 IntakeAgent: RFP has ${rfpText.length} chars`);

      // Find the job for progress updates
      const jobs = await jobQueueService.getJobsByOpportunity(context.opportunityId);
      const currentJob = jobs.find((j: any) => j.jobType === 'intake' && j.status === 'in_progress');

      // ── Tool handler ─────────────────────────────────────────
      const handleToolCall = (toolName: string, input: any): string => {
        if (toolName === 'extract_metadata') {
          const query = (input.query || '').toLowerCase();
          const results: string[] = [];

          // Search through the document for relevant content
          const lines = rfpText.split('\n');
          const keywords = query.split(/\s+/).filter((w: string) => w.length > 2);

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            const matchCount = keywords.filter((kw: string) => line.includes(kw)).length;
            if (matchCount >= Math.max(1, Math.floor(keywords.length / 2))) {
              // Include context: 2 lines before and 3 lines after
              const start = Math.max(0, i - 2);
              const end = Math.min(lines.length, i + 4);
              const excerpt = lines.slice(start, end).join('\n');
              results.push(excerpt);
            }
          }

          // Deduplicate and limit
          const unique = [...new Set(results)];
          if (unique.length === 0) {
            return `No content found matching "${input.query}". Try different keywords or use read_section to browse the document.`;
          }
          return unique.slice(0, 5).join('\n---\n').slice(0, 4000);
        }

        if (toolName === 'read_section') {
          const pos = input.position || 'start';
          if (pos === 'all') {
            return rfpText.length <= 8000 ? rfpText : rfpText.slice(0, 3000) + '\n...[use extract_metadata to search for specific fields]...\n' + rfpText.slice(-3000);
          }
          if (pos === 'start') return rfpText.slice(0, 3000);
          if (pos === 'end') return rfpText.slice(-3000);
          if (pos === 'middle') {
            const mid = Math.floor(rfpText.length / 2);
            return rfpText.slice(mid - 1500, mid + 1500);
          }
          return rfpText.slice(0, 3000);
        }

        return 'Unknown tool';
      };

      // ── Build user message ───────────────────────────────────
      const userMessage = `
=== GOAL ===
Extract all RFP metadata from the document. Classify the study family and type.
Output confidence scores for each key field.

=== RFP INFO ===
Filename: ${fileName || 'unknown'}
Total document length: ${rfpText.length} characters

=== INSTRUCTIONS ===
1. Start by reading the "start" of the document (read_section) for title, client overview
2. Use extract_metadata to search for each field: "submission deadline", "therapeutic area disease", "countries geography region", "research objectives goals", "qualitative quantitative methodology", "contact email"
3. Read the "end" of the document for submission details and deadlines
4. Output the final JSON when confident

=== REFERENCE: STUDY FAMILIES ===
${STUDY_FAMILIES}

=== RESEARCH PHASE MAPPING ===
Understand = UNDERSTANDING_DIAGNOSIS, SEGMENTATION_TARGETING
Plan = TESTING_OPTIMIZATION, TRADEOFF_CHOICE
Measure = TRACKING_MONITORING, PRICING_MARKET_ACCESS

=== OUTPUT REQUIREMENTS ===
Return ONLY this JSON when done:
{
  "rfpTitle": "actual project/study name from document (NOT filename)",
  "clientName": "organisation issuing the RFP",
  "clientEmail": null or "email@company.com",
  "clientContact": null or "Named Person",
  "rfpDeadline": null or "YYYY-MM-DD",
  "therapeuticArea": "e.g. Oncology, CNS - Migraine, Cardiology",
  "geography": ["country1", "country2"],
  "researchObjectives": ["objective 1", "objective 2"],
  "studyType": "Qualitative" | "Quantitative" | "Mixed Methods",
  "studyFamily": "UNDERSTANDING_DIAGNOSIS",
  "studyFamilyRationale": "1 sentence why",
  "researchPhase": "Understand" | "Plan" | "Measure",
  "domain": "pharma" | "medtech" | "consumer_health" | "unknown",
  "languageDetected": "en",
  "confidenceScores": {
    "clientName": "high|medium|low",
    "therapeuticArea": "high|medium|low",
    "rfpDeadline": "high|medium|low",
    "geography": "high|medium|low",
    "studyFamily": "high|medium|low"
  },
  "isDuplicate": false,
  "_fieldSources": {
    "methodology": "rfp|brief|concept_note",
    "researchObjectives": "rfp|brief|concept_note",
    "sampleRequirements": "rfp|brief|concept_note",
    "geography": "rfp|brief|concept_note",
    "therapeuticArea": "rfp|brief|concept_note"
  }
}
Note: In _fieldSources, indicate which document section was the authoritative source for each field. Only include fields where you used a non-primary source (i.e. brief or concept_note overrode the rfp). Omit _fieldSources entirely if all fields came from the primary RFP.

Start by calling read_section with position "start".`;

      // ── Tool-use loop ────────────────────────────────────────
      const MAX_ITERATIONS = 6;
      let conversationHistory: any[] = [];
      let finalResponse = '';
      let totalToolCalls = 0;

      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        if (currentJob) {
          const progress = Math.min(80, 15 + (iteration * 12));
          await jobQueueService.updateProgress(
            currentJob.id,
            progress,
            iteration === 0 ? 'Reading RFP document...' : `Extracting metadata (pass ${iteration + 1})...`
          );
        }

        const result = await this.invokeAIWithTools(
          this.getSystemPrompt(context),
          iteration === 0 ? userMessage : '',
          TOOLS,
          context,
          conversationHistory
        );

        if (result.toolCalls && result.toolCalls.length > 0) {
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

          const toolResults: any[] = [];
          for (let i = 0; i < result.toolCalls.length; i++) {
            const tc = result.toolCalls[i];
            console.log(`  🔧 Tool call: ${tc.name}(${JSON.stringify(tc.input).slice(0, 80)})`);
            const toolResult = handleToolCall(tc.name, tc.input);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: `tool_${totalToolCalls - result.toolCalls.length + i}`,
              content: toolResult,
            });
          }
          conversationHistory.push({ role: 'user', content: toolResults });
        } else {
          finalResponse = result.response;
          break;
        }
      }

      if (!finalResponse) {
        const forceResult = await this.invokeAI(
          this.getSystemPrompt(context),
          'Based on all the RFP content you have read, output the final metadata JSON now. Output ONLY the JSON object.',
          context
        );
        finalResponse = forceResult;
      }

      // ── Parse JSON ───────────────────────────────────────────
      let extractedData: any;
      try {
        let json = finalResponse.trim();
        if (json.startsWith('```')) json = json.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        const jsonMatch = json.match(/\{[\s\S]*\}/);
        extractedData = JSON.parse(jsonMatch ? jsonMatch[0] : json);
      } catch {
        console.error('IntakeAgent: failed to parse JSON:', finalResponse.substring(0, 300));
        return { success: false, error: 'Failed to parse AI response as JSON' };
      }

      // Map study family to research phase
      const PHASE_MAP: Record<string, string> = {
        UNDERSTANDING_DIAGNOSIS: 'Understand',
        SEGMENTATION_TARGETING: 'Understand',
        TESTING_OPTIMIZATION: 'Plan',
        TRADEOFF_CHOICE: 'Plan',
        TRACKING_MONITORING: 'Measure',
        PRICING_MARKET_ACCESS: 'Measure',
      };
      const researchPhase = extractedData.researchPhase || PHASE_MAP[extractedData.studyFamily] || null;

      const sql = getSql();
      await sql`
        UPDATE opportunities
        SET
          client_name    = ${extractedData.clientName || null},
          client_email   = ${extractedData.clientEmail || null},
          rfp_title      = ${extractedData.rfpTitle || null},
          rfp_deadline   = ${extractedData.rfpDeadline || null},
          therapeutic_area = ${extractedData.therapeuticArea || null},
          geography      = ${extractedData.geography || []},
          domain         = ${extractedData.domain || 'unknown'},
          study_family   = ${extractedData.studyFamily || null},
          research_phase = ${researchPhase},
          status         = 'intake',
          updated_at     = now()
        WHERE id = ${context.opportunityId}
      `;

      console.log(`✅ Intake complete (RAG): ${extractedData.rfpTitle} | ${extractedData.studyFamily} | ${extractedData.therapeuticArea}`);
      console.log(`   Tool calls made: ${totalToolCalls}`);

      return {
        success: true,
        data: { ...extractedData, researchPhase, currentStatus: 'intake', nextStatus: 'brief_extract' },
        metadata: { confidence: extractedData.confidenceScores?.clientName === 'high' ? 0.9 : 0.7 },
      };
    } catch (error: any) {
      console.error('IntakeAgent error:', error);
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

    const messages = [...conversationHistory];
    if (userMessage) {
      messages.push({ role: 'user', content: userMessage });
    }

    const response = await this.aiService.invokeWithTools(
      systemPrompt,
      '',
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
