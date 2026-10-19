'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { ShopProduct, ShopCategory } from '@/lib/supabase/types';
import { mustPickup } from '@/lib/shop/cartAnalysis';
import { categoryDisplayName, isWorkingCategory } from '@/lib/shop/categoryLabel';
import ProductCard from './ProductCard';
import CartDrawer from './CartDrawer';
import FiltersSidebar from './FiltersSidebar';
import ActiveFilterChips from './ActiveFilterChips';
import ListingToolbar from './ListingToolbar';
import {
  DELIVERY_MODE_LABELS,
  isDeliveryMode,
  isSortKey,
  type ActiveChip,
  type CategoryTreeNode,
  type DeliveryMode,
  type FilterActions,
  type FilterOptions,
  type FilterState,
  type SortKey,
} from './listingFilters';

interface SklepClientProps {
  products: ShopProduct[];
  categories: ShopCategory[];
}

/**
 * Two-level public tree. The "00." working root is omitted (decision tj
 * 2026-10-19, D1 A) — its products stay listed under "Wszystkie" and in search.
 */
function buildTree(categories: ShopCategory[]): CategoryTreeNode[] {
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

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const PAGE_SIZE = 24;

const PAGER_BUTTON =
  'h-9 min-w-9 px-3 text-[13px] border transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

export default function SklepClient({ products, categories }: SklepClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── State — initialized from URL params on mount ────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<number | null>(() => {
    const v = searchParams.get('cat');
    if (!v) return null;
    const id = parseInt(v, 10);
    // Validated against the known set: an unknown ?cat= is dropped, not applied.
    return categories.some(c => c.id === id) ? id : null;
  });
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') ?? '');
  const [onlyInStock, setOnlyInStock] = useState(() => searchParams.get('stock') === '1');
  const [priceMinInput, setPriceMinInput] = useState(() => searchParams.get('min') ?? '');
  const [priceMaxInput, setPriceMaxInput] = useState(() => searchParams.get('max') ?? '');
  const [sortBy, setSortBy] = useState<SortKey>(() => {
    const v = searchParams.get('sort');
    return isSortKey(v) ? v : 'name_asc';
  });
  // selectedSpecs: { [specKey]: string[] } — multi-select per key, OR within key, AND between keys
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string[]>>({});
  // Universal filters (HA-2.10). Validated against the known set on read — an
  // unknown ?marka=/?dostawa= value is dropped rather than applied.
  const [selectedBrand, setSelectedBrand] = useState<string | null>(() => {
    const v = searchParams.get('marka');
    if (!v) return null;
    return products.some(p => p.brand === v) ? v : null;
  });
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode | null>(
    () => { const v = searchParams.get('dostawa'); return isDeliveryMode(v) ? v : null; }
  );
  const [page, setPage] = useState(1);

  // Debounce text and price inputs — UI updates immediately, filter/URL follow after delay
  const search = useDebounce(searchInput, 200);
  const priceMin = useDebounce(priceMinInput, 350);
  const priceMax = useDebounce(priceMaxInput, 350);

  // Sync ALL filter state to URL in one place — built from scratch to avoid stale reads
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('cat', String(selectedCategory));
    if (search) params.set('q', search);
    if (onlyInStock) params.set('stock', '1');
    if (priceMin) params.set('min', priceMin);
    if (priceMax) params.set('max', priceMax);
    if (sortBy !== 'name_asc') params.set('sort', sortBy);
    if (selectedBrand) params.set('marka', selectedBrand);
    if (deliveryMode) params.set('dostawa', deliveryMode);
    const qs = params.toString();
    router.replace(`?${qs}`, { scroll: false });
  }, [selectedCategory, search, onlyInStock, priceMin, priceMax, sortBy, selectedBrand, deliveryMode, router]);

  // ── Derived structures ──────────────────────────────────────────────────
  const tree = useMemo(() => buildTree(categories), [categories]);

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

  // Products per category, descendants included — the counts next to tree nodes.
  const categoryCounts = useMemo(() => {
    const direct = new Map<number, number>();
    for (const p of products) {
      if (p.category_id === null) continue;
      direct.set(p.category_id, (direct.get(p.category_id) ?? 0) + 1);
    }
    const total = new Map<number, number>();
    for (const c of categories) {
      let n = direct.get(c.id) ?? 0;
      for (const d of allDescendants.get(c.id) ?? []) n += direct.get(d) ?? 0;
      total.set(c.id, n);
    }
    return total;
  }, [products, categories, allDescendants]);

  // Use reduce instead of spread — Math.min/max(...arr) throws on very large arrays
  const priceRange = useMemo(() => {
    const prices = products
      .map(p => p.price)
      .filter((p): p is number => p !== null && p > 0);
    if (prices.length === 0) return { min: 0, max: 9999 };
    return {
      min: Math.floor(prices.reduce((a, b) => (b < a ? b : a), Infinity)),
      max: Math.ceil(prices.reduce((a, b) => (b > a ? b : a), -Infinity)),
    };
  }, [products]);

  // ── Available spec filters ──────────────────────────────────────────────
  // Computed from products in selected category that match category/price/stock/search
  // (but NOT the spec filter itself — so options stay stable as you refine).
  // Only shows keys with ≥2 distinct values (single-value keys are unfilterable).
  const availableSpecs = useMemo(() => {
    if (selectedCategory === null) return [];

    const q = search.trim().toLowerCase();
    const pMin = priceMin !== '' ? parseFloat(priceMin) : null;
    const pMax = priceMax !== '' ? parseFloat(priceMax) : null;

    const desc = allDescendants.get(selectedCategory) ?? [];
    const catIds = new Set([selectedCategory, ...desc]);

    const base = products.filter(p => {
      if (!catIds.has(p.category_id as number)) return false;
      if (q && !p.name.toLowerCase().includes(q) && !(p.sku?.toLowerCase().includes(q) ?? false)) return false;
      if (onlyInStock && p.stock <= 0) return false;
      if (pMin !== null && (p.price === null || p.price < pMin)) return false;
      if (pMax !== null && (p.price === null || p.price > pMax)) return false;
      return true;
    });

    const keyValues = new Map<string, Map<string, number>>();
    for (const p of base) {
      if (!p.features) continue;
      for (const [k, v] of Object.entries(p.features)) {
        if (!keyValues.has(k)) keyValues.set(k, new Map());
        const counts = keyValues.get(k)!;
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
    }

    return Array.from(keyValues.entries())
      .filter(([, vals]) => vals.size >= 2)
      .sort((a, b) => a[0].localeCompare(b[0], 'pl'))
      .map(([key, valMap]) => ({
        key,
        values: Array.from(valMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0], 'pl'))
          .map(([val, count]) => ({ val, count })),
      }));
  }, [products, selectedCategory, allDescendants, search, onlyInStock, priceMin, priceMax]);

  // ── Available brands ─────────────────────────────────────────────────────
  // Universal filter (HA-2.10) — unlike spec filters, shown shop-wide, not
  // gated on a selected category. Narrowed by every other active filter
  // except brand itself, so the currently selected brand never disappears.
  const availableBrands = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pMin = priceMin !== '' ? parseFloat(priceMin) : null;
    const pMax = priceMax !== '' ? parseFloat(priceMax) : null;
    const desc = selectedCategory !== null ? (allDescendants.get(selectedCategory) ?? []) : [];
    const catIds = selectedCategory !== null ? new Set([selectedCategory, ...desc]) : null;

    const counts = new Map<string, number>();
    for (const p of products) {
      if (!p.brand) continue;
      if (catIds && !catIds.has(p.category_id as number)) continue;
      if (q && !p.name.toLowerCase().includes(q) && !(p.sku?.toLowerCase().includes(q) ?? false)) continue;
      if (onlyInStock && p.stock <= 0) continue;
      if (pMin !== null && (p.price === null || p.price < pMin)) continue;
      if (pMax !== null && (p.price === null || p.price > pMax)) continue;
      if (deliveryMode === 'wysylka' && mustPickup(p)) continue;
      if (deliveryMode === 'odbior' && !mustPickup(p)) continue;
      counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'pl'))
      .map(([brand, count]) => ({ brand, count }));
  }, [products, selectedCategory, allDescendants, search, onlyInStock, priceMin, priceMax, deliveryMode]);

  // ── Filter + sort in one memo ───────────────────────────────────────────
  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pMin = priceMin !== '' ? parseFloat(priceMin) : null;
    const pMax = priceMax !== '' ? parseFloat(priceMax) : null;
    const activeSpecEntries = Object.entries(selectedSpecs).filter(([, vals]) => vals.length > 0);

    const filtered = products.filter(p => {
      if (selectedCategory !== null) {
        const desc = allDescendants.get(selectedCategory) ?? [];
        const ids = new Set([selectedCategory, ...desc]);
        if (!ids.has(p.category_id as number)) return false;
      }
      if (q && !p.name.toLowerCase().includes(q) && !(p.sku?.toLowerCase().includes(q) ?? false)) {
        return false;
      }
      if (onlyInStock && p.stock <= 0) return false;
      if (pMin !== null && (p.price === null || p.price < pMin)) return false;
      if (pMax !== null && (p.price === null || p.price > pMax)) return false;
      if (selectedBrand && p.brand !== selectedBrand) return false;
      if (deliveryMode === 'wysylka' && mustPickup(p)) return false;
      if (deliveryMode === 'odbior' && !mustPickup(p)) return false;
      // Spec filter: OR within key, AND between keys
      for (const [key, selectedValues] of activeSpecEntries) {
        const specVal = p.features?.[key];
        if (specVal === undefined || !selectedValues.includes(specVal)) return false;
      }
      return true;
    });

    switch (sortBy) {
      case 'name_desc':
        return [...filtered].sort((a, b) => b.name.localeCompare(a.name, 'pl'));
      case 'price_asc':
        return [...filtered].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      case 'price_desc':
        return [...filtered].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
      case 'newest':
        return [...filtered].sort((a, b) => b.id - a.id);
      default:
        return filtered;
    }
  }, [products, selectedCategory, search, allDescendants, onlyInStock, priceMin, priceMax, sortBy, selectedSpecs, selectedBrand, deliveryMode]);

  const totalPages = Math.ceil(filteredAndSorted.length / PAGE_SIZE);
  const paginated = filteredAndSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Scroll to the toolbar (top of the product area) on filter/page change
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    toolbarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [filteredAndSorted, page]);

  // ── Actions ─────────────────────────────────────────────────────────────
  function selectCategory(id: number | null) {
    setSelectedCategory(id);
    setSelectedSpecs({}); // specs are category-specific — reset on category change
    setPage(1);
  }

  function clearAllFilters() {
    setSearchInput('');
    setSelectedCategory(null);
    setOnlyInStock(false);
    setPriceMinInput('');
    setPriceMaxInput('');
    setSortBy('name_asc');
    setSelectedSpecs({});
    setSelectedBrand(null);
    setDeliveryMode(null);
    setPage(1);
  }

  // Sidebar "Wyczyść filtry" — keeps category, query and sort
  function clearNonCategoryFilters() {
    setOnlyInStock(false);
    setPriceMinInput('');
    setPriceMaxInput('');
    setSelectedSpecs({});
    setSelectedBrand(null);
    setDeliveryMode(null);
    setPage(1);
  }

  function toggleSpec(key: string, val: string) {
    setSelectedSpecs(prev => {
      const current = prev[key] ?? [];
      const next = current.includes(val)
        ? current.filter(v => v !== val)
        : [...current, val];
      return { ...prev, [key]: next };
    });
    setPage(1);
  }

  function clearSpec(key: string) {
    setSelectedSpecs(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setPage(1);
  }

  const filters: FilterState = { onlyInStock, deliveryMode, priceMinInput, priceMaxInput, selectedBrand, selectedSpecs };
  const actions: FilterActions = {
    toggleStock: () => { setOnlyInStock(v => !v); setPage(1); },
    setDeliveryMode: mode => { setDeliveryMode(mode); setPage(1); },
    setPriceMin: v => { setPriceMinInput(v); setPage(1); },
    setPriceMax: v => { setPriceMaxInput(v); setPage(1); },
    setBrand: brand => { setSelectedBrand(brand); setPage(1); },
    toggleSpec,
    clearSpec,
  };
  const options: FilterOptions = { priceRange, availableBrands, availableSpecs };

  // Badge counts
  const activeSpecCount = Object.values(selectedSpecs).filter(vals => vals.length > 0).length;
  const activeFilterCount =
    [onlyInStock, priceMinInput !== '' || priceMaxInput !== '', selectedBrand !== null, deliveryMode !== null]
      .filter(Boolean).length + activeSpecCount;

  // ── Active-filter chips — one per active filter, category and query included ──
  const chips: ActiveChip[] = [];
  if (selectedCategory !== null) {
    const cat = categories.find(c => c.id === selectedCategory);
    if (cat) chips.push({ id: 'cat', label: categoryDisplayName(cat.name), onRemove: () => selectCategory(null) });
  }
  if (searchInput.trim()) {
    chips.push({ id: 'q', label: `Szukaj: „${searchInput.trim()}”`, onRemove: () => { setSearchInput(''); setPage(1); } });
  }
  if (onlyInStock) chips.push({ id: 'stock', label: 'Tylko dostępne', onRemove: actions.toggleStock });
  if (deliveryMode) {
    chips.push({ id: 'dostawa', label: DELIVERY_MODE_LABELS[deliveryMode], onRemove: () => actions.setDeliveryMode(null) });
  }
  if (priceMinInput !== '' || priceMaxInput !== '') {
    const label =
      priceMinInput !== '' && priceMaxInput !== '' ? `Cena: ${priceMinInput}–${priceMaxInput} zł`
      : priceMinInput !== '' ? `Cena: od ${priceMinInput} zł`
      : `Cena: do ${priceMaxInput} zł`;
    chips.push({ id: 'cena', label, onRemove: () => { setPriceMinInput(''); setPriceMaxInput(''); setPage(1); } });
  }
  if (selectedBrand) chips.push({ id: 'marka', label: `Marka: ${selectedBrand}`, onRemove: () => actions.setBrand(null) });
  for (const [key, vals] of Object.entries(selectedSpecs)) {
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
                totalCount={products.length}
                selectedCategory={selectedCategory}
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
          <div className="flex-1 min-w-0">
            <div ref={toolbarRef} className="scroll-mt-24 mb-6">
              <ListingToolbar
                count={filteredAndSorted.length}
                searchInput={searchInput}
                onSearchChange={v => { setSearchInput(v); setPage(1); }}
                sortBy={sortBy}
                onSortChange={v => { setSortBy(v); setPage(1); }}
              />
            </div>

            <ActiveFilterChips chips={chips} onClearAll={clearAllFilters} />

            {paginated.length === 0 ? (
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
                  {paginated.map(p => (
                    <ProductCard key={p.id} product={p} categories={categories} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav aria-label="Paginacja" className="flex items-center justify-center gap-2 mt-16 pt-8 border-t border-white/10">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
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
                              onClick={() => setPage(n as number)}
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
                      onClick={() => setPage(p => p + 1)}
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

      {/* Mobile (< 1024 px): sticky bottom bar + bottom sheet — after STOP 1 approval (HA-2.30) */}
    </>
  );
}
