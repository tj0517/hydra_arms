-- 019_shop_listing.sql (HA-2.34)
--
-- Shop listing computed in Postgres. Today fetchShopData pulls the whole catalogue
-- into the browser: the query has no .range() so it stops at 1 000 rows, the
-- unstable_cache entry is over the 2 MB limit and is silently not stored, and
-- getReservedQuantities with .in(10k ids) fails inside an empty catch. Prod already
-- has 5 084 active products. This migration adds the database side only; the app is
-- switched over in HA-2.35.
--
-- 1. Extensions pg_trgm + unaccent (schema extensions) and public.f_unaccent(text):
--    unaccent with the dictionary passed explicitly — only then is it really
--    IMMUTABLE and usable in an index expression. EXECUTE stays at the default
--    (PUBLIC): it is a pure function and index maintenance runs it as the writer.
-- 2. shop_products.pickup_only — GENERATED ALWAYS ... STORED, a mirror of
--    mustPickup() in src/lib/shop/cartAnalysis.ts (tj decision 2026-10-24, D1 = A).
--    Hydra sections 01/02 are covered by delivery_allowed = false from the sync
--    (HA-2.17). All four source columns are NOT NULL, so the SQL and TS results
--    cannot diverge on NULL. checkout_create_order keeps its own condition plus
--    hydra_section — it is NOT switched to this column here.
-- 3. Indexes for the listing filters and search. btree on brand already exists (014).
-- 4. public.shop_listing(...) → jsonb: one page of 24 cards (PUBLIC_PRODUCT_COLUMNS
--    without description), total, brand and spec counters. stock = stock − reserved,
--    reserved = order_items of orders with status = 'paid' AND baselinker_order_id
--    IS NULL (same definition as 016 and src/lib/shop/reservedStock.ts).
--    Counters (tj decision 2026-10-24, B): brands are counted with every other
--    filter except brand, specs with every other filter except specs (only when a
--    category is selected; keys with >= 2 values; OR within a key, AND across keys).
--    Input normalisation (approved signature, STOP 1):
--      p_category_ids NULL or '{}'  → no category filter, specs = []
--      p_q            trimmed; NULL/'' → no filter; % and _ match literally
--      p_in_stock     NULL → false
--      p_min/p_max    a product without a price is excluded when a bound is set
--      p_brand        NULL/'' → no filter
--      p_delivery     'wysylka' → NOT pickup_only, 'odbior' → pickup_only, else no filter
--      p_specs        {"key": ["v1", ...]}; keys without a non-empty array are ignored
--      p_sort         name_asc|name_desc|price_asc|price_desc|newest, else → name_asc
--      p_page         NULL or < 1 → 1
-- 5. public.shop_tree() → jsonb: every category with its count of active products
--    directly in it (the app sums descendants) and the price range of active
--    products with price > 0 (null/null when there are none).
--    Both functions: SECURITY DEFINER (they read orders/order_items for the
--    reservation), search_path pinned, EXECUTE for service_role only (016 pattern).
--
-- Rollback (manual):
--   DROP FUNCTION public.shop_listing(bigint[], text, boolean, numeric, numeric, text, text, jsonb, text, integer);
--   DROP FUNCTION public.shop_tree();
--   DROP INDEX public.idx_shop_products_active_category, public.idx_shop_products_active_price,
--     public.idx_shop_products_active_pickup, public.idx_shop_products_name_trgm,
--     public.idx_shop_products_sku_trgm, public.idx_shop_products_features;
--   ALTER TABLE public.shop_products DROP COLUMN pickup_only;
--   DROP FUNCTION public.f_unaccent(text);
--   The extensions may stay (nothing else depends on them).

-- ── 1. extensions + f_unaccent ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
  SELECT extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;

-- ── 2. pickup_only ──────────────────────────────────────────────────────────
ALTER TABLE public.shop_products
  ADD COLUMN pickup_only boolean
  GENERATED ALWAYS AS (
    product_type <> 'standard' OR requires_license OR NOT delivery_allowed OR age_min >= 18
  ) STORED;

COMMENT ON COLUMN public.shop_products.pickup_only IS
  'HA-2.34: mirror of mustPickup() in src/lib/shop/cartAnalysis.ts — keep both in sync. Sections 01/02 are covered by delivery_allowed = false from the sync (HA-2.17).';

-- ── 3. indexes ──────────────────────────────────────────────────────────────
CREATE INDEX idx_shop_products_active_category ON public.shop_products (is_active, category_id);
CREATE INDEX idx_shop_products_active_price    ON public.shop_products (is_active, price);
CREATE INDEX idx_shop_products_active_pickup   ON public.shop_products (is_active, pickup_only);
CREATE INDEX idx_shop_products_name_trgm
  ON public.shop_products USING gin (public.f_unaccent(name) extensions.gin_trgm_ops);
