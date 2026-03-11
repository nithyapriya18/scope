-- Seed Task Library
-- Creates 50+ atomic task definitions for WBS estimation

-- DESIGN PHASE TASKS
INSERT INTO task_definitions (task_code, display_name, description, phase, base_hours_by_role, units_expression, condition) VALUES

('T_KICKOFF', 'Kickoff Meeting', 'Internal and client kickoff meetings', 'design',
  '{"PM": 2, "analyst": 1}'::jsonb, '1', NULL),

('T_DESK_RESEARCH', 'Desk Research', 'Secondary research and landscape analysis', 'design',
  '{"analyst": 8}'::jsonb, '1', 'brief.requires_desk_research = true'),

('T_DISCUSSION_GUIDE', 'Discussion Guide Development', 'Create qualitative discussion guide', 'design',
  '{"PM": 3, "analyst": 5}'::jsonb, '1', 'study_type.mode CONTAINS "idi" OR study_type.mode CONTAINS "focus_group"'),

('T_QUESTIONNAIRE_DRAFT', 'Questionnaire Drafting', 'Create quantitative survey questionnaire', 'design',
  '{"PM": 2, "analyst": 12}'::jsonb, 'CEIL(brief.target_loi / 10)', 'study_type.mode CONTAINS "cawi" OR study_type.mode CONTAINS "cati"'),

('T_CONJOINT_DESIGN', 'Conjoint Design', 'Design conjoint/DCE experimental structure', 'design',
  '{"PM": 4, "analyst": 16, "statistician": 8}'::jsonb, '1', 'study_type.family = "tradeoff"'),

('T_QUESTIONNAIRE_REVIEW', 'Questionnaire Review Cycles', 'Client review and revision cycles', 'design',
  '{"PM": 2, "analyst": 4}'::jsonb, '2', NULL),

('T_QUESTIONNAIRE_FINALIZE', 'Questionnaire Finalization', 'Finalize survey instrument', 'design',
  '{"PM": 1, "analyst": 2}'::jsonb, '1', NULL),

('T_SCREENER_DESIGN', 'Screener Design', 'Create screening questionnaire', 'design',
  '{"analyst": 4}'::jsonb, '1', 'brief.requires_screening = true'),

('T_IRB_PREP', 'IRB Submission Preparation', 'Prepare IRB/ethics board materials', 'design',
  '{"PM": 4, "analyst": 2}'::jsonb, '1', 'brief.requires_irb = true'),

-- PROGRAMMING & TESTING TASKS
('T_SURVEY_PROGRAMMING', 'Survey Programming', 'Program survey in platform', 'programming',
  '{"programmer": 16}'::jsonb, 'CEIL(brief.target_loi / 5)', 'study_type.mode CONTAINS "cawi"'),

('T_CONJOINT_PROGRAMMING', 'Conjoint Programming', 'Program conjoint/DCE module', 'programming',
  '{"programmer": 24, "statistician": 4}'::jsonb, '1', 'study_type.family = "tradeoff"'),

('T_SURVEY_TESTING', 'Survey Testing & QA', 'Internal testing and QA', 'programming',
  '{"programmer": 8, "analyst": 4}'::jsonb, '1', 'study_type.mode CONTAINS "cawi"'),

('T_SOFT_LAUNCH', 'Soft Launch', 'Pilot fielding with 10-20 completes', 'programming',
  '{"PM": 2, "programmer": 4}'::jsonb, '1', 'brief.requires_soft_launch = true'),

-- FIELDWORK TASKS
('T_SAMPLE_SOURCING', 'Sample Sourcing', 'Identify and vet sample sources', 'fieldwork',
  '{"PM": 4}'::jsonb, 'brief.countries.length', NULL),

('T_RECRUITMENT_QUAL', 'Qualitative Recruitment', 'Recruit and schedule interviews', 'fieldwork',
  '{"recruiter": 2}'::jsonb, 'brief.target_n', 'study_type.mode CONTAINS "idi" OR study_type.mode CONTAINS "focus_group"'),

