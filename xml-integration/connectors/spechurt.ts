/**
 * xml-integration/connectors/spechurt.ts
 *
 * Parser for Spechurt XML feed (HEAVY format).
 *
 * Access: feed requires IP whitelisting by Spechurt.
 *         Production server 51.83.134.183 must be whitelisted.
 *         The download key is read from SPECHURT_KEY (.env).
 *         Refreshed every ~3 hours by the supplier.
 *
 * Format: <produkty generated="..."> / <produkt>
 * Schema verified against real HEAVY sample (SCHEMAS.md).
 *
 * Key observations:
 * - Most text fields use CDATA; numeric/id fields are plain text
 * - EAN uses leading zeros (022886...) — must be kept as string
 * - waga is in kg → multiply by 1000 for weight_g
 * - vat is a decimal fraction (0.23) → multiply by 100 for tax_rate
 * - Variants are fully listed with per-variant stock; stan_magazynowy = total
 * - cena_zewnetrzna_hurt = purchase price (brutto), cena_zewnetrzna = retail (brutto)
 * - kzs field is deprecated — not mapped
 */

import { XMLParser } from 'fast-xml-parser'
import type { Connector, ConnectorConfig, NormalizedImage, NormalizedProduct, NormalizedVariant } from '../types'

// ── Parser config ──────────────────────────────────────────────────────────────

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  // parseTagValue: false ensures EANs with leading zeros (e.g. 022886426026) stay as strings
  parseTagValue: false,
  isArray: (tagName) => tagName === 'produkt' || tagName === 'zdjecie' || tagName === 'wariant',
  allowBooleanAttributes: true,
})

// ── Types for raw Spechurt XML ─────────────────────────────────────────────────

interface SpechurtZdjecie {
  '@_pozycja': string | number
  __cdata?: string
  '#text'?: string
}

interface SpechurtWariant {
  wariant_id?: string
  wariant_ean?: string
  wariant_nazwa?: string    // attribute group name, e.g. "Rozmiar"
  wariant_wartosc?: string  // attribute value, e.g. "L"
  wariant_stan_magazynowy?: string
}

