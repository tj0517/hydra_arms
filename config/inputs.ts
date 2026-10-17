/**
 * Input registry (HA-2.16).
 *
 * One place for every configuration value that is still missing from the client
 * (or from tj), so most of the shop can be built now and swapping a value in is
 * a one-line change.
 *
 * METADATA ONLY — this file never holds values, not even placeholder secrets
 * that look real. `status` says whether the value is settled, not what it is.
 *
 * Commands:
 *   npm run inputs:check   table of inputs; exit != 0 in live mode with placeholders
 *   npm run inputs:docs    regenerate docs/inputs.md from this registry
 *
 * The check logic lives in config/inputsCheck.ts (pure functions, unit-tested).
 */

/** Where the value is read from. */
export type InputSource = 'env' | 'file';

/** `placeholder` = value not settled yet. `confirmed` = settled, safe to go live. */
export type InputStatus = 'placeholder' | 'confirmed';

/** Who has to deliver the value. */
export type InputOwner = 'client' | 'tj';

export interface InputEntry {
  /** Variable (or file) name. Provisional names are flagged below. */
  name: string;
  source: InputSource;
  status: InputStatus;
  owner: InputOwner;
  /** true = the name does not exist in code yet; the owner task may rename it. */
  provisional: boolean;
  /** true = a credential. The check stays value-free for every input anyway. */
  secret: boolean;
  /** Paths that read it today, or `['not yet — HA-x.yy']`. */
  usedIn: string[];
  /** Open question in docs/04-open-questions.md, or null when none applies. */
  question: string | null;
  /** Task that owns the value. */
  task: string;
  note?: string;
}

