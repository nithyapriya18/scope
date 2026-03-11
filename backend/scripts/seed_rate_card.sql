-- Seed Rate Card
-- Creates demo rate card for PetaSight Demo tenant

INSERT INTO rate_cards (
  tenant_id,
  card_name,
  effective_date,
  currency,
  rate_items,
  is_active
) VALUES (
  'a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0',
  'PetaSight Standard Rates 2026',
  '2026-01-01',
  'USD',
  '[
    {
      "role": "PM",
      "display_name": "Project Manager",
      "cost_rate": 85.00,
      "sell_rate": 195.00,
      "seniority": "senior"
    },
    {
      "role": "analyst",
      "display_name": "Research Analyst",
      "cost_rate": 55.00,
      "sell_rate": 145.00,
      "seniority": "mid"
    },
    {
      "role": "statistician",
      "display_name": "Statistician",
      "cost_rate": 70.00,
      "sell_rate": 175.00,
      "seniority": "senior"
    },
    {
      "role": "programmer",
      "display_name": "Survey Programmer",
      "cost_rate": 50.00,
      "sell_rate": 125.00,
      "seniority": "mid"
    },
    {
      "role": "designer",
      "display_name": "Visual Designer",
      "cost_rate": 45.00,
      "sell_rate": 115.00,
      "seniority": "mid"
    },
    {
      "role": "moderator",
      "display_name": "Qualitative Moderator",
      "cost_rate": 95.00,
      "sell_rate": 225.00,
      "seniority": "senior"
    },
    {
      "role": "recruiter",
      "display_name": "Participant Recruiter",
      "cost_rate": 35.00,
      "sell_rate": 85.00,
      "seniority": "junior"
    },
    {
      "role": "assistant",
      "display_name": "Research Assistant",
      "cost_rate": 30.00,
      "sell_rate": 75.00,
      "seniority": "junior"
    },
    {
      "role": "transcriptionist",
      "display_name": "Transcriptionist",
      "cost_rate": 25.00,
      "sell_rate": 65.00,
      "seniority": "junior"
    },
    {
      "role": "translator",
      "display_name": "Translator",
      "cost_rate": 40.00,
      "sell_rate": 95.00,
      "seniority": "mid"
    },
    {
      "role": "coordinator",
      "display_name": "Project Coordinator",
      "cost_rate": 35.00,
      "sell_rate": 85.00,
      "seniority": "junior"
    },
    {
      "role": "QC_reviewer",
      "display_name": "QC Reviewer",
      "cost_rate": 60.00,
      "sell_rate": 150.00,
      "seniority": "senior"
    }
  ]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- Create OOP Catalog Items (panels, incentives, translation, travel)
INSERT INTO oop_catalog_items (tenant_id, item_code, display_name, category, unit_type, cost_per_unit) VALUES
-- Panel Costs
('a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', 'PANEL_HCP_US', 'HCP Panel - US', 'panel', 'per_completes', 75.00),
('a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', 'PANEL_HCP_EU', 'HCP Panel - Europe', 'panel', 'per_completes', 85.00),
('a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', 'PANEL_HCP_ASIA', 'HCP Panel - Asia Pacific', 'panel', 'per_completes', 95.00),
('a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', 'PANEL_PATIENT_US', 'Patient Panel - US', 'panel', 'per_completes', 45.00),
('a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', 'PANEL_PATIENT_EU', 'Patient Panel - Europe', 'panel', 'per_completes', 55.00),
('a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', 'PANEL_PAYER_US', 'Payer Panel - US', 'panel', 'per_completes', 125.00),

-- Incentives
('a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', 'INCENTIVE_HCP_30MIN', 'HCP Incentive - 30 min', 'incentive', 'per_completes', 150.00),
('a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', 'INCENTIVE_HCP_60MIN', 'HCP Incentive - 60 min', 'incentive', 'per_completes', 300.00),
('a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', 'INCENTIVE_PATIENT_30MIN', 'Patient Incentive - 30 min', 'incentive', 'per_completes', 75.00),
('a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', 'INCENTIVE_PATIENT_60MIN', 'Patient Incentive - 60 min', 'incentive', 'per_completes', 150.00),
('a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', 'INCENTIVE_PAYER_60MIN', 'Payer Incentive - 60 min', 'incentive', 'per_completes', 400.00),

-- Translation
('a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', 'TRANSLATION_PAGE', 'Translation per Page', 'translation', 'per_page', 35.00),
('a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', 'BACK_TRANSLATION_PAGE', 'Back-Translation per Page', 'translation', 'per_page', 45.00),

-- Travel
('a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', 'TRAVEL_DOMESTIC', 'Domestic Travel', 'travel', 'per_trip', 1200.00),
('a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', 'TRAVEL_INTERNATIONAL', 'International Travel', 'travel', 'per_trip', 3500.00),

-- Misc
('a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', 'IRB_SUBMISSION', 'IRB Submission Fee', 'regulatory', 'per_submission', 2500.00),
('a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0', 'HOSTING_PLATFORM', 'Survey Hosting Platform', 'technology', 'per_project', 500.00)

ON CONFLICT (item_code) DO NOTHING;
