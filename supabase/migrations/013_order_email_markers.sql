-- 013: Order email markers (HA-2.07)
--
-- Two "sent at" markers on orders, one per email: order received (checkout)
-- and payment received (mark_order_paid / P24 notify). NULL = not sent yet.
--
-- Idempotency is enforced by a single conditional UPDATE ... WHERE col IS NULL
-- issued from the admin (service_role) client — the same idiom already used for
-- order_payments status transitions in 010/012 — so concurrent send attempts
-- race at the row lock and only one claims the marker.
--
-- orders already has RLS enabled with no INSERT/UPDATE policy for anon/authenticated
-- (see 001_shop_schema.sql / 010_order_payment_status.sql — only the SELECT-only
-- "own orders" policy exists), so these columns inherit deny-by-default like the
-- rest of the row: writable only by service_role, which bypasses RLS.

ALTER TABLE public.orders
  ADD COLUMN order_received_email_sent_at   timestamptz,
  ADD COLUMN payment_received_email_sent_at timestamptz;
