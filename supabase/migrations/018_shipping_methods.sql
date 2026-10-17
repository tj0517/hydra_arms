-- 018_shipping_methods.sql (HA-2.02)
--
-- Delivery cost in the order total. Hydra ships everything itself, one parcel
-- (O-06). The customer picks a delivery method; the price list lives in env
-- (config/inputs.ts: SHIPPING_PRICE_*, FREE_SHIPPING_THRESHOLD) and is read by the
-- checkout route only. The client never sends an amount.
--
-- 1. orders gains (all nullable — legacy orders keep NULL, a NOT NULL/CHECK on
--    them would fail their next status UPDATE):
--      shipping_method   dhl | dpd | inpost_courier | inpost_locker | pickup
--      shipping_cost     numeric(10,2) >= 0 — the delivery part of `total`
--      delivery_point_*  InPost Paczkomat (code + name/address/postcode/city as the
--                        Geowidget returns them; only the code is validated, the
--                        rest is informational). Lengths = BaseLinker addOrder limits.
--    RLS on orders is unchanged: SELECT-only "own orders" policy, no write policy
--    for anon/authenticated (same deny-by-default as 013, 016, 017).
-- 2. checkout_create_order gains p_shipping_method, p_shipping_price,
--    p_free_threshold, p_delivery_point and computes the delivery cost from the
--    goods subtotal it sums itself, in the same transaction as the order:
--      pickup → 0; parcel method → 0 at/above the threshold, else the price.
--    total = goods + delivery, so p24_register_attempt (012) charges it too.
--    New refusals (fail closed, tj D4 2026-10-17):
--      INVALID_SHIPPING_METHOD          NULL / not in the allow-list
--      SHIPPING_METHOD_ROUTE_MISMATCH   pickup method ⇔ pickup route
--      SHIPPING_PRICE_MISSING           parcel method without price/threshold > 0
--      DELIVERY_POINT_REQUIRED          inpost_locker without a valid locker code
--    The function now takes the price as an argument, so a caller that could
--    execute it could set its own delivery price: execute stays service_role
--    only. Signature change: the 6-argument function from 016 is DROPped (if it
--    stayed, service_role code could still create orders without delivery).
--
-- GO-LIVE: apply this migration to prod BEFORE merging the HA-2.02 PR. Between
-- the two, the old app calls the RPC without a method and checkout is refused
-- (INVALID_SHIPPING_METHOD) — accepted by tj (D4, prod takes no real orders yet).
-- The reverse order breaks checkout too: new app code would call parameters a
-- database without 018 does not know.
--
-- Rollback (manual): DROP the new function, restore 016's definition and grants,
-- drop the seven columns.

-- ── 1. columns ──────────────────────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN shipping_method         text,
  ADD COLUMN shipping_cost           numeric(10,2),
  ADD COLUMN delivery_point_id       text,
  ADD COLUMN delivery_point_name     text,
  ADD COLUMN delivery_point_address  text,
  ADD COLUMN delivery_point_postcode text,
  ADD COLUMN delivery_point_city     text;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_shipping_method_check
    CHECK (shipping_method IN ('dhl', 'dpd', 'inpost_courier', 'inpost_locker', 'pickup')),
  ADD CONSTRAINT orders_shipping_cost_check
    CHECK (shipping_cost >= 0),
  ADD CONSTRAINT orders_delivery_point_id_check
    CHECK (delivery_point_id ~ '^[A-Z]{3}[0-9]{2,4}[A-Z]{0,3}$' AND char_length(delivery_point_id) <= 40),
  ADD CONSTRAINT orders_delivery_point_fields_check
    CHECK (
          char_length(delivery_point_name)     <= 100
      AND char_length(delivery_point_address)  <= 100
      AND char_length(delivery_point_postcode) <= 100
      AND char_length(delivery_point_city)     <= 100
    ),
  ADD CONSTRAINT orders_locker_needs_point_check
    CHECK (shipping_method IS DISTINCT FROM 'inpost_locker' OR delivery_point_id IS NOT NULL);

COMMENT ON COLUMN public.orders.shipping_method IS
  'HA-2.02: delivery method chosen at checkout. NULL = order created before 018.';
COMMENT ON COLUMN public.orders.shipping_cost IS
  'HA-2.02: delivery part of total (PLN gross), computed by checkout_create_order from the env price list. NULL = order created before 018.';
COMMENT ON COLUMN public.orders.delivery_point_id IS
  'HA-2.02: InPost Paczkomat code (e.g. KRA01M) for shipping_method = inpost_locker. Pushed to BaseLinker as delivery_point_id.';

