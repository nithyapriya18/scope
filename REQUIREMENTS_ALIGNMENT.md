# Lumina Scope - Requirements Alignment Document

**Date**: 2026-03-06
**Status**: Gap Analysis Complete
**Sources**:
- Lumina_Scope_Workflow.docx (v1.0.3 - references Lumina Scope)
- Lumina_Scope_Product_Schema.docx (v1.2.4 - references Lumina Scope)
- User Inputs and Responsibilities.docx

**Note**: Original requirements documents reference "Lumina Scope" and "Lumina Craft" but we are branding as **"Lumina Scope"** and **"Lumina Craft"**

---

## 📋 Executive Summary

**Lumina Scope** is an enterprise-grade, multi-tenant bid automation system for **Life Sciences Primary Market Research (PMR)** teams. It transforms unstructured client RFPs into submit-ready bid packages with:

- Structured scope (methodology, sample plan, deliverables, timeline)
- **Sample size recommendations** (3 options: minimum/recommended/high-confidence)
- **HCP shortlist generation** (from internal database, primary + backup pools)
- Work breakdown structure (WBS) with deterministic rules
- Pricing packs with policy checks
- Proposal/SoW generation
- Approvals workflow
- Handoff to Lumina Craft for delivery

---

## ✅ What We Have vs ❌ What's Missing

### **Workflow Coverage**

| Step | Spec Requirement | Current Status | Gap |
|------|------------------|----------------|-----|
| 1. Intake | Email/upload intake | ✅ Basic (manual upload) | ❌ Email connector missing |
| 2. Brief Extraction | Extract objectives, audiences, countries, deliverables | ✅ BriefExtractorAgent | ⚠️ Needs structured Audience schema |
| 3. Gap Analysis | Completeness scoring, flag missing fields | ✅ GapAnalyzerAgent | ⚠️ Needs question library integration |
| 4. Clarifications | Generate questions + email draft | ✅ ClarificationGeneratorAgent | ⚠️ Email draft not generated |
| **5. Scope Building** | **Methodology, deliverables, timeline, assumptions** | ❌ **Missing** | ❌ **Critical gap** |
| **6. Sample Size Recommendation** | **3 options (min/rec/high) with rationale** | ❌ **Missing** | ❌ **Critical gap** |
| **7. HCP Shortlist** | **Query universe, generate ranked shortlist** | ❌ **Missing** | ❌ **Critical gap** |
| **8. WBS Generation** | **Task library + rules engine + multipliers** | ❌ **Missing** | ❌ **Critical gap** |
| **9. Pricing Pack** | **Labor + OOP + margin checks + policy validation** | ❌ **Missing** | ❌ **Critical gap** |
| **10. Document Generation** | **Proposal/SoW from templates** | ❌ **Missing** | ❌ **Critical gap** |
| **11. QC Checks** | **Automated consistency validation** | ❌ **Missing** | ❌ **Critical gap** |
| **12. Approvals** | **Configurable routing (scope/pricing/legal)** | ⚠️ Partial (basic approval service) | ❌ **Policy-based routing missing** |
| 13. Submission | Email draft with attachments | ❌ Missing | ❌ Gap |
| 14. Win/Loss | Outcome tracking | ⚠️ Basic (status field) | ⚠️ Needs handoff pack |
| **15. Handoff to CRAFT** | **BaselinePackage + scope.baseline_locked event** | ❌ **Missing** | ❌ **Critical gap** |
| **16. Change Orders** | **Post-baseline scope changes** | ❌ **Missing** | ❌ **Critical gap** |

---

## 🗄️ Database Schema Gaps

### **Tables We Have** ✅
- users, opportunities, briefs, gap_analyses, clarifications
- scopes (basic), sample_plans (basic), hcp_database (sample data)
- wbs (basic), pricing_packs (basic), documents (basic)
- approvals (basic), jobs, llm_usage, chat_messages

### **Critical Missing Tables** ❌

#### **Study Library & Configuration**
- `study_families` - MECE classification (Understanding, Tracking, Testing, Conjoint, Segmentation, Pricing)
- `study_types` - UAA, Tracker, Concept Test, etc. (30+ types)
- `study_definitions` - Playbook: required fields, default deliverables, WBS mapping
- `deliverable_definitions` - Standard PMR deliverables
- `template_sets` - Document template bundles
- `question_sets` - Clarification question groups
- `multiplier_sets` - Complexity multiplier groups

