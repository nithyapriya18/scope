# Phase 1 Complete: Database Foundation & Study Library ✅

**Completed**: 2026-03-07
**Duration**: ~1 hour
**Status**: All 17 new tables created, seeded, and verified

---

## 📦 What Was Delivered

### 1. Database Migration (`8ba8be5cdbe2_add_phase1_foundation_tables.py`)

Created **17 new tables** for multi-tenancy and study library:

#### **Multi-Tenancy Foundation**
- `tenants` - Multi-tenant support with settings and branding
- Added `tenant_id` to all 11 existing tables (users, opportunities, briefs, etc.)

#### **Study Library Tables (MECE Taxonomy)**
- `study_families` - 6 MECE categories (Understanding, Tracking, Testing, Trade-off, Segmentation, Pricing)
- `study_types` - 30+ study types with audience, mode, difficulty tags
- `study_definitions` - Playbooks linking types to task/question/multiplier sets
- `deliverable_definitions` - Standard deliverables library (reports, data, presentations)

#### **Task Library Tables**
- `task_definitions` - 48 atomic tasks with base hours by role, units expression, conditions
- `task_sets` - Named bundles of tasks (qual_standard, quant_standard, conjoint_standard, tracker_standard)

#### **Question Library Tables**
- `question_sets` - Clarification question templates by study type

#### **Multiplier Library Tables**
- `multiplier_definitions` - 12 complexity multipliers (LOI, rush, multi-country, conjoint complexity, etc.)
- `multiplier_sets` - Named bundles of multipliers per study type

#### **Pricing Tables**
- `rate_cards` - Hourly rates by role (PM, analyst, statistician, programmer, etc.)
- `oop_catalog_items` - Out-of-pocket costs (panels, incentives, translation, travel)
- `vendors` - Vendor directory

#### **Template Tables**
- `template_sets` - Document template URIs (proposal, SoW, pricing pack)
- `workplan_templates` - Milestone-based timelines

---

## 📊 Seed Data Loaded

### **Study Library**
- ✅ 6 study families
- ✅ 27 study types (qual, quant, conjoint, tracker, segmentation, pricing)
- ✅ 27 study definitions (fully linked to task/question/multiplier sets)
- ✅ 15 deliverable definitions

### **Task Library**
- ✅ 48 task definitions across 5 phases:
  - Design: 9 tasks (kickoff, discussion guide, questionnaire, conjoint design, IRB)
  - Programming: 4 tasks (survey programming, testing, soft launch)
  - Fieldwork: 8 tasks (recruitment, moderation, transcription, translation)
  - Analysis: 9 tasks (coding, thematic analysis, data cleaning, tabulation, conjoint analysis)
  - Reporting: 11 tasks (topline, report drafting, PPT, QC, readout)
  - PM: 7 tasks (weekly PM, vendor management, budget tracking, closeout)
- ✅ 4 task sets (qual_standard, quant_standard, conjoint_standard, tracker_standard)

### **Multiplier Library**
- ✅ 12 multiplier definitions:
  - M_LOI: Length of interview (0.8x to 1.8x)
  - M_RUSH: Timeline pressure (1.0x to 1.5x)
  - M_MULTI_COUNTRY: Multi-country coordination (1.0x to 1.8x)
  - M_MULTI_LANGUAGE: Translation complexity (1.0x to 1.5x)
  - M_AUDIENCE_DIFFICULTY: Hard-to-reach audiences (1.0x to 1.7x)
  - M_CONJOINT_COMPLEXITY: Attribute count (1.0x to 2.0x)
  - M_SAMPLE_SIZE: Large samples (1.0x to 1.5x)
  - M_REPORTING_DEPTH: Report customization (0.5x to 1.6x)
  - M_CLIENT_REVIEW: Review intensity (0.8x to 1.8x)
  - M_REGULATORY: IRB/ethics (1.0x to 2.0x)
  - M_DATA_COMPLEXITY: Complex data structures (1.0x to 1.8x)
  - M_VENDOR_COORD: Vendor management (1.0x to 1.4x)
- ✅ 4 multiplier sets (qual, quant, conjoint, tracker)

### **Question Library**
- ✅ 4 question sets:
  - Qualitative: 5 questions (interview length, moderator, guide, recording, transcripts)
  - Quantitative: 6 questions (LOI, incidence, quotas, screening, platform, data format)
  - Conjoint: 5 questions (attributes, CBC type, choice tasks, HB estimation, simulator)
  - Tracker: 5 questions (wave frequency, count, historical data, refresh, dashboard)

### **Pricing Catalog**
- ✅ 2 rate cards:
  - PetaSight Standard Rates 2026: 12 roles with cost/sell rates
    - PM: $195/hr, Analyst: $145/hr, Statistician: $175/hr, Programmer: $125/hr, etc.
- ✅ 17 OOP catalog items:
  - Panels: HCP US ($75), EU ($85), Asia ($95), Patient US ($45), EU ($55), Payer ($125)
  - Incentives: HCP 30min ($150), 60min ($300), Patient 30min ($75), 60min ($150)
  - Translation: $35/page, Back-translation: $45/page
  - Travel: Domestic ($1,200), International ($3,500)
  - Misc: IRB ($2,500), Platform ($500)

### **Tenant Data**
- ✅ 1 demo tenant: PetaSight Demo (`a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0`)
- ✅ Linked demo user to tenant
- ✅ Linked existing opportunities to tenant

---

## 🔗 How Study Definitions Work

Each study type is now a **complete playbook**:

