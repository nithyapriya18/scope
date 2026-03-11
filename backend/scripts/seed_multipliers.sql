-- Seed Multipliers
-- Creates multiplier definitions for complexity adjustments in WBS

INSERT INTO multiplier_definitions (multiplier_code, display_name, description, driver_field, lookup_table, applies_to_tasks) VALUES

-- Length of Interview (LOI) Multiplier
('M_LOI', 'Length of Interview', 'Adjust for survey length complexity', 'brief.target_loi',
  '{
    "0-10": 0.8,
    "11-20": 1.0,
    "21-30": 1.2,
    "31-45": 1.5,
    "46+": 1.8
  }'::jsonb,
  ARRAY['T_QUESTIONNAIRE_DRAFT', 'T_SURVEY_PROGRAMMING', 'T_SURVEY_TESTING']
),

-- Rush Timeline Multiplier
('M_RUSH', 'Rush Timeline', 'Adjust for accelerated timeline', 'brief.timeline_pressure',
  '{
    "standard": 1.0,
    "moderate_rush": 1.15,
    "urgent": 1.3,
    "emergency": 1.5
  }'::jsonb,
  NULL  -- Applies to ALL tasks
),

-- Multi-Country Complexity
('M_MULTI_COUNTRY', 'Multi-Country', 'Adjust for multi-country coordination', 'brief.countries.length',
  '{
    "1": 1.0,
    "2-3": 1.2,
    "4-6": 1.4,
    "7-10": 1.6,
    "11+": 1.8
  }'::jsonb,
  ARRAY['T_SAMPLE_SOURCING', 'T_FIELDWORK_MANAGEMENT', 'T_PM_WEEKLY', 'T_TRANSLATION_MATERIALS']
),

-- Multi-Language Complexity
('M_MULTI_LANGUAGE', 'Multi-Language', 'Adjust for translation and cultural adaptation', 'brief.languages.length',
  '{
    "1": 1.0,
    "2": 1.15,
    "3-4": 1.3,
    "5+": 1.5
  }'::jsonb,
  ARRAY['T_QUESTIONNAIRE_DRAFT', 'T_SURVEY_PROGRAMMING', 'T_TRANSLATION_MATERIALS', 'T_REPORT_DRAFTING']
),

-- Audience Complexity (HCP subspecialty, rare patients)
('M_AUDIENCE_DIFFICULTY', 'Audience Difficulty', 'Adjust for hard-to-reach audiences', 'brief.audience_difficulty',
  '{
    "general": 1.0,
    "moderate": 1.2,
    "difficult": 1.4,
    "very_rare": 1.7
  }'::jsonb,
  ARRAY['T_SAMPLE_SOURCING', 'T_RECRUITMENT_QUAL', 'T_FIELDWORK_MANAGEMENT']
),

-- Conjoint Complexity (attribute count)
('M_CONJOINT_COMPLEXITY', 'Conjoint Complexity', 'Adjust for conjoint design complexity', 'brief.conjoint_attributes',
  '{
    "3-5": 1.0,
    "6-8": 1.3,
    "9-12": 1.6,
    "13+": 2.0
  }'::jsonb,
  ARRAY['T_CONJOINT_DESIGN', 'T_CONJOINT_PROGRAMMING', 'T_CONJOINT_ANALYSIS']
),

-- Sample Size Complexity
('M_SAMPLE_SIZE', 'Sample Size', 'Adjust for large sample sizes', 'brief.target_n',
  '{
    "0-200": 1.0,
    "201-500": 1.1,
    "501-1000": 1.2,
    "1001-2000": 1.3,
    "2001+": 1.5
  }'::jsonb,
  ARRAY['T_DATA_CLEANING', 'T_TABULATION', 'T_CHARTING', 'T_FIELDWORK_MANAGEMENT']
),

-- Reporting Complexity
('M_REPORTING_DEPTH', 'Reporting Depth', 'Adjust for report depth and customization', 'brief.reporting_depth',
  '{
    "topline_only": 0.5,
    "standard": 1.0,
    "detailed": 1.3,
    "comprehensive": 1.6
  }'::jsonb,
  ARRAY['T_REPORT_DRAFTING', 'T_PPT_DEVELOPMENT', 'T_CHARTING']
),

