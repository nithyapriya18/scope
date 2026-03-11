-- Seed Study Definitions
-- Links study types to task sets, question sets, and multiplier sets

-- Qualitative studies
INSERT INTO study_definitions (type_code, task_set_code, question_set_code, multiplier_set_code, default_deliverables) VALUES
('deep_dive', 'qual_standard', 'qual_standard', 'qual_standard_multipliers',
  ARRAY['exec_summary', 'final_report', 'transcript_verbatims', 'readout_ppt']),
('patient_journey', 'qual_standard', 'qual_standard', 'qual_standard_multipliers',
  ARRAY['exec_summary', 'final_report', 'transcript_verbatims', 'readout_ppt', 'infographic']),
('kol_advisory', 'qual_standard', 'qual_standard', 'qual_standard_multipliers',
  ARRAY['exec_summary', 'readout_ppt', 'transcript_verbatims']),

-- Quantitative surveys
('uaa', 'quant_standard', 'quant_standard', 'quant_standard_multipliers',
  ARRAY['exec_summary', 'topline', 'final_report', 'data_tables', 'raw_data', 'readout_ppt']),
('awareness_tracker', 'tracker_standard', 'tracker_standard', 'tracker_multipliers',
  ARRAY['exec_summary', 'topline', 'data_tables', 'dashboard', 'readout_ppt']),
('concept_test', 'quant_standard', 'quant_standard', 'quant_standard_multipliers',
  ARRAY['exec_summary', 'topline', 'final_report', 'data_tables', 'readout_ppt']),
('positioning_test', 'quant_standard', 'quant_standard', 'quant_standard_multipliers',
  ARRAY['exec_summary', 'topline', 'final_report', 'data_tables', 'readout_ppt']),
('message_test', 'quant_standard', 'quant_standard', 'quant_standard_multipliers',
  ARRAY['exec_summary', 'topline', 'final_report', 'data_tables', 'readout_ppt']),
('creative_test', 'quant_standard', 'quant_standard', 'quant_standard_multipliers',
  ARRAY['exec_summary', 'topline', 'final_report', 'data_tables', 'readout_ppt', 'video_summary']),
('usability_test', 'qual_standard', 'qual_standard', 'qual_standard_multipliers',
  ARRAY['exec_summary', 'final_report', 'video_summary', 'readout_ppt']),

-- Conjoint/Choice modeling
('conjoint', 'conjoint_standard', 'conjoint_standard', 'conjoint_multipliers',
  ARRAY['exec_summary', 'final_report', 'data_tables', 'raw_data', 'readout_ppt', 'methodology_annex']),
('dce', 'conjoint_standard', 'conjoint_standard', 'conjoint_multipliers',
  ARRAY['exec_summary', 'final_report', 'data_tables', 'raw_data', 'readout_ppt', 'methodology_annex']),
('maxdiff', 'conjoint_standard', 'conjoint_standard', 'conjoint_multipliers',
  ARRAY['exec_summary', 'final_report', 'data_tables', 'readout_ppt']),
('priority_map', 'quant_standard', 'quant_standard', 'quant_standard_multipliers',
  ARRAY['exec_summary', 'final_report', 'data_tables', 'readout_ppt', 'infographic']),

-- Segmentation
('seg_build', 'quant_standard', 'quant_standard', 'quant_standard_multipliers',
  ARRAY['exec_summary', 'final_report', 'data_tables', 'raw_data', 'readout_ppt', 'methodology_annex']),
('seg_validation', 'quant_standard', 'quant_standard', 'quant_standard_multipliers',
  ARRAY['exec_summary', 'final_report', 'data_tables', 'readout_ppt']),
('seg_sizing', 'quant_standard', 'quant_standard', 'quant_standard_multipliers',
  ARRAY['exec_summary', 'final_report', 'data_tables', 'readout_ppt']),
('personas', 'qual_standard', 'qual_standard', 'qual_standard_multipliers',
  ARRAY['exec_summary', 'final_report', 'readout_ppt', 'infographic']),

-- Pricing & Market Access
('wtp', 'quant_standard', 'quant_standard', 'quant_standard_multipliers',
  ARRAY['exec_summary', 'final_report', 'data_tables', 'raw_data', 'readout_ppt', 'methodology_annex']),
('payer_research', 'qual_standard', 'qual_standard', 'qual_standard_multipliers',
  ARRAY['exec_summary', 'final_report', 'transcript_verbatims', 'readout_ppt']),
('hta_research', 'qual_standard', 'qual_standard', 'qual_standard_multipliers',
  ARRAY['exec_summary', 'final_report', 'transcript_verbatims', 'readout_ppt', 'methodology_annex']),
('formulary_study', 'qual_standard', 'qual_standard', 'qual_standard_multipliers',
  ARRAY['exec_summary', 'final_report', 'readout_ppt']),

-- Trackers
('tracker', 'tracker_standard', 'tracker_standard', 'tracker_multipliers',
  ARRAY['exec_summary', 'topline', 'data_tables', 'dashboard', 'readout_ppt']),
('patient_registry', 'tracker_standard', 'tracker_standard', 'tracker_multipliers',
  ARRAY['exec_summary', 'data_tables', 'raw_data', 'dashboard', 'methodology_annex']),

-- Mixed/Other
('mixed_methods', 'quant_standard', 'quant_standard', 'quant_standard_multipliers',
  ARRAY['exec_summary', 'final_report', 'data_tables', 'transcript_verbatims', 'readout_ppt']),
('omnibus', 'quant_standard', 'quant_standard', 'quant_standard_multipliers',
  ARRAY['exec_summary', 'topline', 'data_tables', 'raw_data']),
('ad_hoc', 'quant_standard', 'quant_standard', 'quant_standard_multipliers',
  ARRAY['exec_summary', 'final_report', 'readout_ppt'])

ON CONFLICT DO NOTHING;
