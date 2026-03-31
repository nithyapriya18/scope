/**
 * RFP Document Tools — RAG-like tools for searching and extracting from RFP documents.
 * Used by IntakeAgent and BriefExtractorAgent via Claude tool-use.
 *
 * Instead of truncating the RFP to 6-8k chars, the LLM calls these tools to
 * search specific parts of the document as needed.
 */

import { Tool, ToolCall } from '../aiServiceTypes';
import { getSql } from '../../lib/sql';

// ─── Text chunking ──────────────────────────────────────────────

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 300;

/** Split text into overlapping chunks */
function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

/** Score a chunk against a query using keyword frequency */
function scoreChunk(chunk: string, query: string): number {
  const lowerChunk = chunk.toLowerCase();
  const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (keywords.length === 0) return 0;
  let score = 0;
  for (const kw of keywords) {
    const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = lowerChunk.match(regex);
    score += matches ? matches.length : 0;
  }
  return score;
}

// ─── Tool definitions ────────────────────────────────────────────

/** Search the full RFP for content matching a query. Returns top relevant chunks. */
export const TOOL_SEARCH_RFP: Tool = {
  name: 'search_rfp',
  description:
    'Search the full RFP document for content relevant to a query. ' +
    'Use this to find specific information like deadlines, geography, sample size, methodology, ' +
    'deliverables, budget, or any other requirement that may be anywhere in the document. ' +
    'Returns the most relevant text passages.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'Natural language query describing what to find. Examples: ' +
          '"submission deadline and due date", "target audience and sample size", ' +
          '"research objectives and goals", "geographic markets and countries"',
      },
    },
    required: ['query'],
  },
};

/** Read a specific named section of the RFP by header/topic. */
export const TOOL_READ_RFP_SECTION: Tool = {
  name: 'read_rfp_section',
  description:
    'Read a specific section of the RFP document by topic or header name. ' +
    'The RFP may be organized into sections like "Methodology", "Deliverables", "Background", etc. ' +
    'This tool searches for section headers matching the requested topic and returns their content. ' +
    'Use this when you know which section you need but want to read it in full.',
  input_schema: {
    type: 'object',
    properties: {
      section_name: {
        type: 'string',
        description:
          'The section topic or header to find. Examples: ' +
          '"methodology requirements", "deliverables", "sample specifications", ' +
          '"budget", "timeline", "background", "scope of work"',
      },
    },
    required: ['section_name'],
  },
};

/** Extract a specific metadata field by searching for common patterns. */
export const TOOL_EXTRACT_METADATA: Tool = {
  name: 'extract_metadata',
  description:
    'Search the RFP for a specific metadata field using pattern-based extraction. ' +
    'Good for finding structured data like dates, emails, company names, and numeric values. ' +
    'This is more targeted than search_rfp — use it for specific field lookups.',
  input_schema: {
    type: 'object',
    properties: {
      field: {
        type: 'string',
        description:
          'The metadata field to extract. One of: "deadline", "client_email", "client_name", ' +
          '"contact_person", "budget", "sample_size", "countries", "therapeutic_area", "nda_terms"',
      },
    },
    required: ['field'],
  },
};

/** Look up similar past briefs from the database. */
export const TOOL_LOOKUP_SIMILAR_BRIEFS: Tool = {
  name: 'lookup_similar_briefs',
  description:
    'Search the database for past briefs from similar studies. Returns summaries of ' +
    'matching briefs including their structure, methodology, and key sections. ' +
    'Use this to understand what is typically included in briefs for similar therapeutic areas or study types.',
  input_schema: {
    type: 'object',
    properties: {
      therapeutic_area: {
        type: 'string',
        description: 'The therapeutic area to search for (e.g., "Oncology", "Cardiology", "Diabetes")',
      },
      study_type: {
        type: 'string',
        description: 'The study type to match (e.g., "Qualitative", "Quantitative", "Mixed Methods")',
      },
    },
    required: ['therapeutic_area'],
  },
};

// ─── Tool definitions grouped by agent ───────────────────────────

export const INTAKE_TOOLS: Tool[] = [TOOL_SEARCH_RFP, TOOL_EXTRACT_METADATA];

export const BRIEF_EXTRACTOR_TOOLS: Tool[] = [
  TOOL_SEARCH_RFP,
  TOOL_READ_RFP_SECTION,
  TOOL_EXTRACT_METADATA,
  TOOL_LOOKUP_SIMILAR_BRIEFS,
];

