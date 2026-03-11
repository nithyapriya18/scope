/**
 * Opportunities API Routes
 */

import express from 'express';
import multer from 'multer';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getSql } from '../lib/sql';
import { OrchestratorAgent } from '../services/agents/orchestratorAgent';
import { IntakeAgent } from '../services/agents/intakeAgent';
import { approvalService } from '../services/approvalService';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/rfp-uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

/**
 * POST /api/opportunities
 * Create a new opportunity from RFP upload
 */
router.post('/', async (req, res) => {
  try {
    const { userId, emailBody, emailSubject, clientName, rfpTitle } = req.body;

    if (!userId || !emailBody) {
      return res.status(400).json({ error: 'userId and emailBody are required' });
    }

    const sql = getSql();

    // Create opportunity
    const result = await sql`
      INSERT INTO opportunities (
        user_id,
        email_subject,
        email_body,
        client_name,
        rfp_title,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${userId},
        ${emailSubject || null},
        ${emailBody},
        ${clientName || null},
        ${rfpTitle || 'Untitled RFP'},
        'intake',
        now(),
        now()
      )
      RETURNING id, status, created_at as "createdAt"
    `;

    const opportunity = result[0];

    // Execute intake agent
    const intakeAgent = new IntakeAgent();
    const intakeResult = await intakeAgent.execute({
      opportunityId: opportunity.id,
      userId,
      data: {
        rfpText: emailBody,
        fileName: rfpTitle || emailSubject || 'RFP Document',
      },
    });

    res.json({
      opportunity,
      intakeResult,
    });
  } catch (error: any) {
    console.error('Error creating opportunity:', error);
    res.status(500).json({ error: 'Failed to create opportunity', message: error.message });
  }
});

/**
 * POST /api/opportunities/extract-metadata
 * Extract title and client name from PDF without creating opportunity
 */
router.post('/extract-metadata', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'file is required' });
    }

    // Extract text from PDF using pdftotext
    let pdfText = '';
    try {
      const outputPath = `${file.path}.txt`;
      execSync(`pdftotext "${file.path}" "${outputPath}"`);
      pdfText = fs.readFileSync(outputPath, 'utf-8');

      // Clean up temp files
      fs.unlinkSync(outputPath);
      fs.unlinkSync(file.path);
    } catch (pdfError) {
      console.error('PDF extraction error:', pdfError);
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Failed to extract text from PDF' });
    }

    if (!pdfText.trim()) {
      return res.status(400).json({ error: 'No text content found in PDF' });
    }

    // Use AI to extract title and client name
    const { getAIService } = await import('../services/aiServiceFactory');
    const aiService = getAIService();

    const systemPrompt = `You are an RFP Intake Specialist for pharmaceutical primary market research.

Your task is to analyze the provided RFP document and extract initial metadata:

1. **Client Information**:
   - Client name/company

2. **RFP Metadata**:
   - RFP title/project name (create a concise, descriptive title if not explicitly stated)
   - Deadline for submission (in YYYY-MM-DD format)
   - Therapeutic area (e.g., Oncology, Cardiology, Diabetes, Neurology, Immunology)

Extract as much information as possible from the document. If information is missing, set it to null.
Provide your response in structured JSON format.`;

    const userMessage = `Please analyze this RFP document and extract the metadata:

RFP Document content:
${pdfText}

Respond with a JSON object containing:
- rfpTitle (string)
- clientName (string or null)
- therapeuticArea (string or null)
- rfpDeadline (string in YYYY-MM-DD format or null)`;

    const aiResponse = await aiService.invoke(systemPrompt, userMessage);
    const response = aiResponse.response;

    // Parse the JSON response
    let extracted;
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', response);
      // Fallback: use filename as title
      extracted = {
        rfpTitle: file.originalname.replace('.pdf', ''),
        clientName: null,
        therapeuticArea: null,
        rfpDeadline: null
      };
    }

    res.json({
      rfpTitle: extracted.rfpTitle || file.originalname.replace('.pdf', ''),
      clientName: extracted.clientName || null,
      therapeuticArea: extracted.therapeuticArea || null,
      rfpDeadline: extracted.rfpDeadline || null,
      textPreview: pdfText.slice(0, 500)
    });
  } catch (error: any) {
    console.error('Error extracting metadata:', error);
    res.status(500).json({ error: 'Failed to extract metadata', message: error.message });
  }
});

