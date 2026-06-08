import type { Metadata } from 'next';
import SubpageHero from '@/components/SubpageHero';
import SklepClient from '@/components/shop/SklepClient';
import { createPublicClient } from '@/lib/supabase/public';
import type { ShopProduct, ShopCategory } from '@/lib/supabase/types';

const INVENTORY_ID = 35743;

export const metadata: Metadata = {
  title: 'Sklep',
  alternates: { canonical: '/sklep' },
};

async function fetchShopData(): Promise<{ products: ShopProduct[]; categories: ShopCategory[] }> {
  const sb = createPublicClient();
  if (!sb) return { products: [], categories: [] };

  const [productsResult, categoriesResult] = await Promise.all([
    sb
      .from('shop_products')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    sb
      .from('shop_categories')
      .select('*')
      .eq('inventory_id', INVENTORY_ID)
      .order('name', { ascending: true })
      .limit(200),
  ]);

  return {
    products: (productsResult.data ?? []) as ShopProduct[],
    categories: (categoriesResult.data ?? []) as ShopCategory[],
  };
}

export default async function SklepPage() {
  const { products, categories } = await fetchShopData();

  return (
    <main>
      <SubpageHero subtitle="HYDRA ARMS / Sklep" title="Sklep" video="/video/hero-video.mp4" />
      <SklepClient products={products} categories={categories} />
    </main>
  );
}