// ─── Tool handlers ───────────────────────────────────────────────

/** Metadata extraction patterns */
const METADATA_PATTERNS: Record<string, RegExp[]> = {
  deadline: [
    /deadline[:\s]*([^\n]+)/i,
    /due\s+date[:\s]*([^\n]+)/i,
    /submit(?:ted)?\s+by[:\s]*([^\n]+)/i,
    /response\s+due[:\s]*([^\n]+)/i,
    /submission\s+deadline[:\s]*([^\n]+)/i,
    /proposals?\s+(?:must\s+be\s+)?(?:received|submitted)\s+(?:by|before|no\s+later\s+than)[:\s]*([^\n]+)/i,
  ],
  client_email: [
    /[\w.+-]+@[\w-]+\.[\w.]+/g,
  ],
  client_name: [
    /(?:from|issued\s+by|prepared\s+for|client|company)[:\s]*([^\n,]+)/i,
    /(?:on\s+behalf\s+of|behalf\s+of)[:\s]*([^\n,]+)/i,
  ],
  contact_person: [
    /(?:contact(?:\s+person)?|point\s+of\s+contact|poc)[:\s]*([^\n,]+)/i,
    /(?:addressed?\s+to|attention)[:\s]*([^\n,]+)/i,
  ],
  budget: [
    /budget[:\s]*([^\n]+)/i,
    /(?:total\s+)?(?:cost|price|fee|investment)[:\s]*([^\n]+)/i,
    /(?:not\s+to\s+exceed|NTE)[:\s]*([^\n]+)/i,
    /[\$€£¥]\s*[\d,]+(?:\.\d{2})?(?:\s*[-–]\s*[\$€£¥]?\s*[\d,]+(?:\.\d{2})?)?/g,
  ],
  sample_size: [
    /(?:sample\s+size|n\s*=|respondents?|participants?|interviews?)[:\s]*(\d[\d,]*)/i,
    /(\d[\d,]*)\s*(?:respondents?|participants?|interviews?|completes?)/i,
  ],
  countries: [
    /(?:countries?|markets?|geograph(?:y|ies)|regions?)[:\s]*([^\n]+)/i,
  ],
  therapeutic_area: [
    /(?:therapeutic\s+area|disease\s+area|indication|therapy\s+area)[:\s]*([^\n]+)/i,
  ],
  nda_terms: [
    /(?:confidential(?:ity)?|NDA|non-?disclosure)[:\s]*([^\n]+)/i,
  ],
};

/** Section header patterns — tries to find section boundaries */
const SECTION_HEADER_REGEX = /(?:^|\n)[\s]*(?:\d+[\.\)]\s*|[A-Z][A-Z\s]{2,}:|#{1,3}\s+|[•\-]\s+)(.+?)(?:\n|$)/g;

function findSectionContent(text: string, sectionName: string): string {
  const lowerText = text.toLowerCase();
  const lowerSection = sectionName.toLowerCase();
  const keywords = lowerSection.split(/\s+/).filter(w => w.length > 2);

  // Find all potential section headers
  const headers: { index: number; header: string }[] = [];
  const headerRegex = /(?:^|\n)\s*(?:(\d+[\.\)])\s+)?([A-Z][A-Za-z\s&/,\-]{3,})[:\n]/gm;
  let match;

  while ((match = headerRegex.exec(text)) !== null) {
    headers.push({ index: match.index, header: match[2].trim() });
  }

  // Also try markdown-style headers
  const mdHeaderRegex = /(?:^|\n)\s*#{1,3}\s+(.+?)(?:\n|$)/gm;
  while ((match = mdHeaderRegex.exec(text)) !== null) {
    headers.push({ index: match.index, header: match[1].trim() });
  }

  // Score headers by keyword match
  const scoredHeaders = headers.map(h => {
    const lowerHeader = h.header.toLowerCase();
    const score = keywords.reduce((s, kw) => s + (lowerHeader.includes(kw) ? 1 : 0), 0);
    return { ...h, score };
  }).filter(h => h.score > 0).sort((a, b) => b.score - a.score);

  if (scoredHeaders.length > 0) {
    const best = scoredHeaders[0];
    // Find the next header to determine section boundaries
    const sortedAllHeaders = headers.sort((a, b) => a.index - b.index);
    const bestIdx = sortedAllHeaders.findIndex(h => h.index === best.index);
    const endIndex = bestIdx < sortedAllHeaders.length - 1
      ? sortedAllHeaders[bestIdx + 1].index
      : Math.min(best.index + 3000, text.length);

    return text.slice(best.index, endIndex).trim();
  }

  // Fallback: search by keywords and return surrounding context
  const chunks = chunkText(text, 2000, 400);
  const scored = chunks.map((c, i) => ({ chunk: c, score: scoreChunk(c, sectionName), idx: i }));
  scored.sort((a, b) => b.score - a.score);

  if (scored[0]?.score > 0) {
    return scored.slice(0, 2).map(s => s.chunk).join('\n...\n');
  }

  return `No section matching "${sectionName}" found in the document.`;
}

