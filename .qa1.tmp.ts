import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: cats } = await sb.from('shop_categories').select('id, name, parent_id')
  const parents = (cats ?? []).filter(c => !c.parent_id)

  const activated: number[] = []
  for (const parent of parents) {
    if (activated.length >= 12) break
    const childIds = (cats ?? []).filter(c => c.parent_id === parent.id).map(c => c.id)
    const { data: prods } = await sb.from('shop_products').select('id').eq('category_id', parent.id).limit(1)
    const { data: childProds } = childIds.length
      ? await sb.from('shop_products').select('id').in('category_id', childIds).limit(1)
      : { data: [] }
    const ids = [...(prods ?? []), ...(childProds ?? [])].map(p => p.id)
    if (ids.length) {
      await sb.from('shop_products').update({ is_active: true }).in('id', ids)
      activated.push(...ids)
    }
  }
  console.log('Activated:', activated.length, 'products across', activated.length, 'categories')
}
main().catch(e => { console.error('FAILED:', e.message ?? e); process.exit(1) })
