# RFP Template-Based Analysis - Quick Reference

## What's New

Three agents now analyze RFPs against the standard 13-section pharma template:

1. **BriefExtractorAgent** - Maps RFP to template sections, shows % completeness
2. **GapAnalyzerAgent** - Identifies missing sections, incomplete fields, ambiguous language
3. **AssumptionAnalyzerAgent** - Flags assumptions needed and requirement clashes

## Workflow

```
Upload RFP
  ↓
1. Intake Agent (basic metadata)
  ↓
2. Brief Extractor (template mapping) → "Section 7: Geography is MISSING"
  ↓
3. Gap Analyzer (structured gaps) → "Sample size unclear: 50 vs 500"
  ↓
4. Assumption Analyzer (assumptions & clashes) → "Budget $50K too low for 10 countries"
  ↓
5. Clarification Generator (questions for client)
```

## Key Outputs

### BriefExtractorAgent Output
```json
{
  "templateCoverage": {
    "section1_contact": "COMPLETE",
    "section2_company": "COMPLETE",
    "section3_confidentiality": "PARTIAL",
    "section4_background": "COMPLETE",
    "section5_objectives": "PARTIAL",
    "section6_methodology": "COMPLETE",
    "section7_geography": "MISSING",
    "section8_sample": "COMPLETE",
    "section9_timeline": "PARTIAL",
    "section10_deliverables": "COMPLETE",
    "section11_budget": "COMPLETE",
    "section12_submission": "PARTIAL",
    "section13_evaluation": "MISSING"
  },
  "completeSections": 8,
  "missingSections": 2,
  "overallCompletenessPercent": 62
}
```

### GapAnalyzerAgent Output
```json
{
  "missingSections": [
    {"section": "Section 7: Markets & Geography", "impact": "Cannot plan recruitment strategy", "priority": "critical"},
    {"section": "Section 13: Evaluation Criteria", "impact": "Cannot optimize proposal approach", "priority": "high"}
  ],
  "incompleteFields": [
    {"section": "Section 5", "missingField": "Research Objectives (only business objectives stated)", "priority": "high"}
  ],
  "ambiguousRequirements": [
    {"section": "Section 8", "field": "Sample", "ambiguity": "Says 'small sample of key doctors' - no size specified", "possibleInterpretations": ["25-50", "50-100", "100-200"]}
  ],
  "conflicts": [
    {"section": "Section 11 vs 6", "conflict": "Budget $50K vs multi-country methodology", "statement1": "Budget: $50,000", "statement2": "Scope: 10 countries, 500 interviews"}
  ],
  "sectionsPresent": 11,
  "sectionsMissing": 2,
  "overallCompletenessPercent": 62
}
```

### AssumptionAnalyzerAgent Output
```json
{
  "assumptions": [
    {"category": "Budget", "assumption": "Cost of $50K implies US-only or reduced scope", "basedOn": "Standard multi-country costs 3-5x higher", "riskLevel": "high", "canValidate": true},
    {"category": "Sample", "assumption": "50-100 physicians given 'small sample' language", "basedOn": "Industry std for qual studies", "riskLevel": "medium", "canValidate": true}
  ],
  "clashes": [
    {"clash": "Budget ($50K) insufficient for multi-country scope", "elements": ["$50K budget", "10 countries mentioned"], "severity": "critical", "impact": "Cannot deliver as scoped", "resolution": "Clarify: US-only? Different budget? Different scope?"},
    {"clash": "Timeline (8 weeks) too tight for 500 interviews", "elements": ["8-week timeline", "500 physician interviews"], "severity": "high", "impact": "Quality issues or need extra resources", "resolution": "Clarify: Is sample really 500? Can extend timeline?"}
  ],
  "feasibilityConcerns": [
    {"concern": "Recruiting 500 physicians in 8 weeks is challenging", "reason": "Typical recruitment: 10-20 per recruiter per week", "severity": "high"}
  ],
  "overallRiskLevel": "high",
  "recommendedClarifications": 4
}
```

## Database Tables

### briefs (Enhanced)
- `template_coverage` (JSONB) - which sections present/complete
- `overall_completeness_percent` (INT) - 0-100

### gap_analyses (Enhanced)
- `missing_sections` (JSONB) - entire sections absent from RFP
- `incomplete_fields` (JSONB) - fields within present sections
- `sections_present` (INT) - count of complete sections
- `sections_missing` (INT) - count of missing sections

### assumption_analyses (New)
- `assumptions` (JSONB) - what we must assume
- `clashes` (JSONB) - requirement conflicts
- `feasibility_concerns` (JSONB) - delivery risks
- `overall_risk_level` (VARCHAR) - low/medium/high

## Using in Clarification Generation

Gap + Assumption analysis informs clarification priorities:

