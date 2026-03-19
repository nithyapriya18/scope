import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import jobsRouter from './routes/jobs';
import opportunitiesRouter from './routes/opportunities';
import analyticsRouter from './routes/analytics';
import authRouter from './routes/auth';
import chatRouter from './routes/chat';
import { setupPassport } from './services/auth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3038;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Allow all localhost origins
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    // Allow configured frontend URL
    if (origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session setup (for OAuth)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Passport setup
app.use(passport.initialize());
app.use(passport.session());
setupPassport();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'lumina-scope-backend',
    timestamp: new Date().toISOString(),
    phase: 'Phase 1 Complete - Database Foundation & Study Library',
  });
});

// API routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Lumina Scope API v1.0',
    phase: 'Phase 2 In Progress',
    features: [
      'AI Service Factory (Bedrock with Sonnet 4.6)',
      'Job Queue Service (PostgreSQL-based)',
      'Base Agent Class & LLM Usage Tracking',
      'Intake Agent → Brief Extractor → Gap Analyzer → Clarification Generator',
      'Scope Planner Agent (study type detection + 3 sample options + HCP shortlist + assumptions)',
      'Orchestrator Agent (workflow coordination)',
      'Approval Service (human-in-loop)',
      'Study Library (27 study types, 48 tasks, 12 multipliers)',
      'Multi-tenancy support',
    ],
    endpoints: [
      '/health',
      '/api',
      '/api/auth/google',
      '/api/auth/me',
      '/api/jobs',
      '/api/jobs/:id',
      '/api/opportunities',
      '/api/opportunities/:id',
      '/api/opportunities/:id/process',
      '/api/opportunities/:id/chat',
      '/api/opportunities/:id/messages',
      '/api/analytics',
    ],
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api', chatRouter); // Chat routes (nested under opportunities)

// HCP Panel — serve mock panel database
app.get('/api/hcp-panel', (_req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/hcp_panel.json'), 'utf-8'));
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to load panel data', message: e.message });
  }
});

// Rate card — serve for pricing step
app.get('/api/rate-card', (_req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/rate_card.json'), 'utf-8'));
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to load rate card', message: e.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Lumina Scope Backend running on port ${PORT}`);
  console.log(`🌍 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 AI Service: AWS Bedrock (Sonnet 4.6)`);
  console.log(`📊 Job Queue: PostgreSQL-based`);
});

export default app;
