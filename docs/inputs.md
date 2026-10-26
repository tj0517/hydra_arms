# Inputy — co jeszcze trzeba dostarczyć

<!-- PLIK GENEROWANY z config/inputs.ts — nie edytuj ręcznie.
     Regeneracja: npm run inputs:docs · sprawdzenie: npm run inputs:check -->

Rejestr trzyma wyłącznie metadane — żadnych wartości (HA-2.16). Statusy:
`placeholder` = wartość nieustalona, `confirmed` = ustalona i można ruszać na produkcję.
Start sprzedaży (HA-2.09) z `SHOP_MODE=live` nie przejdzie, dopóki jakikolwiek input jest
`placeholder`. `⟨nazwa wstępna⟩` = nazwa jeszcze nie istnieje w kodzie; zadanie właściciela
może ją zmienić.

## Do dostarczenia (18)

| nazwa | właściciel | pytanie | zadanie | gdzie użyte | sekret |
|---|---|---|---|---|---|
| `P24_MERCHANT_ID` | client | O-09 | HA-2.08 | `src/lib/p24/index.ts`<br>`src/app/api/shop/payments/p24/mock-pay/route.ts` | nie |
| `P24_POS_ID` | client | O-09 | HA-2.08 | `src/lib/p24/index.ts`<br>`src/app/api/shop/payments/p24/mock-pay/route.ts` | nie |
| `P24_CRC_KEY` | client | O-09 | HA-2.08 | `src/lib/p24/mode.ts` | tak |
| `P24_API_KEY` | client | O-09 | HA-2.08 | `src/lib/p24/index.ts` | tak |
| `P24_NOTIFY_ALLOWED_IPS` ⟨nazwa wstępna⟩ | tj | O-09 | HA-2.20 | `src/lib/p24/notifyIp.ts`<br>`src/app/api/shop/payments/p24/notify/route.ts` | nie |
| `BASELINKER_MARKUP_KOLBA` | client | O-07 | HA-2.05 | `scripts/xml-to-baselinker.ts` | nie |
| `BASELINKER_MARKUP_SHARG` | client | O-07 | HA-2.05 | `scripts/xml-to-baselinker.ts` | nie |
| `BASELINKER_MARKUP_SPECHURT` | client | O-07 | HA-2.05 | `scripts/xml-to-baselinker.ts` | nie |
| `BASELINKER_EXTRA_FIELD_MARGIN` | tj | O-32 | HA-2.22 | `scripts/xml-to-baselinker.ts`<br>`scripts/audit-import.ts`<br>`xml-integration/margin.ts` | nie |
| `SHIPPING_PRICE_DHL` | client | O-10 | HA-2.02 | `src/lib/shop/shippingPrices.ts`<br>`src/app/api/shop/checkout/route.ts`<br>`src/app/(main)/sklep/zamowienie/page.tsx` | nie |
| `SHIPPING_PRICE_DPD` | client | O-10 | HA-2.02 | `src/lib/shop/shippingPrices.ts`<br>`src/app/api/shop/checkout/route.ts`<br>`src/app/(main)/sklep/zamowienie/page.tsx` | nie |
| `SHIPPING_PRICE_INPOST` | client | O-10 | HA-2.02 | `src/lib/shop/shippingPrices.ts`<br>`src/app/api/shop/checkout/route.ts`<br>`src/app/(main)/sklep/zamowienie/page.tsx` | nie |
| `SHIPPING_PRICE_INPOST_LOCKER` | client | O-10 | HA-2.02 | `src/lib/shop/shippingPrices.ts`<br>`src/app/api/shop/checkout/route.ts`<br>`src/app/(main)/sklep/zamowienie/page.tsx` | nie |
| `FREE_SHIPPING_THRESHOLD` | client | O-10 | HA-2.02 | `src/lib/shop/shippingPrices.ts`<br>`src/app/api/shop/checkout/route.ts`<br>`src/app/(main)/sklep/zamowienie/page.tsx` | nie |
| `INPOST_GEOWIDGET_TOKEN` | tj | — | HA-2.02 | `src/app/(main)/sklep/zamowienie/page.tsx`<br>`src/components/shop/InpostLockerPicker.tsx` | nie |
| `NEW_SUBCATEGORY_DEFAULT_PRIORITY` | client | O-22 | HA-2.18 | `xml-integration/assortment-rules.ts` | nie |
| `ORDER_LINK_SECRET` | tj | — | HA-2.19 | `src/lib/shop/orderLink.ts`<br>`src/lib/shop/guestOrderStatus.ts`<br>`src/lib/email/orderEmails.ts` | tak |
| `public/payment-marks/p24-marks.png` ⟨nazwa wstępna⟩ | tj | — | HA-2.08 | `src/components/Footer.tsx` | nie |

## Potwierdzone (2)

