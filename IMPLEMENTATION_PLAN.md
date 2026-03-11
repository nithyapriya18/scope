# Lumina Scope - Complete System Revamp Implementation Plan

**Date**: 2026-03-10
**Version**: 2.0 - Complete Multi-Agent Orchestration Framework
**Status**: Architecture & Planning Phase

---

## 🎯 Executive Summary

### What We're Building
A **minimalist, professional, event-driven RFP bid automation system** with:
- **11 specialized agents** coordinating via events
- **BidStateObject** as single source of truth
- **Quality Gates** validating every transition
- **Audit Trail** tracking every decision
- **Clean, classy UX** focused on workflow visibility

### Current State
- ✅ Database tables created (bid_states, audit_events, quality_gates, event_queue)
- ✅ 4 core services implemented (BidState, QualityGate, AuditEvent, EventBus)
- ✅ 13 agents implemented in **old architecture** (direct DB writes, linear flow)
- ✅ Frontend with basic workflow visualization
- ❌ Agents not using new architecture
- ❌ No event-driven orchestration
- ❌ UX needs minimalist redesign

### What Needs to Change
1. **Migrate 4 core agents** to new architecture (Intake, Brief, Gap, Clarification)
2. **Implement 7 remaining agents** with new architecture
3. **Refactor orchestrator** for event-driven coordination
4. **Redesign frontend** for minimalist professional UX
5. **Add quality gate definitions** to database
6. **Add event subscriptions** to database

---

## 🏗️ Architecture Overview

### New Pattern: Event-Driven Multi-Agent System

