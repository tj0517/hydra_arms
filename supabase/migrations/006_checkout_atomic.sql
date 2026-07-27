-- 006: Atomic checkout
--
-- 1. Unique index on orders.session_id — makes the idempotency key race-proof:
--    two concurrent checkouts with the same key can no longer both insert.
-- 2. checkout_create_order() RPC — stock decrement + order + order_items in ONE
--    transaction. Replaces the read-modify-write loop in /api/shop/checkout that
--    could oversell under concurrency and clobber stock on rollback.
--
-- The function is callable by service_role only (checkout uses the admin client);
-- anon/authenticated must not reach it through PostgREST.

CREATE UNIQUE INDEX IF NOT EXISTS orders_session_id_uniq
  ON orders (session_id)
  WHERE session_id IS NOT NULL;

CREATE OR REPLACE FUNCTION checkout_create_order(
  p_session_id        TEXT,
  p_user_id           UUID,
  p_shipping          JSONB,
  p_fulfillment_route TEXT,
  p_items             JSONB   -- [{ "product_id": 123, "quantity": 2 }, ...]
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
BEGIN
  FOR v_item IN
    SELECT (i->>'product_id')::BIGINT AS product_id,
           (i->>'quantity')::INT      AS quantity
    FROM jsonb_array_elements(p_items) AS i
  LOOP
    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY:%', v_item.product_id;
    END IF;

    -- Relative decrement guarded by stock >= qty: concurrent orders serialize
    -- on the row lock, and any failure aborts the whole transaction.
    UPDATE shop_products
       SET stock = stock - v_item.quantity
     WHERE id = v_item.product_id
       AND is_active = TRUE
       AND stock >= v_item.quantity
    RETURNING * INTO v_product;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_item.product_id;
    END IF;

    v_total := v_total + COALESCE(v_product.price, 0) * v_item.quantity;
  END LOOP;

  INSERT INTO orders (session_id, user_id, status, shipping_address, total, fulfillment_route)
  VALUES (p_session_id, p_user_id, 'paid', p_shipping, ROUND(v_total, 2), p_fulfillment_route)
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

REVOKE ALL ON FUNCTION checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION checkout_create_order(TEXT, UUID, JSONB, TEXT, JSONB) TO service_role;