| nazwa | właściciel | pytanie | zadanie | gdzie użyte | sekret |
|---|---|---|---|---|---|
| `P24_MODE` | tj | — | HA-2.09 | `src/lib/p24/mode.ts` | nie |
| `SITE_URL` | client | O-31 | HA-2.21 | `src/lib/siteUrl.ts`<br>`src/app/layout.tsx`<br>`src/app/sitemap.ts`<br>`src/app/robots.ts`<br>`src/app/(main)/sklep/[id]/page.tsx`<br>`src/lib/shop/registerPayment.ts`<br>`src/app/api/shop/checkout/route.ts`<br>`src/app/api/shop/payments/p24/register/route.ts`<br>`src/app/api/shop/payments/p24/mock-pay/route.ts`<br>`src/lib/shop/orderLink.ts`<br>`src/lib/email/templates.ts` | nie |

## Uwagi

- `P24_MERCHANT_ID` — Sandbox first (HA-2.08), production keys at HA-2.23. Code falls back to a dummy id in mock mode.
- `P24_POS_ID` — Usually equal to P24_MERCHANT_ID.
- `P24_CRC_KEY` — Signature verification key. Sandbox and production keys differ.
- `P24_API_KEY` — Reports key from the Przelewy24 panel.
- `P24_MODE` — Closed list in code: mock | sandbox | production. Per-environment switch, not a missing value — HA-2.09 sets production.
- `P24_NOTIFY_ALLOWED_IPS` — Comma-separated P24 server IPs — bare addresses and IPv4 CIDR ranges. Source: official Przelewy24 docs, section "Adresy IP serwerow" / "Server IP addresses" (developers.przelewy24.pl, /yaml/pl_documentation_1.0.yaml + en). The docs publish ONE list for all P24 servers and do NOT split sandbox from production, so the same list applies to both modes. Stays placeholder: the registry holds metadata only, the values go to env (Vercel) at HA-2.23/HA-2.09. Filter is active in sandbox/production or whenever this is set; empty in sandbox/production rejects every notify (fail closed).
- `BASELINKER_MARKUP_KOLBA` — Percent on purchase price (25 = +25%). Client gave no rates on 2026-10-06; 30% is the working assumption in HA-2.05. A product's own „Marża %” field in BL overrides it (BASELINKER_EXTRA_FIELD_MARGIN, HA-2.22).
- `BASELINKER_MARKUP_SHARG` — See BASELINKER_MARKUP_KOLBA.
- `BASELINKER_MARKUP_SPECHURT` — See BASELINKER_MARKUP_KOLBA.
- `BASELINKER_EXTRA_FIELD_MARGIN` — ID of the BL extra field „Marża %” in catalogue 119068 (bare number, e.g. 75, or extra_field_75). tj creates the field in the BL panel and reads the ID with the import dry-run --only-bl-id. Unset = manual margins off, env markup for every product. Import server .env.local only, not Vercel.
- `SHIPPING_PRICE_DHL` — Gross PLN, dot decimal (e.g. 19.99). Carriers confirmed by the client 2026-10-06 (DHL, DPD, InPost); prices not given — preliminary values only. Missing/invalid → checkout refuses parcel orders (fail closed).
- `SHIPPING_PRICE_DPD` — See SHIPPING_PRICE_DHL.
- `SHIPPING_PRICE_INPOST` — InPost courier. See SHIPPING_PRICE_DHL.
- `SHIPPING_PRICE_INPOST_LOCKER` — InPost Paczkomat (added in HA-2.02, tj 2026-10-16). Preliminary value = InPost courier. See SHIPPING_PRICE_DHL.
- `FREE_SHIPPING_THRESHOLD` — Goods subtotal (PLN gross) from which parcel delivery is free; in a split order only the shipped goods count (tj D1 2026-10-17). Personal pickup is always 0 and needs no input.
- `INPOST_GEOWIDGET_TOKEN` — InPost Geowidget PUBLIC token (Manager Paczek → Moje konto → API → Geowidget), bound to the site domain; sent to the browser by design. Unset → the checkout shows a manual Paczkomat code field instead of the map and loads nothing from InPost.
- `NEW_SUBCATEGORY_DEFAULT_PRIORITY` — Closed list: P1 | P2 | P3 (case-sensitive); unset = P2. Default priority of every subcategory the correction sheet (2026-09-29) added without a P1/P2/P3 column — tj 2026-10-09: P2 = not imported until the client answers O-22. Only P1 admits those nodes to the import filter; the answer per subcategory is a `priority` edit on the row in assortment-rules.ts `newSubcategories`, this env moves all unanswered rows at once.
- `SITE_URL` — O-31 answered 2026-10-25 (tj): https://hydra-arms.com. One value for canonical, og:url, og:image, sitemap, robots, JSON-LD (siteUrl(), falls back to https://hydra-arms.com) and for P24 urlReturn/urlStatus and order links in e-mails (shopBaseUrl(), no fallback: unset → registration refused, mails without the link). Replaced SHOP_BASE_URL (HA-2.21). Read at build time for prerendered pages — a change needs a redeploy.
- `ORDER_LINK_SECRET` — HMAC key for the signed, expiring guest order-status link. Generated by tj, not requested from the client.
- `public/payment-marks/p24-marks.png` — Official Przelewy24 payment-method marks for the footer on every page (P24 verification requirement). Download from P24 — do not draw or re-create them. The footer shows a neutral placeholder until the file exists; file name and format (png/svg) may change when the real asset is added.
