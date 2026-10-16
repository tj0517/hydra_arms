-- 017_orders_is_test.sql (HA-2.08)
--
-- Marks orders created while SHOP_MODE=verification (P24 verification walk-through)
-- as test orders. The BaseLinker push (markOrderPaid) and the orphan retry in
-- /api/shop/orders/sync skip is_test rows based on this column, whatever SHOP_MODE
-- is at that moment — so a later switch to live never sends old test orders to the
-- client's BaseLinker.
--
-- NOT NULL DEFAULT false: existing orders become is_test = false (they are real).
-- RLS on orders is unchanged: SELECT-only "own orders" policy, no write policy for
-- anon/authenticated (same deny-by-default as 013 and 016). The checkout route
-- (service_role) sets the flag with an UPDATE right after checkout_create_order,
-- before any payment is registered; the RPC itself is not touched.
--
-- GO-LIVE: apply this migration to prod BEFORE merging the HA-2.08 PR. Merge
-- auto-deploys, and app code that writes/filters is_test would fail on a database
-- without the column (checkout would break).
--
-- Rollback (manual): ALTER TABLE public.orders DROP COLUMN is_test;

ALTER TABLE public.orders
  ADD COLUMN is_test boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.orders.is_test IS
  'HA-2.08: true = created in SHOP_MODE=verification. Never pushed to BaseLinker (markOrderPaid, orders/sync Phase A), regardless of the current SHOP_MODE.';
