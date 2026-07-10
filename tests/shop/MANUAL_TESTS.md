# Manual Test Cases — Hydra Arms Shop

> **Environment:** `npm run dev` → http://localhost:3000
> **Supabase:** check results at dashboard → Table Editor → `orders` / `order_items`
> **Before each session:** clear `localStorage` in DevTools → Application → Local Storage → delete `hydra-cart`

---

## Product Reference

> Queried live from DB on 2026-07-02. All 200 active products are `product_type = standard`, `source_warehouse = null`.

### ✅ Standard — High Stock (safe for repeated testing)

| ID | Name | Price | Stock |
|---|---|---|---|
| `619344685` | Śrut Apolo Magnum 4.5mm 100szt | 6,50 PLN | 1764 |
| `619343664` | Gaz pieprzowy KKS OC 5000 Gel 50ml | 48,00 PLN | 286 |
| `619344639` | Śrut JSB Diabolo Hades 5.50mm 250szt | 38,00 PLN | 268 |
| `619345383` | Rewolwer alarmowy BAS Voltran EKOL Viper | 498,00 PLN | 264 |
| `619344717` | Śrut Apolo Air Boss Arrow Copper 5.5mm 250szt | 33,00 PLN | 205 |

URLs: `/sklep/619344685`, `/sklep/619343664`, `/sklep/619344639` etc.

### ⚠️ Standard — Low Stock (use for stock-limit tests)

| ID | Name | Price | Stock |
|---|---|---|---|
| `619342679` | Pistolet ALP | 448,00 PLN | **2** |
| `619342701` | Pistolet ALP 2 | 448,00 PLN | **2** |
| `619343306` | Pałka teleskopowa ESP Ergonomic Gold 21'' | 328,00 PLN | **3** |
| `619343365` | Strzelba samopowtarzalna Hatsan Escort AS 28'' | 1598,00 PLN | **2** |

### ❌ Out of Stock (use for OOS tests)

| ID | Name | Price |
|---|---|---|
| `619341972` | Multitool Everts Solingen Stainless | 43,00 PLN |
| `619342027` | Luneta celownicza Barska Tactical 4-16x50 IR | 998,00 PLN |
| `619342076` | Nóż Muela Full Tang Pakkawood JABALI-17R | 598,00 PLN |
| `619342175` | Ochronniki słuchu 3M Peltor Bull's Eye I Zielone | 128,00 PLN |

### 🔒 Restricted / Pickup-Only

> **None exist yet in DB** — all products are `standard`. To test TC-11 and TC-12, manually set a test product:
>
> ```sql
> -- In Supabase SQL Editor — set Pistolet ALP as age_restricted
> update shop_products set product_type = 'age_restricted' where id = 619342679;
> -- Restore after testing:
> update shop_products set product_type = 'standard' where id = 619342679;
> ```

### 🏭 Multi-Warehouse (for TC-10 consolidated route)

> **No warehouse data in DB yet** — all `source_warehouse = null`, which defaults to `consolidated` route ("Dostawa kurierska").
> To test `direct_H1` vs `direct_H2` split, set two products manually:
>
> ```sql
> update shop_products set source_warehouse = 'H1' where id = 619344685;
> update shop_products set source_warehouse = 'H2' where id = 619343664;
> -- Restore after testing:
> update shop_products set source_warehouse = null where id in (619344685, 619343664);
> ```

---

## 1. Cart — Happy Path

### TC-01 Add single in-stock product from detail page
**Use:** `/sklep/619344685` (Śrut Apolo, 6,50 PLN, stock 1764)

1. Go to `/sklep/619344685`
2. Click `[ DODAJ DO KOSZYKA ]`
3. **Expected:** button briefly shows `[ DODANO DO KOSZYKA ✓ ]`, then reverts
4. **Expected:** cart drawer slides in from the right with the product listed
5. **Expected:** nav cart icon shows badge count `1`

### TC-02 Add same product twice → quantity increments
**Use:** `/sklep/619344685` (Śrut Apolo)

