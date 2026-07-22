/**
 * xml-integration/connectors/sharg.ts
 *
 * Parser for Sharg B2B XML feed — IOF 3.0 format (IdoSell/IAI platform).
 *
 * Sharg provides THREE feed types, all from the same base URL with type param:
 *
 *   full    — complete product data (names, descriptions, images, prices, stock)
 *             Use for: initial import, weekly full refresh
 *             URL: ...type=full...
 *
 *   light   — prices + stock only (no content, just numbers)
 *             Use for: hourly stock/price sync (fast, small file)
 *             URL: ...type=light...
 *
 *   gateway — manifest file listing URLs for all feed types + incremental changes
 *             Use for: discovering what changed since last sync
 *             Provides: change feed URLs, categories URL, producers URL, stocks URL
 *
 * Key observations from the actual feeds:
 * - EAN is in <size @code_producer> — GTIN-13 format
 * - Products with no variants use size id="uniw" or id="0"
 * - Sized products (clothing etc.) have multiple <size> entries
 * - Stock is per-size per-warehouse: <stock id="1" quantity="24"/>
 * - strikethrough_wholesale_price is the compare/reference price
 * - gateway.xml has incremental change URLs — use these to avoid re-importing 8k products hourly
 * - Feed contains ~11 700 products incl. fitness/beauty — DEFENCE_PATTERNS filters to ~9 000
 * - "*Kategoria tymczasowa" (2 528 items) is excluded — unknown content, admin can review
 */

import { XMLParser } from 'fast-xml-parser'
import type { Connector, ConnectorConfig, NormalizedImage, NormalizedProduct, NormalizedVariant } from '../types'

// ── Parser configs ─────────────────────────────────────────────────────────────

const xmlParserFull = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (tagName) => ['product', 'image', 'size', 'stock'].includes(tagName),
  removeNSPrefix: true,   // strips iaiext: prefix
  allowBooleanAttributes: true,
  parseAttributeValue: true,
})

const xmlParserLight = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (tagName) => ['product', 'size', 'stock'].includes(tagName),
  removeNSPrefix: true,
  allowBooleanAttributes: true,
  parseAttributeValue: true,
})

// ── Types for raw Sharg XML ────────────────────────────────────────────────────

interface ShargImage {
  '@_priority': number
  '@_url': string
  '@_changed': string
  '@_hash': string
  '@_height': number
  '@_width': number
}

interface ShargSize {
  '@_id': string | number
  '@_name'?: string
  '@_panel_name': string
  '@_code': string
  '@_weight'?: number
  '@_weight_net'?: number
  '@_code_producer'?: string  // EAN/GTIN-13
  '@_code_external'?: string  // Sharg's internal reference
  '@_priority'?: number
  price?: { '@_gross': number; '@_net': number }
  srp?: { '@_gross': number; '@_net': number }
  strikethrough_wholesale_price?: { '@_gross': number; '@_net': number }
  stock?: Array<{ '@_id': number; '@_quantity': number }>
}

interface ShargProductFull {
  '@_id': number
  '@_currency'?: string
  '@_code_on_card': string
  '@_vat': number
  '@_type'?: string
  '@_site'?: number
  producer?: { '@_id': number; '@_name': string }
  category?: { '@_id': number | string; '@_name': string }
  category_idosell?: { '@_id': number; '@_path': string }
  description?: {
    name?: Array<{ '@_xml:lang': string; '#text'?: string; __cdata?: string }> | { '@_xml:lang': string; '#text'?: string }
    long_desc?: { '@_xml:lang': string; '#text'?: string; __cdata?: string }
    short_desc?: { '@_xml:lang': string; '#text'?: string }
  }
  images?: {
    large?: { image?: ShargImage[] }
  }
  sizes?: { size?: ShargSize[] }
  // Note: price/srp/strikethrough_wholesale_price live inside <size>, NOT at product level
}

