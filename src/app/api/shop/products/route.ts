import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProductType } from '@/lib/supabase/types';

const PAGE_SIZE = 24;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const category = searchParams.get('category');
  const inStock = searchParams.get('in_stock') === 'true';
  const type = searchParams.get('type') as ProductType | null;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));

  const supabase = await createClient();

  let query = supabase
    .from('shop_products')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('name', { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (category) query = query.eq('category_id', parseInt(category, 10));
  if (inStock) query = query.gt('stock', 0);
  if (type) query = query.eq('product_type', type);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    products: data ?? [],
    pagination: {
      page,
      page_size: PAGE_SIZE,
      total: count ?? 0,
      total_pages: Math.ceil((count ?? 0) / PAGE_SIZE),
    },
  });
}
