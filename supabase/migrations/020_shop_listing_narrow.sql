-- 020_shop_listing_narrow.sql (HA-2.34)
--
-- shop_listing() from 019 wrote its whole working set to disk on prod. It stored
-- `base` (every active product with all card columns, ~880 B/row incl. features and
-- images) and then a second copy as `matched`; at prod work_mem = 2184kB both spilled
-- (EXPLAIN on prod: temp read=908 written=908; the function body alone 46.9 ms, the
-- function 74 / 42 ms in one session, 286 ms on a cold first call).
--
-- What changes — the body of public.shop_listing only (tj decision 2026-10-24, A):
--   - `base` keeps only id, name, price, brand, net stock and the two counter flags
--     (~120 B/row); it fits in work_mem up to roughly 15 000 active products.
--   - `matched` is gone: total and the page read `base` with brand_ok AND specs_ok.
--   - The 24 cards of the page join shop_products by id for the card columns
--     (PUBLIC_PRODUCT_COLUMNS without description, stock still net of reservations).
--   - Spec counters read features by id the same way.
-- Unchanged: signature, argument normalisation, filters, counters (decision B), sort
-- whitelist and tiebreaker, result shape — the result JSON is identical to 019 (checked
-- on 6 scenarios over 5 070 synthetic products; listing-rpc.spec.ts unchanged).
-- Measured on prod as a plain statement before this migration: 28.5 ms, no temp.
-- shop_tree(), f_unaccent, pickup_only and the indexes from 019 are not touched; no
-- work_mem setting is added. CREATE OR REPLACE keeps the grants; REVOKE/GRANT is
-- repeated anyway (016/019 pattern).
--
-- Rollback (manual): re-run section 4 of 019_shop_listing.sql (CREATE OR REPLACE
-- FUNCTION public.shop_listing … and its REVOKE/GRANT) — same signature, so the call
-- sites and grants stay valid.

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
  -- can leave out its own filter (decision B). Narrow on purpose: only the columns
  -- that filter, sort and count — the wide card columns are read for the page only.
  base AS (
    SELECT p.id, p.name, p.price, p.brand,
           GREATEST(0, p.stock - COALESCE(r.qty, 0))::integer AS stock,
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
  -- p_sort is a whitelist: exactly one of the k_* keys is non-NULL, id breaks ties.
  page_rows AS (
    SELECT b.id, b.stock,
           (CASE WHEN v_sort = 'name_asc'   THEN b.name END) COLLATE "pl-x-icu" AS k_name_asc,
           (CASE WHEN v_sort = 'name_desc'  THEN b.name END) COLLATE "pl-x-icu" AS k_name_desc,
           CASE WHEN v_sort = 'price_asc'  THEN b.price END AS k_price_asc,
           CASE WHEN v_sort = 'price_desc' THEN b.price END AS k_price_desc,
           CASE WHEN v_sort = 'newest'     THEN b.id    END AS k_newest
      FROM base b
     WHERE b.brand_ok AND b.specs_ok
     ORDER BY k_name_asc ASC, k_name_desc DESC, k_price_asc ASC NULLS LAST,
              k_price_desc DESC NULLS LAST, k_newest DESC, b.id
     LIMIT c_page_size OFFSET v_offset
  ),
  -- features are re-read by id instead of being carried through base.
  spec_values AS (
    SELECT e.key, e.value, count(*) AS n
      FROM base b
      JOIN shop_products p ON p.id = b.id
     CROSS JOIN LATERAL jsonb_each_text(
             CASE WHEN jsonb_typeof(p.features) = 'object' THEN p.features ELSE '{}'::jsonb END
           ) e
     WHERE b.brand_ok
       AND e.value IS NOT NULL
     GROUP BY e.key, e.value
  )
  SELECT jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', pr.id, 'sku', p.sku, 'ean', p.ean, 'name', p.name,
               'short_description', p.short_description, 'features', p.features,
               'brand', p.brand, 'price', p.price, 'price_compare', p.price_compare,
               'tax_rate', p.tax_rate, 'stock', pr.stock, 'weight', p.weight,
               'dimensions', p.dimensions, 'category_id', p.category_id, 'images', p.images,
               'product_type', p.product_type, 'source_warehouse', p.source_warehouse,
               'is_active', p.is_active, 'age_min', p.age_min,
               'requires_license', p.requires_license, 'license_category', p.license_category,
               'delivery_allowed', p.delivery_allowed, 'slug', p.slug,
               'is_featured', p.is_featured, 'badge', p.badge,
               'availability_status', p.availability_status, 'shipping_class', p.shipping_class,
               'meta_title', p.meta_title, 'meta_description', p.meta_description,
               'updated_at', p.updated_at)
             ORDER BY pr.k_name_asc ASC, pr.k_name_desc DESC, pr.k_price_asc ASC NULLS LAST,
                      pr.k_price_desc DESC NULLS LAST, pr.k_newest DESC, pr.id)
        FROM page_rows pr
        JOIN shop_products p ON p.id = pr.id
    ), '[]'::jsonb),
    'total', (SELECT count(*) FROM base WHERE brand_ok AND specs_ok),
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
