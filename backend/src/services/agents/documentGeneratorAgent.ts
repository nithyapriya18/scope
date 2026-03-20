/**
 * Document Generator Agent — Step 10
 * Phase A: AI generates full proposal narrative + QC check.
 * Phase B: Renders .docx (using docx package) + .xlsx pricing annex (using exceljs).
 * Files saved to backend/uploads/documents/{opportunityId}/.
 * Fully AI-driven: GOAL / INPUT / OUTPUT REQUIREMENTS pattern.
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';
import * as path from 'path';
import * as fs from 'fs';

// Dynamic imports to avoid compile-time failures if package absent
async function getDocx() {
  return await import('docx');
}
async function getExcelJs() {
  const ExcelJS = await import('exceljs');
  return ExcelJS.default || ExcelJS;
}

export class DocumentGeneratorAgent extends BaseAgent {
  protected agentType = 'document_generation';

  protected getSystemPrompt(_context: AgentContext): string {
    return `You are a Senior Research Director and Proposal Writer at PetaSight, a pharma market research firm.
Your job is to write a complete, client-ready research proposal based on all the project intelligence provided.
Every section must be specific to this RFP — no generic placeholder text.
Output ONLY valid JSON. No markdown, no commentary.`;
  }

  private async generateDocx(content: any, outputPath: string): Promise<void> {
    const {
      Document, Packer, Paragraph, TextRun, HeadingLevel,
      AlignmentType, PageBreak, UnderlineType,
    } = await getDocx();

    const titleText = (text: string) => new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text, bold: true, size: 28 })],
      spacing: { before: 400, after: 200 },
    });

    const h2 = (text: string) => new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text, bold: true, size: 24 })],
      spacing: { before: 300, after: 100 },
    });

    const body = (text: string) => new Paragraph({
      children: [new TextRun({ text, size: 22 })],
      spacing: { after: 120 },
    });

    const bullet = (text: string) => new Paragraph({
      bullet: { level: 0 },
      children: [new TextRun({ text, size: 22 })],
      spacing: { after: 80 },
    });

    const children: any[] = [
      // Cover
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 800 }, children: [new TextRun({ text: 'PetaSight', bold: true, size: 56, color: 'DA365C' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Research Proposal', bold: true, size: 36 })], spacing: { after: 400 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: content.coverPage?.projectTitle || 'Research Proposal', size: 28 })], spacing: { after: 200 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Prepared for: ${content.coverPage?.clientName || 'Client'}`, size: 24 })], spacing: { after: 200 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: content.coverPage?.date || new Date().toLocaleDateString(), size: 24 })], spacing: { after: 200 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: content.coverPage?.confidentiality || 'STRICTLY CONFIDENTIAL', size: 20, color: '666666' })] }),
      new Paragraph({ children: [new PageBreak()] }),

      // Executive Summary
      titleText('Executive Summary'),
      ...(Array.isArray(content.executiveSummary) ? content.executiveSummary : [content.executiveSummary || '']).map((p: string) => body(p)),
      new Paragraph({ children: [new PageBreak()] }),

      // Research Approach
      titleText('Research Approach'),
      ...(Array.isArray(content.researchApproach) ? content.researchApproach : [content.researchApproach || '']).map((p: string) => body(p)),
      new Paragraph({ children: [new PageBreak()] }),

      // Sample Plan
      titleText('Sample Plan'),
      ...(Array.isArray(content.samplePlan) ? content.samplePlan : [content.samplePlan || '']).map((p: string) => body(p)),
      new Paragraph({ children: [new PageBreak()] }),

      // Timeline
      titleText('Project Timeline'),
      ...(Array.isArray(content.timeline) ? content.timeline.map((row: any) =>
        bullet(`Week ${row.week || row.startWeek || '?'}: ${row.milestone || row.activity || JSON.stringify(row)}`)
      ) : [body(typeof content.timeline === 'string' ? content.timeline : '')]),
      new Paragraph({ children: [new PageBreak()] }),

      // Deliverables
      titleText('Deliverables'),
      ...(Array.isArray(content.deliverables) ? content.deliverables.map((d: any) =>
        bullet(typeof d === 'string' ? d : `${d.name || d.deliverable || ''} — ${d.format || ''} (${d.timing || ''})`)
      ) : [body(typeof content.deliverables === 'string' ? content.deliverables : '')]),
      new Paragraph({ children: [new PageBreak()] }),

      // Commercial Terms
      titleText('Commercial Terms'),
      ...(Array.isArray(content.commercialTerms) ? content.commercialTerms : [content.commercialTerms || '']).map((p: string) => body(typeof p === 'string' ? p : JSON.stringify(p))),
      new Paragraph({ children: [new PageBreak()] }),

      // Assumptions & Exclusions
      titleText('Assumptions & Exclusions'),
      ...(Array.isArray(content.assumptionsAndExclusions) ? content.assumptionsAndExclusions.map((a: any) =>
        bullet(typeof a === 'string' ? a : `${a.assumption || a.item || JSON.stringify(a)}`)
      ) : [body(typeof content.assumptionsAndExclusions === 'string' ? content.assumptionsAndExclusions : '')]),
    ];

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
  }

  private async generateXlsx(content: any, pricingOptions: any[], outputPath: string): Promise<void> {
    const ExcelJS = await getExcelJs();
    const workbook = new (ExcelJS as any).Workbook();

    // Tab 1 — Pricing Summary
    const summarySheet = workbook.addWorksheet('Pricing Summary');
    summarySheet.columns = [
      { header: 'Tier', key: 'tier', width: 12 },
      { header: 'Sample (n)', key: 'n', width: 12 },
      { header: 'Labor Cost', key: 'laborCost', width: 15 },
      { header: 'HCP CPI Cost', key: 'hcpCpiCost', width: 15 },
      { header: 'OOP Costs', key: 'oopCosts', width: 12 },
      { header: 'Overhead', key: 'overhead', width: 12 },
      { header: 'Margin', key: 'margin', width: 12 },
      { header: 'Total Price (USD)', key: 'totalPrice', width: 18 },
      { header: 'Field Weeks', key: 'fieldWeeks', width: 12 },
    ];
    summarySheet.getRow(1).font = { bold: true };
    for (const opt of pricingOptions) {
      summarySheet.addRow({
        tier: opt.tier,
        n: opt.n,
        laborCost: opt.laborCost,
        hcpCpiCost: opt.hcpCpiCost,
        oopCosts: opt.oopCosts,
        overhead: opt.overhead,
        margin: opt.margin,
        totalPrice: opt.totalPrice,
        fieldWeeks: opt.fieldWeeks,
      });
    }

    // Tab 2 — Commercial Terms
    const termsSheet = workbook.addWorksheet('Commercial Terms');
    termsSheet.addRow(['Item', 'Detail']);
    termsSheet.getRow(1).font = { bold: true };
    if (content.commercialTerms) {
      const terms = Array.isArray(content.commercialTerms)
        ? content.commercialTerms
        : [content.commercialTerms];
      terms.forEach((t: any) => termsSheet.addRow([
        typeof t === 'string' ? '' : (t.item || ''),
        typeof t === 'string' ? t : (t.detail || JSON.stringify(t)),
      ]));
    }

    // Tab 3 — Assumptions
    const assumpSheet = workbook.addWorksheet('Assumptions');
    assumpSheet.addRow(['#', 'Assumption', 'Category', 'Risk']);
    assumpSheet.getRow(1).font = { bold: true };
    const assumptions = Array.isArray(content.assumptionsAndExclusions)
      ? content.assumptionsAndExclusions
      : [];
    assumptions.forEach((a: any, i: number) => assumpSheet.addRow([
      i + 1,
      typeof a === 'string' ? a : (a.assumption || a.item || JSON.stringify(a)),
      typeof a === 'object' ? (a.category || '') : '',
      typeof a === 'object' ? (a.riskLevel || '') : '',
    ]));

    await workbook.xlsx.writeFile(outputPath);
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      const sql = getSql();

      const [[opp], [brief], [gapAnalysis], [clarification], [feasibility], [scope], [pricing]] =
        await Promise.all([
          sql`SELECT email_body, rfp_title, client_name, client_email, therapeutic_area FROM opportunities WHERE id = ${context.opportunityId}`,
          sql`SELECT tenant_id, study_type, target_audience, therapeutic_area, research_objectives,
                     sample_requirements, timeline_requirements, deliverables, budget_indication, raw_extraction
              FROM briefs WHERE opportunity_id = ${context.opportunityId} ORDER BY created_at DESC LIMIT 1`,
          sql`SELECT llm_analysis FROM gap_analyses ga JOIN briefs b ON ga.brief_id = b.id
              WHERE b.opportunity_id = ${context.opportunityId} ORDER BY ga.created_at DESC LIMIT 1`,
          sql`SELECT questions, client_responses FROM clarifications
              WHERE opportunity_id = ${context.opportunityId} ORDER BY created_at DESC LIMIT 1`,
          sql`SELECT llm_result FROM feasibility_assessments WHERE opportunity_id = ${context.opportunityId}
              ORDER BY created_at DESC LIMIT 1`,
          sql`SELECT executive_summary, detected_study_type, methodology_detail, sample_size_options,
                     scope_assumptions, deliverables, key_milestones, recruitment_strategy,
                     discussion_guide_outline
              FROM scopes WHERE opportunity_id = ${context.opportunityId} ORDER BY created_at DESC LIMIT 1`,
          sql`SELECT total_price, labor_cost, hcp_incentives, overhead_cost, margin_amount,
                     margin_percentage, cost_breakdown
              FROM pricing_packs WHERE opportunity_id = ${context.opportunityId} ORDER BY created_at DESC LIMIT 1`,
        ]);

      if (!brief) return { success: false, error: 'No brief found for this opportunity' };

      // ── AI Call 1: Generate full proposal narrative ─────────────────────
      const narrativePrompt = `
=== GOAL ===
Write a complete, client-ready research proposal for PetaSight's bid on this pharma RFP.
Every section must be specific to THIS study — no generic text.

=== INPUT 1: FULL RFP TEXT ===
${opp?.email_body || 'Not available'}

=== INPUT 2: BRIEF & SCOPE ===
Client: ${opp?.client_name}
RFP: ${opp?.rfp_title}
Therapeutic area: ${brief.therapeutic_area}
Study type: ${brief.study_type}
Target audience: ${brief.target_audience}
Research objectives: ${JSON.stringify(brief.research_objectives || [])}
Deliverables: ${JSON.stringify(brief.deliverables || [])}
Budget: ${brief.budget_indication || 'Not disclosed'}

Executive summary (from scope planner):
${scope?.executive_summary || 'Not available'}

Methodology:
${JSON.stringify(scope?.methodology_detail || {}, null, 2)}

Sample options:
${JSON.stringify(scope?.sample_size_options || [], null, 2)}

Timeline:
${JSON.stringify(scope?.key_milestones || {}, null, 2)}

Scope assumptions:
${JSON.stringify(scope?.scope_assumptions || [], null, 2)}

=== INPUT 3: FEASIBILITY & PRICING ===
Feasibility: ${JSON.stringify(feasibility?.llm_result || {}, null, 2)}
Pricing: Total price $${pricing?.total_price || 'TBD'} | Labor $${pricing?.labor_cost || 0} | HCP $${pricing?.hcp_incentives || 0} | Margin ${pricing?.margin_percentage || 25}%
Pricing detail: ${JSON.stringify(pricing?.cost_breakdown || {}, null, 2)}

=== INPUT 4: CLARIFICATION Q&A ===
${clarification ? JSON.stringify({ questions: clarification.questions, responses: clarification.client_responses }, null, 2) : 'None'}

=== OUTPUT REQUIREMENTS ===
Return a JSON object with ALL of the following sections. Every section must contain REAL content.

1. coverPage: {projectTitle, clientName, date: "${new Date().toLocaleDateString()}", confidentiality: "STRICTLY CONFIDENTIAL — FOR [CLIENT] REVIEW ONLY"}

2. executiveSummary: array of 3 paragraphs (strings):
   - Para 1: What the client wants to understand (restate brief in our words)
   - Para 2: PetaSight's recommended approach and why
   - Para 3: How our approach delivers the insights needed and timeline/price headline

3. researchApproach: array of 3-4 paragraphs covering methodology rationale, data collection approach, analysis plan, quality assurance

4. samplePlan: array of 2-3 paragraphs covering audience, sample size, geographic distribution, recruitment approach, feasibility statement

5. timeline: array of milestone objects {week, milestone, tasks: string[]}

6. deliverables: array of deliverable objects {name, format, timing, description}

7. commercialTerms: array of items covering recommended tier price, what's included/excluded, payment schedule, validity period

8. assumptionsAndExclusions: array of assumption strings — all PetaSight-owned design decisions

Return ONLY the JSON object.`;

      const narrativeResponse = await this.invokeAI(this.getSystemPrompt(context), narrativePrompt, context);

      let content: any;
      try {
        let json = narrativeResponse.trim();
        if (json.startsWith('```')) json = json.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        const match = json.match(/\{[\s\S]*\}/);
        content = JSON.parse(match ? match[0] : json);
      } catch {
        console.error('DocumentGeneratorAgent: failed to parse narrative JSON:', narrativeResponse.substring(0, 300));
        return { success: false, error: 'Failed to parse AI proposal content' };
      }

      // ── AI Call 2: QC Check ─────────────────────────────────────────────
      let qcResult: any = { overallPass: true, checks: [] };
      try {
        const qcPrompt = `
=== GOAL ===
Review the generated proposal content for quality and consistency.
Check: numbers match the brief, compliance language is present, assumptions are stated, HCP consent language is included.

=== PROPOSAL CONTENT TO REVIEW ===
${JSON.stringify(content, null, 2)}

=== ORIGINAL BRIEF ===
Study type: ${brief.study_type}
Budget: ${brief.budget_indication || 'Not disclosed'}
Price: $${pricing?.total_price || 'TBD'}

=== OUTPUT REQUIREMENTS ===
Return JSON: {
  checks: [{name, status: "pass"|"fail", issue}],
  overallPass: boolean,
  criticalIssues: string[]
}`;

        const qcResponse = await this.invokeAI(this.getSystemPrompt(context), qcPrompt, context);
        let qcJson = qcResponse.trim();
        if (qcJson.startsWith('```')) qcJson = qcJson.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        const qcMatch = qcJson.match(/\{[\s\S]*\}/);
        qcResult = JSON.parse(qcMatch ? qcMatch[0] : qcJson);
      } catch { /* QC is non-fatal */ }

      // ── Phase B: Generate files ─────────────────────────────────────────
      const outputDir = path.join(__dirname, '../../../../uploads/documents', context.opportunityId);
      fs.mkdirSync(outputDir, { recursive: true });

      const docxPath = path.join(outputDir, 'proposal.docx');
      const xlsxPath = path.join(outputDir, 'pricing_annex.xlsx');

      const pricingOptions: any[] = pricing?.cost_breakdown?.pricingOptions || [
        { tier: 'GOOD', n: 0, laborCost: pricing?.labor_cost, hcpCpiCost: pricing?.hcp_incentives, oopCosts: 0, overhead: pricing?.overhead_cost, margin: pricing?.margin_amount, totalPrice: pricing?.total_price, fieldWeeks: 0 },
      ];

      let docxGenerated = false;
      let xlsxGenerated = false;

      try {
        await this.generateDocx(content, docxPath);
        docxGenerated = true;
        console.log(`📄 .docx generated: ${docxPath}`);
      } catch (e) {
        console.error('docx generation failed:', e);
      }

      try {
        await this.generateXlsx(content, pricingOptions, xlsxPath);
        xlsxGenerated = true;
        console.log(`📊 .xlsx generated: ${xlsxPath}`);
      } catch (e) {
        console.error('xlsx generation failed:', e);
      }

      // ── Save to documents table ─────────────────────────────────────────
      const generationConfig = {
        proposalContent: content,
        qcResult,
        proposalPath: docxGenerated ? docxPath : null,
        pricingPath: xlsxGenerated ? xlsxPath : null,
        generatedAt: new Date().toISOString(),
      };

      const [proposalDoc] = await sql`
        INSERT INTO documents (
          opportunity_id, tenant_id, document_type, filename, file_path,
          format, template_used, generation_config, status, created_at, updated_at
        ) VALUES (
          ${context.opportunityId},
          ${brief.tenant_id},
          'proposal',
          ${'proposal.docx'},
          ${docxGenerated ? docxPath : null},
          'docx',
          'PMR_Proposal_Template_Word_v4_SCOPE_FINAL.docx',
          ${JSON.stringify(generationConfig)}::jsonb,
          'draft',
          now(), now()
        )
        RETURNING id
      `;

      if (xlsxGenerated) {
        await sql`
          INSERT INTO documents (
            opportunity_id, tenant_id, document_type, filename, file_path,
            format, template_used, generation_config, status, created_at, updated_at
          ) VALUES (
            ${context.opportunityId},
            ${brief.tenant_id},
            'pricing',
            ${'pricing_annex.xlsx'},
            ${xlsxPath},
            'xlsx',
            'pricing_annex',
            ${JSON.stringify({ pricingOptions })}::jsonb,
            'draft',
            now(), now()
          )
        `;
      }

      await sql`
        UPDATE opportunities
        SET status = 'document_gen', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      console.log(`✅ Document generation complete for ${opp?.rfp_title}`);
      console.log(`   docx: ${docxGenerated} | xlsx: ${xlsxGenerated}`);
      console.log(`   QC: ${qcResult.overallPass ? 'PASS' : 'FAIL'} (${(qcResult.checks || []).length} checks)`);

      return {
        success: true,
        data: {
          documentId: proposalDoc.id,
          proposalPath: docxGenerated ? docxPath : null,
          pricingPath: xlsxGenerated ? xlsxPath : null,
          qcResult,
          currentStatus: 'document_gen',
          nextStatus: 'approved',
        },
        metadata: { confidence: qcResult.overallPass ? 0.92 : 0.75 },
      };
    } catch (error: any) {
      console.error('DocumentGeneratorAgent error:', error);
      return { success: false, error: error.message };
    }
  }
}
