-- 010: Order payment status
--
-- 1. CHECK constraint on orders.status — only the 5 allowed values.
--    Prod has 4 rows, all 'paid' — the constraint validates without error.
-- 2. Default changed to 'pending_payment' (was 'pending', overridden by INSERT anyway).
-- 3. checkout_create_order: no longer decrements stock; checks net availability
--    (raw stock − paid-not-yet-in-BL reservations); inserts 'pending_payment'.
--    Signature, SECURITY DEFINER, SET search_path and REVOKE/GRANT unchanged.
-- 4. mark_order_paid(uuid): SECURITY DEFINER, service_role only; atomically
--    transitions pending_payment → paid; returns TRUE if the row changed (idempotent).

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending_payment','paid','shipped','delivered','cancelled'));

ALTER TABLE public.orders
  ALTER COLUMN status SET DEFAULT 'pending_payment';

CREATE OR REPLACE FUNCTION public.checkout_create_order(
  p_session_id        TEXT,
  p_user_id           UUID,
  p_shipping          JSONB,
  p_fulfillment_route TEXT,
  p_items             JSONB
) RETURNS TABLE (order_id UUID, order_total NUMERIC)
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

    IF NOT FOUND OR (v_product.stock - v_reserved) < v_item.quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_item.product_id;
    END IF;

    v_total := v_total + COALESCE(v_product.price, 0) * v_item.quantity;
  END LOOP;

  INSERT INTO orders (session_id, user_id, status, shipping_address, total, fulfillment_route)
  VALUES (p_session_id, p_user_id, 'pending_payment', p_shipping, ROUND(v_total, 2), p_fulfillment_route)
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

REVOKE ALL ON FUNCTION public.checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB) TO service_role;


CREATE OR REPLACE FUNCTION public.mark_order_paid(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed INT;
BEGIN
  UPDATE orders
     SET status     = 'paid',
         updated_at = now()
   WHERE id     = p_order_id
     AND status = 'pending_payment';
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  RETURN v_changed > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_order_paid(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_order_paid(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.mark_order_paid(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(UUID) TO service_role;
