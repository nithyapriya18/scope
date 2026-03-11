# CLAUDE.md - Lumina Scope Project Context

**Last Updated**: 2026-03-11
**Current Phase**: Phase 2 Complete ✅ (Scope Planning)
**Next Phase**: Phase 3 - WBS Estimation & Pricing

## 🎨 Figma Design System Integration Complete (2026-03-11)

**Complete PetaSight brand design system integrated from Figma:**
- ✅ All brand colors synced with Figma design system
- ✅ Typography scale (Heading 1-3, Subtitle, Paragraph, Buttons)
- ✅ Status/Alert colors (Success, Warning, Error, Info)
- ✅ Complete neutral grayscale palette (Neutral 0-950)
- ✅ CSS custom properties for dark mode support
- ✅ All components use semantic color classes

**Figma Design File**: https://www.figma.com/design/LqVdvmkBMQ8slIJt1xrvdW/PetaSight-Brand

**Brand Colors** (from Figma):
- **Primary**: `#DA365C` (Magenta) - Main brand color
- **Secondary**: `#4F73CD` (Blue) - Secondary brand color
- **Success**: `#16A34A` (Green) - Positive actions
- **Warning**: `#F59E0B` (Orange) - Warnings
- **Error/Focus**: `#DA365C` (Primary) - Errors and focus states
- **Info**: `#02B4C7` (Cyan) - Informational messages

**Typography** (Inter font from Google Fonts):
- Heading 1: Bold 64px / 140% line-height → `text-heading-1`
- Heading 2: Semi Bold 48px / 140% → `text-heading-2`
- Heading 3: Semi Bold 36px / 140% → `text-heading-3`
- Subtitle: Bold 18px / 140% → `text-subtitle`
- Paragraph: Regular 16px / 140% → `text-paragraph`
- Button Large: Medium 18px / 140% → `text-button-lg`
- Button Default: Medium 16px / 140% → `text-button`
- Button Small: Regular 14px / 140% → `text-button-sm`