/**
 * POST /api/opportunities/upload
 * Create opportunity from PDF file upload
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { userId, rfpTitle, clientName, emailSubject, therapeuticArea, rfpDeadline } = req.body;
    const file = req.file;

    if (!userId || !file) {
      return res.status(400).json({ error: 'userId and file are required' });
    }

    // Extract text from PDF using pdftotext
    let pdfText = '';
    try {
      const outputPath = `${file.path}.txt`;
      execSync(`pdftotext "${file.path}" "${outputPath}"`);
      pdfText = fs.readFileSync(outputPath, 'utf-8');

      // Clean up temp files
      fs.unlinkSync(outputPath);
      fs.unlinkSync(file.path);
    } catch (pdfError) {
      console.error('PDF extraction error:', pdfError);
      // Clean up
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Failed to extract text from PDF' });
    }

    if (!pdfText.trim()) {
      return res.status(400).json({ error: 'No text content found in PDF' });
    }

    const sql = getSql();

    // Create opportunity
    const result = await sql`
      INSERT INTO opportunities (
        user_id,
        email_subject,
        email_body,
        client_name,
        rfp_title,
        therapeutic_area,
        rfp_deadline,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${userId},
        ${emailSubject || file.originalname},
        ${pdfText},
        ${clientName || null},
        ${rfpTitle || file.originalname},
        ${therapeuticArea || null},
        ${rfpDeadline || null},
        'intake',
        now(),
        now()
      )
      RETURNING id, status, created_at as "createdAt"
    `;

    const opportunity = result[0];

    // Run Intake Agent
    const intakeAgent = new IntakeAgent();
    const intakeResult = await intakeAgent.execute({
      opportunityId: opportunity.id,
      userId,
      data: {
        rfpText: pdfText,
        fileName: rfpTitle || file.originalname,
      },
    });

    res.json({
      opportunity,
      intakeResult,
    });
  } catch (error: any) {
    console.error('Error uploading RFP:', error);
    res.status(500).json({ error: 'Failed to upload RFP', message: error.message });
  }
});

/**
 * POST /api/opportunities/:id/re-upload
 * Re-upload RFP file for existing opportunity
 */
