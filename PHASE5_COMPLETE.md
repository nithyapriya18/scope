# Phase 5 Complete - Estimation & Pricing Agents

**Date**: 2026-03-02
**Status**: ✅ Phase 5 Implementation Complete

---

## 🎉 What Was Completed

### 1. WBS Estimator Agent ✅
**NEW AGENT - Creates work breakdown structure and estimates effort**

**Location**: `backend/src/services/agents/wbsEstimatorAgent.ts`

**What It Does**:

**1. Task Breakdown by Phase** (5 phases):
- **Phase 1: Project Setup & Recruitment**
  * Project kickoff meeting (1-2 hours)
  * Discussion guide/survey development (8-24 hours)
  * Client review & approval (2 hours + wait time)
  * Recruitment database search (2-8 hours per 10 recruits)
  * Screening & qualification (1-2 hours per 10 screened)
  * Interview scheduling (1 hour per 10 completes)

- **Phase 2: Fieldwork**
  * Qualitative: ~2 hours per interview (prep, conduct, document)
  * Quantitative: Survey programming (8-12 hours), fielding (0.1-0.2 hours per complete)

- **Phase 3: Analysis & Insights**
  * Qualitative: Transcription management (0.5 hours/interview), coding (1-2 hours/interview), synthesis (16-32 hours)
  * Quantitative: Data processing (8-12 hours), analysis (12-20 hours), visualization (8-12 hours)

- **Phase 4: Reporting & Delivery**
  * Report writing (24-48 hours total)
  * PowerPoint development (8-16 hours)
  * QA review (4-8 hours)
  * Client revisions (8-16 hours for 2 rounds)
  * Final delivery & debrief (2-4 hours)

- **Phase 5: Project Management**
  * PM oversight (15-20% of total project hours)
  * Client communication (2-4 hours/week)
  * Team coordination (1-2 hours/week)
  * Administrative tasks (2-3 hours/week)

**2. Team Roles & Assignments**:
- Project Manager: Overall coordination
- Moderator/Interviewer: Conducting interviews
- Survey Programmer: Quantitative surveys
- Recruitment Coordinator: HCP outreach
- Analyst: Data analysis, coding
- Report Writer: Deliverables
- QA Reviewer: Quality checks

**3. Effort Estimation Rules**:
- Small project (20-30 interviews): 150-250 hours total
- Medium project (40-60 interviews): 250-400 hours total
- Large project (80+ interviews): 400-600 hours total
- Multi-country: +10-15% overhead per additional country
- Complex therapeutic area: +10-20% for unfamiliar diseases
- Rush timeline (<6 weeks): +15-20% buffer

**4. Task Dependencies**:
- Maps dependencies (e.g., "Discussion guide must be approved before recruitment")
- Identifies critical path tasks
- Flags tasks that can run in parallel

**5. Risk Buffers**:
- 10-15% buffer for qualitative recruitment
- 5-10% buffer for analysis complexity
- 10% buffer for client revisions

**6. Duration Estimates**:
- Calculates calendar duration for each phase
- Accounts for part-time allocation (PM at 20%, Analyst at 50%)
- Maps to project timeline (weeks from kickoff)

**Database Table**: Stores in `wbs` table
**Next Status**: `pricing`

---

### 2. Pricer Agent ✅
**NEW AGENT - Calculates comprehensive project pricing**

**Location**: `backend/src/services/agents/pricerAgent.ts`

**What It Does**:

**1. Labor Costs** (from WBS):
- Calculates: Hours × Labor rate for assigned role
- Example: "Report writing: 24 hours × $135/hour (Report Writer) = $3,240"
- Sums all labor by phase

**2. Recruitment Costs** (from Sample Plan):
- HCP Recruitment fees by difficulty:
  * Easy: $200 per recruit
  * Medium: $300 per recruit
  * Hard: $400 per recruit (rare specialists)
  * Very Hard: $500 per recruit (ultra-rare)