1. Click `[ DODAJ DO KOSZYKA ]`
2. Close drawer (× button), wait ~1s for button to reset
3. Click `[ DODAJ DO KOSZYKA ]` again
4. **Expected:** drawer shows `2` units of the same product (not 2 rows)
5. **Expected:** total = 6,50 × 2 = **13,00 PLN**

### TC-03 Add multiple different products
**Use:** product A = `/sklep/619344685` (6,50 PLN) + product B = `/sklep/619343664` (48,00 PLN)

1. Add product A, close drawer
2. Navigate to `/sklep/619343664`, add product B
3. Open cart drawer
4. **Expected:** both products listed
5. **Expected:** total = **54,50 PLN**

### TC-04 Add product from listing card
**Use:** `/sklep` listing at desktop (≥ 1280px)

1. Go to `/sklep`, hover any in-stock card
2. Click `[ DODAJ DO KOSZYKA ]` on the card (without entering detail page)
3. **Expected:** product added, drawer opens, badge updates

### TC-05 Remove item from cart drawer
**Use:** any product from the high-stock list

1. Add a product, open drawer
2. Click `×` next to the item
3. **Expected:** item removed, drawer shows empty state
4. **Expected:** nav badge disappears

### TC-06 Change quantity in cart drawer
**Use:** `/sklep/619343664` (Gaz pieprzowy, 48,00 PLN)

1. Add product (qty 1), open drawer
2. Click `+` to increase to 3
3. **Expected:** total = **144,00 PLN**
4. Click `−` back to 1 → total = **48,00 PLN**
5. Click `−` again (below 1)
6. **Expected:** item removed from cart

---

## 2. Checkout — Happy Path (standard products)

> All current products use route `consolidated` → banner shows yellow "Dostawa kurierska".

### TC-07 Empty cart → checkout blocked
1. Clear localStorage (DevTools → Application → Local Storage → delete `hydra-cart`)
2. Navigate to `/sklep/zamowienie`
3. **Expected:** "Koszyk jest pusty" message with "WRÓĆ DO SKLEPU" link

### TC-08 Checkout form renders correctly
**Use:** `/sklep/619344685` (Śrut Apolo, 6,50 PLN)

1. Add product, open drawer, click `ZŁÓŻ ZAMÓWIENIE`
2. **Expected:** form fields visible: Imię\*, Nazwisko\*, Email\*, Telefon, Ulica\*, Miasto\*, Kod pocztowy\*
3. **Expected:** yellow fulfillment banner: "Dostawa kurierska / Standardowy czas dostawy"
4. **Expected:** right sidebar shows product name, 1 × 6,50 PLN, total 6,50 PLN

### TC-09 Complete checkout — single product ⭐ (most important)
**Use:** `/sklep/619344685` (Śrut Apolo, 6,50 PLN)

1. Add product, go to `/sklep/zamowienie`
2. Fill form:
   - Imię: `Jan` / Nazwisko: `Kowalski`
   - Email: `test@test.pl` / Telefon: `500123456`
   - Ulica: `Testowa 1` / Miasto: `Warszawa` / Kod: `00-001`
3. Click `ZŁÓŻ ZAMÓWIENIE`
4. **Expected:** spinner + "Przetwarzanie płatności..." + "SYMULACJA — automatyczna akceptacja"
5. **Expected:** redirect to `/sklep/zamowienie/[uuid]`
6. **Expected:** confirmation shows: order number, "Śrut Apolo Magnum...", qty 1, 6,50 PLN, address, status "Opłacone"
7. **Expected:** cart badge gone
8. **Supabase check:**
   ```sql
   select id, status, total, fulfillment_route, shipping_address, created_at
   from orders order by created_at desc limit 1;
   ```
   Expected: `status = 'paid'`, `total = 6.5`, `fulfillment_route = 'consolidated'`

   ```sql
   select quantity, unit_price, product_snapshot->>'name' as name
   from order_items where order_id = '[uuid from above]';
   ```
   Expected: `quantity = 1`, `unit_price = 6.5`, `name = 'Śrut Apolo Magnum...'`

### TC-10 Checkout — two products (consolidated route)
**Use:** `/sklep/619344685` (6,50 PLN) + `/sklep/619344639` (38,00 PLN)