**CRITICAL**: Always use semantic color classes:
- `bg-primary` (NOT `bg-primary-500`) - Shows PetaSight magenta (#DA365C)
- `text-foreground` (NOT `text-gray-900 dark:text-white`)
- `text-foreground-secondary`, `text-foreground-tertiary` for text hierarchy
- `bg-card` (NOT `bg-white dark:bg-neutral-900`)
- `border-border` (NOT `border-gray-200 dark:border-gray-800`)
- `bg-success`, `bg-warning`, `bg-error`, `bg-info` for status colors
- `text-success`, `text-warning`, `text-error`, `text-info` for status text
- See [REVAMP_COMPLETE.md](REVAMP_COMPLETE.md) for full details

---

## 🎯 Project Overview

**Lumina Scope** is an AI-driven RFP response automation system for pharmaceutical primary market research. It automates the entire workflow from RFP email intake to final proposal generation through 6 streamlined intelligent workflow steps.

**Key Architecture**:
- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS (Port 3000)
- **Backend**: Express.js + TypeScript + PostgreSQL (Port 3038)
- **AI**: AWS Bedrock (Claude Haiku 4.5) - `global.anthropic.claude-haiku-4-5-20251001-v1:0`
- **Database**: PostgreSQL database `lumina_scope` with 28 tables (17 new in Phase 1)
- **Brand**: PetaSight colors (magenta #da365c primary)

---

## 💼 Business Model (CRITICAL CLARIFICATION)

**IMPORTANT - How the RFP Process Actually Works**:

```
❌ WRONG: We create RFPs and send them to pharma companies
✅ CORRECT: Pharma companies send RFPs to US, and we respond with proposals
```

**The Actual Flow**:
1. **Pharma Company** (Pfizer, Merck, J&J, etc.) needs market research
2. **They SEND us an RFP** (Request for Proposal) - asking us to bid on their project
3. **We receive the RFP** via email (PDF attachment, Word doc, or in email body)
4. **Lumina Scope processes the RFP** - extracts requirements, detects gaps, generates clarifications
5. **We respond with a proposal** - methodology, timeline, budget, team credentials
6. **We compete with other vendors** to win the contract
7. **If we win**, we execute the research project and deliver results

**What We're Automating**:
- ✅ RFP **intake** (parsing the pharma company's request)
- ✅ Requirements **extraction** (understanding what they need)
- ✅ Gap **analysis** (finding missing information)
- ✅ Clarification **questions** (asking pharma for details)
- ✅ Proposal **generation** (creating our response/bid)
- ✅ Pricing **calculation** (estimating project costs)
- ✅ Document **creation** (proposal, SoW, pricing pack)

**Terminology**:
- **RFP** = Request for Proposal (pharma's ask to vendors)
- **Proposal** = Our response/bid to win the project
- **SoW** = Statement of Work (detailed project plan in our proposal)
- **Opportunity** = An RFP we received (a potential project to win)

**See [PHARMA_RFP_RESEARCH.md](PHARMA_RFP_RESEARCH.md) for complete details on what pharma RFPs look like.**

---

## 📂 Project Structure

```
/home/nithya/app-lumina-scope/
├── backend/
│   ├── src/
│   │   ├── index.ts                    # Express server entry
│   │   ├── routes/
│   │   │   ├── opportunities.ts        # Main RFP workflow API
│   │   │   └── jobs.ts                 # Job queue API
│   │   ├── services/
│   │   │   ├── aiServiceFactory.ts     # LLM provider factory
│   │   │   ├── bedrock.ts              # AWS Bedrock integration
│   │   │   ├── jobQueue.ts             # PostgreSQL job queue
│   │   │   ├── usageTracking.ts        # LLM cost tracking
│   │   │   ├── approvalService.ts      # Human-in-loop approvals
│   │   │   └── agents/
│   │   │       ├── baseAgent.ts        # Base class for all agents
│   │   │       ├── intakeAgent.ts      # ✅ Extracts metadata from RFP
│   │   │       ├── briefExtractorAgent.ts     # ✅ Extracts requirements
│   │   │       ├── gapAnalyzerAgent.ts        # ✅ Detects missing info
│   │   │       ├── clarificationGeneratorAgent.ts  # ✅ Generates questions
│   │   │       └── orchestratorAgent.ts       # ✅ Coordinates workflow
│   │   └── lib/
│   │       └── sql.ts                  # PostgreSQL client wrapper
│   ├── config/
│   │   └── rate_card.json              # Pricing configuration
│   └── .env                            # Environment variables
├── frontend/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with Header
│   │   ├── page.tsx                    # Landing page
│   │   ├── login/page.tsx              # Login page (hardcoded demo)
│   │   ├── dashboard/page.tsx          # ✅ Main RFP list view
│   │   ├── intelligence/page.tsx       # ✅ Market intel (3 tabs)
│   │   └── opportunities/[id]/page.tsx # ✅ Workflow detail view
│   ├── components/
│   │   ├── Header.tsx                  # Navigation header
│   │   ├── Footer.tsx                  # Footer
│   │   ├── ChatLayout.tsx              # Split-screen layout (from app-maxima)
│   │   └── WorkflowVisualizer.tsx      # 6-step workflow progress
│   └── .env.local                      # Frontend environment variables
└── db-migrations/lumina/               # Alembic migrations (separate repo)
```

---

## ✅ What's Currently Working (Phase 3 Complete)

### **Backend API (Port 3038)**
- ✅ Express server with TypeScript
- ✅ PostgreSQL connection (database: `lumina_scope`)
- ✅ AWS Bedrock integration (Claude Haiku 4.5)
- ✅ Job queue service (PostgreSQL-based, no Redis needed)
- ✅ LLM usage tracking with cost calculations
- ✅ 4 working agents:
  1. **Intake Agent** - Parses RFP, extracts client/deadline/therapeutic area
  2. **Brief Extractor** - Extracts research objectives, sample requirements
  3. **Gap Analyzer** - Detects missing/ambiguous information
  4. **Clarification Generator** - Creates professional questions for client
- ✅ Orchestrator Agent - Coordinates workflow state transitions
- ✅ Approval Service - Human-in-loop checkpoints

### **Frontend (Port 3000)**
- ✅ Next.js 16 with App Router
- ✅ PetaSight branding (logo, colors, fonts)
- ✅ Hardcoded demo login (demo@lumina.com / demo123)
- ✅ **Dashboard** - RFP list with stats, search, filter
- ✅ **Intelligence** - Market intel with 3 tabs:
  - RFP Signals (hiring, pipeline, conferences)
  - Pharma News (FDA approvals, M&A, earnings)
  - Upcoming Events (ASCO, ACC, ADA)
- ✅ **Opportunity Detail** - 12-step workflow visualizer with ChatLayout
- ✅ Real-time status polling (3-second intervals)
- ✅ "Process Next Step" button to advance workflow

### **Database (PostgreSQL)**
28 tables (17 new in Phase 1):

**Original tables:**
- `users`, `opportunities`, `briefs`, `gap_analyses`, `clarifications`
- `scopes`, `sample_plans`, `hcp_database`, `hcp_shortlists`
- `wbs`, `pricing_packs`, `documents`, `approvals`
- `jobs`, `llm_usage`, `chat_messages`

**Phase 1 tables (Study Library & Multi-tenancy):**
- `tenants` - Multi-tenant support
- `study_families`, `study_types`, `study_definitions` - MECE taxonomy (6 families, 27 types)
- `deliverable_definitions` - Standard deliverables library
- `task_definitions`, `task_sets` - 48 atomic tasks for WBS
- `question_sets` - Clarification question templates
- `multiplier_definitions`, `multiplier_sets` - 12 complexity multipliers
- `rate_cards`, `oop_catalog_items` - Pricing catalogs
- `vendors`, `template_sets`, `workplan_templates` - Supporting data

**See [PHASE1_COMPLETE.md](PHASE1_COMPLETE.md) for full details on Phase 1 tables and seed data.**

---

## 🔄 Simplified 6-Step Workflow

**Streamlined from 11 detailed workflow steps to 6 for clarity and efficiency**

| Step | Status | Agent | Description | Human Approval? |
|------|--------|-------|-------------|-----------------|
| 1. RFP Intake | ✅ Working | IntakeAgent | RFP received via email or upload | No |
| 2. Requirements Extraction | ✅ Working | BriefExtractorAgent | Extract objectives, target audience, geography, timeline, deliverables, constraints; categorize explicit/implicit/missing requirements | No |
| 3. Gap Analysis | ✅ Working | GapAnalyzerAgent | Identify explicit, implicit, and missing/unclear requirements; flag unclear terms | No |
| 4. Clarifications | ✅ Working | ClarificationGeneratorAgent | Generate clarification questions for unclear terms and missing data | **Yes** 🚦 |
| 5. Scope & Sample Planning | ⏳ Not yet | ScopePlannerAgent | Draft scope assumptions + recommend sample size + best doctor list + feasibility/risk test | No |
| 6. Proposal Generation | ⏳ Not yet | ProposalGeneratorAgent | Create proposal outline (objectives, methodologies, sample plan, recruitment, timeline, deliverables, assumptions) | **Yes** 🚦 |

**Step 5 Details** (Scope & Sample Planning):
- Scope assumptions: assumption logs, client confirmation, standard defaults, high-risk assumptions
- Sample size: study type (qual/quant/mixed), segments, quota precision, feasibility adjustment, rate card
- Best doctor list: specialty, geography, practice, patient volume, language, inclusion/exclusion criteria, 50% internal signal
- Feasibility + risk test

**Step 6 Details** (Proposal Generation):
- Proposal outline: objectives, methodologies, sample plan, recruitment approach, timeline, deliverables, assumptions & dependencies
- Human review and final approval

---

## 🚀 How to Start the Application

### **Prerequisites**
```bash
# Ensure these are running:
# 1. PostgreSQL server
pg_isready

# 2. AWS credentials configured (uses SSO profile 'dev-admin')
aws sso login --profile dev-admin

# 3. Database exists with tables
psql -U nithya -d lumina_scope -c "\dt"
```

### **Start Servers**

**Terminal 1 - Backend:**
```bash
cd /home/nithya/app-lumina-scope/backend
npm run dev
# Runs on http://localhost:3038
```

**Terminal 2 - Frontend:**
```bash
cd /home/nithya/app-lumina-scope/frontend
npm run dev
# Runs on http://localhost:3000
```

### **Test the API**
```bash
# Health check
curl http://localhost:3038/health

# Create test opportunity
curl -X POST http://localhost:3038/api/opportunities \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user",
    "emailBody": "We need a qualitative study with oncologists in the US to understand treatment patterns for NSCLC. We need 30 interviews. Budget is $50,000. Deadline is March 31st.",
    "emailSubject": "RFP: NSCLC Treatment Patterns Study",
    "rfpTitle": "NSCLC Oncology Study",
    "clientName": "PharmaCorp Inc"
  }'

# Process next step
curl -X POST http://localhost:3038/api/opportunities/<ID>/process \
  -H "Content-Type: application/json" \
  -d '{"userId": "demo-user"}'
```

### **Access the UI**
1. Open http://localhost:3000
2. Login: `demo@lumina.com` / `demo123`
3. View dashboard with mock opportunities
4. Click any opportunity → See 12-step workflow
5. Click "Process Next Step" to advance workflow

---

## 🔧 Environment Configuration

### **Backend (.env)**
```bash
NODE_ENV=development
PORT=3038
DATABASE_URL=postgresql://nithya:dev123@127.0.0.1:5432/lumina_scope
AWS_REGION=us-east-2
AWS_PROFILE=dev-admin
BEDROCK_MODEL_ID=global.anthropic.claude-haiku-4-5-20251001-v1:0
AI_SERVICE_TYPE=bedrock
FRONTEND_URL=http://localhost:3000
FILE_STORAGE_TYPE=local
FILE_STORAGE_PATH=./uploads
RATE_CARD_PATH=./config/rate_card.json
```

### **Frontend (.env.local)**
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3038
```

---

## ⚠️ Important Constraints & Design Decisions

### **1. Authentication**
- Currently using **hardcoded demo login** (localStorage-based)
- User: `demo@lumina.com` / `demo123`
- User ID: `a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0`
- **No Google OAuth yet** - planned for Phase 1 completion

### **2. LLM Model**
- **Always use Claude Haiku 4.5**: `global.anthropic.claude-haiku-4-5-20251001-v1:0`
- Do NOT switch to Sonnet/Opus unless explicitly requested
- Haiku is fast (~2-3s), cheap ($0.80/$4.00 per M tokens), and sufficient for extraction tasks

### **3. Database Connection**
- Uses TCP connection (`127.0.0.1`) instead of Unix socket to avoid peer authentication issues
- Database: `lumina_scope` (separate from agriplast/maxima)
- User: `nithya` with password `dev123`

### **4. Job Queue**
- PostgreSQL-based (no Redis/RabbitMQ dependency)
- Jobs auto-cleanup after 1 hour
- Progress tracking: 0-100%
- Status: `pending` → `processing` → `completed`/`failed`

### **5. ChatLayout Component**
- Reused from `app-maxima` project
- Split-screen: Workflow Visualizer (left) + AI Chat (right)
- Resizable panels (desktop), tabs (mobile)
- **Do NOT modify** - proven pattern

### **6. Code Reuse Pattern**
- Backend services copied from `app-maxima` and adapted
- Frontend components (Header, Footer, ChatLayout) based on app-maxima
- Database schema inspired by app-maxima but customized for RFP workflow

---

## 📋 What's NOT Implemented Yet (Phases 4-5)

### **Phase 4: Scope Planning (Step 5)**
- [ ] ScopePlannerAgent (combines scope design + sample planning + HCP matching)
- [ ] Design research methodology and assumptions
- [ ] Estimate high-level doctor sample requirements
- [ ] HCP database integration (~500 sample records)

### **Phase 5: Proposal Generation (Step 6)**
- [ ] ProposalGeneratorAgent (combines WBS + pricing + document generation)
- [ ] Work breakdown structure estimation
- [ ] Pricing calculations with rate card integration
- [ ] Document generation (proposals, SoW, pricing packs)
- [ ] Python script with python-docx (Word documents)
- [ ] exceljs for pricing packs (Excel)
- [ ] Template system

### **Phase 6: Polish & Deployment**
- [ ] Change order management
- [ ] Baseline package creation
- [ ] Analytics dashboard enhancements
- [ ] AWS deployment

---

## 🐛 Known Limitations

1. **No actual email sending** - Clarifications generated but not sent (Phase 6)
2. **Mock authentication** - Using hardcoded demo user
3. **No chat interface** - Placeholder in UI (Phase 7)
4. **Manual workflow trigger** - UI button (could automate later)
5. **Mock data in Intelligence tab** - Ready for real API integration (NewsAPI, LinkedIn, etc.)

---

## 📊 Performance & Costs (with Haiku 4.5)

### **Agent Execution Times**
- Intake: ~2 seconds
- Brief Extraction: ~3-4 seconds
- Gap Analysis: ~2-3 seconds
- Clarification Generation: ~3-4 seconds
- **Total**: ~10-15 seconds from RFP upload to clarification questions

### **Costs per RFP**
- Intake: ~$0.002
- Brief Extraction: ~$0.005
- Gap Analysis: ~$0.003
- Clarification Generation: ~$0.004
- **Total**: ~$0.014 per RFP (1.4 cents)

---

## 🔍 Testing Instructions

### **Test Complete Workflow**
1. Start both servers (see above)
2. Open http://localhost:3000 and login
3. Create opportunity via API (see curl command above)
4. Open opportunity in UI: http://localhost:3000/opportunities/<ID>
5. Click "Process Next Step" 3 times:
   - First click: Brief Extraction
   - Second click: Gap Analysis
   - Third click: Clarification Generation
6. View workflow progress with green checkmarks
7. See generated clarification questions in database

### **Check Database State**
```bash
# View opportunities
psql -U nithya -d lumina_scope -c "SELECT id, title, client_name, status, created_at FROM opportunities;"

# View jobs
psql -U nithya -d lumina_scope -c "SELECT id, agent_type, status, progress, created_at FROM jobs ORDER BY created_at DESC LIMIT 5;"

# View LLM usage
psql -U nithya -d lumina_scope -c "SELECT agent_type, SUM(input_tokens) as total_input, SUM(output_tokens) as total_output, SUM(cost) as total_cost FROM llm_usage GROUP BY agent_type;"
```

---

## 🎨 Branding Guidelines

**PetaSight Colors** (from [tailwind.config.ts](frontend/tailwind.config.ts)):
- Primary: `#da365c` (magenta)
- Secondary: `#1e40af` (blue-800)
- Accent: `#34d399` (emerald-400)

**Logo Usage**:
- "PetaSight" + "Lumina Scope" wordmark
- Located in Header component
- Always visible in sticky header

**Typography**:
- Font: Inter (from Google Fonts)
- Headings: font-bold
- Body: font-normal

---

## 🔄 Git Workflow (NOT YET COMMITTED)

**Current State**: All files are untracked (no initial commit yet)

**When ready to commit**:
```bash
cd /home/nithya/app-lumina-scope
git init
git add .
git commit -m "Phase 3 complete: 4 agents + orchestration + workflow UI"
```

---

## 📞 Related Projects

- **app-maxima**: `/home/nithya/agriplast_latest/app-maxima/` (reference codebase)
- **db-migrations**: `/home/nithya/db-migrations/lumina/` (Alembic migrations)

---

## ⚡ Quick Reference Commands

```bash
# Start backend
cd /home/nithya/app-lumina-scope/backend && npm run dev

# Start frontend
cd /home/nithya/app-lumina-scope/frontend && npm run dev

# Check database
psql -U nithya -d lumina_scope -c "\dt"

# Run migration
cd /home/nithya/db-migrations/lumina && alembic upgrade head

# Check running processes
ps aux | grep -E "(node.*3038|next.*3000)"

# Health check
curl http://localhost:3038/health
```

---

## 🎯 Next Steps (When Resuming Work)

1. **Immediate**: Test the current Phase 3 workflow end-to-end (Steps 1-4 working)
2. **Phase 4**: Implement ScopePlannerAgent (Step 5) - combines scope design + sample estimation + HCP matching
3. **Phase 5**: Implement ProposalGeneratorAgent (Step 6) - combines WBS + pricing + document generation
4. **Phase 6**: Polish UI, enhance analytics, deploy to AWS

---

## 🚨 Critical Reminders

1. **Always verify which phase agents exist** before calling them
2. **Do NOT hallucinate agent implementations** - check file existence first
3. **Use Haiku 4.5** for all agents (not Sonnet/Opus)
4. **Respect human approval checkpoints** (clarifications, final documents)
5. **Test with real RFP text** from PHASE3_COMPLETE.md examples
6. **Database is separate** - do NOT touch agriplast/maxima databases

---

**End of CLAUDE.md**
