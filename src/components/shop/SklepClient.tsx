'use client';

import { useState, useMemo, useEffect, useRef, useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ShopProduct } from '@/lib/supabase/types';
import { categoryDisplayName, isWorkingCategory } from '@/lib/shop/categoryLabel';
import ProductCard from './ProductCard';
import CartDrawer from './CartDrawer';
import FiltersSidebar from './FiltersSidebar';
import ActiveFilterChips from './ActiveFilterChips';
import ListingToolbar from './ListingToolbar';
import MobileFilterSheet from './MobileFilterSheet';
import {
  DELIVERY_MODE_LABELS,
  type ActiveChip,
  type CategoryTreeNode,
  type FilterActions,
  type FilterOptions,
  type FilterState,
  type ListingCategory,
  type ListingPageData,
  type ListingParams,
} from './listingFilters';

interface SklepClientProps {
  data: ListingPageData;
}

/**
 * Two-level public tree. The "00." working root is omitted (decision tj
 * 2026-10-19, D1 A) — its products stay listed under "Wszystkie" and in search.
 */
function buildTree(categories: ListingCategory[]): CategoryTreeNode[] {
  // Sort by the RAW BaseLinker name (the numbered one: "01. …", "1.1 …"), never by the
  // display label — the Hydra numbering is the intended order (decision tj 2026-10-19).
  const parents = categories
    .filter(c => !c.parent_id && !isWorkingCategory(c.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

  return parents.map(parent => ({
    category: parent,
    children: categories
      .filter(c => c.parent_id === parent.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'pl')),
  }));
}

/** The URL for a filter state — the only way the listing changes (HA-2.35). */
function listingHref(state: ListingParams): string {
  const params = new URLSearchParams();
  if (state.cat !== null) params.set('cat', String(state.cat));
  if (state.q) params.set('q', state.q);
  if (state.stock) params.set('stock', '1');
  if (state.min) params.set('min', state.min);
  if (state.max) params.set('max', state.max);
  if (state.sort !== 'name_asc') params.set('sort', state.sort);
  if (state.marka) params.set('marka', state.marka);
  if (state.dostawa) params.set('dostawa', state.dostawa);
  for (const [key, vals] of Object.entries(state.specs)) {
    for (const val of vals) params.append('spec', `${key}:${val}`);
  }
  if (state.page > 1) params.set('page', String(state.page));
  const qs = params.toString();
  return qs ? `/sklep?${qs}` : '/sklep';
}

const NO_FILTERS: ListingParams = {
  cat: null, q: '', stock: false, min: '', max: '', sort: 'name_asc',
  marka: null, dostawa: null, specs: {}, page: 1,
};

/**
 * A text input backed by one URL value: typing updates the field at once and
 * commits after `delay`; a change of the URL value from elsewhere (chip ×, clear,
 * back button) overwrites the field, our own commit does not.
 */
function useUrlInput(urlValue: string, delay: number, commit: (value: string) => void) {
  const [input, setInput] = useState(urlValue);
  const [committed, setCommitted] = useState(urlValue);
  const [seenUrlValue, setSeenUrlValue] = useState(urlValue);
  if (urlValue !== seenUrlValue) {
    setSeenUrlValue(urlValue);
    setCommitted(urlValue);
    if (urlValue !== committed) setInput(urlValue);
  }

  // The timer calls the latest commit — it closes over the latest URL state.
  const commitRef = useRef(commit);
  useEffect(() => { commitRef.current = commit; });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function change(value: string) {
    setInput(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCommitted(value.trim());
      commitRef.current(value.trim());
    }, delay);
  }
  return [input, change] as const;
}

const PAGER_BUTTON =
  'h-9 min-w-9 px-3 text-[13px] border transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

