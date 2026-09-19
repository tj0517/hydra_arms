import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { createAdminClient } from '@/lib/supabase/admin'
import { getReservedQuantities } from './reservedStock'
import type { ShopProduct, ShopCategory } from '@/lib/supabase/types'

export const SHOP_CACHE_TAG = 'shop-products'

/**
 * Columns safe to expose publicly. Deliberately excludes supplier/margin data
 * (price_purchase, connector*, sync_locked_fields) and admin-only fields
 * (notes_internal, review_flags, completeness_score, inventory_id).
 */
export const PUBLIC_PRODUCT_COLUMNS = [
  'id',
  'sku',
  'ean',
  'name',
  'description',
  'short_description',
  'features',
  'price',
  'price_compare',
  'tax_rate',
  'stock',
  'weight',
  'dimensions',
  'category_id',
  'images',
  'product_type',
  'source_warehouse',
  'is_active',
  'age_min',
  'requires_license',
  'license_category',
  'delivery_allowed',
  'slug',
  'is_featured',
  'badge',
  'availability_status',
  'shipping_class',
  'meta_title',
  'meta_description',
  'updated_at',
].join(', ')

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
        .select(PUBLIC_PRODUCT_COLUMNS)
        .eq('is_active', true)
        .order('name', { ascending: true }),
      sb
        .from('shop_categories')
        .select('*')
        .order('name', { ascending: true })
        .limit(500),
    ])

    const products = (productsResult.data ?? []) as unknown as ShopProduct[]

    let reserved = new Map<number, number>()
    try {
      reserved = await getReservedQuantities(
        createAdminClient(),
        products.map(p => p.id),
      )
    } catch { /* service role key missing in dev — fall back to raw stock */ }

    return {
      products: products.map(p => ({
        ...p,
        stock: Math.max(0, p.stock - (reserved.get(p.id) ?? 0)),
      })),
      categories: (categoriesResult.data ?? []) as ShopCategory[],
    }
  },
  [SHOP_CACHE_TAG],
  { revalidate: 300, tags: [SHOP_CACHE_TAG] },
)
