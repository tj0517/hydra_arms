'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ShopProduct, ShopCategory } from '@/lib/supabase/types';
import ProductCard from './ProductCard';
import CartDrawer from './CartDrawer';

function catLabel(name: string): string {
  if (name.includes(' > ')) return name.split(' > ').at(-1) ?? name;
  if (name.includes('/')) return name.split('/').at(-1)?.trim() ?? name;
  return name;
}

interface SklepClientProps {
  products: ShopProduct[];
  categories: ShopCategory[];
}

interface CategoryNode {
  category: ShopCategory;
  children: ShopCategory[];
}

function buildTree(categories: ShopCategory[]): CategoryNode[] {
  const parents = categories
    .filter(c => !c.parent_id)
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

  return parents.map(parent => ({
    category: parent,
    children: categories
      .filter(c => c.parent_id === parent.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'pl')),
  }));
}

const PAGE_SIZE = 24;

export default function SklepClient({ products, categories }: SklepClientProps) {
  const searchParams = useSearchParams();
  const catParam = searchParams.get('cat');

  // ── Category state ──────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(
    catParam ? parseInt(catParam, 10) : null
  );
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);

  // ── Filter state ────────────────────────────────────────────────────────
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  // ── Mobile panels ───────────────────────────────────────────────────────
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  useEffect(() => {
    setSelectedCategory(catParam ? parseInt(catParam, 10) : null);
    setPage(1);
  }, [catParam]);

  const tree = useMemo(() => buildTree(categories), [categories]);

  // Recursively collect ALL descendant ids for any category
  const allDescendants = useMemo(() => {
    const map = new Map<number, number[]>();
    function descendants(id: number): number[] {
      if (map.has(id)) return map.get(id)!;
      const result: number[] = [];
      for (const c of categories) {
        if (c.parent_id === id) {
          result.push(c.id);
          result.push(...descendants(c.id));
        }
      }
      map.set(id, result);
      return result;
    }
    for (const c of categories) descendants(c.id);
    return map;
  }, [categories]);

  // Derive price range from actual product data
  const priceRange = useMemo(() => {
    const prices = products.map(p => p.price).filter((p): p is number => p !== null && p > 0);
    if (prices.length === 0) return { min: 0, max: 9999 };
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pMin = priceMin !== '' ? parseFloat(priceMin) : null;
    const pMax = priceMax !== '' ? parseFloat(priceMax) : null;

    return products.filter(p => {
      // Category
      if (selectedCategory !== null) {
        const desc = allDescendants.get(selectedCategory) ?? [];
        const ids = new Set([selectedCategory, ...desc]);
        if (!ids.has(p.category_id as number)) return false;
      }
      // Search
      if (q && !p.name.toLowerCase().includes(q) && !(p.sku?.toLowerCase().includes(q) ?? false)) {
        return false;
      }
      // Availability
      if (onlyInStock && p.stock <= 0) return false;
      // Price
      if (pMin !== null && (p.price === null || p.price < pMin)) return false;
      if (pMax !== null && (p.price === null || p.price > pMax)) return false;
      return true;
    });
  }, [products, selectedCategory, search, allDescendants, onlyInStock, priceMin, priceMax]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginated = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Count active non-category filters
  const activeFilterCount = [onlyInStock, priceMin !== '', priceMax !== ''].filter(Boolean).length;

  function selectCategory(id: number | null) {
    setSelectedCategory(id);
    setPage(1);
  }

  function toggleExpanded(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function clearAllFilters() {
    setSearch('');
    selectCategory(null);
    setOnlyInStock(false);
    setPriceMin('');
    setPriceMax('');
  }

  const hasAnyFilter = selectedCategory !== null || search !== '' || activeFilterCount > 0;

  // ── Category navigation ─────────────────────────────────────────────────
  const CategoryNav = (
    <nav className="space-y-0.5">
      <button
        onClick={() => selectCategory(null)}
        className={`w-full flex items-center justify-between px-3 py-3 font-[var(--font-mono)] text-xs tracking-[0.18em] transition-colors text-left ${
          selectedCategory === null ? 'text-accent' : 'text-text-dim hover:text-white'
        }`}
      >
        <span className="flex items-center gap-2">
          {selectedCategory === null && <span className="text-accent">▸</span>}
          WSZYSTKIE PRODUKTY
        </span>
        <span className="text-white/25 text-[10px]">{products.length}</span>
      </button>

      <div className="h-px bg-white/5 my-1" />

      {tree.map(({ category: parent, children }) => {
        const isExpanded = expanded.has(parent.id);
        const isParentActive = selectedCategory === parent.id;
        const hasActiveChild = children.some(c => c.id === selectedCategory);
        const isHighlighted = isParentActive || hasActiveChild;

        return (
          <div key={parent.id}>
            <div className="flex items-center">
              <button
                onClick={() => selectCategory(parent.id)}
                className={`flex-1 text-left px-3 py-2.5 font-[var(--font-mono)] text-xs tracking-[0.15em] transition-colors ${
                  isHighlighted ? 'text-accent' : 'text-text-dim hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isHighlighted && <span>▸</span>}
                  {catLabel(parent.name).toUpperCase()}
                </span>
              </button>
              {children.length > 0 && (
                <button
                  onClick={() => toggleExpanded(parent.id)}
                  className="px-3 py-2 text-white/25 hover:text-accent transition-colors font-[var(--font-mono)] text-xs"
                  aria-label={isExpanded ? 'Zwiń' : 'Rozwiń'}
                >
                  {isExpanded ? '−' : '+'}
                </button>
              )}
            </div>

            {(isExpanded || isHighlighted) && children.length > 0 && (
              <div className="ml-3 border-l border-white/8 pl-2 space-y-0.5 mb-1">
                {children.map(child => (
                  <button
                    key={child.id}
                    onClick={() => selectCategory(child.id)}
                    className={`w-full text-left px-3 py-2 font-[var(--font-mono)] text-[11px] tracking-[0.15em] transition-colors ${
                      selectedCategory === child.id ? 'text-accent' : 'text-text-dim/70 hover:text-white'
                    }`}
                  >
                    {selectedCategory === child.id && <span className="mr-1">▸</span>}
                    {catLabel(child.name)}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  // ── Filter panel ────────────────────────────────────────────────────────
  const FiltersPanel = (
    <div className="space-y-5">
      {/* Header */}
      <div className="pb-2 border-b border-white/8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-[var(--font-mono)] text-[11px] text-text-dim/60 tracking-[0.25em] uppercase">Filtry</span>
          {activeFilterCount > 0 && (
            <span className="bg-accent text-bg font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 tracking-widest leading-none">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={() => {
              setOnlyInStock(false);
              setPriceMin('');
              setPriceMax('');
              setAgeFilter('all');
              setOnlyNoLicense(false);
            }}
            className="font-[var(--font-mono)] text-[9px] text-text-dim/50 hover:text-accent transition-colors tracking-widest"
          >
            WYCZYŚĆ
          </button>
        )}
      </div>

      {/* Availability */}
      <div>
        <p className="font-[var(--font-mono)] text-[10px] text-text-dim/40 tracking-[0.3em] uppercase mb-2.5">Dostępność</p>
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <div
            onClick={() => { setOnlyInStock(v => !v); setPage(1); }}
            className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 transition-colors ${
              onlyInStock ? 'border-accent bg-accent/10' : 'border-white/20 group-hover:border-white/40'
            }`}
          >
            {onlyInStock && (
              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                <path d="M1 3L3 5L7 1" stroke="currentColor" strokeWidth="1.2" className="text-accent" />
              </svg>
            )}
          </div>
          <span
            onClick={() => { setOnlyInStock(v => !v); setPage(1); }}
            className={`font-[var(--font-mono)] text-[11px] tracking-[0.15em] transition-colors select-none ${
              onlyInStock ? 'text-white' : 'text-text-dim group-hover:text-white/70'
            }`}
          >
            Tylko dostępne
          </span>
        </label>
      </div>

      {/* Price range */}
      <div>
        <p className="font-[var(--font-mono)] text-[10px] text-text-dim/40 tracking-[0.3em] uppercase mb-2.5">Cena (PLN)</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={priceMin}
            onChange={e => { setPriceMin(e.target.value); setPage(1); }}
            placeholder={String(priceRange.min)}
            min={0}
            className="w-full bg-transparent border border-white/15 px-2 py-1.5 font-[var(--font-mono)] text-[11px] text-white placeholder-text-dim/30 focus:outline-none focus:border-accent/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="font-[var(--font-mono)] text-[10px] text-text-dim/30 flex-shrink-0">—</span>
          <input
            type="number"
            value={priceMax}
            onChange={e => { setPriceMax(e.target.value); setPage(1); }}
            placeholder={String(priceRange.max)}
            min={0}
            className="w-full bg-transparent border border-white/15 px-2 py-1.5 font-[var(--font-mono)] text-[11px] text-white placeholder-text-dim/30 focus:outline-none focus:border-accent/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        {(priceMin !== '' || priceMax !== '') && (
          <button
            onClick={() => { setPriceMin(''); setPriceMax(''); setPage(1); }}
            className="mt-1.5 font-[var(--font-mono)] text-[9px] text-text-dim/40 hover:text-accent transition-colors tracking-widest"
          >
            WYCZYŚĆ CENĘ
          </button>
        )}
      </div>

    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <CartDrawer />

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-12">

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-8 pb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            {/* Mobile panel toggle */}
            <button
              onClick={() => setMobilePanelOpen(v => !v)}
              className="md:hidden font-[var(--font-mono)] text-[10px] tracking-widest border border-white/15 px-3 py-2 text-text-dim hover:border-accent/40 hover:text-accent transition-colors flex items-center gap-2"
            >
              {mobilePanelOpen ? '[ ZAMKNIJ ]' : '[ FILTRY ]'}
              {activeFilterCount > 0 && (
                <span className="bg-accent text-bg text-[9px] px-1.5 py-0.5 leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <span className="hidden md:inline font-[var(--font-mono)] text-[10px] text-text-dim tracking-widest">
              {filteredProducts.length} PRODUKTÓW
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Active filters summary on desktop */}
            {hasAnyFilter && (
              <button
                onClick={clearAllFilters}
                className="hidden md:flex items-center gap-1.5 font-[var(--font-mono)] text-[10px] text-text-dim/50 hover:text-accent transition-colors tracking-widest"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                WYCZYŚĆ FILTRY
              </button>
            )}

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="SZUKAJ..."
                className="bg-transparent border border-white/15 px-3 py-2.5 font-[var(--font-mono)] text-xs text-white placeholder-text-dim/40 tracking-widest focus:outline-none focus:border-accent/40 transition-colors w-36 sm:w-48 md:w-64"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-accent transition-colors font-[var(--font-mono)] text-xs"
                >×</button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile panel */}
        {mobilePanelOpen && (
          <div className="md:hidden mb-6 border border-white/10 p-5 bg-bg/95 space-y-5">
            <div className="pb-2 border-b border-white/8">
              <span className="font-[var(--font-mono)] text-[11px] text-text-dim/60 tracking-[0.25em] uppercase">Kategorie</span>
            </div>
            {CategoryNav}
            <div className="h-px bg-white/5" />
            {FiltersPanel}
            {hasAnyFilter && (
              <button
                onClick={() => { clearAllFilters(); setMobilePanelOpen(false); }}
                className="w-full font-[var(--font-mono)] text-[10px] text-text-dim/50 hover:text-accent transition-colors tracking-widest py-2 border border-white/10 hover:border-accent/30"
              >
                WYCZYŚĆ WSZYSTKIE FILTRY
              </button>
            )}
          </div>
        )}

        <div className="flex gap-10">

          {/* Sidebar — desktop */}
          <aside className="hidden md:block w-60 flex-shrink-0">
            <div className="sticky top-24 space-y-6 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 scrollbar-thin">
              {/* Categories section */}
              <div className="space-y-3">
                <div className="pb-2 border-b border-white/8">
                  <span className="font-[var(--font-mono)] text-[11px] text-text-dim/60 tracking-[0.25em] uppercase">Kategorie</span>
                </div>
                {CategoryNav}
              </div>

              {/* Filters section */}
              {FiltersPanel}
            </div>
          </aside>

          {/* Main grid */}
          <div className="flex-1 min-w-0">
            {paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="border border-white/10 p-6">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-white/15 mx-auto">
                    <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1"/>
                    <line x1="10" y1="16" x2="22" y2="16" stroke="currentColor" strokeWidth="1"/>
                  </svg>
                </div>
                <p className="font-[var(--font-mono)] text-xs text-text-dim tracking-widest">[ BRAK WYNIKÓW ]</p>
                {hasAnyFilter && (
                  <button
                    onClick={clearAllFilters}
                    className="font-[var(--font-mono)] text-[10px] text-accent tracking-widest hover:underline"
                  >
                    WYCZYŚĆ FILTRY
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
                  {paginated.map(p => (
                    <ProductCard key={p.id} product={p} categories={categories} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-16 pt-8 border-t border-white/10">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                      className="font-[var(--font-mono)] text-[10px] text-text-dim hover:text-accent disabled:opacity-20 disabled:cursor-not-allowed transition-colors tracking-widest px-3 py-2"
                    >
                      ← POPRZEDNIA
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                        .reduce<(number | '…')[]>((acc, n, i, arr) => {
                          if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('…');
                          acc.push(n);
                          return acc;
                        }, [])
                        .map((n, i) =>
                          n === '…' ? (
                            <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center font-[var(--font-mono)] text-[10px] text-white/20">…</span>
                          ) : (
                            <button
                              key={n}
                              onClick={() => setPage(n as number)}
                              className={`w-8 h-8 font-[var(--font-mono)] text-[10px] border transition-colors ${
                                n === page
                                  ? 'border-accent text-accent'
                                  : 'border-white/15 text-text-dim hover:border-accent/40 hover:text-accent'
                              }`}
                            >
                              {n}
                            </button>
                          )
                        )}
                    </div>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => p + 1)}
                      className="font-[var(--font-mono)] text-[10px] text-text-dim hover:text-accent disabled:opacity-20 disabled:cursor-not-allowed transition-colors tracking-widest px-3 py-2"
                    >
                      NASTĘPNA →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
