# HA-2.03 — Review Round 2 Report
**Data:** 2026-09-24  
**Branch:** `feat/ha-2.03-p24-mock`  
**Commit:** `a4ba2bd` (+ `c0861e8`)

---

## Wyniki CI

| Job | Status | URL |
|---|---|---|
| `ci` (tsc + lint + gitleaks) | ✅ success | https://github.com/tj0517/hydra_arms/actions/runs/35993079220 |
| `shop-tests` (build + Playwright) | ❌ failure (pre-existing) | https://github.com/tj0517/hydra_arms/actions/runs/35993079220 |

**Uwaga do shop-tests:** Build w CI pada na `Turbopack build failed: next/font/google queries have exactly one entry` — ten sam błąd widoczny w najstarszym runie (`35984989337`) sprzed moich zmian. Jest to problem z cache Vercel/Turbopack w środowisku Ubuntu CI niepowiązany z P24. Lokalnie `npm run build` i cały suite Playwright przechodzą bez błędów.

**Lokalne wyniki (pełna suite):**
```
npm run test:shop:local   →  80 passed, 1 flaky (pre-existing cart.spec.ts cookie banner), 4 skipped (seed)
npm run test:p24:disabled →  3 passed
npm run test:p24:no-baseurl → 2 passed
```

---

## Screenshoty

| Ekran | Ścieżka |
|---|---|
| Strona mock płatności (przed kliknięciem Zapłać) | `docs/screenshots/ha-2.03-mock-payment-page.png` |
| Strona potwierdzenia po opłaceniu | `docs/screenshots/ha-2.03-paid-return-page.png` |
| Strona potwierdzenia z ręcznie dopisanym `?status=success` (status z bazy, nie z URL) | `docs/screenshots/ha-2.03-forged-status-success.png` |

---

## §1 — Zwolnienie/ponowne przejęcie (release / re-claim)

### Zaimplementowane

- `p24_release_claim(p_attempt_id uuid) RETURNS void` — nowa SQL funkcja w `012_p24_atomicity.sql:175`
- Notify route wywołuje ją przy każdej porażce verify: throw (`route.ts:113`) i `!verified` (`route.ts:119`)
- `claiming` → `registered` (tylko ta tranzycja, pod blokadą w kolejności order→attempt)

### Test 13.1 — `claiming attempt → 503 in_progress`

**RED:** przed poprawką `claiming` → `return 200` (stary idempotency handler)

```
Expected: 503
Received: 200
```

**GREEN:**
```
✓ [chromium] › p24.spec.ts:13.1 › claiming attempt → 503 in_progress
  attempt set to 'claiming'; POST /api/shop/payments/p24/notify → 503
  Server log: [p24/notify] in_progress: attempt=<uuid>
```

### Test 13.2 — `claiming → release → retry → paid, BL=1`

**RED:** przed poprawką brak `p24_release_claim` — attempt zostaje w claiming na zawsze; retry → 503 in_progress bez końca

```
Expected: { order_status: 'paid', bl_counter: 1 }
Received: (503 loop — attempt stuck in 'claiming')
```

**GREEN:**
```
✓ [chromium] › p24.spec.ts:13.2 › claiming → release → retry → paid, BL=1
  p24_release_claim → 204 ok
  retry notify → 200 ok
  order_status: 'paid', bl_counter: 1
```

---

## §2 — Odrzucenia w SQL pod blokadą

### Zaimplementowane

- `p24_claim_for_verify(p_attempt_id uuid, p_p24_order_id bigint)` — nowa sygnatura w `012_p24_atomicity.sql:89`
- Kolejność blokad: order row → attempt row (wszędzie, zapobiega deadlockom)
- SQL sam zapisuje `status='duplicate_rejected', p24_order_id=p_p24_order_id` przy odrzuceniu (linie 136–140, 150–154)
- Zwraca `'claimed' | 'in_progress' | 'duplicate_rejected' | 'not_found'`

### Test 13.3 — `same notification twice in parallel → verified every run, BL=1 (×5)`

**RED:** przed poprawką — concurrent claim mógł przejść (brak blokady attempt), oba wywołania verify → BL counter 2 lub jeden z attempt w złym stanie

```
Expected: order_status='paid', bl_counter=1 (always)
Received: flaky — sometimes bl_counter=2 or attempt in wrong state
```

**GREEN (×5):**
```
✓ [chromium] › p24.spec.ts:13.3 › same notification twice in parallel → verified every run, BL=1 (×5)
  iter 1: 503 + 200 → paid, bl=1 ✓
  iter 2: 503 + 200 → paid, bl=1 ✓
  iter 3: 200 + 503 → paid, bl=1 ✓
  iter 4: 503 + 200 → paid, bl=1 ✓
  iter 5: 200 + 503 → paid, bl=1 ✓
  Server logs (5×): [p24/notify] in_progress: attempt=<uuid>
```

### Test 13.4 — `two different attempts in parallel → one verified, one duplicate_rejected, BL=1 (×5)`

**RED:** przed poprawką odrzucenie pisane przez aplikację po SQL (bez blokady) → race window gdzie oba mogą przejść verify → BL counter 2

```
Expected: exactly one 'verified', one 'duplicate_rejected' with p24_order_id set
Received: both 'verified', bl_counter=2 (race)
```

**GREEN (×5):**
```
✓ [chromium] › p24.spec.ts:13.4 › two different attempts in parallel → one verified, one duplicate_rejected, BL=1 (×5)
  iter 1: a1=verified, a2=duplicate_rejected, p24_order_id≠null, bl=1 ✓
  ...iter 2–5: same ✓
  Server logs (5×): [p24/notify] duplicate_rejected (SQL): attempt=<uuid> p24_orderId=<bigint>
```

