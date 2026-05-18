import type { Metadata } from 'next';
import SubpageHero from '@/components/SubpageHero';
import SklepClient from '@/components/shop/SklepClient';
import { createPublicClient } from '@/lib/supabase/public';
import type { ShopProduct, ShopCategory } from '@/lib/supabase/types';

export const metadata: Metadata = {
  title: 'Sklep',
  description:
    'Sklep HYDRA ARMS — sprzęt myśliwski, akcesoria taktyczne i wyposażenie obronne dostępne online. Sprawdź aktualną ofertę.',
  alternates: { canonical: '/sklep' },
  openGraph: {
    title: 'Sklep | HYDRA ARMS',
    description:
      'Sklep HYDRA ARMS — sprzęt myśliwski, akcesoria taktyczne i wyposażenie obronne.',
    url: '/sklep',
  },
};

const PAGE_SIZE = 12;
const INVENTORY_ID = 35743;

async function fetchShopData(categoryId: number | null, page: number) {
  const sb = createPublicClient();
  if (!sb) return { products: [] as ShopProduct[], categories: [] as ShopCategory[], total: 0 };

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = sb
    .from('shop_products')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('name', { ascending: true })
    .range(from, to);

  if (categoryId) query = query.eq('category_id', categoryId);

  const [productsResult, categoriesResult] = await Promise.all([
    query,
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
    total: productsResult.count ?? 0,
  };
}

export default async function SklepPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const categoryId = params.cat ? parseInt(params.cat, 10) : null;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));

  const { products, categories, total } = await fetchShopData(categoryId, page);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const noData = products.length === 0 && categories.length === 0;

  return (
    <main>
      <SubpageHero subtitle="HYDRA ARMS / Sklep" title="Sklep" video="/video/hero-video.mp4" />

      {noData ? (
        <section className="min-h-[50vh] flex items-center justify-center">
          <p className="font-[var(--font-mono)] text-sm text-text-dim tracking-wide">
            [ W PRZYGOTOWANIU ]
          </p>
        </section>
      ) : (
        <SklepClient
          products={products}
          categories={categories}
          totalCount={total}
          currentPage={page}
          totalPages={totalPages}
          currentCategoryId={categoryId}
        />
      )}
    </main>
  );
}
