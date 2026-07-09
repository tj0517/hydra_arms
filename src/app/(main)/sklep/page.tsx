import type { Metadata } from 'next';
import { Suspense } from 'react';
import SubpageHero from '@/components/SubpageHero';
import SklepClient from '@/components/shop/SklepClient';
import ShopPageSections, { type ShopSection } from '@/components/shop/ShopPageSections';
import { sanityFetch } from '@/sanity/client';
import { shopPageQuery } from '@/sanity/queries';
import { fetchShopData } from '@/lib/shop/fetchProducts';
import type { ShopProduct, ShopCategory } from '@/lib/supabase/types';

export const metadata: Metadata = {
  title: 'Sklep',
  alternates: { canonical: '/sklep' },
};

// ── Types ──────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBlock = { _key: string; _type: string; [key: string]: any }

interface ShopPageData {
  title?: string
  sections?: AnyBlock[]
}

// ── Data fetching ──────────────────────────────────────────────────────────────

function resolveProductsForBlock(
  block: AnyBlock,
  products: ShopProduct[],
): ShopProduct[] {
  if (block._type !== 'shopProductPickerBlock') return []

  const limit = block.limit ?? 4
  const withImages = products.filter(
    (p) => p.images && Object.keys(p.images).length > 0,
  )

  let pool: ShopProduct[]

  switch (block.selectionMode) {
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
      if (block.productIds?.length) {
        // preserve the order the client chose in Studio
        pool = block.productIds
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

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function SklepPage() {
  const [{ products, categories }, shopPageData] = await Promise.all([
    fetchShopData(),
    sanityFetch<ShopPageData>({ query: shopPageQuery }).catch(() => null),
  ])

  const cmsSections = (shopPageData?.sections ?? []) as ShopSection[]
  // Supplement CMS sections with demo placeholders for types not yet populated in CMS.
  // A type is "populated" only if it would actually render (has required content).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isPopulated = (s: ShopSection) => {
    if (s._type === 'shopIconStripBlock') return !!((s as any).items?.length)
    if (s._type === 'shopTileGridBlock') return !!((s as any).tiles?.length)
    return true
  }
  const populatedCmsTypes = new Set(cmsSections.filter(isPopulated).map((s) => s._type))
  const supplemental = DEMO_SECTIONS.filter((d) => !populatedCmsTypes.has(d._type))
  const sections = cmsSections.length > 0 ? [...cmsSections, ...supplemental] : DEMO_SECTIONS

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