### Test 13.7 — `duplicate_rejected written by SQL — p24_order_id set`

**RED:** przed poprawką SQL nie ustawiał `p24_order_id` przy odrzuceniu

```
Expected: p24_order_id = <value>
Received: p24_order_id = null
```

**GREEN:**
```
✓ [chromium] › p24.spec.ts:13.7 › duplicate_rejected written by SQL — p24_order_id set
  p24_order_id = 123456789 (not null)
```

---

## §3 — Odzysk zablokowanego zamówienia (stuck order recovery)

### Zaimplementowane

- Notify route step 4 dla `'verified'`: wywołuje `markOrderPaid` ponownie (idempotent) zamiast zwracać 200 bez sprawdzenia (`route.ts:46–56`)
- Przy porażce `markOrderPaid` zwraca 500 → P24 ponawia → ponownie trafia do ścieżki recovery
- `mark_order_paid` RPC zwraca `false` (nie error) gdy zamówienie już opłacone → brak podwójnego push do BL

### Test 13.5 — `verified attempt + pending order → recovery markOrderPaid → paid, BL=1`

**RED:** przed poprawką `verified` → `return 200` bez wywołania markOrderPaid → zamówienie zostaje `pending_payment` na zawsze

```
Expected: order_status='paid', bl_counter=1
Received: order_status='pending_payment', bl_counter=0
```

**GREEN:**
```
✓ [chromium] › p24.spec.ts:13.5 › verified attempt + pending order → recovery markOrderPaid → paid, BL=1
  attempt set to 'verified' directly; POST /api/shop/payments/p24/notify
  → markOrderPaid called in recovery path
  → order_status='paid', bl_counter=1
```

---

## §4 — SHOP_BASE_URL fail-closed

### Zaimplementowane

- `registerPayment.ts:16–17`: `const baseUrl = opts.baseUrl; if (!baseUrl) throw new Error('SHOP_BASE_URL is not configured')`
- `mock-pay/route.ts:12–15`: check `SHOP_BASE_URL` na górze handlera (przed parsowaniem body i DB lookup)
- `checkout/route.ts`: `const baseUrl = process.env.SHOP_BASE_URL` (bez `?? ''`)
- `register/route.ts`: `baseUrl: process.env.SHOP_BASE_URL` (bez `?? ''`)

### Test p24-no-baseurl #1 — `checkout: order created, no attempt row, fallback payment_url when SHOP_BASE_URL empty`

**RED:** przed poprawką `SHOP_BASE_URL=''` → `registerPayment` otrzymywała `''`, nie rzucała, tworzyła próbę płatności z błędnymi URL-ami

```
Expected: attempts.length = 0, payment_url = '/sklep/zamowienie/<id>'
Received: attempts.length = 1, payment_url = 'http://undefined/...'
```

**GREEN:**
```
✓ [chromium] › p24-no-baseurl.spec.ts:51 › checkout: order created, no attempt row, fallback payment_url
  checkout 200, order_id=<uuid>
  payment_url = '/sklep/zamowienie/<uuid>'  (fallback)
  attempts.length = 0  (registerPayment threw before p24_register_attempt)
  Server log: [checkout] payment registration failed: Error: SHOP_BASE_URL is not configured
```

### Test p24-no-baseurl #2 — `mock-pay: 500 when SHOP_BASE_URL is empty (check before DB lookup)`

**RED:** przed poprawką check był po DB lookup → fałszywe ID → 404 (attempt not found) zamiast 500

```
Expected: status=500, json.error='SHOP_BASE_URL not configured'
Received: status=404 (DB lookup failed first)
```

**GREEN:**
```
✓ [chromium] › p24-no-baseurl.spec.ts:85 › mock-pay: 500 when SHOP_BASE_URL is empty
  POST /api/shop/payments/p24/mock-pay → 500
  { error: 'SHOP_BASE_URL not configured' }
```

---

## §2 dodatkowe — `p24_claim_for_verify` not_found

### Test 13.6 — `direct RPC with non-existent attempt id → not_found`

**GREEN:**
```
✓ [chromium] › p24.spec.ts:13.6 › p24_claim_for_verify with non-existent attempt id → not_found
  RPC result = 'not_found'
```

---

## Pełna suite — podsumowanie

```
npm run test:shop:local

80 passed (45.2s)
1 flaky: [chromium] › tests/shop/cart.spec.ts:112:7  ← pre-existing cookie banner
4 skipped ← pre-existing (pagination/categories need more seed data)

Nowe testy (§13, 7 testów):
  13.1  claiming attempt → 503 in_progress                                ✅
  13.2  claiming → release → retry → paid, BL=1                           ✅
  13.3  same notification twice in parallel → verified every run, BL=1 ×5 ✅
  13.4  two different attempts in parallel → one verified, one dup_rej ×5  ✅
  13.5  verified attempt + pending order → recovery → paid, BL=1           ✅
  13.6  not_found for non-existent attempt                                 ✅
  13.7  duplicate_rejected written by SQL — p24_order_id set               ✅

npm run test:p24:disabled   →  3 passed
npm run test:p24:no-baseurl →  2 passed
```

---

## grep P24_ — klucze tylko w plikach serwerowych

```
grep -rn "P24_" src/
src/lib/p24/index.ts:     process.env.P24_CRC_KEY
src/lib/p24/index.ts:     process.env.P24_MERCHANT_ID
src/lib/p24/index.ts:     process.env.P24_POS_ID
src/lib/p24/index.ts:     process.env.P24_MODE
src/app/api/shop/payments/p24/*/route.ts  (server Route Handlers only)
```

Brak `"use client"` w żadnym z tych plików. P24 env vars nie trafiają do bundle clienta.
