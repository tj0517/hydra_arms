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

-- Hydra-numbered tree (HA-2.06): root "01. …" is section 01 (broń palna), always pickup-only.
-- Names mirror prod; the section is read from the root's "NN." prefix (hydra_section()).
INSERT INTO shop_categories (id, name, parent_id, inventory_id) VALUES
  (12001, '01. BROŃ PALNA',              NULL,  35743);
INSERT INTO shop_categories (id, name, parent_id, inventory_id) VALUES
  (12002, '1.1 Broń Krótka',             12001, 35743);

-- Working root "00. DO PRZYPISANIA" (HA-2.30): the importer's bucket for products it
-- cannot map. Hidden from the public category tree (isWorkingCategory, decision tj
-- 2026-10-19 D1 A); its products stay visible under "Wszystkie" and in search.
INSERT INTO shop_categories (id, name, parent_id, inventory_id) VALUES
  (12000, '00. DO PRZYPISANIA',          NULL,  35743);

-- ── Products ──────────────────────────────────────────────────────────────────
-- product_type distribution:
--   standard (16):      everyday tactical gear, no shipping restrictions (one in the "00." root)
--   age_restricted (3): weapons-related; age_min=18 → mustPickup() = true
--   pickup_only (2):    delivery_allowed=false → mustPickup() = true regardless of age
--
-- source_warehouse distribution:
--   'own' (11):   item physically in Hydra Arms warehouse
--   'sharg' (10): must be sourced from Sharg supplier before shipping

INSERT INTO shop_products
  (id, inventory_id, sku, ean, name,
   price, tax_rate, stock, weight,
   category_id, product_type, is_active,
   source_warehouse,
   age_min, requires_license, delivery_allowed, brand)
VALUES
  -- ── standard / own ──────────────────────────────────────────────────────
  (301001, 35743, 'KD-SP-001', '5901234567001', 'Spodnie taktyczne Ripstop Multicam',
   349.00, 23, 45, 0.65, 1002, 'standard', TRUE, 'own', 0, FALSE, TRUE, '5.11 Tactical'),

  (301002, 35743, 'KD-SP-002', '5901234567002', 'Spodnie taktyczne Softshell Czarne',
   289.00, 23, 22, 0.72, 1002, 'standard', TRUE, 'own', 0, FALSE, TRUE, 'Pentagon'),

  (301003, 35743, 'KD-KU-001', '5901234567003', 'Kurtka taktyczna Softshell Ranger Green',
   549.00, 23, 15, 0.95, 1003, 'standard', TRUE, 'own', 0, FALSE, TRUE, 'Helikon-Tex'),

  (301004, 35743, 'KD-BL-001', '5901234567004', 'Bluza Combat Flecktarn',
   199.00, 23, 30, 0.55, 1003, 'standard', TRUE, 'own', 0, FALSE, TRUE, 'Mil-Tec'),

  (303001, 35743, 'KD-RK-001', '5901234567009', 'Rękawice taktyczne Mechanix M-Pact Black L',
   149.00, 23, 38, 0.25, 3005, 'standard', TRUE, 'own', 0, FALSE, TRUE, 'Mechanix Wear'),

  (304001, 35743, 'KD-LT-001', '5901234567011', 'Latarka taktyczna SureFire G2X Pro',
   399.00, 23, 20, 0.31, 4002, 'standard', TRUE, 'own', 0, FALSE, TRUE, 'SureFire'),

  (309001, 35743, 'KD-AP-001', '5901234567017', 'Apteczka IFAK powypadkowa Coyote',
   199.00, 23, 33, 0.42, 9002, 'standard', TRUE, 'own', 0, FALSE, TRUE, 'North American Rescue'),

  (309002, 35743, 'KD-OU-001', '5901234567018', 'Opaska uciskowa CAT Combat Application Tourniquet',
   129.00, 23, 67, 0.08, 9003, 'standard', TRUE, 'own', 0, FALSE, TRUE, 'North American Rescue'),

  (310001, 35743, 'KD-BT-001', '5901234567019', 'Buty taktyczne Haix Black Eagle Athletic 10 Low',
   649.00, 23, 28, 1.20, 10002, 'standard', TRUE, 'own', 0, FALSE, TRUE, 'Haix'),

  (311001, 35743, 'KD-NA-001', '5901234567020', 'Naszywka flaga PL IR Multicam',
    29.00, 23,120, 0.02, 11003, 'standard', TRUE, 'own', 0, FALSE, TRUE, 'Condor'),

  -- ── standard / sharg ────────────────────────────────────────────────────
  (302002, 35743, 'KD-PL-001', '5901234567006', 'Plecak taktyczny 40L Multicam',
   449.00, 23, 18, 1.35, 2003, 'standard', TRUE, 'sharg', 0, FALSE, TRUE, 'Helikon-Tex'),

  (302003, 35743, 'KD-PL-002', '5901234567007', 'Plecak assault 25L Black',
   299.00, 23, 24, 0.98, 2003, 'standard', TRUE, 'sharg', 0, FALSE, TRUE, 'Condor'),

  (302004, 35743, 'KD-PA-001', 'KD-PA-001', 'Pas taktyczny rigger 1.75'' Czarny',
    89.00, 23, 55, 0.18, 2005, 'standard', TRUE, 'sharg', 0, FALSE, TRUE, 'Condor'),

  (304002, 35743, 'KD-LO-001', '5901234567012', 'Lornetka taktyczna 10x42 HD',
   799.00, 23,  6, 0.95, 4003, 'standard', TRUE, 'sharg', 0, FALSE, TRUE, 'Vortex Optics'),

  (306002, 35743, 'KD-MT-001', '5901234567014', 'Multitool Leatherman Wave+ Black',
   499.00, 23, 14, 0.30, 6003, 'standard', TRUE, 'sharg', 0, FALSE, TRUE, 'Leatherman'),

  -- ── age_restricted / sharg ──────────────────────────────────────────────
  -- age_min=18 → mustPickup() returns true → always personal collection
  (306001, 35743, 'KD-NO-001', '5901234567013', 'Nóż taktyczny Gerber StrongArm Fixed Blade',
   349.00, 23, 25, 0.29, 6002, 'age_restricted', TRUE, 'sharg', 18, FALSE, TRUE, 'Gerber'),

  (307002, 35743, 'KD-ZC-001', '5901234567016', 'Zestaw do czyszczenia broni 9mm',
    89.00, 23, 42, 0.35, 7004, 'age_restricted', TRUE, 'sharg', 18, FALSE, TRUE, 'Otis'),

  (303002, 35743, 'KD-GO-001', '5901234567010', 'Gogle balistyczne ESS Crossbow Smoke',
   279.00, 23, 12, 0.18, 3006, 'age_restricted', TRUE, 'sharg', 18, FALSE, TRUE, 'ESS'),

  -- ── pickup_only / own ───────────────────────────────────────────────────
  -- delivery_allowed=FALSE → mustPickup() regardless of age
  (302001, 35743, 'KD-KW-001', '5901234567005', 'Kamizelka taktyczna JPC Coyote Brown',
   899.00, 23,  8, 2.80, 2002, 'pickup_only', TRUE, 'own', 0, FALSE, FALSE, 'Crye Precision'),

  -- ── pickup_only / sharg ─────────────────────────────────────────────────
  (307001, 35743, 'KD-KA-001', '5901234567015', 'Kaburka udowa pistolet Glock 17/19 Czarna',
   249.00, 23, 16, 0.45, 7005, 'pickup_only', TRUE, 'sharg', 0, TRUE, FALSE, 'Blackhawk'),

  -- ── section 01 without any flag (HA-2.06) ───────────────────────────────
  -- standard / no licence / no age / delivery_allowed=TRUE, but the category chain
  -- ends at root "01. BROŃ PALNA" → pickup-only by category alone (defence in depth)
  (312001, 35743, 'TS-S01-001', '5901234567099', 'Produkt testowy sekcji 01 (bez flag)',
   100.00, 23, 10, 0.10, 12002, 'standard', TRUE, 'own', 0, FALSE, TRUE, 'Test');