-- ── 2. checkout_create_order ────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB, BOOLEAN);

CREATE OR REPLACE FUNCTION public.checkout_create_order(
  p_session_id        TEXT,
  p_user_id           UUID,
  p_shipping          JSONB,
  p_fulfillment_route TEXT,
  p_items             JSONB,
  p_pickup_confirmed  BOOLEAN DEFAULT FALSE,
  p_shipping_method   TEXT    DEFAULT NULL,
  p_shipping_price    NUMERIC DEFAULT NULL,
  p_free_threshold    NUMERIC DEFAULT NULL,
  p_delivery_point    JSONB   DEFAULT NULL
)
RETURNS TABLE (order_id UUID, order_total NUMERIC, order_shipping_cost NUMERIC)
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
  v_shipping NUMERIC(10,2);
  v_point_id TEXT;
BEGIN
  -- Customer must confirm that age/permits are checked on site (HA-2.06).
  IF p_fulfillment_route = 'pickup' AND p_pickup_confirmed IS NOT TRUE THEN
    RAISE EXCEPTION 'PICKUP_CONFIRMATION_REQUIRED';
  END IF;

  -- Delivery method (HA-2.02): allow-list, must match the route, parcel methods need a price list.
  IF p_shipping_method IS NULL
     OR p_shipping_method NOT IN ('dhl', 'dpd', 'inpost_courier', 'inpost_locker', 'pickup') THEN
    RAISE EXCEPTION 'INVALID_SHIPPING_METHOD';
  END IF;
  IF (p_fulfillment_route = 'pickup') IS DISTINCT FROM (p_shipping_method = 'pickup') THEN
    RAISE EXCEPTION 'SHIPPING_METHOD_ROUTE_MISMATCH';
  END IF;
  IF p_shipping_method <> 'pickup'
     AND (p_shipping_price IS NULL OR p_shipping_price <= 0
          OR p_free_threshold IS NULL OR p_free_threshold <= 0) THEN
    RAISE EXCEPTION 'SHIPPING_PRICE_MISSING';
  END IF;
  IF p_shipping_method = 'inpost_locker' THEN
    v_point_id := upper(btrim(p_delivery_point->>'id'));
    IF v_point_id IS NULL OR v_point_id !~ '^[A-Z]{3}[0-9]{2,4}[A-Z]{0,3}$' THEN
      RAISE EXCEPTION 'DELIVERY_POINT_REQUIRED';
    END IF;
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

  -- Cost from the goods subtotal summed above, never from the client: free at/above the threshold.
  v_shipping := CASE
    WHEN p_shipping_method = 'pickup' THEN 0
    WHEN ROUND(v_total, 2) >= p_free_threshold THEN 0
    ELSE ROUND(p_shipping_price, 2)
  END;

  INSERT INTO orders (
    session_id, user_id, status, shipping_address, total, fulfillment_route, pickup_confirmed_at,
    shipping_method, shipping_cost,
    delivery_point_id, delivery_point_name, delivery_point_address, delivery_point_postcode, delivery_point_city
  )
  VALUES (
    p_session_id, p_user_id, 'pending_payment', p_shipping, ROUND(v_total, 2) + v_shipping, p_fulfillment_route,
    CASE WHEN p_fulfillment_route = 'pickup' THEN now() END,
    p_shipping_method, v_shipping,
    v_point_id,
    CASE WHEN v_point_id IS NOT NULL THEN left(nullif(btrim(p_delivery_point->>'name'), ''), 100) END,
    CASE WHEN v_point_id IS NOT NULL THEN left(nullif(btrim(p_delivery_point->>'address'), ''), 100) END,
    CASE WHEN v_point_id IS NOT NULL THEN left(nullif(btrim(p_delivery_point->>'postcode'), ''), 100) END,
    CASE WHEN v_point_id IS NOT NULL THEN left(nullif(btrim(p_delivery_point->>'city'), ''), 100) END
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

  RETURN QUERY SELECT v_order_id, ROUND(v_total, 2) + v_shipping, v_shipping;
END;
$$;

-- A new signature has fresh default grants (PUBLIC may execute): repeat the lockdown.
-- Required here more than ever: the price and threshold are arguments.
REVOKE ALL ON FUNCTION public.checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB, BOOLEAN, TEXT, NUMERIC, NUMERIC, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB, BOOLEAN, TEXT, NUMERIC, NUMERIC, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB, BOOLEAN, TEXT, NUMERIC, NUMERIC, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB, BOOLEAN, TEXT, NUMERIC, NUMERIC, JSONB) TO service_role;
