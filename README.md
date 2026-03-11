# Lumina Scope

AI-Driven RFP Response System for Pharmaceutical Primary Market Research

Part of the PetaSight Lumina PMR Solution Suite

## Overview

Lumina Scope automates the entire RFP-to-proposal workflow through 12 intelligent workflow steps, from email intake to document generation, with strategic human-in-loop approval checkpoints.

## Architecture

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS (PetaSight branding)
- **Backend**: Express.js + TypeScript + PostgreSQL
- **AI**: AWS Bedrock (Claude Sonnet 4.5) with multi-agent orchestration
- **Documents**: Python + python-docx for proposals, exceljs for pricing packs

## Project Structure

```
app-lumina-scope/
├── frontend/          # Next.js frontend application
│   ├── app/           # Next.js app router pages
│   ├── components/    # Reusable React components
│   ├── public/        # Static assets
│   └── package.json
├── backend/           # Express.js backend API
│   ├── src/           # TypeScript source code
│   ├── config/        # Configuration files (rate cards, etc.)
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Python 3.10+ (for document generation)
- AWS Account (for Bedrock access)

### Installation

#### 1. Install Frontend Dependencies

```bash
cd frontend
npm install
```

#### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

#### 3. Set Up Environment Variables

**Frontend** (`frontend/.env.local`):
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3038
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

**Backend** (`backend/.env`):
```bash
NODE_ENV=development
PORT=3038
DATABASE_URL=postgresql://user:pass@localhost:5432/lumina_scope
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0
FRONTEND_URL=http://localhost:3000
```

#### 4. Set Up Database

```bash
# Create database
createdb lumina_scope

# Run migrations
cd /home/nithya/db-migrations/lumina
alembic upgrade head
```

### Running the Application

#### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Access the application at: http://localhost:3000

## Features

### Phase 1 (Completed) ✅
- ✅ Next.js frontend with PetaSight branding
- ✅ Express.js backend with TypeScript
- ✅ PostgreSQL database schema (20+ tables)
- ✅ Dashboard for managing RFP requests
- ✅ Responsive UI with Header, Footer, ChatLayout components

### Phase 2 (In Progress)
- 🔄 AI Service Factory (multi-provider LLM support)
- 🔄 Job Queue Service (async processing)
- 🔄 Base Agent class for multi-agent system
- 🔄 LLM usage tracking

### Phase 3-7 (Planned)
- Core Agents (Intake, Brief Extractor, Gap Analyzer, etc.)
- Orchestrator Agent for workflow coordination
- Approval Service with human-in-loop
- Document generation (proposals, SoW, pricing packs)
- Analytics dashboard
- AWS deployment

## Workflow States

1. **INTAKE** - Email received, parsed
2. **BRIEF_EXTRACT** - Requirements extracted
3. **GAP_ANALYSIS** - Missing info detected
4. **CLARIFICATION** - Questions generated (🚦 Human Approval Required)
5. **CLARIFICATION_RESPONSE** - Client responses received
6. **SCOPE_BUILD** - Objectives + methodology defined
7. **SAMPLE_PLAN** - Sample sizing calculated
8. **HCP_SHORTLIST** - HCP list generated
9. **WBS_ESTIMATE** - Work breakdown + effort
10. **PRICING** - Pricing pack calculated
11. **DOCUMENT_GEN** - Proposal/SoW generated (🚦 Human Approval Required)
12. **APPROVED** - Ready for handoff to Lumina Survey/Craft

## Multi-Agent System

- **Intake Agent** - Parse RFP files
- **Brief Extractor Agent** - Extract requirements
- **Gap Analyzer Agent** - Detect missing info
- **Clarification Generator Agent** - Generate questions
- **Scope Builder Agent** - Design research scope
- **Sample Planner Agent** - Calculate sample sizes
- **HCP Matcher Agent** - Query HCP database
- **WBS Estimator Agent** - Estimate effort
- **Pricer Agent** - Calculate pricing
- **Document Generator Agent** - Generate documents
- **Orchestrator Agent** - Coordinate workflow

## Development

### Tech Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- lucide-react (icons)
- axios (API client)

**Backend:**
- Express.js
- TypeScript
- postgres (PostgreSQL driver)
- AWS SDK (Bedrock)
- exceljs (Excel generation)

**Database:**
- PostgreSQL 15+
- Alembic (migrations)

### Folder Structure

**Frontend:**
```
frontend/
├── app/
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage
│   ├── dashboard/         # Dashboard page
│   ├── opportunities/     # Opportunity management
│   └── globals.css        # Global styles
├── components/
│   ├── Header.tsx         # Navigation header
│   ├── Footer.tsx         # Footer
│   └── ChatLayout.tsx     # Split-screen layout
└── tailwind.config.ts     # PetaSight colors
```

**Backend:**
```
backend/
├── src/
│   ├── index.ts           # Express app entry
│   ├── routes/            # API routes
│   ├── controllers/       # Business logic
│   ├── services/          # Core services & agents
│   └── lib/               # Utilities
└── config/
    └── rate_card.json     # Pricing configuration
```

## API Endpoints

### Core Endpoints
- `GET /health` - Health check
- `GET /api` - API information
- `POST /api/opportunities` - Create RFP opportunity
- `GET /api/opportunities` - List opportunities
- `GET /api/opportunities/:id` - Get opportunity details
- `POST /api/opportunities/:id/extract-brief` - Extract brief
- `POST /api/opportunities/:id/generate-clarifications` - Generate clarifications
- `POST /api/approvals` - Request approval
- `GET /api/jobs/:id` - Get job status

## Database Schema

### Core Tables
- **users** - User accounts
- **opportunities** - RFP records
- **briefs** - Extracted requirements
- **gap_analyses** - Gap detection results
- **clarifications** - Clarification questions
- **scopes** - Research scopes
- **sample_plans** - Sample sizing
- **hcp_database** - HCP profiles (~500 sample records)
- **hcp_shortlists** - Generated HCP lists
- **wbs** - Work breakdown structures
- **pricing_packs** - Pricing calculations
- **documents** - Generated documents
- **approvals** - Approval workflow
- **jobs** - Async job queue
- **llm_usage** - LLM cost tracking
- **chat_messages** - Chat history

## Contributing

1. Follow the implementation plan in `/home/nithya/.claude/plans/splendid-seeking-owl.md`
2. Use TypeScript for type safety
3. Follow PetaSight branding guidelines (see tailwind.config.ts)
4. Write clean, documented code
5. Test thoroughly before committing

## License

© 2026 PetaSight Inc. All rights reserved.

## Support

For issues or questions, contact the PetaSight development team.
