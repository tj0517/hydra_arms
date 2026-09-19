'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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

type SortKey = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'newest';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name_asc',   label: 'NAZWA A→Z' },
  { value: 'name_desc',  label: 'NAZWA Z→A' },
  { value: 'price_asc',  label: 'CENA ↑' },
  { value: 'price_desc', label: 'CENA ↓' },
  { value: 'newest',     label: 'NAJNOWSZE' },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const PAGE_SIZE = 24;

export default function SklepClient({ products, categories }: SklepClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── State — initialized from URL params on mount ────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<number | null>(
    () => { const v = searchParams.get('cat'); return v ? parseInt(v, 10) : null; }
  );
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') ?? '');
  const [onlyInStock, setOnlyInStock] = useState(() => searchParams.get('stock') === '1');
  const [priceMinInput, setPriceMinInput] = useState(() => searchParams.get('min') ?? '');
  const [priceMaxInput, setPriceMaxInput] = useState(() => searchParams.get('max') ?? '');
  const [sortBy, setSortBy] = useState<SortKey>(
    () => (searchParams.get('sort') as SortKey | null) ?? 'name_asc'
  );
  // selectedSpecs: { [specKey]: string[] } — multi-select per key, OR within key, AND between keys
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string[]>>({});
  const [page, setPage] = useState(1);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [desktopPanelOpen, setDesktopPanelOpen] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sortOpen]);

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
    const qs = params.toString();
    router.replace(`?${qs}`, { scroll: false });
  }, [selectedCategory, search, onlyInStock, priceMin, priceMax, sortBy, router]);

  // ── Derived structures ──────────────────────────────────────────────────
  const tree = useMemo(() => buildTree(categories), [categories]);

  const activeParent = useMemo(
    () => tree.find(({ category: parent, children }) =>
      parent.id === selectedCategory || children.some(c => c.id === selectedCategory)
    ) ?? null,
    [tree, selectedCategory]
  );

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
  }, [products, selectedCategory, search, allDescendants, onlyInStock, priceMin, priceMax, sortBy, selectedSpecs]);

  const totalPages = Math.ceil(filteredAndSorted.length / PAGE_SIZE);
  const paginated = filteredAndSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Scroll to the toolbar (top of the product area) on filter/page change
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    toolbarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [filteredAndSorted, page]);

  // Badge counts
  const activeSpecCount = Object.values(selectedSpecs).filter(vals => vals.length > 0).length;
  const activeFilterCount =
    [onlyInStock, priceMinInput !== '', priceMaxInput !== ''].filter(Boolean).length + activeSpecCount;

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
    setPage(1);
  }

  // Used by the empty-state button — keeps category so user stays in context
  function clearNonCategoryFilters() {
    setSearchInput('');
    setOnlyInStock(false);
    setPriceMinInput('');
    setPriceMaxInput('');
    setSortBy('name_asc');
    setSelectedSpecs({});
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

  const hasAnyFilter =
    selectedCategory !== null ||
    searchInput !== '' ||
    activeFilterCount > 0 ||
    sortBy !== 'name_asc';

  // ── Sub-components ──────────────────────────────────────────────────────
  const CategoryPill = ({
    active,
    onClick,
    children,
    small = false,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    small?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={`flex-shrink-0 whitespace-nowrap border font-[var(--font-mono)] tracking-[0.15em] transition-colors ${
        small ? 'px-3 py-2 text-[10px]' : 'px-4 py-2.5 text-[11px]'
      } ${
        active
          ? 'border-accent text-accent bg-accent/5'
          : 'border-white/12 text-text-dim hover:border-white/25 hover:text-white'
      }`}
    >
      {children}
    </button>
  );

  const CategoryBar = (
    <div className="mb-8">
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <CategoryPill active={selectedCategory === null} onClick={() => selectCategory(null)}>
          WSZYSTKIE
        </CategoryPill>
        {tree.map(({ category: parent, children }) => {
          const isParentActive = selectedCategory === parent.id;
          const hasActiveChild = children.some(c => c.id === selectedCategory);
          return (
            <CategoryPill
              key={parent.id}
              active={isParentActive || hasActiveChild}
              onClick={() => selectCategory(parent.id)}
            >
              {catLabel(parent.name).toUpperCase()}
            </CategoryPill>
          );
        })}
      </div>

      {activeParent && activeParent.children.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-3 pb-1 border-t border-white/5">
          <span className="flex-shrink-0 font-[var(--font-mono)] text-[9px] text-white/20 tracking-widest pr-1">▸</span>
          {activeParent.children.map(child => (
            <CategoryPill
              key={child.id}
              small
              active={selectedCategory === child.id}
              onClick={() => selectCategory(child.id)}
            >
              {catLabel(child.name)}
            </CategoryPill>
          ))}
        </div>
      )}
    </div>
  );

  // Reusable checkbox row used in both stock filter and spec filters
  const CheckRow = ({
    checked,
    onToggle,
    label,
    badge,
  }: {
    checked: boolean;
    onToggle: () => void;
    label: string;
    badge?: string;
  }) => (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <div
        onClick={onToggle}
        className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 transition-colors ${
          checked ? 'border-accent bg-accent/10' : 'border-white/20 group-hover:border-white/40'
        }`}
      >
        {checked && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="currentColor" strokeWidth="1.2" className="text-accent" />
          </svg>
        )}
      </div>
      <span
        onClick={onToggle}
        className={`font-[var(--font-mono)] text-[10px] tracking-[0.1em] transition-colors select-none flex-1 ${
          checked ? 'text-white' : 'text-text-dim group-hover:text-white/70'
        }`}
      >
        {label}
        {badge !== undefined && (
          <span className="text-white/25 ml-1">({badge})</span>
        )}
      </span>
    </label>
  );

  const FiltersPanel = (
    <div className="space-y-5">
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
              setPriceMinInput('');
              setPriceMaxInput('');
              setSelectedSpecs({});
              setPage(1);
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
        <CheckRow
          checked={onlyInStock}
          onToggle={() => { setOnlyInStock(v => !v); setPage(1); }}
          label="Tylko dostępne"
        />
      </div>

      {/* Price range */}
      <div>
        <p className="font-[var(--font-mono)] text-[10px] text-text-dim/40 tracking-[0.3em] uppercase mb-2.5">Cena (PLN)</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={priceMinInput}
            onChange={e => { setPriceMinInput(e.target.value); setPage(1); }}
            placeholder={String(priceRange.min)}
            min={0}
            className="w-full bg-transparent border border-white/15 px-2 py-1.5 font-[var(--font-mono)] text-[11px] text-white placeholder-text-dim/30 focus:outline-none focus:border-accent/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="font-[var(--font-mono)] text-[10px] text-text-dim/30 flex-shrink-0">—</span>
          <input
            type="number"
            value={priceMaxInput}
            onChange={e => { setPriceMaxInput(e.target.value); setPage(1); }}
            placeholder={String(priceRange.max)}
            min={0}
            className="w-full bg-transparent border border-white/15 px-2 py-1.5 font-[var(--font-mono)] text-[11px] text-white placeholder-text-dim/30 focus:outline-none focus:border-accent/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        {(priceMinInput !== '' || priceMaxInput !== '') && (
          <button
            onClick={() => { setPriceMinInput(''); setPriceMaxInput(''); setPage(1); }}
            className="mt-1.5 font-[var(--font-mono)] text-[9px] text-text-dim/40 hover:text-accent transition-colors tracking-widest"
          >
            WYCZYŚĆ CENĘ
          </button>
        )}
      </div>

      {/* Spec filters — auto-derived from products in selected category */}
      {availableSpecs.length > 0 && (
        <>
          <div className="h-px bg-white/5" />
          <div className="space-y-5">
            {availableSpecs.map(({ key, values }) => {
              const selected = selectedSpecs[key] ?? [];
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="font-[var(--font-mono)] text-[10px] text-text-dim/40 tracking-[0.3em] uppercase">
                      {key}
                    </p>
                    {selected.length > 0 && (
                      <button
                        onClick={() => clearSpec(key)}
                        className="font-[var(--font-mono)] text-[9px] text-text-dim/40 hover:text-accent transition-colors tracking-widest"
                      >
                        WYCZYŚĆ
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {values.map(({ val, count }) => (
                      <CheckRow
                        key={val}
                        checked={selected.includes(val)}
                        onToggle={() => toggleSpec(key, val)}
                        label={val}
                        badge={String(count)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Hint when no category selected */}
      {selectedCategory === null && availableSpecs.length === 0 && (
        <p className="font-[var(--font-mono)] text-[9px] text-text-dim/30 tracking-[0.15em] leading-relaxed border border-white/5 p-3">
          Wybierz kategorię, aby zobaczyć filtry specyfikacji
        </p>
      )}
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <CartDrawer />

      <div className="max-w-[1400px] mx-auto px-[clamp(32px,5vw,64px)] py-12">

        {desktopPanelOpen && <div className="hidden md:block">{CategoryBar}</div>}

        {/* Toolbar */}
        <div ref={toolbarRef} className="flex items-center justify-between gap-4 mb-8 pb-5 border-b border-white/10 scroll-mt-24">
          <div className="flex items-center gap-3">
            {/* Mobile: categories + filters toggle */}
            <button
              onClick={() => setMobilePanelOpen(v => !v)}
              className="md:hidden font-[var(--font-mono)] text-[10px] tracking-widest border border-white/15 px-3 py-2 text-text-dim hover:border-accent/40 hover:text-accent transition-colors flex items-center gap-2"
            >
              {mobilePanelOpen ? '[ ZAMKNIJ ]' : '[ KATEGORIE / FILTRY ]'}
              {(activeFilterCount > 0 || selectedCategory !== null) && (
                <span className="bg-accent text-bg text-[9px] px-1.5 py-0.5 leading-none">
                  {activeFilterCount + (selectedCategory !== null ? 1 : 0)}
                </span>
              )}
            </button>
            {/* Desktop: category bar toggle */}
            <button
              onClick={() => setDesktopPanelOpen(v => !v)}
              className="hidden md:flex font-[var(--font-mono)] text-[10px] tracking-widest border border-white/15 px-3 py-2 text-text-dim hover:border-accent/40 hover:text-accent transition-colors items-center gap-2"
            >
              {desktopPanelOpen ? '[ UKRYJ KATEGORIE ]' : '[ POKAŻ KATEGORIE ]'}
              {!desktopPanelOpen && selectedCategory !== null && (
                <span className="bg-accent text-bg text-[9px] px-1.5 py-0.5 leading-none">1</span>
              )}
            </button>
            <span className="hidden md:inline font-[var(--font-mono)] text-[10px] text-text-dim tracking-widest">
              {filteredAndSorted.length} PRODUKTÓW
            </span>
          </div>

          <div className="flex items-center gap-3">
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

            {/* Sort */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => setSortOpen(o => !o)}
                className={`flex items-center gap-2 border font-[var(--font-mono)] text-[10px] tracking-widest px-3 py-2.5 transition-colors ${
                  sortOpen
                    ? 'border-accent/40 text-white'
                    : 'border-white/15 text-text-dim hover:border-white/25 hover:text-white'
                }`}
              >
                <span className="text-text-dim/50">[</span>
                <span className={sortBy !== 'name_asc' ? 'text-accent' : ''}>
                  {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                </span>
                <span className="text-text-dim/50">]</span>
                <svg
                  className={`shrink-0 text-text-dim/40 transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`}
                  width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
                >
                  <path d="M2 4l4 4 4-4"/>
                </svg>
              </button>

              {sortOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 border border-white/15 bg-[#0a0b0a] min-w-full">
                  {SORT_OPTIONS.map((opt, i) => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortBy(opt.value); setPage(1); setSortOpen(false); }}
                      className={`w-full text-left flex items-center justify-between gap-4 px-3 py-2 font-[var(--font-mono)] text-[10px] tracking-widest transition-colors ${
                        i < SORT_OPTIONS.length - 1 ? 'border-b border-white/5' : ''
                      } ${
                        sortBy === opt.value
                          ? 'text-accent bg-accent/5'
                          : 'text-text-dim hover:text-white hover:bg-white/[0.03]'
                      }`}
                    >
                      {opt.label}
                      {sortBy === opt.value && <span className="text-accent text-[9px]">▸</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={e => { setSearchInput(e.target.value); setPage(1); }}
                placeholder="SZUKAJ..."
                className="bg-transparent border border-white/15 px-3 py-2.5 font-[var(--font-mono)] text-xs text-white placeholder-text-dim/40 tracking-widest focus:outline-none focus:border-accent/40 transition-colors w-24 sm:w-48 md:w-64"
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(''); setPage(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-accent transition-colors font-[var(--font-mono)] text-xs"
                >×</button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: categories + filters panel */}
        {mobilePanelOpen && (
          <div className="md:hidden mb-6 border border-white/10 p-5 bg-bg/95 space-y-5">
            <div>
              <p className="font-[var(--font-mono)] text-[11px] text-text-dim/60 tracking-[0.25em] uppercase pb-2 mb-3 border-b border-white/8">
                Kategorie
              </p>
              {CategoryBar}
            </div>
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

          {/* Sidebar — filters (always visible on desktop) */}
          <aside className="hidden md:block w-60 flex-shrink-0">
            <div className="sticky top-24">
              {FiltersPanel}
            </div>
          </aside>

          {/* Product grid */}
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
                    onClick={clearNonCategoryFilters}
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
                      <span className="hidden sm:inline">← POPRZEDNIA</span>
                      <span className="sm:hidden">←</span>
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
                      <span className="hidden sm:inline">NASTĘPNA →</span>
                      <span className="sm:hidden">→</span>
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
