import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, ShopProduct } from '@/lib/supabase/types'
import { PUBLIC_PRODUCT_COLUMNS } from './shopCache'

/**
 * Products for one Sanity "product picker" block on /sklep (HA-2.36): one small query per
 * block instead of a shared pool. Pure — no server-only / next/cache — so a test can call it
 * with its own client; the cached wrapper is getBlockProducts() in listing.ts.
 *
 * Errors throw (the cached wrapper then stores nothing, same as the listing RPCs).
 */

export type ProductBlockInput = {
  selectionMode?: 'best_sellers' | 'new_arrivals' | 'on_sale' | 'manual'
  productIds?: string[]
  limit?: number
}

const DEFAULT_LIMIT = 4

// on_sale: PostgREST cannot compare two columns, so read the newest products that have any
// price_compare and keep price_compare > price here (decision tj 2026-10-25; a DB-side
// filter is deferred until the client runs promotions).
export const ON_SALE_CANDIDATES = 200

type Client = SupabaseClient<Database>

function activeProducts(sb: Client) {
  return sb.from('shop_products').select(PUBLIC_PRODUCT_COLUMNS).eq('is_active', true)
}

// Same as the pre-HA-2.36 JS filter `images && Object.keys(images).length > 0`
// (images is always a JSON object or NULL).
function activeWithImages(sb: Client) {
  return activeProducts(sb).not('images', 'is', null).filter('images', 'neq', '{}')
}

async function run(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query
  if (error) throw new Error(`product block query failed: ${error.message}`)
  return (data ?? []) as ShopProduct[]
}

function newArrivals(sb: Client, limit: number) {
  return run(activeWithImages(sb).order('id', { ascending: false }).limit(limit))
}

export async function resolveBlockProducts(sb: Client, block: ProductBlockInput): Promise<ShopProduct[]> {
  const limit = block.limit ?? DEFAULT_LIMIT

  switch (block.selectionMode) {
    case 'new_arrivals':
      return newArrivals(sb, limit)

    case 'on_sale': {
      const candidates = await run(
        activeWithImages(sb)
          .not('price_compare', 'is', null)
          .order('id', { ascending: false })
          .limit(ON_SALE_CANDIDATES),
      )
      const onSale = candidates.filter(
        (p) => p.price_compare != null && p.price != null && p.price_compare > p.price,
      )
      return onSale.length ? onSale.slice(0, limit) : newArrivals(sb, limit)
    }

    case 'manual': {
      // Schema contract: limit is ignored in manual mode; no image filter (as before HA-2.36).
      const ids = (block.productIds ?? []).map(Number).filter((n) => Number.isSafeInteger(n) && n > 0)
      if (!ids.length) return []
      const rows = await run(activeProducts(sb).in('id', ids))
      const byId = new Map(rows.map((p) => [p.id, p]))
      // preserve the order the client chose in Studio
      return ids.flatMap((id) => {
        const p = byId.get(id)
        return p ? [p] : []
      })
    }

    case 'best_sellers':
    default: {
      const featured = await run(
        activeWithImages(sb).eq('is_featured', true).gt('stock', 0).order('id', { ascending: false }).limit(limit),
      )
      if (featured.length) return featured
      return run(activeWithImages(sb).gt('stock', 0).order('id', { ascending: false }).limit(limit))
    }
  }
}
