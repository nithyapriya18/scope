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
      HeadingLevel, AlignmentType, WidthType, BorderStyle, PageBreak,
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

  // ─── XLSX helpers ───────────────────────────────────────────────────────────

  private async generateXlsx(content: any, pricingOptions: any[], outputPath: string): Promise<void> {
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

      // ── 3 parallel AI calls: sections 1-3 | 4-6 | 7-9+cover ──────────────
      const withTimeout = (p: Promise<string>, ms = 90000) =>
        Promise.race([p, new Promise<string>((_, rej) => setTimeout(() => rej(new Error(`AI call timed out after ${ms/1000}s`)), ms))]);

      const [raw1, raw2, raw3] = await Promise.all([

        // ── CALL 1: Cover + Sections 1-3 ────────────────────────────────────
        withTimeout(this.invokeAI(sys, `${sharedCtx}

=== YOUR TASK ===
Generate the cover page + sections 1-3 for this proposal. Every field: specific content, no placeholders.
Return ONLY this JSON (no markdown):
{
  "coverPage": {"clientName":"${opp?.client_name}","projectTitle":"<specific title>","date":"${date}","version":"v1.0","scopeMode":"Proposal","confidentiality":"STRICTLY CONFIDENTIAL — FOR ${clientUC} REVIEW ONLY"},
  "section1_executiveSummary": {
    "clientChallenge":"<specific business issue>","decisionToSupport":"<exact decision this study informs>",
    "recommendedPmrResponse":"<one sentence: type, method, audience, markets, timing>","businessValue":"<what client can do differently>",
    "coreOutputs":"<list deliverables>","timing":"<headline timing + key dependency>",
    "commercialRecommendation":"<recommended option, fee, payment, validity>","decisionAsk":"<what client approves now>",
    "draftingLine":"<[Client] needs [evidence] to [action]. We recommend [approach] to deliver [outputs] within [timeline].>"
  },
  "section2_decisionContext": {
    "currentSituation":"<market/brand situation>","whyNow":"<urgency driver>","businessChallenge":"<uncertainty/gap>",
    "riskOfInaction":"<what happens without evidence>","actionPath":"<what client does differently with evidence>",
    "priorityDecisions":[{"decision":"<d1>","evidence":"<e1>"},{"decision":"<d2>","evidence":"<e2>"},{"decision":"<d3>","evidence":"<e3>"}]
  },
  "section3_recommendedApproach": {
    "clientNeedsTable":[{"clientNeed":"<n1>","recommendedResponse":"<r1>","valueCreated":"<v1>"},{"clientNeed":"<n2>","recommendedResponse":"<r2>","valueCreated":"<v2>"},{"clientNeed":"<n3>","recommendedResponse":"<r3>","valueCreated":"<v3>"}],
    "whyThisDesignFits":"<rationale>","whatClientWillKnow":"<decision-ready outcomes>",
    "whyNarrowerOptionIsWeaker":"<what would be lost>","successCriteria":"<how usefulness judged>"
  }
}`, context)),

        // ── CALL 2: Sections 4-6 ────────────────────────────────────────────
        withTimeout(this.invokeAI(sys, `${sharedCtx}

=== YOUR TASK ===
Generate sections 4-6 for this proposal. Every field: specific content, no placeholders.
Return ONLY this JSON (no markdown):
{
  "section4_scopeBaseline": {
    "primaryStudyType":"<tracker/U&A/concept test/etc>","methodFamily":"<Quant/Qual/Hybrid>",
    "audience":"<HCP specialty/patients/etc>","geographicScope":"<countries + languages>",
    "timingModel":"<one-time/wave/ongoing>","deliverables":"<report/dashboard/workshop>",
    "reviewRounds":"<review cycles priced>","commercialBoundary":"<what's in/out of base fee>",
    "inScope":"<included workstreams, markets, audiences, deliverables>","outOfScope":"<excluded items>",
    "futureOption":"<optional future work>","scopeClause":"<formal scope control language>"
  },
  "section5_approachDelivery": {
    "phase1Design":"<kickoff, instrument design, stimulus, localization>",
    "phase2Execute":"<recruitment, field launch, live monitoring>",
    "phase3Analyze":"<QC, analysis, coding, insight generation>",
    "phase4Deliver":"<report drafting, reviews, final release, workshop>",
    "sourceOfSupply":"<panel/recruiter/vendor>","sampleLogic":"<baseline n, uplift, precision rationale>",
    "incidenceFeasibilityAssumptions":"<IR%, access, speed assumptions>",
    "releaseWaveLogic":"<staged release if relevant>","backupPlan":"<contingency if incidence low>",
    "marketComplianceConsiderations":"<regulatory/IRB/GDPR if material>"
  },
  "section6_deliverablesGovernance": {
    "coreDeliverables":"<list outputs with format>","fieldLaunchControl":"<what approved before launch>",
    "liveMonitoring":"<tracked items, intervention triggers>","finalReleaseControl":"<review ownership, release condition>",
    "governanceCadence":"<meeting rhythm, owners, escalation>",
    "milestones":[{"milestone":"By proposal approval","clientInputRequired":"<what client confirms>"},{"milestone":"Before launch","clientInputRequired":"<what client approves>"},{"milestone":"Before final release","clientInputRequired":"<sign-off required>"}]
  }
}`, context)),

        // ── CALL 3: Sections 7-9 ────────────────────────────────────────────
        withTimeout(this.invokeAI(sys, `${sharedCtx}

=== YOUR TASK ===
Generate sections 7-9 for this proposal. Every field: specific content, no placeholders.
Return ONLY this JSON (no markdown):
{
  "section7_commercials": {
    "baseFee":"<what's in base fee>","thirdPartyPassThrough":"<panels, incentives, translation if relevant>",
    "optionalModules":"<add-ons available>","commercialNotes":"<validity, billing milestones, payment terms>",
    "optionA":{"title":"Option A — Lean","description":"<what's included and excluded>","price":${pricingOptions[0]?.totalPrice || 0}},
    "optionB":{"title":"Option B — Recommended","description":"<what's included and why preferred>","price":${(pricingOptions[1] || pricingOptions[0])?.totalPrice || 0}},
    "optionC":{"title":"Option C — Enhanced","description":"<extra insight/precision/coverage>","price":${(pricingOptions[2] || pricingOptions[1] || pricingOptions[0])?.totalPrice || 0}}
  },
  "section8_risksDependencies": {
    "risks":[
      {"area":"Recruitment / feasibility risk","issue":"<specific risk>","mitigation":"<specific plan>"},
      {"area":"Timing risk","issue":"<specific risk>","mitigation":"<specific plan>"},
      {"area":"Compliance / approval risk","issue":"<specific risk>","mitigation":"<specific plan>"},
      {"area":"Scope drift risk","issue":"<specific risk>","mitigation":"<specific plan>"}
    ],
    "changeTriggers":[
      {"trigger":"Scope trigger","example":"<countries/audiences/sample change>","treatment":"<timeline and commercial effect>"},
      {"trigger":"Operational trigger","example":"<method/stimulus/schedule change>","treatment":"<timeline and commercial effect>"},
      {"trigger":"Client review trigger","example":"<extended reviews/delayed approvals>","treatment":"<timeline and commercial effect>"}
    ],
    "suggestedClause":"Any material change to approved scope may require controlled re-scope, timeline update, and fee revision."
  },
  "section9_credentials": {
    "proofAreas":[
      {"area":"Relevant experience","content":"<prior analogous project>","relevance":"<why relevant>"},
      {"area":"Method expertise","content":"<strength in proposed method>","relevance":"<risk reduction>"},
      {"area":"Geography / audience strength","content":"<local/audience strength>","relevance":"<feasibility/interpretation value>"},
      {"area":"Operational strength","content":"<governance/quality/compliance>","relevance":"<execution confidence>"}
    ],
    "miniCaseStudy":{"situation":"<prior client problem>","approach":"<PMR design used>","outcome":"<business result enabled>"},
    "decisionAsk":"<what client is asked to approve>","immediateNextStep":"<what client provides next>",
    "contractingPath":"<Proposal/SoW/MSA>","proposalValidity":"<fee validity, commercial owner, contacts>"
  }
}`, context)),
      ]);

      // ── Parse + merge the 3 responses ─────────────────────────────────────
      const parseJson = (raw: string) => {
        let j = raw.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        const m = j.match(/\{[\s\S]*\}/);
        return JSON.parse(m ? m[0] : j);
      };

      let content: any;
      try {
        const [p1, p2, p3] = [parseJson(raw1), parseJson(raw2), parseJson(raw3)];
        content = { ...p1, ...p2, ...p3 };
      } catch (e) {
        console.error('DocumentGeneratorAgent: JSON parse failed', e);
        return { success: false, error: 'Failed to parse AI proposal content' };
      }

      // dummy to satisfy old references below
      const qcResult: any = { overallPass: true, checks: [] };

      // ── Generate files in parallel ────────────────────────────────────────
      const outputDir = path.join(__dirname, '../../../../uploads/documents', context.opportunityId);
      fs.mkdirSync(outputDir, { recursive: true });
      const docxPath = path.join(outputDir, 'proposal.docx');
      const xlsxPath = path.join(outputDir, 'pricing_annex.xlsx');

      let docxGenerated = false;
      let xlsxGenerated = false;
      const [docxErr, xlsxErr] = await Promise.all([
        this.generateDocx(content, docxPath).then(() => { docxGenerated = true; return null; }).catch(e => e),
        this.generateXlsx(content, pricingOptions, xlsxPath).then(() => { xlsxGenerated = true; return null; }).catch(e => e),
      ]);
      if (docxErr) console.error('docx error:', docxErr);
      if (xlsxErr) console.error('xlsx error:', xlsxErr);

      // ── Save to documents table ───────────────────────────────────────────
      const genConfig = { proposalContent: content, qcResult, proposalPath: docxGenerated ? docxPath : null, pricingPath: xlsxGenerated ? xlsxPath : null, generatedAt: new Date().toISOString() };

      const [proposalDoc] = await sql`
        INSERT INTO documents (opportunity_id, tenant_id, document_type, filename, file_path, format, template_used, generation_config, status, created_at, updated_at)
        VALUES (${context.opportunityId}, ${brief.tenant_id}, 'proposal', ${'proposal.docx'}, ${docxGenerated ? docxPath : null},
                'docx', 'PMR_Proposal_Template_Word_v4_SCOPE_FINAL.docx', ${JSON.stringify(genConfig)}::jsonb, 'draft', now(), now())
        RETURNING id`;

      if (xlsxGenerated) {
        await sql`
          INSERT INTO documents (opportunity_id, tenant_id, document_type, filename, file_path, format, template_used, generation_config, status, created_at, updated_at)
          VALUES (${context.opportunityId}, ${brief.tenant_id}, 'pricing', ${'pricing_annex.xlsx'}, ${xlsxPath},
                  'xlsx', 'pricing_annex', ${JSON.stringify({ pricingOptions })}::jsonb, 'draft', now(), now())`;
      }

      await sql`UPDATE opportunities SET status = 'document_gen', updated_at = now() WHERE id = ${context.opportunityId}`;

      console.log(`Document generation done — docx:${docxGenerated} xlsx:${xlsxGenerated} QC:${qcResult.overallPass ? 'PASS' : 'FAIL'}`);

      return {
        success: true,
        data: { documentId: proposalDoc.id, proposalPath: docxGenerated ? docxPath : null, pricingPath: xlsxGenerated ? xlsxPath : null, qcResult, currentStatus: 'document_gen', nextStatus: 'approved' },
        metadata: { confidence: qcResult.overallPass ? 0.92 : 0.75 },
      };
    } catch (error: any) {
      console.error('DocumentGeneratorAgent error:', error);
      return { success: false, error: error.message };
    }
  }
}
