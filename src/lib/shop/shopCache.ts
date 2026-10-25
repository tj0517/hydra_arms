/**
 * Shared shop constants (HA-2.36, moved out of the removed fetchProducts.ts).
 * No server-only / next/cache imports, so tests and scripts can import it too.
 */

/** Tag on every cached shop query; revalidated after a BaseLinker sync and after payment. */
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
  'brand',
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
