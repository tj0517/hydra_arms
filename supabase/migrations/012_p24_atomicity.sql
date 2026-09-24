-- ============================================================
-- 012_p24_atomicity.sql — Atomic P24 registration and claim
-- ============================================================
-- Adds 'claiming' status so a notify handler can atomically stake
-- its right to call P24 verify before any money-capture happens.
-- Provides two functions:
--   p24_register_attempt  — locks the order row and inserts the attempt
--   p24_claim_for_verify  — locks order+attempt, returns 'claimed' or
--                           'duplicate_rejected' without touching money

-- ── 1. Extend status CHECK constraint ────────────────────────
-- The constraint was created inline in 011 (auto-name: order_payments_status_check).
ALTER TABLE public.order_payments
  DROP CONSTRAINT order_payments_status_check;
ALTER TABLE public.order_payments
  ADD CONSTRAINT order_payments_status_check
  CHECK (status IN ('registered', 'claiming', 'verified', 'duplicate_rejected'));

-- ── 2. Registration — atomic lock+check+insert ───────────────
-- Locks the orders row FOR UPDATE so a concurrent registration
-- waits until the first one commits before re-checking status.
-- Returns the amount in grosz (avoids a separate round-trip from
-- the app to fetch the order total).
CREATE OR REPLACE FUNCTION public.p24_register_attempt(
  p_order_id   uuid,
  p_session_id text,
  p_currency   text
) RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_status       text;
  v_total        numeric;
  v_amount_grosz integer;
BEGIN
  SELECT status, total
  INTO   v_status, v_total
  FROM   public.orders
  WHERE  id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF v_status <> 'pending_payment' THEN
    RAISE EXCEPTION 'ORDER_NOT_PENDING: %', v_status USING ERRCODE = 'P0001';
  END IF;

  v_amount_grosz := ROUND(COALESCE(v_total, 0) * 100)::integer;
  IF v_amount_grosz <= 0 THEN
    RAISE EXCEPTION 'ORDER_AMOUNT_ZERO' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.order_payments (order_id, p24_session_id, amount_grosz, currency)
  VALUES (p_order_id, p_session_id, v_amount_grosz, p_currency);

  RETURN v_amount_grosz;
END;
$$;

REVOKE ALL ON FUNCTION public.p24_register_attempt(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p24_register_attempt(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.p24_register_attempt(uuid, text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.p24_register_attempt(uuid, text, text) TO service_role;

-- ── 3. Claim — atomic check before P24 verify ────────────────
-- Must be called before verifyTransaction.  Returns:
--   'claimed'             — this attempt owns the verify call
--   'duplicate_rejected'  — another attempt is claiming/verified,
--                           or the order is no longer pending_payment
-- App code handles the duplicate_rejected update (preserves p24_order_id
-- from the notification body, which the SQL function does not have).
CREATE OR REPLACE FUNCTION public.p24_claim_for_verify(
  p_order_id   uuid,
  p_attempt_id uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_order_status   text;
  v_attempt_status text;
  v_rival_count    integer;
BEGIN
  -- Lock orders row first; concurrent claims for the same order queue here
  SELECT status INTO v_order_status
  FROM   public.orders
  WHERE  id = p_order_id
  FOR UPDATE;

  IF NOT FOUND OR v_order_status <> 'pending_payment' THEN
    RETURN 'duplicate_rejected';
  END IF;

  -- Lock the attempt row
  SELECT status INTO v_attempt_status
  FROM   public.order_payments
  WHERE  id = p_attempt_id
  FOR UPDATE;

  IF NOT FOUND OR v_attempt_status <> 'registered' THEN
    RETURN 'duplicate_rejected';
  END IF;

  -- Reject if any rival attempt for this order is already claiming or verified
  SELECT COUNT(*) INTO v_rival_count
  FROM   public.order_payments
  WHERE  order_id = p_order_id
    AND  id       <> p_attempt_id
    AND  status   IN ('claiming', 'verified');

  IF v_rival_count > 0 THEN
    RETURN 'duplicate_rejected';
  END IF;

  -- This attempt wins — advance to 'claiming' before releasing the lock
  UPDATE public.order_payments
  SET    status = 'claiming'
  WHERE  id = p_attempt_id;

  RETURN 'claimed';
END;
$$;

REVOKE ALL ON FUNCTION public.p24_claim_for_verify(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p24_claim_for_verify(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.p24_claim_for_verify(uuid, uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.p24_claim_for_verify(uuid, uuid) TO service_role;
