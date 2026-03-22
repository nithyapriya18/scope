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
      shading: { fill: NAVY, color: 'auto' },
      spacing: { before: 300, after: 100 },
      indent: { left: 100 },
    });

    const row2 = (label: string, value: string, shade = false) => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [b(label)] })], width: { size: 2800, type: WidthType.DXA }, shading: { fill: shade ? LGRAY : WHITE, color: 'auto' }, borders: borders() }),
        new TableCell({ children: [new Paragraph({ children: [t(value || '—')] })], width: { size: 6400, type: WidthType.DXA }, shading: { fill: WHITE, color: 'auto' }, borders: borders() }),
      ],
    });

    const kv = (pairs: [string, string][], shade = false) => new Table({
      width: { size: W, type: WidthType.DXA },
      rows: pairs.map(([k, v], i) => row2(k, v, shade || i % 2 === 1)),
    });

    const hdrRow = (cols: string[]) => new TableRow({
      children: cols.map(c => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: c, bold: true, color: WHITE, font: 'Calibri', size: 20 })] })],
        shading: { fill: BLUE, color: 'auto' }, borders: borders(),
      })),
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
      new Paragraph({ children: [new TextRun({ text: 'INTERNAL PROJECT BRIEF', bold: true, color: WHITE, font: 'Calibri', size: 48, allCaps: true })], shading: { fill: NAVY, color: 'auto' }, alignment: AlignmentType.CENTER, spacing: { before: 200, after: 100 } }),
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

      // ── Pull all data from previous steps ────────────────────────────────
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

      const cb         = pricing?.cost_breakdown || {};
      const pricingOptions: any[] = cb.pricingOptions || [
        { tier: 'RECOMMENDED', totalPrice: pricing?.total_price, laborCost: pricing?.labor_cost, hcpCpiCost: pricing?.hcp_incentives, marginPct: pricing?.margin_percentage },
      ];
      const rec        = pricingOptions.find((o: any) => o.tier === cb.recommendedTier) || pricingOptions[1] || pricingOptions[0] || {};
      const feas       = feasibility?.llm_result || {};
      const meth       = scope?.methodology_detail || {};
      const milestones = scope?.key_milestones || {};
      const sample     = scope?.sample_size_options?.[1] || scope?.sample_size_options?.[0] || {};
      const recr       = scope?.recruitment_strategy || {};
      const assump     = scope?.scope_assumptions || [];
      const delivs     = brief.deliverables || scope?.deliverables || [];
      const timeline   = brief.timeline_requirements || {};
      const objArr: any[]  = brief.research_objectives || [];
      const clarQA     = clarification
        ? `Q: ${JSON.stringify(clarification.questions || []).substring(0, 600)}\nA: ${JSON.stringify(clarification.client_responses || {}).substring(0, 600)}`
        : 'No clarification exchange.';

      const date       = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      const clientUC   = (opp?.client_name || 'CLIENT').toUpperCase();
      const studyLabel = brief.study_type || scope?.detected_study_type || 'Quantitative';
      const totalPriceRec = rec.totalPrice || pricing?.total_price || 0;

      // ── 1 AI call: executive summary narrative only ───────────────────────
      const aiPrompt = `You are writing the executive summary section of a pharma market research proposal for ${opp?.client_name}.

Study: ${opp?.rfp_title}
Study type: ${studyLabel}
Objectives: ${JSON.stringify(objArr).substring(0, 800)}
Methodology: ${JSON.stringify(meth).substring(0, 600)}
Sample: n=${sample.n || 'TBD'}, audience: ${brief.target_audience}
Timeline: ${JSON.stringify(timeline).substring(0, 400)}
Total price: $${Number(totalPriceRec).toLocaleString()} (recommended tier)
Deliverables: ${JSON.stringify(delivs).substring(0, 400)}
Clarifications: ${clarQA}

Return ONLY this JSON (no markdown):
{
  "projectTitle": "concise 10-15 word study title",
  "clientChallenge": "2-3 sentences on the specific business challenge this client faces",
  "decisionToSupport": "1-2 sentences on the exact decision this research will inform",
  "recommendedPmrResponse": "1-2 sentences describing the recommended study approach",
  "businessValue": "2-3 sentences on what the client can do with this evidence",
  "draftingLine": "One sentence: [Client] needs [evidence] to [decision]. We recommend [approach] to deliver [outputs] within [timeline]."
}`;

      const sys = this.getSystemPrompt(context);
      const aiRaw = await this.invokeAI(sys, aiPrompt, context);
      let aiJson: any = {};
      try {
        const cleaned = aiRaw.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        const m = cleaned.match(/\{[\s\S]*\}/);
        aiJson = JSON.parse(m ? m[0] : cleaned);
      } catch (e) {
        console.warn('DocumentGeneratorAgent: AI JSON parse failed, using fallback');
      }

      // ── Assemble content from structured data + AI narrative ─────────────
      const content: any = {
        coverPage: {
          clientName:      opp?.client_name || 'Client',
          projectTitle:    aiJson.projectTitle || opp?.rfp_title || 'Research Proposal',
          date,
          version:         'v1.0',
          scopeMode:       'Proposal',
          confidentiality: `STRICTLY CONFIDENTIAL — FOR ${clientUC} REVIEW ONLY`,
        },
        section1_executiveSummary: {
          clientChallenge:          aiJson.clientChallenge || '',
          decisionToSupport:        aiJson.decisionToSupport || '',
          recommendedPmrResponse:   aiJson.recommendedPmrResponse || '',
          businessValue:            aiJson.businessValue || '',
          coreOutputs:              Array.isArray(delivs) ? delivs.join('; ') : String(delivs),
          timing:                   timeline.fieldwork ? `Fieldwork: ${timeline.fieldwork}. Reporting: ${timeline.reporting || 'TBD'}.` : JSON.stringify(timeline).substring(0, 200),
          commercialRecommendation: `${cb.recommendedTier || 'Recommended'} option: $${Number(totalPriceRec).toLocaleString()}. Payment: ${cb.paymentTerms || '50% on signature, 50% on final delivery'}.`,
          decisionAsk:              `Please approve this proposal to initiate the ${studyLabel} study.`,
          draftingLine:             aiJson.draftingLine || '',
        },
        section2_decisionContext: {
          currentSituation:  `${opp?.client_name} is seeking to understand ${brief.therapeutic_area || opp?.therapeutic_area} market dynamics through primary research.`,
          whyNow:            (timeline.targetStart || timeline.fieldwork) ? `Research is required by ${timeline.targetStart || timeline.fieldwork} to support upcoming commercial decisions.` : 'Research is required to support upcoming commercial decisions.',
          businessChallenge: objArr.length ? `Key objectives: ${objArr.slice(0, 3).map((o: any) => (typeof o === 'string' ? o : o.objective || JSON.stringify(o))).join('; ')}.` : '',
          riskOfInaction:    'Without this evidence, commercial decisions will be made without direct stakeholder input, increasing launch risk.',
          actionPath:        'Commission this research, apply findings to commercial strategy and stakeholder engagement.',
          priorityDecisions: objArr.slice(0, 3).map((o: any, i: number) => ({
            decision: typeof o === 'string' ? o : o.objective || `Objective ${i + 1}`,
            evidence: typeof o === 'string' ? 'Direct stakeholder insight' : o.kpi || 'Quantified stakeholder data',
          })),
        },
        section3_recommendedApproach: {
          clientNeedsTable: objArr.slice(0, 4).map((o: any) => ({
            clientNeed:          typeof o === 'string' ? o : o.objective || '',
            recommendedResponse: `${studyLabel} — ${meth.approach || meth.studyDesign || 'structured primary research'}`,
            valueCreated:        typeof o === 'string' ? 'Direct stakeholder evidence' : o.kpi || 'Actionable insight',
          })),
          whyThisDesignFits:        `${studyLabel} is the appropriate methodology to address ${opp?.client_name}'s research questions given the decision context and timeline.`,
          whatClientWillKnow:       `${opp?.client_name} will have quantified, statistically robust data to make informed commercial decisions.`,
          whyNarrowerOptionIsWeaker: 'A more limited design would not provide the sample size or market coverage needed for reliable subgroup analysis.',
          successCriteria:          `Data delivered on time with ≥${sample.incidenceRate || 15}% incidence, full quota achievement, and actionable outputs.`,
        },
        section4_scopeBaseline: {
          primaryStudyType:   studyLabel,
          methodFamily:       meth.approach || meth.studyDesign || '',
          audience:           brief.target_audience || '',
          geographicScope:    brief.sample_requirements?.markets
                                ? (Array.isArray(brief.sample_requirements.markets) ? brief.sample_requirements.markets.join(', ') : brief.sample_requirements.markets)
                                : (feas.markets ? feas.markets.join(', ') : 'As specified'),
          timingModel:        timeline.fieldwork ? `Field: ${timeline.fieldwork} | Reporting: ${timeline.reporting || 'TBD'}` : JSON.stringify(timeline).substring(0, 150),
          deliverables:       Array.isArray(delivs) ? delivs.join(', ') : String(delivs),
          reviewRounds:       '2 rounds of client review prior to final delivery',
          commercialBoundary: `Total fee: $${Number(totalPriceRec).toLocaleString()} (${cb.recommendedTier || 'Recommended'} tier). Formal change control for scope additions.`,
          inScope:            Array.isArray(delivs) ? delivs.slice(0, 4).join('; ') : '',
          outOfScope:         'Custom questionnaire programming, additional markets, qualitative depth interviews (unless specified)',
          futureOption:       'Phase 2 longitudinal tracker or qual follow-up available as optional extension.',
          scopeClause:        'Any material change to approved scope requires a written change order prior to work commencing.',
        },
        section5_approachDelivery: {
          phase1Design:  meth.designPhase || meth.approach || `Questionnaire design, screener development, quota setting, client approval`,
          phase2Execute: recr.description || `Fieldwork execution via ${recr.primarySource || 'panel and recruiter network'}. Target n=${sample.n || 'TBD'}.`,
          phase3Analyze: `Data cleaning, weighting, statistical analysis, subgroup reporting`,
          phase4Deliver: `Topline readout + full PowerPoint report with recommendations`,
          sourceOfSupply:       recr.primarySource || 'Panel + specialist HCP recruiter network',
          sampleLogic:          `n=${sample.n || 'TBD'} per ${Array.isArray(brief.sample_requirements?.markets) ? 'market' : 'study'}. ${sample.justification || ''}`,
          incidenceFeasibilityAssumptions: `IR: ${sample.incidenceRate || feas.overallIR || 'TBD'}%. ${feas.summary || ''}`.substring(0, 300),
          releaseWaveLogic:     'Single-wave fieldwork with interim data checks at 50% quota achievement',
          backupPlan:           assump.length ? `Contingency: ${assump[0]?.assumption || assump[0] || 'Alternative panel sources activated if IR falls below threshold.'}` : 'Alternative panel sources activated if incidence falls below threshold.',
          marketComplianceConsiderations: 'Standard market research ethics apply. IRB/ethics review as required per market.',
        },
        section6_deliverablesGovernance: {
          coreDeliverables:    Array.isArray(delivs) ? delivs.join('; ') : String(delivs),
          fieldLaunchControl:  'Client must approve: questionnaire draft, final screener, quota grid, and stimulus (if applicable)',
          liveMonitoring:      'Daily tracking of response rates, incidence, and quality flags. Intervention triggers at <10% below target IR.',
          finalReleaseControl: '2 review rounds. Final release requires written client sign-off.',
          governanceCadence:   'Weekly status calls during fieldwork. Dedicated Slack/Teams channel. Escalation path via project lead.',
          milestones: [
            { milestone: 'Proposal approval',  clientInputRequired: 'Signed proposal, confirmed contacts, PO raised' },
            { milestone: 'Before field launch', clientInputRequired: 'Approved questionnaire, screener, quotas, and stimulus' },
            { milestone: 'Before final release', clientInputRequired: 'Sign-off on topline readout and final report' },
          ],
        },
        section7_commercials: {
          baseFee:              `$${Number(rec.laborCost || pricing?.labor_cost || 0).toLocaleString()} covering project management, questionnaire design, data collection, analysis, and reporting.`,
          thirdPartyPassThrough: `$${Number(rec.hcpCpiCost || pricing?.hcp_incentives || 0).toLocaleString()} HCP incentives and panel costs. Invoiced at cost.`,
          optionalModules:      'No optional modules included in base scope. Extensions available upon request.',
          commercialNotes:      `${cb.paymentTerms || '50% on signature, 50% on final delivery'}. Quote valid 30 days. Fee revision may apply if scope changes.`,
          optionA: { title: pricingOptions[0]?.tier || 'Option A — Lean',        description: pricingOptions[0]?.rationale || 'Core deliverables, single market',              price: pricingOptions[0]?.totalPrice || 0 },
          optionB: { title: pricingOptions[1]?.tier || 'Option B — Recommended', description: pricingOptions[1]?.rationale || 'Recommended scope and sample size',              price: pricingOptions[1]?.totalPrice || pricingOptions[0]?.totalPrice || 0 },
          optionC: { title: pricingOptions[2]?.tier || 'Option C — Enhanced',    description: pricingOptions[2]?.rationale || 'Enhanced coverage, additional subgroups',        price: pricingOptions[2]?.totalPrice || pricingOptions[1]?.totalPrice || 0 },
        },
        section8_risksDependencies: {
          risks: [
            { area: 'Recruitment / feasibility', issue: feas.riskFactors?.[0] || 'Incidence below assumptions in key markets', mitigation: feas.contingencyStrategies?.[0] || 'Backup recruiter panels activated; quota flex applied' },
            { area: 'Timing',                    issue: 'Client review delays compressing fieldwork window', mitigation: 'Rolling review process; parallel workstreams where possible' },
            { area: 'Scope drift',               issue: 'Additions to audience, markets or deliverables post-approval', mitigation: 'Formal change control with written sign-off required before work commences' },
            { area: 'Compliance',                issue: 'Ethics/IRB approval timelines in certain markets', mitigation: 'Early ethics screening; country-specific compliance review pre-launch' },
          ],
          changeTriggers: [
            { trigger: 'Scope expansion',   example: 'Addition of new market or audience segment', treatment: 'Fee and timeline revision agreed in writing before proceeding' },
            { trigger: 'Questionnaire growth', example: 'Survey length exceeds approved LOI by >3 min', treatment: 'CPI increase applied pro-rata; timeline adjusted' },
            { trigger: 'Delayed approval',  example: 'Client review round >5 business days late',  treatment: 'Timeline adjusted proportionally; no fee change' },
          ],
          suggestedClause: 'Any material change to approved scope requires a controlled re-scope discussion, potential timeline update, and fee revision agreed in writing before work commences.',
        },
        section9_credentials: {
          proofAreas: [
            { area: 'Relevant experience',        content: `PetaSight has extensive experience in ${brief.therapeutic_area || 'pharma'} primary research across global markets.`,                          relevance: 'Proven delivery in this therapeutic area reduces execution risk.' },
            { area: 'Method expertise',            content: `Deep expertise in ${studyLabel} design, online panel management, and HCP engagement across 30+ countries.`,                                  relevance: 'Method strength ensures data quality and reliable subgroup analysis.' },
            { area: 'Geography / audience access', content: `Direct panel and recruiter access in all major pharma markets including US, EU5, Japan, and emerging markets.`,                               relevance: 'Local knowledge and panel depth supports quota achievement on time.' },
            { area: 'Operational strength',        content: `ISO-certified data collection processes, dedicated project management team, and real-time fieldwork monitoring dashboard.`,                 relevance: 'Operational rigour ensures on-time, on-budget delivery every time.' },
          ],
          miniCaseStudy: { situation: `Prior study in analogous ${brief.therapeutic_area || 'specialty pharma'} programme with similar audience and objectives.`, approach: `${studyLabel} across multiple markets using structured questionnaire.`, outcome: 'Findings directly informed product positioning strategy and launch readiness decision.' },
          decisionAsk:       `Please approve this proposal to confirm scope, initiate contracting, and begin the ${studyLabel} study.`,
          immediateNextStep: `${opp?.client_name} confirms approval via email; PetaSight issues Statement of Work within 2 business days.`,
          contractingPath:   'Proposal acceptance → Statement of Work → MSA if not already in place',
          proposalValidity:  `Fee valid for 30 days from ${date}. Contact your PetaSight project lead to proceed.`,
        },
      };

      // ── Generate files ───────────────────────────────────────────────────
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

      const genConfig = { proposalContent: content, generatedAt: new Date().toISOString() };

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
      console.log(`Document generation done — proposal:${docxGenerated} brief:${briefGenerated}`);

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