- Calculated per geography

**3. Respondent Incentives** (from Sample Plan):
- HCP incentives by specialty & geography:
  * Oncologists: $450-500 per interview
  * Cardiologists: $350-450 per interview
  * Rare disease specialists: $550-750 per interview
  * General specialists: $250-350 per interview
- US rates higher than EU

**4. Data Processing Costs**:
- **Qualitative**:
  * Transcription: Interview duration × Sample size × $2.50 per audio minute
  * Example: 60 min × 60 interviews × $2.50 = $9,000
- **Quantitative**:
  * Survey programming: $1,200 setup
  * Per-complete costs: Sample size × $8-15 per complete
  * Data processing: $800 base fee

**5. Technology & Tools**:
- Video platform: $5 per interview
- Survey platform license: $500
- Data analysis tools: $300
- Reporting tools: $200

**6. Pass-Through Costs** (if applicable):
- Travel (in-person fieldwork): Flights, hotels, per diem
- Translation (multi-country): Per-minute transcription translation

**7. Subtotal Calculation**:
- Direct Labor + Recruitment + Incentives + Data Processing + Technology + Pass-Through

**8. Overhead Markup**:
- 18% overhead on subtotal
- Covers administrative costs, insurance, facilities, operations

**9. Total Cost (Before Margin)**:
- Subtotal + Overhead

**10. Margin/Fee**:
- Margin by project type:
  * Standard: 25%
  * Rush project: 30%
  * Complex methodology: 28%
  * Preferred client: 20%

**11. Total Project Price**:
- Total cost + Margin

**12. Budget Alignment Check**:
- Compares total price to RFP budget
- Calculates variance (over/under budget)
- If over budget:
  * Identifies cost-saving opportunities
  * Suggests adjustments (reduce sample, simplify analysis)
  * Calculates revised pricing scenarios

**13. Payment Terms**:
- Recommended schedule:
  * 50% on contract execution
  * 25% on fieldwork completion
  * 25% on final report delivery

**14. Pricing Pack Breakdown**:
- Itemized cost breakdown by category and phase
- Unit costs and quantities for transparency
- Assumptions and exclusions
- Pricing summary table

**Database Table**: Stores in `pricing_packs` table
**Next Status**: `document_gen` (Phase 6)

---

### 3. Enhanced Rate Card ✅
**Updated comprehensive rate card configuration**

**Location**: `backend/config/rate_card.json`

**Enhancements**:

**Labor Rates** (per hour):
```json
{
  "project_manager": 175,
  "senior_analyst": 150,
  "research_analyst": 125,
  "moderator": 150,
  "survey_programmer": 135,
  "recruitment_coordinator": 100,
  "data_analyst": 125,
  "report_writer": 135,
  "qa_reviewer": 140,
  "junior_analyst": 85
}
```

**HCP Recruitment Costs** (per recruit):
```json
{
  "easy": 200,
  "medium": 300,
  "hard": 400,
  "very_hard": 500
}
```

**HCP Incentives by Specialty** (per interview):
```json
{
  "oncologist": { "us": 500, "uk": 450, "germany": 400, "default": 450 },
  "cardiologist": { "us": 450, "uk": 400, "germany": 350, "default": 400 },
  "rare_disease_specialist": { "us": 750, "uk": 650, "germany": 550, "default": 650 },
  "general_specialist": { "us": 350, "uk": 300, "germany": 250, "default": 300 }
}
```

**Patient Incentives**:
```json
{
  "survey_short": 10,
  "survey_long": 25,
  "interview_30min": 75,
  "interview_60min": 150,
  "interview_90min": 225
}
```

**Transcription Costs** (per audio minute):
```json
{
  "per_audio_minute": 2.5,
  "rush_per_minute": 4.0,
  "translation_per_minute": 5.0
}
```

