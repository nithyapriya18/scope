-- Seed Event Subscriptions for Lumina Scope
-- These define which agents listen to which events for automatic workflow progression

-- Intake → Brief Extraction
INSERT INTO event_subscriptions (event_type, subscriber_agent, handler_method, enabled) VALUES
('BidIntakeCompleted', 'BriefExtractorAgent', 'handleIntakeCompleted', true);

-- Brief Extraction → Gap Analysis
INSERT INTO event_subscriptions (event_type, subscriber_agent, handler_method, enabled) VALUES
('BriefExtractionCompleted', 'GapAnalyzerAgent', 'handleBriefCompleted', true);

-- Gap Analysis → Clarification (conditional - if critical gaps exist)
INSERT INTO event_subscriptions (event_type, subscriber_agent, handler_method, enabled) VALUES
('GapAnalysisCompleted', 'ClarificationGeneratorAgent', 'handleGapAnalysisCompleted', true);

-- Gap Analysis → Scope Planning (conditional - if no critical gaps)
INSERT INTO event_subscriptions (event_type, subscriber_agent, handler_method, enabled) VALUES
('GapAnalysisCompleted', 'ScopePlannerAgent', 'handleGapAnalysisCompleted', true);

-- Clarifications Approved → Scope Planning
INSERT INTO event_subscriptions (event_type, subscriber_agent, handler_method, enabled) VALUES
('ClarificationsApproved', 'ScopePlannerAgent', 'handleClarificationsApproved', true);

-- Scope Planning → WBS Estimation + HCP Matching (parallel execution)
INSERT INTO event_subscriptions (event_type, subscriber_agent, handler_method, enabled) VALUES
('ScopePlanningCompleted', 'WBSEstimatorAgent', 'handleScopeCompleted', true),
('ScopePlanningCompleted', 'HCPMatcherAgent', 'handleScopeCompleted', true);

-- WBS + HCP Complete → Pricing
INSERT INTO event_subscriptions (event_type, subscriber_agent, handler_method, enabled) VALUES
('WBSEstimationCompleted', 'PricerAgent', 'handleWBSCompleted', true);

-- Pricing → Document Generation
INSERT INTO event_subscriptions (event_type, subscriber_agent, handler_method, enabled) VALUES
('PricingCalculated', 'DocumentGeneratorAgent', 'handlePricingCompleted', true);

-- Documents Generated → Request Final Approval (triggers human review)
-- No agent subscription - this triggers approval workflow instead