-- ── working root "00." (HA-2.30) ─────────────────────────────────────────
-- Active, shippable product sitting in the hidden "00. DO PRZYPISANIA" root:
-- the listing must show it without a category filter while the tree omits "00.".
INSERT INTO shop_products
  (id, inventory_id, sku, ean, name,
   price, tax_rate, stock, weight,
   category_id, product_type, is_active,
   source_warehouse,
   age_min, requires_license, delivery_allowed, brand)
VALUES
  (312002, 35743, 'TS-S00-001', '5901234567098', 'Produkt testowy do przypisania',
   50.00, 23, 5, 0.10, 12000, 'standard', TRUE, 'own', 0, FALSE, TRUE, 'Test');

-- ── Product card states (HA-2.31, decisions tj 2026-10-20) ────────────────────
-- Seed data only, no schema change. Three standard/shippable products:
--   313001: price_compare > price → the card shows the struck-through catalogue price
--           (every other seed product has price_compare NULL → red proof: no <s>)
--   313002: stock = 0 → "Niedostępny" line, disabled button (D2; also unblocks
--           the deferred cart.spec.ts "out-of-stock product cannot be added")
--   313003: images → local packshot under public/ (synthetic drawing on pure white,
--           not a wholesaler photo) so the 1:1 / object-contain rendering is testable (D4)
INSERT INTO shop_products
  (id, inventory_id, sku, ean, name,
   price, price_compare, tax_rate, stock, weight,
   category_id, product_type, is_active,
   source_warehouse,
   age_min, requires_license, delivery_allowed, brand, images)