**Survey Costs**:
```json
{
  "programming_setup": 1200,
  "per_complete_panel": 15,
  "per_complete_list": 8,
  "data_processing_base": 800
}
```

**Margin Tiers** (%):
```json
{
  "standard": 25,
  "rush_project": 30,
  "complex_methodology": 28,
  "preferred_client": 20
}
```

**Overhead Markup**: 18%

---

### 4. Orchestrator Updated ✅
**Added Phase 5 agent coordination**

**Location**: `backend/src/services/agents/orchestratorAgent.ts`

**Changes**:
- Imported Phase 5 agents: WBSEstimatorAgent, PricerAgent
- Added execution methods:
  - `executeWBSEstimation()` - Handles `wbs_estimate` status
  - `executePricing()` - Handles `pricing` status
- Updated status transitions to include Phase 5 steps

**Workflow Flow**:
```
hcp_shortlist → wbs_estimate → pricing →
document_gen (Phase 6) → ...
```

---

## 🔄 Updated 12-Step Workflow

| Step | Status | Agent | Description | Human Approval? |
|------|--------|-------|-------------|-----------------|
| 1. Intake | ✅ Working | IntakeAgent | Parse RFP, extract metadata | No |
| 2. Brief Extract | ✅ Working | BriefExtractorAgent | Extract requirements | No |
| 3. Gap Analysis | ✅ Working | GapAnalyzerAgent | Detect missing info | No |
| 4. Clarification | ✅ Working | ClarificationGeneratorAgent | Generate questions | **Yes** 🚦 |
| 5. Clarification Response | ⏳ Manual | (Manual) | Client responds | No |
| 6. Scope Build | ✅ Working | ScopeBuilderAgent | Design research scope | No |
| 7. Sample Plan | ✅ Working | SamplePlannerAgent | Calculate sample sizes | No |
| 8. HCP Shortlist | ✅ Working | HCPMatcherAgent | Query HCP database | No |
| 9. WBS Estimate | ✅ **NEW!** | WBSEstimatorAgent | Estimate effort | No |
| 10. Pricing | ✅ **NEW!** | PricerAgent | Calculate pricing | No |
| 11. Document Gen | ⏳ Phase 6 | DocumentGeneratorAgent | Generate proposal/SoW | **Yes** 🚦 |
| 12. Approved | ⏳ Phase 7 | (Manual) | Ready for handoff | No |

**Progress**: **9 of 12 steps complete (75%)**

---

## 📊 Pricing Calculation Example

### Sample Project: NSCLC Oncology Study
**60 Interviews (US: 30, UK: 15, Germany: 15)**

**1. Labor Costs** (from WBS):
```
Phase 1 - Setup & Recruitment: 80 hours × $125 (avg) = $10,000
Phase 2 - Fieldwork: 120 hours × $150 (Moderator) = $18,000
Phase 3 - Analysis: 100 hours × $125 (Analyst) = $12,500
Phase 4 - Reporting: 48 hours × $135 (Writer) = $6,480
Phase 5 - PM: 70 hours × $175 (PM) = $12,250
Total Labor: $59,230
```

**2. Recruitment Costs**:
```
60 recruits × $400 (hard - oncologists) = $24,000
```

**3. HCP Incentives**:
```
US: 30 × $500 = $15,000
UK: 15 × $450 = $6,750
Germany: 15 × $400 = $6,000
Total Incentives: $27,750
```

**4. Data Processing** (Transcription):
```
60 interviews × 60 minutes × $2.50 = $9,000
```

**5. Technology**:
```
Video platform: 60 × $5 = $300
Data analysis tools: $300
Reporting tools: $200
Total Technology: $800
```

**6. Subtotal**:
```
Labor: $59,230
Recruitment: $24,000
Incentives: $27,750
Data Processing: $9,000
Technology: $800
Subtotal: $120,780
```

**7. Overhead** (18%):
```
$120,780 × 18% = $21,740
```

