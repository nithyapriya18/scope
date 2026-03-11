-- Seed Study Library
-- Creates the MECE taxonomy of study families and types

-- 1. Study Families (6 MECE categories)
INSERT INTO study_families (family_code, display_name, description, sort_order) VALUES
('understanding', 'Understanding & Diagnosis', 'Usage & Attitudes, needs analysis, barriers, patient/HCP journeys', 1),
('tracking', 'Tracking & Monitoring', 'Brand trackers, awareness trackers, longitudinal wave-based studies', 2),
('testing', 'Testing & Optimization', 'Concept tests, positioning, messaging, creative materials testing', 3),
('tradeoff', 'Trade-off & Choice Modeling', 'Conjoint analysis, DCE, MaxDiff, choice-based research', 4),
('segmentation', 'Segmentation & Targeting', 'Segmentation build, validation, sizing, and activation', 5),
('pricing', 'Pricing & Market Access', 'Willingness-to-pay, payer/HTA research, reimbursement studies', 6)
ON CONFLICT (family_code) DO NOTHING;

-- 2. Study Types (30+ study types across families)

-- Understanding & Diagnosis Family
INSERT INTO study_types (type_code, family_code, display_name, description, tags) VALUES
('uaa', 'understanding', 'Usage & Attitudes', 'Comprehensive assessment of behaviors, attitudes, and unmet needs',
  '{"audience": ["hcp", "patient"], "mode": ["cawi", "cati"], "difficulty": "easy", "typical_n": 300}'::jsonb),
('deep_dive', 'understanding', 'Deep Dive Qualitative', 'In-depth exploration via IDIs or focus groups',
  '{"audience": ["hcp", "patient", "payer"], "mode": ["idi", "focus_group"], "difficulty": "medium", "typical_n": 30}'::jsonb),
('patient_journey', 'understanding', 'Patient Journey Mapping', 'End-to-end patient experience and touchpoint analysis',
  '{"audience": ["patient", "caregiver", "hcp"], "mode": ["idi", "ethnography"], "difficulty": "medium", "typical_n": 40}'::jsonb),
('kol_advisory', 'understanding', 'KOL Advisory Board', 'Strategic input from key opinion leaders',
  '{"audience": ["hcp"], "mode": ["advisory_board"], "difficulty": "easy", "typical_n": 12}'::jsonb),

-- Tracking & Monitoring Family
('tracker', 'tracking', 'Brand Tracker', 'Continuous or wave-based brand health monitoring',
  '{"audience": ["hcp"], "mode": ["cawi"], "difficulty": "easy", "typical_n": 200, "is_longitudinal": true}'::jsonb),
('awareness_tracker', 'tracking', 'Awareness & Usage Tracker', 'Monitor awareness, trial, and usage over time',
  '{"audience": ["hcp", "patient"], "mode": ["cawi", "cati"], "difficulty": "easy", "typical_n": 400, "is_longitudinal": true}'::jsonb),
('patient_registry', 'tracking', 'Patient Registry Study', 'Longitudinal observational data collection',
  '{"audience": ["patient"], "mode": ["registry"], "difficulty": "hard", "typical_n": 1000, "is_longitudinal": true}'::jsonb),

-- Testing & Optimization Family
('concept_test', 'testing', 'Concept Test', 'Evaluate product/service concepts for appeal and clarity',
  '{"audience": ["hcp", "patient"], "mode": ["cawi", "idi"], "difficulty": "easy", "typical_n": 250}'::jsonb),
('positioning_test', 'testing', 'Positioning Test', 'Test alternative positioning strategies and messaging',
  '{"audience": ["hcp"], "mode": ["cawi"], "difficulty": "medium", "typical_n": 300}'::jsonb),
('message_test', 'testing', 'Message Testing', 'Optimize key messages for clarity and resonance',
  '{"audience": ["hcp", "patient", "payer"], "mode": ["cawi", "idi"], "difficulty": "easy", "typical_n": 200}'::jsonb),
('creative_test', 'testing', 'Creative Materials Testing', 'Test ads, detailing aids, patient materials',
  '{"audience": ["hcp", "patient"], "mode": ["cawi", "focus_group"], "difficulty": "medium", "typical_n": 150}'::jsonb),
('usability_test', 'testing', 'Usability Testing', 'Evaluate ease of use for devices, apps, or portals',
  '{"audience": ["patient", "hcp"], "mode": ["usability_lab"], "difficulty": "medium", "typical_n": 20}'::jsonb),