('T_MODERATION', 'Interview Moderation', 'Conduct qualitative interviews', 'fieldwork',
  '{"moderator": 1.5}'::jsonb, 'brief.target_n', 'study_type.mode CONTAINS "idi"'),

('T_FOCUS_GROUP_MOD', 'Focus Group Moderation', 'Conduct focus group sessions', 'fieldwork',
  '{"moderator": 3, "assistant": 2}'::jsonb, 'brief.target_groups', 'study_type.mode CONTAINS "focus_group"'),

('T_TRANSCRIPTION', 'Transcription', 'Transcribe audio recordings', 'fieldwork',
  '{"transcriptionist": 3}'::jsonb, 'brief.target_n', 'study_type.mode CONTAINS "idi"'),

('T_TRANSLATION_MATERIALS', 'Materials Translation', 'Translate survey/materials to local language', 'fieldwork',
  '{"translator": 8}'::jsonb, 'brief.languages.length - 1', 'brief.languages.length > 1'),

('T_FIELDWORK_MANAGEMENT', 'Fieldwork Management', 'Monitor fieldwork progress and quality', 'fieldwork',
  '{"PM": 2}'::jsonb, 'CEIL(brief.field_duration_weeks)', NULL),

('T_INCENTIVE_PROCESSING', 'Incentive Processing', 'Process and distribute respondent incentives', 'fieldwork',
  '{"coordinator": 0.1}'::jsonb, 'brief.target_n', 'brief.offers_incentive = true'),

-- ANALYSIS TASKS (Qualitative)
('T_CODING_SETUP', 'Coding Framework Setup', 'Develop qualitative coding framework', 'analysis',
  '{"analyst": 8}'::jsonb, '1', 'study_type.mode CONTAINS "idi" OR study_type.mode CONTAINS "focus_group"'),

('T_CODING', 'Transcript Coding', 'Code interview transcripts', 'analysis',
  '{"analyst": 2}'::jsonb, 'brief.target_n', 'study_type.mode CONTAINS "idi"'),

('T_THEMATIC_ANALYSIS', 'Thematic Analysis', 'Identify themes and patterns', 'analysis',
  '{"analyst": 16, "PM": 4}'::jsonb, '1', 'study_type.mode CONTAINS "idi" OR study_type.mode CONTAINS "focus_group"'),

-- ANALYSIS TASKS (Quantitative)
('T_DATA_CLEANING', 'Data Cleaning', 'Clean and validate survey data', 'analysis',
  '{"analyst": 8}'::jsonb, 'CEIL(brief.target_n / 500)', 'study_type.mode CONTAINS "cawi" OR study_type.mode CONTAINS "cati"'),

('T_WEIGHTING', 'Data Weighting', 'Develop and apply sample weights', 'analysis',
  '{"statistician": 12}'::jsonb, '1', 'brief.requires_weighting = true'),

('T_TABULATION', 'Data Tabulation', 'Generate crosstabs and banners', 'analysis',
  '{"analyst": 12}'::jsonb, 'CEIL(brief.variables_count / 50)', 'study_type.mode CONTAINS "cawi"'),

('T_SIG_TESTING', 'Statistical Testing', 'Run significance tests on crosstabs', 'analysis',
  '{"statistician": 8}'::jsonb, '1', NULL),

('T_SEGMENTATION_ANALYSIS', 'Segmentation Analysis', 'Cluster analysis and segment profiling', 'analysis',
  '{"statistician": 32, "analyst": 16}'::jsonb, '1', 'study_type.family = "segmentation"'),

('T_CONJOINT_ANALYSIS', 'Conjoint Analysis', 'HB estimation and utility analysis', 'analysis',
  '{"statistician": 24}'::jsonb, '1', 'study_type.family = "tradeoff"'),

('T_SIMULATOR_BUILD', 'Market Simulator Build', 'Build conjoint market simulator', 'analysis',
  '{"statistician": 16, "programmer": 8}'::jsonb, '1', 'study_type.family = "tradeoff" AND brief.requires_simulator = true'),

