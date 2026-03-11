# Verity Scope - Project Memory

**Last Updated**: 2026-03-02

---

## 🚨 CRITICAL: Business Model Clarification

**NEVER forget this**:
- ❌ We do NOT create RFPs
- ✅ Pharma companies SEND us RFPs (they ask us to bid)
- ✅ We RESPOND with proposals to win their business

**The Flow**:
```
Pharma Company → Sends RFP → We receive → Process with Verity Scope →
We submit proposal → Win project → Deliver research
```

---

## 🎯 What Verity Scope Does

**Automates RFP Response Process**:
1. **Intake**: Parse pharma company's RFP (from email)
2. **Extract**: Understand what they need (objectives, sample, timeline, budget)
3. **Gap Analysis**: Find missing information
4. **Clarifications**: Generate professional questions to ask pharma
5. **Scope Building**: Design research methodology
6. **Pricing**: Calculate project costs
7. **Document Generation**: Create proposal, SoW, pricing pack
8. **Submission**: Ready-to-send proposal to pharma

---

## 📚 Key Documentation

- **[CLAUDE.md](../CLAUDE.md)** - Complete project context (read this first!)
- **[PHARMA_RFP_RESEARCH.md](../PHARMA_RFP_RESEARCH.md)** - What pharma RFPs look like
- **[RFP_RESEARCH_SYNTHESIS.md](../RFP_RESEARCH_SYNTHESIS.md)** - Research synthesis
- **[STATUS.md](../STATUS.md)** - Current system status

---

## ✅ Phase 3 Complete (4 Agents Working)

1. **Intake Agent** - Extracts client, deadline, budget, therapeutic area
2. **Brief Extractor** - Extracts objectives, sample, methodology, deliverables
3. **Gap Analyzer** - Detects missing information
4. **Clarification Generator** - Creates professional questions

**Orchestrator Agent** coordinates workflow transitions.

---

## ⏳ What's NOT Built Yet (Phases 4-7)

- Scope Builder Agent
- Sample Planner Agent
- HCP Matcher Agent
- WBS Estimator Agent
- Pricer Agent
- Document Generator Agent
- Analytics & reporting

---

## 🔧 Technical Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind (Port 3000)
- **Backend**: Express, TypeScript, PostgreSQL (Port 3038)
- **AI**: AWS Bedrock (Claude Haiku 4.5)
- **Database**: PostgreSQL `verity_scope` (17 tables)
- **Brand**: PetaSight (magenta #da365c)

---

## ⚠️ Important Constraints

1. **Always use Claude Haiku 4.5** (not Sonnet/Opus)
2. **Database is separate** from agriplast/maxima
3. **Authentication is hardcoded** (demo@verity.com / demo123)
4. **Do NOT hallucinate agents** - check file existence first
5. **RFPs are received, not created** - we respond to pharma requests

---

## 📊 Pharma PMR RFP Standards

### Sample Sizes
- **Qualitative**: 20-60 interviews per geography
- **Quantitative**: 200-1,000 surveys
- **Mixed**: 20-50 interviews + 200-500 surveys

### Typical Costs
- **Qualitative**: $50K-$150K
- **Quantitative**: $30K-$100K
- **Mixed Methods**: $80K-$250K

### Timeline
- **Qualitative**: 6-12 weeks
- **Quantitative**: 4-8 weeks
- **Proposal Deadline**: 7-14 days from RFP receipt

### Cost Components
- **Recruitment**: $200-400 per HCP recruit
- **Incentives**: $250-500 per interview
- **Analysis**: $15K-40K per project
- **PM Overhead**: 15-20% of total

---

## 🔍 Common RFP Sections

1. Cover/Executive Summary
2. Research Objectives (2-5 goals)
3. Scope of Work (methodology, sample, geography)
4. Timeline & Milestones
5. Budget & Pricing
6. Deliverables (reports, transcripts, presentations)
7. Evaluation Criteria (weighted scoring)
8. Regulatory/Compliance (GDPR, HIPAA, FCPA)
9. Submission Instructions

---

## 📝 Common RFP Gaps

- ❌ Interview duration not specified
- ❌ Screening criteria incomplete
- ❌ Payment terms unclear
- ❌ Revision rounds not mentioned
- ❌ Transcript turnaround time missing

---

## 🎯 Evaluation Criteria (How Pharma Scores Us)

- **Experience**: 25% (prior pharma projects)
- **Methodology**: 25% (study design quality)
- **Cost**: 20% (budget alignment)
- **Timeline**: 15% (schedule feasibility)
- **Team**: 15% (PM and analyst credentials)

---

**Read [CLAUDE.md](../CLAUDE.md) for complete project context before making any changes!**
