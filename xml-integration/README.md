# XML Integration — Hydra Arms

Import pipeline for supplier XML product feeds → Supabase → shop frontend.

---

## Folder structure

```
xml-integration/
  types.ts              Shared TypeScript interfaces (NormalizedProduct, Connector, etc.)
  engine.ts             Core import logic: fetch → parse → upsert → review flags
  connectors/
    kolba.ts            Kolba B2B parser
    sharg.ts            Sharg IOF 3.0 parser (full + light + gateway)
    spechurt.ts         Spechurt stub (BLOCKED — IP whitelist needed)
    index.ts            Connector registry
  samples/              Raw XML samples saved during development (gitignored)
  README.md             This file
```

---

## Running imports

```bash
# All active connectors (skips spechurt until IP whitelisted)
npx tsx scripts/xml-import.ts

# Single connector
npx tsx scripts/xml-import.ts kolba
npx tsx scripts/xml-import.ts sharg

# Sharg fast price+stock sync (use hourly — small file)
npx tsx scripts/xml-import.ts sharg:light

# Sharg incremental (only changed products since last sync)
npx tsx scripts/xml-import.ts sharg:incremental
```

---

## Connector status

| Connector | URL type | Products | Status | Notes |
|---|---|---|---|---|
| **Kolba** | Simple XML | ~thousands | ✅ Ready | No images in feed. Many products are bundles ("3 x ..."). |
| **Sharg** | IOF 3.0 | 8,381 | ✅ Ready | Three feed types. Has images, variants (sizes), change feeds. |
| **Spechurt** | Unknown | ? | ⛔ Blocked | IP 83.25.13.208 not whitelisted. Contact Spechurt. |

---

## What gets auto-mapped vs what admin must set

### Auto-mapped from XML (sync overwrites these unless locked)
| Field | Kolba | Sharg |
|---|---|---|
| `name` | `nazwa` | `description/name[lang=pol]` |
| `description` | `dlugi_opis` | `description/long_desc[lang=pol]` |
| `short_description` | — | `description/short_desc[lang=pol]` |
| `ean` | `ean` (often empty) | `sizes/size/@code_producer` (GTIN-13) |
| `connector_sku` | `symbol` | `@code_on_card` |
| `price_gross` | `cena_brutto_detal` (or hurt if detal=0) | `price/@gross` |
| `price_net` | calculated from gross | `price/@net` |
| `price_purchase` | `cena_brutto_hurt` | — (not in Sharg feed) |
| `price_compare` | when detal ≠ gross | `strikethrough_wholesale_price/@gross` |
| `tax_rate` | assumed 23% | `@vat` |
| `stock` | `na_magazynie` | sum of `sizes/size/stock/@quantity` |
| `weight` | `atrybuty[Masa [g]]` (grams) | `sizes/size/@weight` (grams, converted to kg) |
| `features` | all `atrybuty` except compliance fields | separate parameters feed |
| `images` | ❌ not in feed | `images/large/image` sorted by `@priority` |
| `brand` | `atrybuty[Marka]` | `producer/@name` |

### Auto-detected compliance hints (admin must CONFIRM before they take effect)
| Hint | Source | What admin does |
|---|---|---|
| `_hints.requires_license` | Kolba: `atrybuty[Wymagane zezwolenie?] = "tak"` | Set `requires_license = true`, choose `license_category` |
| `_hints.age_restricted` | Kolba: energy > 17J detected | Set `product_type = age_restricted`, set `age_min = 18` |

### Must be set manually by admin (never comes from XML)
| Field | Meaning |
|---|---|
| `source_warehouse` | Which physical warehouse: `H1`, `H2`, `own` |
| `product_type` | `standard`, `age_restricted`, `pickup_only` |
| `age_min` | `0`, `18`, or `21` |
| `requires_license` | Confirm after hint |
| `license_category` | `B`, `PAE`, etc. |
| `delivery_allowed` | Can this be shipped (false = pickup only) |
| `is_active` | All products imported as inactive — admin publishes |
| `is_featured` | For homepage highlights |
| `badge` | `NOWOŚĆ`, `BESTSELLER`, `WYPRZEDAŻ` |
| `meta_title` / `meta_description` | SEO overrides |

---

## Sync lock mechanism

Each product has a `sync_locked_fields TEXT[]` column. Any field name in that array is skipped
by the sync engine — the value you set in the admin stays forever, even after re-sync.

`ALWAYS_LOCKED` (hardcoded, cannot be unlocked):
- `product_type`, `source_warehouse`, `age_min`, `requires_license`, `delivery_allowed`, `is_active`

Admin-lockable (set via admin UI per product):
- `price_gross` (e.g. if you want a custom price different from supplier)
- `name`, `description`, `images` — if you want to override supplier content

---

## Review queue

All imported products start with `is_active = false` and a `completeness_score` (0–100).
A `review_flags` array explains exactly what's missing or needs confirmation.

Flag types:
- `no_ean` — can't auto-match against other suppliers; check for duplicates manually
- `no_images` — Kolba doesn't provide images; source separately
- `hint_requires_license` — confirm and set `requires_license`
- `hint_age_restricted` — confirm and set `product_type + age_min`
- `no_category_match` — supplier category not mapped to our category tree yet
- `no_price` — price is 0; must be set before publishing

---

## Adding a new connector (Spechurt, or future suppliers)

1. Download a sample of their XML and save it to `samples/`
2. Create `connectors/your_supplier.ts` following the same pattern as `kolba.ts`
3. Export `yourConnector` and `yourConfig`
4. Add to `connectors/index.ts`
5. Add to `source_connectors` table (or it'll be auto-inserted on first sync)

The engine handles the rest — matching, deduplication, review flags, locking.

---

## Sharg-specific: three feed types

| Feed | When to use | Size | Contains |
|---|---|---|---|
| `full` | Initial import, weekly refresh | ~large | Everything |
| `light` | Hourly stock+price sync | Small | Prices + stock only |
| `gateway` | Before each incremental sync | Tiny | Manifest with change URLs |
| `changes` | Between full syncs | Varies | Only changed products since last snapshot |

**Recommended sync schedule:**
- `sharg:light` every hour via cron
- `sharg:incremental` every 4 hours
- `sharg` (full) once per week or on demand

---

## Spechurt unblocking

Error received: `[ ERR105 ] - Błędny klucz API lub adres IP`
Our IP: `83.25.13.208`

Steps:
1. Email Spechurt support asking them to whitelist this IP
2. Once whitelisted, download sample and implement `connectors/spechurt.ts`
3. Remove the `throw` in the connector's `parse()` method
