/**
 * xml-integration/engine.ts
 *
 * The import engine.
 *
 * Responsibilities:
 *   1. Fetch XML from connector URL
 *   2. Parse into NormalizedProduct[] via connector.parse()
 *   3. Match against existing Supabase products (by EAN, then by connector_product_id)
 *   4. Upsert: create new (is_active=false, needs review) or update existing
 *      — never overwrite fields listed in sync_locked_fields
 *   5. Compute review flags so admin sees exactly what needs attention
 *   6. Return ImportResult stats
 *
 * For Sharg light feed (price+stock only):
 *   Use runLightSync() instead of runFullImport() — faster, no content overwrite.
 */

import { createClient } from '@supabase/supabase-js'
import type { NormalizedProduct, ImportResult, ProductReviewFlag } from './types'
import { parseShargLight, parseShargGateway, type ShargLightUpdate } from './connectors/sharg'

// ── Supabase client (admin — bypasses RLS) ────────────────────────────────────

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

// ── Review flag computation ────────────────────────────────────────────────────

function computeReviewFlags(p: NormalizedProduct): ProductReviewFlag[] {
  const flags: ProductReviewFlag[] = []

  if (!p.ean) {
    flags.push({ reason: 'no_ean', detail: 'EAN missing — verify this is not a duplicate of an existing product' })
  }
  if (p.images.length === 0) {
    flags.push({ reason: 'no_images', detail: `Connector '${p.connector}' does not provide images for this product` })
  }
  if (p._hints.requires_license) {
    flags.push({ reason: 'hint_requires_license', detail: 'Supplier marked "Wymagane zezwolenie? = tak" — set product_type and requires_license' })
  }
  if (p._hints.age_restricted) {
    flags.push({ reason: 'hint_age_restricted', detail: 'Detected high-energy weapon (>17J) — confirm age_min and product_type' })
  }
  if (!p.supplier_category_name) {
    flags.push({ reason: 'no_category_match', detail: 'No category data from supplier' })
  }
  if (p.price_gross === 0) {
    flags.push({ reason: 'no_price', detail: 'Price is 0 — must be set before publishing' })
  }

  return flags
}

// ── Field mapping: NormalizedProduct → Supabase shop_products row ─────────────
// This is what actually gets written/updated in the DB.

interface ShopProductUpsert {
  // source tracking
  connector: string
  connector_product_id: string
  connector_sku: string | null
  primary_source: string

  // content
  name: string
  description: string | null
  ean: string | null
  sku: string | null

  // pricing
  price: number
  tax_rate: number | null

  // inventory
  stock: number
  weight: number | null

  // features
  features: Record<string, string>

  // images: stored as JSONB map { "1": url, "2": url }
  images: Record<string, string>

  // flags
  is_active: boolean
  synced_at: string

  // review
  review_flags: ProductReviewFlag[]
  completeness_score: number
}

function toSupabaseRow(p: NormalizedProduct): ShopProductUpsert {
  const imageMap: Record<string, string> = {}
  p.images.forEach((img, i) => { imageMap[String(i + 1)] = img.url })

  const reviewFlags = computeReviewFlags(p)

  // Completeness score: % of recommended fields that are filled
  const checks = [
    !!p.ean,
    !!p.name,
    p.price_gross > 0,
    p.stock > 0,
    p.images.length > 0,
    !!p.description_html,
    !!p.brand,
    !!p.supplier_category_name,
    p.weight_g !== null,
  ]
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100)

  return {
    connector: p.connector,
    connector_product_id: p.connector_product_id,
    connector_sku: p.connector_sku || null,
    primary_source: p.connector,
    name: p.name,
    description: p.description_html,
    ean: p.ean,
    sku: p.connector_sku || null,
    price: p.price_gross,
    tax_rate: p.tax_rate,
    stock: p.stock,
    weight: p.weight_g ? p.weight_g / 1000 : null,  // convert g → kg (DB stores kg)
    features: p.features,
    images: imageMap,
    is_active: false,  // always imported as inactive — admin publishes
    synced_at: new Date().toISOString(),
    review_flags: reviewFlags,
    completeness_score: score,
  }
}

// ── Fields the admin can lock (sync will skip these) ──────────────────────────
// These are stored as sync_locked_fields TEXT[] on each product row.
// If a field name is in that array, we never overwrite it.

const ALWAYS_LOCKED = ['product_type', 'source_warehouse', 'age_min', 'requires_license', 'delivery_allowed', 'is_active']

type LockedFields = string[]

function stripLockedFields(
  row: Partial<ShopProductUpsert>,
  lockedFields: LockedFields,
): Partial<ShopProductUpsert> {
  const locked = new Set([...ALWAYS_LOCKED, ...lockedFields])
  const out: Partial<ShopProductUpsert> = {}
  for (const [key, value] of Object.entries(row)) {
    if (!locked.has(key)) {
      (out as Record<string, unknown>)[key] = value
    }
  }
  return out
}

// ── Fetch XML from URL ────────────────────────────────────────────────────────

async function fetchXml(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  return res.text()
}

// ── Full import ────────────────────────────────────────────────────────────────

