-- 014: Brand column for the universal "marka" shop filter (HA-2.10)
--
-- Brand data already reaches us today, but only buried inside the untyped
-- `features` JSON (BL text_fields.features["Producent"], and occasionally
-- "Marka" — see extractBrand() in src/lib/baselinker/client.ts). This
-- promotes it to a first-class column so it can be filtered/indexed
-- directly, and the sync now strips those keys back out of `features` once
-- extracted so the value isn't duplicated into the generic per-category
-- spec-filter UI.
--
-- Public column: added to PUBLIC_PRODUCT_COLUMNS in fetchProducts.ts in the
-- same diff — customers only ever see brand as a plain string, never
-- supplier-internal identifiers.

ALTER TABLE public.shop_products
  ADD COLUMN brand text;

CREATE INDEX idx_shop_products_brand ON public.shop_products (brand) WHERE brand IS NOT NULL;
