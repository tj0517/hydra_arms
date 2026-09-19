import type { Metadata } from 'next';
import { Suspense } from 'react';
import SubpageHero from '@/components/SubpageHero';
import SklepClient from '@/components/shop/SklepClient';
import ShopPageSections, { type ShopSection } from '@/components/shop/ShopPageSections';
import { fetchShopData } from '@/lib/shop/fetchProducts';
import type { ShopProduct, ShopCategory } from '@/lib/supabase/types';
import { sanityFetch } from '@/sanity/client';
import { shopPageQuery } from '@/sanity/queries';

export const metadata: Metadata = {
  title: 'Sklep',
  alternates: { canonical: '/sklep' },
};

// ── Data fetching ──────────────────────────────────────────────────────────────

function resolveProductsForBlock(
  block: ShopSection,
  products: ShopProduct[],
): ShopProduct[] {
  if (block._type !== 'shopProductPickerBlock') return []

  // TypeScript narrowed to ProductPickerBlock after guard above
  const b = block
  const limit = b.limit ?? 4
  const withImages = products.filter(
    (p) => p.images && Object.keys(p.images).length > 0,
  )

  let pool: ShopProduct[]

  switch (b.selectionMode) {
    case 'new_arrivals':
      pool = [...withImages].sort((a, b) => b.id - a.id)
      break
    case 'on_sale':
      pool = withImages.filter(
        (p) => p.price_compare != null && p.price != null && p.price_compare > p.price,
      )
      if (!pool.length) pool = [...withImages].sort((a, b) => b.id - a.id)
      break
    case 'manual': {
      if (b.productIds?.length) {
        // preserve the order the client chose in Studio
        pool = b.productIds
          .map((idStr: string) => products.find((p: ShopProduct) => p.id === Number(idStr)))
          .filter((p: ShopProduct | undefined): p is ShopProduct => p != null)
        return pool
      }
      pool = []
      return pool
    }
    case 'best_sellers':
    default: {
      const featured = withImages.filter((p) => p.is_featured && p.stock > 0)
      pool = featured.length ? featured : withImages.filter((p) => p.stock > 0)
      break
    }
  }

  return pool.slice(0, limit)
}

// ── Set to true on main/production until shop config is complete ──────────────
const SHOP_DISABLED = false;

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function SklepPage() {
  if (SHOP_DISABLED) {
    return (
      <main>
        <SubpageHero subtitle="HYDRA ARMS / Sklep" title="Sklep" video="/video/hero-video.mp4" />
        <section className="flex flex-col items-center justify-center min-h-[40vh] py-32 gap-5 px-8">
          <div className="w-px h-20 bg-accent/10" />
          <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.4em] text-accent/40">
            // WKRÓTCE
          </p>
          <p className="font-[var(--font-mono)] text-sm uppercase tracking-[0.2em] text-white/50">
            Sklep w przygotowaniu
          </p>
          <p className="font-[var(--font-mono)] text-[11px] text-text-dim/40 max-w-[320px] text-center leading-relaxed">
            Trwa konfiguracja sklepu. Zapisz się do newslettera, aby otrzymać powiadomienie o otwarciu.
          </p>
          <div className="w-px h-20 bg-accent/10" />
        </section>
      </main>
    );
  }

  const [{ products, categories }, shopPage] = await Promise.all([
    fetchShopData(),
    sanityFetch<{ sections?: ShopSection[] }>({ query: shopPageQuery }),
  ])

  const sections: ShopSection[] = shopPage?.sections ?? []

  // Resolve products for each product picker block (server-side)
  const resolvedProducts: Record<string, ShopProduct[]> = {}
  for (const section of sections) {
    if (section._type === 'shopProductPickerBlock') {
      resolvedProducts[section._key] = resolveProductsForBlock(section, products)
    }
  }

  return (
    <main>
      <SubpageHero subtitle="HYDRA ARMS / Sklep" title="Sklep" video="/video/hero-video.mp4" />

      <ShopPageSections
        sections={sections}
        resolvedProducts={resolvedProducts}
        categories={categories}
      />

      {/* Catalog divider */}
      <div id="catalog" className="max-w-[1400px] mx-auto px-[clamp(32px,5vw,64px)] scroll-mt-20">
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
