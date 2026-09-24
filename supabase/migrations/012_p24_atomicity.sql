-- ============================================================
-- 012_p24_atomicity.sql — Atomic P24 registration and claim
-- ============================================================
-- Adds 'claiming' status so a notify handler can atomically stake
-- its right to call P24 verify before any money-capture happens.
-- Provides three functions:
--   p24_register_attempt  — locks the order row and inserts the attempt
--   p24_claim_for_verify  — locks order+attempt, writes all rejections
--                           under the lock; returns 'claimed', 'in_progress',
--                           'duplicate_rejected', or 'not_found'
--   p24_release_claim     — releases a stuck 'claiming' attempt back to
--                           'registered' under the same lock ordering

-- ── 1. Extend status CHECK constraint + add claimed_at ───────
-- The constraint was created inline in 011 (auto-name: order_payments_status_check).
ALTER TABLE public.order_payments
  DROP CONSTRAINT order_payments_status_check;
ALTER TABLE public.order_payments
  ADD CONSTRAINT order_payments_status_check
  CHECK (status IN ('registered', 'claiming', 'verified', 'duplicate_rejected'));

-- claimed_at: set when the attempt enters 'claiming'.  Enables stale-claim
-- auto-recovery: if the notify function crashed before releasing, a later
-- notification can re-claim once claimed_at is older than the stale threshold.
ALTER TABLE public.order_payments
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

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
--   'claimed'             — this attempt now owns the verify call
--   'in_progress'         — same attempt already 'claiming' (fresh — within
--                           threshold); caller returns 5xx so P24 retries
--   'duplicate_rejected'  — order not pending_payment or a rival is
--                           claiming/verified; SQL writes status+p24_order_id
--                           under the lock so the app never writes it
--   'not_found'           — unknown attempt id
--
-- Stale-claim recovery: if the same attempt is 'claiming' but its claimed_at
-- is older than STALE_THRESHOLD, the function that claimed it has either
-- crashed or been killed by Vercel (maxDuration = 15 s on notify route, so
-- any attempt older than 20 s is definitively abandoned).  We re-claim it
-- rather than returning 'in_progress', so P24's next retry completes it.
--
-- Lock ordering everywhere: orders → order_payments (prevents deadlocks).
-- order_id is read in a non-locking SELECT first (it is an immutable FK),
-- then the order row is locked before the attempt row.

-- Drop old (uuid, uuid) overload before creating the new (uuid, bigint) one
DROP FUNCTION IF EXISTS public.p24_claim_for_verify(uuid, uuid);

CREATE OR REPLACE FUNCTION public.p24_claim_for_verify(
  p_attempt_id   uuid,
  p_p24_order_id bigint
) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  -- 20 s > notify route maxDuration (15 s) + 5 s margin
  STALE_THRESHOLD constant interval := '20 seconds';

  v_order_id        uuid;
  v_order_status    text;
  v_attempt_status  text;
  v_attempt_claimed timestamptz;
  v_rival_count     integer;
BEGIN
  -- 1. Read order_id without locking (immutable FK — safe to read before lock)
  SELECT order_id INTO v_order_id
  FROM   public.order_payments
  WHERE  id = p_attempt_id;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  -- 2. Lock order row FIRST (consistent ordering: order → attempt everywhere)
  SELECT status INTO v_order_status
  FROM   public.orders
  WHERE  id = v_order_id
  FOR UPDATE;

  -- 3. Lock this attempt row SECOND
  SELECT status, claimed_at INTO v_attempt_status, v_attempt_claimed
  FROM   public.order_payments
  WHERE  id = p_attempt_id
  FOR UPDATE;

  -- 4. Same attempt in 'claiming':
  --    • stale (claimed_at older than threshold) → re-claim; the original
  --      handler is definitively gone (Vercel killed it or it crashed)
  --    • fresh → return 'in_progress' so P24 retries later
  IF v_attempt_status = 'claiming' THEN
    IF v_attempt_claimed IS NULL OR v_attempt_claimed < NOW() - STALE_THRESHOLD THEN
      UPDATE public.order_payments
      SET    claimed_at = NOW()
      WHERE  id = p_attempt_id;
      RETURN 'claimed';
    END IF;
    RETURN 'in_progress';
  END IF;

  -- 5. Any other non-'registered' status is unexpected here (terminal states are
  --    caught by the idempotency check in the route before claim is called)
  IF v_attempt_status <> 'registered' THEN
    RETURN 'in_progress';
  END IF;

  -- 6. Reject if order is no longer pending_payment; write rejection under the lock
  IF v_order_status <> 'pending_payment' THEN
    UPDATE public.order_payments
    SET    status = 'duplicate_rejected', p24_order_id = p_p24_order_id
    WHERE  id = p_attempt_id;
    RETURN 'duplicate_rejected';
  END IF;

  -- 7. Reject if a rival attempt for this order is already claiming or verified
  SELECT COUNT(*) INTO v_rival_count
  FROM   public.order_payments
  WHERE  order_id = v_order_id
    AND  id       <> p_attempt_id
    AND  status   IN ('claiming', 'verified');

  IF v_rival_count > 0 THEN
    UPDATE public.order_payments
    SET    status = 'duplicate_rejected', p24_order_id = p_p24_order_id
    WHERE  id = p_attempt_id;
    RETURN 'duplicate_rejected';
  END IF;

  -- 8. All checks pass — advance to 'claiming', stamp claimed_at
  UPDATE public.order_payments
  SET    status = 'claiming', claimed_at = NOW()
  WHERE  id = p_attempt_id;

  RETURN 'claimed';
END;
$$;

REVOKE ALL ON FUNCTION public.p24_claim_for_verify(uuid, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p24_claim_for_verify(uuid, bigint) FROM anon;
REVOKE ALL ON FUNCTION public.p24_claim_for_verify(uuid, bigint) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.p24_claim_for_verify(uuid, bigint) TO service_role;

-- ── 4. Release — return a stuck 'claiming' attempt to 'registered' ──────────
-- Called by the notify route when verifyTransaction fails (network error,
-- non-ok response, timeout).  Uses the same lock ordering as p24_claim_for_verify
-- so there are no deadlocks.
CREATE OR REPLACE FUNCTION public.p24_release_claim(
  p_attempt_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_order_id uuid;
BEGIN
  -- Read order_id without locking (immutable FK)
  SELECT order_id INTO v_order_id
  FROM   public.order_payments
  WHERE  id = p_attempt_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- Lock order row FIRST
  PERFORM 1
  FROM    public.orders
  WHERE   id = v_order_id
  FOR UPDATE;

  -- Release: only transitions 'claiming' → 'registered'
  UPDATE public.order_payments
  SET    status = 'registered'
  WHERE  id = p_attempt_id
    AND  status = 'claiming';
END;
$$;

REVOKE ALL ON FUNCTION public.p24_release_claim(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p24_release_claim(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.p24_release_claim(uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.p24_release_claim(uuid) TO service_role;