#### **Scope & Sample Planning**
- `sample_size_recommendations` - 3 options with rationale, evidence, timeline/cost impacts
- `hcp_universe_queries` - Aggregated counts to justify feasibility
- `hcp_shortlists` - Ranked HCP IDs (primary + backup), status, approval
- `workplans` - Timeline with milestones and client review windows
- `milestones` - Embedded in workplan

#### **Estimation & Rules**
- `task_definitions` - Atomic work items with applies_when rules
- `task_sets` - Named task groups for study types
- `multiplier_definitions` - Complexity factors (LOI, rush, multi-country, etc.)
- `multipliers_applied` - Log which multipliers were used and why

#### **Pricing & Commercial**
- `rate_cards` - Role-wise cost/sell rates, geo bands, effective dates
- `rate_items` - Embedded in rate card
- `oop_catalog_items` - Out-of-pocket cost library (panels, incentives, translation)
- `vendors` - Preferred vendor list
- `pricing_packs` - Good/Better/Best options (optional)
- `pricing_lines` - Computed labor + OOP lines
- `pricing_summaries` - Totals + margin checks + policy exceptions

#### **Approvals & Governance**
- `approval_policies` - Tenant rules for when approvals are required
- `approval_rules` - Embedded conditions
- `approval_requests` - Instances with routing
- `approval_decisions` - Approve/reject/hold with comments

#### **Documents & QC**
- `document_templates` - Template files with placeholders
- `document_artifacts` - Generated versions
- `qc_reports` - Automated consistency checks
- `qc_checks` - Individual check results

#### **Submission & Handoff**
- `submission_records` - How/when bid was submitted
- `handoff_packs` - Won opportunity handoff data
- `baseline_packages` - **Immutable snapshot for CRAFT integration**
- `change_orders` - **Post-baseline scope changes**
- `field_evidence` - **Provenance: which RFP snippet supports each field**

#### **Audit & Configuration**
- `tenants` - Multi-tenant isolation
- `roles` - RBAC role definitions
- `client_accounts` - Optional client-specific overrides
- `email_threads` - Email intake/submission tracking
- `email_messages` - Individual messages
- `attachments` - File metadata
- `audit_events` - **Immutable trail for all workflow actions**

---

## 🧠 Missing Business Logic

### **1. Study Library (MECE Taxonomy)**

**Current**: Hardcoded study types in agents
**Required**: Database-driven study library with:

- **6 Study Families** (MECE at family level):
  1. Understanding & Diagnosis (U&A, needs, barriers, journeys)
  2. Tracking & Monitoring (trackers, wave-based)
  3. Testing & Optimization (concept, positioning, messaging, materials)
  4. Trade-off & Choice Modeling (conjoint, DCE, maxdiff)
  5. Segmentation & Targeting (build, validate, size, activate)
  6. Pricing & Market Access (WTP, payer/HTA)

- **30+ Study Types** under families
- **Orthogonal Tags**: audience (HCP/patient/payer), mode (CAWI/CATI/IDI/FGD), analytics modules, recruit difficulty

**Each study type must have**:
- Required brief fields
- Default deliverables
- Task set mapping (for WBS)
- Question set (for clarifications)
- Multiplier set (for complexity)
- Workplan template

---

### **2. Sample Size Recommendation Engine**

**Current**: None
**Required**: Generate **3 options** with rationale:

```typescript
{
  options: [
    {
      option_code: "minimum",
      total_n: 60,
      timeline_impact_days: 0,
      cost_impact_percent: -15,
      rationale: "Minimum viable for directional insights; limited subgroup analysis"
    },
    {
      option_code: "recommended",  // ← Default selection
      total_n: 90,
      timeline_impact_days: 7,
      cost_impact_percent: 0,
      rationale: "Balanced precision and feasibility; supports key segment cuts"
    },
    {
      option_code: "high_confidence",
      total_n: 140,
      timeline_impact_days: 14,
      cost_impact_percent: 20,
      rationale: "High confidence for deep subgroup analysis; extended timeline"
    }
  ],
  selected_option: "recommended",
  evidence: [{ field_path: "brief.sample_total_target", source_ref: "email_para_3" }]
}
```

**Calculation Logic**:
- Based on: segments × countries × statistical precision requirements
- Considers: recruit difficulty, HCP universe size, client budget signals
- Links to FieldEvidence for audit trail

---

### **3. HCP Shortlist Generation**

**Current**: 500 sample HCP records in database, no query/shortlist logic
**Required**: Two-step process:

