# Parking Lot

Items to address in future sessions. Add new items with `park: <description>`.

---

## Backend / Agents

- Email SMTP configuration: `send-clarification-email` endpoint currently hardcodes `to: nithya@petasight.com`. Make this configurable via env var `CLARIFICATION_EMAIL_TO` or per-user setting.
- `scopePlannerAgent.ts` calls `aiService.generateText()` instead of `this.invokeAI()` — LLM usage is NOT tracked in the `llm_usage` table for that agent. Fix to use `this.invokeAI()`. ✅ Fixed 2026-03-19
- **Step 6 (Feasibility / HCPMatcherAgent) not completing** — job starts but never marks as done. Possibly an error in `hcpMatcherAgent.ts` that gets swallowed (non-fatal path in orchestrator). Needs investigation: check backend logs when status = `feasibility`, review what `hcpMatcherAgent.execute()` returns and whether `UPDATE opportunities SET status = 'feasibility'` is running.
- `WBSEstimatorAgent` not yet implemented (Phase 3 TODO in orchestratorAgent.ts lines 280-288)
- `PricerAgent` not yet implemented (Phase 3 TODO in orchestratorAgent.ts lines 290-298)
- `DocumentGeneratorAgent` not yet implemented (Phase 3 TODO in orchestratorAgent.ts lines 300-308)
- Demo user UUID `a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0` hardcoded in VerticalWorkflowTimeline — should come from current auth session

## Frontend / UI

- Budget field in "Edit Bid" modal (opportunity detail) is hardcoded to `$250,000` with `disabled`. Should be calculated from WBS/pricing once those agents are implemented.
- "View files" button in dashboard table row fires `alert()` — implement proper file viewer modal
- Row-level "Export" button in dashboard fires `alert()` — implement proper single-record export
- Footer bar in bid detail page has hardcoded "Next Step: Feasibility Check" — should be dynamic based on current status
- `VerticalWorkflowTimeline` hardcodes demo user UUID in upload/skip handlers — use current user from auth context

## Infrastructure / Config

- Google OAuth: currently requires `aws sso login --profile dev-admin` for Bedrock. Document AWS SSO token refresh process and add auto-refresh or better error handling when token expires.
- No `.env.example` file — create one documenting all required env vars

## Product / Workflow

- The `assumption_analysis` step (AssumptionAnalyzerAgent) runs silently inside `gap_analysis` status — consider surfacing its output separately in the Gaps & Assumptions modal
- The brief is created fresh in step 2 and never updated downstream. Steps 3-6 should progressively enrich it.
- Rate card in `backend/config/rate_card.json` — review pricing tiers before any client demos
- `clarification.status` field usage is unclear — audit all places it's set/read