router.post('/:id/re-upload', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const file = req.file;

    if (!userId || !file) {
      return res.status(400).json({ error: 'userId and file are required' });
    }

    const sql = getSql();

    // Verify opportunity exists
    const existing = await sql`
      SELECT id FROM opportunities WHERE id = ${id}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    // Extract text from PDF using pdftotext
    let pdfText = '';
    try {
      const outputPath = `${file.path}.txt`;
      execSync(`pdftotext "${file.path}" "${outputPath}"`);
      pdfText = fs.readFileSync(outputPath, 'utf-8');

      // Clean up temp files
      fs.unlinkSync(outputPath);
      fs.unlinkSync(file.path);
    } catch (pdfError) {
      console.error('PDF extraction error:', pdfError);
      // Clean up
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Failed to extract text from PDF' });
    }

    if (!pdfText.trim()) {
      return res.status(400).json({ error: 'No text content found in PDF' });
    }

    // Update opportunity with new RFP text and reset status to intake
    await sql`
      UPDATE opportunities
      SET
        email_body = ${pdfText},
        email_subject = ${file.originalname},
        status = 'intake',
        updated_at = now()
      WHERE id = ${id}
    `;

    // Re-run Intake Agent
    const intakeAgent = new IntakeAgent();
    const intakeResult = await intakeAgent.execute({
      opportunityId: id,
      userId,
      data: {
        rfpText: pdfText,
        fileName: file.originalname,
      },
    });

    // Fetch updated opportunity
    const updated = await sql`
      SELECT
        id,
        user_id as "userId",
        email_subject as "emailSubject",
        email_from as "emailFrom",
        email_body as "emailBody",
        client_name as "clientName",
        client_email as "clientEmail",
        rfp_title as "rfpTitle",
        rfp_deadline as "rfpDeadline",
        therapeutic_area as "therapeuticArea",
        geography,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM opportunities
      WHERE id = ${id}
    `;

    res.json({
      opportunity: updated[0],
      intakeResult,
    });
  } catch (error: any) {
    console.error('Error re-uploading RFP:', error);
    res.status(500).json({ error: 'Failed to re-upload RFP', message: error.message });
  }
});

/**
 * GET /api/opportunities
 * List all opportunities
 */
router.get('/', async (req, res) => {
  try {
    const { userId, status } = req.query;

    const sql = getSql();

    const query = userId
      ? status
        ? sql`
            SELECT
              id,
              user_id as "userId",
              client_name as "clientName",
              rfp_title as "rfpTitle",
              rfp_deadline as "rfpDeadline",
              therapeutic_area as "therapeuticArea",
              domain,
              geography,
              status,
              created_at as "createdAt",
              updated_at as "updatedAt"
            FROM opportunities
            WHERE user_id = ${userId as string}
              AND status = ${status as string}
            ORDER BY created_at DESC
          `
        : sql`
            SELECT
              id,
              user_id as "userId",
              client_name as "clientName",
              rfp_title as "rfpTitle",
              rfp_deadline as "rfpDeadline",
              therapeutic_area as "therapeuticArea",
              domain,
              geography,
              status,
              created_at as "createdAt",
              updated_at as "updatedAt"
            FROM opportunities
            WHERE user_id = ${userId as string}
            ORDER BY created_at DESC
          `
      : sql`
          SELECT
            id,
            user_id as "userId",
            client_name as "clientName",
            rfp_title as "rfpTitle",
            rfp_deadline as "rfpDeadline",
            therapeutic_area as "therapeuticArea",
            domain,
            geography,
            status,
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM opportunities
          ORDER BY created_at DESC
        `;

    const opportunities = await query;

    res.json({ opportunities, count: opportunities.length });
  } catch (error: any) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities', message: error.message });
  }
});

/**
 * GET /api/opportunities/:id
 * Get opportunity details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sql = getSql();

    const opps = await sql`
      SELECT
        id,
        user_id as "userId",
        email_subject as "emailSubject",
        email_from as "emailFrom",
        email_body as "emailBody",
        client_name as "clientName",
        client_email as "clientEmail",
        rfp_title as "rfpTitle",
        rfp_deadline as "rfpDeadline",
        therapeutic_area as "therapeuticArea",
        geography,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM opportunities
      WHERE id = ${id}
    `;

    if (opps.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const opportunity = opps[0];

    // Fetch related workflow data
    const briefs = await sql`SELECT * FROM briefs WHERE opportunity_id = ${id} ORDER BY created_at DESC LIMIT 1`;
    const gapAnalyses = await sql`SELECT * FROM gap_analyses WHERE opportunity_id = ${id} ORDER BY created_at DESC LIMIT 1`;
    const clarifications = await sql`SELECT * FROM clarifications WHERE opportunity_id = ${id} ORDER BY created_at DESC LIMIT 1`;
    const scopes = await sql`SELECT * FROM scopes WHERE opportunity_id = ${id} ORDER BY created_at DESC LIMIT 1`;

    // Attach workflow data to opportunity
    const response = {
      ...opportunity,
      brief: briefs.length > 0 ? briefs[0] : null,
      gapAnalysis: gapAnalyses.length > 0 ? gapAnalyses[0] : null,
      clarification: clarifications.length > 0 ? clarifications[0] : null,
      scope: scopes.length > 0 ? scopes[0] : null,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching opportunity:', error);
    res.status(500).json({ error: 'Failed to fetch opportunity', message: error.message });
  }
});

/**
 * POST /api/opportunities/:id/process
 * Process the next workflow step
 */
router.post('/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const sql = getSql();

    // Get current status
    const opps = await sql`
      SELECT status FROM opportunities WHERE id = ${id}
    `;

    if (opps.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const currentStatus = opps[0].status;

    // Execute next step via orchestrator
    const orchestrator = new OrchestratorAgent();
    const result = await orchestrator.executeNextStep(id, userId, currentStatus);

    res.json(result);
  } catch (error: any) {
    console.error('Error processing opportunity:', error);
    res.status(500).json({ error: 'Failed to process opportunity', message: error.message });
  }
});

/**
 * POST /api/opportunities/:id/back
 * Go back to the previous workflow step
 */
router.post('/:id/back', async (req, res) => {
  try {
    const { id } = req.params;

    const sql = getSql();

    // Get current status
    const opps = await sql`
      SELECT status FROM opportunities WHERE id = ${id}
    `;

    if (opps.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const currentStatus = opps[0].status;

    // Define workflow order
    const workflowOrder = ['intake', 'brief_extract', 'gap_analysis', 'clarification', 'scope_plan', 'proposal'];
    const currentIndex = workflowOrder.indexOf(currentStatus);

    if (currentIndex <= 0) {
      return res.status(400).json({ error: 'Already at the first step' });
    }

    const previousStatus = workflowOrder[currentIndex - 1];

    // Update status to previous step
    await sql`
      UPDATE opportunities
      SET status = ${previousStatus}, updated_at = now()
      WHERE id = ${id}
    `;

    res.json({
      message: 'Moved to previous step',
      previousStatus,
      currentStatus
    });
  } catch (error: any) {
    console.error('Error going back:', error);
    res.status(500).json({ error: 'Failed to go back', message: error.message });
  }
});

/**
 * POST /api/opportunities/:id/approve-clarifications
 * Approve clarification questions
 */
router.post('/:id/approve-clarifications', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, clarificationId, notes } = req.body;

    if (!userId || !clarificationId) {
      return res.status(400).json({ error: 'userId and clarificationId are required' });
    }

    // Get clarification data for approval
    const sql = getSql();
    const clarifications = await sql`
      SELECT questions FROM clarifications WHERE id = ${clarificationId}
    `;

    if (clarifications.length === 0) {
      return res.status(404).json({ error: 'Clarification not found' });
    }

    // Request approval
    const approval = await approvalService.requestApproval(
      id,
      'clarification_questions',
      clarificationId,
      'clarification',
      clarifications[0].questions,
      userId
    );

    // Auto-approve (for now - in production, this would wait for user action)
    const approvedApproval = await approvalService.approve(approval.id, userId, notes);

    res.json({
      message: 'Clarifications approved',
      approval: approvedApproval,
    });
  } catch (error: any) {
    console.error('Error approving clarifications:', error);
    res.status(500).json({ error: 'Failed to approve clarifications', message: error.message });
  }
});

/**
 * GET /api/opportunities/:id/scope
 * Get scope plan details for an opportunity
 */
router.get('/:id/scope', async (req, res) => {
  try {
    const { id } = req.params;

    const sql = getSql();

    // Fetch latest scope for this opportunity
    const scopes = await sql`
      SELECT
        s.*,
        st.display_name as study_type_display_name,
        sf.display_name as study_family_display_name
      FROM scopes s
      LEFT JOIN study_types st ON st.type_code = s.detected_study_type
      LEFT JOIN study_families sf ON sf.family_code = st.family_code
      WHERE s.opportunity_id = ${id}
      ORDER BY s.created_at DESC
      LIMIT 1
    `;

    if (scopes.length === 0) {
      return res.status(404).json({ error: 'Scope not found for this opportunity' });
    }

    const scope = scopes[0];

    res.json({
      scope: {
        id: scope.id,
        opportunityId: scope.opportunity_id,
        detectedStudyType: {
          typeCode: scope.detected_study_type,
          displayName: scope.study_type_display_name,
          familyName: scope.study_family_display_name,
          confidence: parseFloat(scope.study_type_confidence),
        },
        sampleSizeOptions: scope.sample_size_options,
        hcpShortlist: scope.hcp_shortlist,
        scopeAssumptions: scope.scope_assumptions,
        estimatedTotalCost: scope.estimated_total_cost,
        status: scope.status,
        selectedOption: scope.selected_option,
        createdAt: scope.created_at,
        updatedAt: scope.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error fetching scope:', error);
    res.status(500).json({ error: 'Failed to fetch scope', message: error.message });
  }
});

/**
 * POST /api/opportunities/:id/scope/approve
 * Approve scope plan and select a sample size option
 */
router.post('/:id/scope/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, selectedOption } = req.body;

    if (!userId || !selectedOption) {
      return res.status(400).json({ error: 'userId and selectedOption are required' });
    }

    if (!['conservative', 'recommended', 'aggressive'].includes(selectedOption)) {
      return res.status(400).json({ error: 'selectedOption must be conservative, recommended, or aggressive' });
    }

    const sql = getSql();

    // Fetch latest scope
    const scopes = await sql`
      SELECT id FROM scopes
      WHERE opportunity_id = ${id}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (scopes.length === 0) {
      return res.status(404).json({ error: 'Scope not found for this opportunity' });
    }

    const scopeId = scopes[0].id;

    // Update scope status and selected option
    await sql`
      UPDATE scopes
      SET
        status = 'approved',
        selected_option = ${selectedOption},
        updated_at = now()
      WHERE id = ${scopeId}
    `;

    // Update opportunity status to proceed to Proposal Generation
    await sql`
      UPDATE opportunities
      SET status = 'proposal', updated_at = now()
      WHERE id = ${id}
    `;

    // Create approval record
    await sql`
      INSERT INTO approvals (
        opportunity_id,
        approval_type,
        status,
        approved_by_user_id,
        created_at
      ) VALUES (
        ${id},
        'scope',
        'approved',
        ${userId},
        now()
      )
    `;

    res.json({
      message: 'Scope approved successfully',
      scopeId,
      selectedOption,
      nextStatus: 'proposal',
    });
  } catch (error: any) {
    console.error('Error approving scope:', error);
    res.status(500).json({ error: 'Failed to approve scope', message: error.message });
  }
});

/**
 * DELETE /api/opportunities/:id
 * Delete an opportunity and all related data
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sql = getSql();

    // Check if opportunity exists
    const opps = await sql`
      SELECT id FROM opportunities WHERE id = ${id}
    `;

    if (opps.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    // Delete opportunity (CASCADE will handle related records)
    await sql`
      DELETE FROM opportunities WHERE id = ${id}
    `;

    res.json({
      message: 'Opportunity deleted successfully',
      id,
    });
  } catch (error: any) {
    console.error('Error deleting opportunity:', error);
    res.status(500).json({ error: 'Failed to delete opportunity', message: error.message });
  }
});

export default router;
