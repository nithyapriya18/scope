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
intake → gate_participation (human) → brief_extract → gap_analysis → assumption_analysis
       → clarification → clarification_response
       → feasibility (HCPMatcher) → scope_planning (ScopePlanner)
       → wbs_estimate → pricing → gate_commercial (human) → document_gen → approved
Terminal states: declined, not_viable
```

**Auto-advance** (2s delay, in `opportunities/[id]/page.tsx`):
`intake, brief_extract, gap_analysis, assumption_analysis, clarification_response, feasibility, scope_planning, wbs_estimate, pricing`

**Human gates** (no auto-advance): `gate_participation`, `gate_commercial`

**UI steps** (11 total — `VerticalWorkflowTimeline.tsx`):
Steps 1-4 are normal. Step 5 (`human_review`) is `uiOnly: true` — shares `clarification` DB status, activates when `clarification.questions` exist. Steps 6-11 are normal.

**Gate 1 — Participation (after intake)**
- Orchestrator waits for intake job to be `completed` before advancing to `gate_participation`
- Frontend shows bid qualification form modal (see below)
- Endpoint: `POST /:id/gate/participation` → advances to `brief_extract` (yes) or `declined` (no)
- Saves `qualification_data` JSONB to `gate_decisions.ai_recommendation`

**Gate 2 — Commercial (after pricing)**
- After WBS/pricing completes → advances to `gate_commercial`
- Endpoint: `POST /:id/gate/commercial` → advances to `document_gen` (yes) or `not_viable` (no)

---

## Pharma PMR Bid Qualification Framework

Research basis: ESOMAR, MRS, BHBIA, IQVIA/Ipsos/Kantar Health best practices (2026).

### Five-Factor Bid/No-Bid Decision Model
| Factor | Weight | Key Questions |
|---|---|---|
| Win Probability | 30% | Relationship strength, incumbent status, competitive position |
| Strategic Fit | 25% | TA expertise, study type capability, business alignment |
| Resource Capacity | 20% | SME availability, geographic coverage, bandwidth |
| Profitability | 15% | Margin viability, deal size vs. response effort |
| Risk Level | 10% | Timeline realism, conflict of interest, contract terms |

### Automatic No-Bid Signals
- Conflict of interest (already working for competitor on same indication)
- Capability gap (study type or TA outside firm's expertise)
- Budget-price mismatch (budget far below realistic cost)
- Unrealistic timeline for required scope
- Repeated re-bids without awards from this client

### RFP Fields: Auto-Extracted vs. Manual

| Field | Auto-Extractable? | Source |
|---|---|---|
| Therapeutic Area | ✅ Yes | Intake agent |
| Study Type / Family | ✅ Yes | Intake agent (studyFamily) |
| Research Phase (Understand/Plan/Measure) | ✅ Yes | Intake agent |
| Geography / Markets | ✅ Yes | Intake agent |
| Submission Deadline | ✅ Yes | Intake agent |
| Budget Range | ⚠️ Sometimes | Intake or manual |
| Engagement Type (New vs. Extension) | ❌ Manual only | Internal knowledge |
| Client Relationship Status | ❌ Manual only | Internal knowledge |
| Competitive Situation | ❌ Manual only | Internal knowledge |
| Conflict of Interest | ❌ Manual only | Internal knowledge |
| Timeline Feasibility | ⚠️ Partial | Manual judgment |
| Strategic Value | ❌ Manual only | Internal knowledge |

### Engagement Type Options
- `new` — New engagement, no prior work with client on this scope
- `extension` — Adding markets/countries to an existing study
- `wave` — Wave 2+ of ongoing tracker/longitudinal panel
- `repeat` — Same study repeated in a new cycle
- `sole_source` — Client bypassed competitive bid, invited PetaSight directly

### Client Relationship Options
- `new_prospect` — No existing commercial relationship
- `existing` — Prior work completed, no formal agreement
- `preferred_provider` — Master Service Agreement (MSA) or preferred vendor status

### Competitive Situation Options
- `sole_source` — Only vendor invited (highest win probability)
- `shortlisted` — 2-3 vendors competing (manageable)
- `open` — Open competitive tender, 4+ vendors (resource-heavy, lower win rate)

### Budget Range Benchmarks (PMR industry)
- `<50k` — Small qualitative, 1 market, ~10-15 IDIs
- `50k_150k` — Mid-size, 1-3 markets, qual or small quant
- `150k_500k` — Multi-market, quantitative, complex design
- `500k_1m` — Global, large N, mixed methods
- `1m_plus` — Multi-year tracker or large-scale global program

### PMR Domain Classification (`pmrDomain` field — 7 domains)

Domains = **WHY** the research is being done (business/commercial objective).

| Value | Domain | Typical RFP signals |
|---|---|---|
| `patient_journey` | Patient Journey & Behavioral Insights | Patient experience, symptom-to-treatment mapping, adherence drivers, unmet needs, QoL impact |
| `hcp_insights` | HCP Insights | Physicians, nurses, pharmacists; prescribing habits, therapy perceptions, product usage observations |
| `kol_engagement` | KOL Engagement | Specialist interviews, scientific perspectives, treatment guideline shifts, future therapeutic trends |
| `market_access` | Market Access & Payer Research | Payers, HTA bodies, formulary decision-makers, reimbursement hurdles, value dossier, price sensitivity |
| `brand_health` | Brand Health & Launch Tracking | Brand awareness, message recall, NPS, adoption rates, pre/post launch tracking |
| `competitive_intelligence` | Competitive Intelligence | Competitor brand perceptions, pipeline awareness, prescribing share mapping, positioning gaps |
| `clinical_trial` | Clinical Trial Optimization | Protocol feasibility, patient recruitment hotspots, site investigator research, barriers to participation |

### Study Family Classification (`studyFamily` field — 8 families)

Study families = **HOW** the research will be designed and executed. One domain can use multiple families.

| Value | What it covers | Typical modality |
|---|---|---|
| `UNDERSTANDING_LANDSCAPE` | A&U studies, patient journey, KOL advisory boards, ethnography, disease burden, treatment pathway audits | Qual-led or mixed |
| `TRACKING_MONITORING` | Brand trackers, launch-wave tracking, awareness monitors, adherence panels, promotional response tracking | Quant |
| `TESTING_OPTIMIZATION` | Concept tests, message testing, creative testing, positioning tests, detail aid testing, usability | Mixed |
| `TRADEOFF_CHOICE` | Conjoint, DCE, MaxDiff, product profile optimization, label claim trade-offs | Quant (statistical) |
| `SEGMENTATION_TARGETING` | HCP and patient segmentation, market sizing, persona development, attitudinal profiling | Mixed |
| `PRICING_MARKET_ACCESS` | WTP, payer research, HTA landscape, formulary decision simulations, value dossier validation | Mixed |
| `COMPETITIVE_INTELLIGENCE` | Competitor perception audits, pipeline awareness surveys, HCP share mapping, positioning gap analysis | Quant or mixed |
| `CLINICAL_TRIAL_SUPPORT` | Protocol feasibility, site IDIs, patient recruitment research, burden-of-participation studies | Mixed |

**Phase mapping:**
- Understand: `UNDERSTANDING_LANDSCAPE`, `SEGMENTATION_TARGETING`
- Plan: `TESTING_OPTIMIZATION`, `TRADEOFF_CHOICE`, `CLINICAL_TRIAL_SUPPORT`
- Measure: `TRACKING_MONITORING`, `PRICING_MARKET_ACCESS`, `COMPETITIVE_INTELLIGENCE`

### Methodology (`methodology` field — 3 modalities)

Methodology = **execution mode** of a study family. Not a separate classification layer.

| Value | Description | Typical study families |
|---|---|---|
| `qualitative` | Exploratory, small N, rich insights — IDIs, focus groups, advisory boards, ethnography | UNDERSTANDING_LANDSCAPE, early SEGMENTATION |
| `quantitative` | Statistical, large N, surveys — online surveys, trackers, choice modeling | TRACKING_MONITORING, TRADEOFF_CHOICE |
| `mixed` | Qual → Quant sequential or triangulation | TESTING_OPTIMIZATION, SEGMENTATION_TARGETING, PRICING_MARKET_ACCESS |

### gate_decisions.ai_recommendation JSONB Schema (participation gate)
```json
{
  "clientName": "Pfizer",
  "therapeuticArea": "Oncology",
  "studyType": "Quantitative",
  "studyFamily": "PRICING_MARKET_ACCESS",
  "pmrDomain": "market_access",
  "geography": ["US", "EU5"],
  "budgetRange": "150k_500k",
  "engagementType": "new",
  "clientRelationship": "existing",
  "competitiveSituation": "shortlisted",
  "conflictOfInterest": "none",
  "capabilityFit": "core",
  "timelineFeasibility": "comfortable",
  "strategicValue": "strategic",
  "notes": "Strong relationship with Pfizer oncology team. No conflicts."
}
```

**capabilityFit values:** `core` (core competency), `capable` (within scope, some learning), `outside` (blocks Participate — must decline)
**Bid blocked when:** `conflictOfInterest === 'conflict'` OR `capabilityFit === 'outside'`

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

## Output Quality Rule

**Never compromise AI output quality or completeness to work around technical limitations.**
When an AI agent produces truncated, malformed, or unparseable output:
- Use repair libraries (e.g. `jsonrepair`) instead of simplifying prompts
- Increase `maxTokens` instead of reducing output structure
- Find a different technical approach — do not degrade the output schema

---

## Critical Reminders

- **DB is isolated** — never touch `agriplast`/`maxima` databases
- **Verify agents exist** before referencing — do not hallucinate implementations
- **scopePlannerAgent bug** — uses `aiService.generateText()` not `this.invokeAI()`, LLM usage untracked
- **Related project**: `app-maxima` at `/home/nithya/agriplast_latest/app-maxima/` (reference only)
- **Deferred items**: see `parkinglot.md` at project root
