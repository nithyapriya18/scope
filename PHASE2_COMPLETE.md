# Phase 2 Complete: Scope Planning ✅

**Completed**: 2026-03-07
**Duration**: ~2 hours
**Status**: Backend + Frontend implementation complete, ready for testing

---

## ✅ What Was Delivered

### 1. ScopePlannerAgent (Backend)
**File:** `/backend/src/services/agents/scopePlannerAgent.ts`

**Capabilities:**
- Detects study type from 27 options using LLM + study library
- Generates 3 sample size options:
  - Conservative: Higher n, tighter CI, higher cost
  - Recommended: Balanced precision and cost (default)
  - Aggressive: Lower n, acceptable precision, lower cost
- Creates HCP shortlist from internal database (if HCP study)
  - 50% with internal signal, 50% without
  - Filtered by specialty, geography, practice type
- Generates scope assumptions with risk levels
  - Low/medium/high risk flagging
  - Standard vs custom assumptions
  - Client confirmation required flags

### 2. Database Migration
**File:** `/db-migrations/lumina/migrations/versions/5ef6fb688f5e_*.py`

**Added columns to `scopes` table:**
- `detected_study_type` - Study type code
- `study_type_confidence` - AI confidence score (0-1)
- `sample_size_options` - JSON array of 3 options
- `hcp_shortlist` - JSON array of HCP profiles
- `scope_assumptions` - JSON array of assumptions
- `estimated_total_cost` - JSON object {conservative, recommended, aggressive}
- `status` - draft, approved, rejected
- `selected_option` - Which sample size was selected

### 3. API Routes
**File:** `/backend/src/routes/opportunities.ts`

**New endpoints:**
- `GET /api/opportunities/:id/scope` - Fetch scope details
- `POST /api/opportunities/:id/scope/approve` - Select sample size + approve

### 4. Frontend Scope Planning Page
**File:** `/frontend/app/opportunities/[id]/scope/page.tsx`

**Features:**
- **Study Type Card**: Displays detected type, family, confidence
- **Sample Size Options Grid**: 3 cards with radio selection
  - Shows n, segments, CI, cost, duration, feasibility
  - Rationale for each option
  - Visual progress bar for feasibility score
- **HCP Shortlist Table**: Paginated table of HCP profiles
  - Name, specialty, geography, practice type
  - Internal signal indicator (green dot)
  - Shows top 10, indicates total count
- **Scope Assumptions Accordion**: Expandable by category
  - Sample, timeline, methodology, deliverables, costs
  - Risk badges (low/medium/high)
  - Standard vs custom indicators
  - Client confirmation required warnings
- **Approve Button**: Fixed bottom bar
  - Shows selected option summary
  - "Approve & Continue" to advance to WBS

### 5. Updated WorkflowVisualizer
**File:** `/frontend/components/WorkflowVisualizer.tsx`

**Changes:**
- Updated workflow steps to match new orchestrator
- Renamed "Scope & Sample Planning" → "Scope Planning"
- Added `hasDetailPage: true` flag
- Added "View Details" button for completed scope step
- Links to `/opportunities/:id/scope` page

### 6. Updated OrchestratorAgent
**File:** `/backend/src/services/agents/orchestratorAgent.ts`

**Changes:**
- Simplified workflow from 11 steps to 6 core steps
- Consolidated scope_build + sample_plan + hcp_shortlist → scope_planning
- Single agent call for complete scope planning
- Updated status progression

---

## 🔄 Complete Workflow

```
1. User uploads RFP
   ↓
2. IntakeAgent extracts metadata
   ↓
3. BriefExtractorAgent extracts requirements
   ↓
4. GapAnalyzerAgent identifies gaps
   ↓
5. ClarificationGeneratorAgent creates questions
   ↓ (User approves clarifications)
6. ScopePlannerAgent:
   - Detects study type (e.g., "Deep Dive Qualitative", 85% confidence)
   - Generates 3 sample options (conservative: n=40, recommended: n=30, aggressive: n=25)
   - Creates HCP shortlist (if applicable) - 20 profiles, 50% with internal signal
   - Generates 15 scope assumptions across 5 categories
   ↓
7. User views scope details at /opportunities/:id/scope
   - Reviews study type detection
   - Compares 3 sample size options
   - Reviews HCP shortlist
   - Reviews scope assumptions
   - Selects "recommended" option
   - Clicks "Approve & Continue"
   ↓
8. System updates:
   - scope.status = 'approved'
   - scope.selected_option = 'recommended'
   - opportunity.status = 'wbs_estimate'
   - Creates approval record
   ↓
9. User redirected to opportunity detail
   - Workflow shows "Scope Planning" as completed
   - Next step: "WBS & Pricing" (Phase 3)
```

---

## 📊 Example Output

### Study Type Detection
```json
{
  "typeCode": "deep_dive",
  "displayName": "Deep Dive Qualitative",
  "familyName": "Understanding & Diagnosis",
  "confidence": 0.85,
  "rationale": "RFP indicates need for in-depth exploration of patient experiences through IDIs. Focus on uncovering insights and motivations aligns with deep dive methodology."
}
```

