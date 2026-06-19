/**
 * scripts/remap-categories.ts
 *
 * Replaces the messy Google Shopping taxonomy with a clean
 * military/tactical category tree.
 *
 * Strategy:
 * 1. INSERT new root (100-104) and level-2 (200-244) categories
 * 2. UPDATE all leaf nodes: clean name + new parent_id
 * 3. DELETE old intermediate nodes (1-48) and irrelevant empty leaves
 *
 * Product category_id references are preserved — only leaf names/parents change.
 */

import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const INV = 107789

// ── New root categories ───────────────────────────────────────────────────────

const ROOTS = [
  { id: 100, name: 'Broń i strzelanie',     parent_id: null, inventory_id: INV },
  { id: 101, name: 'Optyka',                parent_id: null, inventory_id: INV },
  { id: 102, name: 'Noże i broń biała',     parent_id: null, inventory_id: INV },
  { id: 103, name: 'Samoobrona',            parent_id: null, inventory_id: INV },
  { id: 104, name: 'Odzież i wyposażenie',  parent_id: null, inventory_id: INV },
]

// ── New level-2 categories ────────────────────────────────────────────────────

const LEVEL2 = [
  // Broń i strzelanie
  { id: 200, name: 'Wiatrówki i karabinki',    parent_id: 100, inventory_id: INV },
  { id: 201, name: 'Broń alarmowa i hukowa',   parent_id: 100, inventory_id: INV },
  { id: 202, name: 'Repliki i ASG',            parent_id: 100, inventory_id: INV },
  { id: 203, name: 'Śrut i amunicja',          parent_id: 100, inventory_id: INV },
  { id: 204, name: 'Akcesoria do broni',        parent_id: 100, inventory_id: INV },
  // Optyka
  { id: 210, name: 'Lunety i celowniki',        parent_id: 101, inventory_id: INV },
  { id: 211, name: 'Noktowizja',               parent_id: 101, inventory_id: INV },
  { id: 212, name: 'Lornetki',                 parent_id: 101, inventory_id: INV },
  { id: 213, name: 'Akcesoria optyczne',        parent_id: 101, inventory_id: INV },
  // Noże i broń biała
  { id: 220, name: 'Noże taktyczne',           parent_id: 102, inventory_id: INV },
  { id: 221, name: 'Noże survivalowe',         parent_id: 102, inventory_id: INV },
  { id: 222, name: 'Topory i maczety',         parent_id: 102, inventory_id: INV },
  // Samoobrona
  { id: 230, name: 'Gazy pieprzowe',           parent_id: 103, inventory_id: INV },
  { id: 231, name: 'Pałki i tonfy',            parent_id: 103, inventory_id: INV },
  { id: 232, name: 'Akcesoria do samoobrony',  parent_id: 103, inventory_id: INV },
  // Odzież i wyposażenie
  { id: 240, name: 'Odzież taktyczna',         parent_id: 104, inventory_id: INV },
  { id: 241, name: 'Obuwie taktyczne',         parent_id: 104, inventory_id: INV },
  { id: 242, name: 'Sprzęt ochronny',          parent_id: 104, inventory_id: INV },
  { id: 243, name: 'Konserwacja broni',         parent_id: 104, inventory_id: INV },
  { id: 244, name: 'Kabury i pasy nośne',      parent_id: 104, inventory_id: INV },
]

// ── Leaf node remap: { id, name, parent_id } ─────────────────────────────────

const LEAF_UPDATES = [
  // Broń i strzelanie → Wiatrówki i karabinki
  { id: 8471072, name: 'Wiatrówki i karabinki',      parent_id: 200 },
  { id: 8471104, name: 'Wiatrówki CO2',               parent_id: 200 },
  { id: 8471082, name: 'Strzelby',                    parent_id: 200 },
  // Broń alarmowa
  { id: 8471073, name: 'Rewolwery alarmowe',          parent_id: 201 },
  { id: 8471121, name: 'Rewolwery alarmowe',          parent_id: 201 },
  { id: 8471120, name: 'Amunicja hukowa',             parent_id: 201 },
  // Repliki i ASG
  { id: 8471113, name: 'Repliki broni',               parent_id: 202 },
  { id: 8470375, name: 'Sprzęt ASG',                  parent_id: 202 },
  { id: 8470378, name: 'Akcesoria do ASG',            parent_id: 202 },
  // Śrut i amunicja
  { id: 8471106, name: 'Śrut do wiatrówek',           parent_id: 203 },
  { id: 8471076, name: 'Śrut diabolo',                parent_id: 203 },
  // Akcesoria do broni
  { id: 8471080, name: 'Akcesoria do broni',          parent_id: 204 },
  { id: 8471081, name: 'Pozostałe akcesoria',         parent_id: 204 },

  // Optyka → Lunety i celowniki
  { id: 8470367, name: 'Celowniki optyczne',          parent_id: 210 },
  { id: 8471102, name: 'Lunety i celowniki',          parent_id: 210 },
  // Noktowizja
  { id: 8470376, name: 'Noktowizory',                 parent_id: 211 },
  { id: 8471117, name: 'Noktowizory cyfrowe',         parent_id: 211 },
  // Lornetki
  { id: 8471118, name: 'Lornetki',                    parent_id: 212 },
  // Akcesoria optyczne
  { id: 8471115, name: 'Akcesoria do optyki',         parent_id: 213 },
  { id: 8470373, name: 'Akcesoria optyczne',          parent_id: 213 },

  // Noże → Noże taktyczne
  { id: 8470368, name: 'Noże i akcesoria',            parent_id: 220 },
  { id: 8470363, name: 'Scyzoryki',                   parent_id: 220 },
  // Noże survivalowe
  { id: 8470365, name: 'Noże survivalowe',            parent_id: 221 },
  // Topory
  { id: 8471103, name: 'Topory i maczety',            parent_id: 222 },

  // Samoobrona
  { id: 8471087, name: 'Gazy pieprzowe',              parent_id: 230 },
  { id: 8471079, name: 'Pałki i tonfy',               parent_id: 231 },
  { id: 8471078, name: 'Akcesoria do samoobrony',     parent_id: 232 },

  // Odzież i wyposażenie → Odzież taktyczna
  { id: 8471074, name: 'Koszulki taktyczne',          parent_id: 240 },
  { id: 8471123, name: 'Kominarki i chusty',          parent_id: 240 },
  { id: 8470364, name: 'Spodnie taktyczne',           parent_id: 240 },
  { id: 8470370, name: 'Kamizelki taktyczne',         parent_id: 240 },
  { id: 8470371, name: 'Kurtki taktyczne',            parent_id: 240 },
  { id: 8470382, name: 'Odzież ochronna',             parent_id: 240 },
  // Obuwie
  { id: 8471125, name: 'Buty taktyczne',              parent_id: 241 },
  { id: 8471083, name: 'Skarpety',                    parent_id: 241 },
  // Sprzęt ochronny
  { id: 8470384, name: 'Latarki',                     parent_id: 242 },
  { id: 8470385, name: 'Rękawice ochronne',           parent_id: 242 },
  { id: 8470387, name: 'Okulary ochronne',            parent_id: 242 },
  // Konserwacja broni
  { id: 8471110, name: 'Konserwacja broni',           parent_id: 243 },
  // Kabury i pasy
  { id: 8471075, name: 'Kabury i pasy nośne',         parent_id: 244 },
]

