/**
 * Document Generator Agent (Phase 6)
 * Generates proposal documents, statements of work, and pricing packs
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';
import { getSql } from '../../lib/sql';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

export class DocumentGeneratorAgent extends BaseAgent {
  protected agentType = 'document_generation';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are a PMR Document Generation Specialist responsible for creating professional proposal documents.

Your task is to prepare document content that will be used to generate:
1. Proposal Document (Word DOCX)
2. Statement of Work (Word DOCX)
3. Pricing Pack (Excel XLSX)
4. Capabilities Presentation (PowerPoint PPTX)

For each document type, structure the content appropriately:

**1. Proposal Document Content**:

**Cover Page**:
- Client name and logo placeholder
- RFP title
- Submission date
- Our company name (PetaSight - Lumina Scope)
- Confidentiality statement

**Executive Summary** (1-2 pages):
- Understanding of client's research objectives
- Our recommended approach (qualitative/quantitative/mixed)
- Key value propositions (why us?)
- Timeline summary
- Budget summary
- Key deliverables

**Company Background** (1 page):
- PetaSight overview
- Experience in pharmaceutical market research
- Therapeutic area expertise
- Client testimonials/references

**Understanding of Requirements** (1-2 pages):
- Restate research objectives
- Target audience understanding
- Geographic scope
- Therapeutic area context

**Proposed Methodology** (2-3 pages):
- Study design (qualitative/quantitative/mixed)
- Data collection approach (interviews, surveys)
- Sample design and recruitment strategy
- Data analysis methodology
- Quality assurance measures

**Sample Plan** (1-2 pages):
- Sample size justification
- Geographic distribution
- Quota requirements
- Recruitment approach
- Expected completion rates

**Project Team** (1 page):
- Project Manager bio
- Key team members
- Roles and responsibilities

**Timeline** (1 page):
- Project phases with durations
- Key milestones
- Delivery dates
- Client touchpoints

**Pricing Summary** (1 page):
- Total project price
- Payment terms
- Inclusions and exclusions
- Budget notes

**Appendices**:
- Discussion guide outline (if qualitative)
- Survey flow (if quantitative)
- Team resumes
- Company certifications

**2. Statement of Work (SOW) Content**:

**Project Overview**:
- Project title
- Client name
- Start and end dates
- Project objectives

**Scope of Services**:
- Detailed task list by phase
- Deliverables for each phase
- Timeline for each phase

**Deliverables**:
- Itemized list of all deliverables
- Format specifications (PDF, Word, Excel, PowerPoint)
- Delivery schedule

**Client Responsibilities**:
- RFP clarification responses
- Discussion guide approval
- Report review and feedback
- Payment schedule adherence

**Project Management**:
- Communication plan (weekly status calls)
- Change order process
- Escalation procedures

**Acceptance Criteria**:
- Quality standards
- Revision policy (2 rounds included)
- Final acceptance process

**Terms and Conditions**:
- Payment terms (50/25/25)
- Confidentiality
- Intellectual property
- Termination clause

**3. Pricing Pack Content** (Excel):

**Tab 1: Summary**:
- Total project price
- Payment schedule
- Budget comparison (RFP budget vs. our price)

**Tab 2: Detailed Breakdown**:
- Labor costs by phase and role
- Recruitment costs
- Incentive costs
- Data processing costs
- Technology costs
- Overhead
- Margin
- Total

**Tab 3: Assumptions**:
- List of pricing assumptions
- Inclusions
- Exclusions
- Change order notes

**4. Capabilities Presentation Content** (PowerPoint):

**Slide 1: Cover**:
- Company name and logo
- "Proposal for [RFP Title]"
- Date

**Slide 2: Agenda**:
- Meeting flow

**Slide 3: Understanding Your Needs**:
- Research objectives summary
- Key challenges

**Slide 4: Our Approach**:
- Recommended methodology
- Why this approach?

**Slide 5: Sample Design**:
- Sample size and distribution
- Recruitment strategy

**Slide 6: Timeline**:
- Project phases
- Key milestones
- Duration

**Slide 7: Our Team**:
- Project Manager
- Key team members

**Slide 8: Why PetaSight?**:
- Experience in pharma
- Therapeutic area expertise
- Quality assurance

**Slide 9: Pricing Summary**:
- Total investment
- Payment terms

**Slide 10: Next Steps**:
- Approval process
- Kickoff timeline
- Contact information

For each document, ensure content is:
- Professional and client-focused
- Clear and concise
- Branded (PetaSight colors and style)
- Compliant with pharma RFP standards

Respond with structured JSON containing: proposalContent{}, sowContent{}, pricingPackContent{}, presentationContent{}, documentMetadata{}, confidenceScore.`;
  }

  protected async process(context: AgentContext): Promise<AgentResult> {
    try {
      // Get all project data from database
      const sql = getSql();
      const data = await sql`
        SELECT
          b.id as brief_id,
          b.research_objectives as "researchObjectives",
          b.target_audience as "targetAudience",
          b.therapeutic_area as "therapeuticArea",
          b.study_type as "studyType",
          b.deliverables,
          o.id as opportunity_id,
          o.rfp_title as "rfpTitle",
          o.client_name as "clientName",
          o.client_email as "clientEmail",
          o.geography,
          o.rfp_deadline as "rfpDeadline",
          s.id as scope_id,
          s.methodology,
          s.discussion_guide_outline as "discussionGuideOutline",
          s.project_phases as "projectPhases",
          sp.id as sample_plan_id,
          sp.sample_size_recommendation as "sampleSizeRecommendation",
          sp.sample_distribution as "sampleDistribution",
          sp.quotas,
          sp.recruitment_strategy as "recruitmentStrategy",
          w.id as wbs_id,
          w.task_breakdown as "taskBreakdown",
          w.team_roles as "teamRoles",
          w.duration_estimates as "durationEstimates",
          p.id as pricing_pack_id,
          p.total_price as "totalPrice",
          p.pricing_pack_breakdown as "pricingPackBreakdown",
          p.payment_terms as "paymentTerms",
          p.assumptions
        FROM briefs b
        JOIN opportunities o ON b.opportunity_id = o.id
        LEFT JOIN scopes s ON s.brief_id = b.id
        LEFT JOIN sample_plans sp ON sp.scope_id = s.id
        LEFT JOIN hcp_shortlists h ON h.sample_plan_id = sp.id
        LEFT JOIN wbs w ON w.hcp_shortlist_id = h.id
        LEFT JOIN pricing_packs p ON p.wbs_id = w.id
        WHERE o.id = ${context.opportunityId}
        ORDER BY b.created_at DESC
        LIMIT 1
      `;

      if (data.length === 0) {
        return {
          success: false,
          error: 'No project data found',
        };
      }

      const projectData = data[0];

      if (!projectData.pricing_pack_id) {
        return {
          success: false,
          error: 'Pricing must be completed before document generation',
        };
      }

      // Prepare AI prompt to structure document content
      const systemPrompt = this.getSystemPrompt(context);
      const userMessage = `Prepare professional document content for this project:

**RFP Title**: ${projectData.rfpTitle}
**Client**: ${projectData.clientName}
**Therapeutic Area**: ${projectData.therapeuticArea}

**Research Objectives**:
${JSON.stringify(projectData.researchObjectives, null, 2)}

**Study Type**: ${projectData.studyType}
**Target Audience**: ${projectData.targetAudience}
**Geography**: ${JSON.stringify(projectData.geography, null, 2)}

**Methodology**:
${JSON.stringify(projectData.methodology, null, 2)}

**Sample Plan**:
- Sample Size: ${JSON.stringify(projectData.sampleSizeRecommendation, null, 2)}
- Distribution: ${JSON.stringify(projectData.sampleDistribution, null, 2)}
- Quotas: ${JSON.stringify(projectData.quotas, null, 2)}
- Recruitment: ${JSON.stringify(projectData.recruitmentStrategy, null, 2)}

**Timeline**:
${JSON.stringify(projectData.durationEstimates, null, 2)}

**Pricing**:
- Total Price: ${JSON.stringify(projectData.totalPrice, null, 2)}
- Payment Terms: ${JSON.stringify(projectData.paymentTerms, null, 2)}
- Assumptions: ${JSON.stringify(projectData.assumptions, null, 2)}

**Deliverables**:
${JSON.stringify(projectData.deliverables, null, 2)}

Based on this information, create structured content for:
1. Proposal Document (Word) - Professional, persuasive, client-focused
2. Statement of Work (Word) - Detailed, contractual, clear
3. Pricing Pack (Excel) - Transparent, itemized, justified
4. Capabilities Presentation (PowerPoint) - Visual, concise, compelling

Ensure all content:
- Follows pharma RFP proposal best practices
- Uses professional language
- Is complete and ready for document generation
- Includes PetaSight branding elements
- Addresses all RFP requirements

Respond with complete JSON containing all document content sections.`;

      const response = await this.invokeAI(systemPrompt, userMessage, context);

      // Parse JSON response
      let documentContent;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          documentContent = JSON.parse(jsonMatch[0]);
        } else {
          documentContent = JSON.parse(response);
        }
      } catch (parseError) {
        console.error('Failed to parse document content:', response);
        return {
          success: false,
          error: 'Failed to parse document content',
        };
      }

      // Save document content to database
      const docResult = await sql`
        INSERT INTO documents (
          pricing_pack_id,
          document_type,
          document_content,
          file_path,
          status,
          created_at,
          updated_at
        ) VALUES
          (${projectData.pricing_pack_id}, 'proposal', ${JSON.stringify(documentContent.proposalContent || {})}::jsonb, null, 'draft', now(), now()),
          (${projectData.pricing_pack_id}, 'sow', ${JSON.stringify(documentContent.sowContent || {})}::jsonb, null, 'draft', now(), now()),
          (${projectData.pricing_pack_id}, 'pricing_pack', ${JSON.stringify(documentContent.pricingPackContent || {})}::jsonb, null, 'draft', now(), now()),
          (${projectData.pricing_pack_id}, 'presentation', ${JSON.stringify(documentContent.presentationContent || {})}::jsonb, null, 'draft', now(), now())
        RETURNING id, document_type as "documentType"
      `;

      // Generate physical documents using Python script
      const documentIds = docResult.map(d => ({ id: d.id, type: d.documentType }));

      console.log(`✅ Document content prepared for opportunity ${context.opportunityId}`);
      console.log(`📄 Document IDs: ${documentIds.map(d => `${d.type}:${d.id}`).join(', ')}`);

      // TODO: Call Python script to generate actual Word/Excel/PowerPoint files
      // For now, we'll just return success with document IDs
      // In production, this would call: python3 scripts/generate_documents.py <document_ids>

      // Update opportunity status
      await sql`
        UPDATE opportunities
        SET status = 'approved', updated_at = now()
        WHERE id = ${context.opportunityId}
      `;

      return {
        success: true,
        data: {
          documentIds,
          ...documentContent,
          nextStatus: 'approved',
          message: 'Document content generated successfully. Physical documents ready for Python generation script.',
        },
        metadata: {
          confidence: documentContent.confidenceScore || 0.90,
        },
      };
    } catch (error: any) {
      console.error('Document generator error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
