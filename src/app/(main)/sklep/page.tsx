import type { Metadata } from 'next';
import { Suspense } from 'react';
import SubpageHero from '@/components/SubpageHero';
import SklepClient from '@/components/shop/SklepClient';
import ShopPageSections, { type ShopSection } from '@/components/shop/ShopPageSections';
import { fetchShopData } from '@/lib/shop/fetchProducts';
import type { ShopProduct, ShopCategory } from '@/lib/supabase/types';

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

// ── Demo sections (shown when Sanity shopPage has no content yet) ──────────────

const DEMO_SECTIONS: ShopSection[] = [
  {
    _key: 'demo-banner',
    _type: 'shopBannerBlock',
    heading: 'Profesjonalne wyposażenie taktyczne',
    subtitle: 'Sprawdzony sprzęt dla służb mundurowych i klientów indywidualnych.',
    videoPath: '/video/hero-video.mp4',
    ctaText: 'PRZEGLĄDAJ KATALOG',
    ctaLink: '#catalog',
    theme: 'dark',
    height: 'half',
  },
  {
    _key: 'demo-products',
    _type: 'shopProductPickerBlock',
    heading: 'Bestsellery',
    subtitle: 'Wybór redakcji',
    selectionMode: 'best_sellers',
    limit: 4,
    layout: '4col',
    ctaText: 'Zobacz wszystkie',
    ctaLink: '#catalog',
  },
  {
    _key: 'demo-tiles',
    _type: 'shopTileGridBlock',
    heading: 'Kategorie',
    subtitle: 'Przeglądaj asortyment',
    tiles: [
      { _key: 't1', label: 'Broń krótka', description: 'Pistolety i rewolwery' },
      { _key: 't2', label: 'Optyka', description: 'Lunety i celowniki' },
      { _key: 't3', label: 'Akcesoria', description: 'Kabury i wyposażenie' },
      { _key: 't4', label: 'Amunicja', description: 'Strzelecka i szkolna' },
    ],
    columns: '4',
  },
  {
    _key: 'demo-text',
    _type: 'shopTextCtaBlock',
    heading: 'Jak kupować produkty z ograniczeniem wiekowym?',
    body: [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', _key: 's1', marks: [], text: 'Część produktów w naszym sklepie wymaga weryfikacji wieku lub posiadania odpowiednich uprawnień. Złóż zamówienie online — nasz zespół skontaktuje się z Tobą w celu potwierdzenia dokumentów przed wysyłką lub odbiorem osobistym.' }],
      },
    ],
    ctaText: 'SKONTAKTUJ SIĘ',
    ctaLink: '/kontakt',
    layout: 'left',
    background: 'dark',
  },
  {
    _key: 'demo-icons',
    _type: 'shopIconStripBlock',
    items: [
      { _key: 'i1', icon: 'shield', label: 'Legalna sprzedaż', subtext: 'Koncesja MSWiA' },
      { _key: 'i2', icon: 'truck', label: 'Dostawa kurierem', subtext: 'DHL / InPost' },
      { _key: 'i3', icon: 'package', label: 'Odbiór osobisty', subtext: 'Kraków, ul. Cechowa 44B' },
      { _key: 'i4', icon: 'clock', label: 'Czas realizacji', subtext: '1–3 dni robocze' },
    ],
    layout: 'horizontal',
    background: 'dark',
  },
]

// ── Temporary: shop disabled until configuration is complete ───────────────────
const SHOP_DISABLED = true;

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

  const [{ products, categories }] = await Promise.all([
    fetchShopData(),
  ])

  // TODO: replace with Sanity CMS sections once client has configured them in Studio
  const sections = DEMO_SECTIONS

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