interface ShargProductLight {
  '@_id': number
  '@_vat': number
  price?: { '@_gross': number; '@_net': number }
  srp?: { '@_gross': number; '@_net': number }
  sizes?: { size?: ShargSize[] }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getPolishText(
  field: Array<Record<string, unknown>> | Record<string, unknown> | undefined,
): string {
  if (!field) return ''
  const arr = Array.isArray(field) ? field : [field]
  // After removeNSPrefix: true, xml:lang becomes @_lang (prefix stripped)
  const pol = arr.find((x) => x['@_lang'] === 'pol') ?? arr[0]
  if (!pol) return ''
  return ((pol['#text'] ?? pol['__cdata'] ?? '') as string).trim()
}

function aggregateStock(sizes: ShargSize[]): number {
  let total = 0
  for (const size of sizes) {
    const stocks = Array.isArray(size.stock) ? size.stock : (size.stock ? [size.stock] : [])
    for (const s of stocks) {
      total += s['@_quantity'] ?? 0
    }
  }
  return total
}

function extractImages(rawImages: ShargProductFull['images']): NormalizedImage[] {
  const large = rawImages?.large?.image ?? []
  return large
    .map((img) => ({ url: img['@_url'], priority: img['@_priority'] ?? 99 }))
    .sort((a, b) => a.priority - b.priority)
}

/** True if this size is a "universal" (non-variant) size — no meaningful name */
function isUniversalSize(size: ShargSize): boolean {
  const name = String(size['@_name'] ?? '').toLowerCase()
  return name === 'pozostałe' || name === 'uniw' || name === '' || String(size['@_id']) === '0' || size['@_id'] === 'uniw'
}

function getFirstEan(sizes: ShargSize[]): string | null {
  for (const size of sizes) {
    const ean = size['@_code_producer']
    if (ean && String(ean).length >= 8) return String(ean)
  }
  return null
}

// ── Defence category filter ────────────────────────────────────────────────────
// Sharg's full catalogue has ~11 700 products spanning militaria, fitness, beauty, etc.
// Only products whose category name or category_idosell path matches at least one of these
// lowercase substrings are imported. Extend this list when new defence categories appear.
//
// Verified against live feed (2026-07-22, 118 unique categories):
//   Kept:  militaria, strzelectwo, broń, ASG, paintball, samoobrona, noże, wiatrówki,
//          śruty, CO2, kabury, celowniki, lornetki, noktowizory, latarki, survival,
//          bushcraft, myślistwo, scyzoryki, okulary ochronne, rękawice ochronne,
//          paralizatory, repliki, łucznictwo, OFERTA/NOŻE/OUTDOOR/SAMOOBRONA/BROŃ
//   Excluded: *Kategoria tymczasowa (2528 unknowns), uroda, manicure, odzież casualowa,
//             naczynia kuchenne, zabawki, ogrodnictwo, korkociągi, artykuły na przyjęcia

export const SHARG_DEFENCE_PATTERNS: readonly string[] = [
  // ── Core militaria & shooting ──────────────────────────────────────────────
  'militaria',
  'strzelectwo',
  'broń',          // broń palna, broń biała, broń alarmowa, konserwacja broni…
  'repliki broni',

  // ── Air guns & shooting consumables ───────────────────────────────────────
  'wiatrówk',      // wiatrówka / wiatrówki
  'śrut',          // śrut / śruty
  'kulki',         // kulki bb
  'amunicja',
  'co2',           // CO2 capsules for air guns

  // ── ASG / Paintball ────────────────────────────────────────────────────────
  'asg',
  'airsoft',
  'paintball',

  // ── Self-defence ───────────────────────────────────────────────────────────
  'samoobrona',
  'gazy pieprzowe',
  'paralizator',
  'pałk',          // pałki teleskopowe, tonfy, kubotany

  // ── Knives & blades ────────────────────────────────────────────────────────
  'noże szturmowe',
  'noże i akcesoria',
  'broń biała',    // also caught by 'broń' above
  'noże myśliwskie',
  'topory i maczety',
  'oferta/noże',
  'scyzoryki',
  'multitools',

  // ── Optics ────────────────────────────────────────────────────────────────
  'celownik',      // celowniki optyczne, lunety
  'lornetk',       // lornetka / lornetki
  'noktowizor',

  // ── Carry & holsters ──────────────────────────────────────────────────────
  'kabury',
  'pasy do broni',

  // ── Tactical lighting ─────────────────────────────────────────────────────
  'latarki',

  // ── Hunting & outdoor (defence-adjacent) ──────────────────────────────────
  'myślistwo',
  'survival',
  'bushcraft',
  'łucznictwo',    // archery / crossbows
  'karabińczyki',  // OFERTA/OUTDOOR/KARABIŃCZYKI

  // ── Protective gear ────────────────────────────────────────────────────────
  'okulary ochronne',
  'rękawice ochronne',
  'odzież ochronna myśliwska',
  'ubrania na polowanie i wojskowe',
  'akcesoria ochronne',
  'biobezpieczeństwo',  // NBC / bio protection

  // ── Sharg's own OFERTA structure ──────────────────────────────────────────
  'oferta/strzelectwo',
  'oferta/samoobrona',
  'oferta/outdoor',
  'oferta/broń',
]

/**
 * Returns true if the product's category belongs to the defence domain.
 * Checks both the general category name and the idosell category path.
 */
function isDefenceProduct(p: ShargProductFull): boolean {
  const catName = (p.category?.['@_name'] ?? '').toLowerCase()
  const catPath = (p.category_idosell?.['@_path'] ?? '').toLowerCase()
  const haystack = `${catName} | ${catPath}`
  return SHARG_DEFENCE_PATTERNS.some((pat) => haystack.includes(pat))
}

// ── Full feed parser ───────────────────────────────────────────────────────────

function parseShargFull(xml: string, sourceUrl: string): NormalizedProduct[] {
  const raw = xmlParserFull.parse(xml)

  const rawProducts: ShargProductFull[] =
    raw?.offer?.products?.product ??
    raw?.products?.product ??
    []

  const defenceProducts = rawProducts.filter(isDefenceProduct)
  console.log(`[sharg] Defence filter: ${defenceProducts.length}/${rawProducts.length} products kept`)

  return defenceProducts.map((p) => {
    const sizes: ShargSize[] = p.sizes?.size ?? []
    const isMultiSize = sizes.length > 1 && !sizes.every(isUniversalSize)

    // EAN: from first size's code_producer
    const ean = getFirstEan(sizes)

    // Name: Polish name from description
    const nameField = p.description?.name
    const name = getPolishText(nameField as Parameters<typeof getPolishText>[0]) ||
                 String(p['@_code_on_card'])

    // Descriptions
    const descLong = p.description?.long_desc
    const descShort = p.description?.short_desc
    const descriptionHtml = descLong
      ? getPolishText(descLong as Parameters<typeof getPolishText>[0])
      : null
    const shortDescription = descShort
      ? getPolishText(descShort as Parameters<typeof getPolishText>[0])
      : null

    // Prices live at size level (per SCHEMAS.md):
    //   size/price   = cena zakupu (what we pay the supplier)
    //   size/srp     = sugerowana detaliczna (what the customer pays)
    //   size/strikethrough_wholesale_price = compare/reference price
    const firstSize = sizes[0]
    const priceGross = firstSize?.srp?.['@_gross'] ?? firstSize?.price?.['@_gross'] ?? 0
    const priceNet = firstSize?.srp?.['@_net'] ?? firstSize?.price?.['@_net'] ?? 0
    const pricePurchase = firstSize?.price?.['@_gross'] ?? null
    const taxRate = p['@_vat'] ?? 23
    const priceCompare = firstSize?.strikethrough_wholesale_price?.['@_gross'] ?? null

    // Weight: from first size with a weight
    const firstSizeWeight = sizes.find((s) => (s['@_weight'] ?? 0) > 0)
    const weightG = firstSizeWeight ? (firstSizeWeight['@_weight'] ?? null) : null

    // Stock: aggregate across all sizes
    const stock = aggregateStock(sizes)

    // Images
    const images = extractImages(p.images)

    // Brand
    const brand = p.producer?.['@_name'] ?? null

    // Category
    const catName = p.category?.['@_name'] ?? null
    const catId = p.category?.['@_id'] ? String(p.category['@_id']) : null
    // IdoSell also provides a readable path
    const catPath = p.category_idosell?.['@_path'] ?? catName

    // Variants (if multi-size product)
    const variants: NormalizedVariant[] = isMultiSize
      ? sizes.map((size) => {
          const sizeStocks = Array.isArray(size.stock) ? size.stock : (size.stock ? [size.stock] : [])
          const sizeStock = sizeStocks.reduce((sum, s) => sum + (s['@_quantity'] ?? 0), 0)
          return {
            variant_id: String(size['@_id']),
            variant_name: size['@_name'] ?? String(size['@_id']),
            ean: size['@_code_producer'] ? String(size['@_code_producer']) : null,
            stock: sizeStock,
            weight_g: size['@_weight'] ?? null,
            price_gross: size.srp?.['@_gross'] ?? size.price?.['@_gross'] ?? priceGross,
            price_net: size.srp?.['@_net'] ?? size.price?.['@_net'] ?? priceNet,
          }
        })
      : []

    return {
      connector: 'sharg',
      connector_product_id: String(p['@_id']),
      // Per schema: size/@code_external is the connector_sku; fallback to product code_on_card
      connector_sku: sizes[0]?.['@_code_external'] != null
        ? String(sizes[0]['@_code_external'])
        : p['@_code_on_card'],
      ean,
      brand,
      name,
      description_html: descriptionHtml,
      short_description: shortDescription,
      features: {},  // Sharg puts attributes in a separate parameters feed
      price_gross: priceGross,
      price_net: priceNet,
      tax_rate: taxRate,
      price_purchase: pricePurchase,  // size/price@gross = what we pay the supplier
      price_compare: priceCompare || null,
      stock,
      weight_g: weightG,
      images,
      supplier_category_id: catId,
      supplier_category_name: catPath,
      has_variants: isMultiSize,
      variants,
      _hints: {
        requires_license: false,  // not in Sharg feed — detect from category
        age_restricted: false,    // not in Sharg feed — detect from category path
        pickup_only: false,
      },
      source_url: sourceUrl,
      raw_connector_category: catPath,
    } satisfies NormalizedProduct
  })
}

// ── Light feed parser (prices + stock only) ────────────────────────────────────
// Returns partial objects — only the fields that light feed contains.
// The engine will ONLY update price + stock for already-imported products.

export interface ShargLightUpdate {
  connector_product_id: string
  price_gross: number
  price_net: number
  tax_rate: number
  stock: number
  // per-variant stock updates
  variant_stocks: Array<{ variant_id: string; stock: number }>
}

export function parseShargLight(xml: string): ShargLightUpdate[] {
  const raw = xmlParserLight.parse(xml)
  const rawProducts: ShargProductLight[] =
    raw?.offer?.products?.product ??
    raw?.products?.product ??
    []

  return rawProducts.map((p) => {
    const sizes: ShargSize[] = p.sizes?.size ?? []
    const totalStock = aggregateStock(sizes)

    const variantStocks = sizes.map((size) => {
      const sizeStocks = Array.isArray(size.stock) ? size.stock : (size.stock ? [size.stock] : [])
      return {
        variant_id: String(size['@_id']),
        stock: sizeStocks.reduce((sum, s) => sum + (s['@_quantity'] ?? 0), 0),
      }
    })

    return {
      connector_product_id: String(p['@_id']),
      price_gross: p.price?.['@_gross'] ?? 0,
      price_net: p.price?.['@_net'] ?? 0,
      tax_rate: p['@_vat'] ?? 23,
      stock: totalStock,
      variant_stocks: variantStocks,
    }
  })
}

// ── Gateway manifest parser ────────────────────────────────────────────────────
// The gateway file is not a product feed — it's a manifest listing all available
// feed URLs + incremental change URLs. Use this to find what's changed.

export interface ShargGatewayManifest {
  full_url: string
  light_url: string
  categories_url: string | null
  stocks_url: string | null
  producers_url: string | null
  parameters_url: string | null
  // Incremental change feeds — sorted newest first
  change_urls: Array<{ url: string; hash: string; changed: string }>
}

export function parseShargGateway(xml: string): ShargGatewayManifest {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (tagName) => tagName === 'change',
    removeNSPrefix: true,
  })
  const raw = parser.parse(xml)
  const root = raw?.provider_description ?? {}

  const changes: ShargGatewayManifest['change_urls'] =
    (root?.full?.changes?.change ?? []).map((c: { '@_url': string; '@_hash': string; '@_changed': string }) => ({
      url: c['@_url'],
      hash: c['@_hash'],
      changed: c['@_changed'],
    }))

  return {
    full_url: root?.full?.['@_url'] ?? '',
    light_url: root?.light?.['@_url'] ?? '',
    categories_url: root?.categories?.['@_url'] ?? null,
    stocks_url: root?.stocks?.['@_url'] ?? null,
    producers_url: root?.producers?.['@_url'] ?? null,
    parameters_url: root?.parameters?.['@_url'] ?? null,
    change_urls: changes,
  }
}

