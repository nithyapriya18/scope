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

    // Respond immediately — don't block on AI processing
    res.json({ opportunity });

    // Run Intake Agent in background
    const intakeAgent = new IntakeAgent();
    intakeAgent.execute({
      opportunityId: opportunity.id,
      userId,
      data: {
        rfpText: emailBody,
        fileName: rfpTitle || emailSubject || 'RFP Document',
      },
    }).catch((err) => console.error('❌ Intake agent error:', err));
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

    // Extract text from file based on type
    let extractedText = '';
    const ext = path.extname(file.originalname).toLowerCase();

    try {
      if (ext === '.pdf') {
        // Use pdftotext (from poppler-utils)
        const outputPath = `${file.path}.txt`;
        try {
          execSync(`pdftotext "${file.path}" "${outputPath}"`, { timeout: 60000 });
          extractedText = fs.readFileSync(outputPath, 'utf-8');
          fs.unlinkSync(outputPath);
        } catch (pdfErr) {
          console.error('PDF extraction error:', pdfErr);
          throw new Error('Failed to extract text from PDF');
        }
      } else if (ext === '.docx' || ext === '.doc') {
        // Use pandoc to convert Word to text
        try {
          extractedText = execSync(`pandoc "${file.path}" -f docx -t plain`, {
            encoding: 'utf8',
            timeout: 60000,
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large documents
          });
        } catch (pandocErr: any) {
          console.error('Pandoc extraction error:', pandocErr.message);
          throw new Error(`Failed to extract text from Word document: ${pandocErr.message}`);
        }
      } else {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Unsupported file type. Please upload PDF, DOC, or DOCX files.' });
      }

      // Clean up temp file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (extractError: any) {
      console.error('File extraction error:', extractError.message);
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ error: extractError.message || 'Failed to extract text from file' });
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ error: 'No text content found in file' });
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
${extractedText}

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
        rfpTitle: file.originalname.replace(/\.(pdf|docx?|doc)$/i, ''),
        clientName: null,
        therapeuticArea: null,
        rfpDeadline: null
      };
    }

    res.json({
      rfpTitle: extracted.rfpTitle || file.originalname.replace(/\.(pdf|docx?|doc)$/i, ''),
      clientName: extracted.clientName || null,
      therapeuticArea: extracted.therapeuticArea || null,
      rfpDeadline: extracted.rfpDeadline || null,
      textPreview: extractedText.slice(0, 500)
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

    // Extract text from file based on type
    let extractedText = '';
    const ext = path.extname(file.originalname).toLowerCase();

    try {
      if (ext === '.pdf') {
        // Use pdftotext (from poppler-utils)
        const outputPath = `${file.path}.txt`;
        try {
          execSync(`pdftotext "${file.path}" "${outputPath}"`, { timeout: 60000 });
          extractedText = fs.readFileSync(outputPath, 'utf-8');
          fs.unlinkSync(outputPath);
        } catch (pdfErr) {
          console.error('PDF extraction error:', pdfErr);
          throw new Error('Failed to extract text from PDF');
        }
      } else if (ext === '.docx' || ext === '.doc') {
        // Use pandoc to convert Word to text
        try {
          extractedText = execSync(`pandoc "${file.path}" -f docx -t plain`, {
            encoding: 'utf8',
            timeout: 60000,
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large documents
          });
        } catch (pandocErr: any) {
          console.error('Pandoc extraction error:', pandocErr.message);
          throw new Error(`Failed to extract text from Word document: ${pandocErr.message}`);
        }
      } else {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Unsupported file type. Please upload PDF, DOC, or DOCX files.' });
      }

      // Clean up temp file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (extractError: any) {
      console.error('File extraction error:', extractError.message);
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ error: extractError.message || 'Failed to extract text from file' });
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ error: 'No text content found in file' });
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
        ${extractedText},
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

    // Respond immediately — don't block on AI processing
    res.json({ opportunity });

    // Run Intake Agent in background
    const intakeAgent = new IntakeAgent();
    intakeAgent.execute({
      opportunityId: opportunity.id,
      userId,
      data: {
        rfpText: extractedText,
        fileName: rfpTitle || file.originalname,
      },
    }).catch((err) => console.error('❌ Intake agent error:', err));
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

    // Extract text from file based on type
    let extractedText = '';
    const ext = path.extname(file.originalname).toLowerCase();

    try {
      if (ext === '.pdf') {
        // Use pdftotext (from poppler-utils)
        const outputPath = `${file.path}.txt`;
        execSync(`pdftotext "${file.path}" "${outputPath}"`, { timeout: 60000 });
        extractedText = fs.readFileSync(outputPath, 'utf-8');
        fs.unlinkSync(outputPath);
      } else if (ext === '.docx' || ext === '.doc') {
        // Use pandoc to convert Word to text
        extractedText = execSync(`pandoc "${file.path}" -f docx -t plain`, { encoding: 'utf8', timeout: 60000 });
      } else {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Unsupported file type. Please upload PDF, DOC, or DOCX files.' });
      }

      // Clean up temp file
      fs.unlinkSync(file.path);
    } catch (extractError) {
      console.error('File extraction error:', extractError);
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Failed to extract text from file' });
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ error: 'No text content found in file' });
    }

    // Update opportunity with new RFP text and reset status to intake
    await sql`
      UPDATE opportunities
      SET
        email_body = ${extractedText},
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
        rfpText: extractedText,
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
              o.id,
              o.user_id as "userId",
              o.client_name as "clientName",
              o.rfp_title as "rfpTitle",
              o.rfp_deadline as "rfpDeadline",
              o.therapeutic_area as "therapeuticArea",
              o.domain,
              o.geography,
              o.status,
              o.created_at as "createdAt",
              o.updated_at as "updatedAt",
              b.study_type as "studyType"
            FROM opportunities o
            LEFT JOIN LATERAL (
              SELECT study_type FROM briefs
              WHERE opportunity_id = o.id
              ORDER BY created_at DESC LIMIT 1
            ) b ON true
            WHERE o.user_id = ${userId as string}
              AND o.status = ${status as string}
            ORDER BY o.created_at DESC
          `
        : sql`
            SELECT
              o.id,
              o.user_id as "userId",
              o.client_name as "clientName",
              o.rfp_title as "rfpTitle",
              o.rfp_deadline as "rfpDeadline",
              o.therapeutic_area as "therapeuticArea",
              o.domain,
              o.geography,
              o.status,
              o.created_at as "createdAt",
              o.updated_at as "updatedAt",
              b.study_type as "studyType"
            FROM opportunities o
            LEFT JOIN LATERAL (
              SELECT study_type FROM briefs
              WHERE opportunity_id = o.id
              ORDER BY created_at DESC LIMIT 1
            ) b ON true
            WHERE o.user_id = ${userId as string}
            ORDER BY o.created_at DESC
          `
      : sql`
          SELECT
            o.id,
            o.user_id as "userId",
            o.client_name as "clientName",
            o.rfp_title as "rfpTitle",
            o.rfp_deadline as "rfpDeadline",
            o.therapeutic_area as "therapeuticArea",
            o.domain,
            o.geography,
            o.status,
            o.created_at as "createdAt",
            o.updated_at as "updatedAt",
            b.study_type as "studyType"
          FROM opportunities o
          LEFT JOIN LATERAL (
            SELECT study_type FROM briefs
            WHERE opportunity_id = o.id
            ORDER BY created_at DESC LIMIT 1
          ) b ON true
          ORDER BY o.created_at DESC
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

    // Gap analyses link to briefs, not directly to opportunities
    let gapAnalyses = [];
    if (briefs.length > 0) {
      gapAnalyses = await sql`SELECT * FROM gap_analyses WHERE brief_id = ${briefs[0].id} ORDER BY created_at DESC LIMIT 1`;
    }

    const clarifications = await sql`SELECT * FROM clarifications WHERE opportunity_id = ${id} ORDER BY created_at DESC LIMIT 1`;
    const scopes = await sql`SELECT * FROM scopes WHERE opportunity_id = ${id} ORDER BY created_at DESC LIMIT 1`;
    const feasibilityRows = await sql`SELECT * FROM feasibility_assessments WHERE opportunity_id = ${id} ORDER BY created_at DESC LIMIT 1`;

    // Fetch current job progress (include recently completed jobs for 60 seconds)
    const currentJobs = await sql`
      SELECT id, job_type, status, progress, progress_message, created_at, updated_at
      FROM jobs
      WHERE opportunity_id = ${id}
      AND (
        status IN ('pending', 'processing')
        OR (status = 'completed' AND updated_at > now() - interval '60 seconds')
      )
      ORDER BY created_at DESC
      LIMIT 1
    `;

    // Fetch all completed jobs for this opportunity (for step duration display)
    const allJobsResult = await sql`
      SELECT
        job_type as "jobType",
        status,
        duration_ms as "durationMs",
        completed_at as "completedAt"
      FROM jobs
      WHERE opportunity_id = ${id}
        AND status = 'completed'
        AND duration_ms IS NOT NULL
      ORDER BY completed_at ASC
    `;

    // Parse JSON strings in brief and gap analysis
    let parsedBrief = null;
    if (briefs.length > 0) {
      parsedBrief = { ...briefs[0] };
      if (parsedBrief.raw_extraction && typeof parsedBrief.raw_extraction === 'string') {
        try {
          parsedBrief.raw_extraction = JSON.parse(parsedBrief.raw_extraction);
        } catch (e) {
          console.error('Failed to parse brief raw_extraction:', e);
        }
      }
    }

    let parsedGapAnalysis = null;
    if (gapAnalyses.length > 0) {
      parsedGapAnalysis = { ...gapAnalyses[0] };

      // Parse llm_analysis field first (has the complete data)
      let llmData = null;
      if (parsedGapAnalysis.llm_analysis) {
        if (typeof parsedGapAnalysis.llm_analysis === 'string') {
          try {
            llmData = JSON.parse(parsedGapAnalysis.llm_analysis);
          } catch (e) {
            console.error('Failed to parse llm_analysis:', e);
          }
        } else {
          llmData = parsedGapAnalysis.llm_analysis;
        }
      }

      // Check if the separate columns have valid data or corrupted "[object Object]" strings
      const isCorrupted = (data: any) => {
        if (Array.isArray(data)) {
          return data.length > 0 && data[0] === '[object Object]';
        }
        if (typeof data === 'string') {
          return data.includes('[object Object]');
        }
        return false;
      };

      // Parse missing_fields - use llm_analysis if corrupted
      if (isCorrupted(parsedGapAnalysis.missing_fields) && llmData?.missingFields) {
        parsedGapAnalysis.missing_fields = llmData.missingFields;
      } else if (parsedGapAnalysis.missing_fields && typeof parsedGapAnalysis.missing_fields === 'string') {
        try {
          parsedGapAnalysis.missing_fields = JSON.parse(parsedGapAnalysis.missing_fields);
        } catch (e) {
          console.error('Failed to parse gap analysis missing_fields:', e);
          parsedGapAnalysis.missing_fields = llmData?.missingFields || [];
        }
      }

      // Parse ambiguous_requirements - use llm_analysis if corrupted
      if (isCorrupted(parsedGapAnalysis.ambiguous_requirements) && llmData?.ambiguousRequirements) {
        parsedGapAnalysis.ambiguous_requirements = llmData.ambiguousRequirements;
      } else if (parsedGapAnalysis.ambiguous_requirements && typeof parsedGapAnalysis.ambiguous_requirements === 'string') {
        try {
          parsedGapAnalysis.ambiguous_requirements = JSON.parse(parsedGapAnalysis.ambiguous_requirements);
        } catch (e) {
          console.error('Failed to parse gap analysis ambiguous_requirements:', e);
          parsedGapAnalysis.ambiguous_requirements = llmData?.ambiguousRequirements || [];
        }
      }

      // Parse conflicting_info - use llm_analysis if corrupted
      if (isCorrupted(parsedGapAnalysis.conflicting_info) && llmData?.conflictingInfo) {
        parsedGapAnalysis.conflicting_info = llmData.conflictingInfo;
      } else if (parsedGapAnalysis.conflicting_info && typeof parsedGapAnalysis.conflicting_info === 'string') {
        try {
          parsedGapAnalysis.conflicting_info = JSON.parse(parsedGapAnalysis.conflicting_info);
        } catch (e) {
          console.error('Failed to parse gap analysis conflicting_info:', e);
          parsedGapAnalysis.conflicting_info = llmData?.conflictingInfo || [];
        }
      }

      // Parse assumptions_made - always use llm_analysis as it's not stored in separate column
      if (llmData?.assumptionsMade || llmData?.assumptions_made) {
        parsedGapAnalysis.assumptions_made = llmData.assumptionsMade || llmData.assumptions_made || [];
      } else {
        parsedGapAnalysis.assumptions_made = [];
      }

      // Extract completeness metrics from llm_analysis field
      if (llmData && typeof llmData === 'object') {
        parsedGapAnalysis.overall_completeness = llmData.overall_completeness || llmData.overallCompleteness || 0;
        parsedGapAnalysis.critical_gaps_count = llmData.critical_gaps_count || llmData.criticalGapsCount || 0;
        parsedGapAnalysis.high_priority_gaps_count = llmData.high_priority_gaps_count || llmData.highPriorityGapsCount || 0;
      }
    }

    // Parse clarification client_responses if present
    let parsedClarification = null;
    if (clarifications.length > 0) {
      parsedClarification = { ...clarifications[0] };

      // Parse client_responses JSONB field
      if (parsedClarification.client_responses && typeof parsedClarification.client_responses === 'string') {
        try {
          parsedClarification.client_responses = JSON.parse(parsedClarification.client_responses);
        } catch (e) {
          console.error('Failed to parse client_responses:', e);
        }
      }

      // Parse questions JSONB field
      if (parsedClarification.questions && typeof parsedClarification.questions === 'string') {
        try {
          parsedClarification.questions = JSON.parse(parsedClarification.questions);
        } catch (e) {
          console.error('Failed to parse questions:', e);
        }
      }
    }

    // Parse feasibility assessment
    let parsedFeasibility = null;
    if (feasibilityRows.length > 0) {
      const f = feasibilityRows[0];
      parsedFeasibility = {
        overallFeasibility: f.overall_feasibility,
        geographicFeasibility: f.geographic_feasibility,
        vendorAssessment: f.vendor_assessment,
        hcpAvailability: f.hcp_availability,
        riskFactors: f.risk_factors,
        recommendations: f.recommendations,
      };
    }

    // Attach workflow data to opportunity
    const response = {
      ...opportunity,
      brief: parsedBrief,
      gapAnalysis: parsedGapAnalysis,
      clarification: parsedClarification,
      feasibility: parsedFeasibility,
      scope: scopes.length > 0 ? scopes[0] : null,
      currentJob: currentJobs.length > 0 ? currentJobs[0] : null,
      allJobs: allJobsResult,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching opportunity:', error);
    res.status(500).json({ error: 'Failed to fetch opportunity', message: error.message });
  }
});

/**
 * PATCH /api/opportunities/:id
 * Update opportunity basic information (title, client, therapeutic area, deadline)
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rfpTitle, clientName, therapeuticArea, rfpDeadline } = req.body;
    const sql = getSql();

    // Validate opportunity exists
    const opportunities = await sql`
      SELECT id FROM opportunities WHERE id = ${id}
    `;

    if (opportunities.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const params: any[] = [];

    if (rfpTitle !== undefined) {
      updates.push(`rfp_title = $${params.length + 1}`);
      params.push(rfpTitle);
    }

    if (clientName !== undefined) {
      updates.push(`client_name = $${params.length + 1}`);
      params.push(clientName);
    }

    if (therapeuticArea !== undefined) {
      updates.push(`therapeutic_area = $${params.length + 1}`);
      params.push(therapeuticArea);
    }

    if (rfpDeadline !== undefined) {
      updates.push(`rfp_deadline = $${params.length + 1}`);
      params.push(rfpDeadline ? new Date(rfpDeadline) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No fields to update',
        message: 'Please provide at least one field to update',
      });
    }

    // Add updated_at to all updates
    updates.push('updated_at = now()');

    // Execute update
    const query = `
      UPDATE opportunities
      SET ${updates.join(', ')}
      WHERE id = $${params.length + 1}
      RETURNING id, rfp_title as "rfpTitle", client_name as "clientName",
                therapeutic_area as "therapeuticArea", rfp_deadline as "rfpDeadline",
                updated_at as "updatedAt"
    `;

    const result = await sql.unsafe(query, [...params, id]);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    res.json({
      message: 'Opportunity updated successfully',
      opportunity: result[0],
    });
  } catch (error: any) {
    console.error('Error updating opportunity:', error);
    res.status(500).json({
      error: 'Failed to update opportunity',
      message: error.message,
    });
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

    // Respond immediately — agent runs in background, frontend polls for status
    res.json({ success: true, status: currentStatus, message: 'Processing started' });

    // Run orchestrator in background
    const orchestrator = new OrchestratorAgent();
    orchestrator.executeNextStep(id, userId, currentStatus)
      .catch((err) => console.error(`Error in orchestrator for ${id}:`, err));
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

/**
 * POST /api/opportunities/:id/documents/brief
 * Save brief as a document file
 */
router.post('/:id/documents/brief', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, filename } = req.body;

    if (!content || !filename) {
      return res.status(400).json({ error: 'content and filename are required' });
    }

    const sql = getSql();

    // Check if opportunity exists
    const opps = await sql`
      SELECT id FROM opportunities WHERE id = ${id}
    `;

    if (opps.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = process.env.FILE_STORAGE_PATH || './uploads';
    const briefsDir = path.join(uploadsDir, 'briefs');

    if (!fs.existsSync(briefsDir)) {
      fs.mkdirSync(briefsDir, { recursive: true });
    }

    // Save file to filesystem
    const safeFilename = filename.replace(/[^a-z0-9._-]/gi, '_');
    const filePath = path.join(briefsDir, `${id}_${safeFilename}`);
    fs.writeFileSync(filePath, content, 'utf8');

    const fileSize = Buffer.byteLength(content, 'utf8');

    // Save document record to database
    // Note: Using 'clarification' as document_type since 'brief' is not in the constraint
    // TODO: Add 'brief' to document_type check constraint
    const doc = await sql`
      INSERT INTO documents (
        opportunity_id,
        document_type,
        filename,
        file_path,
        file_size,
        format,
        status
      ) VALUES (
        ${id},
        'clarification',
        ${safeFilename},
        ${filePath},
        ${fileSize},
        'txt',
        'draft'
      )
      RETURNING id, filename, file_path, file_size, created_at
    `;

    res.json({
      message: 'Brief saved successfully',
      document: doc[0],
    });
  } catch (error: any) {
    console.error('Error saving brief:', error);
    res.status(500).json({ error: 'Failed to save brief', message: error.message });
  }
});

/**
 * POST /api/opportunities/:id/send-clarification-email
 * Mark clarification email as sent (sets sent_at timestamp + status=sent)
 * Actual email delivery uses nodemailer if SMTP env vars are configured,
 * otherwise writes to a local file as fallback.
 */
router.post('/:id/send-clarification-email', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = getSql();

    const opps = await sql`
      SELECT id, rfp_title as "rfpTitle", client_name as "clientName"
      FROM opportunities WHERE id = ${id}
    `;
    if (opps.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const clarifications = await sql`
      SELECT id, questions, sent_at
      FROM clarifications
      WHERE opportunity_id = ${id}
      ORDER BY created_at DESC LIMIT 1
    `;
    if (clarifications.length === 0) {
      return res.status(404).json({ error: 'No clarification found for this opportunity' });
    }

    const clarification = clarifications[0];
    if (clarification.sent_at) {
      return res.json({ success: true, message: 'Email already sent', sentAt: clarification.sent_at });
    }

    // Build email body from questions
    const questions: any[] = Array.isArray(clarification.questions)
      ? clarification.questions
      : (typeof clarification.questions === 'string' ? JSON.parse(clarification.questions) : []);

    const toEmail = process.env.CLARIFICATION_EMAIL_TO || 'nithya@petasight.com';
    const subject = `Clarification Request: ${opps[0].rfpTitle || 'RFP'}`;
    const questionsText = questions
      .map((q: any, i: number) => `${i + 1}. ${typeof q === 'string' ? q : q.question || JSON.stringify(q)}`)
      .join('\n');
    const emailBody = `Dear ${opps[0].clientName || 'Client'},\n\nThank you for your RFP submission. To proceed with our proposal, we require clarification on the following points:\n\n${questionsText}\n\nPlease respond at your earliest convenience.\n\nKind regards,\nPetaSight Team`;

    // Attempt SMTP send if configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: toEmail, subject, text: emailBody });
      console.log(`📧 Clarification email sent to ${toEmail}`);
    } else {
      // Fallback: write email to local file
      const fs = require('fs');
      const path = require('path');
      const outDir = path.join(__dirname, '../../data/emails');
      fs.mkdirSync(outDir, { recursive: true });
      const outFile = path.join(outDir, `clarification-${id}-${Date.now()}.txt`);
      fs.writeFileSync(outFile, `To: ${toEmail}\nSubject: ${subject}\n\n${emailBody}`);
      console.log(`📄 No SMTP configured — clarification email written to ${outFile}`);
    }

    // Mark as sent
    await sql`
      UPDATE clarifications
      SET sent_at = now(), status = 'sent', updated_at = now()
      WHERE opportunity_id = ${id}
    `;

    res.json({ success: true, message: `Email sent to ${toEmail}`, sentAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error sending clarification email:', error);
    res.status(500).json({ error: 'Failed to send clarification email', message: error.message });
  }
});

/**
 * POST /api/opportunities/:id/clarification-response
 * Upload and parse client's response to clarification questions
 */
router.post('/:id/clarification-response', upload.single('responseFile'), async (req, res) => {
  try {
    const { id } = req.params;
    const { responseText, skipResponses } = req.body;
    const sql = getSql();

    // Validate opportunity exists
    const opportunities = await sql`
      SELECT id, rfp_title as "rfpTitle", status
      FROM opportunities
      WHERE id = ${id}
    `;

    if (opportunities.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const opportunity = opportunities[0];

    // If skipping responses, apply assumptions from gap analysis to the brief and proceed
    if (skipResponses === true || skipResponses === 'true') {
      // Mark clarification as skipped — Step 5 agent will apply assumptions to the brief
      await sql`
        UPDATE clarifications
        SET status = 'skipped', updated_at = now()
        WHERE id = (
          SELECT id FROM clarifications
          WHERE opportunity_id = ${id}
          ORDER BY created_at DESC
          LIMIT 1
        )
      `;

      // Advance status — Step 5 (clarification_response) handles the brief update
      await sql`
        UPDATE opportunities SET status = 'clarification_response', updated_at = now()
        WHERE id = ${id}
      `;

      return res.json({ message: 'Skipped. Step 5 will finalise assumptions.', skipped: true });
    }

    // Extract text from uploaded file if provided
    let extractedText = responseText || '';

    if (req.file) {
      const filePath = req.file.path;
      const ext = path.extname(req.file.originalname).toLowerCase();

      try {
        // Extract text based on file type
        if (ext === '.pdf') {
          // Use pdftotext (from poppler-utils)
          const output = execSync(`pdftotext "${filePath}" -`, { encoding: 'utf8' });
          extractedText += '\n\n' + output;
        } else if (ext === '.txt' || ext === '.eml') {
          extractedText += '\n\n' + fs.readFileSync(filePath, 'utf8');
        } else if (ext === '.docx') {
          // Use pandoc to convert docx to text — pass --from explicitly since temp file has no extension
          const output = execSync(`pandoc --from docx "${filePath}" -t plain`, { encoding: 'utf8' });
          extractedText += '\n\n' + output;
        } else if (ext === '.xlsx' || ext === '.xls') {
          // For Excel, we'll store the file and mention it contains data
          extractedText += `\n\n[Excel file uploaded: ${req.file.originalname} - contains structured data]`;
        }
      } catch (extractError) {
        console.error('Error extracting text from file:', extractError);
        return res.status(400).json({
          error: 'Failed to extract text from file',
          message: 'Please ensure the file is valid and not corrupted',
        });
      }

      // Clean up uploaded file
      fs.unlinkSync(filePath);
    }

    if (!extractedText.trim()) {
      return res.status(400).json({
        error: 'No response text provided',
        message: 'Please provide response text or upload a file',
      });
    }

    // Store response text and advance status — AI parsing happens in Step 5 via orchestrator
    const clarificationUpdate = await sql`
      UPDATE clarifications
      SET
        client_response_text = ${extractedText},
        client_response_file = ${req.file?.originalname || null},
        status = 'responded',
        updated_at = now()
      WHERE id = (
        SELECT id FROM clarifications
        WHERE opportunity_id = ${id}
        ORDER BY created_at DESC
        LIMIT 1
      )
      RETURNING id
    `;

    if (clarificationUpdate.length === 0) {
      return res.status(404).json({
        error: 'No clarification record found for this opportunity',
      });
    }

    // Advance opportunity status immediately — Step 5 (clarification_response) will handle AI parsing
    await sql`
      UPDATE opportunities SET status = 'clarification_response', updated_at = now()
      WHERE id = ${id}
    `;

    res.json({
      message: 'Response uploaded successfully. Step 5 will parse and update the brief.',
      opportunityId: id,
    });
  } catch (error: any) {
    console.error('Error handling clarification response:', error);
    res.status(500).json({
      error: 'Failed to process clarification response',
      message: error.message,
    });
  }
});

/**
 * POST /api/opportunities/:id/reset-clarification-decision
 * Reset the upload/skip decision to make buttons active again without redoing step 4
 */
router.post('/:id/reset-clarification-decision', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = getSql();

    // Validate opportunity exists and is past clarification step
    const opportunities = await sql`
      SELECT id, status
      FROM opportunities
      WHERE id = ${id}
    `;

    if (opportunities.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const opportunity = opportunities[0];

    // Clear the uploaded response and reset status back to 'clarification'
    await sql`
      UPDATE clarifications
      SET client_response_text = null, client_response_file = null,
          client_responses = null, status = 'pending_approval', updated_at = now()
      WHERE opportunity_id = ${id}
    `;

    await sql`
      UPDATE opportunities SET status = 'clarification', updated_at = now() WHERE id = ${id}
    `;

    // Delete downstream jobs so steps 5+ go back to WAITING
    await sql`
      DELETE FROM jobs
      WHERE opportunity_id = ${id}
        AND job_type IN ('clarification_response', 'hcp_matching', 'scope_planner', 'wbs_estimate', 'pricing')
    `;

    res.json({
      message: 'Decision reset successfully. Upload/skip buttons are now active.',
      opportunityId: id,
      newStatus: 'clarification',
    });
  } catch (error: any) {
    console.error('Error resetting clarification decision:', error);
    res.status(500).json({
      error: 'Failed to reset decision',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/opportunities/:opportunityId/clarifications/:clarificationId
 * Update clarification questions and gap analysis assumptions (for manual edits)
 */
router.patch('/:opportunityId/clarifications/:clarificationId', async (req, res) => {
  try {
    const { opportunityId, clarificationId } = req.params;
    const { questions, assumptions, approved } = req.body;
    const sql = getSql();

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Questions array is required',
      });
    }

    // Update clarification questions and mark as sent if approved
    const updated = await sql`
      UPDATE clarifications
      SET
        questions = ${JSON.stringify(questions)}::jsonb,
        status = ${approved ? 'sent' : 'draft'},
        sent_at = ${approved ? sql`now()` : null},
        updated_at = now()
      WHERE id = ${clarificationId}
        AND opportunity_id = ${opportunityId}
      RETURNING id, questions, status, sent_at, gap_analysis_id, updated_at
    `;

    if (updated.length === 0) {
      return res.status(404).json({
        error: 'Clarification not found',
      });
    }

    // Note: Assumptions are read-only display data from gap_analysis
    // They don't need to be persisted separately when edited in the modal

    res.json({
      message: approved ? 'Clarification questions approved and sent' : 'Clarification questions updated successfully',
      clarification: updated[0],
    });
  } catch (error: any) {
    console.error('Error updating clarification questions:', error);
    res.status(500).json({
      error: 'Failed to update clarification questions',
      message: error.message,
    });
  }
});

/**
 * POST /api/opportunities/:id/redo/:step
 * Redo a workflow step and clear all succeeding steps
 */
router.post('/:id/redo/:step', async (req, res) => {
  try {
    const { id, step } = req.params;
    const { userId } = req.body;
    const sql = getSql();

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Define the workflow order and what to clear for each step
    const workflowSteps = [
      'intake',
      'brief_extract',
      'gap_analysis',
      'assumption_analysis',
      'clarification',
      'clarification_response',
      'feasibility',
      'scope_planning',
      'wbs_estimate',
      'pricing',
      'document_gen',
      'approvals',
    ];

    const stepIndex = workflowSteps.indexOf(step);
    if (stepIndex === -1) {
      return res.status(400).json({ error: 'Invalid step name' });
    }

    // Clear data based on which step is being redone
    if (stepIndex <= workflowSteps.indexOf('brief_extract')) {
      // Clear briefs and everything after
      await sql`DELETE FROM briefs WHERE opportunity_id = ${id}`;
    }

    if (stepIndex <= workflowSteps.indexOf('assumption_analysis')) {
      // Clear gap analyses and everything after
      await sql`
        DELETE FROM gap_analyses
        WHERE brief_id IN (
          SELECT id FROM briefs WHERE opportunity_id = ${id}
        )
      `;
    }

    if (stepIndex <= workflowSteps.indexOf('clarification_response')) {
      // For clarification / clarification_response: reset the clarification record
      if (step === 'clarification') {
        // Just reset the email send state so it can be re-sent
        await sql`
          UPDATE clarifications
          SET status = 'pending_approval', sent_at = null, updated_at = now()
          WHERE opportunity_id = ${id}
        `;
      } else if (step === 'clarification_response') {
        // Reset client response so it can be re-uploaded
        await sql`
          UPDATE clarifications
          SET client_responses = null, client_response_text = null,
              status = 'sent', updated_at = now()
          WHERE opportunity_id = ${id}
        `;
      } else {
        // For earlier steps: clear clarifications entirely
        await sql`DELETE FROM clarifications WHERE opportunity_id = ${id}`;
      }
    }

    if (stepIndex <= workflowSteps.indexOf('scope_planning')) {
      // Clear scopes and sample plans
      await sql`DELETE FROM scopes WHERE opportunity_id = ${id}`;
      await sql`
        DELETE FROM sample_plans
        WHERE scope_id IN (
          SELECT id FROM scopes WHERE opportunity_id = ${id}
        )
      `;
    }

    if (stepIndex <= workflowSteps.indexOf('pricing')) {
      // Clear WBS and pricing
      await sql`
        DELETE FROM wbs
        WHERE scope_id IN (
          SELECT id FROM scopes WHERE opportunity_id = ${id}
        )
      `;
      await sql`DELETE FROM pricing_packs WHERE opportunity_id = ${id}`;
    }

    if (stepIndex <= workflowSteps.indexOf('document_gen')) {
      // Clear documents
      await sql`DELETE FROM documents WHERE opportunity_id = ${id}`;
    }

    if (stepIndex <= workflowSteps.indexOf('approvals')) {
      // Clear approvals
      await sql`DELETE FROM approvals WHERE opportunity_id = ${id}`;
    }

    // Cancel any in-progress jobs (set to failed since cancelled is not in check constraint)
    await sql`
      UPDATE jobs
      SET status = 'failed', error = 'Cancelled due to step redo', updated_at = now()
      WHERE opportunity_id = ${id}
        AND status IN ('pending', 'processing')
    `;

    // Reset opportunity status to the step being redone
    await sql`
      UPDATE opportunities
      SET status = ${step}, updated_at = now()
      WHERE id = ${id}
    `;

    // Trigger the orchestrator in the background — respond immediately
    const orchestrator = new OrchestratorAgent();
    orchestrator.executeNextStep(id, userId, step as any).catch((err: any) => {
      console.error('Background redo processing error:', err);
    });

    res.json({
      message: `Step ${step} will be reprocessed`,
      opportunityId: id,
    });
  } catch (error: any) {
    console.error('Error redoing step:', error);
    res.status(500).json({
      error: 'Failed to redo step',
      message: error.message,
    });
  }
});

export default router;
