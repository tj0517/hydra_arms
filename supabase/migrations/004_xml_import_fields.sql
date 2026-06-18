-- migration: 004_xml_import_fields
-- Adds fields needed by the XML import engine to shop_products.
-- Also adds source_connectors table for per-supplier configuration.

-- ── 0. Fix schema gaps that block XML imports ─────────────────────────────────

-- BL products need inventory_id; XML products don't. Make it nullable.
ALTER TABLE shop_products
  ALTER COLUMN inventory_id DROP NOT NULL;

-- Create a sequence for XML-sourced product IDs.
-- Starts at 2_000_000_000 — safely above any real BL product ID (typically 6-8 digits).
CREATE SEQUENCE IF NOT EXISTS xml_product_id_seq START WITH 2000000000 INCREMENT BY 1;

-- Function callable via supabase.rpc('next_xml_product_id') from the engine
CREATE OR REPLACE FUNCTION next_xml_product_id()
RETURNS BIGINT
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT nextval('xml_product_id_seq');
$$;

-- ── 1. Extend shop_products ──────────────────────────────────────────────────

-- Track which connector this product came from
ALTER TABLE shop_products
  ADD COLUMN IF NOT EXISTS connector             TEXT,
  ADD COLUMN IF NOT EXISTS connector_product_id  TEXT,
  ADD COLUMN IF NOT EXISTS connector_sku         TEXT,
  ADD COLUMN IF NOT EXISTS primary_source        TEXT DEFAULT 'baselinker';

-- Unique constraint: one product per connector source
-- (allows same EAN from different connectors to exist as separate records
--  until admin merges them)
CREATE UNIQUE INDEX IF NOT EXISTS idx_connector_product
  ON shop_products (connector, connector_product_id)
  WHERE connector IS NOT NULL AND connector_product_id IS NOT NULL;

-- Compliance fields (admin-set, never overwritten by sync)
ALTER TABLE shop_products
  ADD COLUMN IF NOT EXISTS age_min              INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_license     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS license_category     TEXT,
  ADD COLUMN IF NOT EXISTS delivery_allowed     BOOLEAN NOT NULL DEFAULT TRUE;

-- Review / admin queue fields
ALTER TABLE shop_products
  ADD COLUMN IF NOT EXISTS review_flags         JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS completeness_score   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes_internal       TEXT;

-- Sync control
ALTER TABLE shop_products
  ADD COLUMN IF NOT EXISTS sync_locked_fields   TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Pricing additions
ALTER TABLE shop_products
  ADD COLUMN IF NOT EXISTS price_purchase       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_compare        NUMERIC(10,2);

-- Display / merchandising
ALTER TABLE shop_products
  ADD COLUMN IF NOT EXISTS slug                 TEXT,
  ADD COLUMN IF NOT EXISTS short_description    TEXT,
  ADD COLUMN IF NOT EXISTS is_featured          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS badge                TEXT,
  ADD COLUMN IF NOT EXISTS availability_status  TEXT DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS meta_title           TEXT,
  ADD COLUMN IF NOT EXISTS meta_description     TEXT;

-- Shipping
ALTER TABLE shop_products
  ADD COLUMN IF NOT EXISTS dimensions           JSONB,
  ADD COLUMN IF NOT EXISTS shipping_class       TEXT DEFAULT 'standard';

-- Slug index
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_products_slug
  ON shop_products (slug)
  WHERE slug IS NOT NULL;

-- ── 2. source_connectors table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS source_connectors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT UNIQUE NOT NULL,     -- 'kolba', 'sharg', 'spechurt'
  display_name        TEXT,
  xml_url             TEXT NOT NULL,
  auth_type           TEXT NOT NULL DEFAULT 'none',
  auth_config         JSONB DEFAULT '{}'::jsonb,  -- {username, password} etc.
  charset             TEXT NOT NULL DEFAULT 'utf-8',
  feed_type           TEXT DEFAULT 'full',        -- 'full' | 'light' | 'gateway'
  extra_config        JSONB DEFAULT '{}'::jsonb,  -- connector-specific extras
  sync_schedule       TEXT DEFAULT '0 2 * * *',   -- cron: daily 02:00 UTC
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at      TIMESTAMPTZ,
  last_sync_status    TEXT DEFAULT 'never',        -- 'ok' | 'partial' | 'error' | 'never'
  last_sync_stats     JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populate with known connectors
INSERT INTO source_connectors (name, display_name, xml_url, auth_type, charset, feed_type, extra_config)
VALUES
  (
    'kolba',
    'Kolba B2B',
    'https://b2b.kolba.pl/assets/integrations/instance/megaimport/KOLBAB2B.xml',
    'none',
    'utf-8',
    'full',
    '{}'::jsonb
  ),
  (
    'sharg',
    'Sharg (hurt.sharg.pl)',
    'https://hurt.sharg.pl/edi/export-offer.php?client=office@hydra-arms.com&language=pol&token=d3bcbca5d1dd6f67ee28406&shop=3&type=full&format=xml&iof_3_0',
    'none',
    'utf-8',
    'full',
    jsonb_build_object(
      'light_url', 'https://hurt.sharg.pl/edi/export-offer.php?client=office@hydra-arms.com&language=pol&token=7775b406cdd1ba74ae3eafb&shop=3&type=light&format=xml&iof_3_0',
      'gateway_url', 'https://hurt.sharg.pl/edi/export-offer.php?client=office@hydra-arms.com&language=pol&token=499e719ac9b5499a0693367&shop=3&type=gateway&format=xml&iof_3_0'
    )
  ),
  (
    'spechurt',
    'Spechurt (BLOCKED — IP not whitelisted)',
    'https://b2b.spechurt.pl/xml_heavy_export.php?key=7e77a720d1d9eefce296983de6c0eb00',
    'query_param',
    'utf-8',
    'full',
    '{}'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- ── 3. Backfill existing BL products with connector = 'baselinker' ───────────

UPDATE shop_products
  SET connector = 'baselinker',
      connector_product_id = id::text,
      primary_source = 'baselinker'
  WHERE connector IS NULL;