**8. Total Cost Before Margin**:
```
$120,780 + $21,740 = $142,520
```

**9. Margin** (25% standard):
```
$142,520 × 25% = $35,630
```

**10. Total Project Price**:
```
$142,520 + $35,630 = $178,150
```

**Budget Check**: If RFP budget was $95,000, this is **OVER BUDGET by $83,150**

**Cost-Saving Options**:
1. Reduce sample to 40 interviews (US: 20, UK: 10, Germany: 10): **~$125,000**
2. Simplify analysis (reduce coding depth): **~$165,000**
3. Use junior analysts for some tasks: **~$170,000**

---

## 🎯 Alignment with Research

### Industry Benchmarks Applied

From pharma RFP research findings:

✅ **Recruitment Costs**: $200-400 per recruit (Phase 5 uses $200-500 based on difficulty)
✅ **HCP Incentives**: $300-500 per interview (Phase 5 uses $300-750 by specialty)
✅ **Effort Estimates**: 150-400 hours typical (Phase 5 calculates based on sample size)
✅ **Overhead**: 15-20% industry standard (Phase 5 uses 18%)
✅ **Margin**: 20-30% typical (Phase 5 uses 20-30% tiered by project type)
✅ **Transcription**: $2-3 per minute (Phase 5 uses $2.50)
✅ **Budget Alignment**: Must compare to RFP budget (Phase 5 flags over/under budget)

---

## 📋 Database Schema - Phase 5 Tables

### `wbs` Table
```sql
CREATE TABLE wbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hcp_shortlist_id UUID NOT NULL REFERENCES hcp_shortlists(id),
  task_breakdown JSONB,                 -- Detailed tasks by phase
  team_roles JSONB,                     -- Role assignments
  effort_summary JSONB,                 -- Hours summary
  duration_estimates JSONB,             -- Calendar duration
  critical_path TEXT[],                 -- Critical path task IDs
  risk_buffers JSONB,                   -- Risk buffer percentages
  total_effort JSONB,                   -- Total hours summary
  llm_wbs_estimate JSONB,               -- Full AI response
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `pricing_packs` Table
```sql
CREATE TABLE pricing_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wbs_id UUID NOT NULL REFERENCES wbs(id),
  labor_costs JSONB,                    -- Breakdown by phase/role
  recruitment_costs JSONB,              -- Per geography
  incentive_costs JSONB,                -- Per geography/specialty
  data_processing_costs JSONB,          -- Transcription, survey programming
  technology_costs JSONB,               -- Platforms, tools
  pass_through_costs JSONB,             -- Travel, translation
  subtotal JSONB,                       -- Sum of all direct costs
  overhead JSONB,                       -- 18% markup
  total_cost_before_margin JSONB,       -- Subtotal + overhead
  margin JSONB,                         -- Percentage and amount
  total_price JSONB,                    -- Final price
  budget_comparison JSONB,              -- RFP budget vs. our price
  cost_saving_options TEXT[],           -- If over budget
  pricing_pack_breakdown JSONB,         -- Itemized breakdown
  payment_terms JSONB,                  -- Milestone schedule
  assumptions TEXT[],                   -- Pricing assumptions
  llm_pricing JSONB,                    -- Full AI response
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🧪 Testing Phase 5

