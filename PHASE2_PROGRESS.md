# Phase 2 In Progress: Sample Size & Scope Planning ⏳

**Started**: 2026-03-07
**Status**: Backend implementation complete, testing needed
**Completion**: ~60%

---

## ✅ What's Been Implemented

### 1. ScopePlannerAgent (`/backend/src/services/agents/scopePlannerAgent.ts`)

**Unified agent that combines:**
- Study type detection (from 27 study types in library)
- 3 sample size options (conservative, recommended, aggressive)
- HCP shortlist generation (if HCP study)
- Scope assumptions with risk flagging

**Inputs:**
- Brief (from BriefExtractorAgent)
- Gap analysis (from GapAnalyzerAgent)
- Study library (27 types, 6 families)

**Outputs:**
```typescript
{
  detectedStudyType: {
    typeCode: string,
    displayName: string,
    familyCode: string,
    confidence: 0-1,
    rationale: string
  },
  sampleSizeOptions: [
    {
      label: 'conservative' | 'recommended' | 'aggressive',
      n: number,
      segments: [{segment, n}],
      confidenceInterval: string,
      estimatedCost: number,
      fieldDurationWeeks: number,
      feasibilityScore: 0-100,
      rationale: string
    }
  ],
  hcpShortlist: [
    {
      npi, name, specialty, geography,
      practiceType, patientVolume,
      internalSignal: boolean,
      matchScore: 0-100
    }
  ],
  scopeAssumptions: [
    {
      assumptionId, category, assumption,
      isStandard: boolean,
      riskLevel: 'low'|'medium'|'high',
      requiresClientConfirmation: boolean
    }
  ],
  estimatedTotalCost: {
    conservative: number,
    recommended: number,
    aggressive: number
  }
}
```

### 2. Database Migration (`5ef6fb688f5e_update_scopes_table_for_scope_planner.py`)

**Added columns to `scopes` table:**
- `detected_study_type` - Study type code
- `study_type_confidence` - 0-1 confidence score
- `sample_size_options` - JSON array of 3 options
- `hcp_shortlist` - JSON array of HCP profiles
- `scope_assumptions` - JSON array of assumptions
- `estimated_total_cost` - JSON object with 3 cost estimates
- `status` - Draft, approved, rejected
- `selected_option` - Which sample size option was selected
- Made `brief_id` nullable

**Indexes:**
- `idx_scopes_status` on status column

### 3. Updated OrchestratorAgent

**Simplified workflow statuses:**
```typescript
Old (11 steps):
  intake → brief_extract → gap_analysis → clarification →
  clarification_response → scope_build → sample_plan →
  hcp_shortlist → wbs_estimate → pricing → document_gen

New (6 steps):
  intake → brief_extract → gap_analysis → clarification →
  clarification_response → scope_planning →
  wbs_estimate → pricing → document_gen
```

**Key changes:**
- Consolidated `scope_build + sample_plan + hcp_shortlist` → `scope_planning`
- Single agent call for complete scope planning
- Cleaner workflow progression

### 4. Updated Backend API

**Health check now shows:**
- Phase: Phase 1 Complete - Database Foundation & Study Library

**API info shows:**
- Phase: Phase 2 In Progress
- New features: ScopePlannerAgent, Study Library, Multi-tenancy

---

## 🔧 How It Works

### Scope Planning Flow

```
1. User clicks "Process Next Step" after clarifications approved
   ↓
2. Orchestrator calls ScopePlannerAgent.execute()
   ↓
3. Agent fetches:
   - Brief from database
   - Gap analysis from database
   - Study library (27 study types)
   ↓
4. Agent builds LLM prompt with:
   - RFP context
   - Available study types
   - Instructions for sample sizing
   ↓
5. LLM returns JSON with:
   - Detected study type + confidence
   - 3 sample size options
   - Scope assumptions
   ↓
6. Agent enriches with HCP shortlist (if HCP study):
   - Queries hcp_database table
   - Filters by specialty, geography
   - Ensures 50% internal signal overlap
   ↓
7. Agent saves to scopes table
   ↓
8. Returns success with scope ID
```

### Sample Size Logic

**Conservative:**
- Higher n for tighter confidence intervals
- Safe feasibility (more time, higher cost)
- Example: 400 completes, ±5% @ 95% CI

**Recommended (default):**
- Balanced precision and cost
- Industry-standard confidence intervals
- Example: 300 completes, ±5.7% @ 95% CI

**Aggressive:**
- Lower n for cost efficiency
- Acceptable precision for directional insights
- Example: 200 completes, ±7% @ 95% CI

**Segmentation:**
- Automatically accounts for subgroups
- Ensures each segment has minimum n
- Example: 300 total = 150 oncologists + 150 PCPs

### HCP Shortlist Logic

**Query filters:**
- Specialty (from brief)
- Geography (from brief.countries)
- Active status
- Practice type, patient volume

**50/50 split:**
- 50% with internal signal (past engagement)
- 50% without (new outreach)

