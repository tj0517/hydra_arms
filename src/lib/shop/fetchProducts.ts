import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import type { ShopProduct, ShopCategory } from '@/lib/supabase/types'

export const SHOP_CACHE_TAG = 'shop-products'

/**
 * Cached product + category fetch for use in server components.
 *
 * TTL: 5 minutes. The sync route calls revalidateTag(SHOP_CACHE_TAG) after
 * each BaseLinker sync, so in practice the cache is fresh within seconds
 * of a sync completing.
 *
 * The checkout API must NOT use this — it bypasses the cache and reads
 * live stock via the admin client to prevent overselling.
 */
export const fetchShopData = unstable_cache(
  async (): Promise<{ products: ShopProduct[]; categories: ShopCategory[] }> => {
    const sb = createPublicClient()
    if (!sb) return { products: [], categories: [] }

    const [productsResult, categoriesResult] = await Promise.all([
      sb
        .from('shop_products')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true }),
      sb
        .from('shop_categories')
        .select('*')
        .order('name', { ascending: true })
        .limit(500),
    ])

    return {
      products: (productsResult.data ?? []) as ShopProduct[],
      categories: (categoriesResult.data ?? []) as ShopCategory[],
    }
  },
  [SHOP_CACHE_TAG],
  { revalidate: 300, tags: [SHOP_CACHE_TAG] },
)
