# Next Steps - Template-Based RFP Analysis

## What Just Got Built

Three agents now systematically analyze RFPs against the standard 13-section pharma template:

1. **BriefExtractorAgent** - Maps RFP to template, shows completeness %
2. **GapAnalyzerAgent** - Identifies missing sections, incomplete fields, ambiguous language, conflicts
3. **AssumptionAnalyzerAgent** - Flags assumptions needed and requirement clashes
4. **Database** - New `assumption_analyses` table created

## Ready to Test

```bash
# Terminal 1: Start backend
cd /home/nithya/app-lumina-scope/backend
npm run dev

# Terminal 2: Create test RFP
curl -X POST http://localhost:3038/api/opportunities \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user",
    "emailBody": "Budget: $50K. Scope: Multi-country study. Timeline: 8 weeks. Sample: Small group of key doctors. Therapeutic area: Oncology. Need PowerPoint report.",
    "emailSubject": "RFP: Multi-country Oncology Study",
    "rfpTitle": "Multi-country Oncology Study",
    "clientName": "PharmaCorp Inc"
  }'

# Get the opportunity ID from response, then:
# Process workflow (will run: intake → brief → gap → assumption → clarification)
curl -X POST http://localhost:3038/api/opportunities/<ID>/process \
  -H "Content-Type: application/json" \
  -d '{"userId": "demo-user"}'
```

## What You'll See

1. **BriefExtractorAgent output** (Step 2):
   ```
   ✅ Brief extraction complete
      Template Coverage: 8/13 sections complete
      Completeness: 62%
   ```

2. **GapAnalyzerAgent output** (Step 3):
   ```
   ✅ Gap analysis complete (template-aware)
      Sections Present: 11/13
      Sections Missing: 2
      Incomplete Fields: 3
      Ambiguous Requirements: 2
      Conflicting Info: 1
   ```

3. **AssumptionAnalyzerAgent output** (Step 4 - NEW):
   ```
   ✅ Assumption analysis complete
      Assumptions: 3 identified
      Clashes: 2 identified
      Feasibility Concerns: 2
      Overall Risk Level: high
      Recommended Clarifications: 4
   ```

## Next Integration Tasks

### 1. Frontend Dashboard Enhancement
- [ ] Show template coverage % in opportunity list
- [ ] Display risk badge (low/medium/high) based on assumption analysis
- [ ] Show key gaps in opportunity card (missing sections, clashes)

Example:
```
Opportunity: Multi-country Oncology Study
Status: Assumption Analysis
Risk: HIGH ⚠️
Completeness: 62% (8/13 sections)
Issues: 2 missing sections, 2 clashes detected
```

### 2. Clarification Integration
- [ ] Use assumption analysis to prioritize clarification questions
- [ ] Distinguish between:
  - **Critical** clarifications (from clashes)
  - **High** clarifications (from missing sections)
  - **Medium** clarifications (from incomplete fields)
  - **Low** clarifications (from ambiguous language)

Example logic:
```typescript
// From assumption analysis:
const criticalClashes = analysis.clashes.filter(c => c.severity === 'critical');
criticalClashes.forEach(clash => {
  // Generate clarification question about this clash
});

// From gap analysis:
const missingGeos = gaps.missingSections.find(s => s.section.includes('Geography'));
if (missingGeos) {
  // Add: "Which specific countries/regions are in scope?"
}
```

### 3. Risk Reporting
- [ ] Create risk dashboard
- [ ] Track most common clashes across RFPs
  - "Budget vs Multi-country scope"
  - "Timeline vs Sample size"
  - "Methodology complexity vs Budget"
- [ ] Identify trending issues

### 4. Assumption Validation
- [ ] After clarifications received, validate assumptions
- [ ] Update assumption_analyses with confirmation status
- [ ] Track assumption accuracy over time

### 5. Template Refinement
- [ ] Collect feedback on which sections are most commonly missing
- [ ] Refine template if certain sections consistently not needed
- [ ] Add industry-specific variants (animal health, consumer, etc.)

## Database Queries for Testing

```sql
-- View latest assumption analysis
SELECT
  aa.id,
  jsonb_array_length(aa.assumptions) as assumptions_count,
  jsonb_array_length(aa.clashes) as clashes_count,
  aa.overall_risk_level,
  aa.recommended_clarifications
FROM assumption_analyses aa
ORDER BY aa.created_at DESC LIMIT 1;

-- View all gaps for an opportunity
SELECT
  b.opportunity_id,
  ga.sections_present,
  ga.sections_missing,
  jsonb_array_length(ga.missing_sections) as missing_count,
  jsonb_array_length(ga.incomplete_fields) as incomplete_count
FROM gap_analyses ga
JOIN briefs b ON ga.brief_id = b.id
ORDER BY ga.created_at DESC;

-- Find high-risk opportunities
SELECT
  o.id,
  o.title,
  aa.overall_risk_level,
  aa.recommended_clarifications
FROM assumption_analyses aa
JOIN briefs b ON aa.brief_id = b.id
JOIN opportunities o ON b.opportunity_id = o.id
WHERE aa.overall_risk_level = 'high'
ORDER BY aa.created_at DESC;

-- Track common clashes
SELECT
  aa.clashes->0->>'clash' as clash_type,
  COUNT(*) as frequency
FROM assumption_analyses aa
WHERE aa.clashes::text != '[]'
GROUP BY clash_type
ORDER BY frequency DESC;
```

## Files to Reference

- **TEMPLATE_ANALYSIS_GUIDE.md** - Comprehensive guide with examples
- **/memory/TEMPLATE_BASED_ANALYSIS.md** - Architecture details
- **backend/src/services/agents/assumptionAnalyzerAgent.ts** - Implementation
- **backend/src/services/agents/orchestratorAgent.ts** - Workflow integration

## Key Points to Remember

1. **Template is the baseline** - All RFPs analyzed against same 13 sections
2. **Three complementary analyses**:
   - Brief Extraction = What's present?
   - Gap Analysis = What's missing/unclear?
   - Assumption Analysis = What assumptions needed? What clashes exist?
3. **Risk-aware** - Overall risk level (low/medium/high) guides decision-making
4. **Actionable** - Each analysis informs what questions to ask in clarifications
5. **Structured data** - All outputs are JSON for easy integration/reporting

## Future Enhancements

- [ ] Multi-document support (RFP + SOW + proposal template together)
- [ ] Machine learning to predict missing sections
- [ ] Automated scope negotiation suggestions
- [ ] Integration with proposal templates
- [ ] Change request tracking (if scope changes after clarification)

---

**Ready to start testing?** Follow the curl commands above!
