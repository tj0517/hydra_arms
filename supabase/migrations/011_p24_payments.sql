-- ============================================================
-- 011_p24_payments.sql — P24 payment attempts per order
-- ============================================================
-- update_updated_at() defined in 001_shop_schema.sql

CREATE TABLE order_payments (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id        uuid        NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  p24_session_id  text        NOT NULL,
  p24_order_id    bigint,
  amount_grosz    integer     NOT NULL CHECK (amount_grosz > 0),
  currency        text        NOT NULL DEFAULT 'PLN',
  status          text        NOT NULL DEFAULT 'registered'
                              CHECK (status IN ('registered', 'verified', 'duplicate_rejected')),
  verified_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT order_payments_p24_session_id_key UNIQUE (p24_session_id),
  CONSTRAINT order_payments_p24_order_id_key  UNIQUE (p24_order_id)
);

CREATE INDEX order_payments_order_id_idx ON order_payments (order_id);

CREATE TRIGGER order_payments_updated_at
  BEFORE UPDATE ON order_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS — server-only; no client access ──────────────────────
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON order_payments FROM PUBLIC;
REVOKE ALL ON order_payments FROM anon;
REVOKE ALL ON order_payments FROM authenticated;
-- service_role bypasses RLS; all reads/writes go through the admin client