**Step 1: HCP Universe Query** (aggregated counts only)
```typescript
{
  query_id: "uuid",
  audience_name: "Oncologists",
  countries: ["US"],
  filters: {
    specialty: ["Oncology"],
    setting: ["Hospital", "Clinic"],
    min_patient_volume_per_month: 20
  },
  result_counts: {
    US: { eligible_total: 860, by_setting: { Hospital: 520, Clinic: 340 } }
  }
}
```

**Step 2: HCP Shortlist** (ranked IDs)
```typescript
{
  shortlist_id: "uuid",
  target_n: 90,
  primary_hcp_ids: ["hcp_001", "hcp_002", ...],  // 90 doctors
  backup_hcp_ids: ["hcp_101", "hcp_102", ...],   // 30 backup
  selection_rationale: "Ranked by fit and past reliability; quota-balanced",
  status: "draft",  // → approved after review
  approved_by_user_id: null
}
```

**Scoring Model**:
- Specialty/setting fit
- Patient volume
- Past participation reliability (if tracked)
- Geographic distribution (quota balancing)

---

### **4. Rules Engine for WBS & Estimation**

**Current**: None
**Required**: Deterministic rules engine (not LLM-driven for calculations)

**Task Selection Example**:
```typescript
{
  task_code: "QNT-PROG-PROJECT_SETUP",
  applies_when: "scope.method == 'quant'",
  unit_type: "per_country_language",
  units_expr: "brief.countries_count * brief.languages_count",
  base_hours_by_role: { "Programmer": 1.5 },
  multiplier_codes: ["M_LOI", "M_RUSH"]
}
```

**Multiplier Example**:
```typescript
{
  multiplier_code: "M_LOI",
  driver: "brief.loi_minutes",
  levels: [
    { when: "loi <= 10", value: 1.0 },
    { when: "loi <= 20", value: 1.15 },
    { when: "loi <= 30", value: 1.3 },
    { when: "loi > 30", value: 1.5 }
  ],
  apply_to_task_prefixes: ["QNT-INS", "QNT-PROG", "QNT-DAT"]
}
```

**WBS Calculation**:
1. Select tasks where `applies_when` evaluates to true
2. Calculate `units` using `units_expr`
3. For each role in `base_hours_by_role`:
   - Base hours = `base_hours × units`
   - Apply all matching multipliers
   - Create WBSLine: `{ task_code, role, units, base_hours, multipliers_applied[], total_hours }`

**Result**: Fully auditable, reproducible effort estimate

---

### **5. Pricing Engine with Policy Checks**

**Current**: None
**Required**:

**Rate Card Structure**:
```typescript
{
  rate_card_id: "uuid",
  tenant_id: "uuid",
  version: 1,
  effective_from: "2026-01-01",
  currency: "USD",
  rate_items: [
    { role: "Project Manager", cost_rate: 85, sell_rate: 200, geo_band: "US" },
    { role: "Programmer", cost_rate: 65, sell_rate: 150, geo_band: "US" }
  ]
}
```

**Pricing Calculation**:
1. **Labor**: Sum of (WBSLine.total_hours × role_sell_rate) for all WBS lines
2. **OOP**: Sum of selected OOP items from catalog (panels, incentives, translation, etc.)
3. **Total**: Labor + OOP
4. **Margin**: ((Total - Cost) / Total) × 100

**Policy Checks**:
```typescript
{
  min_margin_percent: 30,
  approval_if_margin_below: 35,
  max_discount_percent: 10,
  approval_if_total_exceeds: 100000
}
```

**Output**:
```typescript
{
  labor_price_total: 52000,
  oop_price_total: 18000,
  total_price: 70000,
  gross_margin_percent: 38.5,
  exceptions: []  // or ["Margin below threshold - requires approval"]
}
```

---

### **6. Document Generation from Templates**

**Current**: None
**Required**: Template-based generation with placeholders

**Templates**:
- Proposal
- Statement of Work (SoW)
- Pricing Annex (Excel)
- Assumptions Annex
- Timeline Annex

**Placeholders** (examples):
- `{{client_name}}`
- `{{study_objectives}}`
- `{{sample_plan_table}}`
- `{{wbs_table}}`
- `{{pricing_summary}}`
- `{{assumptions_list}}`

**Implementation**:
- Word: `python-docx` with template parsing
- Excel: `exceljs` or `openpyxl`
- Version control: Each generation creates new DocumentArtifact

---

### **7. QC (Quality Control) Checks**

**Current**: None
**Required**: Automated consistency validation before submission

