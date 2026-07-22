/**
 * xml-integration/connectors/kolba.ts
 *
 * Parser for Kolba B2B XML feed.
 *
 * Format: Simple flat XML with CDATA sections.
 * Root:   <produkty> / <produkt>
 * URL:    https://b2b.kolba.pl/assets/integrations/instance/megaimport/KOLBAB2B.xml
 *
 * Key observations from the actual feed:
 * - EAN is frequently empty — connector_sku (symbol) is the main identifier
 * - Products are often sold as PACKS ("3 x Wiatrówka...") — cena_brutto_hurt
 *   is the price for the whole pack, cena_brutto_detal is suggested per-unit retail
 * - Weight lives in atrybuty as "Masa [g]", not a dedicated field
 * - "Wymagane zezwolenie?" attribute directly maps to requires_license hint
 * - Images are provided via <zdjecia><zdjecie pozycja="N">url</zdjecie></zdjecia>
 */

import { XMLParser } from 'fast-xml-parser'
import type { Connector, ConnectorConfig, NormalizedProduct } from '../types'

// ── Parser config ──────────────────────────────────────────────────────────────

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  // Kolba wraps values in CDATA, but fast-xml-parser resolves them automatically
  // when we access the value — the __cdata key holds the actual text
  isArray: (tagName) => tagName === 'produkt' || tagName === 'atrybut' || tagName === 'zdjecie',
  allowBooleanAttributes: true,
})

// ── Types for raw Kolba XML ────────────────────────────────────────────────────

interface KolbaAtrybut {
  '@_nazwa': string   // attribute name, e.g. "Wymagane zezwolenie?"
  __cdata?: string    // value (via CDATA)
  '#text'?: string    // fallback if not CDATA
}