1. Add both products, go to checkout
2. **Expected:** sidebar shows 2 items, total = **44,50 PLN**
3. **Expected:** yellow "Dostawa kurierska" banner
4. Fill form, submit
5. **Supabase check:** `order_items` has 2 rows for same `order_id`

---

## 3. Checkout — Pickup / Restricted Products

> ⚠️ **Requires DB setup first.** Run the SQL below before these tests.

### Setup
```sql
-- In Supabase SQL Editor
update shop_products set product_type = 'age_restricted' where id = 619342679;
-- Pistolet ALP → age_restricted (stock 2, price 448 PLN)
```

### TC-11 Single pickup/restricted product
**Use:** `/sklep/619342679` (Pistolet ALP — set to `age_restricted`)

1. Add Pistolet ALP to cart, go to `/sklep/zamowienie`
2. **Expected:** blue "ODBIÓR W SIEDZIBIE HYDRA ARMS" banner
3. **Expected:** NO street/city/zip fields — only Imię, Nazwisko, Email, Telefon
4. Fill contact data, submit
5. **Expected:** confirmation page shown
6. **Supabase check:** `fulfillment_route = 'pickup'`

### TC-12 Mixed cart — standard + restricted → split selector
**Use:** `/sklep/619344685` (standard, 6,50 PLN) + `/sklep/619342679` (age_restricted, 448,00 PLN)

1. Add both products, go to checkout
2. **Expected:** delivery mode selector appears:
   - ○ Odbiór osobisty — całe zamówienie
   - ○ Podziel zamówienie (1 produkt wysyłką · 1 produkty odbiorem osobistym)
3. Select **Podziel zamówienie**
4. **Expected:** address section appears (for the standard product)
5. **Expected:** summary splits: green "Wysyłka kurierska" (Śrut Apolo) + blue "Odbiór osobisty" (Pistolet ALP)
6. Fill form + address, submit
7. **Supabase check:** 2 separate order rows created
   ```sql
   select id, fulfillment_route, total from orders order by created_at desc limit 2;
   ```

### Teardown after TC-11/TC-12
```sql
update shop_products set product_type = 'standard' where id = 619342679;
```

---

## 4. Cart Persistence

### TC-13 Cart survives page refresh
**Use:** `/sklep/619344685` + `/sklep/619343664`

1. Add both products (cart badge shows 2)
2. Hard refresh `Ctrl+Shift+R`
3. **Expected:** badge still shows `2`
4. Open drawer → both products listed with correct prices

### TC-14 Cart survives navigation
**Use:** `/sklep/619344685`

1. Add product on `/sklep/619344685`
2. Navigate to `/sklep` → badge still shows `1`
3. Navigate to `/sklep/619343664` → badge still shows `1`
4. Open drawer → original product still listed

---

## 5. Edge Cases

### TC-15 Out-of-stock product — cannot be added
**Use:** `/sklep/619341972` (Multitool Everts, stock 0)

1. Navigate to `/sklep/619341972`
2. **Expected:** button shows "BRAK W MAGAZYNIE", is grey and disabled
3. **Expected:** "PRODUKT NIEDOSTĘPNY" text visible
4. Click the button
5. **Expected:** nothing happens, localStorage `hydra-cart` unchanged

### TC-16 Checkout — missing required fields
**Use:** `/sklep/619344685` added to cart

1. Go to checkout, leave **Imię** empty, fill everything else
2. Click `ZŁÓŻ ZAMÓWIENIE`
3. **Expected:** browser highlights the empty field, submission blocked
4. Repeat for: Nazwisko, Email, Ulica, Miasto, Kod pocztowy

### TC-17 Checkout — invalid email format
**Use:** `/sklep/619344685` added to cart

1. Go to checkout, enter `nie-email` in Email field
2. Click `ZŁÓŻ ZAMÓWIENIE`
3. **Expected:** browser validation error "Proszę podać adres e-mail"

### TC-18 Stock decrements after order ⭐
**Use:** `/sklep/619342679` (Pistolet ALP, stock **2**)

> Check stock before: `select stock from shop_products where id = 619342679;` → should be 2

1. Add Pistolet ALP to cart (qty 1), complete checkout
2. **Supabase check:**
   ```sql
   select stock from shop_products where id = 619342679;
   ```
   **Expected:** stock = **1** (decremented by 1)

