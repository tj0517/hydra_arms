-- HA-1.03: Harden SECURITY DEFINER functions
-- Mirrors the pattern established in 006_checkout_atomic.sql.
--
-- create_user_profile  — trigger function; SET search_path already true on prod
--                        (documented drift from 001) but must be in migrations for
--                        reproducibility. REVOKE is hygiene: trigger functions are
--                        never called via the API, but the grant was open.
-- next_xml_product_id  — callable via RPC; search_path not set; anon/authenticated
--                        can call it. After this migration only service_role can.

-- Use ALTER FUNCTION (not CREATE OR REPLACE) so bodies remain byte-identical to prod.
-- Both statements are idempotent: re-running sets the same value / revokes nothing.

ALTER FUNCTION public.create_user_profile()
  SET search_path = public;

REVOKE ALL ON FUNCTION public.create_user_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_user_profile() FROM anon;
REVOKE ALL ON FUNCTION public.create_user_profile() FROM authenticated;


ALTER FUNCTION public.next_xml_product_id()
  SET search_path = public;

REVOKE ALL ON FUNCTION public.next_xml_product_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.next_xml_product_id() FROM anon;
REVOKE ALL ON FUNCTION public.next_xml_product_id() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.next_xml_product_id() TO service_role;