### Sample Size Options
```json
[
  {
    "label": "conservative",
    "n": 40,
    "confidenceInterval": "Saturation expected by 35-40 interviews",
    "estimatedCost": 48000,
    "fieldDurationWeeks": 8,
    "feasibilityScore": 85,
    "rationale": "Higher sample ensures robust coverage across all segments and geographies. Allows for dropout/no-shows."
  },
  {
    "label": "recommended",
    "n": 30,
    "confidenceInterval": "Saturation expected by 25-30 interviews",
    "estimatedCost": 36000,
    "fieldDurationWeeks": 6,
    "feasibilityScore": 90,
    "rationale": "Industry standard for deep dive qualitative. Balances depth with cost efficiency."
  },
  {
    "label": "aggressive",
    "n": 25,
    "confidenceInterval": "Saturation likely by 20-25 interviews",
    "estimatedCost": 30000,
    "fieldDurationWeeks": 5,
    "feasibilityScore": 75,
    "rationale": "Minimum viable sample for meaningful insights. Higher risk of missing edge cases."
  }
]
```

### Scope Assumptions (Sample)
```json
[
  {
    "assumptionId": "A001",
    "category": "sample",
    "assumption": "15% oversample (35 interviews) to account for no-shows and screen-outs",
    "isStandard": true,
    "riskLevel": "low",
    "requiresClientConfirmation": false
  },
  {
    "assumptionId": "A008",
    "category": "methodology",
    "assumption": "All interviews will be conducted via Zoom unless otherwise specified",
    "isStandard": true,
    "riskLevel": "medium",
    "requiresClientConfirmation": true
  },
  {
    "assumptionId": "A012",
    "category": "costs",
    "assumption": "Translation costs estimated at $2,000 for Spanish, may increase based on volume",
    "isStandard": false,
    "riskLevel": "high",
    "requiresClientConfirmation": true
  }
]
```

---

## 🧪 Testing Checklist

### Backend Testing
- [ ] Test ScopePlannerAgent with real RFP examples
- [ ] Verify study type detection accuracy across different RFP types
- [ ] Test HCP shortlist generation (50/50 signal split)
- [ ] Verify scope assumptions cover all categories
- [ ] Test API routes (GET /scope, POST /scope/approve)
- [ ] Verify database inserts (scopes table)

### Frontend Testing
- [ ] Test scope planning page loads correctly
- [ ] Verify 3 sample size options display properly
- [ ] Test radio selection between options
- [ ] Verify HCP shortlist table renders (if applicable)
- [ ] Test scope assumptions accordion expand/collapse
- [ ] Test approve button advances workflow
- [ ] Verify "View Details" link from WorkflowVisualizer
- [ ] Test on mobile (responsive design)

### Integration Testing
- [ ] End-to-end: Upload RFP → Scope planning → Approve
- [ ] Verify status progression: clarification → scope_planning → wbs_estimate
- [ ] Test approval record creation
- [ ] Verify workflow visualizer updates

---

## 📁 Files Created/Modified

### Created
1. `/backend/src/services/agents/scopePlannerAgent.ts` (370 lines)
2. `/frontend/app/opportunities/[id]/scope/page.tsx` (420 lines)
3. `/db-migrations/lumina/migrations/versions/5ef6fb688f5e_*.py`
4. `/backend/scripts/seed_*.sql` (Phase 1 seed files)
5. `PHASE1_COMPLETE.md`, `PHASE1_SUMMARY.txt`, `PHASE2_PROGRESS.md`, `PHASE2_COMPLETE.md`

### Modified
1. `/backend/src/services/agents/orchestratorAgent.ts` - Simplified workflow
2. `/backend/src/routes/opportunities.ts` - Added scope API routes
3. `/backend/src/index.ts` - Updated health check and API info
4. `/frontend/components/WorkflowVisualizer.tsx` - Updated steps + detail link
5. `/home/nithya/app-lumina-scope/CLAUDE.md` - Updated project context

---

## 🚀 What's Next: Phase 3

**Phase 3: WBS Estimation & Pricing**

### WBSEstimatorAgent
- Load task set from study definition
- Calculate base hours by role
- Apply multipliers based on brief attributes
- Generate task breakdown with hours and dependencies

### PricerAgent
- Load rate card for tenant
- Calculate labor costs (hours × rates)
- Add OOP costs (panels, incentives, travel)
- Apply margin/markup
- Generate pricing pack

### EstimatedTime: 6-8 hours

---

## 📊 Phase 2 Metrics

- **Backend**: 1 new agent, 2 API routes, 1 migration
- **Frontend**: 1 new page (420 lines), 1 component update
- **Database**: 8 new columns on scopes table
- **Total Lines**: ~800 lines of new code
- **Time**: ~2 hours
- **Cost**: $0 (no LLM calls for development)

---

**Phase 2 Status: COMPLETE ✅**
**Next Action: Begin Phase 3 implementation (WBS Estimator + Pricer agents)**

Updated: 2026-03-07