### TC-19 Idempotency — no duplicate orders
**Use:** `/sklep/619344685`

1. Add product, fill checkout form
2. DevTools → Network → throttle to "Slow 3G"
3. Click `ZŁÓŻ ZAMÓWIENIE`
4. Immediately click again
5. **Expected:** button disabled (opacity-40) during processing — second click ignored
6. **Supabase check:** only 1 order row created (same `idempotency_key`)
   ```sql
   select count(*) from orders where created_at > now() - interval '1 minute';
   ```
   **Expected:** `count = 1`

### TC-20 Server error → error banner + retry
**Use:** `/sklep/619344685` added to cart, form filled

1. DevTools → Network → right-click `checkout` request → "Block request URL"
2. Submit order
3. **Expected:** error banner: "Brak połączenia z serwerem" + "SPRÓBUJ PONOWNIE" button
4. Unblock the URL in DevTools
5. Click "SPRÓBUJ PONOWNIE"
6. **Expected:** returns to form, can resubmit successfully

### TC-21 Order confirmation — invalid UUID
1. Navigate to `/sklep/zamowienie/00000000-0000-0000-0000-000000000000`
2. **Expected:** "Nie znaleziono zamówienia" with "WRÓĆ DO SKLEPU" link

### TC-22 Large cart — scroll and layout
**Use:** any 6 products from the high-stock list

1. Add: `619344685`, `619343664`, `619344639`, `619345383`, `619344717`, `619344617`
2. Open drawer → **Expected:** items list scrollable, total sums correctly
3. Go to checkout → **Expected:** right sidebar scrollable at `max-h-[45vh]`, no overflow

### TC-23 Stock limit — oversell check
**Use:** `/sklep/619342679` (Pistolet ALP, stock **2**)

1. Add Pistolet ALP (qty 1)
2. In drawer increase quantity to 2 with `+` button
3. **Expected:** qty = 2 in cart (at stock limit)
4. Add a 3rd unit (go back to detail page, click add again)
5. **Expected (current behaviour):** qty goes to 3 with no UI warning — this is an **identified oversell gap**

### TC-24 Logged-in user — pre-filled form
1. Log in at `/konto/login`
2. Add `/sklep/619344685`, go to checkout
3. **Expected:** Email pre-filled from account, Imię/Nazwisko pre-filled if set in profile
4. **Expected:** all fields editable

---

## 6. Mobile (375px viewport)

> Use Chrome DevTools → Device Toolbar → set 375 × 812

### TC-25 Listing on mobile
1. Go to `/sklep` at 375px
2. **Expected:** category sidebar (`<aside>`) hidden — no left panel
3. **Expected:** product grid 1-2 columns, cards readable
4. **Expected:** search bar "SZUKAJ..." accessible at top

### TC-26 Cart drawer on mobile
**Use:** `/sklep/619344685`

1. Add product at 375px
2. **Expected:** drawer covers full width (or near-full)
3. **Expected:** `×` close button visible and tappable in top-right
4. **Expected:** "ZŁÓŻ ZAMÓWIENIE" button reachable by scrolling drawer

### TC-27 Checkout form on mobile
**Use:** `/sklep/619344685` in cart

1. Go to `/sklep/zamowienie` at 375px
2. **Expected:** all form fields single-column (no side-by-side grid)
3. **Expected:** order summary appears **below** the form (not side-by-side)
4. **Expected:** "ZŁÓŻ ZAMÓWIENIE" button full-width, easy to tap

---

## Supabase Quick Checks

```sql
-- Last 5 orders
select id, status, total, fulfillment_route, created_at
from orders order by created_at desc limit 5;

-- Items for latest order
select oi.quantity, oi.unit_price, oi.product_snapshot->>'name' as name
from order_items oi
join orders o on o.id = oi.order_id
order by o.created_at desc limit 10;

-- Stock after ordering
select id, name, stock
from shop_products
where id in (619342679, 619343306, 619343365)
order by stock asc;

-- Verify no oversell (stock went negative)
select id, name, stock from shop_products where stock < 0;
```