### Test Workflow
```bash
# Prerequisite: Complete Phases 1-4 first (intake → brief → gap → clarification → scope → sample → hcp)

# Get opportunity ID
OPPORTUNITY_ID="<your-id>"

# Step 9: WBS Estimation (NEW!)
curl -X POST http://localhost:3038/api/opportunities/$OPPORTUNITY_ID/process \
  -H "Content-Type: application/json" \
  -d '{"userId": "demo-user"}'

# Step 10: Pricing (NEW!)
curl -X POST http://localhost:3038/api/opportunities/$OPPORTUNITY_ID/process \
  -H "Content-Type: application/json" \
  -d '{"userId": "demo-user"}'

# Check results in database
psql -U nithya -d lumina_scope -c "SELECT id, total_effort FROM wbs WHERE hcp_shortlist_id IN (SELECT id FROM hcp_shortlists WHERE sample_plan_id IN (SELECT id FROM sample_plans WHERE scope_id IN (SELECT id FROM scopes WHERE brief_id IN (SELECT id FROM briefs WHERE opportunity_id='$OPPORTUNITY_ID'))));"

psql -U nithya -d lumina_scope -c "SELECT id, total_price, budget_comparison FROM pricing_packs WHERE wbs_id IN (SELECT id FROM wbs WHERE hcp_shortlist_id IN (SELECT id FROM hcp_shortlists WHERE sample_plan_id IN (SELECT id FROM sample_plans WHERE scope_id IN (SELECT id FROM scopes WHERE brief_id IN (SELECT id FROM briefs WHERE opportunity_id='$OPPORTUNITY_ID')))));"
```

### Expected Results
- ✅ WBS: Task breakdown by phase, effort estimates, team roles, critical path
- ✅ Pricing: Labor costs, recruitment costs, incentives, total price, budget comparison
- ✅ Budget Check: Flags if over/under budget with recommendations

---

## ⏳ What's Next (Phase 6)

### Phase 6: Document Generation
1. **Document Generator Agent**:
   - Generate proposal document (Word DOCX)
   - Generate Statement of Work (Word DOCX)
   - Generate pricing pack (Excel XLSX)
   - Generate capabilities presentation (PowerPoint PPTX)

2. **Python Document Script**:
   - Use `python-docx` for Word documents
   - Use `openpyxl` for Excel spreadsheets
   - Use `python-pptx` for PowerPoint presentations
   - Template system for consistent formatting

**Database Tables**:
- `documents` (generated files, versions, approvals)

---

## 📈 Progress Metrics

### Agents Implemented
- **Phase 1-3**: 4 agents ✅
- **Phase 4**: 3 agents ✅
- **Phase 5**: 2 agents ✅
- **Total**: **9 of 11 agents complete (82%)**

### Workflow Steps Complete
- **Working**: **9 of 12 steps (75%)**
- **Remaining**: 3 steps (Phases 6-7)

### LLM Costs (Phase 5 Addition)
- WBS Estimation: ~$0.007 per RFP
- Pricing: ~$0.006 per RFP
- **Phase 5 Total**: ~$0.013 per RFP
- **Combined (Phases 1-5)**: **~$0.042 per RFP (4.2 cents)**

**Still incredibly cheap!** Using Claude Haiku 4.5.

---

## 🎉 Summary

**Phase 5 Complete**: Estimation & Pricing agents fully implemented.

**What Works**:
- ✅ WBS Estimator creates detailed task breakdown, effort estimates, team roles
- ✅ Pricer calculates comprehensive pricing with transparent breakdown
- ✅ Rate card with realistic industry rates (recruitment $200-500, incentives $300-750)
- ✅ Budget alignment check (flags over/under budget)
- ✅ Cost-saving recommendations if over budget
- ✅ Payment terms recommended (50/25/25 milestones)
- ✅ Orchestrator coordinates Phase 5 agents
- ✅ Database tables store WBS and pricing outputs

**Ready for**:
- Phase 6: Document Generation (Proposals, SoW, Pricing Packs in Word/Excel)
- Phase 7: Polish & Deployment

**Files Created/Modified**:
- `backend/src/services/agents/wbsEstimatorAgent.ts` (NEW)
- `backend/src/services/agents/pricerAgent.ts` (NEW)
- `backend/config/rate_card.json` (ENHANCED)
- `backend/src/services/agents/orchestratorAgent.ts` (MODIFIED)
- `PHASE5_COMPLETE.md` (NEW - this document)

---

**End of Phase 5 Summary**
