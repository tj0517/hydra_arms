'use client';

import { useState, useMemo } from 'react';
import type { ShopProduct, ShopCategory } from '@/lib/supabase/types';
import ProductCard from './ProductCard';
import CartDrawer from './CartDrawer';

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
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [page, setPage] = useState(1);

  const tree = useMemo(() => buildTree(categories), [categories]);

  // Collect all child category ids for a given parent
  const childIds = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const { category: parent, children } of buildTree(categories)) {
      map.set(parent.id, children.map(c => c.id));
    }
    return map;
  }, [categories]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (selectedCategory !== null) {
        const children = childIds.get(selectedCategory) ?? [];
        const ids = [selectedCategory, ...children];
        if (!ids.includes(p.category_id as number)) return false;
      }
      if (q) {
        return p.name.toLowerCase().includes(q) || (p.sku?.toLowerCase().includes(q) ?? false);
      }
      return true;
    });
  }, [products, selectedCategory, search, childIds]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginated = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  const CategoryNav = (
    <nav className="space-y-0.5">
      <button
        onClick={() => selectCategory(null)}
        className={`w-full flex items-center justify-between px-3 py-2 font-[var(--font-mono)] text-[10px] tracking-[0.18em] transition-colors text-left ${
          selectedCategory === null ? 'text-accent' : 'text-text-dim hover:text-white'
        }`}
      >
        <span className="flex items-center gap-2">
          {selectedCategory === null && <span className="text-accent">▸</span>}
          WSZYSTKIE PRODUKTY
        </span>
        <span className="text-white/25 text-[9px]">{products.length}</span>
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
                className={`flex-1 text-left px-3 py-2 font-[var(--font-mono)] text-[10px] tracking-[0.15em] transition-colors ${
                  isHighlighted ? 'text-accent' : 'text-text-dim hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isHighlighted && <span>▸</span>}
                  {parent.name.toUpperCase()}
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

            {isExpanded && children.length > 0 && (
              <div className="ml-3 border-l border-white/8 pl-2 space-y-0.5 mb-1">
                {children.map(child => (
                  <button
                    key={child.id}
                    onClick={() => selectCategory(child.id)}
                    className={`w-full text-left px-3 py-1.5 font-[var(--font-mono)] text-[9px] tracking-[0.15em] transition-colors ${
                      selectedCategory === child.id ? 'text-accent' : 'text-text-dim/70 hover:text-white'
                    }`}
                  >
                    {selectedCategory === child.id && <span className="mr-1">▸</span>}
                    {child.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      <CartDrawer />

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-12">

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-8 pb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(v => !v)}
              className="md:hidden font-[var(--font-mono)] text-[10px] tracking-widest border border-white/15 px-3 py-2 text-text-dim hover:border-accent/40 hover:text-accent transition-colors"
            >
              {mobileNavOpen ? '[ ZAMKNIJ ]' : '[ KATEGORIE ]'}
            </button>
            <span className="hidden md:inline font-[var(--font-mono)] text-[10px] text-text-dim tracking-widest">
              {filteredProducts.length} PRODUKTÓW
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="SZUKAJ..."
              className="bg-transparent border border-white/15 px-3 py-2 font-[var(--font-mono)] text-[10px] text-white placeholder-text-dim/40 tracking-widest focus:outline-none focus:border-accent/40 transition-colors w-32 sm:w-40 md:w-56"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-accent transition-colors font-[var(--font-mono)] text-xs"
              >×</button>
            )}
          </div>
        </div>

        <div className="flex gap-10">

          {/* Sidebar — desktop */}
          <aside className="hidden md:block w-52 flex-shrink-0">
            <div className="sticky top-24 space-y-3">
              <div className="pb-2 border-b border-white/8">
                <span className="font-[var(--font-mono)] text-[9px] text-text-dim/60 tracking-[0.25em] uppercase">Kategorie</span>
              </div>
              {CategoryNav}
            </div>
          </aside>

          {/* Sidebar — mobile */}
          {mobileNavOpen && (
            <div className="md:hidden w-full mb-6 border border-white/10 p-4 fixed left-0 right-0 top-[140px] bg-bg z-10 shadow-xl max-h-[60vh] overflow-y-auto">
              {CategoryNav}
            </div>
          )}

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
                {(search || selectedCategory !== null) && (
                  <button
                    onClick={() => { setSearch(''); selectCategory(null); }}
                    className="font-[var(--font-mono)] text-[10px] text-accent tracking-widest hover:underline"
                  >
                    WYCZYŚĆ FILTRY
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
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
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={`w-8 h-8 font-[var(--font-mono)] text-[10px] border transition-colors ${
                            n === page
                              ? 'border-accent text-accent'
                              : 'border-white/15 text-text-dim hover:border-accent/40 hover:text-accent'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
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