-- Trade-off & Choice Modeling Family
('conjoint', 'tradeoff', 'Conjoint Analysis', 'Quantify trade-offs between product attributes',
  '{"audience": ["hcp", "patient", "payer"], "mode": ["cawi"], "difficulty": "hard", "typical_n": 400}'::jsonb),
('dce', 'tradeoff', 'Discrete Choice Experiment', 'Model real-world choice behavior',
  '{"audience": ["hcp", "patient"], "mode": ["cawi"], "difficulty": "hard", "typical_n": 300}'::jsonb),
('maxdiff', 'tradeoff', 'MaxDiff', 'Rank importance of features or messages',
  '{"audience": ["hcp", "patient"], "mode": ["cawi"], "difficulty": "medium", "typical_n": 200}'::jsonb),
('priority_map', 'tradeoff', 'Priority Mapping', 'Importance-satisfaction grid for features',
  '{"audience": ["hcp", "patient"], "mode": ["cawi"], "difficulty": "easy", "typical_n": 250}'::jsonb),

-- Segmentation & Targeting Family
('seg_build', 'segmentation', 'Segmentation Build', 'Develop data-driven segments',
  '{"audience": ["hcp", "patient"], "mode": ["cawi"], "difficulty": "hard", "typical_n": 800}'::jsonb),
('seg_validation', 'segmentation', 'Segmentation Validation', 'Validate segments with new data',
  '{"audience": ["hcp"], "mode": ["cawi"], "difficulty": "medium", "typical_n": 300}'::jsonb),
('seg_sizing', 'segmentation', 'Segmentation Sizing', 'Estimate segment prevalence in market',
  '{"audience": ["hcp"], "mode": ["cawi"], "difficulty": "medium", "typical_n": 500}'::jsonb),
('personas', 'segmentation', 'Persona Development', 'Create rich qualitative personas',
  '{"audience": ["patient", "hcp"], "mode": ["idi", "focus_group"], "difficulty": "medium", "typical_n": 40}'::jsonb),

-- Pricing & Market Access Family
('wtp', 'pricing', 'Willingness to Pay', 'Estimate price sensitivity and optimal price',
  '{"audience": ["patient", "payer"], "mode": ["cawi"], "difficulty": "hard", "typical_n": 500}'::jsonb),
('payer_research', 'pricing', 'Payer Research', 'Understand reimbursement decision-making',
  '{"audience": ["payer"], "mode": ["idi"], "difficulty": "medium", "typical_n": 25}'::jsonb),
('hta_research', 'pricing', 'HTA Evidence Research', 'Generate evidence for Health Technology Assessment',
  '{"audience": ["payer", "hta_body"], "mode": ["idi", "survey"], "difficulty": "hard", "typical_n": 50}'::jsonb),
('formulary_study', 'pricing', 'Formulary Access Study', 'Map formulary landscape and access barriers',
  '{"audience": ["payer"], "mode": ["desk_research", "idi"], "difficulty": "medium", "typical_n": 30}'::jsonb),

-- Mixed/Hybrid Studies
('mixed_methods', 'understanding', 'Mixed Methods Study', 'Combines qual and quant phases',
  '{"audience": ["hcp", "patient"], "mode": ["idi", "cawi"], "difficulty": "hard", "typical_n": 350}'::jsonb),
('omnibus', 'understanding', 'Omnibus Survey', 'Multi-client survey with shared costs',
  '{"audience": ["hcp"], "mode": ["cawi"], "difficulty": "easy", "typical_n": 500}'::jsonb),
('ad_hoc', 'understanding', 'Ad Hoc Research', 'Custom research design',
  '{"audience": ["hcp", "patient", "payer"], "mode": ["various"], "difficulty": "medium", "typical_n": 200}'::jsonb)

ON CONFLICT (type_code) DO NOTHING;

