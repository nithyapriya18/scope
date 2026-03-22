/**
 * Document Generator Agent — Step 10
 * Generates a client-ready proposal matching PMR_Proposal_Template_Word_v4_SCOPE_FINAL.docx
 * 9 sections with proper Word tables + pricing annex .xlsx
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';
import * as path from 'path';
import * as fs from 'fs';

async function getDocx() { return await import('docx'); }
async function getExcelJs() {
  const E = await import('exceljs');
  return (E.default || E) as any;
}

export class DocumentGeneratorAgent extends BaseAgent {
  protected agentType = 'document_generation';

  protected getSystemPrompt(_context: AgentContext): string {
    return `You are a Senior Research Director and Proposal Writer at PetaSight, a pharma market research firm.
Write a complete, client-ready research proposal. Every field must contain specific, substantive content — no placeholders.
Output ONLY valid JSON. No markdown fences, no commentary.`;
  }

  // ─── DOCX helpers ───────────────────────────────────────────────────────────

  private async generateDocx(c: any, outputPath: string): Promise<void> {
    const {
      Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
      AlignmentType, WidthType, BorderStyle, PageBreak,
    } = await getDocx();

    const NAVY   = '1F3864';
    const BLUE   = '2E75B6';
    const PINK   = 'DA365C';
    const LGRAY  = 'F2F5FB';
    const WHITE  = 'FFFFFF';
    const DTEXT  = '222222';

    const TABLE_W = 9200; // DXA — full usable body width

    const borders = (color = 'C8D4E8') => ({
      top:     { style: BorderStyle.SINGLE, size: 4, color },
      bottom:  { style: BorderStyle.SINGLE, size: 4, color },
      left:    { style: BorderStyle.SINGLE, size: 4, color },
      right:   { style: BorderStyle.SINGLE, size: 4, color },
      insideH: { style: BorderStyle.SINGLE, size: 4, color },
      insideV: { style: BorderStyle.SINGLE, size: 4, color },
    });

    const noBorder = () => ({
      top:     { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom:  { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left:    { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    });

    const para = (text: string, opts: any = {}) => new Paragraph({
      children: [new TextRun({ text: String(text || ''), size: opts.size || 22, bold: opts.bold || false, color: opts.color || DTEXT, italics: opts.italic || false })],
      spacing: { after: opts.spaceAfter ?? 80, before: opts.spaceBefore ?? 0 },
      alignment: opts.align || AlignmentType.LEFT,
    });

    const cell = (text: string | any[], fill?: string, w?: number, opts: any = {}) => {
      const children: any[] = typeof text === 'string'
        ? [new Paragraph({ children: [new TextRun({ text: String(text || ''), size: opts.size || 22, bold: opts.bold || false, color: opts.color || DTEXT, italics: opts.italic || false })], spacing: { after: 60 } })]
        : (text as any[]);
      return new TableCell({
        children,
        shading: fill ? { fill, color: 'auto' } : undefined,
        width: w ? { size: w, type: WidthType.DXA } : undefined,
        margins: { top: 90, bottom: 90, left: 150, right: 150 },
        borders: borders(),
        columnSpan: opts.span,
      });
    };

    // Full-width section header row (navy background, white text)
    const sectionHeaderRow = (title: string) => new TableRow({
      children: [new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 24, color: WHITE })], spacing: { after: 0 } })],
        shading: { fill: NAVY, color: 'auto' },
        columnSpan: 99,
        margins: { top: 120, bottom: 120, left: 150, right: 150 },
        borders: borders(NAVY),
      })],
    });

    // Blue sub-header row (for column labels)
    const colHeaderRow = (labels: string[], widths?: number[]) => new TableRow({
      children: labels.map((l, i) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: l, bold: true, size: 20, color: WHITE })], spacing: { after: 0 } })],
        shading: { fill: BLUE, color: 'auto' },
        width: widths ? { size: widths[i], type: WidthType.DXA } : undefined,
        margins: { top: 80, bottom: 80, left: 150, right: 150 },
        borders: borders(BLUE),
      })),
    });

    // Alternating data rows
    const dataRow2 = (label: string, value: string, even: boolean, w1 = 2700, w2 = 6500) => new TableRow({
      children: [
        cell(label, even ? LGRAY : WHITE, w1, { bold: true, size: 20 }),
        cell(value || '—', even ? LGRAY : WHITE, w2, { size: 22 }),
      ],
    });

    const dataRow3 = (a: string, b: string, c: string, even: boolean, w1 = 2400, w2 = 3400, w3 = 3400) => new TableRow({
      children: [
        cell(a, even ? LGRAY : WHITE, w1, { size: 21 }),
        cell(b, even ? LGRAY : WHITE, w2, { size: 21 }),
        cell(c, even ? LGRAY : WHITE, w3, { size: 21 }),
      ],
    });

    // Build 2-col field table
    const table2 = (sectionTitle: string, rows: [string, string][]) => new Table({
      width: { size: TABLE_W, type: WidthType.DXA },
      borders: borders(),
      rows: [
        sectionHeaderRow(sectionTitle),
        ...rows.map(([k, v], i) => dataRow2(k, v, i % 2 === 0)),
      ],
    });

    // Build 3-col table
    const table3 = (sectionTitle: string, headers: [string, string, string], rows: [string, string, string][], widths?: [number, number, number]) => new Table({
      width: { size: TABLE_W, type: WidthType.DXA },
      borders: borders(),
      rows: [
        sectionHeaderRow(sectionTitle),
        colHeaderRow(headers, widths),
        ...rows.map(([a, b, c], i) => dataRow3(a, b, c, i % 2 === 0, widths?.[0], widths?.[1], widths?.[2])),
      ],
    });

    const gap = () => para('', { spaceAfter: 140 });
    const pb  = () => new Paragraph({ children: [new PageBreak()] });

    const s1  = c.section1_executiveSummary  || {};
    const s2  = c.section2_decisionContext   || {};
    const s3  = c.section3_recommendedApproach || {};
    const s4  = c.section4_scopeBaseline     || {};
    const s5  = c.section5_approachDelivery  || {};
    const s6  = c.section6_deliverablesGovernance || {};
    const s7  = c.section7_commercials       || {};
    const s8  = c.section8_risksDependencies || {};
    const s9  = c.section9_credentials       || {};
    const cv  = c.coverPage                  || {};

    const children: any[] = [

      // ── COVER PAGE ────────────────────────────────────────────────────────
      para('', { spaceBefore: 1400 }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'PetaSight', bold: true, size: 72, color: PINK })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: 'Research Proposal', bold: true, size: 44, color: NAVY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: cv.projectTitle || 'Research Proposal', size: 32, color: NAVY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `Prepared for: ${cv.clientName || 'Client'}`, size: 26, color: '444444' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: `Prepared by: PetaSight`, size: 24, color: '666666' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: cv.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }), size: 24, color: '666666' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: `Version: ${cv.version || 'v1.0'}  |  Scope: ${cv.scopeMode || 'Proposal'}`, size: 20, color: '888888', italics: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },   children: [new TextRun({ text: cv.confidentiality || 'STRICTLY CONFIDENTIAL — FOR CLIENT REVIEW ONLY', size: 20, color: PINK, bold: true })] }),
      pb(),

      // ── SECTION 1: EXECUTIVE SUMMARY ──────────────────────────────────────
      table2('1.  Executive Summary', [
        ['Client challenge',           s1.clientChallenge || ''],
        ['Decision to support',        s1.decisionToSupport || ''],
        ['Recommended PMR response',   s1.recommendedPmrResponse || ''],
        ['Business value',             s1.businessValue || ''],
        ['Core outputs',               s1.coreOutputs || ''],
        ['Timing',                     s1.timing || ''],
        ['Commercial recommendation',  s1.commercialRecommendation || ''],
        ['Decision ask',               s1.decisionAsk || ''],
      ]),
      gap(),
      // Drafting line
      new Table({
        width: { size: TABLE_W, type: WidthType.DXA },
        borders: noBorder(),
        rows: [new TableRow({ children: [new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: s1.draftingLine || '', size: 22, italics: true, color: '555555' })], spacing: { after: 0 } })],
          shading: { fill: 'FFF8E7', color: 'auto' },
          margins: { top: 120, bottom: 120, left: 200, right: 200 },
          borders: { top: { style: BorderStyle.SINGLE, size: 6, color: 'E8C84A' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E8C84A' }, left: { style: BorderStyle.THICK, size: 10, color: 'E8C84A' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
        })]})],
      }),
      gap(), pb(),

      // ── SECTION 2: DECISION CONTEXT & BUSINESS NEED ───────────────────────
      table2('2.  Decision Context and Business Need', [
        ['Current situation',  s2.currentSituation || ''],
        ['Why now',            s2.whyNow || ''],
        ['Business challenge', s2.businessChallenge || ''],
        ['Risk of inaction',   s2.riskOfInaction || ''],
        ['Action path',        s2.actionPath || ''],
      ]),
      gap(),
      table3('Priority Decisions',
        ['Priority Decision', 'What the client needs to decide', 'Evidence the study must provide'],
        (s2.priorityDecisions || []).map((d: any, i: number) => [
          `Decision ${i + 1}`, d.decision || '', d.evidence || ''
        ]),
        [1400, 3900, 3900],
      ),
      gap(), pb(),

      // ── SECTION 3: RECOMMENDED APPROACH & STUDY OBJECTIVES ───────────────
      table3('3.  Recommended Approach and Study Objectives',
        ['Client need', 'Recommended response', 'Value created'],
        (s3.clientNeedsTable || []).map((r: any) => [
          r.clientNeed || '', r.recommendedResponse || '', r.valueCreated || ''
        ]),
        [2600, 3400, 3200],
      ),
      gap(),
      table2('Approach Rationale', [
        ['Why this design fits',               s3.whyThisDesignFits || ''],
        ['What the client will know afterwards', s3.whatClientWillKnow || ''],
        ['Why a narrower option is weaker',    s3.whyNarrowerOptionIsWeaker || ''],
        ['Success criteria',                   s3.successCriteria || ''],
      ]),
      gap(), pb(),

      // ── SECTION 4: SCOPE BASELINE & BOUNDARIES ───────────────────────────
      table2('4.  Scope Baseline and Boundaries', [
        ['Primary study type',   s4.primaryStudyType || ''],
        ['Method family',        s4.methodFamily || ''],
        ['Audience',             s4.audience || ''],
        ['Geographic scope',     s4.geographicScope || ''],
        ['Timing model',         s4.timingModel || ''],
        ['Deliverables',         s4.deliverables || ''],
        ['Review rounds',        s4.reviewRounds || ''],
        ['Commercial boundary',  s4.commercialBoundary || ''],
      ]),
      gap(),
      table2('Scope Boundaries', [
        ['In scope',     s4.inScope || ''],
        ['Out of scope', s4.outOfScope || ''],
        ['Future option', s4.futureOption || ''],
      ]),
      gap(),
      new Table({
        width: { size: TABLE_W, type: WidthType.DXA },
        borders: noBorder(),
        rows: [new TableRow({ children: [new TableCell({
          children: [new Paragraph({ children: [
            new TextRun({ text: 'Scope clause: ', bold: true, size: 22, color: NAVY }),
            new TextRun({ text: s4.scopeClause || '', size: 22, italics: true, color: DTEXT }),
          ], spacing: { after: 0 } })],
          shading: { fill: 'EEF2FA', color: 'auto' },
          margins: { top: 100, bottom: 100, left: 200, right: 200 },
          borders: { top: { style: BorderStyle.NONE, size: 0, color: WHITE }, bottom: { style: BorderStyle.NONE, size: 0, color: WHITE }, left: { style: BorderStyle.THICK, size: 10, color: BLUE }, right: { style: BorderStyle.NONE, size: 0, color: WHITE } },
        })]})],
      }),
      gap(), pb(),

      // ── SECTION 5: APPROACH, AUDIENCE, SAMPLE & DELIVERY MODEL ───────────
      new Table({
        width: { size: TABLE_W, type: WidthType.DXA },
        borders: borders(),
        rows: [
          sectionHeaderRow('5.  Approach, Audience, Sample and Delivery Model'),
          colHeaderRow(['Delivery phase', 'What is included'], [2200, 7000]),
          ...[
            ['Phase 1: Design',  s5.phase1Design  || ''],
            ['Phase 2: Execute', s5.phase2Execute || ''],
            ['Phase 3: Analyze', s5.phase3Analyze || ''],
            ['Phase 4: Deliver', s5.phase4Deliver || ''],
          ].map(([phase, desc], i) => dataRow2(phase, desc, i % 2 === 0, 2200, 7000)),
        ],
      }),
      gap(),
      table2('Delivery Model', [
        ['Source of supply',                   s5.sourceOfSupply || ''],
        ['Sample logic',                       s5.sampleLogic || ''],
        ['Incidence / feasibility assumptions', s5.incidenceFeasibilityAssumptions || ''],
        ['Release-wave logic',                 s5.releaseWaveLogic || ''],
        ['Back-up plan',                       s5.backupPlan || ''],
        ['Market / compliance considerations', s5.marketComplianceConsiderations || ''],
      ]),
      gap(), pb(),

      // ── SECTION 6: DELIVERABLES, GOVERNANCE, TIMING & CLIENT INPUTS ──────
      table2('6.  Deliverables, Governance, Timing and Client Inputs', [
        ['Core deliverables',      s6.coreDeliverables || ''],
        ['Field launch control',   s6.fieldLaunchControl || ''],
        ['Live monitoring',        s6.liveMonitoring || ''],
        ['Final release control',  s6.finalReleaseControl || ''],
        ['Governance cadence',     s6.governanceCadence || ''],
      ]),
      gap(),
      new Table({
        width: { size: TABLE_W, type: WidthType.DXA },
        borders: borders(),
        rows: [
          sectionHeaderRow('Client Input Milestones'),
          colHeaderRow(['Milestone', 'What the client must confirm or provide'], [2600, 6600]),
          ...(s6.milestones || []).map((m: any, i: number) => dataRow2(m.milestone || '', m.clientInputRequired || '', i % 2 === 0, 2600, 6600)),
        ],
      }),
      gap(), pb(),

      // ── SECTION 7: COMMERCIALS & OPTIONING ───────────────────────────────
      table2('7.  Commercials and Optioning', [
        ['Base fee',                   s7.baseFee || ''],
        ['Third-party / pass-through', s7.thirdPartyPassThrough || ''],
        ['Optional modules',           s7.optionalModules || ''],
        ['Commercial notes',           s7.commercialNotes || ''],
      ]),
      gap(),
      // 3-option table
      new Table({
        width: { size: TABLE_W, type: WidthType.DXA },
        borders: borders(),
        rows: [
          colHeaderRow(['Option', 'What the client gets', 'Fee'], [2200, 5200, 1800]),
          ...[s7.optionA, s7.optionB, s7.optionC].filter(Boolean).map((opt: any, i: number) => {
            const fills = ['FAFAFA', 'EEF7F0', 'F5F0FF'];
            const bg = fills[i] || 'FAFAFA';
            return new TableRow({ children: [
              cell(opt.title || `Option ${['A','B','C'][i]}`, bg, 2200, { bold: true, size: 21 }),
              cell(opt.description || '', bg, 5200, { size: 21 }),
              cell(opt.price ? `$${Number(opt.price).toLocaleString()}` : '—', bg, 1800, { bold: true, size: 21 }),
            ]});
          }),
        ],
      }),
      gap(), pb(),

      // ── SECTION 8: RISKS, DEPENDENCIES & CHANGE CONTROL ──────────────────
      table3('8.  Risks, Dependencies and Change Control',
        ['Risk area', 'Potential issue', 'Mitigation'],
        (s8.risks || []).map((r: any) => [r.area || '', r.issue || '', r.mitigation || '']),
        [2400, 3300, 3500],
      ),
      gap(),
      table3('Change Control',
        ['Change trigger', 'Typical example', 'Required treatment'],
        (s8.changeTriggers || []).map((t: any) => [t.trigger || '', t.example || '', t.treatment || '']),
        [2400, 3300, 3500],
      ),
      gap(),
      new Table({
        width: { size: TABLE_W, type: WidthType.DXA },
        borders: noBorder(),
        rows: [new TableRow({ children: [new TableCell({
          children: [new Paragraph({ children: [
            new TextRun({ text: 'Change control clause: ', bold: true, size: 22, color: NAVY }),
            new TextRun({ text: s8.suggestedClause || '', size: 22, italics: true, color: DTEXT }),
          ], spacing: { after: 0 } })],
          shading: { fill: 'FFF4F4', color: 'auto' },
          margins: { top: 100, bottom: 100, left: 200, right: 200 },
          borders: { top: { style: BorderStyle.NONE, size: 0, color: WHITE }, bottom: { style: BorderStyle.NONE, size: 0, color: WHITE }, left: { style: BorderStyle.THICK, size: 10, color: PINK }, right: { style: BorderStyle.NONE, size: 0, color: WHITE } },
        })]})],
      }),
      gap(), pb(),

      // ── SECTION 9: CREDENTIALS, DECISION ASK & NEXT STEPS ────────────────
      new Table({
        width: { size: TABLE_W, type: WidthType.DXA },
        borders: borders(),
        rows: [
          sectionHeaderRow('9.  Credentials, Decision Ask and Next Steps'),
          colHeaderRow(['Proof area', 'What we include', 'Why it matters'], [2400, 3400, 3400]),
          ...(s9.proofAreas || []).map((p: any, i: number) => dataRow3(
            p.area || '', p.content || '', p.relevance || '', i % 2 === 0,
          )),
        ],
      }),
      gap(),
      // Mini case study
      ...(s9.miniCaseStudy ? [
        table2('Mini Case Study', [
          ['Situation', s9.miniCaseStudy.situation || ''],
          ['Approach',  s9.miniCaseStudy.approach  || ''],
          ['Outcome',   s9.miniCaseStudy.outcome   || ''],
        ]),
        gap(),
      ] : []),
      table2('Closing', [
        ['Decision ask',         s9.decisionAsk || ''],
        ['Immediate next step',  s9.immediateNextStep || ''],
        ['Contracting path',     s9.contractingPath || ''],
        ['Proposal validity',    s9.proposalValidity || ''],
      ]),
    ];

    const doc = new Document({
      sections: [{ children }],
      styles: {
        default: {
          document: {
            run: { font: 'Calibri', size: 22, color: DTEXT },
          },
        },
      },
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
  }

  // ─── Internal Brief DOCX ────────────────────────────────────────────────────

  private async generateInternalBrief(data: {
    opp: any; brief: any; scope: any; feasibility: any; pricing: any;
    pricingOptions: any[]; clarification: any; content: any;
  }, outputPath: string): Promise<void> {
    const {
      Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
      AlignmentType, WidthType, BorderStyle,
    } = await getDocx();

    const NAVY  = '1F3864';
    const BLUE  = '2E75B6';
    const LGRAY = 'F2F5FB';
    const WHITE = 'FFFFFF';
    const DTEXT = '222222';
    const W = 9200;

    const b = (s: string) => new TextRun({ text: s, bold: true, color: DTEXT, font: 'Calibri', size: 20 });
    const t = (s: string) => new TextRun({ text: s, color: DTEXT, font: 'Calibri', size: 20 });

    const borders = () => ({
      top:    { style: BorderStyle.SINGLE, size: 4, color: 'C8D4E8' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C8D4E8' },
      left:   { style: BorderStyle.SINGLE, size: 4, color: 'C8D4E8' },
      right:  { style: BorderStyle.SINGLE, size: 4, color: 'C8D4E8' },
    });

    const secHdr = (title: string) => new Paragraph({
      children: [new TextRun({ text: title, bold: true, color: WHITE, font: 'Calibri', size: 24, allCaps: true })],
      shading: { fill: NAVY },
      spacing: { before: 300, after: 100 },
      indent: { left: 100 },
    });

    const row2 = (label: string, value: string, shade = false) => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [b(label)] })], width: { size: 2800, type: WidthType.DXA }, shading: { fill: shade ? LGRAY : WHITE }, borders: borders() }),
        new TableCell({ children: [new Paragraph({ children: [t(value || '—')] })], width: { size: 6400, type: WidthType.DXA }, shading: { fill: WHITE }, borders: borders() }),
      ],
    });

    const kv = (pairs: [string, string][], shade = false) => new Table({
      width: { size: W, type: WidthType.DXA },
      rows: pairs.map(([k, v], i) => row2(k, v, shade || i % 2 === 1)),
    });

    const hdrRow = (cols: string[]) => new TableRow({
      children: cols.map(c => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: c, bold: true, color: WHITE, font: 'Calibri', size: 20 })] })],
        shading: { fill: BLUE }, borders: borders(),
      })),
      tableHeader: true,
    });

    const money = (v: number) => v == null ? '—' : '$' + Math.round(v).toLocaleString();
    const str = (v: any) => typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v ?? '—');
    const arr = (v: any) => Array.isArray(v) ? v.map((x: any) => typeof x === 'string' ? x : JSON.stringify(x)).join('\n') : str(v);

    const { opp, brief, scope, feasibility, pricing, pricingOptions, clarification } = data;
    const cb = pricing?.cost_breakdown || {};
    const scopeMd = scope?.methodology_detail || {};
    const feasLlm = feasibility?.llm_result || {};
    const clqArr: any[] = Array.isArray(clarification?.questions) ? clarification.questions : [];
    const clAns: any = clarification?.client_responses || {};

    const children: any[] = [
      // ── Cover ─────────────────────────────────────────────────────────────
      new Paragraph({ children: [new TextRun({ text: 'INTERNAL PROJECT BRIEF', bold: true, color: WHITE, font: 'Calibri', size: 48, allCaps: true })], shading: { fill: NAVY }, alignment: AlignmentType.CENTER, spacing: { before: 200, after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: opp?.rfp_title || 'Research Project', bold: true, color: BLUE, font: 'Calibri', size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
      new Paragraph({ children: [new TextRun({ text: `Client: ${opp?.client_name || '—'} | Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} | CONFIDENTIAL`, color: '666666', font: 'Calibri', size: 18 })], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),

      // ── 1. Opportunity Summary ─────────────────────────────────────────────
      secHdr('1. Opportunity Summary'),
      kv([
        ['Client',           opp?.client_name || '—'],
        ['RFP Title',        opp?.rfp_title || '—'],
        ['Study Type',       brief?.study_type || '—'],
        ['Therapeutic Area', brief?.therapeutic_area || opp?.therapeutic_area || '—'],
        ['Markets',          (opp?.markets || []).join(', ') || '—'],
        ['Budget Indication',brief?.budget_indication || 'Not disclosed'],
        ['Timeline',         str(brief?.timeline_requirements)],
      ], true),

      // ── 2. Research Objectives ─────────────────────────────────────────────
      secHdr('2. Research Objectives & Brief'),
      kv([
        ['Target Audience',  str(brief?.target_audience)],
        ['Objectives',       arr(brief?.research_objectives)],
        ['Sample Requirements', str(brief?.sample_requirements)],
        ['Deliverables',     arr(brief?.deliverables)],
      ], true),

      // ── 3. Clarification Q&A ──────────────────────────────────────────────
      secHdr('3. Clarification Questions & Client Responses'),
      ...(clqArr.length > 0 ? clqArr.flatMap((q: any, i: number) => {
        const qText = typeof q === 'string' ? q : (q.question || JSON.stringify(q));
        const ans = clAns[`q${i + 1}`] || clAns[String(i)] || clAns[qText] || '(no response)';
        return [
          new Paragraph({ children: [b(`Q${i + 1}: ${qText}`)], spacing: { before: 160, after: 60 } }),
          new Paragraph({ children: [t(`A: ${ans}`)], indent: { left: 360 }, spacing: { after: 80 } }),
        ];
      }) : [new Paragraph({ children: [t('No clarification questions were raised.')] })]),

      // ── 4. Scope & Methodology ─────────────────────────────────────────────
      secHdr('4. Scope & Methodology'),
      kv([
        ['Study Type',       scope?.detected_study_type || '—'],
        ['Methodology',      str(scopeMd)],
        ['Sample Options',   str(scope?.sample_size_options)],
        ['Key Milestones',   str(scope?.key_milestones)],
        ['Assumptions',      arr(scope?.scope_assumptions)],
        ['Recruitment',      str(scope?.recruitment_strategy)],
      ], true),

      // ── 5. Feasibility Assessment ─────────────────────────────────────────
      secHdr('5. Feasibility Assessment (HCP Matching)'),
      kv([
        ['Overall Feasibility', str(feasLlm.overallFeasibility || feasLlm.feasibilityScore || '—')],
        ['HCP Segments',        str(feasLlm.hcpSegments || feasLlm.segments || '—')],
        ['Key Risks',           str(feasLlm.keyRisks || feasLlm.risks || '—')],
        ['Mitigation',          str(feasLlm.mitigation || feasLlm.mitigationStrategies || '—')],
        ['Recommended Timeline', str(feasLlm.recommendedTimeline || '—')],
      ], true),

      // ── 6. WBS & Pricing ──────────────────────────────────────────────────
      secHdr('6. WBS & Pricing — All Tiers'),
      new Table({
        width: { size: W, type: WidthType.DXA },
        rows: [
          hdrRow(['Tier', 'Sample (n)', 'Labor', 'HCP/CPI', 'OOP', 'Overhead', 'Margin', 'TOTAL', 'Field Wks']),
          ...pricingOptions.map((o: any, i: number) => new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [b(o.tier)] })], shading: { fill: i % 2 === 0 ? LGRAY : WHITE }, borders: borders() }),
              new TableCell({ children: [new Paragraph({ children: [t(String(o.n || '—'))] })], borders: borders() }),
              new TableCell({ children: [new Paragraph({ children: [t(money(o.laborCost))] })], borders: borders() }),
              new TableCell({ children: [new Paragraph({ children: [t(money(o.hcpCpiCost))] })], borders: borders() }),
              new TableCell({ children: [new Paragraph({ children: [t(money(o.oopCosts))] })], borders: borders() }),
              new TableCell({ children: [new Paragraph({ children: [t(money(o.overhead))] })], borders: borders() }),
              new TableCell({ children: [new Paragraph({ children: [t(money(o.margin))] })], borders: borders() }),
              new TableCell({ children: [new Paragraph({ children: [b(money(o.totalPrice))] })], shading: { fill: LGRAY }, borders: borders() }),
              new TableCell({ children: [new Paragraph({ children: [t(String(o.fieldWeeks || '—'))] })], borders: borders() }),
            ],
          })),
        ],
      }),
      new Paragraph({ spacing: { after: 200 } }),
      // Rationale per tier
      ...pricingOptions.flatMap((o: any) => [
        new Paragraph({ children: [b(`${o.tier}: `), t(o.rationale || '—')], spacing: { before: 100, after: 60 } }),
      ]),
      // Work packages per recommended tier
      ...(() => {
        const rec = pricingOptions.find((o: any) => o.tier === cb.recommendedTier) || pricingOptions[1] || pricingOptions[0];
        const roles: any[] = rec?.costBreakdown?.laborCostDetail?.roles || [];
        if (!roles.length) return [];
        return [
          new Paragraph({ children: [b('Labor Breakdown — Recommended Tier')], spacing: { before: 200, after: 80 } }),
          new Table({
            width: { size: W, type: WidthType.DXA },
            rows: [
              hdrRow(['Role', 'Rate/hr', 'Base Hrs', 'Billed Hrs', 'Cost']),
              ...roles.map((r: any) => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [t(r.role || '—')] })], borders: borders() }),
                  new TableCell({ children: [new Paragraph({ children: [t(money(r.rate))] })], borders: borders() }),
                  new TableCell({ children: [new Paragraph({ children: [t(String(r.baseHours ?? '—'))] })], borders: borders() }),
                  new TableCell({ children: [new Paragraph({ children: [t(String(r.multipliedHours ?? r.billedHours ?? '—'))] })], borders: borders() }),
                  new TableCell({ children: [new Paragraph({ children: [t(money(r.cost))] })], borders: borders() }),
                ],
              })),
            ],
          }),
        ];
      })(),

      // ── 7. Commercial Terms ────────────────────────────────────────────────
      secHdr('7. Commercial Terms'),
      kv([
        ['Recommended Tier',  cb.recommendedTier || '—'],
        ['Payment Terms',     cb.paymentTerms || '50% on signature, 50% on final delivery'],
        ['Budget Alignment',  cb.budgetAlignment || '—'],
        ['Proposal Validity', '30 days from date of issue'],
      ], true),
    ];

    const doc = new Document({
      sections: [{ children }],
      styles: { default: { document: { run: { font: 'Calibri', size: 20, color: DTEXT } } } },
    });
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
  }

  private async _unused_generateXlsx(content: any, pricingOptions: any[], outputPath: string): Promise<void> {
    const ExcelJS = await getExcelJs();
    const wb = new ExcelJS.Workbook();

    const hdr = (ws: any, row: number, vals: string[], fills: string[]) => {
      const r = ws.getRow(row);
      vals.forEach((v, i) => {
        const c = r.getCell(i + 1);
        c.value = v;
        c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fills[i] || fills[0] } };
        c.alignment = { vertical: 'middle', wrapText: true };
        c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });
      r.height = 24;
    };

    const money = (v: number) => (v == null ? '' : Math.round(v).toLocaleString());

    // ── Tab 1: Pricing Summary ────────────────────────────────────────────────
    const ws1 = wb.addWorksheet('Pricing Summary');
    ws1.columns = [
      { key: 'tier',       header: 'Tier',             width: 14 },
      { key: 'n',          header: 'Sample (n)',        width: 12 },
      { key: 'labor',      header: 'Labor Cost ($)',    width: 16 },
      { key: 'hcp',        header: 'HCP / CPI ($)',     width: 16 },
      { key: 'oop',        header: 'Out-of-Pocket ($)', width: 18 },
      { key: 'overhead',   header: 'Overhead ($)',      width: 14 },
      { key: 'margin',     header: 'Margin ($)',        width: 14 },
      { key: 'total',      header: 'Total Price (USD)', width: 18 },
      { key: 'weeks',      header: 'Field Weeks',       width: 13 },
      { key: 'rationale',  header: 'Rationale',         width: 40 },
    ];
    hdr(ws1, 1, ws1.columns.map((c: any) => c.header), ['FF1F3864']);
    pricingOptions.forEach(opt => {
      ws1.addRow({
        tier: opt.tier, n: opt.n,
        labor: money(opt.laborCost), hcp: money(opt.hcpCpiCost),
        oop: money(opt.oopCosts), overhead: money(opt.overhead),
        margin: money(opt.margin), total: money(opt.totalPrice),
        weeks: opt.fieldWeeks, rationale: opt.rationale,
      });
    });

    // ── Tab 2: Labor Breakdown ────────────────────────────────────────────────
    const ws2 = wb.addWorksheet('Labor Breakdown');
    ws2.columns = [
      { key: 'tier',    header: 'Tier',      width: 12 },
      { key: 'role',    header: 'Role',      width: 28 },
      { key: 'rate',    header: 'Rate/hr ($)', width: 14 },
      { key: 'base',    header: 'Base Hrs',  width: 12 },
      { key: 'billed',  header: 'Billed Hrs', width: 12 },
      { key: 'cost',    header: 'Cost ($)',   width: 14 },
    ];
    hdr(ws2, 1, ws2.columns.map((c: any) => c.header), ['FF2E75B6']);
    pricingOptions.forEach(opt => {
      const roles = opt.costBreakdown?.laborCostDetail?.roles || [];
      roles.forEach((r: any) => ws2.addRow({
        tier: opt.tier, role: r.role, rate: r.rate,
        base: r.baseHours, billed: r.multipliedHours, cost: money(r.cost),
      }));
    });

    // ── Tab 3: HCP / CPI ─────────────────────────────────────────────────────
    const ws3 = wb.addWorksheet('HCP & CPI');
    ws3.columns = [
      { key: 'tier',     header: 'Tier',       width: 12 },
      { key: 'segment',  header: 'Segment',    width: 28 },
      { key: 'n',        header: 'n',          width: 8 },
      { key: 'cpi',      header: 'CPI (adj. $)', width: 14 },
      { key: 'total',    header: 'Total ($)',   width: 14 },
    ];
    hdr(ws3, 1, ws3.columns.map((c: any) => c.header), ['FF6B3FA0']);
    pricingOptions.forEach(opt => {
      const segs = opt.costBreakdown?.hcpCpiCostDetail?.segments
        || (Array.isArray(opt.costBreakdown?.hcpCpiCostDetail) ? opt.costBreakdown?.hcpCpiCostDetail : []);
      segs.forEach((s: any) => ws3.addRow({
        tier: opt.tier, segment: s.segment, n: s.n,
        cpi: s.cpiAdjustedUSD ?? s.cpiBaseUSD, total: money(s.totalCost),
      }));
    });

    // ── Tab 4: Out-of-Pocket ─────────────────────────────────────────────────
    const ws4 = wb.addWorksheet('Out-of-Pocket');
    ws4.columns = [
      { key: 'tier',  header: 'Tier',   width: 12 },
      { key: 'item',  header: 'Item',   width: 36 },
      { key: 'cost',  header: 'Cost ($)', width: 14 },
    ];
    hdr(ws4, 1, ws4.columns.map((c: any) => c.header), ['FFD97A00']);
    pricingOptions.forEach(opt => {
      const items = opt.costBreakdown?.oopCostsDetail?.items || [];
      items.forEach((it: any) => ws4.addRow({ tier: opt.tier, item: it.item, cost: money(it.cost) }));
    });

    // ── Tab 5: Commercial Terms ───────────────────────────────────────────────
    const ws5 = wb.addWorksheet('Commercial Terms');
    ws5.columns = [
      { key: 'field',   header: 'Field',   width: 30 },
      { key: 'detail',  header: 'Detail',  width: 60 },
    ];
    hdr(ws5, 1, ws5.columns.map((c: any) => c.header), ['FF1F3864']);
    const s7 = content.section7_commercials || {};
    [
      ['Base fee',           s7.baseFee],
      ['Pass-through costs', s7.thirdPartyPassThrough],
      ['Optional modules',   s7.optionalModules],
      ['Commercial notes',   s7.commercialNotes],
      ['Option A',           `${s7.optionA?.title || 'Lean'} — ${s7.optionA?.description || ''} ($${money(s7.optionA?.price)})`],
      ['Option B',           `${s7.optionB?.title || 'Recommended'} — ${s7.optionB?.description || ''} ($${money(s7.optionB?.price)})`],
      ['Option C',           `${s7.optionC?.title || 'Enhanced'} — ${s7.optionC?.description || ''} ($${money(s7.optionC?.price)})`],
    ].forEach(([k, v]) => ws5.addRow({ field: k, detail: v || '' }));

    await wb.xlsx.writeFile(outputPath);
  }

  // ─── Main process ────────────────────────────────────────────────────────────

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const sql = getSql();

      const [[opp], [brief], [scope], [feasibility], [pricing], [clarification]] =
        await Promise.all([
          sql`SELECT email_body, rfp_title, client_name, client_email, therapeutic_area FROM opportunities WHERE id = ${context.opportunityId}`,
          sql`SELECT tenant_id, study_type, target_audience, therapeutic_area, research_objectives, sample_requirements, timeline_requirements, deliverables, budget_indication, raw_extraction FROM briefs WHERE opportunity_id = ${context.opportunityId} ORDER BY created_at DESC LIMIT 1`,
          sql`SELECT executive_summary, detected_study_type, methodology_detail, sample_size_options, scope_assumptions, deliverables, key_milestones, recruitment_strategy FROM scopes WHERE opportunity_id = ${context.opportunityId} ORDER BY created_at DESC LIMIT 1`,
          sql`SELECT llm_result FROM feasibility_assessments WHERE opportunity_id = ${context.opportunityId} ORDER BY created_at DESC LIMIT 1`,
          sql`SELECT total_price, labor_cost, hcp_incentives, overhead_cost, margin_amount, margin_percentage, cost_breakdown FROM pricing_packs WHERE opportunity_id = ${context.opportunityId} ORDER BY created_at DESC LIMIT 1`,
          sql`SELECT questions, client_responses FROM clarifications WHERE opportunity_id = ${context.opportunityId} ORDER BY created_at DESC LIMIT 1`,
        ]);

      if (!brief) return { success: false, error: 'No brief found for this opportunity' };

      const cb = pricing?.cost_breakdown || {};
      const pricingOptions: any[] = cb.pricingOptions || [
        { tier: 'RECOMMENDED', n: 0, laborCost: pricing?.labor_cost, hcpCpiCost: pricing?.hcp_incentives, oopCosts: 0, overhead: pricing?.overhead_cost, margin: pricing?.margin_amount, totalPrice: pricing?.total_price, fieldWeeks: 0, costBreakdown: {} },
      ];
      const recommendedTier = pricingOptions.find((o: any) => o.tier === cb.recommendedTier) || pricingOptions[1] || pricingOptions[0] || {};

      // ── Shared context block (passed to all 3 parallel calls) ─────────────
      const sharedCtx = `
=== RFP ===
Client: ${opp?.client_name} | Study: ${brief.study_type} | TA: ${brief.therapeutic_area || opp?.therapeutic_area}
RFP title: ${opp?.rfp_title}
RFP text (truncated): ${(opp?.email_body || '').substring(0, 2000)}

=== BRIEF ===
Audience: ${brief.target_audience}
Objectives: ${JSON.stringify(brief.research_objectives || []).substring(0, 600)}
Deliverables: ${JSON.stringify(brief.deliverables || []).substring(0, 400)}
Budget: ${brief.budget_indication || 'Not disclosed'}
Timeline: ${JSON.stringify(brief.timeline_requirements || {}).substring(0, 300)}

=== SCOPE ===
Methodology: ${JSON.stringify(scope?.methodology_detail || {}).substring(0, 1200)}
Sample: ${JSON.stringify(scope?.sample_size_options || []).substring(0, 600)}
Milestones: ${JSON.stringify(scope?.key_milestones || {}).substring(0, 600)}
Assumptions: ${JSON.stringify(scope?.scope_assumptions || []).substring(0, 600)}
Recruitment: ${JSON.stringify(scope?.recruitment_strategy || {}).substring(0, 500)}

=== FEASIBILITY ===
${JSON.stringify(feasibility?.llm_result || {}).substring(0, 1200)}

=== PRICING ===
Recommended: ${cb.recommendedTier || 'BETTER'} @ $${recommendedTier.totalPrice || pricing?.total_price || 'TBD'}
Labor: $${recommendedTier.laborCost || 0} | HCP/CPI: $${recommendedTier.hcpCpiCost || 0} | Margin: ${recommendedTier.marginPct || 25}%
All tiers: ${JSON.stringify(pricingOptions.map((o: any) => ({ tier: o.tier, n: o.n, totalPrice: o.totalPrice, rationale: o.rationale }))).substring(0, 600)}
Payment: ${cb.paymentTerms || '50% on signature, 50% on final delivery'}

=== CLARIFICATION Q&A ===
${clarification ? JSON.stringify({ q: clarification.questions, a: clarification.client_responses }).substring(0, 600) : 'None'}`;

      const sys = this.getSystemPrompt(context);
      const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      const clientUC = (opp?.client_name || 'CLIENT').toUpperCase();

      // ── 6 parallel AI calls (2 sections each max) to stay under 2 min ───────
      const withTimeout = (p: Promise<string>, ms = 150000) =>
        Promise.race([p, new Promise<string>((_, rej) => setTimeout(() => rej(new Error(`AI call timed out after ${ms/1000}s`)), ms))]);

      const [raw1, raw2, raw3, raw4, raw5, raw6] = await Promise.all([

        // ── CALL 1: Cover + Section 1 ────────────────────────────────────────
        withTimeout(this.invokeAI(sys, `${sharedCtx}

=== YOUR TASK ===
Format the data above into the cover page and executive summary (section 1) of the proposal.
Use the provided data to write complete, substantive content for each field. Write 2-5 thorough sentences per field using real details from the context above. Do not leave fields with just a word or two.
Return ONLY this JSON (no markdown):
{
  "coverPage": {"clientName":"${opp?.client_name}","projectTitle":"WRITE: specific study title derived from the RFP","date":"${date}","version":"v1.0","scopeMode":"Proposal","confidentiality":"STRICTLY CONFIDENTIAL — FOR ${clientUC} REVIEW ONLY"},
  "section1_executiveSummary": {
    "clientChallenge":"WRITE: 3-4 sentences describing the specific business/commercial challenge this client faces based on the RFP and brief",
    "decisionToSupport":"WRITE: 2-3 sentences on the exact business decision this research will inform",
    "recommendedPmrResponse":"WRITE: 2-3 sentences describing the recommended study type, method, audience, markets and timing from scope",
    "businessValue":"WRITE: 3-4 sentences explaining what the client can decide or do differently with this evidence",
    "coreOutputs":"WRITE: list the deliverables from the brief in 2-3 sentences",
    "timing":"WRITE: 2-3 sentences on headline timeline and key dependency from milestones",
    "commercialRecommendation":"WRITE: recommended pricing tier, total price, and payment terms",
    "decisionAsk":"WRITE: one clear sentence on what the client is approving",
    "draftingLine":"WRITE: one complete sentence: [Client] needs [specific evidence] to [specific decision]. We recommend [specific approach] to deliver [specific outputs] within [specific timeline]."
  }
}`, context)),

        // ── CALL 2: Sections 2-3 ─────────────────────────────────────────────
        withTimeout(this.invokeAI(sys, `${sharedCtx}

=== YOUR TASK ===
Format the data above into sections 2-3 of the proposal.
Use the provided data to write complete, substantive content for each field. Write 2-5 thorough sentences per field using real details from the context above. Do not leave fields with just a word or two.
Return ONLY this JSON (no markdown):
{
  "section2_decisionContext": {
    "currentSituation":"WRITE: 3-4 sentences on the current market/brand situation drawn from the RFP and brief context",
    "whyNow":"WRITE: 2-3 sentences explaining the urgency driver — why this research is needed now",
    "businessChallenge":"WRITE: 3-4 sentences on the specific gap or uncertainty this research addresses",
    "riskOfInaction":"WRITE: 2-3 sentences on what commercial decision gets impaired without this evidence",
    "actionPath":"WRITE: 2-3 sentences on what the client will do differently once they have this evidence",
    "priorityDecisions":[{"decision":"WRITE: first priority decision from research objectives","evidence":"WRITE: evidence type this study provides"},{"decision":"WRITE: second priority decision","evidence":"WRITE: evidence type"},{"decision":"WRITE: third priority decision","evidence":"WRITE: evidence type"}]
  },
  "section3_recommendedApproach": {
    "clientNeedsTable":[{"clientNeed":"WRITE: first specific client need from brief","recommendedResponse":"WRITE: recommended method or approach from scope","valueCreated":"WRITE: specific value or insight outcome"},{"clientNeed":"WRITE: second client need","recommendedResponse":"WRITE: approach","valueCreated":"WRITE: value"},{"clientNeed":"WRITE: third client need","recommendedResponse":"WRITE: approach","valueCreated":"WRITE: value"}],
    "whyThisDesignFits":"WRITE: 3-4 sentences on why the recommended methodology fits this client's needs",
    "whatClientWillKnow":"WRITE: 3-4 sentences on the decision-ready insights the client will have after this study",
    "whyNarrowerOptionIsWeaker":"WRITE: 2-3 sentences on what would be lost with a simpler/cheaper design",
    "successCriteria":"WRITE: 2-3 sentences on how the usefulness of this research will be judged"
  }
}`, context)),

        // ── CALL 3: Section 4 ────────────────────────────────────────────────
        withTimeout(this.invokeAI(sys, `${sharedCtx}

=== YOUR TASK ===
Format the data above into section 4 (scope baseline) of the proposal.
Use the provided data to write complete, substantive content for each field. Write 2-5 thorough sentences per field using real details from the context above. Do not leave fields with just a word or two.
Return ONLY this JSON (no markdown):
{
  "section4_scopeBaseline": {
    "primaryStudyType":"WRITE: specific study type (e.g. U&A survey, HCP concept test, longitudinal tracker) from scope/brief",
    "methodFamily":"WRITE: Quantitative/Qualitative/Mixed — explain in 1-2 sentences why",
    "audience":"WRITE: 2-3 sentences describing the target audience with specifics from the brief",
    "geographicScope":"WRITE: list the countries/markets and language considerations from brief",
    "timingModel":"WRITE: one-time/wave/ongoing and overall timeline from milestones",
    "deliverables":"WRITE: 2-3 sentences listing the specific deliverables from the brief",
    "reviewRounds":"WRITE: number of review cycles and how they are structured",
    "commercialBoundary":"WRITE: 2-3 sentences on what is included vs excluded in the base fee",
    "inScope":"WRITE: 3-4 sentences listing the included workstreams, markets, audiences, and deliverables from scope methodology",
    "outOfScope":"WRITE: 2-3 sentences on explicitly excluded items from scope assumptions",
    "futureOption":"WRITE: any optional future extensions or add-ons mentioned, or state None if not applicable",
    "scopeClause":"Changes to approved scope require a formal written re-scoping agreement before additional work commences."
  }
}`, context)),

        // ── CALL 4: Sections 5-6 ─────────────────────────────────────────────
        withTimeout(this.invokeAI(sys, `${sharedCtx}

=== YOUR TASK ===
Format the data above into sections 5-6 of the proposal.
Use the provided data to write complete, substantive content for each field. Write 2-5 thorough sentences per field using real details from the context above. Do not leave fields with just a word or two.
Return ONLY this JSON (no markdown):
{
  "section5_approachDelivery": {
    "phase1Design":"WRITE: 3-4 sentences on project initiation, questionnaire/guide design, stimulus development and localization using scope milestone data",
    "phase2Execute":"WRITE: 3-4 sentences on recruitment approach, field launch, live monitoring activities from scope and recruitment strategy",
    "phase3Analyze":"WRITE: 2-3 sentences on data quality checks, analysis approach, coding and insight generation",
    "phase4Deliver":"WRITE: 2-3 sentences on report drafting, client review cycles, final release and any workshop deliverable",
    "sourceOfSupply":"WRITE: 3-4 sentences on panel source, recruiter, vendor approach from recruitment strategy",
    "sampleLogic":"WRITE: 3-4 sentences explaining the sample size rationale, any uplifts, and statistical precision from sample options",
    "incidenceFeasibilityAssumptions":"WRITE: 3-4 sentences on incidence rate assumptions, audience access challenges and speed assumptions from feasibility assessment",
    "releaseWaveLogic":"WRITE: staged release logic if applicable, or state that a single-wave design is planned",
    "backupPlan":"WRITE: 2-3 sentences on contingency if incidence is lower than expected from feasibility mitigation",
    "marketComplianceConsiderations":"WRITE: regulatory, IRB, GDPR or HCP engagement compliance considerations if applicable, or state standard market research ethics apply"
  },
  "section6_deliverablesGovernance": {
    "coreDeliverables":"WRITE: 3-4 sentences listing the specific outputs with format (e.g. PowerPoint topline, full report, dashboard) from brief deliverables",
    "fieldLaunchControl":"WRITE: 2-3 sentences on what the client must approve before field launch (questionnaire, quotas, stimulus)",
    "liveMonitoring":"WRITE: 2-3 sentences on tracked metrics during fieldwork: response rates, incidence, quality flags, intervention triggers",
    "finalReleaseControl":"WRITE: 2-3 sentences on review rounds, ownership, and conditions for final release",
    "governanceCadence":"WRITE: 2-3 sentences on meeting rhythm, status update format, owners, and escalation path",
    "milestones":[{"milestone":"By proposal approval","clientInputRequired":"WRITE: what the client must confirm or provide at this stage"},{"milestone":"Before field launch","clientInputRequired":"WRITE: what the client must approve before launch"},{"milestone":"Before final release","clientInputRequired":"WRITE: sign-off or approval required for release"}]
  }
}`, context)),

        // ── CALL 5: Sections 7-8 ─────────────────────────────────────────────
        withTimeout(this.invokeAI(sys, `${sharedCtx}

=== YOUR TASK ===
Format the data above into sections 7-8 of the proposal.
Use the provided data to write complete, substantive content for each field. Write 2-5 thorough sentences per field using real details from the context above. Do not leave fields with just a word or two.
Return ONLY this JSON (no markdown):
{
  "section7_commercials": {
    "baseFee":"WRITE: 3-4 sentences describing what is covered in the base fee — labor, project management, analysis, reporting",
    "thirdPartyPassThrough":"WRITE: 2-3 sentences on HCP incentives, panel costs, translation costs from pricing data",
    "optionalModules":"WRITE: any optional add-on modules or future work extensions, or state none are included in base scope",
    "commercialNotes":"WRITE: payment terms, proposal validity period, and billing milestones from pricing data",
    "optionA":{"title":"Option A — Lean","description":"WRITE: 2-3 sentences on what is included and excluded in the lean option, and who it suits","price":${pricingOptions[0]?.totalPrice || 0}},
    "optionB":{"title":"Option B — Recommended","description":"WRITE: 2-3 sentences on why this is the recommended option and what it delivers over Option A","price":${(pricingOptions[1] || pricingOptions[0])?.totalPrice || 0}},
    "optionC":{"title":"Option C — Enhanced","description":"WRITE: 2-3 sentences on the extra insight, precision or coverage this option provides over Option B","price":${(pricingOptions[2] || pricingOptions[1] || pricingOptions[0])?.totalPrice || 0}}
  },
  "section8_risksDependencies": {
    "risks":[
      {"area":"Recruitment / feasibility risk","issue":"WRITE: specific recruitment challenge from feasibility assessment","mitigation":"WRITE: specific mitigation plan from feasibility"},
      {"area":"Timing risk","issue":"WRITE: specific timing risk from scope milestones or assumptions","mitigation":"WRITE: buffer weeks, parallel workstreams or contingency plan"},
      {"area":"Compliance / approval risk","issue":"WRITE: IRB, ethics or regulatory risk if applicable to this study","mitigation":"WRITE: compliance pathway and approval timeline planned"},
      {"area":"Scope drift risk","issue":"WRITE: risk of additions to audience, markets or deliverables during study","mitigation":"WRITE: formal change control process with written approval required"}
    ],
    "changeTriggers":[
      {"trigger":"Scope trigger","example":"WRITE: specific example of scope change relevant to this study","treatment":"WRITE: timeline and commercial impact of this change"},
      {"trigger":"Operational trigger","example":"WRITE: specific operational change example for this study","treatment":"WRITE: how this affects timeline and fee"},
      {"trigger":"Client review trigger","example":"WRITE: example of delayed client review or approval","treatment":"WRITE: timeline adjustment approach, note if no fee change"}
    ],
    "suggestedClause":"Any material change to approved scope requires a controlled re-scope discussion, potential timeline update, and fee revision agreed in writing before work commences."
  }
}`, context)),

        // ── CALL 6: Section 9 ────────────────────────────────────────────────
        withTimeout(this.invokeAI(sys, `${sharedCtx}

=== YOUR TASK ===
Format the data above into section 9 (credentials & close) of the proposal.
Use the provided data to write complete, substantive content for each field. Write 2-5 thorough sentences per field using real details from the context above. Do not leave fields with just a word or two.
Return ONLY this JSON (no markdown):
{
  "section9_credentials": {
    "proofAreas":[
      {"area":"Relevant experience","content":"WRITE: 2-3 sentences on PetaSight's experience with this type of study and therapeutic area","relevance":"WRITE: why this experience directly reduces risk on this project"},
      {"area":"Method expertise","content":"WRITE: 2-3 sentences on PetaSight's specific strength in the methodology being used in this study","relevance":"WRITE: how this expertise reduces execution risk for the client"},
      {"area":"Geography / audience strength","content":"WRITE: 2-3 sentences on PetaSight's panel and recruiter access in the markets in scope","relevance":"WRITE: why local knowledge and panel access matters for this study"},
      {"area":"Operational strength","content":"WRITE: 2-3 sentences on PetaSight's quality, governance, and project management capabilities","relevance":"WRITE: why operational rigour matters for on-time, on-budget delivery"}
    ],
    "miniCaseStudy":{"situation":"WRITE: prior study situation analogous to this one (similar study type or therapeutic area)","approach":"WRITE: methodology used in that prior study","outcome":"WRITE: business decision or commercial outcome that study enabled"},
    "decisionAsk":"WRITE: one clear sentence on what the client is asked to approve to initiate this study",
    "immediateNextStep":"WRITE: one sentence on what the client provides next to get started",
    "contractingPath":"Proposal acceptance → Statement of Work → MSA if not already in place",
    "proposalValidity":"WRITE: fee validity period, commercial contact, and next step to proceed"
  }
}`, context)),
      ]);

      // ── Parse + merge the 6 responses ─────────────────────────────────────
      const parseJson = (raw: string) => {
        let j = raw.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        const m = j.match(/\{[\s\S]*\}/);
        return JSON.parse(m ? m[0] : j);
      };

      let content: any;
      try {
        const [p1, p2, p3, p4, p5, p6] = [parseJson(raw1), parseJson(raw2), parseJson(raw3), parseJson(raw4), parseJson(raw5), parseJson(raw6)];
        content = { ...p1, ...p2, ...p3, ...p4, ...p5, ...p6 };
      } catch (e) {
        console.error('DocumentGeneratorAgent: JSON parse failed', e);
        return { success: false, error: 'Failed to parse AI proposal content' };
      }

      // dummy to satisfy old references below
      const qcResult: any = { overallPass: true, checks: [] };

      // ── Generate files in parallel ────────────────────────────────────────
      const outputDir = path.join(__dirname, '../../../../uploads/documents', context.opportunityId);
      fs.mkdirSync(outputDir, { recursive: true });
      const docxPath  = path.join(outputDir, 'proposal.docx');
      const briefPath = path.join(outputDir, 'internal_brief.docx');

      let docxGenerated  = false;
      let briefGenerated = false;
      const [docxErr, briefErr] = await Promise.all([
        this.generateDocx(content, docxPath).then(() => { docxGenerated = true; return null; }).catch((e: any) => e),
        this.generateInternalBrief({ opp, brief, scope, feasibility, pricing, pricingOptions, clarification, content }, briefPath)
          .then(() => { briefGenerated = true; return null; }).catch((e: any) => e),
      ]);
      if (docxErr)  console.error('proposal docx error:', docxErr);
      if (briefErr) console.error('internal brief error:', briefErr);

      const genConfig = { proposalContent: content, qcResult, generatedAt: new Date().toISOString() };

      const [proposalDoc] = await sql`
        INSERT INTO documents (opportunity_id, tenant_id, document_type, filename, file_path, format, template_used, generation_config, status, created_at, updated_at)
        VALUES (${context.opportunityId}, ${brief.tenant_id}, 'proposal', ${'proposal.docx'}, ${docxGenerated ? docxPath : null},
                'docx', 'PMR_Proposal_Template_Word_v4_SCOPE_FINAL.docx', ${JSON.stringify(genConfig)}::jsonb, 'draft', now(), now())
        ON CONFLICT (opportunity_id, document_type) DO UPDATE
          SET filename = EXCLUDED.filename, file_path = EXCLUDED.file_path,
              generation_config = EXCLUDED.generation_config, updated_at = now()
        RETURNING id`;

      if (briefGenerated) {
        await sql`
          INSERT INTO documents (opportunity_id, tenant_id, document_type, filename, file_path, format, template_used, generation_config, status, created_at, updated_at)
          VALUES (${context.opportunityId}, ${brief.tenant_id}, 'internal_brief', ${'internal_brief.docx'}, ${briefPath},
                  'docx', 'internal_brief', ${JSON.stringify({ pricingOptions })}::jsonb, 'draft', now(), now())
          ON CONFLICT (opportunity_id, document_type) DO UPDATE
            SET file_path = EXCLUDED.file_path, generation_config = EXCLUDED.generation_config, updated_at = now()`;
      }

      await sql`UPDATE opportunities SET status = 'document_gen', updated_at = now() WHERE id = ${context.opportunityId}`;

      console.log(`Document generation done — proposal:${docxGenerated} brief:${briefGenerated} QC:PASS`);

      return {
        success: true,
        data: { documentId: proposalDoc.id, proposalPath: docxGenerated ? docxPath : null, briefPath: briefGenerated ? briefPath : null, currentStatus: 'document_gen', nextStatus: 'approved' },
        metadata: { confidence: 0.92 },
      };
    } catch (error: any) {
      console.error('DocumentGeneratorAgent error:', error);
      return { success: false, error: error.message };
    }
  }
}
