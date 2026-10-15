-- 016_pickup_enforcement.sql (HA-2.06)
--
-- Compliance: any product that needs a licence, registration or is 18+ — and any
-- product in Hydra section 01/02 even without a flag — is sold by personal pickup
-- only. The customer confirms that age and permits are checked at pickup; the
-- confirmation is stored on the order.
--
-- 1. orders.pickup_confirmed_at (timestamptz, NULL = no confirmation) — audit.
--    No CHECK constraint on it: legacy pickup orders have NULL and a CHECK would
--    fail on their next status UPDATE. The rule lives in the RPC instead.
--    RLS on orders is unchanged: SELECT-only "own orders" policy, no write policy
--    for anon/authenticated (same deny-by-default as 013's email markers).
-- 2. hydra_section(bigint) → text: the single definition of "which Hydra section
--    is this category in" — walks parent_id up to the root and reads the root's
--    "NN." name prefix, exactly as src/lib/shop/permitFlags.ts resolveHydraSection
--    (HA-2.17). NULL for unknown category, broken chain, cycle or non-"NN." root.
--    Roots are parent_id IS NULL in the DB (BaseLinker's 0 is mapped at sync).
--    SECURITY INVOKER: its callers are the checkout route (service_role, bypasses
--    RLS) and checkout_create_order (SECURITY DEFINER, runs as the owner) — it
--    needs no privileges of its own. Execute stays service_role only.
-- 3. checkout_create_order gains p_pickup_confirmed boolean DEFAULT false and now
--    refuses on its own:
--      PICKUP_CONFIRMATION_REQUIRED   route 'pickup' without confirmation
--      PICKUP_ONLY:<product_id>       restricted product, route <> 'pickup'
--    restricted = product_type <> 'standard' OR requires_license OR
--                 NOT delivery_allowed OR age_min >= 18 OR section IN ('01','02').
--    Signature change: the old 5-argument function is DROPped (precedent: 012
--    dropped p24_claim_for_verify(uuid, uuid)); if it stayed, service_role could
--    still call it and bypass the rule. A new signature has fresh default grants,
--    so REVOKE/GRANT is repeated for it. An old-style 5-argument call resolves to
--    the new function with p_pickup_confirmed = false: pickup orders are refused,
--    fail closed.
--
-- GO-LIVE: apply this migration and deploy the app together. Between the two,
-- pickup orders are refused: an app without p_pickup_confirmed calls the RPC with
-- confirmation = false, and a database without 016 does not know the parameter.
--
-- Rollback (manual): DROP the new function, restore 010's definition, DROP
-- hydra_section, drop the column.

-- ── 1. audit column ─────────────────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN pickup_confirmed_at timestamptz;

COMMENT ON COLUMN public.orders.pickup_confirmed_at IS
  'HA-2.06: when the customer confirmed that age/permits are checked at personal pickup. Set only for fulfillment_route = pickup.';

-- ── 2. hydra_section ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.hydra_section(p_category_id bigint)
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH RECURSIVE chain AS (
    SELECT c.id, c.name, c.parent_id, 1 AS depth
      FROM shop_categories c
     WHERE c.id = p_category_id
    UNION ALL
    SELECT p.id, p.name, p.parent_id, chain.depth + 1
      FROM shop_categories p
      JOIN chain ON p.id = chain.parent_id
     WHERE chain.depth < 32            -- cycle guard
  )
  SELECT substring(name FROM '^(\d{2})\.')
    FROM chain
   WHERE parent_id IS NULL OR parent_id = 0
   ORDER BY depth
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.hydra_section(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hydra_section(bigint) FROM anon;
REVOKE ALL ON FUNCTION public.hydra_section(bigint) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.hydra_section(bigint) TO service_role;

-- ── 3. checkout_create_order ────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.checkout_create_order(
  p_session_id        TEXT,
  p_user_id           UUID,
  p_shipping          JSONB,
  p_fulfillment_route TEXT,
  p_items             JSONB,
  p_pickup_confirmed  BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (order_id UUID, order_total NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item     RECORD;
  v_product  shop_products%ROWTYPE;
  v_order_id UUID;
  v_total    NUMERIC(10,2) := 0;
  v_reserved INT;
BEGIN
  -- Customer must confirm that age/permits are checked on site (HA-2.06).
  IF p_fulfillment_route = 'pickup' AND p_pickup_confirmed IS NOT TRUE THEN
    RAISE EXCEPTION 'PICKUP_CONFIRMATION_REQUIRED';
  END IF;

  FOR v_item IN
    SELECT (i->>'product_id')::BIGINT AS product_id,
           (i->>'quantity')::INT      AS quantity
    FROM jsonb_array_elements(p_items) AS i
  LOOP
    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY:%', v_item.product_id;
    END IF;

    -- Net reserved: paid orders not yet pushed to BL (BL hasn't deducted them yet).
    -- Mirrors getReservedQuantities() in src/lib/shop/reservedStock.ts.
    SELECT COALESCE(SUM(oi.quantity), 0)
      INTO v_reserved
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
     WHERE oi.product_id = v_item.product_id
       AND o.status = 'paid'
       AND o.baselinker_order_id IS NULL;

    SELECT * INTO v_product
      FROM shop_products
     WHERE id = v_item.product_id
       AND is_active = TRUE;

    -- Pickup-only rule, independent of the route's own check (defence in depth).
    -- Only ever adds conditions to 010's flag rule; product_type stays authoritative.
    IF FOUND
       AND p_fulfillment_route IS DISTINCT FROM 'pickup'
       AND (
            v_product.product_type <> 'standard'
         OR v_product.requires_license
         OR NOT v_product.delivery_allowed
         OR v_product.age_min >= 18
         OR public.hydra_section(v_product.category_id) IN ('01', '02')
       )
    THEN
      RAISE EXCEPTION 'PICKUP_ONLY:%', v_item.product_id;
    END IF;

    IF NOT FOUND OR (v_product.stock - v_reserved) < v_item.quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_item.product_id;
    END IF;

    v_total := v_total + COALESCE(v_product.price, 0) * v_item.quantity;
  END LOOP;

  INSERT INTO orders (session_id, user_id, status, shipping_address, total, fulfillment_route, pickup_confirmed_at)
  VALUES (
    p_session_id, p_user_id, 'pending_payment', p_shipping, ROUND(v_total, 2), p_fulfillment_route,
    CASE WHEN p_fulfillment_route = 'pickup' THEN now() END
  )
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, product_snapshot)
  SELECT v_order_id,
         (i->>'product_id')::BIGINT,
         (i->>'quantity')::INT,
         COALESCE(p.price, 0),
         jsonb_build_object(
           'id',       p.id,
           'name',     p.name,
           'sku',      p.sku,
           'ean',      p.ean,
           'tax_rate', p.tax_rate,
           'images',   p.images
         )
  FROM jsonb_array_elements(p_items) AS i
  JOIN shop_products p ON p.id = (i->>'product_id')::BIGINT;

  RETURN QUERY SELECT v_order_id, ROUND(v_total, 2);
END;
$$;

-- A new signature has fresh default grants (PUBLIC may execute): repeat the lockdown.
REVOKE ALL ON FUNCTION public.checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB, BOOLEAN) FROM anon;
REVOKE ALL ON FUNCTION public.checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB, BOOLEAN) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB, BOOLEAN) TO service_role;