// ── Export ─────────────────────────────────────────────────────────────────────

const SHARG_BASE = 'https://hurt.sharg.pl/edi/export-offer.php'
const shargUrl = (token: string | undefined, type: string) =>
  `${SHARG_BASE}?client=${process.env.SHARG_CLIENT ?? ''}&language=pol&token=${token ?? ''}&shop=3&type=${type}&format=xml&iof_3_0`

export const shargConfig: ConnectorConfig = {
  name: 'sharg',
  xml_url: shargUrl(process.env.SHARG_TOKEN_FULL, 'full'),
  auth_type: 'none',  // token is in the URL, provided via env
  charset: 'utf-8',
  feed_type: 'full',
  extra: {
    light_url: shargUrl(process.env.SHARG_TOKEN_LIGHT, 'light'),
    gateway_url: shargUrl(process.env.SHARG_TOKEN_GATEWAY, 'gateway'),
  },
}

export const shargConnector: Connector = {
  config: shargConfig,
  parse: (xml, feedType = 'full') => {
    if (feedType === 'light') {
      // Light feed doesn't return full NormalizedProduct — it's handled separately
      // via parseShargLight(). Return empty array here to prevent misuse.
      throw new Error(
        'Use parseShargLight() directly for light feed — it returns ShargLightUpdate[], not NormalizedProduct[]',
      )
    }
    return parseShargFull(xml, shargConfig.xml_url)
  },
}
