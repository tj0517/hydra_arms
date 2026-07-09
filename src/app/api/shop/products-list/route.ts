import { NextResponse } from 'next/server'
import { fetchShopData } from '@/lib/shop/fetchProducts'

export interface ProductListItem {
  id: number
  name: string
  category: string
  price: number | null
  inStock: boolean
}

/**
 * Lightweight product list for the Sanity Studio product picker.
 * Uses the same 5-min cache as the shop page — no extra DB load.
 */
export async function GET() {
  const { products, categories } = await fetchShopData()

  const catMap = new Map(categories.map((c) => [c.id, c.name]))

  const list: ProductListItem[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category_id != null ? (catMap.get(p.category_id) ?? '') : '',
    price: p.price,
    inStock: p.stock > 0,
  }))

  return NextResponse.json(list, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
