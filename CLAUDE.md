# CLAUDE.md - Lumina Scope

**Model**: Claude Sonnet 4.6 — `global.anthropic.claude-sonnet-4-6` (always, no exceptions)
**Status**: Phase 7 Complete — all 11 agents, 12-step workflow functional

---

## 1. RULES

**Think First** — Use AskUserQuestion for non-trivial work (3+ steps, architectural decisions, ambiguous requirements, destructive actions). State assumptions. Push back when simpler exists. Stop and re-plan if things go sideways.

**Simplicity** — Minimum code solving the problem. No speculative features, abstractions, or error handling for impossible scenarios. If 200 lines could be 50, rewrite it.

**Surgical Changes** — Match existing style. Don't refactor unbroken code. Remove only orphans your changes created. Mention (don't delete) unrelated dead code.

**Verify Before Done** — Define success criteria, loop until proven. Never mark complete without proof.

**Autonomous** — Execute immediately. Chain commands. Fix bugs without hand-holding. Only ask if permission denied or genuinely ambiguous.

**Demand Elegance** — For non-trivial changes: "Is there a more elegant way?" If hacky: implement the elegant solution.

**Self-Improvement** — After any correction: update `tasks/lessons.md`. Review it at session start. Same mistake twice = system failure.

**AI Behavior**:
| Situation | Action |
|-----------|--------|
| Ambiguous requirements | ASK |
| Destructive / irreversible | ASK |
| Multiple valid approaches | ASK |
| Clear intent, reversible | ACT |

**Status Reporting**: NEVER create `*.md` status files (FINAL_FIXES.md, STATUS_UPDATE.md, SUMMARY.md, etc.). Report in chat only. Only create docs when explicitly requested.

**Task Management**: Write plan to `tasks/todo.md` → check in → mark complete as you go → update `tasks/lessons.md` after corrections.

---

## 2. PROJECT

**Lumina Scope** — AI-driven RFP response automation for pharma primary market research. Pharma companies (Pfizer, Merck, etc.) send RFPs to PetaSight. We automate intake → requirements → gaps → clarifications → scope → pricing → proposal.

**Business Model** (critical):
- Pharma sends us RFP → we respond with a proposal → we compete to win the contract
- RFP = their ask. Proposal = our bid. Opportunity = an RFP we received.

**Architecture**:
| Layer | Tech | Port |
|---|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript + Tailwind | 3000 |
| Backend | Express.js + TypeScript | 3038 |
| Database | PostgreSQL `lumina_scope` (28 tables) | 5432 |
| AI | AWS Bedrock — `global.anthropic.claude-sonnet-4-6` | — |

**DB connection**: TCP `127.0.0.1:5432`, user `nithya`, password `dev123` (not Unix socket — avoids peer auth)

**Auth**: Google OAuth (passport-google-oauth20) + hardcoded demo `demo@lumina.com` / `demo123`

---

## 3. KEY PATHS

```
lumina_scope_dontdelete/
├── backend/src/
│   ├── index.ts                          # Express entry, port 3038
│   ├── routes/opportunities.ts           # Main RFP workflow API
│   ├── routes/{jobs,auth,analytics,chat}.ts
│   ├── services/
│   │   ├── bedrock.ts                    # AWS Bedrock (Sonnet 4.6)
│   │   ├── jobQueue.ts                   # PostgreSQL job queue
│   │   ├── aiServiceFactory.ts
│   │   └── agents/
│   │       ├── baseAgent.ts              # Base: job tracking, usage, LLM
│   │       ├── orchestratorAgent.ts      # Workflow state machine
│   │       ├── intakeAgent.ts
│   │       ├── briefExtractorAgent.ts
│   │       ├── gapAnalyzerAgent.ts
│   │       ├── assumptionAnalyzerAgent.ts
│   │       ├── clarificationGeneratorAgent.ts
│   │       ├── scopePlannerAgent.ts      # uses aiService.generateText() — usage not tracked (bug)
│   │       ├── hcpMatcherAgent.ts
│   │       ├── wbsEstimatorAgent.ts
│   │       ├── pricerAgent.ts
│   │       └── documentGeneratorAgent.ts
│   └── lib/sql.ts                        # postgres client wrapper
├── backend/config/rate_card.json
├── backend/scripts/generate_documents.py # Physical Word/Excel/PPT generation
├── frontend/app/
│   ├── dashboard/page.tsx
│   ├── opportunities/[id]/page.tsx       # Auto-advances workflow
│   ├── analytics/page.tsx
│   └── intelligence/page.tsx
└── frontend/components/
    ├── VerticalWorkflowTimeline.tsx
    └── ChatInterface.tsx
```