('T_ADVANCED_ANALYTICS', 'Advanced Analytics', 'Regression, driver analysis, or predictive modeling', 'analysis',
  '{"statistician": 20}'::jsonb, '1', 'brief.requires_advanced_analytics = true'),

('T_CHARTING', 'Chart Development', 'Create data visualizations', 'analysis',
  '{"analyst": 1}'::jsonb, 'brief.chart_count OR 20', NULL),

-- REPORTING TASKS
('T_TOPLINE_REPORT', 'Topline Report', 'Draft quick topline summary', 'reporting',
  '{"analyst": 12, "PM": 4}'::jsonb, '1', NULL),

('T_REPORT_OUTLINE', 'Report Outline', 'Develop report structure and storyline', 'reporting',
  '{"PM": 4, "analyst": 4}'::jsonb, '1', NULL),

('T_REPORT_DRAFTING', 'Report Drafting', 'Write full report narrative', 'reporting',
  '{"analyst": 40, "PM": 8}'::jsonb, '1', NULL),

('T_EXEC_SUMMARY', 'Executive Summary', 'Draft executive summary', 'reporting',
  '{"PM": 8, "analyst": 4}'::jsonb, '1', NULL),

('T_PPT_DEVELOPMENT', 'Presentation Development', 'Create client-facing PPT deck', 'reporting',
  '{"analyst": 24, "designer": 8}'::jsonb, 'CEIL(brief.slide_count / 50)', NULL),

('T_REPORT_QC', 'Report QC Review', 'Internal quality review of report', 'reporting',
  '{"PM": 8, "QC_reviewer": 8}'::jsonb, '1', NULL),

('T_CLIENT_REVIEW_CYCLE', 'Client Review Cycle', 'Client review and revisions', 'reporting',
  '{"PM": 4, "analyst": 8}'::jsonb, '2', NULL),

('T_REPORT_FINALIZATION', 'Report Finalization', 'Finalize and brand deliverables', 'reporting',
  '{"PM": 4, "analyst": 4, "designer": 2}'::jsonb, '1', NULL),

('T_READOUT_PREP', 'Readout Preparation', 'Prepare for client presentation', 'reporting',
  '{"PM": 4}'::jsonb, '1', NULL),

('T_READOUT_DELIVERY', 'Readout Delivery', 'Deliver findings to client', 'reporting',
  '{"PM": 2, "analyst": 2}'::jsonb, '1', NULL),

-- PROJECT MANAGEMENT TASKS
('T_PM_WEEKLY', 'Weekly PM Activities', 'Status updates, team coordination, client communication', 'pm',
  '{"PM": 4}'::jsonb, 'CEIL(brief.total_duration_weeks)', NULL),

('T_VENDOR_MANAGEMENT', 'Vendor Management', 'Coordinate with external vendors', 'pm',
  '{"PM": 2}'::jsonb, 'brief.vendor_count OR 1', 'brief.uses_vendors = true'),

('T_BUDGET_TRACKING', 'Budget Tracking', 'Monitor budget vs actuals', 'pm',
  '{"PM": 1}'::jsonb, 'CEIL(brief.total_duration_weeks / 2)', NULL),

('T_CHANGE_ORDER_MGMT', 'Change Order Management', 'Manage scope changes', 'pm',
  '{"PM": 4}'::jsonb, '1', 'brief.expects_changes = true'),

('T_CLOSEOUT', 'Project Closeout', 'Final invoicing and archival', 'pm',
  '{"PM": 4}'::jsonb, '1', NULL)

ON CONFLICT (task_code) DO NOTHING;

-- Task Sets (named bundles for study types)
INSERT INTO task_sets (set_code, display_name, task_codes) VALUES
('qual_standard', 'Standard Qualitative Study',
  ARRAY['T_KICKOFF', 'T_DISCUSSION_GUIDE', 'T_SCREENER_DESIGN', 'T_SAMPLE_SOURCING', 'T_RECRUITMENT_QUAL', 'T_MODERATION', 'T_TRANSCRIPTION', 'T_CODING_SETUP', 'T_CODING', 'T_THEMATIC_ANALYSIS', 'T_REPORT_OUTLINE', 'T_REPORT_DRAFTING', 'T_EXEC_SUMMARY', 'T_PPT_DEVELOPMENT', 'T_REPORT_QC', 'T_CLIENT_REVIEW_CYCLE', 'T_REPORT_FINALIZATION', 'T_READOUT_PREP', 'T_READOUT_DELIVERY', 'T_PM_WEEKLY', 'T_CLOSEOUT']),

