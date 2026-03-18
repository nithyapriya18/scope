# CLAUDE.md — Lumina Scope

> Global AI rules live in `~/.claude/CLAUDE.md` (symlinked from `backend/src/data/md files/Manu_CLAUDE (1).md`).
> This file contains only project-specific context.

---

## Model
Always `global.anthropic.claude-sonnet-4-6` — never Haiku or Opus unless explicitly asked.

---

## Project
**Lumina Scope** — AI-driven RFP response automation for pharma PMR.
Pharma companies (Pfizer, Merck etc.) send RFPs → PetaSight responds with proposals.
- RFP = their ask. Proposal = our bid. Opportunity = an RFP we received.

| Layer | Tech | Port |
|---|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript + Tailwind | 3000 |
| Backend | Express.js + TypeScript | 3038 |
| DB | PostgreSQL `lumina_scope` | 5432 |
| AI | AWS Bedrock — `global.anthropic.claude-sonnet-4-6` | — |

**DB**: TCP `127.0.0.1:5432`, user `nithya`, password `dev123`
**Auth**: Google OAuth + demo `demo@lumina.com` / `demo123`

---

## Key Paths

```
backend/src/
  index.ts                    # Express entry, port 3038
  routes/opportunities.ts     # Main RFP workflow API
  services/agents/
    orchestratorAgent.ts      # Workflow state machine
    briefExtractorAgent.ts
    clarificationGeneratorAgent.ts
    hcpMatcherAgent.ts        # Runs BEFORE scopePlannerAgent (sequential)
    scopePlannerAgent.ts      # Bug: calls aiService.generateText() — usage not tracked
    wbsEstimatorAgent.ts
    pricerAgent.ts
    documentGeneratorAgent.ts
  services/jobQueue.ts        # PostgreSQL job queue
  lib/sql.ts                  # postgres client wrapper
frontend/
  app/dashboard/page.tsx
  app/opportunities/[id]/page.tsx   # Auto-advances workflow
  components/VerticalWorkflowTimeline.tsx
  components/ChatInterface.tsx      # Do not modify ChatLayout.tsx
backend/config/rate_card.json
```

---

## Workflow State Machine

```
intake → brief_extract → gap_analysis → assumption_analysis
       → clarification → clarification_response
       → feasibility (HCPMatcher) → scope_planning (ScopePlanner)
       → wbs_estimate → pricing → document_gen → approved
```

**Auto-advance** (2s delay, in `opportunities/[id]/page.tsx`):
`intake, brief_extract, gap_analysis, assumption_analysis, clarification_response, feasibility, scope_planning, wbs_estimate, pricing`

**UI steps** (11 total — `VerticalWorkflowTimeline.tsx`):
Steps 1-4 are normal. Step 5 (`human_review`) is `uiOnly: true` — shares `clarification` DB status, activates when `clarification.questions` exist. Steps 6-11 are normal.

---

## Design System (PetaSight)

Always use semantic tokens, never raw Tailwind colors:
- `bg-primary` not `bg-[#DA365C]` — Primary: `#DA365C` (magenta)
- `bg-secondary` — Secondary: `#4F73CD` (blue)
- `text-foreground`, `bg-card`, `border-border`, `bg-success/warning/error/info`
- Font: Inter

---

## Start

```bash
cd backend && npm run dev          # port 3038
cd frontend && npm run dev         # port 3000
aws sso login --profile dev-admin  # required for Bedrock
PGPASSWORD=dev123 psql -U nithya -h 127.0.0.1 -d lumina_scope
```

---

## Critical Reminders

- **DB is isolated** — never touch `agriplast`/`maxima` databases
- **Verify agents exist** before referencing — do not hallucinate implementations
- **scopePlannerAgent bug** — uses `aiService.generateText()` not `this.invokeAI()`, LLM usage untracked
- **Related project**: `app-maxima` at `/home/nithya/agriplast_latest/app-maxima/` (reference only)
- **Deferred items**: see `parkinglot.md` at project root
