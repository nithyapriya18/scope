# Testing Guide - Phase 2

## Phase 2 Completion Summary ✅

**Implemented:**
1. ✅ AI Service Factory with Bedrock integration
2. ✅ Job Queue Service (PostgreSQL-based async processing)
3. ✅ Base Agent Class (foundation for all agents)
4. ✅ LLM Usage Tracking (token counts + costs)
5. ✅ Job API endpoints

**Using Haiku 4.5** (as requested):
- Model: `global.anthropic.claude-haiku-4-5-20251001-v1:0`
- Pricing: $0.80/M input tokens, $4.00/M output tokens

---

## Quick Start Testing

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in another terminal)
cd frontend
npm install
```

### 2. Set Up Database

```bash
# Create database
createdb lumina_scope

# Run migration
cd /home/nithya/db-migrations/lumina
export DATABASE_URL="postgresql://localhost/lumina_scope"
alembic upgrade head
```

### 3. Configure Environment Variables

**Backend** (`backend/.env`):
```bash
NODE_ENV=development
PORT=3038

# Database
DATABASE_URL=postgresql://localhost/lumina_scope

# AWS Bedrock (use your credentials)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
BEDROCK_MODEL_ID=global.anthropic.claude-haiku-4-5-20251001-v1:0

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`frontend/.env.local`):
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3038
```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Expected output:
```
✅ Lumina Scope Backend running on port 3038
🌍 Frontend URL: http://localhost:3000
🔗 Health check: http://localhost:3038/health
🤖 AI Service: AWS Bedrock (Haiku 4.5)
📊 Job Queue: PostgreSQL-based
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Expected output:
```
▲ Next.js 16.1.6
- Local:        http://localhost:3000
```

---

## API Testing

### Test Health Check
```bash
curl http://localhost:3038/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "lumina-scope-backend",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "phase": "Phase 2 - AI Service & Job Queue"
}
```

### Test API Info
```bash
curl http://localhost:3038/api
```

Expected response:
```json
{
  "message": "Lumina Scope API v1.0",
  "phase": "Phase 2 Complete",
  "features": [
    "AI Service Factory (Bedrock with Haiku 4.5)",
    "Job Queue Service (PostgreSQL-based)",
    "Base Agent Class",
    "LLM Usage Tracking"
  ],
  "endpoints": [...]
}
```

### Test Job Queue (when agents are implemented)
```bash
# Get all jobs
curl http://localhost:3038/api/jobs

# Get specific job
curl http://localhost:3038/api/jobs/<job-id>
```

---

## Frontend Testing

### 1. Homepage
Visit: http://localhost:3000

You should see:
- PetaSight Lumina Scope header (magenta branding)
- Feature cards (RFP Intake, AI-Powered, HCP Matching, Automated Pricing)
- "Go to Dashboard" and "Sign In" buttons

### 2. Dashboard
Visit: http://localhost:3000/dashboard

You should see:
- Stats cards (Total RFPs, In Progress, Approved, Avg Response Time)
- Search bar
- Status filter dropdown
- "New RFP" button
- Mock opportunity cards with status badges

---

## Database Verification

Check that all tables were created:
```bash
psql lumina_scope -c "\dt"
```

Expected tables:
- users
- opportunities
- briefs
- gap_analyses
- clarifications
- scopes
- sample_plans
- hcp_database
- hcp_shortlists
- wbs
- pricing_packs
- documents
- approvals
- jobs
- llm_usage
- chat_messages
- alembic_version

---

## What's Ready for Testing

### ✅ Working Now
1. **Frontend**: Homepage + Dashboard UI
2. **Backend**: Express server with job queue API
3. **Database**: Full schema with 20+ tables
4. **AI Service**: Bedrock integration (ready to use)
5. **Job Queue**: Create, track, update jobs

### 🔄 Next Phase (Phase 3)
These will be implemented next:
- Intake Agent (parse RFP files)
- Brief Extractor Agent (extract requirements)
- Gap Analyzer Agent (detect missing info)
- Clarification Generator Agent (create questions)
- Orchestrator Agent (coordinate workflow)
- Approval Service (human-in-loop)
- Opportunity Detail page (main workflow UI)

---

## Architecture Validation

### AI Service Factory
Located: `backend/src/services/aiServiceFactory.ts`
- ✅ Lazy-loads Bedrock service
- ✅ Supports multi-provider pattern
- ✅ Uses Haiku 4.5 by default

### Job Queue
Located: `backend/src/services/jobQueue.ts`
- ✅ PostgreSQL-based (no Redis dependency)
- ✅ Progress tracking (0-100%)
- ✅ Status: pending → processing → completed/failed
- ✅ Auto-cleanup (1-hour retention)

### Base Agent
Located: `backend/src/services/agents/baseAgent.ts`
- ✅ Abstract class for all agents
- ✅ Job tracking wrapper
- ✅ LLM usage tracking integration
- ✅ Error handling

### Usage Tracking
Located: `backend/src/services/usageTracking.ts`
- ✅ Tracks all LLM calls
- ✅ Calculates costs (Haiku 4.5 pricing)
- ✅ Per-user and per-opportunity summaries
- ✅ Stores in llm_usage table

---

## Troubleshooting

### Backend won't start
- Check DATABASE_URL is set correctly
- Ensure PostgreSQL is running: `pg_isready`
- Verify AWS credentials are set

### Frontend won't start
- Check NEXT_PUBLIC_BACKEND_URL is set
- Try: `rm -rf .next && npm run dev`

### Database connection error
- Create database: `createdb lumina_scope`
- Check connection string format: `postgresql://user:pass@localhost:5432/lumina_scope`

### AWS Bedrock error
- Verify AWS credentials have Bedrock access
- Check region supports Haiku 4.5 (use us-east-1 or global)

---

## Next Steps

Phase 3 will implement:
1. Core agents (Intake → Clarification Generator)
2. Orchestrator for workflow coordination
3. Approval Service with human-in-loop
4. Opportunity Detail page with ChatLayout UI

Ready to test? Run the commands above and verify everything works!