export default function SklepClient({ data }: SklepClientProps) {
  const router = useRouter();
  const { listing, categories } = data;
  const [isPending, startTransition] = useTransition();

  // ── State — the URL, as validated by the server; optimistic while a push is pending ──
  const [current, setOptimistic] = useOptimistic(data.params);

  /** Every filter change: a new URL. A filter change goes back to page 1. */
  function navigate(patch: Partial<ListingParams>) {
    const next: ListingParams = { ...current, page: 1, ...patch };
    startTransition(() => {
      setOptimistic(next);
      router.push(listingHref(next), { scroll: false });
    });
  }

  const [searchInput, setSearchInput] = useUrlInput(current.q, 300, q => navigate({ q }));
  const [priceMinInput, setPriceMinInput] = useUrlInput(current.min, 350, min => navigate({ min }));
  const [priceMaxInput, setPriceMaxInput] = useUrlInput(current.max, 350, max => navigate({ max }));

  // ── Derived structures (no product filtering — the server returns one page) ──
  const tree = useMemo(() => buildTree(categories), [categories]);
  const categoryCounts = useMemo(
    () => new Map(Object.entries(data.categoryCounts).map(([id, n]) => [Number(id), n])),
    [data.categoryCounts],
  );

  const total = listing.total;
  const totalPages = Math.ceil(total / listing.page_size);
  const page = current.page;
  // ShopListingItem is ShopProduct minus private/unused columns — the card and the cart use only public ones.
  const products = listing.items as ShopProduct[];

  // Scroll to the toolbar (top of the product area) when a new page of results arrives
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    toolbarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [listing]);

  // ── Actions ─────────────────────────────────────────────────────────────
  function selectCategory(id: number | null) {
    navigate({ cat: id, specs: {} }); // specs are category-specific — reset on category change
  }

  function clearAllFilters() {
    navigate(NO_FILTERS);
  }

  // Sidebar "Wyczyść filtry" — keeps category, query and sort
  function clearNonCategoryFilters() {
    navigate({ stock: false, min: '', max: '', specs: {}, marka: null, dostawa: null });
  }

  function toggleSpec(key: string, val: string) {
    const selected = current.specs[key] ?? [];
    const nextVals = selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val].sort();
    const specs = { ...current.specs, [key]: nextVals };
    if (nextVals.length === 0) delete specs[key];
    navigate({ specs });
  }

  function clearSpec(key: string) {
    const specs = { ...current.specs };
    delete specs[key];
    navigate({ specs });
  }

  const filters: FilterState = {
    onlyInStock: current.stock,
    deliveryMode: current.dostawa,
    priceMinInput,
    priceMaxInput,
    selectedBrand: current.marka,
    selectedSpecs: current.specs,
  };
  const actions: FilterActions = {
    toggleStock: () => navigate({ stock: !current.stock }),
    setDeliveryMode: dostawa => navigate({ dostawa }),
    setPriceMin: setPriceMinInput,
    setPriceMax: setPriceMaxInput,
    setBrand: marka => navigate({ marka }),
    toggleSpec,
    clearSpec,
  };
  const options: FilterOptions = {
    priceRange: data.priceRange,
    availableBrands: listing.brands,
    availableSpecs: listing.specs,
  };

  // Badge counts
  const activeSpecCount = Object.values(current.specs).filter(vals => vals.length > 0).length;
  const activeFilterCount =
    [current.stock, current.min !== '' || current.max !== '', current.marka !== null, current.dostawa !== null]
      .filter(Boolean).length + activeSpecCount;

  // ── Active-filter chips — one per active filter, category and query included ──
  const chips: ActiveChip[] = [];
  if (current.cat !== null) {
    const cat = categories.find(c => c.id === current.cat);
    if (cat) chips.push({ id: 'cat', label: categoryDisplayName(cat.name), onRemove: () => selectCategory(null) });
  }
  if (current.q) {
    chips.push({ id: 'q', label: `Szukaj: „${current.q}”`, onRemove: () => navigate({ q: '' }) });
  }
  if (current.stock) chips.push({ id: 'stock', label: 'Tylko dostępne', onRemove: actions.toggleStock });
  if (current.dostawa) {
    chips.push({ id: 'dostawa', label: DELIVERY_MODE_LABELS[current.dostawa], onRemove: () => actions.setDeliveryMode(null) });
  }
  if (current.min !== '' || current.max !== '') {
    const label =
      current.min !== '' && current.max !== '' ? `Cena: ${current.min}–${current.max} zł`
      : current.min !== '' ? `Cena: od ${current.min} zł`
      : `Cena: do ${current.max} zł`;
    chips.push({ id: 'cena', label, onRemove: () => navigate({ min: '', max: '' }) });
  }
  if (current.marka) chips.push({ id: 'marka', label: `Marka: ${current.marka}`, onRemove: () => actions.setBrand(null) });
  for (const [key, vals] of Object.entries(current.specs)) {
    for (const val of vals) {
      chips.push({ id: `spec:${key}:${val}`, label: `${key}: ${val}`, onRemove: () => toggleSpec(key, val) });
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <CartDrawer />

      <div className="max-w-[1400px] mx-auto px-[clamp(16px,5vw,64px)] py-10 lg:py-12 pb-24 lg:pb-12">
        <div className="flex gap-10 xl:gap-14 items-start">

          {/* Sidebar — category tree + filters (desktop ≥ 1024 px) */}
          <aside className="hidden lg:block w-64 flex-shrink-0" aria-label="Kategorie i filtry">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-3 -mr-3 pb-6">
              <FiltersSidebar
                tree={tree}
                counts={categoryCounts}
                totalCount={data.totalActive}
                selectedCategory={current.cat}
                onSelectCategory={selectCategory}
                filters={filters}
                actions={actions}
                options={options}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearNonCategoryFilters}
              />
            </div>
          </aside>

          {/* Product area */}
          <div className="flex-1 min-w-0" data-testid="product-area" aria-busy={isPending}>
            <div ref={toolbarRef} className="scroll-mt-24 mb-6">
              <ListingToolbar
                count={total}
                searchInput={searchInput}
                onSearchChange={setSearchInput}
                sortBy={current.sort}
                onSortChange={sort => navigate({ sort })}
              />
            </div>

            <ActiveFilterChips chips={chips} onClearAll={clearAllFilters} />

            <div className="relative">
              {isPending && (
                <div
                  data-testid="listing-loading"
                  role="status"
                  className="absolute inset-x-0 top-0 z-10 flex justify-center pointer-events-none"
                >
                  <span className="mt-6 inline-flex items-center gap-2 border border-white/20 bg-bg-card px-3 py-1.5 text-[13px] text-text">
                    <span aria-hidden="true" className="w-3 h-3 rounded-full border-2 border-white/30 border-t-accent animate-spin" />
                    Ładowanie…
                  </span>
                </div>
              )}

              <div className={`transition-opacity duration-150 ${isPending ? 'opacity-50' : ''}`}>
                {products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-28 gap-4 text-center border border-white/10">
                    <p className="text-[18px] text-text font-medium">Brak wyników</p>
                    <p className="text-[14px] text-text-dim max-w-sm">
                      Żaden produkt nie pasuje do wybranych filtrów. Usuń część filtrów albo zmień frazę.
                    </p>
                    {chips.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="mt-2 h-10 px-5 bg-accent text-bg text-[13px] font-medium hover:opacity-90 transition-opacity"
                      >
                        Wyczyść filtry
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                      {products.map(p => (
                        <ProductCard key={p.id} product={p} categories={categories} />
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <nav aria-label="Paginacja" className="flex items-center justify-center gap-2 mt-16 pt-8 border-t border-white/10">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => navigate({ page: page - 1 })}
                          className={`${PAGER_BUTTON} border-transparent text-text-dim hover:text-text`}
                        >
                          <span className="hidden sm:inline">← Poprzednia</span>
                          <span className="sm:hidden" aria-label="Poprzednia">←</span>
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
                                <span key={`e-${i}`} className="h-9 w-9 flex items-center justify-center text-[13px] text-text-dim">…</span>
                              ) : (
                                <button
                                  type="button"
                                  key={n}
                                  aria-current={n === page ? 'page' : undefined}
                                  onClick={() => navigate({ page: n as number })}
                                  className={`${PAGER_BUTTON} tabular-nums ${
                                    n === page
                                      ? 'border-accent text-accent'
                                      : 'border-white/20 text-text hover:border-white/50'
                                  }`}
                                >
                                  {n}
                                </button>
                              )
                            )}
                        </div>
                        <button
                          type="button"
                          disabled={page >= totalPages}
                          onClick={() => navigate({ page: page + 1 })}
                          className={`${PAGER_BUTTON} border-transparent text-text-dim hover:text-text`}
                        >
                          <span className="hidden sm:inline">Następna →</span>
                          <span className="sm:hidden" aria-label="Następna">→</span>
                        </button>
                      </nav>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile (< 1024 px): sticky bottom bar + bottom sheet with the same tree and filters */}
      <MobileFilterSheet
        tree={tree}
        counts={categoryCounts}
        totalCount={data.totalActive}
        selectedCategory={current.cat}
        onSelectCategory={selectCategory}
        filters={filters}
        actions={actions}
        options={options}
        activeFilterCount={activeFilterCount + (current.cat !== null ? 1 : 0)}
        resultCount={total}
        sortBy={current.sort}
        onSortChange={sort => navigate({ sort })}
        onClearAll={clearAllFilters}
      />
    </>
  );
}
