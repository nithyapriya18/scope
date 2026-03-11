-- Seed Quality Gates for Lumina Scope
-- These gates validate transitions between workflow steps

-- Gate 1: Intake → Brief Extraction
INSERT INTO quality_gates (gate_code, from_step, to_step, validation_rules, blocking) VALUES
('intake_to_brief', 'intake', 'brief_extract', '[
  {"field": "intake.clientName", "rule": "required"},
  {"field": "intake.rfpTitle", "rule": "required"},
  {"field": "intake.therapeuticArea", "rule": "required"}
]'::jsonb, true);

-- Gate 2: Brief Extraction → Gap Analysis
INSERT INTO quality_gates (gate_code, from_step, to_step, validation_rules, blocking) VALUES
('brief_to_gap', 'brief_extract', 'gap_analysis', '[
  {"field": "brief.objectives", "rule": "min_length", "threshold": 1},
  {"field": "brief.targetAudience", "rule": "required"},
  {"field": "brief.studyType", "rule": "required"}
]'::jsonb, true);

-- Gate 3: Gap Analysis → Clarification (conditional - only if critical gaps exist)
INSERT INTO quality_gates (gate_code, from_step, to_step, validation_rules, blocking) VALUES
('gap_to_clarification', 'gap_analysis', 'clarification', '[
  {"field": "gapAnalysis.criticalGapsCount", "rule": "min_value", "threshold": 1}
]'::jsonb, false);

-- Gate 4: Gap Analysis → Scope Planning (conditional - only if no critical gaps)
INSERT INTO quality_gates (gate_code, from_step, to_step, validation_rules, blocking) VALUES
('gap_to_scope', 'gap_analysis', 'scope_planning', '[
  {"field": "gapAnalysis.criticalGapsCount", "rule": "max_value", "threshold": 0}
]'::jsonb, false);

-- Gate 5: Clarification → Scope Planning (after approval)
INSERT INTO quality_gates (gate_code, from_step, to_step, validation_rules, blocking) VALUES
('clarification_to_scope', 'clarification', 'scope_planning', '[
  {"field": "clarifications.status", "rule": "equals", "value": "sent"}
]'::jsonb, true);

-- Gate 6: Scope Planning → WBS Estimation
INSERT INTO quality_gates (gate_code, from_step, to_step, validation_rules, blocking) VALUES
('scope_to_wbs', 'scope_planning', 'wbs_estimate', '[
  {"field": "scope.selectedOption", "rule": "required"},
  {"field": "scope.sampleOptions", "rule": "min_length", "threshold": 3},
  {"field": "scope.assumptions", "rule": "min_length", "threshold": 1}
]'::jsonb, true);

-- Gate 7: WBS Estimation → Pricing
INSERT INTO quality_gates (gate_code, from_step, to_step, validation_rules, blocking) VALUES
('wbs_to_pricing', 'wbs_estimate', 'pricing', '[
  {"field": "wbs.tasks", "rule": "min_length", "threshold": 5},
  {"field": "wbs.totalHours", "rule": "min_value", "threshold": 10}
]'::jsonb, true);

-- Gate 8: Pricing → Document Generation
INSERT INTO quality_gates (gate_code, from_step, to_step, validation_rules, blocking) VALUES
('pricing_to_documents', 'pricing', 'document_gen', '[
  {"field": "pricing.totalPrice", "rule": "min_value", "threshold": 1000},
  {"field": "pricing.marginPercent", "rule": "min_value", "threshold": 15}
]'::jsonb, true);

-- Gate 9: Document Generation → Approval (final approval gate)
INSERT INTO quality_gates (gate_code, from_step, to_step, validation_rules, blocking) VALUES
('documents_to_approval', 'document_gen', 'approved', '[
  {"field": "documents.proposalUri", "rule": "required"},
  {"field": "documents.sowUri", "rule": "required"}
]'::jsonb, true);
