/**
 * scripts/xml-export-bl.ts
 *
 * Converts supplier XML feed → CSV file ready for manual BaseLinker import.
 * Column mapping is done in BL UI during import (flexible CSV mode).
 *
 * Usage:
 *   npx tsx scripts/xml-export-bl.ts kolba           # Kolba → exports/kolba.csv
 *   npx tsx scripts/xml-export-bl.ts sharg           # Sharg → exports/sharg.csv
 *   npx tsx scripts/xml-export-bl.ts kolba 500       # First 500 products only
 *
 * Then in BL: Produkty → Import/Export → Import z pliku CSV/XML
 *   Separator: średnik (;)
 *   Kodowanie: UTF-8
 *   Map columns manually in the BL wizard
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { kolbaConnector } from '../xml-integration/connectors/kolba'
import { shargConnector } from '../xml-integration/connectors/sharg'
import type { NormalizedProduct } from '../xml-integration/types'

const connectors: Record<string, typeof kolbaConnector> = {
  kolba: kolbaConnector,
  sharg: shargConnector,
}

const SEP = ';'

async function fetchXml(url: string): Promise<string> {
  console.log(`\nFetching: ${url.slice(0, 80)}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  console.log(`Received: ${(text.length / 1024).toFixed(0)} KB\n`)
  return text
}

function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
    .replace(/\r?\n/g, ' ')      // flatten newlines
    .replace(/"/g, '""')          // escape quotes
  // Wrap in quotes if contains separator, quote, or newline
  return str.includes(SEP) || str.includes('"') ? `"${str}"` : str
}

function toRow(p: NormalizedProduct): string {
  const imageUrls = p.images.map((i) => i.url).join('|')
  const cols = [
    esc(p.connector_sku),           // SKU
    esc(p.ean),                     // EAN
    esc(p.name),                    // Nazwa
    esc(p.brand),                   // Producent/Marka
    esc(p.supplier_category_name),  // Kategoria dostawcy
    esc(p.price_gross),             // Cena brutto PLN
    esc(p.price_net),               // Cena netto PLN
    esc(p.tax_rate),                // VAT %
    esc(p.price_compare),           // Cena poprzednia (przekreślona)
    esc(p.price_purchase),          // Cena zakupu
    esc(p.stock),                   // Stan magazynowy
    esc(p.weight_g ? p.weight_g / 1000 : null),  // Waga kg
    esc(imageUrls),                 // Zdjęcia (| jako separator)
    esc(p.short_description),       // Krótki opis
    esc(p.description_html),        // Opis HTML
    esc(p.connector_product_id),    // ID u dostawcy
    esc(p.connector),               // Źródło (kolba/sharg)
  ]
  return cols.join(SEP)
}

const HEADER = [
  'SKU',
  'EAN',
  'Nazwa',
  'Marka',
  'Kategoria',
  'Cena_brutto_PLN',
  'Cena_netto_PLN',
  'VAT_procent',
  'Cena_poprzednia',
  'Cena_zakupu',
  'Stan',
  'Waga_kg',
  'Zdjecia_URL',
  'Krotki_opis',
  'Opis_HTML',
  'ID_dostawcy',
  'Zrodlo',
].join(SEP)

async function main() {
  const connectorName = process.argv[2]
  const limit = process.argv[3] ? parseInt(process.argv[3], 10) : undefined

  if (!connectorName || !connectors[connectorName]) {
    console.error('Użycie: npx tsx scripts/xml-export-bl.ts <kolba|sharg> [limit]')
    process.exit(1)
  }

  const connector = connectors[connectorName]
  const xml = await fetchXml(connector.config.xml_url)
  let products = connector.parse(xml)

  console.log(`✓ Sparsowano ${products.length} produktów`)

  if (limit) {
    products = products.slice(0, limit)
    console.log(`  → Eksport tylko pierwszych ${limit}\n`)
  }

  // Filter: skip products with price = 0 (saves importing junk)
  const withPrice = products.filter((p) => p.price_gross > 0)
  const skipped = products.length - withPrice.length
  if (skipped > 0) console.log(`  → Pominięto ${skipped} produktów z ceną = 0`)

  const rows = withPrice.map(toRow)

  mkdirSync(join(process.cwd(), 'exports'), { recursive: true })

  // BL limit: 2 MB per file → split into chunks
  const CHUNK_ROWS = 500  // ~500 rows ≈ safe chunk size
  const chunks = Math.ceil(rows.length / CHUNK_ROWS)

  if (chunks === 1) {
    const outPath = join(process.cwd(), 'exports', `${connectorName}.csv`)
    writeFileSync(outPath, '\uFEFF' + [HEADER, ...rows].join('\n'), 'utf-8')
    console.log(`\n✓ Zapisano ${withPrice.length} produktów → ${outPath}`)
  } else {
    for (let i = 0; i < chunks; i++) {
      const chunk = rows.slice(i * CHUNK_ROWS, (i + 1) * CHUNK_ROWS)
      const part = String(i + 1).padStart(2, '0')
      const outPath = join(process.cwd(), 'exports', `${connectorName}-${part}.csv`)
      writeFileSync(outPath, '\uFEFF' + [HEADER, ...chunk].join('\n'), 'utf-8')
      console.log(`  → exports/${connectorName}-${part}.csv (${chunk.length} produktów)`)
    }
    console.log(`\n✓ Podzielono na ${chunks} plików po ~${CHUNK_ROWS} produktów`)
  }

  console.log(`\nImport w BL:`)
  console.log(`  Produkty → Import/Export → Import z pliku CSV/XML`)
  console.log(`  Separator: średnik (;)`)
  console.log(`  Kodowanie: UTF-8`)
  console.log(`  Kolumny mapujesz ręcznie w kreatorze BL`)
  if (chunks > 1) console.log(`  Importuj kolejno wszystkie pliki ${connectorName}-01.csv, ${connectorName}-02.csv, ...`)
}

main().catch((err) => {
  console.error('[błąd]', err.message)
  process.exit(1)
})
