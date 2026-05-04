import { notFound } from 'next/navigation';
import ProductDetailClient from '@/components/shop/ProductDetailClient';
import { createPublicClient } from '@/lib/supabase/public';
import type { ShopProduct, ShopCategory } from '@/lib/supabase/types';

const INVENTORY_ID = 35743;

async function fetchProduct(id: number): Promise<{ product: ShopProduct; categories: ShopCategory[] } | null> {
  const sb = createPublicClient();
  if (!sb) return null;

  const [productResult, categoriesResult] = await Promise.all([
    sb
      .from('shop_products')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .limit(1)
      .single(),
    sb
      .from('shop_categories')
      .select('*')
      .eq('inventory_id', INVENTORY_ID)
      .order('name', { ascending: true })
      .limit(200),
  ]);

  if (!productResult.data) return null;

  return {
    product: productResult.data as ShopProduct,
    categories: (categoriesResult.data ?? []) as ShopCategory[],
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = parseInt(id, 10);
  if (isNaN(productId)) notFound();

  const data = await fetchProduct(productId);
  if (!data) notFound();

  return (
    <main>
      <ProductDetailClient product={data.product} categories={data.categories} />
    </main>
  );
}
