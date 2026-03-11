# ✅ Complete Application Flows

All tabs now have fully functional flows - no empty pages!

## 🎯 Main Navigation

### 1. Dashboard (Main View)
**URL**: `/dashboard`

**Features**:
- Stats cards: Total RFPs, In Progress, Approved, Avg Response Time
- Search bar: Filter by RFP title or client name
- Status filter: All statuses, Intake, Brief Extract, Clarification, etc.
- "New RFP" button to create opportunities
- Opportunity cards showing:
  - RFP title and client
  - Current status with color coding
  - Therapeutic area
  - Deadline
  - Created date
- Click any opportunity card → Navigate to detail page with workflow

**Mock Data**: 3 sample opportunities demonstrating different workflow stages

---

### 2. Intelligence (Market Intel)
**URL**: `/intelligence`

**Purpose**: Track pharma industry signals and potential RFP opportunities

**Three Tabs**:

#### Tab 1: RFP Signals (3 signals)
Track early indicators that might lead to RFPs:
- **Hiring Signals**: Job postings for market research roles
- **Pipeline Updates**: Drug trials, FDA approvals
- **Conference Presentations**: Major pharma speaking at conferences

Each signal shows:
- Company name
- Signal description
- Likelihood score (High/Medium/Low)
- Expected timeframe
- Details and context
- Source and date

#### Tab 2: Pharma News (4 articles)
Recent industry news relevant to research opportunities:
- FDA approvals
- M&A activity
- Earnings reports
- R&D restructuring

Each article shows:
- Company
- News headline
- Summary
- **Research Opportunity callout**: Why this matters for RFPs
- Source and link

#### Tab 3: Upcoming Events (3 events)
Major pharma conferences that typically trigger RFPs:
- ASCO Annual Meeting
- ACC Scientific Sessions
- ADA Scientific Sessions

Each event shows:
- Conference name and dates
- Location
- Relevance to research
- Expected exhibitor companies

---

### 3. Opportunity Detail Pages
**URL**: `/opportunities/[id]`

**Features** (from Phase 3):
- Split-screen ChatLayout
- Left: Workflow Visualizer (12 steps)
- Right: AI Assistant chat
- "Process Next Step" button
- Real-time status polling
- Workflow stages:
  1. Intake
  2. Brief Extraction
  3. Gap Analysis
  4. Clarification (human approval)
  5. Clarification Response
  6. Scope Building
  7. Sample Planning
  8. HCP Shortlist
  9. WBS Estimation
  10. Pricing
  11. Document Generation (human approval)
  12. Approved

---

## 🔄 Complete User Flows

### Flow 1: View Existing RFPs
1. Login with demo@lumina.com / demo123
2. Land on Dashboard
3. See 3 mock opportunities
4. Filter by status or search
5. Click any card → View detailed workflow progress

### Flow 2: Track Potential RFPs
1. Navigate to Intelligence tab
2. View RFP Signals tab
   - See 3 potential opportunities
   - Note companies and timeframes
3. View Pharma News tab
   - Read 4 recent industry updates
   - See research opportunity implications
4. View Upcoming Events tab
   - See 3 major conferences
   - Note expected exhibitors

### Flow 3: Create New RFP (Ready for Integration)
1. Dashboard → Click "New RFP" button
2. Upload form (placeholder - connects to backend API)
3. System runs agents automatically
4. Returns to opportunity detail page

---

## 📊 Data Sources (Mock → Real)

Currently using **mock data** for demonstration. Ready to integrate:

### Intelligence Data Sources:
- **LinkedIn API**: Job postings, company updates
- **PharmaCompass**: Pipeline data, FDA approvals
- **NewsAPI**: Pharma industry news aggregation
- **Conference APIs**: ASCO, ACC, ADA event schedules
- **SEC Filings**: Earnings reports, M&A announcements

### Opportunity Data:
- **Backend API**: `/api/opportunities` (already connected)
- **PostgreSQL**: 17 tables with complete workflow state

---

## 🎨 Design Consistency

All pages follow PetaSight brand:
- Logo: PetaSight + Lumina Scope
- Colors: Magenta primary (#da365c)
- Font: Inter
- Layout: max-w-7xl containers
- Components: Rounded buttons, shadow-sm cards
- Navigation: Sticky header, authenticated menu

---

## 🚀 What's Working

✅ **Authentication**: Hardcoded demo login  
✅ **Dashboard**: Full RFP management view with stats  
✅ **Intelligence**: 3-tab market intel system  
✅ **Opportunity Details**: 12-step workflow visualizer  
✅ **Navigation**: Clean 2-tab structure (Dashboard + Intelligence)  
✅ **Responsive**: Mobile-friendly layouts  
✅ **Branding**: Complete PetaSight visual identity  

---

## 🔮 Next Steps (When Ready)

1. **Connect Intelligence APIs**: Replace mock data with real pharma news
2. **Add Notification System**: Alert when high-likelihood signals appear
3. **CRM Integration**: Track which signals converted to actual RFPs
4. **ML Scoring**: Train model to predict RFP likelihood from signals
5. **Email Alerts**: Weekly digest of top signals and news

---

**No empty tabs. Every page has purpose and content. Ready to use!**