CREATE INDEX idx_shop_products_sku_trgm
  ON public.shop_products USING gin (sku extensions.gin_trgm_ops);
CREATE INDEX idx_shop_products_features
  ON public.shop_products USING gin (features jsonb_path_ops);

-- ── 4. shop_listing ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.shop_listing(
  p_category_ids bigint[],
  p_q            text,
  p_in_stock     boolean,
  p_min          numeric,
  p_max          numeric,
  p_brand        text,
  p_delivery     text,
  p_specs        jsonb,
  p_sort         text,
  p_page         integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  c_page_size CONSTANT integer := 24;
  v_cats      bigint[] := CASE WHEN cardinality(p_category_ids) > 0 THEN p_category_ids END;
  v_q         text     := NULLIF(btrim(p_q), '');
  v_like      text;
  v_name_pat  text;
  v_sku_pat   text;
  v_in_stock  boolean  := COALESCE(p_in_stock, false);
  v_brand     text     := NULLIF(p_brand, '');
  v_delivery  text     := CASE WHEN p_delivery IN ('wysylka', 'odbior') THEN p_delivery END;
  v_specs     jsonb;
  v_sort      text     := CASE WHEN p_sort IN ('name_asc', 'name_desc', 'price_asc', 'price_desc', 'newest')
                               THEN p_sort ELSE 'name_asc' END;
  v_page      integer  := GREATEST(COALESCE(p_page, 1), 1);
  v_offset    bigint;
  v_result    jsonb;
BEGIN
  v_offset := (v_page - 1)::bigint * c_page_size;

  IF v_q IS NOT NULL THEN
    -- Literal "contains", like today's String.includes(): escape LIKE metacharacters.
    v_like     := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');
    v_name_pat := '%' || f_unaccent(v_like) || '%';
    v_sku_pat  := '%' || v_like || '%';
  END IF;

  SELECT COALESCE(jsonb_object_agg(s.key, s.value), '{}'::jsonb)
    INTO v_specs
    FROM jsonb_each(CASE WHEN jsonb_typeof(p_specs) = 'object' THEN p_specs ELSE '{}'::jsonb END) s
   WHERE jsonb_typeof(s.value) = 'array'
     AND jsonb_array_length(s.value) > 0;

  WITH reserved AS (
    SELECT oi.product_id, SUM(oi.quantity) AS qty
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
     WHERE o.status = 'paid'
       AND o.baselinker_order_id IS NULL
     GROUP BY oi.product_id
  ),
  -- Every filter except brand and specs; those two are flags so that each counter
  -- can leave out its own filter (decision B).
  base AS (
    SELECT p.id, p.sku, p.ean, p.name, p.short_description, p.features, p.brand,
           p.price, p.price_compare, p.tax_rate,
           GREATEST(0, p.stock - COALESCE(r.qty, 0))::integer AS stock,
           p.weight, p.dimensions, p.category_id, p.images, p.product_type,
           p.source_warehouse, p.is_active, p.age_min, p.requires_license,
           p.license_category, p.delivery_allowed, p.slug, p.is_featured, p.badge,
           p.availability_status, p.shipping_class, p.meta_title, p.meta_description,
           p.updated_at,
           (v_brand IS NULL OR p.brand = v_brand) AS brand_ok,
           NOT EXISTS (
             SELECT 1
               FROM jsonb_each(v_specs) s
              WHERE NOT EXISTS (
                SELECT 1
                  FROM jsonb_array_elements_text(s.value) v(val)
                 WHERE v.val = p.features ->> s.key
              )
           ) AS specs_ok
      FROM shop_products p
      LEFT JOIN reserved r ON r.product_id = p.id
     WHERE p.is_active
       AND (v_cats IS NULL OR p.category_id = ANY (v_cats))
       AND (v_q IS NULL OR f_unaccent(p.name) ILIKE v_name_pat OR p.sku ILIKE v_sku_pat)
       AND (NOT v_in_stock OR p.stock - COALESCE(r.qty, 0) > 0)
       AND (p_min IS NULL OR p.price >= p_min)
       AND (p_max IS NULL OR p.price <= p_max)
       AND (v_delivery IS NULL OR p.pickup_only = (v_delivery = 'odbior'))
  ),
  matched AS (
    SELECT * FROM base WHERE brand_ok AND specs_ok
  ),
  -- p_sort is a whitelist: exactly one of the k_* keys is non-NULL, id breaks ties.
  page_rows AS (
    SELECT m.*,
           (CASE WHEN v_sort = 'name_asc'   THEN m.name END) COLLATE "pl-x-icu" AS k_name_asc,
           (CASE WHEN v_sort = 'name_desc'  THEN m.name END) COLLATE "pl-x-icu" AS k_name_desc,
           CASE WHEN v_sort = 'price_asc'  THEN m.price END AS k_price_asc,
           CASE WHEN v_sort = 'price_desc' THEN m.price END AS k_price_desc,
           CASE WHEN v_sort = 'newest'     THEN m.id    END AS k_newest
      FROM matched m
     ORDER BY k_name_asc ASC, k_name_desc DESC, k_price_asc ASC NULLS LAST,
              k_price_desc DESC NULLS LAST, k_newest DESC, m.id
     LIMIT c_page_size OFFSET v_offset
  ),
  spec_values AS (
    SELECT e.key, e.value, count(*) AS n
      FROM base b
     CROSS JOIN LATERAL jsonb_each_text(
             CASE WHEN jsonb_typeof(b.features) = 'object' THEN b.features ELSE '{}'::jsonb END
           ) e
     WHERE b.brand_ok
       AND e.value IS NOT NULL
     GROUP BY e.key, e.value
  )
  SELECT jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', pr.id, 'sku', pr.sku, 'ean', pr.ean, 'name', pr.name,
               'short_description', pr.short_description, 'features', pr.features,
               'brand', pr.brand, 'price', pr.price, 'price_compare', pr.price_compare,
               'tax_rate', pr.tax_rate, 'stock', pr.stock, 'weight', pr.weight,
               'dimensions', pr.dimensions, 'category_id', pr.category_id, 'images', pr.images,
               'product_type', pr.product_type, 'source_warehouse', pr.source_warehouse,
               'is_active', pr.is_active, 'age_min', pr.age_min,
               'requires_license', pr.requires_license, 'license_category', pr.license_category,
               'delivery_allowed', pr.delivery_allowed, 'slug', pr.slug,
               'is_featured', pr.is_featured, 'badge', pr.badge,
               'availability_status', pr.availability_status, 'shipping_class', pr.shipping_class,
               'meta_title', pr.meta_title, 'meta_description', pr.meta_description,
               'updated_at', pr.updated_at)
             ORDER BY pr.k_name_asc ASC, pr.k_name_desc DESC, pr.k_price_asc ASC NULLS LAST,
                      pr.k_price_desc DESC NULLS LAST, pr.k_newest DESC, pr.id)
        FROM page_rows pr
    ), '[]'::jsonb),
    'total', (SELECT count(*) FROM matched),
    'brands', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('brand', b.brand, 'count', b.n)
                       ORDER BY b.brand COLLATE "pl-x-icu", b.brand)
        FROM (SELECT brand, count(*) AS n
                FROM base
               WHERE specs_ok AND brand IS NOT NULL
               GROUP BY brand) b
    ), '[]'::jsonb),
    'specs', CASE WHEN v_cats IS NULL THEN '[]'::jsonb ELSE COALESCE((
      SELECT jsonb_agg(jsonb_build_object('key', k.key, 'values', k.vals)
                       ORDER BY k.key COLLATE "pl-x-icu", k.key)
        FROM (SELECT sv.key,
                     jsonb_agg(jsonb_build_object('val', sv.value, 'count', sv.n)
                               ORDER BY sv.value COLLATE "pl-x-icu", sv.value) AS vals
                FROM spec_values sv
               GROUP BY sv.key
              HAVING count(*) >= 2) k
    ), '[]'::jsonb) END,
    'page', v_page,
    'page_size', c_page_size
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.shop_listing(bigint[], text, boolean, numeric, numeric, text, text, jsonb, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shop_listing(bigint[], text, boolean, numeric, numeric, text, text, jsonb, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.shop_listing(bigint[], text, boolean, numeric, numeric, text, text, jsonb, text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.shop_listing(bigint[], text, boolean, numeric, numeric, text, text, jsonb, text, integer) TO service_role;

-- ── 5. shop_tree ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.shop_tree()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT jsonb_build_object(
    'categories', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', c.name, 'parent_id', c.parent_id, 'count', COALESCE(n.cnt, 0))
             ORDER BY c.name COLLATE "pl-x-icu", c.id)
        FROM shop_categories c
        LEFT JOIN (SELECT category_id, count(*) AS cnt
                     FROM shop_products
                    WHERE is_active AND category_id IS NOT NULL
                    GROUP BY category_id) n ON n.category_id = c.id
    ), '[]'::jsonb),
    'price', (SELECT jsonb_build_object('min', min(price), 'max', max(price))
                FROM shop_products
               WHERE is_active AND price > 0)
  );
$$;

REVOKE ALL ON FUNCTION public.shop_tree() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shop_tree() FROM anon;
REVOKE ALL ON FUNCTION public.shop_tree() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.shop_tree() TO service_role;