('quant_standard', 'Standard Quantitative Survey',
  ARRAY['T_KICKOFF', 'T_QUESTIONNAIRE_DRAFT', 'T_QUESTIONNAIRE_REVIEW', 'T_QUESTIONNAIRE_FINALIZE', 'T_SCREENER_DESIGN', 'T_SURVEY_PROGRAMMING', 'T_SURVEY_TESTING', 'T_SAMPLE_SOURCING', 'T_FIELDWORK_MANAGEMENT', 'T_DATA_CLEANING', 'T_TABULATION', 'T_SIG_TESTING', 'T_CHARTING', 'T_TOPLINE_REPORT', 'T_REPORT_OUTLINE', 'T_REPORT_DRAFTING', 'T_EXEC_SUMMARY', 'T_PPT_DEVELOPMENT', 'T_REPORT_QC', 'T_CLIENT_REVIEW_CYCLE', 'T_REPORT_FINALIZATION', 'T_READOUT_PREP', 'T_READOUT_DELIVERY', 'T_PM_WEEKLY', 'T_CLOSEOUT']),

('conjoint_standard', 'Standard Conjoint Analysis',
  ARRAY['T_KICKOFF', 'T_CONJOINT_DESIGN', 'T_QUESTIONNAIRE_DRAFT', 'T_QUESTIONNAIRE_REVIEW', 'T_QUESTIONNAIRE_FINALIZE', 'T_CONJOINT_PROGRAMMING', 'T_SURVEY_TESTING', 'T_SOFT_LAUNCH', 'T_SAMPLE_SOURCING', 'T_FIELDWORK_MANAGEMENT', 'T_DATA_CLEANING', 'T_CONJOINT_ANALYSIS', 'T_SIMULATOR_BUILD', 'T_CHARTING', 'T_REPORT_OUTLINE', 'T_REPORT_DRAFTING', 'T_EXEC_SUMMARY', 'T_PPT_DEVELOPMENT', 'T_REPORT_QC', 'T_CLIENT_REVIEW_CYCLE', 'T_REPORT_FINALIZATION', 'T_READOUT_PREP', 'T_READOUT_DELIVERY', 'T_PM_WEEKLY', 'T_CLOSEOUT']),

('tracker_standard', 'Standard Tracker Study',
  ARRAY['T_KICKOFF', 'T_QUESTIONNAIRE_DRAFT', 'T_QUESTIONNAIRE_REVIEW', 'T_QUESTIONNAIRE_FINALIZE', 'T_SURVEY_PROGRAMMING', 'T_SURVEY_TESTING', 'T_SAMPLE_SOURCING', 'T_FIELDWORK_MANAGEMENT', 'T_DATA_CLEANING', 'T_WEIGHTING', 'T_TABULATION', 'T_SIG_TESTING', 'T_CHARTING', 'T_TOPLINE_REPORT', 'T_PPT_DEVELOPMENT', 'T_CLIENT_REVIEW_CYCLE', 'T_PM_WEEKLY'])

ON CONFLICT (set_code) DO NOTHING;

-- Link study types to task sets
UPDATE study_definitions SET task_set_code = 'qual_standard' WHERE type_code IN ('deep_dive', 'patient_journey', 'kol_advisory');
UPDATE study_definitions SET task_set_code = 'quant_standard' WHERE type_code IN ('uaa', 'awareness_tracker', 'concept_test', 'positioning_test', 'message_test');
UPDATE study_definitions SET task_set_code = 'conjoint_standard' WHERE type_code IN ('conjoint', 'dce', 'maxdiff');
UPDATE study_definitions SET task_set_code = 'tracker_standard' WHERE type_code IN ('tracker');