// ── Categories to delete (empty + irrelevant) ─────────────────────────────────

const TO_DELETE = [
  // Old rebuild-script intermediate nodes (IDs 1-48)
  ...Array.from({ length: 48 }, (_, i) => i + 1),
  // Placeholder
  8470360, // "Kategoria"
  // Completely irrelevant (nail care, corkscrews, underwear, etc.)
  8470361, // Akcesoria do paznokci
  8470362, // Noże szturmowe (0 prods, replaced by L2 category 220)
  8470366, // Kabury (0 prods, duplicate of 8471075)
  8470369, // Korkociągi
  8470372, // Spodniobuty
  8470374, // Slipki
  8470377, // Koszule (0 prods, duplicate)
  8470379, // Szorty (0 prods)
  8470380, // T-shirty (0 prods, duplicate of 8471074)
  8470381, // Paintball i ASG (0 prods, duplicate)
  8470383, // Konserwacja (0 prods, duplicate)
  8470386, // Myślistwo i strzelectwo (0 prods, duplicate)
  8470388, // Akcesoria do butów
  8470389, // Camping (0 prods, duplicate)
]

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nRemap shop_categories → clean military taxonomy\n')

  // 1. Insert new roots and level-2 nodes
  const newNodes = [...ROOTS, ...LEVEL2]
  const { error: insErr } = await sb
    .from('shop_categories')
    .upsert(newNodes, { onConflict: 'id' })
  if (insErr) throw new Error(`Insert new nodes: ${insErr.message}`)
  console.log(`✓ Inserted ${newNodes.length} new category nodes`)

  // 2. Update leaf nodes
  let updated = 0
  for (const leaf of LEAF_UPDATES) {
    const { error } = await sb
      .from('shop_categories')
      .update({ name: leaf.name, parent_id: leaf.parent_id })
      .eq('id', leaf.id)
    if (error) throw new Error(`Update leaf ${leaf.id}: ${error.message}`)
    updated++
  }
  console.log(`✓ Updated ${updated} leaf nodes`)

  // 3. Delete irrelevant nodes (in chunks to avoid URL limits)
  const CHUNK = 20
  let deleted = 0
  for (let i = 0; i < TO_DELETE.length; i += CHUNK) {
    const ids = TO_DELETE.slice(i, i + CHUNK)
    const { error } = await sb.from('shop_categories').delete().in('id', ids)
    if (error) throw new Error(`Delete chunk: ${error.message}`)
    deleted += ids.length
  }
  console.log(`✓ Deleted ${deleted} obsolete nodes`)

  // 4. Print final tree
  const { data: cats } = await sb
    .from('shop_categories')
    .select('id, name, parent_id')
    .order('id')

  const { data: prods } = await sb
    .from('shop_products')
    .select('category_id')

  function countProducts(id: number): number {
    const childIds = cats!.filter(c => c.parent_id === id).map(c => c.id)
    const direct = prods!.filter(p => p.category_id === id).length
    return direct + childIds.reduce((s, cid) => s + countProducts(cid), 0)
  }

  const roots = cats!.filter(c => !c.parent_id)
  console.log('\nFinal tree:\n')
  for (const r of roots) {
    console.log(`[${r.id}] ${r.name} (${countProducts(r.id)} prods)`)
    const l2 = cats!.filter(c => c.parent_id === r.id)
    for (const c of l2) {
      const count = countProducts(c.id)
      console.log(`  [${c.id}] ${c.name} (${count})`)
    }
  }

  console.log('\n✓ Done\n')
}

main().catch(err => {
  console.error('\n[fatal]', err.message)
  process.exit(1)
})
