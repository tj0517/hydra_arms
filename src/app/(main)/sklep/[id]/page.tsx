import type { Metadata } from 'next';
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const productId = parseInt(id, 10);
  if (isNaN(productId)) return {};
  const data = await fetchProduct(productId);
  if (!data) return {};
  const { product } = data;
  const image = product.images?.[0];
  return {
    title: product.name,
    description: product.description
      ? product.description.replace(/<[^>]+>/g, '').slice(0, 155)
      : `${product.name} — dostępny w sklepie HYDRA ARMS.`,
    alternates: { canonical: `/sklep/${id}` },
    openGraph: {
      title: product.name,
      url: `/sklep/${id}`,
      images: image ? [{ url: image, width: 800, height: 800, alt: product.name }] : undefined,
    },
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