export async function runFullImport(
  connectorName: string,
  products: NormalizedProduct[],
): Promise<ImportResult> {
  const supabase = getAdminClient()
  const result: ImportResult = {
    connector: connectorName,
    imported_at: new Date().toISOString(),
    total_parsed: products.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  console.log(`[${connectorName}] Starting import of ${products.length} products`)

  // Fetch existing products for this connector to detect new vs update
  const { data: existing } = await supabase
    .from('shop_products')
    .select('id, connector_product_id, connector, sync_locked_fields, ean')
    .eq('connector', connectorName)

  const existingByConnectorId = new Map(
    (existing ?? []).map((r) => [r.connector_product_id, r]),
  )
  // Also index by EAN for cross-connector dedup
  const existingByEan = new Map(
    (existing ?? []).filter((r) => r.ean).map((r) => [r.ean, r]),
  )

  for (const p of products) {
    try {
      const row = toSupabaseRow(p)

      // Try to find existing product: first by connector_product_id, then by EAN
      const existingById = existingByConnectorId.get(p.connector_product_id)
      const existingByEanMatch = p.ean ? existingByEan.get(p.ean) : undefined
      const existingRow = existingById ?? existingByEanMatch

      if (existingRow) {
        // UPDATE — respect locked fields
        const lockedFields: LockedFields = existingRow.sync_locked_fields ?? []
        const updatePayload = stripLockedFields(row, lockedFields)

        const { error } = await supabase
          .from('shop_products')
          .update({ ...updatePayload, updated_at: new Date().toISOString() })
          .eq('id', existingRow.id)

        if (error) throw error
        result.updated++
      } else {
        // CREATE — new product, inactive, needs review
        // Get a stable ID from the XML sequence (BL IDs come from BL; XML IDs from our sequence)
        const { data: nextId, error: seqError } = await supabase.rpc('next_xml_product_id')
        if (seqError) throw seqError

        const { error } = await supabase
          .from('shop_products')
          .insert({
            id: nextId as number,
            inventory_id: null,          // XML products have no BL inventory
            ...row,
            is_active: false,            // admin must publish
            sync_locked_fields: [],      // no locks yet — admin sets
            product_type: 'standard',    // default, admin overrides if needed
            source_warehouse: null,      // must be set by admin
          })

        if (error) throw error
        result.created++
      }
    } catch (err) {
      result.errors.push({
        connector_product_id: p.connector_product_id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  console.log(
    `[${connectorName}] Done: ${result.created} created, ${result.updated} updated, ${result.errors.length} errors`,
  )

  // Write sync stats back to source_connectors table
  await supabase
    .from('source_connectors')
    .upsert({
      name: connectorName,
      last_synced_at: result.imported_at,
      last_sync_status: result.errors.length > 0 ? 'partial' : 'ok',
      last_sync_stats: {
        imported: result.total_parsed,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errored: result.errors.length,
      },
    }, { onConflict: 'name' })

  return result
}

// ── Light sync (Sharg only) — price + stock updates only ──────────────────────

export async function runShargLightSync(lightXml: string): Promise<{ updated: number; errors: number }> {
  const supabase = getAdminClient()
  const updates = parseShargLight(lightXml)
  let updated = 0
  let errors = 0

  console.log(`[sharg:light] Updating prices+stock for ${updates.length} products`)

  // Batch by 50 to avoid DB timeouts
  for (let i = 0; i < updates.length; i += 50) {
    const batch: ShargLightUpdate[] = updates.slice(i, i + 50)
    await Promise.all(
      batch.map(async (u) => {
        const { error } = await supabase
          .from('shop_products')
          .update({
            price: u.price_gross,
            tax_rate: u.tax_rate,
            stock: u.stock,
            synced_at: new Date().toISOString(),
          })
          .eq('connector', 'sharg')
          .eq('connector_product_id', u.connector_product_id)
        if (error) errors++
        else updated++
      }),
    )
  }

  console.log(`[sharg:light] Done: ${updated} updated, ${errors} errors`)
  return { updated, errors }
}

// ── Gateway-based incremental sync ────────────────────────────────────────────
// Use the gateway manifest to find new change URLs since last sync,
// fetch only those change files (much smaller than full), and apply.

export async function runShargIncrementalSync(
  gatewayXml: string,
  lastSyncHash: string | null,
): Promise<{ change_url: string; status: 'applied' | 'skipped' }[]> {
  const manifest = parseShargGateway(gatewayXml)
  const results: { change_url: string; status: 'applied' | 'skipped' }[] = []

  // Find change URLs that are newer than last sync
  const toApply = lastSyncHash
    ? manifest.change_urls.filter((c) => c.hash !== lastSyncHash)
    : manifest.change_urls.slice(0, 1)  // if no lastSyncHash, just get the most recent

  for (const change of toApply) {
    try {
      const changeXml = await fetchXml(change.url)
      // Change feeds are in full IOF format but contain only changed products
      const { shargConnector } = await import('./connectors/sharg')
      const products = shargConnector.parse(changeXml, 'full')
      await runFullImport('sharg', products)
      results.push({ change_url: change.url, status: 'applied' })
    } catch {
      results.push({ change_url: change.url, status: 'skipped' })
    }
  }

  return results
}