**Example Checks**:
```typescript
{
  qc_report_id: "uuid",
  opp_id: "uuid",
  status: "pass",  // or "fail"
  checks: [
    {
      check_code: "TIMELINE_OVERLAP",
      description: "Check for overlapping milestones",
      status: "pass"
    },
    {
      check_code: "SAMPLE_BUDGET_MISMATCH",
      description: "Validate sample size vs client budget signals",
      status: "warning",
      details: "Sample size (140) may exceed budget hints in RFP"
    },
    {
      check_code: "DELIVERABLE_CONSISTENCY",
      description: "Ensure all requested deliverables are scoped",
      status: "pass"
    }
  ]
}
```

---

### **8. Baseline Package & Change Orders (CRAFT Integration)**

**Current**: None
**Required**: Integration with Lumina Craft for delivery

**Baseline Package** (created at handoff):
```typescript
{
  baseline_package_id: "uuid",
  study_id: "uuid",  // Canonical ID for SCOPE ↔ CRAFT
  opp_id: "uuid",
  scope_version: 2,
  workplan_version: 1,
  artifact_refs: [
    { artifact_type: "scope", artifact_id: "uuid", version: 2 },
    { artifact_type: "sample_plan", artifact_id: "uuid", version: 1 },
    { artifact_type: "workplan", artifact_id: "uuid", version: 1 }
  ],
  locked_at: "2026-03-15T10:00:00Z",
  locked_by_user_id: "uuid",
  status: "locked"
}
```

**Change Order** (post-baseline changes):
```typescript
{
  change_order_id: "uuid",
  study_id: "uuid",
  change_type: "sample_increase",
  requested_by: "uuid",
  requested_at: "2026-03-20T14:00:00Z",
  rationale: "Client requested additional segment",
  scope_impact: "Add 30 interviews in DE market",
  pricing_impact_percent: 15,
  status: "pending_approval"  // → approved → new BaselinePackage created
}
```

**Platform Events**:
- `scope.study_classified` - After brief parsing
- `scope.baseline_locked` - At handoff (triggers CRAFT)
- `scope.change_order_approved` - On approved change

---

## 🎯 Multi-Tenant Architecture

**Current**: Single-tenant
**Required**: Multi-tenant with tenant isolation

**Tenant Configuration**:
- Rate cards (tenant-specific)
- Pricing policies (tenant-specific)
- OOP catalogs (tenant-specific)
- Document templates (tenant-specific or global)
- User roles & permissions (per tenant)
- Email settings (connected mailbox, allowed domains)

**Data Isolation**:
- All tables have `tenant_id` column
- Row-level security enforced
- Storage prefixes per tenant (S3/GCS buckets)

---

## 📧 Email-First Design

**Current**: Manual upload only
**Required**: Email connector as primary intake

**Inbound**:
1. Connect mailbox (IMAP/Exchange/Gmail API) or forwarding alias
2. On new email → create/attach to Opportunity
3. Store EmailThread + EmailMessages + Attachments
4. Parse email body + attachments → Brief
5. Link parsed fields to source snippets (FieldEvidence)

**Outbound** (Submission):
1. Generate submission-ready email draft
2. Attach documents (proposal, pricing annex)
3. Human reviews and sends (or auto-send after approval)
4. Log submission timestamp and package

---

## 👥 Personas & RBAC

**Current**: Basic auth (demo user)
**Required**: Role-based access control per tenant

**Roles**:
- **Viewer**: Read-only
- **Contributor**: Edit brief/scope/WBS (no approve/submit)
- **Approver**: Approve scope/pricing/legal gates
- **Bid Owner**: Move through workflow, generate docs, submit
- **Admin**: Tenant config, rate cards, templates, user management

**Permissions** (examples):
- `opportunity.read`
- `opportunity.create`
- `brief.edit`
- `scope.approve`
- `pricing.approve`
- `submission.send`
- `tenant.config.edit`

---

## 🔧 Configuration vs Standardization

**Standardized (Global)**:
- Study library taxonomy
- Task definitions library
- Multiplier definitions library
- Question library
- WBS calculation logic
- Audit trail structure

**Configurable (Per Tenant)**:
- Rate cards
- Pricing policies
- OOP catalogs
- Vendor lists
- Document templates
- Approval routing rules
- Email settings

**Override Hierarchy** (highest priority wins):
1. Opportunity override
2. Client account override (optional)
3. Tenant default
4. Global default

---

## 📊 MVP Priorities (Immediate Next Steps)

Based on the spec, here's the recommended build order:

