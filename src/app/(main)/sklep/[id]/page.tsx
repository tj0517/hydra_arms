import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetailClient from '@/components/shop/ProductDetailClient';
import { createPublicClient } from '@/lib/supabase/public';
import { PUBLIC_PRODUCT_COLUMNS } from '@/lib/shop/fetchProducts';
import type { ShopProduct, ShopCategory } from '@/lib/supabase/types';

async function fetchProduct(id: number): Promise<{ product: ShopProduct; categories: ShopCategory[]; related: ShopProduct[] } | null> {
  const sb = createPublicClient();
  if (!sb) return null;

  const [productResult, categoriesResult] = await Promise.all([
    sb.from('shop_products').select(PUBLIC_PRODUCT_COLUMNS).eq('id', id).eq('is_active', true).limit(1).single(),
    sb.from('shop_categories').select('*').order('name', { ascending: true }).limit(500),
  ]);

  if (!productResult.data) return null;

  const product = productResult.data as unknown as ShopProduct;

  let { data: related } = await sb
    .from('shop_products')
    .select(PUBLIC_PRODUCT_COLUMNS)
    .eq('category_id', product.category_id ?? -1)
    .eq('is_active', true)
    .neq('id', id)
    .order('name', { ascending: true })
    .limit(4);

  if (!related?.length) {
    const { data: fallback } = await sb
      .from('shop_products')
      .select(PUBLIC_PRODUCT_COLUMNS)
      .eq('is_active', true)
      .neq('id', id)
      .order('name', { ascending: true })
      .limit(4);
    related = fallback;
  }

  return {
    product,
    categories: (categoriesResult.data ?? []) as ShopCategory[],
    related: (related ?? []) as unknown as ShopProduct[],
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
  const image = product.images ? Object.values(product.images)[0] : undefined;
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
      <ProductDetailClient product={data.product} categories={data.categories} related={data.related} />
    </main>
  );
}