-- Client Review Intensity
('M_CLIENT_REVIEW', 'Client Review Intensity', 'Adjust for client review cycles', 'brief.client_review_intensity',
  '{
    "minimal": 0.8,
    "standard": 1.0,
    "intensive": 1.4,
    "highly_iterative": 1.8
  }'::jsonb,
  ARRAY['T_QUESTIONNAIRE_REVIEW', 'T_CLIENT_REVIEW_CYCLE']
),

-- Regulatory Complexity (IRB, ethics)
('M_REGULATORY', 'Regulatory Complexity', 'Adjust for regulatory requirements', 'brief.regulatory_complexity',
  '{
    "none": 1.0,
    "standard_irb": 1.2,
    "multi_country_ethics": 1.5,
    "fda_submission": 2.0
  }'::jsonb,
  ARRAY['T_IRB_PREP', 'T_PM_WEEKLY']
),

-- Data Complexity (open-ends, complex piping)
('M_DATA_COMPLEXITY', 'Data Complexity', 'Adjust for complex data structures', 'brief.data_complexity',
  '{
    "simple": 1.0,
    "moderate": 1.2,
    "complex": 1.5,
    "highly_complex": 1.8
  }'::jsonb,
  ARRAY['T_SURVEY_PROGRAMMING', 'T_DATA_CLEANING', 'T_TABULATION']
),

-- Vendor Coordination
('M_VENDOR_COORD', 'Vendor Coordination', 'Adjust for vendor management overhead', 'brief.vendor_count',
  '{
    "0": 1.0,
    "1": 1.1,
    "2-3": 1.2,
    "4+": 1.4
  }'::jsonb,
  ARRAY['T_VENDOR_MANAGEMENT', 'T_PM_WEEKLY']
)

ON CONFLICT (multiplier_code) DO NOTHING;

-- Multiplier Sets (bundles for study types)
INSERT INTO multiplier_sets (set_code, display_name, multiplier_codes) VALUES
('qual_standard_multipliers', 'Qualitative Study Multipliers',
  ARRAY['M_RUSH', 'M_MULTI_COUNTRY', 'M_MULTI_LANGUAGE', 'M_AUDIENCE_DIFFICULTY', 'M_REPORTING_DEPTH', 'M_CLIENT_REVIEW', 'M_REGULATORY', 'M_VENDOR_COORD']),

('quant_standard_multipliers', 'Quantitative Study Multipliers',
  ARRAY['M_LOI', 'M_RUSH', 'M_MULTI_COUNTRY', 'M_MULTI_LANGUAGE', 'M_AUDIENCE_DIFFICULTY', 'M_SAMPLE_SIZE', 'M_REPORTING_DEPTH', 'M_CLIENT_REVIEW', 'M_REGULATORY', 'M_DATA_COMPLEXITY', 'M_VENDOR_COORD']),

('conjoint_multipliers', 'Conjoint Study Multipliers',
  ARRAY['M_LOI', 'M_RUSH', 'M_MULTI_COUNTRY', 'M_MULTI_LANGUAGE', 'M_CONJOINT_COMPLEXITY', 'M_SAMPLE_SIZE', 'M_REPORTING_DEPTH', 'M_CLIENT_REVIEW', 'M_DATA_COMPLEXITY', 'M_VENDOR_COORD']),

('tracker_multipliers', 'Tracker Study Multipliers',
  ARRAY['M_LOI', 'M_RUSH', 'M_MULTI_COUNTRY', 'M_SAMPLE_SIZE', 'M_REPORTING_DEPTH', 'M_DATA_COMPLEXITY'])

ON CONFLICT (set_code) DO NOTHING;

-- Link study definitions to multiplier sets
UPDATE study_definitions SET multiplier_set_code = 'qual_standard_multipliers' WHERE type_code IN ('deep_dive', 'patient_journey', 'kol_advisory');
UPDATE study_definitions SET multiplier_set_code = 'quant_standard_multipliers' WHERE type_code IN ('uaa', 'awareness_tracker', 'concept_test', 'positioning_test', 'message_test');
UPDATE study_definitions SET multiplier_set_code = 'conjoint_multipliers' WHERE type_code IN ('conjoint', 'dce', 'maxdiff');
UPDATE study_definitions SET multiplier_set_code = 'tracker_multipliers' WHERE type_code IN ('tracker');
