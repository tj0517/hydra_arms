-- Hydra Arms — local development seed
-- Derived from src/lib/baselinker/fixtures/ (20 BL products, synthetic metadata).
-- No real customer data. All three product_type values and both source_warehouse
-- values are represented so every fulfillment path in cartAnalysis.ts is exercised.

-- ── Categories ────────────────────────────────────────────────────────────────
-- Parent categories first (parent_id = NULL for root nodes)
INSERT INTO shop_categories (id, name, parent_id, inventory_id) VALUES
  (1001, 'Odzież taktyczna',             NULL,  35743),
  (2001, 'Wyposażenie taktyczne',        NULL,  35743),
  (3001, 'Ochrona osobista',             NULL,  35743),
  (4001, 'Oświetlenie i optyka',         NULL,  35743),
  (6001, 'Noże i narzędzia',             NULL,  35743),
  (7001, 'Broń i akcesoria',             NULL,  35743),
  (9001, 'Medycyna taktyczna',           NULL,  35743),
  (10001,'Obuwie taktyczne',             NULL,  35743),
  (11001,'Akcesoria militarne',          NULL,  35743);

-- Child categories
INSERT INTO shop_categories (id, name, parent_id, inventory_id) VALUES
  (1002, 'Spodnie',                      1001,  35743),
  (1003, 'Kurtki i bluzy',               1001,  35743),
  (2002, 'Kamizelki taktyczne i nośniki',2001,  35743),
  (2003, 'Plecaki i torby',              2001,  35743),
  (2005, 'Pasy i szelki',               2001,  35743),
  (3005, 'Rękawice taktyczne',           3001,  35743),
  (3006, 'Okulary i gogle balistyczne',  3001,  35743),
  (4002, 'Latarki taktyczne',            4001,  35743),
  (4003, 'Lunety i lornetki',            4001,  35743),
  (6002, 'Noże taktyczne',               6001,  35743),
  (6003, 'Multitool i scyzoryki',        6001,  35743),
  (7004, 'Pielęgnacja broni',            7001,  35743),
  (7005, 'Kabury i uchwyty',             7001,  35743),
  (9002, 'Apteczki polowe',              9001,  35743),
  (9003, 'Opaski uciskowe i hemostatyki',9001,  35743),
  (10002,'Buty taktyczne',               10001, 35743),
  (11003,'Flagi i emblematy',            11001, 35743);

-- ── Products ──────────────────────────────────────────────────────────────────
-- product_type distribution:
--   standard (15):      everyday tactical gear, no shipping restrictions
--   age_restricted (3): weapons-related; age_min=18 → mustPickup() = true
--   pickup_only (2):    delivery_allowed=false → mustPickup() = true regardless of age
--
-- source_warehouse distribution:
--   'own' (10):   item physically in Hydra Arms warehouse
--   'sharg' (10): must be sourced from Sharg supplier before shipping

INSERT INTO shop_products
  (id, inventory_id, sku, ean, name,
   price, tax_rate, stock, weight,
   category_id, product_type, is_active,
   source_warehouse,
   age_min, requires_license, delivery_allowed)
