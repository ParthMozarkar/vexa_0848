
-- Task 1: White Label & Branding
ALTER TABLE IF EXISTS organizations 
ADD COLUMN IF NOT EXISTS branding_config JSONB DEFAULT '{
  "primaryColor": "#4A6741",
  "logoUrl": "",
  "fontFamily": "Inter",
  "theme": "light"
}';

-- Task 3: Enterprise Permissions
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE, -- 'api:read', 'admin:write'
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT, -- 'owner', 'admin', 'member'
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id)
);

-- Task 4: API Platform
CREATE TABLE IF NOT EXISTS developer_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT,
  api_key_id UUID REFERENCES api_keys(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task 5: Conversion & Enterprise Analytics
CREATE TABLE IF NOT EXISTS conversion_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID,
  event_type TEXT, -- 'try_on_start', 'try_on_complete', 'add_to_cart', 'purchase'
  product_id TEXT,
  metadata JSONB, -- { "order_value": 120.00, "currency": "USD" }
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant Isolation Views
CREATE OR REPLACE VIEW tenant_assets AS
SELECT ca.*, o.id as org_id
FROM clothing_assets ca
JOIN api_keys ak ON ca.product_id LIKE '%' || ak.marketplace_id || '%'
JOIN organizations o ON ak.marketplace_id = o.slug;
