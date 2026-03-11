/**
 * Chat Routes - Real-time chat with AI assistant
 */

import { Router, Request, Response } from 'express';
import { getSql } from '../lib/sql';
import { getAIService } from '../services/aiServiceFactory';

const router = Router();

// Get chat messages for an opportunity
router.get('/opportunities/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sql = getSql();

    const messages = await sql`
      SELECT id, role, content, metadata, created_at
      FROM chat_messages
      WHERE opportunity_id = ${id}
      ORDER BY created_at ASC
    `;

    res.json({ messages });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send a message and get AI response
router.post('/opportunities/:id/chat', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const sql = getSql();

    // Get opportunity details for context
    const [opportunity] = await sql`
      SELECT id, rfp_title, client_name, status, email_body
      FROM opportunities
      WHERE id = ${id}
    `;

    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    // Get recent chat history (last 10 messages)
    const recentMessages = await sql`
      SELECT role, content
      FROM chat_messages
      WHERE opportunity_id = ${id}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const chatHistory = recentMessages.reverse();

    // Save user message
    const [userMessage] = await sql`
      INSERT INTO chat_messages (opportunity_id, user_id, role, content)
      VALUES (${id}, ${userId}, 'user', ${message})
      RETURNING id, role, content, created_at
    `;

    // Build context for AI
    const systemPrompt = `You are an AI assistant helping with RFP response automation for pharmaceutical market research.

Current RFP Details:
- Client: ${opportunity.client_name || 'Unknown'}
- Title: ${opportunity.rfp_title || 'Untitled'}
- Status: ${opportunity.status}

Your role is to:
1. Answer questions about the RFP and its requirements
2. Help refine the research scope and methodology
3. Suggest improvements to the proposal
4. Explain any workflow steps or decisions

Be concise, professional, and helpful. Focus on pharmaceutical market research expertise.`;

    // Build conversation for AI
    const conversationMessages = chatHistory.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    // Add current user message
    conversationMessages.push({
      role: 'user',
      content: message,
    });

    // Get AI response using Claude Haiku
    const aiService = getAIService();

    // Convert conversation history to the format expected by invoke()
    const conversationHistory = conversationMessages.slice(0, -1); // Exclude current message
    const currentMessage = message;

    const aiResponse = await aiService.invoke(
      systemPrompt,
      currentMessage,
      conversationHistory
    );

    // Calculate cost (Haiku 4.5: $0.80 per M input, $4.00 per M output)
    const inputCost = (aiResponse.usage?.inputTokens || 0) * 0.80 / 1_000_000;
    const outputCost = (aiResponse.usage?.outputTokens || 0) * 4.00 / 1_000_000;
    const totalCost = inputCost + outputCost;

    // Save assistant response
    const [assistantMessage] = await sql`
      INSERT INTO chat_messages (opportunity_id, user_id, role, content, metadata)
      VALUES (
        ${id},
        ${userId},
        'assistant',
        ${aiResponse.response},
        ${JSON.stringify({
          model: aiResponse.usage?.modelId || 'claude-haiku-4.5',
          inputTokens: aiResponse.usage?.inputTokens || 0,
          outputTokens: aiResponse.usage?.outputTokens || 0,
          cost: totalCost,
        })}
      )
      RETURNING id, role, content, created_at
    `;

    // Track usage
    await sql`
      INSERT INTO llm_usage (
        user_id,
        opportunity_id,
        operation_type,
        model_id,
        input_tokens,
        output_tokens,
        input_cost,
        output_cost
      ) VALUES (
        ${userId},
        ${id},
        'chat',
        ${aiResponse.usage?.modelId || 'claude-haiku-4.5'},
        ${aiResponse.usage?.inputTokens || 0},
        ${aiResponse.usage?.outputTokens || 0},
        ${inputCost},
        ${outputCost}
      )
    `;

    res.json({
      userMessage,
      assistantMessage,
      usage: {
        inputTokens: aiResponse.usage?.inputTokens || 0,
        outputTokens: aiResponse.usage?.outputTokens || 0,
        cost: totalCost,
      },
    });
  } catch (error: any) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
