-- Seed Demo Tenant
-- Creates a demo tenant for development and testing

-- 1. Create demo tenant
INSERT INTO tenants (id, name, domain, settings) VALUES
(
  'a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0',
  'PetaSight Demo',
  'petasight.demo',
  '{
    "branding": {
      "logo_uri": "/images/petasight-logo.png",
      "primary_color": "#da365c"
    },
    "features": {
      "auto_processing": true,
      "hil_approvals": ["clarifications", "final_documents"]
    }
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  settings = EXCLUDED.settings;

-- 2. Update demo user to link to tenant
UPDATE users
SET tenant_id = 'a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0'
WHERE email = 'demo@lumina.com';

-- 3. Update all existing opportunities to link to tenant
UPDATE opportunities
SET tenant_id = 'a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0'
WHERE tenant_id IS NULL;
