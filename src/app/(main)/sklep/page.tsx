import type { Metadata } from 'next';
import { Suspense } from 'react';
import SubpageHero from '@/components/SubpageHero';
import SklepClient from '@/components/shop/SklepClient';
import ShopLanding from '@/components/shop/ShopLanding';
import { createPublicClient } from '@/lib/supabase/public';
import type { ShopProduct, ShopCategory } from '@/lib/supabase/types';

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
      .order('name', { ascending: true })
      .limit(500),
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
      <ShopLanding products={products} categories={categories} />
      <div id="catalog" className="max-w-[1400px] mx-auto px-6 md:px-10 scroll-mt-20">
        <div className="flex items-center gap-4 py-4">
          <div className="h-px flex-1 bg-white/5" />
          <span className="font-[var(--font-mono)] text-[9px] text-white/20 tracking-[0.4em]">KATALOG PRODUKTÓW</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>
      </div>
      <Suspense fallback={null}>
        <SklepClient products={products} categories={categories} />
      </Suspense>
    </main>
  );
}