**Match scoring:**
- Specialty match: 40 points
- Geography match: 20 points
- Practice type match: 15 points
- Patient volume: 15 points
- Years in practice: 10 points

---

## ⏳ What's NOT Yet Implemented

### Backend
- [ ] API route to approve/select sample size option (PUT /api/scopes/:id/approve)
- [ ] API route to get scope details (GET /api/scopes/:id)
- [ ] Validation of scope assumptions by PM
- [ ] Email notifications for scope approval requests

### Frontend
- [ ] Scope Planning UI page
- [ ] Display 3 sample size options with radio selection
- [ ] HCP shortlist table/cards
- [ ] Scope assumptions accordion with risk badges
- [ ] Cost comparison chart
- [ ] "Select This Option" button
- [ ] Navigation from workflow visualizer

### Testing
- [ ] Unit tests for ScopePlannerAgent
- [ ] Integration test: intake → brief → gap → clarifications → scope
- [ ] Test with real RFP examples
- [ ] Verify HCP shortlist generation
- [ ] Test study type detection accuracy

---

## 🚀 Next Steps (To Complete Phase 2)

### 1. Add API Routes (30 min)

**File:** `/backend/src/routes/opportunities.ts`

```typescript
// GET /api/opportunities/:id/scope
router.get('/:id/scope', async (req, res) => {
  // Fetch latest scope for opportunity
});

// POST /api/opportunities/:id/scope/approve
router.post('/:id/scope/approve', async (req, res) => {
  const { selectedOption } = req.body; // 'conservative' | 'recommended' | 'aggressive'
  // Update scope.selected_option
  // Update scope.status = 'approved'
  // Update opportunity.status = 'wbs_estimate'
});
```

### 2. Create Frontend UI (2-3 hours)

**File:** `/frontend/app/opportunities/[id]/scope/page.tsx`

Components needed:
- **ScopeSummary**: Study type, confidence, rationale
- **SampleOptionsGrid**: 3 cards with radio selection
  - Option label, n, segments breakdown
  - CI, cost, duration, feasibility score
  - Rationale
- **HCPShortlistTable**: Paginated table (if HCP study)
  - NPI, name, specialty, geography
  - Practice type, patient volume
  - Internal signal badge
  - Match score
- **AssumptionsAccordion**: Collapsible by category
  - Sample, timeline, methodology, deliverables, costs
  - Risk badges (low/medium/high)
  - Confirmation required flag
- **CostComparison**: Bar chart comparing 3 options
- **ApproveButton**: "Approve & Continue to WBS"

### 3. Update WorkflowVisualizer (30 min)

Add step 5 to match new workflow:
```typescript
const steps = [
  { id: 1, name: 'RFP Intake', status: 'intake' },
  { id: 2, name: 'Brief Extraction', status: 'brief_extract' },
  { id: 3, name: 'Gap Analysis', status: 'gap_analysis' },
  { id: 4, name: 'Clarifications', status: 'clarification' },
  { id: 5, name: 'Scope Planning', status: 'scope_planning' },  // NEW
  { id: 6, name: 'WBS & Pricing', status: 'wbs_estimate' },
];
```

### 4. Test End-to-End (1 hour)

**Test cases:**
1. Upload RFP → Process through clarifications → Scope planning
2. Verify study type detection (qual vs quant)
3. Check sample size calculations (n, CI, cost)
4. Verify HCP shortlist (if HCP study)
5. Test scope assumptions (risk flagging)
6. Approve scope option → Advance to WBS

---

## 📊 Estimated Completion

**Phase 2 Progress:**
- ✅ Backend agent: 100%
- ✅ Database schema: 100%
- ✅ Orchestrator integration: 100%
- ⏳ API routes: 0%
- ⏳ Frontend UI: 0%
- ⏳ Testing: 0%

**Overall: ~60% complete**

**Remaining work: 4-6 hours**
- API routes: 30 min
- Frontend UI: 2-3 hours
- WorkflowVisualizer update: 30 min
- End-to-end testing: 1 hour

---

## 📝 Notes

- Agent uses Claude Haiku 4.5 for fast, cost-effective study type detection
- Sample size logic is simplified (no power analysis yet) - uses industry heuristics
- HCP shortlist limited to 500 records in demo database (needs real data integration)
- Scope assumptions are LLM-generated (needs PM review for accuracy)
- Cost estimates are rough (panel + incentive + 15% buffer) - Phase 3 will use deterministic pricing

---

## 🔗 Related Files

- [PHASE1_COMPLETE.md](PHASE1_COMPLETE.md) - Database foundation
- [CLAUDE.md](CLAUDE.md) - Project context
- [backend/src/services/agents/scopePlannerAgent.ts](backend/src/services/agents/scopePlannerAgent.ts) - Agent implementation
- [db-migrations/lumina/migrations/versions/5ef6fb688f5e_*.py](db-migrations/lumina/migrations/versions/) - Scopes table migration

---

**Last Updated**: 2026-03-07
**Next Session**: Complete API routes + Frontend UI + Testing