```
┌─────────────────────────────────────────────────────────────────┐
│                      RFP Upload/Email Intake                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BidStateObject                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ opportunity_id, version, current_step                     │  │
│  │ intake: {...}, brief: {...}, gap: {...}, clarification..  │  │
│  │ scope: {...}, wbs: {...}, pricing: {...}, documents: {...}│  │
│  │ metadata: { createdAt, lastUpdatedAt, approvalGates: [] } │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│  Quality Gates   │        │  Audit Events    │
│ ┌──────────────┐ │        │ ┌──────────────┐ │
│ │ intake→brief │ │        │ │AgentStarted  │ │
│ │ brief→gap    │ │        │ │AgentCompleted│ │
│ │ gap→clarify  │ │        │ │LLMInvoked    │ │
│ │ ...          │ │        │ │QualityGate...│ │
│ └──────────────┘ │        │ └──────────────┘ │
└──────────────────┘        └──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Agent Workflow                            │
│                                                                 │
│  Agent 1: Intake           → Event: BidIntakeCompleted         │
│      ↓ QualityGate                                             │
│  Agent 2: BriefExtractor   → Event: BriefExtractionCompleted   │
│      ↓ QualityGate                                             │
│  Agent 3: GapAnalyzer      → Event: GapAnalysisCompleted       │
│      ↓ QualityGate                                             │
│  Agent 4: Clarification    → Event: ClarificationsReady        │
│      ↓ Human Approval                                          │
│  Agent 5: ScopePlanner     → Event: ScopePlanningCompleted     │
│      ↓ QualityGate                                             │
│  Agent 6: Feasibility      → Event: FeasibilityChecked         │
│      ↓ QualityGate                                             │
│  Agent 7: WBSEstimator     → Event: WBSEstimated               │
│      ↓ QualityGate                                             │
│  Agent 8: Pricer           → Event: PricingCalculated          │
│      ↓ QualityGate                                             │
│  Agent 9: DocumentGen      → Event: DocumentsGenerated         │
│      ↓ Human Approval                                          │
│  Agent 10: ApprovalAgent   → Event: FinalApproved              │
│      ↓                                                         │
│  Agent 11: HandoffAgent    → Event: BidHandedOff              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Single Source of Truth**: BidStateObject contains ALL bid data
2. **Event-Driven**: Agents publish events, don't call other agents directly
3. **Immutable Audit**: Every decision logged with evidence
4. **Gated Progress**: Quality gates prevent bad data from propagating
5. **Human-in-Loop**: Approval gates at critical decision points

---

## 📊 Detailed Agent Specifications

### Agent 1: IntakeAgent ✅ (Needs Migration)
**Current Status**: Implemented (old pattern)
**Purpose**: Parse RFP, extract metadata

**Inputs**:
- `rfpText`: Raw RFP content
- `fileName`: Original filename

**Outputs** (to BidState.intake):
```typescript
{
  clientName: string;
  rfpTitle: string;
  deadline: Date;
  therapeuticArea: string;
  geography: string[];
}
```

**Next Event**: `BidIntakeCompleted`
**Quality Gate**: `intake_to_brief_extract`
- ✓ clientName present
- ✓ rfpTitle present
- ✓ deadline is valid date
- ✓ therapeuticArea present

---

### Agent 2: BriefExtractorAgent ✅ (Needs Migration)
**Current Status**: Implemented (old pattern)
**Purpose**: Extract structured requirements

**Inputs**: BidState.intake + rfpText

**Outputs** (to BidState.brief):
```typescript
{
  objectives: string[];          // 2-5 research objectives
  targetAudience: string;         // HCP type and criteria
  studyType: 'qualitative' | 'quantitative' | 'mixed';
  sampleRequirements: {
    markets: string[];
    sampleSizes: Record<string, number>;
    hcpCriteria: {
      specialties: string[];
      yearsExperience: [number, number];
      practiceSettings: string[];
    };
  };
  deliverables: string[];         // Expected outputs
}
```

**Next Event**: `BriefExtractionCompleted`
**Quality Gate**: `brief_extract_to_gap_analysis`
- ✓ objectives.length >= 2
- ✓ targetAudience present
- ✓ studyType in ['qualitative', 'quantitative', 'mixed']
- ✓ sampleRequirements.markets.length > 0

---

### Agent 3: GapAnalyzerAgent ✅ (Needs Migration)
**Current Status**: Implemented (old pattern)
**Purpose**: Detect missing/ambiguous info

**Inputs**: BidState.brief + rfpText

**Outputs** (to BidState.gap):
```typescript
{
  missingFields: string[];        // Required fields not found
  ambiguousRequirements: string[]; // Unclear specifications
  criticalGapsCount: number;       // High-priority gaps
}
```

**Next Event**: `GapAnalysisCompleted`
**Quality Gate**: `gap_analysis_to_clarification`
- ✓ gap analysis completed
- ✓ gaps categorized

---

### Agent 4: ClarificationGeneratorAgent ✅ (Needs Migration)
**Current Status**: Implemented (old pattern)
**Purpose**: Generate professional clarification questions

**Inputs**: BidState.gap + BidState.brief

**Outputs** (to BidState.clarifications):
```typescript
{
  questions: [
    {
      category: string;           // e.g., "Sample Size", "Timeline"
      question: string;            // Professional question
      priority: 'critical' | 'high' | 'medium' | 'low';
      context?: string;            // Why we're asking
      suggestedOptions?: string[]; // Multiple choice options
    }
  ];
  status: 'draft' | 'pending_approval' | 'sent' | 'response_received';
}
```

**Next Event**: `ClarificationQuestionsReady`
**Human Approval Gate**: User reviews questions before sending
**After Approval Event**: `ClarificationsApproved`

---

### Agent 5: ScopePlannerAgent ⚠️ (Partially Implemented, Needs Refactor)
**Current Status**: Partially implemented (old pattern)
**Purpose**: Design study methodology + assumptions

**Inputs**: BidState.brief + BidState.clarifications.responses

**Outputs** (to BidState.scope):
```typescript
{
  studyType: string;              // Selected study design
  sampleOptions: [
    {
      option_code: 'conservative' | 'recommended' | 'aggressive';
      total_n: number;
      timeline_impact_days: number;
      cost_impact_percent: number;
      rationale: string;
      confidence_interval?: string;
      feasibility_score?: number;
    }
  ];
  selectedOption?: 'conservative' | 'recommended' | 'aggressive';
  hcpShortlist?: any[];           // Matched HCP profiles
  assumptions: [
    {
      category: string;
      assumption: string;
      isStandard: boolean;
      riskLevel: 'low' | 'medium' | 'high';
      requiresClientConfirmation: boolean;
    }
  ];
}
```

**Next Event**: `ScopePlanningCompleted`
**Quality Gate**: `scope_planning_to_feasibility`
- ✓ sampleOptions.length === 3
- ✓ assumptions.length >= 3
- ✓ studyType selected

---

### Agent 6: FeasibilityAgent ❌ (New - Needs Implementation)
**Purpose**: Assess recruitment feasibility + risks

**Inputs**: BidState.scope + HCP database

**Outputs** (to BidState.scope - extends):
```typescript
{
  feasibility: {
    recruitmentFeasibility: 'high' | 'medium' | 'low';
    hcpAvailability: {
      market: string;
      requested: number;
      available: number;
      feasibilityScore: number;
    }[];
    risks: [
      {
        category: 'recruitment' | 'timeline' | 'budget' | 'quality';
        risk: string;
        likelihood: 'high' | 'medium' | 'low';
        impact: 'high' | 'medium' | 'low';
        mitigation: string;
      }
    ];
    timelineFeasibility: {
      requestedWeeks: number;
      recommendedWeeks: number;
      rationale: string;
    };
  };
}
```

**Next Event**: `FeasibilityChecked`
**Quality Gate**: `feasibility_to_wbs`
- ✓ feasibility.recruitmentFeasibility assessed
- ✓ feasibility.risks.length > 0
- ✓ timelineFeasibility calculated

---

### Agent 7: WBSEstimatorAgent ⚠️ (Exists but Needs Migration + Enhancement)
**Purpose**: Break down work into tasks with hours

**Inputs**: BidState.scope + task_definitions + multipliers

**Outputs** (to BidState.wbs):
```typescript
{
  tasks: [
    {
      task_code: string;          // e.g., "PM001", "REC001"
      role: string;                // e.g., "Project Manager", "Recruiter"
      units: number;               // Number of instances
      base_hours: number;          // Base hours per unit
      multipliers_applied: [
        {
          multiplier_code: string;
          factor: number;
        }
      ];
      total_hours: number;         // Calculated total
    }
  ];
  totalHours: number;
  totalCost: number;                // hours * role_rates
}
```

**Next Event**: `WBSEstimated`
**Quality Gate**: `wbs_to_pricing`
- ✓ tasks.length >= 5
- ✓ totalHours > 0
- ✓ totalCost > 0

---

### Agent 8: PricerAgent ⚠️ (Exists but Needs Migration + Enhancement)
**Purpose**: Calculate final pricing with margins

**Inputs**: BidState.wbs + rate_cards + oop_catalog

**Outputs** (to BidState.pricing):
```typescript
{
  laborCost: number;              // From WBS
  oopCost: number;                // Out-of-pocket expenses
  totalPrice: number;              // Labor + OOP + margin
  marginPercent: number;           // Applied margin
  exceptions: string[];            // Pricing exceptions/notes
}
```

**Next Event**: `PricingCalculated`
**Quality Gate**: `pricing_to_documents`
- ✓ laborCost > 0
- ✓ oopCost >= 0
- ✓ totalPrice > 0
- ✓ marginPercent between 15-40%

---

### Agent 9: DocumentGeneratorAgent ⚠️ (Exists but Needs Migration)
**Purpose**: Generate Word/Excel proposal documents

**Inputs**: Complete BidState (all sections)

**Outputs** (to BidState.documents):
```typescript
{
  proposalUri: string;            // S3/local path to proposal.docx
  sowUri: string;                 // Statement of Work
  pricingAnnexUri: string;        // Excel pricing pack
}
```

**Next Event**: `DocumentsGenerated`
**Human Approval Gate**: User reviews documents
**After Approval Event**: `FinalApprovalGranted`

---

### Agent 10: ApprovalAgent ❌ (New - Needs Implementation)
**Purpose**: Manage approval workflow

**Inputs**: BidState + approval request

**Outputs** (to BidState.metadata.approvalGates):
```typescript
{
  approvalGates: [
    {
      type: 'clarifications' | 'final_documents';
      requestedAt: Date;
      status: 'pending' | 'approved' | 'rejected';
      approvedBy?: string;
      approvedAt?: Date;
    }
  ];
}
```

**Events**: `ApprovalRequested`, `ApprovalGranted`, `ApprovalRejected`

---

### Agent 11: HandoffAgent ❌ (New - Needs Implementation)
**Purpose**: Create baseline package for delivery team

**Inputs**: Approved BidState

**Outputs**:
- Baseline package (frozen copy of BidState)
- Notifications to delivery team
- Project folder setup

**Next Event**: `BidHandedOff`

---

## 🗃️ Database Schema Requirements

### Seed Data Needed

#### 1. Quality Gates Definitions
```sql
INSERT INTO quality_gates (gate_code, from_step, to_step, validation_rules, blocking) VALUES
  ('intake_to_brief_extract', 'intake', 'brief_extract', '[
    {"field": "intake.clientName", "rule": "required"},
    {"field": "intake.rfpTitle", "rule": "required"},
    {"field": "intake.deadline", "rule": "required"},
    {"field": "intake.therapeuticArea", "rule": "required"}
  ]', true),

  ('brief_extract_to_gap_analysis', 'brief_extract', 'gap_analysis', '[
    {"field": "brief.objectives", "rule": "min_length", "threshold": 2},
    {"field": "brief.targetAudience", "rule": "required"},
    {"field": "brief.studyType", "rule": "required"}
  ]', true),

  ('gap_analysis_to_clarification', 'gap_analysis', 'clarification', '[
    {"field": "gapAnalysis.criticalGapsCount", "rule": "min_value", "threshold": 0}
  ]', true),

  ('scope_planning_to_feasibility', 'scope_planning', 'feasibility', '[
    {"field": "scope.sampleOptions", "rule": "min_length", "threshold": 3},
    {"field": "scope.assumptions", "rule": "min_length", "threshold": 3}
  ]', true),

  ('wbs_to_pricing', 'wbs_estimate', 'pricing', '[
    {"field": "wbs.totalHours", "rule": "min_value", "threshold": 1},
    {"field": "wbs.totalCost", "rule": "min_value", "threshold": 1000}
  ]', true),

  ('pricing_to_documents', 'pricing', 'document_gen', '[
    {"field": "pricing.totalPrice", "rule": "min_value", "threshold": 5000},
    {"field": "pricing.marginPercent", "rule": "min_value", "threshold": 15},
    {"field": "pricing.marginPercent", "rule": "max_value", "threshold": 40}
  ]', true);
