/**
 * scripts/rebuild-categories.ts
 *
 * Parses flat Google Shopping taxonomy paths stored in shop_categories
 * and rebuilds them as a proper parent-child tree.
 *
 * Example input:  "Artykuły dla dorosłych > Broń > Noże szturmowe"
 * Result:
 *   id=1  name="Artykuły dla dorosłych"  parent_id=null   (new intermediate)
 *   id=2  name="Broń"                    parent_id=1      (new intermediate)
 *   id=8470362  name="Noże szturmowe"    parent_id=2      (existing leaf, updated)
 *
 * Leaf node IDs are preserved → shop_products.category_id references stay valid.
 * Intermediate nodes get new IDs starting from 1 (safe: existing IDs are in 8.4M range).
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

function parseSegments(name: string): string[] {
  if (name.includes(' > ')) return name.split(' > ').map(s => s.trim()).filter(Boolean)
  if (name.includes('/')) return name.split('/').map(s => s.trim()).filter(Boolean)
  return [name.trim()]
}

async function main() {
  console.log('\nRebuild shop_categories: taxonomy paths → tree\n')

  const { data: cats, error } = await sb.from('shop_categories').select('*')
  if (error) throw error
  if (!cats?.length) { console.log('No categories found.'); return }

  const inventoryId = cats[0].inventory_id
  console.log(`  ${cats.length} flat categories found (inventory_id: ${inventoryId})`)

  // fullPath (e.g. "A > B") → intermediate node ID
  const pathToId = new Map<string, number>()
  let nextId = 1

  const intermediateRows: { id: number; name: string; parent_id: number | null; inventory_id: number }[] = []
  const leafUpdates: { id: number; name: string; parent_id: number | null }[] = []

  for (const cat of cats) {
    const segments = parseSegments(cat.name)

    if (segments.length <= 1) {
      // Single-word name (e.g. "Kategoria") — stays as a flat root
      leafUpdates.push({ id: cat.id, name: segments[0] ?? cat.name, parent_id: null })
      continue
    }

    // Build/reuse intermediate nodes for all segments except the last
    let parentId: number | null = null
    for (let i = 0; i < segments.length - 1; i++) {
      const fullPath = segments.slice(0, i + 1).join(' > ')
      if (!pathToId.has(fullPath)) {
        const id = nextId++
        pathToId.set(fullPath, id)
        intermediateRows.push({ id, name: segments[i], parent_id: parentId, inventory_id: inventoryId })
      }
      parentId = pathToId.get(fullPath)!
    }

    // Leaf: update existing row — short name + correct parent
    leafUpdates.push({
      id: cat.id,
      name: segments[segments.length - 1],
      parent_id: parentId,
    })
  }

  console.log(`  Intermediate nodes to insert: ${intermediateRows.length}`)
  console.log(`  Leaf nodes to update:         ${leafUpdates.length}`)

  // 1. Insert intermediate nodes
  if (intermediateRows.length > 0) {
    const { error: insErr } = await sb
      .from('shop_categories')
      .upsert(intermediateRows, { onConflict: 'id' })
    if (insErr) throw new Error(`Insert intermediates: ${insErr.message}`)
    console.log(`\n  ✓ Inserted ${intermediateRows.length} intermediate nodes`)
  }

  // 2. Update leaf nodes (name + parent_id)
  for (const leaf of leafUpdates) {
    const { error: upErr } = await sb
      .from('shop_categories')
      .update({ name: leaf.name, parent_id: leaf.parent_id })
      .eq('id', leaf.id)
    if (upErr) throw new Error(`Update leaf ${leaf.id}: ${upErr.message}`)
  }
  console.log(`  ✓ Updated ${leafUpdates.length} leaf nodes`)

  // 3. Print result summary
  const { data: result } = await sb
    .from('shop_categories')
    .select('id, name, parent_id')
    .order('id')

  const roots = result?.filter(c => !c.parent_id) ?? []
  const children = result?.filter(c => c.parent_id !== null) ?? []

  console.log(`\n  Result:`)
  console.log(`    Total:    ${result?.length}`)
  console.log(`    Roots:    ${roots.length}`)
  console.log(`    Children: ${children.length}`)
  console.log(`\n  Top-level categories:`)
  roots.forEach(c => console.log(`    [${c.id}] ${c.name}`))

  console.log('\n✓ Done\n')
}

main().catch(err => {
  console.error('\n[fatal]', err.message)
  process.exit(1)
})