VALUES
  -- ── standard / own ──────────────────────────────────────────────────────
  (301001, 35743, 'KD-SP-001', '5901234567001', 'Spodnie taktyczne Ripstop Multicam',
   349.00, 23, 45, 0.65, 1002, 'standard', TRUE, 'own', 0, FALSE, TRUE),

  (301002, 35743, 'KD-SP-002', '5901234567002', 'Spodnie taktyczne Softshell Czarne',
   289.00, 23, 22, 0.72, 1002, 'standard', TRUE, 'own', 0, FALSE, TRUE),

  (301003, 35743, 'KD-KU-001', '5901234567003', 'Kurtka taktyczna Softshell Ranger Green',
   549.00, 23, 15, 0.95, 1003, 'standard', TRUE, 'own', 0, FALSE, TRUE),

  (301004, 35743, 'KD-BL-001', '5901234567004', 'Bluza Combat Flecktarn',
   199.00, 23, 30, 0.55, 1003, 'standard', TRUE, 'own', 0, FALSE, TRUE),

  (303001, 35743, 'KD-RK-001', '5901234567009', 'Rękawice taktyczne Mechanix M-Pact Black L',
   149.00, 23, 38, 0.25, 3005, 'standard', TRUE, 'own', 0, FALSE, TRUE),

  (304001, 35743, 'KD-LT-001', '5901234567011', 'Latarka taktyczna SureFire G2X Pro',
   399.00, 23, 20, 0.31, 4002, 'standard', TRUE, 'own', 0, FALSE, TRUE),

  (309001, 35743, 'KD-AP-001', '5901234567017', 'Apteczka IFAK powypadkowa Coyote',
   199.00, 23, 33, 0.42, 9002, 'standard', TRUE, 'own', 0, FALSE, TRUE),

  (309002, 35743, 'KD-OU-001', '5901234567018', 'Opaska uciskowa CAT Combat Application Tourniquet',
   129.00, 23, 67, 0.08, 9003, 'standard', TRUE, 'own', 0, FALSE, TRUE),

  (310001, 35743, 'KD-BT-001', '5901234567019', 'Buty taktyczne Haix Black Eagle Athletic 10 Low',
   649.00, 23, 28, 1.20, 10002, 'standard', TRUE, 'own', 0, FALSE, TRUE),

  (311001, 35743, 'KD-NA-001', '5901234567020', 'Naszywka flaga PL IR Multicam',
    29.00, 23,120, 0.02, 11003, 'standard', TRUE, 'own', 0, FALSE, TRUE),

  -- ── standard / sharg ────────────────────────────────────────────────────
  (302002, 35743, 'KD-PL-001', '5901234567006', 'Plecak taktyczny 40L Multicam',
   449.00, 23, 18, 1.35, 2003, 'standard', TRUE, 'sharg', 0, FALSE, TRUE),

  (302003, 35743, 'KD-PL-002', '5901234567007', 'Plecak assault 25L Black',
   299.00, 23, 24, 0.98, 2003, 'standard', TRUE, 'sharg', 0, FALSE, TRUE),

  (302004, 35743, 'KD-PA-001', 'KD-PA-001', 'Pas taktyczny rigger 1.75'' Czarny',
    89.00, 23, 55, 0.18, 2005, 'standard', TRUE, 'sharg', 0, FALSE, TRUE),

  (304002, 35743, 'KD-LO-001', '5901234567012', 'Lornetka taktyczna 10x42 HD',
   799.00, 23,  6, 0.95, 4003, 'standard', TRUE, 'sharg', 0, FALSE, TRUE),

  (306002, 35743, 'KD-MT-001', '5901234567014', 'Multitool Leatherman Wave+ Black',
   499.00, 23, 14, 0.30, 6003, 'standard', TRUE, 'sharg', 0, FALSE, TRUE),

  -- ── age_restricted / sharg ──────────────────────────────────────────────
  -- age_min=18 → mustPickup() returns true → always personal collection
  (306001, 35743, 'KD-NO-001', '5901234567013', 'Nóż taktyczny Gerber StrongArm Fixed Blade',
   349.00, 23, 25, 0.29, 6002, 'age_restricted', TRUE, 'sharg', 18, FALSE, TRUE),

  (307002, 35743, 'KD-ZC-001', '5901234567016', 'Zestaw do czyszczenia broni 9mm',
    89.00, 23, 42, 0.35, 7004, 'age_restricted', TRUE, 'sharg', 18, FALSE, TRUE),

  (303002, 35743, 'KD-GO-001', '5901234567010', 'Gogle balistyczne ESS Crossbow Smoke',
   279.00, 23, 12, 0.18, 3006, 'age_restricted', TRUE, 'sharg', 18, FALSE, TRUE),

  -- ── pickup_only / own ───────────────────────────────────────────────────
  -- delivery_allowed=FALSE → mustPickup() regardless of age
  (302001, 35743, 'KD-KW-001', '5901234567005', 'Kamizelka taktyczna JPC Coyote Brown',
   899.00, 23,  8, 2.80, 2002, 'pickup_only', TRUE, 'own', 0, FALSE, FALSE),

  -- ── pickup_only / sharg ─────────────────────────────────────────────────
  (307001, 35743, 'KD-KA-001', '5901234567015', 'Kaburka udowa pistolet Glock 17/19 Czarna',
   249.00, 23, 16, 0.45, 7005, 'pickup_only', TRUE, 'sharg', 0, TRUE, FALSE);

-- ── Test helper ───────────────────────────────────────────────────────────────
-- Wraps has_function_privilege so permission tests can verify REVOKE without
-- calling the revoked function directly (PG17.6.1.111 Docker crashes with SIGSEGV
-- when PostgREST does SET LOCAL ROLE + calls a revoked SECURITY DEFINER function).
-- NOT a migration — seed only (test environment).
CREATE OR REPLACE FUNCTION public.test_fn_privilege(role_name text, func_sig text)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT has_function_privilege(role_name, func_sig, 'EXECUTE');
$$;
REVOKE ALL ON FUNCTION public.test_fn_privilege(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.test_fn_privilege(text, text) TO service_role;