```typescript
// High-priority clarifications from assumption analysis:
const highRiskClashes = analysis.clashes.filter(c => c.severity === 'critical');
// → "Please confirm budget range and geographic scope"

// Medium-priority clarifications from gaps:
const ambiguousReqs = gaps.ambiguousRequirements;
// → "When you mention 'small sample', what quantity did you envision?"

// Risk-informed questions:
if (assumptions.overallRiskLevel === 'high') {
  // Include more clarification questions
  // Prioritize clarifying critical assumptions
}
```

## Example: Real RFP Analysis

**RFP States:**
- Budget: $50,000
- Scope: "Multi-country study of oncologists"
- Timeline: "8 weeks to completion"
- Sample: "Small sample of key opinion leaders"
- Geography: Not specified

**Template Analysis Output:**

✅ Brief Extractor:
- Section 1-6: Complete
- Section 7 (Geography): MISSING ← Red flag!
- Section 8 (Sample): PARTIAL (no numbers)
- Section 11 (Budget): Complete

📊 Gap Analyzer:
- Missing: Section 7 (Geography) - CRITICAL
- Incomplete: Section 8 (Sample size not specified)
- Ambiguous: "Small sample" (could be 25-500)
- Ambiguous: "Multi-country" (2-10 countries?)

⚠️ Assumption Analyzer:
- **Assumption**: Assuming US-only when they said "multi-country" = RISK
- **Clash**: $50K budget + multi-country = IMPOSSIBLE (would need $150-250K)
- **Feasibility**: 8 weeks + proper recruitment = TIGHT
- **Risk Level**: HIGH

📝 Clarification Generator (informed by above):
1. "Which specific countries are targeted? [Handles missing Section 7]"
2. "Regarding the 'small sample' - are you looking for 25-50, 50-100, or 100+ interviews?"
3. "Does the $50K budget reflect your total commitment, or is there additional budget for multi-country work?"
4. "Can the timeline be extended if proper recruitment requires more time?"

---

## Implementation Checklist

- [x] BriefExtractorAgent - maps to 13-section template
- [x] GapAnalyzerAgent - template-aware gap analysis
- [x] AssumptionAnalyzerAgent - assumptions & clashes
- [x] Database table: assumption_analyses
- [x] Orchestrator workflow integration
- [x] Console logs showing template coverage
- [ ] Frontend UI showing template coverage %
- [ ] Frontend UI showing gap/assumption summary
- [ ] Clarification generator integration with assumption data

---

## Testing

```bash
# Start backend
cd /home/nithya/app-lumina-scope/backend && npm run dev

# Create test RFP with missing sections
curl -X POST http://localhost:3038/api/opportunities \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user",
    "emailBody": "Budget: $50K. Scope: Multi-country study. Timeline: 8 weeks. Sample: Small group of key doctors.",
    "emailSubject": "RFP: Multi-country Oncology Study",
    "rfpTitle": "Multi-country Oncology Study",
    "clientName": "PharmaCorp"
  }'

# Check template coverage in database
psql -U nithya -d lumina_scope -c "
  SELECT
    b.id,
    b.raw_extraction->>'templateCoverage' as template_coverage,
    b.raw_extraction->>'overallCompletenessPercent' as completeness
  FROM briefs b
  ORDER BY b.created_at DESC LIMIT 1;
"

# Check gaps
psql -U nithya -d lumina_scope -c "
  SELECT
    ga.id,
    jsonb_array_length(ga.missing_sections) as missing_sections_count,
    jsonb_array_length(ga.incomplete_fields) as incomplete_fields_count
  FROM gap_analyses ga
  ORDER BY ga.created_at DESC LIMIT 1;
"

# Check assumptions
psql -U nithya -d lumina_scope -c "
  SELECT
    aa.id,
    jsonb_array_length(aa.assumptions) as assumptions_count,
    jsonb_array_length(aa.clashes) as clashes_count,
    aa.overall_risk_level
  FROM assumption_analyses aa
  ORDER BY aa.created_at DESC LIMIT 1;
"
```

---

## Key Metrics Tracked

Per RFP analysis:
- **Completeness %** (0-100) - % of template sections complete
- **Missing sections count** - entire sections absent
- **Incomplete fields count** - fields within sections
- **Ambiguous requirements count** - unclear language
- **Conflict count** - contradictions identified
- **Assumptions count** - assumptions needed to proceed
- **Clash count** - requirement conflicts
- **Risk level** - overall delivery risk (low/medium/high)

---

## Next Steps

1. **UI Integration**: Show template coverage % in dashboard
2. **Clarification Link**: Use assumption analysis to prioritize clarification questions
3. **Risk Dashboard**: Show high-risk RFPs upfront
4. **Reporting**: Track most common gaps (missing sections, ambiguities, clashes)
