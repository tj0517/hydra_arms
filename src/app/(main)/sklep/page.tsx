import type { Metadata } from 'next';
import { Suspense } from 'react';
import SubpageHero from '@/components/SubpageHero';
import SklepClient from '@/components/shop/SklepClient';
import ShopPageSections, { type ShopSection } from '@/components/shop/ShopPageSections';
import { getBlockProducts, loadListing, type SearchParamsRecord } from '@/lib/shop/listing';
import type { ShopProduct } from '@/lib/supabase/types';
import { sanityFetch } from '@/sanity/client';
import { shopPageQuery } from '@/sanity/queries';

export const metadata: Metadata = {
  title: 'Sklep',
  alternates: { canonical: '/sklep' },
};

// ── SHOP_DISABLED=true in Vercel (Production) hides the shop listing until launch ──
const SHOP_DISABLED = process.env.SHOP_DISABLED === 'true';

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function SklepPage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  if (SHOP_DISABLED) {
    return (
      <main>
        <SubpageHero subtitle="HYDRA ARMS / Sklep" title="Sklep" video="/video/hero-video.mp4" />
        <section className="flex flex-col items-center justify-center min-h-[40vh] py-32 gap-5 px-8">
          <div className="w-px h-20 bg-accent/10" />
          <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.4em] text-accent/40">
            {'// WKRÓTCE'}
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

  // HA-2.35: one page of the listing computed in Postgres, never the whole catalogue.
  // loadListing throws on a missing service-role key or an RPC error → error page.
  const [data, shopPage] = await Promise.all([
    loadListing(await searchParams),
    sanityFetch<{ sections?: ShopSection[] }>({ query: shopPageQuery }),
  ])

  const sections: ShopSection[] = shopPage?.sections ?? []

  // One small cached query per product picker block (HA-2.36), never the whole catalogue.
  const resolvedProducts: Record<string, ShopProduct[]> = {}
  await Promise.all(
    sections.map(async (section) => {
      if (section._type === 'shopProductPickerBlock') {
        resolvedProducts[section._key] = await getBlockProducts(section)
      }
    }),
  )

  return (
    <main>
      <SubpageHero subtitle="HYDRA ARMS / Sklep" title="Sklep" video="/video/hero-video.mp4" />

      <ShopPageSections
        sections={sections}
        resolvedProducts={resolvedProducts}
        categories={data.categories}
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
        <SklepClient data={data} />
      </Suspense>
    </main>
  );
}
