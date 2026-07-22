/**
 * scripts/xml-check.ts
 *
 * Szybka weryfikacja mapowania XML — tylko fetch + parse + print.
 * Zero zapisu do Supabase, zero BL API.
 *
 * Użycie:
 *   npx tsx scripts/xml-check.ts kolba          # pierwsze 5 produktów Kolba
 *   npx tsx scripts/xml-check.ts sharg          # pierwsze 5 produktów Sharg
 *   npx tsx scripts/xml-check.ts kolba 20       # pierwsze 20 produktów
 */

import { kolbaConnector } from '../xml-integration/connectors/kolba'
import { shargConnector } from '../xml-integration/connectors/sharg'
import { spechurtConnector } from '../xml-integration/connectors/spechurt'
import type { NormalizedProduct } from '../xml-integration/types'

const connectors: Record<string, typeof kolbaConnector> = {
  kolba: kolbaConnector,
  sharg: shargConnector,
  spechurt: spechurtConnector,
}

async function fetchXml(url: string): Promise<string> {
  console.log(`\nFetching: ${url.slice(0, 80)}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  console.log(`Received: ${(text.length / 1024).toFixed(0)} KB\n`)
  return text
}

function printProduct(p: NormalizedProduct, index: number) {
  console.log(`─── Produkt #${index + 1} ───────────────────────────────────────`)
  console.log(`  ID:          ${p.connector_product_id}`)
  console.log(`  SKU:         ${p.connector_sku}`)
  console.log(`  EAN:         ${p.ean ?? '❌ brak'}`)
  console.log(`  Nazwa:       ${p.name}`)
  console.log(`  Marka:       ${p.brand ?? '—'}`)
  console.log(`  Cena brutto: ${p.price_gross > 0 ? `${p.price_gross} PLN` : '❌ 0'}`)
  console.log(`  Cena zakupu: ${p.price_purchase ? `${p.price_purchase} PLN` : '—'}`)
  console.log(`  VAT:         ${p.tax_rate}%`)
  console.log(`  Stan:        ${p.stock} szt.`)
  console.log(`  Waga:        ${p.weight_g ? `${p.weight_g}g` : '—'}`)
  console.log(`  Zdjęcia:     ${p.images.length > 0 ? `${p.images.length} szt. → ${p.images[0].url.slice(0, 60)}...` : '❌ brak'}`)
  console.log(`  Kategoria:   ${p.supplier_category_name ?? '—'}`)
  console.log(`  Opis:        ${p.description_html ? `${p.description_html.slice(0, 80).replace(/<[^>]*>/g, '')}...` : '❌ brak'}`)
  console.log(`  Warianty:    ${p.has_variants ? `TAK (${p.variants.length})` : 'nie'}`)

  const featureCount = Object.keys(p.features).length
  if (featureCount > 0) {
    console.log(`  Atrybuty:    ${featureCount} szt.`)
    Object.entries(p.features).slice(0, 3).forEach(([k, v]) => {
      console.log(`               • ${k}: ${v}`)
    })
  }

  // Hinty compliance
  if (p._hints.requires_license) console.log(`  ⚠️  HINT: wymaga zezwolenia`)
  if (p._hints.age_restricted)   console.log(`  ⚠️  HINT: ograniczenie wiekowe`)
  console.log()
}

async function main() {
  const connectorName = process.argv[2]
  const limit = parseInt(process.argv[3] ?? '5', 10)

  if (!connectorName || !connectors[connectorName]) {
    console.error(`Użycie: npx tsx scripts/xml-check.ts <kolba|sharg|spechurt> [limit]`)
    console.error(`Przykład: npx tsx scripts/xml-check.ts sharg 10`)
    process.exit(1)
  }

  const connector = connectors[connectorName]

  const xml = await fetchXml(connector.config.xml_url)
  const products = connector.parse(xml)

  console.log(`✓ Sparsowano ${products.length} produktów łącznie\n`)

  // Podsumowanie
  const withEan    = products.filter(p => p.ean).length
  const withImages = products.filter(p => p.images.length > 0).length
  const withPrice  = products.filter(p => p.price_gross > 0).length
  const withStock  = products.filter(p => p.stock > 0).length
  const licenseHints = products.filter(p => p._hints.requires_license).length
  const ageHints   = products.filter(p => p._hints.age_restricted).length

  console.log(`── Podsumowanie ──────────────────────────────────────────`)
  console.log(`  Z EAN:          ${withEan} / ${products.length} (${Math.round(withEan/products.length*100)}%)`)
  console.log(`  Ze zdjęciami:   ${withImages} / ${products.length} (${Math.round(withImages/products.length*100)}%)`)
  console.log(`  Z ceną > 0:     ${withPrice} / ${products.length}`)
  console.log(`  Na stanie > 0:  ${withStock} / ${products.length}`)
  console.log(`  Hint zezwolenie:${licenseHints} produktów`)
  console.log(`  Hint wiek:      ${ageHints} produktów`)
  console.log()

  // Pierwsze N produktów szczegółowo
  console.log(`── Pierwsze ${limit} produktów ───────────────────────────────────`)
  products.slice(0, limit).forEach((p, i) => printProduct(p, i))
}

main().catch(err => {
  console.error('[błąd]', err.message)
  process.exit(1)
})
