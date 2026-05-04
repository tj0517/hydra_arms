-- Shop schema for hydra-arms.pl
-- BaseLinker is source of truth; Supabase holds synced data + custom metadata

-- Product type enum
CREATE TYPE product_type AS ENUM ('standard', 'age_restricted', 'pickup_only');

-- Categories synced from BaseLinker
CREATE TABLE shop_categories (
  id          BIGINT PRIMARY KEY,          -- BaseLinker category_id
  name        TEXT NOT NULL,
  parent_id   BIGINT,
  inventory_id BIGINT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Products synced from BaseLinker + custom product_type
CREATE TABLE shop_products (
  id            BIGINT PRIMARY KEY,          -- BaseLinker product id
  inventory_id  BIGINT NOT NULL,
  sku           TEXT,
  ean           TEXT,
  name          TEXT NOT NULL,
  description   TEXT,
  features      JSONB,
  price         NUMERIC(10,2),
  tax_rate      NUMERIC(5,2),
  stock         INTEGER NOT NULL DEFAULT 0,
  weight        NUMERIC(8,3),
  category_id   BIGINT REFERENCES shop_categories(id),
  images        JSONB,
  product_type  product_type NOT NULL DEFAULT 'standard',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  synced_at     TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shop_products_updated_at
  BEFORE UPDATE ON shop_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- User profiles extending auth.users
CREATE TABLE user_profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  age_verified_at     TIMESTAMPTZ,
  verification_method TEXT,                -- TBD: provider name
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on new user
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Cart items (guest via session_id OR logged-in via user_id)
CREATE TABLE cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  BIGINT NOT NULL REFERENCES shop_products(id),
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cart_owner CHECK (session_id IS NOT NULL OR user_id IS NOT NULL)
);

CREATE TRIGGER cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX cart_items_session_idx ON cart_items (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX cart_items_user_idx    ON cart_items (user_id)    WHERE user_id IS NOT NULL;

-- Orders
CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id),
  session_id          TEXT,
  baselinker_order_id BIGINT,              -- filled after BL order creation
  status              TEXT NOT NULL DEFAULT 'pending',
  shipping_address    JSONB,
  total               NUMERIC(10,2),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Order line items
CREATE TABLE order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       BIGINT NOT NULL REFERENCES shop_products(id),
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  unit_price       NUMERIC(10,2) NOT NULL,
  product_snapshot JSONB,                  -- name, images etc at time of order
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies ---------------------------------------------------------------

ALTER TABLE shop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items      ENABLE ROW LEVEL SECURITY;

-- Public read for products/categories
CREATE POLICY "public read categories"  ON shop_categories FOR SELECT USING (TRUE);
CREATE POLICY "public read products"    ON shop_products    FOR SELECT USING (is_active = TRUE);

-- Users manage their own profile
CREATE POLICY "own profile"             ON user_profiles    FOR ALL USING (auth.uid() = id);

-- Users manage their own cart
CREATE POLICY "own cart"                ON cart_items       FOR ALL USING (
  auth.uid() = user_id OR session_id IS NOT NULL
);

-- Users read their own orders
CREATE POLICY "own orders"              ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own order items"         ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