VALUES
  (313001, 35743, 'TS-PC-001', '5901234567101', 'Plecak taktyczny 3-Day Assault Olive (promocja)',
   299.00, 349.00, 23, 9, 1.40, 2003, 'standard', TRUE, 'own', 0, FALSE, TRUE, 'Test', NULL),
  (313002, 35743, 'TS-OOS-001', '5901234567102', 'Rękawice taktyczne Nomex Czarne (wyprzedane)',
   159.00, NULL, 23, 0, 0.20, 3005, 'standard', TRUE, 'own', 0, FALSE, TRUE, 'Test', NULL),
  (313003, 35743, 'TS-IMG-001', '5901234567103', 'Ładownica uniwersalna MOLLE Olive (ze zdjęciem)',
    79.00, NULL, 23, 12, 0.15, 2005, 'standard', TRUE, 'own', 0, FALSE, TRUE, 'Test',
   '{"1": "/img/seed/packshot-test.png"}'::jsonb);

-- ── Listing in Postgres (HA-2.34) ────────────────────────────────────────────
-- Seed data only, no schema change. Exercised by tests/shop/listing-rpc.spec.ts:
--   4003 "Lunety i lornetki": 304002 + 314001..314003 carry features → two keys with
--        ≥ 2 values (Powiększenie, Średnica obiektywu) and one single-value key
--        (Wodoodporność, must not be offered); brands Vortex Optics ×3, Delta Optical ×1
--   314001: Polish diacritics in the name (search without diacritics)
--   314002/314003: identical name → tiebreaker by id
--   314004: "Ćwiek …", stock 1, reserved by the paid seed order below → listed stock 0
--   314005: "Czarny proch …" — sorts before "Ćwiek" in Polish order (C < Ć < D;
--           a root/English collation puts "Ćwiek" first); price NULL → NULLS LAST;
--           licence + no delivery → pickup_only
-- Only four new shippable products: listing.spec.ts compares page counts (max 24)
-- of the wysylka/odbior filters with the total, so shippable must stay ≤ 24.
INSERT INTO shop_products
  (id, inventory_id, sku, ean, name,
   price, tax_rate, stock, weight,
   category_id, product_type, is_active,
   source_warehouse,
   age_min, requires_license, delivery_allowed, brand, features)
VALUES
  (314001, 35743, 'TS-LUN-001', '5901234567201', 'Luneta celownicza Łowca 3-9x40 z podświetlaną siatką',
   1290.00, 23, 4, 0.55, 4003, 'standard', TRUE, 'sharg', 0, FALSE, TRUE, 'Delta Optical',
   '{"Powiększenie": "3-9x", "Średnica obiektywu": "40 mm", "Wodoodporność": "IPX7"}'::jsonb),
  (314002, 35743, 'TS-DAL-001', '5901234567202', 'Dalmierz laserowy 800 m',
   899.00, 23, 3, 0.20, 4003, 'standard', TRUE, 'sharg', 0, FALSE, TRUE, 'Vortex Optics',
   '{"Powiększenie": "6x", "Średnica obiektywu": "25 mm", "Wodoodporność": "IPX7"}'::jsonb),
  (314003, 35743, 'TS-DAL-002', '5901234567203', 'Dalmierz laserowy 800 m',
   899.00, 23, 2, 0.20, 4003, 'standard', TRUE, 'sharg', 0, FALSE, TRUE, 'Vortex Optics',
   '{"Powiększenie": "6x", "Średnica obiektywu": "25 mm", "Wodoodporność": "IPX7"}'::jsonb),
  (314004, 35743, 'TS-CWI-001', '5901234567204', 'Ćwiek mosiężny do pasa',
     9.00, 23, 1, 0.01, 2005, 'standard', TRUE, 'own', 0, FALSE, TRUE, 'Test', NULL),
  (314005, 35743, 'TS-PRO-001', '5901234567205', 'Czarny proch strzelniczy 250 g',
     NULL, 23, 6, 0.25, 7004, 'pickup_only', TRUE, 'own', 18, TRUE, FALSE, 'Test', NULL);

UPDATE shop_products
   SET features = '{"Powiększenie": "10x", "Średnica obiektywu": "42 mm", "Wodoodporność": "IPX7"}'::jsonb
 WHERE id = 304002;

-- Paid order not yet in BaseLinker → reserves the only unit of 314004.
-- is_test = TRUE and no shipping address: the orders sync never pushes it
-- (it would set baselinker_order_id and release the reservation).
INSERT INTO orders (id, status, is_test, baselinker_order_id)
VALUES ('00000000-0000-4000-8000-000000002034', 'paid', TRUE, NULL);
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
VALUES ('00000000-0000-4000-8000-000000002034', 314004, 1, 9.00);

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

-- Wraps has_table_privilege so permission tests can verify REVOKE on tables.
-- NOT a migration — seed only (test environment).
CREATE OR REPLACE FUNCTION public.test_table_privilege(role_name text, tbl text, priv text)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT has_table_privilege(role_name, tbl, priv);
$$;
REVOKE ALL ON FUNCTION public.test_table_privilege(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.test_table_privilege(text, text, text) TO service_role;
