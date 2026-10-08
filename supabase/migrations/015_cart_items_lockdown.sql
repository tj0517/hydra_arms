-- HA-2.20 — cart_items lockdown (decision tj 2026-10-08)
--
-- Problem (deferred, review HA-1.01): the "own cart" policy from migration 001 read
--   USING (auth.uid() = user_id OR session_id IS NOT NULL)
-- for role `public` and command ALL, while `anon` and `authenticated` held GRANT ALL.
-- Every guest row has a non-null session_id, so the OR branch was true for all of
-- them: anyone holding the public anon key could read, change and delete other
-- visitors' carts. Verified on the local stack before this migration: an anon
-- SELECT returned a foreign session's row and an anon DELETE removed it (204).
--
-- Decision: lock the table down, keep the table. The cart lives client-side in
-- localStorage ('hydra-cart', src/components/shop/CartProvider.tsx); cart_items is
-- empty on prod (select count(*) = 0 on 2026-10-08) and is referenced from the app
-- only as a TypeScript type. It is kept for a future server-side cart rather than
-- dropped, so no data or shape is lost.
--
-- After this migration `anon` and `authenticated` have no privileges at all on the
-- table and no policy applies to them, which denies everything twice over (missing
-- GRANT and, should a grant ever return, RLS with no permissive policy). Access is
-- service-role only, the same shape as source_connectors in migration 008.
-- scripts/reset-shop-db.ts uses the service-role key and is unaffected.
--
-- No columns are added, removed or retyped, so src/lib/supabase/types.ts is unchanged.

-- 1. Remove the over-permissive policy. With no policy left for anon/authenticated,
--    RLS denies every row to them by default.
DROP POLICY IF EXISTS "own cart" ON public.cart_items;

-- 2. Least privilege: strip the table grants from both public API roles.
--    service_role (admin client) and postgres (owner, migrations) keep theirs.
REVOKE ALL ON TABLE public.cart_items FROM anon;
REVOKE ALL ON TABLE public.cart_items FROM authenticated;

-- 3. RLS stated explicitly in the same migration as the policy change, so this file
--    alone describes the table's final access state. Idempotent: already enabled in 001.
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