interface SpechurtProdukt {
  id?: string
  sku?: string
  ean?: string
  producent?: { __cdata?: string } | string
  nazwa?: { __cdata?: string } | string
  dlugi_opis?: { __cdata?: string } | string
  kategoria?: string
  waga?: string
  zdjecia?: {
    zdjecie: SpechurtZdjecie[]
  }
  warianty?: {
    wariant: SpechurtWariant | SpechurtWariant[]
  }
  stan_magazynowy?: string
  cena_zewnetrzna?: string
  cena_zewnetrzna_hurt?: string
  vat?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Extract text from either a plain string or a CDATA-wrapped object. */
function val(field: { __cdata?: string; '#text'?: string } | string | undefined): string {
  if (field === undefined || field === null) return ''
  if (typeof field === 'string') return field.trim()
  return (field.__cdata ?? field['#text'] ?? '').trim()
}

function parsePrice(raw: string | undefined): number {
  if (!raw) return 0
  const n = parseFloat(raw.replace(',', '.'))
  return isNaN(n) ? 0 : n
}

function parseStock(raw: string | undefined): number {
  if (!raw) return 0
  const n = parseInt(raw, 10)
  return isNaN(n) ? 0 : n
}

function extractImages(zdjecia: SpechurtProdukt['zdjecia']): NormalizedImage[] {
  if (!zdjecia) return []
  return (zdjecia.zdjecie ?? [])
    .map((z) => ({
      url: val(z),
      priority: parseInt(String(z['@_pozycja']), 10) || 99,
    }))
    .filter((img) => img.url.length > 0)
    .sort((a, b) => a.priority - b.priority)
}

// ── Main parser ────────────────────────────────────────────────────────────────

function parseSpechurt(xml: string): NormalizedProduct[] {
  const raw = xmlParser.parse(xml)

  // Root: raw.produkty.produkt[]
  const rawProducts: SpechurtProdukt[] = raw?.produkty?.produkt ?? []

  return rawProducts.map((p) => {
    const idStr = String(p.id ?? p.sku ?? '')
    const skuStr = String(p.sku ?? p.id ?? '')

    // EAN: keep as string to preserve leading zeros; null if empty
    const eanRaw = String(p.ean ?? '').trim()
    const ean = eanRaw.length > 0 ? eanRaw : null

    const name = val(p.nazwa) || skuStr
    const descriptionHtml = val(p.dlugi_opis) || null
    const brand = val(p.producent) || null

    // Category: path format "A/B/C"
    const kategoria = p.kategoria?.trim() ?? null

    // Weight: waga is in kg → convert to grams
    const wagaRaw = parseFloat(p.waga ?? '')
    const weightG = isNaN(wagaRaw) ? null : Math.round(wagaRaw * 1000)

    // Pricing (all brutto)
    const priceHurt = parsePrice(p.cena_zewnetrzna_hurt)   // what we pay supplier
    const priceDetal = parsePrice(p.cena_zewnetrzna)       // suggested retail
    const priceGross = priceDetal
    // VAT: stored as 0.23 → convert to 23
    const vatRaw = parseFloat(p.vat ?? '')
    const taxRate = isNaN(vatRaw) ? 23 : Math.round(vatRaw * 100)
    const priceNet = priceGross > 0 && taxRate > 0
      ? Math.round((priceGross / (1 + taxRate / 100)) * 100) / 100
      : 0

    // Stock
    const stock = parseStock(p.stan_magazynowy)

    // Images
    const images = extractImages(p.zdjecia)

    // Variants
    const rawVariants = p.warianty?.wariant
    const variantList: SpechurtWariant[] = rawVariants
      ? (Array.isArray(rawVariants) ? rawVariants : [rawVariants])
      : []

    const variants: NormalizedVariant[] = variantList.map((v) => ({
      variant_id: String(v.wariant_id ?? ''),
      variant_name: [v.wariant_nazwa, v.wariant_wartosc].filter(Boolean).join(': ') || String(v.wariant_id ?? ''),
      ean: v.wariant_ean?.trim() || null,
      stock: parseStock(v.wariant_stan_magazynowy),
      weight_g: weightG,  // per-variant weight not in feed; inherit product weight
      price_gross: priceGross,
      price_net: priceNet,
    }))

    const hasVariants = variants.length > 0

    return {
      connector: 'spechurt',
      connector_product_id: idStr,
      connector_sku: skuStr,
      ean,
      brand,
      name,
      description_html: descriptionHtml,
      short_description: null,
      features: {},
      price_gross: priceGross,
      price_net: priceNet,
      tax_rate: taxRate,
      price_purchase: priceHurt > 0 ? priceHurt : null,
      price_compare: null,
      stock,
      weight_g: weightG,
      images,
      supplier_category_id: null,
      supplier_category_name: kategoria,
      has_variants: hasVariants,
      variants,
      _hints: {
        requires_license: false,  // not in Spechurt feed — detect from category if needed
        age_restricted: false,
        pickup_only: false,
      },
      source_url: `https://b2b.spechurt.pl/xml_heavy_export.php?key=${process.env.SPECHURT_KEY ?? ''}`,
      raw_connector_category: kategoria,
    } satisfies NormalizedProduct
  })
}

// ── Export ─────────────────────────────────────────────────────────────────────

export const spechurtConfig: ConnectorConfig = {
  name: 'spechurt',
  xml_url: `https://b2b.spechurt.pl/xml_heavy_export.php?key=${process.env.SPECHURT_KEY ?? ''}`,
  auth_type: 'query_param',  // key= is in the URL
  charset: 'utf-8',
}

export const spechurtConnector: Connector = {
  config: spechurtConfig,
  parse: parseSpechurt,
}