```

#### 2. Event Subscriptions
```sql
INSERT INTO event_subscriptions (event_type, subscriber_agent, handler_method, enabled) VALUES
  ('BidIntakeCompleted', 'BriefExtractorAgent', 'execute', true),
  ('BriefExtractionCompleted', 'GapAnalyzerAgent', 'execute', true),
  ('GapAnalysisCompleted', 'ClarificationGeneratorAgent', 'execute', true),
  ('ClarificationsApproved', 'ScopePlannerAgent', 'execute', true),
  ('ScopePlanningCompleted', 'FeasibilityAgent', 'execute', true),
  ('FeasibilityChecked', 'WBSEstimatorAgent', 'execute', true),
  ('WBSEstimated', 'PricerAgent', 'execute', true),
  ('PricingCalculated', 'DocumentGeneratorAgent', 'execute', true),
  ('FinalApprovalGranted', 'HandoffAgent', 'execute', true);
```

---

## 🎨 Frontend UX Redesign

### Design Philosophy: Minimalist Professional

**Inspiration**: Linear, Stripe Dashboard, Notion
**Colors**: Existing PetaSight branding (magenta #da365c)
**Layout**: Clean, spacious, focus on workflow clarity

### Key Pages

#### 1. Dashboard (Home)
```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Lumina Scope          [Search]  [+New] [Profile]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Active Bids (3)                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔵 Pfizer NSCLC Study          Step 5/11  ●●●●●○○○○○○ │  │
│  │ Due: Mar 15                    Scope Planning         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🟢 Merck Cardiology RFP        Step 8/11  ●●●●●●●●○○○ │  │
│  │ Due: Mar 20                    Pricing               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Recent Activity                                            │
│  • Agent 7 completed WBS for Merck bid (2m ago)            │
│  • Quality gate passed: scope→feasibility (15m ago)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Bid Detail View
```
┌─────────────────────────────────────────────────────────────┐
│ [←Back] Pfizer NSCLC Study                   Status: Active │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Progress: Step 5 of 11                                     │
│  ●━●━●━●━●━○━○━○━○━○━○                                         │
│  1  2 3 4 5 6 7 8 9 10 11                                   │
│                                                             │
│  ┌──Current Step─────────────────────────────────────────┐ │
│  │ 🔵 Scope Planning                                      │ │
│  │                                                        │ │
│  │ Agent has designed 3 sample options:                  │ │
│  │ • Conservative: 50 HCPs, 8 weeks, $85K               │ │
│  │ • Recommended: 60 HCPs, 10 weeks, $95K (✓ Selected)  │ │
│  │ • Aggressive: 80 HCPs, 12 weeks, $110K              │ │
│  │                                                        │ │
│  │ [View Full Scope Details]  [Continue to Feasibility] │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  Timeline                                                   │
│  • Created: Mar 7, 10:30 AM                                 │
│  • Intake: Mar 7, 10:35 AM                                  │
│  • Brief Extraction: Mar 7, 10:38 AM                        │
│  • Gap Analysis: Mar 7, 10:42 AM                            │
│  • Clarifications: Mar 8, 9:15 AM (Approved by User)        │
│  • Scope Planning: Mar 10, 2:20 PM ← Current                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3. Workflow Steps - Visual Card Design
Each step shown as a clean card:

```
┌─ Step 1: Intake ─────────────────────────┐
│ ✅ Complete                              │
│                                           │
│ Client: Pfizer Inc.                      │
│ Title: NSCLC Treatment Patterns Study    │
│ Deadline: March 15, 2026                 │
│ Therapeutic Area: Oncology               │
│                                           │
│ [View Raw RFP] [Edit Metadata]           │
└───────────────────────────────────────────┘