/**
 * Create a tool handler function bound to a specific RFP text.
 * This is the function passed to `runToolLoop` — it executes tool calls
 * and returns results as strings.
 */
export function createRfpToolHandler(rfpText: string) {
  return async (toolCall: ToolCall): Promise<string> => {
    switch (toolCall.name) {
      case 'search_rfp': {
        const { query } = toolCall.input;
        const chunks = chunkText(rfpText);
        const scored = chunks.map((c, i) => ({ chunk: c, score: scoreChunk(c, query), idx: i }));
        scored.sort((a, b) => b.score - a.score);
        const topChunks = scored.filter(s => s.score > 0).slice(0, 4);

        if (topChunks.length === 0) {
          return `No relevant content found for query: "${query}". Try different keywords.`;
        }

        return topChunks
          .map((s, i) => `--- Result ${i + 1} (relevance: ${s.score}, position: chars ${s.idx * (CHUNK_SIZE - CHUNK_OVERLAP)}–${s.idx * (CHUNK_SIZE - CHUNK_OVERLAP) + CHUNK_SIZE}) ---\n${s.chunk}`)
          .join('\n\n');
      }

      case 'read_rfp_section': {
        const { section_name } = toolCall.input;
        return findSectionContent(rfpText, section_name);
      }

      case 'extract_metadata': {
        const { field } = toolCall.input;
        const patterns = METADATA_PATTERNS[field];
        if (!patterns) {
          return `Unknown metadata field: "${field}". Available fields: ${Object.keys(METADATA_PATTERNS).join(', ')}`;
        }

        const results: string[] = [];
        for (const pattern of patterns) {
          const regex = new RegExp(pattern.source, pattern.flags);
          let m;
          while ((m = regex.exec(rfpText)) !== null) {
            results.push(m[0].trim());
            if (!pattern.flags.includes('g')) break;
          }
        }

        if (results.length === 0) {
          return `No matches found for field "${field}" in the document.`;
        }

        return `Found ${results.length} match(es) for "${field}":\n${results.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
      }

      case 'lookup_similar_briefs': {
        const { therapeutic_area, study_type } = toolCall.input;
        const sql = getSql();

        // Find past briefs with similar therapeutic area or study type
        const briefs = await sql`
          SELECT b.therapeutic_area, b.study_type, b.research_objectives,
                 b.confidence_score, b.raw_extraction,
                 o.rfp_title, o.client_name
          FROM briefs b
          JOIN opportunities o ON b.opportunity_id = o.id
          WHERE (
            LOWER(b.therapeutic_area) LIKE ${`%${therapeutic_area.toLowerCase()}%`}
            ${study_type ? sql`OR LOWER(b.study_type) LIKE ${`%${study_type.toLowerCase()}%`}` : sql``}
          )
          ORDER BY b.created_at DESC
          LIMIT 5
        `;

        if (briefs.length === 0) {
          return `No similar past briefs found for therapeutic area "${therapeutic_area}"${study_type ? ` and study type "${study_type}"` : ''}.`;
        }

        return briefs.map((b: any, i: number) => {
          const raw = b.raw_extraction || {};
          const coverage = raw.templateCoverage || {};
          const completeSections = Object.values(coverage).filter(v => v === 'COMPLETE').length;
          return `--- Past Brief ${i + 1}: ${b.rfp_title || 'Untitled'} ---
Client: ${b.client_name || 'Unknown'}
Therapeutic Area: ${b.therapeutic_area}
Study Type: ${b.study_type}
Objectives: ${(b.research_objectives || []).slice(0, 3).join('; ')}
Completeness: ${completeSections}/13 sections complete
Confidence: ${Math.round((b.confidence_score || 0) * 100)}%`;
        }).join('\n\n');
      }

      default:
        return `Unknown tool: ${toolCall.name}`;
    }
  };
}
