-- 007: Align fulfillment routes with actual business process
--
-- Process (schemat_procesu.pdf, 2026-08):
--   All orders pass through Hydra Arms before reaching the customer.
--   Suppliers (Sharg, Spechurt, Kolba) deliver to Hydra Arms, not directly
--   to the customer. Two shippable routes replace the old H1/H2/consolidated split:
--
--   'own'     — item is in Hydra Arms own stock → picked and shipped directly
--   'sourced' — item must be ordered from a supplier → arrives at Hydra Arms
--               → consolidated and shipped
--   'pickup'  — age/license/product_type restriction → personal collection only
--
-- Restriction rules (confirmed 2026-08):
--   mustPickup when: product_type != 'standard' OR requires_license OR
--                    NOT delivery_allowed OR age_min >= 18
--   Age 18+ and license-required products are always pickup only (verified in person).

-- ── orders.fulfillment_route ──────────────────────────────────────────────────

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_fulfillment_route_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_fulfillment_route_check
  CHECK (fulfillment_route IN ('own', 'sourced', 'pickup'));

-- Migrate any existing rows that used old route names (safe — all currently NULL)
UPDATE orders SET fulfillment_route = 'sourced'
  WHERE fulfillment_route IN ('consolidated', 'direct_H1', 'direct_H2');

-- ── shop_products.source_warehouse ───────────────────────────────────────────
-- Old CHECK constrained to ('H1', 'H2', 'own'). New model: 'own' = Hydra Arms
-- own physical stock; anything else is a supplier name (free text, e.g. 'sharg').
-- Drop the enum-style constraint so admin can set any supplier label freely.

ALTER TABLE shop_products
  DROP CONSTRAINT IF EXISTS shop_products_source_warehouse_check;
