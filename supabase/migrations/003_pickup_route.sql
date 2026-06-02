ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_fulfillment_route_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_fulfillment_route_check
  CHECK (fulfillment_route IN ('direct_H1', 'direct_H2', 'consolidated', 'pickup'));
