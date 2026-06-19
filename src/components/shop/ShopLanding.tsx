'use client'

import { useRouter } from 'next/navigation'
import type { ShopCategory, ShopProduct } from '@/lib/supabase/types'
import ProductCard from './ProductCard'

function catLabel(name: string): string {
  if (name.includes(' > ')) return name.split(' > ').at(-1) ?? name
  if (name.includes('/')) return name.split('/').at(-1)?.trim() ?? name
  return name
}

interface Props {
  categories: ShopCategory[]
  products: ShopProduct[]
}

export default function ShopLanding({ categories, products }: Props) {
  const router = useRouter()

  // ── Precompute descendants & counts ──────────────────────────────────────────

  const descMap = new Map<number, number[]>()
  function descendants(id: number): number[] {
    if (descMap.has(id)) return descMap.get(id)!
    const result: number[] = []
    for (const c of categories) {
      if (c.parent_id === id) { result.push(c.id); result.push(...descendants(c.id)) }
    }
    descMap.set(id, result)
    return result
  }
  for (const c of categories) descendants(c.id)

  function countFor(id: number): number {
    const ids = new Set([id, ...descendants(id)])
    return products.filter(p => ids.has(p.category_id as number)).length
  }

  const rootsWithCount = categories
    .filter(c => !c.parent_id)
    .map(c => ({ ...c, count: countFor(c.id) }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)

  const heroCategories = rootsWithCount.slice(0, 3)
  const recommended   = rootsWithCount.slice(3, 9)

  // Products with images look better in grids
  const withImages = products.filter(p => p.images && Object.keys(p.images).length > 0)
  const newest    = [...withImages].sort((a, b) => b.id - a.id).slice(0, 4)
  const featured  = withImages.filter(p => p.stock > 0).slice(0, 4)

  // ── Navigation helper ─────────────────────────────────────────────────────────

  function goTo(catId: number | null) {
    router.push(catId ? `/sklep?cat=${catId}` : '/sklep')
    setTimeout(() => {
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-8 space-y-20 pb-4">

      {/* ── 1. Hero — top 3 categories ───────────────────────────────────────── */}
      {heroCategories.length > 0 && (
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {heroCategories.map((cat, i) => (
              <button
                key={cat.id}
                onClick={() => goTo(cat.id)}
                className="group relative overflow-hidden border border-white/10 hover:border-accent/50 p-8 md:p-10 text-left transition-all duration-300 min-h-[200px] md:min-h-[240px] flex flex-col justify-between bg-white/[0.02] hover:bg-white/[0.04]"
              >
                {/* Ghost index number */}
                <span className="absolute bottom-4 right-6 font-[var(--font-mono)] text-[80px] font-bold leading-none text-white/[0.035] select-none pointer-events-none">
                  {String(i + 1).padStart(2, '0')}
                </span>

                <div>
                  <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.3em] mb-5 uppercase">
                    Kategoria / {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight group-hover:text-accent transition-colors duration-200">
                    {catLabel(cat.name)}
                  </h3>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-[var(--font-mono)] text-[11px] text-text-dim">
                    {cat.count} produktów
                  </span>
                  <span className="font-[var(--font-mono)] text-[11px] text-accent tracking-widest opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200">
                    ODKRYJ →
                  </span>
                </div>

                <div className="absolute inset-x-0 bottom-0 h-px bg-accent origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 2. Polecane kategorie ────────────────────────────────────────────── */}
      {recommended.length > 0 && (
        <section>
          <SectionHeader label="Przeglądaj" title="Polecane kategorie" onMore={() => goTo(null)} moreLabel="Wszystkie kategorie" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-6">
            {recommended.map(cat => (
              <button
                key={cat.id}
                onClick={() => goTo(cat.id)}
                className="group relative border border-white/8 hover:border-accent/40 bg-white/[0.015] hover:bg-white/[0.03] px-4 py-5 text-left transition-all duration-200"
              >
                <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors leading-snug line-clamp-2 mb-2">
                  {catLabel(cat.name)}
                </p>
                <p className="font-[var(--font-mono)] text-[10px] text-text-dim">
                  {cat.count} szt.
                </p>
                <div className="absolute inset-x-0 bottom-0 h-px bg-accent origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 3. Nowe produkty ────────────────────────────────────────────────── */}
      {newest.length > 0 && (
        <section>
          <SectionHeader label="Właśnie dodane" title="Nowe produkty" onMore={() => goTo(null)} moreLabel="Zobacz więcej" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6">
            {newest.map(p => (
              <ProductCard key={p.id} product={p} categories={categories} />
            ))}
          </div>
        </section>
      )}

      {/* ── 4. Polecane produkty ─────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="pb-2">
          <SectionHeader label="Wybór redakcji" title="Polecane produkty" onMore={() => goTo(null)} moreLabel="Zobacz więcej" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6">
            {featured.map(p => (
              <ProductCard key={p.id} product={p} categories={categories} />
            ))}
          </div>
        </section>
      )}

    </div>
  )
}

// ── Shared section header ─────────────────────────────────────────────────────

function SectionHeader({
  label,
  title,
  onMore,
  moreLabel,
}: {
  label: string
  title: string
  onMore: () => void
  moreLabel: string
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.3em] uppercase mb-1.5">
          {label}
        </p>
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          {title}
        </h2>
      </div>
      <button
        onClick={onMore}
        className="font-[var(--font-mono)] text-[10px] text-text-dim hover:text-accent tracking-[0.2em] transition-colors"
      >
        {moreLabel} →
      </button>
    </div>
  )
}