```
Study Type: "Deep Dive Qualitative"
├── Family: Understanding & Diagnosis
├── Task Set: qual_standard (21 tasks)
│   ├── T_KICKOFF
│   ├── T_DISCUSSION_GUIDE
│   ├── T_RECRUITMENT_QUAL
│   ├── T_MODERATION
│   ├── T_TRANSCRIPTION
│   ├── T_CODING
│   ├── T_THEMATIC_ANALYSIS
│   └── ... (14 more tasks)
├── Question Set: qual_standard (5 clarification questions)
│   ├── Q_INTERVIEW_LENGTH
│   ├── Q_IDI_MODERATOR
│   ├── Q_DISCUSSION_GUIDE
│   └── ... (2 more)
├── Multiplier Set: qual_standard_multipliers (8 multipliers)
│   ├── M_RUSH
│   ├── M_MULTI_COUNTRY
│   ├── M_AUDIENCE_DIFFICULTY
│   └── ... (5 more)
└── Default Deliverables: [exec_summary, final_report, transcript_verbatims, readout_ppt]
```

**This enables deterministic WBS calculation in Phase 2:**
1. Agent identifies study type from RFP
2. Loads task set → calculates base hours
3. Applies multipliers → adjusts for complexity
4. Calculates pricing from rate card
5. Generates WBS with line items

---

## 🧪 Verification Queries

```sql
-- View all study types with linked sets
SELECT
  st.type_code,
  st.display_name,
  sf.family_code,
  sd.task_set_code,
  sd.question_set_code,
  sd.multiplier_set_code,
  array_length(sd.default_deliverables, 1) as deliverable_count
FROM study_definitions sd
JOIN study_types st ON st.type_code = sd.type_code
JOIN study_families sf ON sf.family_code = st.family_code
ORDER BY sf.sort_order, st.type_code;

-- View task definitions by phase
SELECT phase, COUNT(*), STRING_AGG(task_code, ', ' ORDER BY task_code) as tasks
FROM task_definitions
GROUP BY phase
ORDER BY phase;

-- View multiplier ranges
SELECT
  multiplier_code,
  display_name,
  driver_field,
  jsonb_object_keys(lookup_table) as value_range
FROM multiplier_definitions
ORDER BY multiplier_code;

-- View rate card
SELECT
  card_name,
  jsonb_array_length(rate_items) as role_count,
  is_active
FROM rate_cards;
```

---

## 📁 Files Created

### Migration
- `/home/nithya/db-migrations/lumina/migrations/versions/8ba8be5cdbe2_add_phase1_foundation_tables.py`
- `/home/nithya/db-migrations/lumina/migrations/script.py.mako`

### Seed Scripts
- `/home/nithya/app-lumina-scope/backend/scripts/seed_demo_tenant.sql`
- `/home/nithya/app-lumina-scope/backend/scripts/seed_study_library.sql`
- `/home/nithya/app-lumina-scope/backend/scripts/seed_task_library.sql`
- `/home/nithya/app-lumina-scope/backend/scripts/seed_multipliers.sql`
- `/home/nithya/app-lumina-scope/backend/scripts/seed_rate_card.sql`
- `/home/nithya/app-lumina-scope/backend/scripts/seed_study_definitions.sql`

---

## ✅ Phase 1 Checklist

- [x] Create Alembic migration structure
- [x] Create 17 new tables
- [x] Add tenant_id to 11 existing tables
- [x] Create trigger function for updated_at
- [x] Seed 6 study families (MECE)
- [x] Seed 27 study types
- [x] Seed 27 study definitions with full linkage
- [x] Seed 15 deliverable definitions
- [x] Seed 48 task definitions
- [x] Seed 4 task sets
- [x] Seed 12 multiplier definitions
- [x] Seed 4 multiplier sets
- [x] Seed 4 question sets
- [x] Seed 2 rate cards (12 roles each)
- [x] Seed 17 OOP catalog items
- [x] Create demo tenant
- [x] Link demo user to tenant
- [x] Verify all tables and data

---

## 🚀 What's Next: Phase 2

**Phase 2: Sample Size Recommendations & HCP Shortlist**

### Agent: ScopePlannerAgent

**Inputs**:
- Brief (from BriefExtractorAgent)
- Gap analysis (from GapAnalyzerAgent)
- Study type (auto-detected from brief)

**Outputs**:
1. **3 Sample Size Options**:
   - Conservative (high precision, higher cost)
   - Recommended (balanced)
   - Aggressive (lower precision, lower cost)
   - Each with: n, confidence interval, cost estimate, feasibility score

2. **HCP Shortlist** (if applicable):
   - Query internal HCP database (~500 sample records)
   - Filters: specialty, geography, practice type, patient volume, language
   - 50% overlap with internal signal data
   - Feasibility check: expected response rate

3. **Scope Assumptions Log**:
   - Standard assumptions (15-20% buffer, 10% oversample, etc.)
   - High-risk assumptions flagged for client confirmation

### Implementation Plan:
- [ ] Create `ScopePlannerAgent` class extending `BaseAgent`
- [ ] Implement sample size logic (power analysis, segmentation rules)
- [ ] Create HCP database service (query by criteria)
- [ ] Implement feasibility scoring algorithm
- [ ] Update `opportunities` workflow: add "scope_planning" status
- [ ] UI: Display 3 options with radio selection
- [ ] Human approval checkpoint (optional override)

**Estimated Time**: 4-6 hours

---

## 📝 Notes

- **No breaking changes** - All existing tables preserved, only added tenant_id
- **Backward compatible** - tenant_id is nullable for now
- **Global vs tenant data** - Study library has tenant_id nullable (NULL = global templates)
- **Extensible** - Tenants can override global study definitions with custom playbooks
- **Clean architecture** - Clear separation: library tables (definitions) vs instance tables (opportunities, scopes)

---

**Phase 1 Status: COMPLETE ✅**
**Next Action: Start Phase 2 implementation**
