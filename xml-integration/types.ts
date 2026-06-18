/**
 * xml-integration/types.ts
 *
 * The single normalized shape that every connector must output.
 * One NormalizedProduct per product node in the XML.
 * This gets fed into the upsert engine → Supabase.
 */

// ─── Normalized shape all parsers must produce ───────────────────────────────

export interface NormalizedImage {
  url: string
  priority: number  // 1 = main image
}

export interface NormalizedVariant {
  variant_id: string      // supplier's size/variant identifier
  variant_name: string    // human label ("L", "38/34", "6mm", etc.)
  ean: string | null      // GTIN-13 if available
  stock: number
  weight_g: number | null
  price_gross: number
  price_net: number
}

export interface NormalizedProduct {
  // ── Identity ───────────────────────────────────────────────────────────────
  connector: string           // 'kolba' | 'sharg' | 'spechurt' — which source
  connector_product_id: string  // their internal product ID (stable, use for dedup)
  connector_sku: string       // their SKU / code on card
  ean: string | null          // GTIN-13 — best cross-supplier match key
  brand: string | null

  // ── Content ────────────────────────────────────────────────────────────────
  name: string
  description_html: string | null
  short_description: string | null
  features: Record<string, string>  // key = attribute name, value = attribute value
                                     // e.g. { "Kaliber [mm]": "4,5 mm", "Kolor": "czarny" }

  // ── Pricing ────────────────────────────────────────────────────────────────
  price_gross: number         // what the customer pays (our selling price, WITH VAT)
  price_net: number           // without VAT
  tax_rate: number            // VAT %, typically 23
  price_purchase: number | null  // what we pay the supplier (Kolba: cena_brutto_hurt)
  price_compare: number | null   // struck-through "was" price

  // ── Inventory ──────────────────────────────────────────────────────────────
  stock: number               // total available units
  weight_g: number | null     // grams

  // ── Images ─────────────────────────────────────────────────────────────────
  images: NormalizedImage[]   // sorted by priority, empty array if none

  // ── Category ───────────────────────────────────────────────────────────────
  supplier_category_id: string | null    // their category ID
  supplier_category_name: string | null  // their full category path

  // ── Variants (sizes) ───────────────────────────────────────────────────────
  // Most products have no variants. When they do (clothing sizes, etc.),
  // variants hold per-size stock and EAN. The parent product fields
  // hold aggregated values (total stock, first variant EAN, etc.)
  has_variants: boolean
  variants: NormalizedVariant[]

  // ── Compliance hints (auto-detected, MUST be confirmed by admin) ────────────
  // These are suggestions based on attribute values or category names.
  // They are NEVER written directly to product_type / age_min without admin review.
  _hints: {
    requires_license: boolean   // detected from explicit attribute (reliable)
    age_restricted: boolean     // detected from attribute or keyword scan (less reliable)
    pickup_only: boolean        // not typically in XML — will be false
  }

  // ── Source metadata ────────────────────────────────────────────────────────
  source_url: string | null    // URL this product came from
  raw_connector_category: string | null  // raw string, for admin to map to our categories
}

// ─── Connector interface ───────────────────────────────────────────────────────

export interface ConnectorConfig {
  name: string
  xml_url: string
  auth_type: 'none' | 'query_param' | 'basic'
  charset: 'utf-8' | 'iso-8859-2'
  // For Sharg: which feed type to use by default
  feed_type?: 'full' | 'light' | 'gateway'
  // Connector-specific extra config
  extra?: Record<string, unknown>
}

export interface Connector {
  config: ConnectorConfig
  /**
   * Parse raw XML string into normalized products.
   * For Sharg this may be called with feedType to select
   * full vs light parsing behaviour.
   */
  parse(xml: string, feedType?: 'full' | 'light'): NormalizedProduct[]
}

// ─── Import result ─────────────────────────────────────────────────────────────

export interface ImportResult {
  connector: string
  imported_at: string
  total_parsed: number
  created: number         // new products (was_active=false, needs review)
  updated: number         // existing products updated
  skipped: number         // no change detected
  errors: Array<{ connector_product_id: string; error: string }>
}

// ─── Review queue item (what admin sees) ──────────────────────────────────────

export type ReviewReason =
  | 'no_ean'               // EAN missing — may be duplicate of existing product
  | 'no_images'            // no images provided by supplier
  | 'hint_requires_license'  // XML says license required — confirm product_type
  | 'hint_age_restricted'    // XML or category suggests age restriction
  | 'no_category_match'    // supplier category not mapped to our categories yet
  | 'no_price'             // price is 0 or missing

export interface ProductReviewFlag {
  reason: ReviewReason
  detail: string           // human-readable explanation
}