-- 3. Deliverable Definitions (Standard deliverables library)
INSERT INTO deliverable_definitions (deliverable_code, display_name, description, category) VALUES
('exec_summary', 'Executive Summary', 'High-level overview with key findings and recommendations (PPT)', 'report'),
('topline', 'Topline Report', 'Initial results summary, typically within 48-72 hours of fieldwork close', 'report'),
('final_report', 'Final Report', 'Comprehensive analysis with full methodology, findings, and implications', 'report'),
('data_tables', 'Data Tables', 'Crosstab tables with statistical testing', 'data'),
('raw_data', 'Raw Data File', 'De-identified SPSS/CSV data file', 'data'),
('screener_results', 'Screener Results', 'Summary of screening outcomes and incidence rates', 'data'),
('transcript_verbatims', 'Transcripts & Verbatims', 'Full interview transcripts or coded verbatims', 'data'),
('dashboard', 'Interactive Dashboard', 'Web-based data visualization tool', 'data'),
('infographic', 'Infographic', 'Visual summary of key findings', 'presentation'),
('readout_ppt', 'Readout Presentation', 'Client-facing presentation deck', 'presentation'),
('video_summary', 'Video Summary', 'Short video highlighting key insights', 'presentation'),
('field_report', 'Field Report', 'Recruitment and fieldwork progress summary', 'report'),
('methodology_annex', 'Methodology Annex', 'Detailed methodology documentation', 'report'),
('sample_profile', 'Sample Profile', 'Demographic and firmographic breakdown of respondents', 'data'),
('weighting_memo', 'Weighting Memo', 'Documentation of data weighting approach', 'report')
ON CONFLICT (deliverable_code) DO NOTHING;

-- 4. Question Sets (Clarification question templates by study type)
INSERT INTO question_sets (set_code, display_name, questions) VALUES
('qual_standard', 'Qualitative Study Questions',
  '[
    {"question_code": "Q_INTERVIEW_LENGTH", "question_text": "What is the target interview length (minutes)?", "priority": "high"},
    {"question_code": "Q_IDI_MODERATOR", "question_text": "Do you require a specific moderator profile (e.g., clinical background)?", "priority": "medium"},
    {"question_code": "Q_DISCUSSION_GUIDE", "question_text": "Will you provide the discussion guide, or would you like us to draft it?", "priority": "high"},
    {"question_code": "Q_RECORDING", "question_text": "Do you require video recording, or is audio sufficient?", "priority": "low"},
    {"question_code": "Q_TRANSCRIPT_TURNAROUND", "question_text": "What is your required turnaround time for transcripts?", "priority": "medium"}
  ]'::jsonb),

('quant_standard', 'Quantitative Survey Questions',
  '[
    {"question_code": "Q_LOI", "question_text": "What is the target survey length of interview (LOI) in minutes?", "priority": "high"},
    {"question_code": "Q_INCIDENCE", "question_text": "What is the expected incidence rate for your target population?", "priority": "high"},
    {"question_code": "Q_QUOTA_DISTRIBUTION", "question_text": "Please specify quota distribution across segments (if applicable).", "priority": "medium"},
    {"question_code": "Q_SCREENING_CRITERIA", "question_text": "Are there additional screening criteria beyond what was listed in the RFP?", "priority": "high"},
    {"question_code": "Q_SURVEY_PROGRAMMING", "question_text": "Do you have a preferred survey platform (e.g., Qualtrics, Confirmit)?", "priority": "low"},
    {"question_code": "Q_DATA_DELIVERY", "question_text": "What data format do you require (SPSS, CSV, Excel)?", "priority": "medium"}
  ]'::jsonb),

('conjoint_standard', 'Conjoint Analysis Questions',
  '[
    {"question_code": "Q_ATTRIBUTES_COUNT", "question_text": "How many attributes and levels are you planning to test?", "priority": "high"},
    {"question_code": "Q_CONJOINT_TYPE", "question_text": "Do you prefer CBC (Choice-Based Conjoint) or other methodology?", "priority": "high"},
    {"question_code": "Q_CHOICE_TASKS", "question_text": "How many choice tasks per respondent?", "priority": "medium"},
    {"question_code": "Q_UTILITY_ESTIMATION", "question_text": "Do you require HB (Hierarchical Bayes) estimation?", "priority": "medium"},
    {"question_code": "Q_SIMULATOR", "question_text": "Do you need a market simulator deliverable?", "priority": "low"}
  ]'::jsonb),

('tracker_standard', 'Tracker Study Questions',
  '[
    {"question_code": "Q_WAVE_FREQUENCY", "question_text": "What is the desired wave frequency (monthly, quarterly, bi-annual)?", "priority": "high"},
    {"question_code": "Q_WAVE_COUNT", "question_text": "How many waves are planned for the initial contract?", "priority": "high"},
    {"question_code": "Q_HISTORICAL_DATA", "question_text": "Is there historical baseline data we should align with?", "priority": "medium"},
    {"question_code": "Q_WAVE_SAMPLE_REFRESH", "question_text": "Should the sample be fully refreshed each wave, or use a panel?", "priority": "medium"},
    {"question_code": "Q_KPI_DASHBOARD", "question_text": "Do you require a live dashboard for ongoing tracking?", "priority": "low"}
  ]'::jsonb)

ON CONFLICT (set_code) DO NOTHING;