### **Phase 4: Scope Building & Sample Planning** ✅ NEXT
1. Study library (StudyFamily, StudyType, StudyDefinition tables + seed data)
2. Scope builder UI (methodology, deliverables, timeline, assumptions)
3. Sample size recommendation engine (3 options with rationale)
4. HCP universe query + shortlist generation
5. Workplan generation from templates

### **Phase 5: Estimation & Pricing**
1. Task library (TaskDefinition, TaskSet tables + seed data)
2. Multiplier library (MultiplierDefinition, MultiplierSet + seed data)
3. Rules engine (task selection + WBS generation)
4. Rate card configuration UI
5. OOP catalog
6. Pricing engine (labor + OOP + margin checks)
7. Policy validation

### **Phase 6: Documents & Approvals**
1. Document templates (upload/manage)
2. Document generation (proposal, SoW, pricing annex)
3. QC checks engine
4. Approval policies configuration
5. Approval routing workflow
6. Submission email draft generation

### **Phase 7: Handoff & Change Control**
1. BaselinePackage creation
2. HandoffPack generation
3. Platform events (scope.baseline_locked)
4. ChangeOrder workflow
5. CRAFT integration (out of scope for SCOPE product)

### **Phase 8: Multi-Tenant & Enterprise**
1. Tenant isolation
2. RBAC implementation
3. Email connector (inbound/outbound)
4. SSO/SCIM integration
5. CRM sync (optional)
6. Procurement sync (optional)

---

## 🔑 Key Terminology Corrections

| Current Usage | Correct Term | Notes |
|---------------|--------------|-------|
| Lumina Scope | Lumina Scope | ✅ Product name correct |
| RFP Response System | **Bid Automation Platform** | Product category (more accurate) |
| Opportunity | Opportunity | ✅ Correct |
| Brief | Brief | ✅ Correct |
| Scope | Scope | ✅ Correct, but needs more structure |
| Sample Plan | Sample Plan | ✅ Correct, but needs SampleSizeRecommendation + HCPShortlist |
| Pricing | Pricing Pack | Use "Pricing Pack" to distinguish from PricingLine |
| Deliverables | Deliverables | ✅ Correct, but needs DeliverableDefinition library |
| -- | **Study Family** | ❌ Missing concept |
| -- | **Study Type** | ❌ Missing concept |
| -- | **Study Definition** | ❌ Missing concept |
| -- | **Task Definition** | ❌ Missing concept |
| -- | **Multiplier** | ❌ Missing concept |
| -- | **Rate Card** | ❌ Missing concept |
| -- | **OOP Catalog** | ❌ Missing concept |
| -- | **Baseline Package** | ❌ Missing concept |
| -- | **Change Order** | ❌ Missing concept |
| -- | **Field Evidence** | ❌ Missing concept (provenance) |

---

## 📦 Deliverables from This Analysis

1. ✅ **This alignment document** - Gap analysis complete
2. ⏳ **Updated database migration** - Add missing 40+ tables
3. ⏳ **Seed data for libraries** - Study types, tasks, multipliers, questions
4. ⏳ **Updated CLAUDE.md** - Reflect true product requirements
5. ⏳ **Phase 4 roadmap** - Detailed tasks for scope building
6. ⏳ **Rules engine specification** - JSONLogic/CEL implementation plan

---

## 🎓 Learning Resources Needed

To implement the rules engine and estimation logic, the team should study:
- JSONLogic or CEL (Common Expression Language) for safe rule evaluation
- python-docx for Word template generation
- openpyxl / exceljs for Excel generation
- Multi-tenant database patterns (row-level security)
- Event-driven architecture (platform events for CRAFT integration)

---

## ✨ Conclusion

We have built **~25% of Lumina Scope v1.0**:
- ✅ Intake, brief extraction, gap analysis, clarifications
- ❌ Scope building, sample sizing, HCP shortlisting, WBS, pricing, docs, QC, approvals, handoff

The good news: **The foundation is solid**. The agents, job queue, LLM integration, and database patterns are production-ready. We need to:
1. Expand the data model (add 40+ tables)
2. Build the rules engine (deterministic, auditable)
3. Implement the remaining 10 workflow steps
4. Build study library with MECE taxonomy
5. Implement sample sizing and HCP shortlist generation

**Estimated Effort**: 8-12 weeks for a 2-person team to reach MVP completeness per spec.

---

**Next Steps**:
1. Review this alignment document
2. Prioritize Phase 4 (Scope Building) implementation
3. Create database migration for missing tables
4. Build study library and seed data

---

**End of Requirements Alignment Document**