interface KolbaProdukt {
  id: { __cdata: string }
  symbol: { __cdata: string }
  symbol_towaru_u_dostawcy: { __cdata: string }
  ean: { __cdata: string }
  nazwa: { __cdata: string }
  dlugi_opis: { __cdata: string }
  na_magazynie: { __cdata: string }
  cena_brutto_detal: { __cdata: string }
  cena_brutto_hurt: { __cdata: string }
  atrybuty: {
    atrybut: KolbaAtrybut[]
  }
  zdjecia?: {
    zdjecie: Array<{ '@_pozycja': string | number; __cdata?: string; '#text'?: string }>
  }
  ilosc_wariantow: { __cdata: string }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function cdataVal(field: { __cdata?: string; '#text'?: string } | string | undefined): string {
  if (!field) return ''
  if (typeof field === 'string') return field.trim()
  return (field.__cdata ?? field['#text'] ?? '').trim()
}

function parsePrice(raw: string): number {
  const n = parseFloat(raw.replace(',', '.'))
  return isNaN(n) ? 0 : n
}

function parseStock(raw: string): number {
  const n = parseInt(raw, 10)
  return isNaN(n) ? 0 : n
}

/**
 * Build a features map from <atrybuty> section.
 * Filters out known compliance fields that get promoted to _hints.
 */
function buildFeatures(atrybuty: KolbaAtrybut[]): Record<string, string> {
  const skip = new Set(['Wymagane zezwolenie?', 'Masa [g]', 'Marka'])
  const result: Record<string, string> = {}
  for (const a of atrybuty) {
    const name = a['@_nazwa']
    const value = cdataVal(a as { __cdata?: string })
    if (!skip.has(name) && value) {
      result[name] = value
    }
  }
  return result
}

function getAtribut(attrs: KolbaAtrybut[], name: string): string {
  const found = attrs.find((a) => a['@_nazwa'] === name)
  return found ? cdataVal(found as { __cdata?: string }) : ''
}

function extractKolbaImages(
  zdjecia: KolbaProdukt['zdjecia'],
): Array<{ url: string; priority: number }> {
  if (!zdjecia) return []
  return (zdjecia.zdjecie ?? [])
    .map((z) => ({
      url: cdataVal(z as { __cdata?: string; '#text'?: string }),
      priority: parseInt(String(z['@_pozycja']), 10) || 99,
    }))
    .filter((img) => img.url.length > 0)
    .sort((a, b) => a.priority - b.priority)
}

// ── Main parser ────────────────────────────────────────────────────────────────

function parseKolba(xml: string): NormalizedProduct[] {
  const raw = xmlParser.parse(xml)

  // Kolba root: raw.produkty.produkt[]
  const rawProducts: KolbaProdukt[] = raw?.produkty?.produkt ?? []

  return rawProducts.map((p) => {
    const attrs: KolbaAtrybut[] = p.atrybuty?.atrybut ?? []

    const id = cdataVal(p.id)
    const symbol = cdataVal(p.symbol)
    const ean = cdataVal(p.ean) || null

    const name = cdataVal(p.nazwa)
    const description = cdataVal(p.dlugi_opis) || null
    const stock = parseStock(cdataVal(p.na_magazynie))

    // Kolba provides wholesale (pack purchase) price and suggested retail
    const priceHurt = parsePrice(cdataVal(p.cena_brutto_hurt))
    const priceDetal = parsePrice(cdataVal(p.cena_brutto_detal))

    // What the customer pays: use detal as the selling price.
    // If detal is 0, use hurt (may need markup — admin sets price_override later).
    const priceGross = priceDetal > 0 ? priceDetal : priceHurt
    // Kolba provides gross prices only; back-calculate net assuming VAT 23%
    const taxRate = 23
    const priceNet = priceGross > 0 ? Math.round((priceGross / 1.23) * 100) / 100 : 0

    // Weight from attributes
    const massRaw = getAtribut(attrs, 'Masa [g]')
    const weightG = massRaw ? parseInt(massRaw.replace(/\s/g, ''), 10) || null : null

    // Brand
    const brand = getAtribut(attrs, 'Marka') || null

    // Category: Kolba doesn't provide structured categories in this feed
    const supplierCategoryName = null
    const supplierCategoryId = null

    // Features (everything except compliance + mass + brand)
    const features = buildFeatures(attrs)

    // Compliance hints
    const zezwolenie = getAtribut(attrs, 'Wymagane zezwolenie?').toLowerCase()
    const requiresLicense = zezwolenie === 'tak'
    // Age restriction: Kolba doesn't have an explicit age field.
    // Detect from energy level — weapons >17J require permit in Poland.
    const energyRaw = getAtribut(attrs, 'Energia kinetyczna naboju [J]')
    const ageRestricted = energyRaw.toLowerCase().includes('powyżej 17') ||
                          energyRaw.toLowerCase().includes('powyżej 24')

    // Variants: Kolba marks variant count but doesn't list them in this export
    const variantCount = parseInt(cdataVal(p.ilosc_wariantow), 10) || 0

    const product: NormalizedProduct = {
      connector: 'kolba',
      connector_product_id: id,
      connector_sku: symbol,
      ean,
      brand,
      name,
      description_html: description,
      short_description: null, // not provided by Kolba
      features,
      price_gross: priceGross,
      price_net: priceNet,
      tax_rate: taxRate,
      price_purchase: priceHurt,  // what we pay Kolba
      price_compare: priceDetal > 0 && priceDetal !== priceGross ? priceDetal : null,
      stock,
      weight_g: weightG,
      images: extractKolbaImages(p.zdjecia),
      supplier_category_id: supplierCategoryId,
      supplier_category_name: supplierCategoryName,
      has_variants: variantCount > 0,
      variants: [],  // detailed variants not in feed
      _hints: {
        requires_license: requiresLicense,
        age_restricted: ageRestricted,
        pickup_only: false,
      },
      source_url: 'https://b2b.kolba.pl/assets/integrations/instance/megaimport/KOLBAB2B.xml',
      raw_connector_category: null,
    }

    return product
  })
}

// ── Export ─────────────────────────────────────────────────────────────────────

export const kolbaConfig: ConnectorConfig = {
  name: 'kolba',
  xml_url: 'https://b2b.kolba.pl/assets/integrations/instance/megaimport/KOLBAB2B.xml',
  auth_type: 'none',
  charset: 'utf-8',
}

export const kolbaConnector: Connector = {
  config: kolbaConfig,
  parse: parseKolba,
}
