ALTER TABLE shop_products
  ADD COLUMN source_warehouse TEXT
  CHECK (source_warehouse IN ('H1', 'H2', 'own'))
  DEFAULT NULL;

ALTER TABLE orders
  ADD COLUMN fulfillment_route TEXT
  CHECK (fulfillment_route IN ('direct_H1', 'direct_H2', 'consolidated'))
  DEFAULT NULL;