┌─ Step 5: Scope Planning ─────────────────┐
│ 🔵 In Progress                           │
│                                           │
│ Sample Options Generated:                │
│  ○ Conservative (50 HCPs)                │
│  ● Recommended (60 HCPs) ✓ Selected     │
│  ○ Aggressive (80 HCPs)                  │
│                                           │
│ 12 Assumptions Logged                    │
│ Feasibility Score: 8.5/10                │
│                                           │
│ [View Details] [Continue →]              │
└───────────────────────────────────────────┘
```

---

## 🚀 Implementation Phases

### Phase 1: Core Agent Migration (Week 1)
**Goal**: Migrate 4 core agents to new architecture

**Tasks**:
1. ✅ Verify database tables exist (bid_states, audit_events, quality_gates, event_queue)
2. ✅ Verify services implemented (bidStateService, qualityGateService, auditEventService, eventBusService)
3. Create seed data script for quality gates
4. Create seed data script for event subscriptions
5. Migrate IntakeAgent to use BidStateService
6. Migrate BriefExtractorAgent to use BidStateService
7. Migrate GapAnalyzerAgent to use BidStateService
8. Migrate ClarificationGeneratorAgent to use BidStateService
9. Test end-to-end flow: Intake → Brief → Gap → Clarification
10. Remove old agent versions after verification

**Deliverables**:
- ✅ baseAgentNew.ts (refactored base class)
- ✅ intakeAgentNew.ts, briefExtractorAgentNew.ts, gapAnalyzerAgentNew.ts, clarificationGeneratorAgentNew.ts
- SQL seed script for quality gates
- SQL seed script for event subscriptions
- Integration tests for migrated agents

---

### Phase 2: Scope + Feasibility Agents (Week 1-2)
**Goal**: Implement scope planning + feasibility assessment

**Tasks**:
1. Refactor ScopePlannerAgent to new architecture
2. Implement FeasibilityAgent (NEW)
3. Add quality gate: scope_planning_to_feasibility
4. Test scope → feasibility flow
5. Update frontend to show feasibility results

**Deliverables**:
- scopePlannerAgentNew.ts (refactored)
- feasibilityAgent.ts (NEW)
- Frontend components for feasibility display

---

### Phase 3: WBS + Pricing Agents (Week 2)
**Goal**: Implement work breakdown + pricing

**Tasks**:
1. Refactor WBSEstimatorAgent to new architecture
2. Refactor PricerAgent to new architecture
3. Add quality gates: wbs_to_pricing, pricing_to_documents
4. Test WBS → Pricing flow
5. Update frontend to show pricing breakdown

**Deliverables**:
- wbsEstimatorAgentNew.ts (refactored)
- pricerAgentNew.ts (refactored)
- Frontend pricing display components

---

### Phase 4: Document Generation + Approvals (Week 2-3)
**Goal**: Generate documents + approval workflow

**Tasks**:
1. Refactor DocumentGeneratorAgent to new architecture
2. Implement ApprovalAgent (NEW)
3. Implement HandoffAgent (NEW)
4. Add approval gates to quality_gates table
5. Test full workflow: Intake → Handoff
6. Update frontend for document preview + approval UI

**Deliverables**:
- documentGeneratorAgentNew.ts (refactored)
- approvalAgent.ts (NEW)
- handoffAgent.ts (NEW)
- Frontend approval UI components

---

### Phase 5: Orchestrator Refactor (Week 3)
**Goal**: Event-driven orchestration

**Tasks**:
1. Refactor OrchestratorAgent for event-driven flow
2. Implement event listener/dispatcher
3. Remove linear workflow logic
4. Add parallel execution support (where applicable)
5. Test event-driven workflow
6. Add retry/failure handling

**Deliverables**:
- orchestratorAgentNew.ts (complete rewrite)
- Event dispatcher service
- Workflow engine tests

---

### Phase 6: Frontend Redesign (Week 3-4)
**Goal**: Minimalist professional UX

**Tasks**:
1. Redesign Dashboard (card-based layout)
2. Redesign Bid Detail View (step cards)
3. Add timeline visualization
4. Add real-time progress indicators
5. Implement approval UI (inline approvals)
6. Add audit trail viewer
7. Polish animations and transitions
8. Mobile-responsive design

**Deliverables**:
- New Dashboard component
- New BidDetailView component
- New StepCard component
- Timeline component
- Approval modal/inline UI
- Audit trail viewer

---

### Phase 7: Testing + Polish (Week 4)
**Goal**: End-to-end testing + bug fixes

**Tasks**:
1. Integration tests for all 11 agents
2. Quality gate validation tests
3. Event bus stress tests
4. Frontend E2E tests
5. Performance optimization
6. Documentation updates
7. Deployment preparation

**Deliverables**:
- Test suite (100+ tests)
- Performance benchmarks
- Updated CLAUDE.md
- Deployment scripts

---

## 📋 Success Criteria

### Technical
- ✅ All 11 agents implemented with new architecture
- ✅ BidStateObject as single source of truth
- ✅ Quality gates preventing invalid transitions
- ✅ Audit events capturing every decision
- ✅ Event-driven orchestration working
- ✅ No direct database writes from agents
- ✅ All tests passing

### UX
- ✅ Minimalist, professional design
- ✅ Clear workflow visualization
- ✅ Real-time progress indicators
- ✅ Inline approval UI
- ✅ Mobile-responsive
- ✅ Fast load times (<2s)

### Business
- ✅ RFP → Proposal in <30 minutes (vs. 2-3 days manual)
- ✅ 95% accuracy in requirements extraction
- ✅ 80% reduction in clarification turnaround time
- ✅ Full audit trail for compliance

---

## 🎯 Next Immediate Steps

1. **Run seed data scripts** for quality gates + event subscriptions
2. **Migrate IntakeAgent** to new architecture
3. **Test with real RFP** to verify end-to-end flow
4. **Iterate** on remaining agents

---

## 📚 References

- [PHARMA_RFP_RESEARCH.md](PHARMA_RFP_RESEARCH.md) - Complete PMR RFP guide
- [RFP_RESEARCH_SYNTHESIS.md](RFP_RESEARCH_SYNTHESIS.md) - Research synthesis
- [RESEARCH_SUMMARY.md](RESEARCH_SUMMARY.md) - Executive summary
- [CLAUDE.md](CLAUDE.md) - Project context
- Database migration: `/home/nithya/db-migrations/lumina/migrations/versions/9a1b2c3d4e5f_phase1_core_architecture.py`

---

**End of Implementation Plan**