export const INPUTS: readonly InputEntry[] = [
  // ─── Przelewy24 — credentials (O-09, delivered by the client) ───────────────
  {
    name: 'P24_MERCHANT_ID',
    source: 'env',
    status: 'placeholder',
    owner: 'client',
    provisional: false,
    secret: false,
    usedIn: [
      'src/lib/p24/index.ts',
      'src/app/api/shop/payments/p24/mock-pay/route.ts',
    ],
    question: 'O-09',
    task: 'HA-2.08',
    note: 'Sandbox first (HA-2.08), production keys at HA-2.23. Code falls back to a dummy id in mock mode.',
  },
  {
    name: 'P24_POS_ID',
    source: 'env',
    status: 'placeholder',
    owner: 'client',
    provisional: false,
    secret: false,
    usedIn: [
      'src/lib/p24/index.ts',
      'src/app/api/shop/payments/p24/mock-pay/route.ts',
    ],
    question: 'O-09',
    task: 'HA-2.08',
    note: 'Usually equal to P24_MERCHANT_ID.',
  },
  {
    name: 'P24_CRC_KEY',
    source: 'env',
    status: 'placeholder',
    owner: 'client',
    provisional: false,
    secret: true,
    usedIn: ['src/lib/p24/mode.ts'],
    question: 'O-09',
    task: 'HA-2.08',
    note: 'Signature verification key. Sandbox and production keys differ.',
  },
  {
    name: 'P24_API_KEY',
    source: 'env',
    status: 'placeholder',
    owner: 'client',
    provisional: false,
    secret: true,
    usedIn: ['src/lib/p24/index.ts'],
    question: 'O-09',
    task: 'HA-2.08',
    note: 'Reports key from the Przelewy24 panel.',
  },
  {
    name: 'P24_MODE',
    source: 'env',
    status: 'confirmed',
    owner: 'tj',
    provisional: false,
    secret: false,
    usedIn: ['src/lib/p24/mode.ts'],
    question: null,
    task: 'HA-2.09',
    note: 'Closed list in code: mock | sandbox | production. Per-environment switch, not a missing value — HA-2.09 sets production.',
  },
  {
    name: 'P24_NOTIFY_ALLOWED_IPS',
    source: 'env',
    status: 'placeholder',
    owner: 'tj',
    provisional: true,
    secret: false,
    usedIn: [
      'src/lib/p24/notifyIp.ts',
      'src/app/api/shop/payments/p24/notify/route.ts',
    ],
    question: 'O-09',
    task: 'HA-2.20',
    note: 'Comma-separated P24 server IPs — bare addresses and IPv4 CIDR ranges. Source: official Przelewy24 docs, section "Adresy IP serwerow" / "Server IP addresses" (developers.przelewy24.pl, /yaml/pl_documentation_1.0.yaml + en). The docs publish ONE list for all P24 servers and do NOT split sandbox from production, so the same list applies to both modes. Stays placeholder: the registry holds metadata only, the values go to env (Vercel) at HA-2.23/HA-2.09. Filter is active in sandbox/production or whenever this is set; empty in sandbox/production rejects every notify (fail closed).',
  },

  // ─── BaseLinker — markup per wholesaler (O-07, delivered by the client) ─────
  {
    name: 'BASELINKER_MARKUP_KOLBA',
    source: 'env',
    status: 'placeholder',
    owner: 'client',
    provisional: false,
    secret: false,
    usedIn: ['scripts/xml-to-baselinker.ts'],
    question: 'O-07',
    task: 'HA-2.05',
    note: 'Percent on purchase price (25 = +25%). Client gave no rates on 2026-10-06; 30% is the working assumption in HA-2.05. See also O-32 (markup sheet, HA-2.22).',
  },
  {
    name: 'BASELINKER_MARKUP_SHARG',
    source: 'env',
    status: 'placeholder',
    owner: 'client',
    provisional: false,
    secret: false,
    usedIn: ['scripts/xml-to-baselinker.ts'],
    question: 'O-07',
    task: 'HA-2.05',
    note: 'See BASELINKER_MARKUP_KOLBA.',
  },
  {
    name: 'BASELINKER_MARKUP_SPECHURT',
    source: 'env',
    status: 'placeholder',
    owner: 'client',
    provisional: false,
    secret: false,
    usedIn: ['scripts/xml-to-baselinker.ts'],
    question: 'O-07',
    task: 'HA-2.05',
    note: 'See BASELINKER_MARKUP_KOLBA.',
  },

  // ─── Shipping — prices and free-shipping threshold (O-10, client) ───────────
  {
    name: 'SHIPPING_PRICE_DHL',
    source: 'env',
    status: 'placeholder',
    owner: 'client',
    provisional: false,
    secret: false,
    usedIn: ['src/lib/shop/shippingPrices.ts', 'src/app/api/shop/checkout/route.ts', 'src/app/(main)/sklep/zamowienie/page.tsx'],
    question: 'O-10',
    task: 'HA-2.02',
    note: 'Gross PLN, dot decimal (e.g. 19.99). Carriers confirmed by the client 2026-10-06 (DHL, DPD, InPost); prices not given — preliminary values only. Missing/invalid → checkout refuses parcel orders (fail closed).',
  },
  {
    name: 'SHIPPING_PRICE_DPD',
    source: 'env',
    status: 'placeholder',
    owner: 'client',
    provisional: false,
    secret: false,
    usedIn: ['src/lib/shop/shippingPrices.ts', 'src/app/api/shop/checkout/route.ts', 'src/app/(main)/sklep/zamowienie/page.tsx'],
    question: 'O-10',
    task: 'HA-2.02',
    note: 'See SHIPPING_PRICE_DHL.',
  },
  {
    name: 'SHIPPING_PRICE_INPOST',
    source: 'env',
    status: 'placeholder',
    owner: 'client',
    provisional: false,
    secret: false,
    usedIn: ['src/lib/shop/shippingPrices.ts', 'src/app/api/shop/checkout/route.ts', 'src/app/(main)/sklep/zamowienie/page.tsx'],
    question: 'O-10',
    task: 'HA-2.02',
    note: 'InPost courier. See SHIPPING_PRICE_DHL.',
  },
  {
    name: 'SHIPPING_PRICE_INPOST_LOCKER',
    source: 'env',
    status: 'placeholder',
    owner: 'client',
    provisional: false,
    secret: false,
    usedIn: ['src/lib/shop/shippingPrices.ts', 'src/app/api/shop/checkout/route.ts', 'src/app/(main)/sklep/zamowienie/page.tsx'],
    question: 'O-10',
    task: 'HA-2.02',
    note: 'InPost Paczkomat (added in HA-2.02, tj 2026-10-16). Preliminary value = InPost courier. See SHIPPING_PRICE_DHL.',
  },
  {
    name: 'FREE_SHIPPING_THRESHOLD',
    source: 'env',
    status: 'placeholder',
    owner: 'client',
    provisional: false,
    secret: false,
    usedIn: ['src/lib/shop/shippingPrices.ts', 'src/app/api/shop/checkout/route.ts', 'src/app/(main)/sklep/zamowienie/page.tsx'],
    question: 'O-10',
    task: 'HA-2.02',
    note: 'Goods subtotal (PLN gross) from which parcel delivery is free; in a split order only the shipped goods count (tj D1 2026-10-17). Personal pickup is always 0 and needs no input.',
  },
  {
    name: 'INPOST_GEOWIDGET_TOKEN',
    source: 'env',
    status: 'placeholder',
    owner: 'tj',
    provisional: false,
    secret: false,
    usedIn: ['src/app/(main)/sklep/zamowienie/page.tsx', 'src/components/shop/InpostLockerPicker.tsx'],
    question: null,
    task: 'HA-2.02',
    note: 'InPost Geowidget PUBLIC token (Manager Paczek → Moje konto → API → Geowidget), bound to the site domain; sent to the browser by design. Unset → the checkout shows a manual Paczkomat code field instead of the map and loads nothing from InPost.',
  },

  // ─── Import filter — priority of new subcategories (O-22, client) ───────────
  {
    name: 'NEW_SUBCATEGORY_DEFAULT_PRIORITY',
    source: 'env',
    status: 'placeholder',
    owner: 'client',
    provisional: false,
    secret: false,
    usedIn: ['xml-integration/assortment-rules.ts'],
    question: 'O-22',
    task: 'HA-2.18',
    note: 'Closed list: P1 | P2 | P3 (case-sensitive); unset = P2. Default priority of every subcategory the correction sheet (2026-09-29) added without a P1/P2/P3 column — tj 2026-10-09: P2 = not imported until the client answers O-22. Only P1 admits those nodes to the import filter; the answer per subcategory is a `priority` edit on the row in assortment-rules.ts `newSubcategories`, this env moves all unanswered rows at once.',
  },

  // ─── Main domain (O-31, client) ─────────────────────────────────────────────
  {
    name: 'SITE_URL',
    source: 'env',
    status: 'placeholder',
    owner: 'client',
    provisional: true,
    secret: false,
    usedIn: ['not yet — HA-2.21'],
    question: 'O-31',
    task: 'HA-2.21',
    note: 'Canonical, og:url, og:image, sitemap, robots. Today two hardcoded constants point at hydraarms.pl (src/app/layout.tsx, src/app/sitemap.ts); the regulamin names hydra-arms.com. O-31 decides which.',
  },
  {
    name: 'SHOP_BASE_URL',
    source: 'env',
    status: 'placeholder',
    owner: 'client',
    provisional: false,
    secret: false,
    usedIn: [
      'src/lib/shop/registerPayment.ts',
      'src/app/api/shop/checkout/route.ts',
      'src/app/api/shop/payments/p24/register/route.ts',
      'src/app/api/shop/payments/p24/mock-pay/route.ts',
      'src/lib/email/templates.ts',
    ],
    question: 'O-31',
    task: 'HA-2.21',
    note: 'Same undecided domain as SITE_URL (O-31), already live: P24 urlReturn/urlStatus and order links in e-mails. Registered on tj decision 2026-10-08 so the launch gate cannot pass with the wrong host here. HA-2.21 may merge it with SITE_URL.',
  },

  // ─── Secrets generated by tj ────────────────────────────────────────────────
  {
    name: 'ORDER_LINK_SECRET',
    source: 'env',
    status: 'placeholder',
    owner: 'tj',
    provisional: false,
    secret: true,
    usedIn: [
      'src/lib/shop/orderLink.ts',
      'src/lib/shop/guestOrderStatus.ts',
      'src/lib/email/orderEmails.ts',
    ],
    question: null,
    task: 'HA-2.19',
    note: 'HMAC key for the signed, expiring guest order-status link. Generated by tj, not requested from the client.',
  },

  // ─── Assets ─────────────────────────────────────────────────────────────────
  {
    name: 'public/payment-marks/p24-marks.png',
    source: 'file',
    status: 'placeholder',
    owner: 'tj',
    provisional: true,
    secret: false,
    usedIn: ['src/components/Footer.tsx'],
    question: null,
    task: 'HA-2.08',
    note: 'Official Przelewy24 payment-method marks for the footer on every page (P24 verification requirement). Download from P24 — do not draw or re-create them. The footer shows a neutral placeholder until the file exists; file name and format (png/svg) may change when the real asset is added.',
  },
];
