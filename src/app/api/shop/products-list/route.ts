import { NextResponse, type NextRequest } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'

export interface ProductListItem {
  id: number
  name: string
  category: string
  price: number | null
  inStock: boolean
}

const SEARCH_LIMIT = 50
const IDS_MAX = 100
const Q_MIN = 2
const Q_MAX = 64

// Characters that break or extend a PostgREST or() filter, or act as LIKE wildcards.
const FILTER_UNSAFE = /[,()*%\\"]/g

// Subset of PUBLIC_PRODUCT_COLUMNS plus the category name via the category_id FK.
const LIST_COLUMNS = 'id, name, price, stock, shop_categories(name)'

type Row = {
  id: number
  name: string
  price: number | null
  stock: number
  shop_categories: { name: string } | null
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

function toItem(p: Row): ProductListItem {
  return {
    id: p.id,
    name: p.name,
    category: p.shop_categories?.name ?? '',
    price: p.price,
    inStock: p.stock > 0,
  }
}

/**
 * Product lookup for the Sanity Studio product picker (HA-2.36) — never the whole catalogue.
 *   ?q=fragment  name or sku contains the fragment (case-insensitive), max 50, min 2 chars
 *   ?ids=1,2,3   those products in the given order (selected items on mount), max 100
 * Anything else → 400. Anon client, so RLS limits both to active products. Stock is raw
 * (no reservation netting) — the picker only needs an in/out hint.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const idsParam = params.get('ids')
  const qParam = params.get('q')

  let ids: number[] | null = null
  let q: string | null = null

  if (idsParam != null) {
    const parts = idsParam.split(',')
    if (parts.length > IDS_MAX) return badRequest(`at most ${IDS_MAX} ids`)
    if (!parts.every((s) => /^\d+$/.test(s))) return badRequest('ids must be positive integers')
    ids = parts.map(Number)
    if (!ids.every((n) => n > 0 && Number.isSafeInteger(n))) return badRequest('ids must be positive integers')
  } else if (qParam != null) {
    q = qParam.replace(FILTER_UNSAFE, ' ').trim().slice(0, Q_MAX)
    if (q.length < Q_MIN) return badRequest(`q must be at least ${Q_MIN} characters`)
  } else {
    return badRequest('q or ids is required')
  }

  const sb = createPublicClient()
  if (!sb) return NextResponse.json({ error: 'Shop not configured' }, { status: 503 })

  let query = sb.from('shop_products').select(LIST_COLUMNS).eq('is_active', true)
  if (ids) {
    query = query.in('id', ids)
  } else {
    query = query
      .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
      .order('name', { ascending: true })
      .limit(SEARCH_LIMIT)
  }

  const { data, error } = await query
  if (error) {
    console.error('[products-list] query failed:', error.message)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const rows = (data ?? []) as unknown as Row[]
  let list: ProductListItem[]
  if (ids) {
    // preserve the order the client chose in Studio; unknown/inactive ids drop out
    const byId = new Map(rows.map((p) => [p.id, p]))
    list = ids.flatMap((id) => {
      const p = byId.get(id)
      return p ? [toItem(p)] : []
    })
  } else {
    list = rows.map(toItem)
  }

  return NextResponse.json(list, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  })
}