---

## 4. WORKFLOW

**State machine** (orchestratorAgent.ts):
```
intake → brief_extract → gap_analysis → assumption_analysis
       → clarification [APPROVAL] → clarification_response
       → scope_planning + feasibility (parallel Promise.all)
       → wbs_estimate → pricing → document_gen [APPROVAL] → approved
```

**Auto-advance steps** (opportunity detail page, 2s delay): intake, brief_extract, gap_analysis, clarification_response, scope_planning, feasibility, wbs_estimate, pricing

**Manual steps**: clarification (human review), document_gen (final approval)

**Agent chain dependencies**: WBSEstimator requires HCP shortlist → Pricer requires WBS → DocumentGenerator requires pricing

---

## 5. DESIGN SYSTEM (PetaSight)

Always use semantic Tailwind classes — never raw Tailwind colors:
- `bg-primary` NOT `bg-primary-500` or `bg-[#DA365C]`
- `text-foreground` NOT `text-gray-900 dark:text-white`
- `text-foreground-secondary`, `text-foreground-tertiary`
- `bg-card` NOT `bg-white dark:bg-neutral-900`
- `border-border` NOT `border-gray-200 dark:border-gray-800`
- `bg-success/warning/error/info`, `text-success/warning/error/info`

Brand colors: Primary `#DA365C` (magenta), Secondary `#4F73CD` (blue), Info `#02B4C7` (cyan)
Font: Inter (Google Fonts)

---

## 6. STANDARDS

**Git commits**: `feat|fix|refactor|docs|chore: description`
**Branches**: `feature|fix|refactor/short-name`

**TypeScript naming**: `camelCase` variables/functions, `PascalCase` classes/components, `SCREAMING_SNAKE` constants

**API responses**:
```json
{ "success": true, "data": { "id": 1 } }
{ "success": false, "error": { "code": "ERROR_404", "message": "Not found" } }
```

**Component pattern**:
```tsx
// 'use client' only for hooks/events
export function Component({ title, className, onAction }: Props) {
  return <div className={cn("base-styles", className)}>{title}</div>;
}
```

**Security**: No committed secrets. Zod validation at boundaries. Parameterized queries only (postgres template literals). Sanitize error messages.

---

## 7. START & TEST

```bash
# Backend (port 3038)
cd /home/nithya/lumina_scope_dontdelete/backend && npm run dev

# Frontend (port 3000)
cd /home/nithya/lumina_scope_dontdelete/frontend && npm run dev

# AWS SSO (required for Bedrock)
aws sso login --profile dev-admin

# Health check
curl http://localhost:3038/health

# Create test RFP
curl -X POST http://localhost:3038/api/opportunities \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo-user","emailBody":"Need 30 oncologist interviews in US, NSCLC treatment patterns, $50K budget, deadline March 31","emailSubject":"RFP: NSCLC Study","clientName":"PharmaCorp"}'

# DB check
psql -U nithya -d lumina_scope -c "SELECT id, status, client_name FROM opportunities ORDER BY created_at DESC LIMIT 5;"
```

---

## 8. CRITICAL REMINDERS

1. **Model**: Always `global.anthropic.claude-sonnet-4-6` — never Haiku or Opus unless explicitly asked
2. **Verify agents exist** before referencing them — do not hallucinate implementations
3. **DB is isolated** — never touch agriplast/maxima databases
4. **scopePlannerAgent bug** — calls `aiService.generateText()` instead of `this.invokeAI()`, so LLM usage is not tracked
5. **ChatLayout** (`frontend/components/ChatLayout.tsx`) — do not modify, proven pattern from app-maxima
6. **Related projects**: `app-maxima` at `/home/nithya/agriplast_latest/app-maxima/` (reference only)
