'use client';

/**
 * Desktop filters sidebar (HA-2.30): category tree + accordion filter sections.
 * Stateless with respect to filters — SklepClient owns the state and the URL;
 * this component only renders and calls back. `CategoryTree` and
 * `FilterSections` are exported so MobileFilterSheet shows the same set.
 *
 * Typography: labels and clickable text in the main font (Outfit) at 13–14 px,
 * full text / text-dim colours. Mono + tracking only on metadata: section
 * headers and counts, never below 11 px. Accent green only on the active state.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { categoryDisplayName } from '@/lib/shop/categoryLabel';
import {
  DELIVERY_MODE_LABELS,
  type CategoryTreeNode,
  type DeliveryMode,
  type FilterActions,
  type FilterOptions,
  type FilterState,
} from './listingFilters';

// ── Small building blocks ───────────────────────────────────────────────────

/** Metadata count "(12)" — mono is allowed here (number, not a label). */
function Count({ value }: { value: number }) {
  return (
    <span className="font-[var(--font-mono)] text-[11px] text-text-dim/60 tabular-nums">({value})</span>
  );
}

function ChevronIcon({ open, className = '' }: { open: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
      className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${className}`}
    >
      <path d="M2 4l4 4 4-4" />
    </svg>
  );
}

/** Checkbox row: a real <input type="checkbox"> for keyboard/screen readers, drawn as a 16 px box. */
function CheckRow({
  checked,
  onToggle,
  label,
  count,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  count?: number;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group py-1 min-h-[28px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent ${
          checked ? 'border-accent bg-accent' : 'border-white/30 group-hover:border-white/60'
        }`}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#0A0A0B" strokeWidth="1.8" />
          </svg>
        )}
      </span>
      <span className={`text-[13px] leading-snug flex-1 flex items-center gap-1.5 ${checked ? 'text-text' : 'text-text-dim group-hover:text-text'}`}>
        <span className="min-w-0 break-words">{label}</span>
        {count !== undefined && <Count value={count} />}
      </span>
    </label>
  );
}

/** Accordion section — header in mono (metadata), body in the main font. */
function AccordionSection({
  title,
  activeCount = 0,
  defaultOpen = false,
  onClear,
  children,
}: {
  title: string;
  activeCount?: number;
  defaultOpen?: boolean;
  onClear?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = `filter-section-${title.toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/gi, '-')}`;
  return (
    <div className="border-b border-white/10">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 py-3.5 text-left group"
      >
        <span className="flex items-center gap-2">
          <span className="font-[var(--font-mono)] text-[11px] tracking-[0.2em] uppercase text-text-dim group-hover:text-text transition-colors">
            {title}
          </span>
          {activeCount > 0 && (
            <span className="font-[var(--font-mono)] text-[11px] text-accent tabular-nums">({activeCount})</span>
          )}
        </span>
        <ChevronIcon open={open} className="text-text-dim" />
      </button>
      {open && (
        <div id={id} className="pb-4">
          {children}
          {onClear && activeCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="mt-2 text-[13px] text-text-dim hover:text-text underline underline-offset-4 decoration-white/30 transition-colors"
            >
              Wyczyść
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Price: dual-handle slider + two inputs ──────────────────────────────────

const RANGE_INPUT =
  'absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none m-0 ' +
  '[&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent ' +
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto ' +
  '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full ' +
  '[&::-webkit-slider-thumb]:bg-text [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-bg ' +
  '[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(255,255,255,0.3)] ' +
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 ' +
  '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-text [&::-moz-range-thumb]:border-2 ' +
  '[&::-moz-range-thumb]:border-bg [&::-moz-range-thumb]:cursor-pointer ' +
  'focus-visible:outline-none [&:focus-visible::-webkit-slider-thumb]:bg-accent [&:focus-visible::-moz-range-thumb]:bg-accent';

const PRICE_INPUT =
  'w-full min-w-0 bg-transparent border border-white/20 px-2.5 py-2 text-[13px] text-text ' +
  'placeholder:text-text-dim/60 focus:outline-none focus:border-white/60 transition-colors tabular-nums ' +
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

function PriceFilter({
  minInput,
  maxInput,
  range,
  onMin,
  onMax,
}: {
  minInput: string;
  maxInput: string;
  range: { min: number; max: number };
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}) {
  const span = Math.max(range.max - range.min, 1);
  const parsedMin = minInput !== '' ? Number(minInput) : NaN;
  const parsedMax = maxInput !== '' ? Number(maxInput) : NaN;
  const lo = Number.isFinite(parsedMin) ? Math.min(Math.max(parsedMin, range.min), range.max) : range.min;
  const hi = Number.isFinite(parsedMax) ? Math.min(Math.max(parsedMax, range.min), range.max) : range.max;
  const loPct = ((lo - range.min) / span) * 100;
  const hiPct = ((hi - range.min) / span) * 100;

  // Dragging a handle onto its own bound means "no bound" → '' keeps the URL clean.
  const setLo = (v: number) => onMin(v <= range.min ? '' : String(Math.min(v, hi)));
  const setHi = (v: number) => onMax(v >= range.max ? '' : String(Math.max(v, lo)));

  return (
    <div className="space-y-4 pt-1">
      <div className="relative h-5 mx-2" aria-hidden={false}>
        <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-px bg-white/25" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-accent"
          style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }}
        />
        <input
          type="range"
          aria-label="Cena od"
          min={range.min} max={range.max} step={1} value={lo}
          onChange={e => setLo(Number(e.target.value))}
          className={RANGE_INPUT}
          style={{ zIndex: lo >= range.max - 1 ? 3 : 2 }}
        />
        <input
          type="range"
          aria-label="Cena do"
          min={range.min} max={range.max} step={1} value={hi}
          onChange={e => setHi(Number(e.target.value))}
          className={RANGE_INPUT}
          style={{ zIndex: 2 }}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="flex-1 min-w-0">
          <span className="sr-only">Cena od (PLN)</span>
          <input
            type="number" inputMode="numeric" min={0}
            value={minInput}
            onChange={e => onMin(e.target.value)}
            placeholder={String(range.min)}
            className={PRICE_INPUT}
          />
        </label>
        <span className="text-[13px] text-text-dim flex-shrink-0">–</span>
        <label className="flex-1 min-w-0">
          <span className="sr-only">Cena do (PLN)</span>
          <input
            type="number" inputMode="numeric" min={0}
            value={maxInput}
            onChange={e => onMax(e.target.value)}
            placeholder={String(range.max)}
            className={PRICE_INPUT}
          />
        </label>
        <span className="text-[13px] text-text-dim flex-shrink-0">zł</span>
      </div>
    </div>
  );
}

// ── Brand: "show more" after 6, search box after 8 ──────────────────────────

const BRAND_VISIBLE = 6;
const BRAND_SEARCH_FROM = 8;

function BrandFilter({
  brands,
  selected,
  onSelect,
}: {
  brands: { brand: string; count: number }[];
  selected: string | null;
  onSelect: (brand: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const matching = useMemo(
    () => (q ? brands.filter(b => b.brand.toLowerCase().includes(q)) : brands),
    [brands, q],
  );
  const showAll = expanded || q !== '';
  const visible = showAll ? matching : matching.slice(0, BRAND_VISIBLE);
  // The selected brand never disappears behind "show more".
  const rows =
    selected && !visible.some(b => b.brand === selected)
      ? [...visible, ...matching.filter(b => b.brand === selected)]
      : visible;
  const hiddenCount = matching.length - visible.length;

  return (
    <div className="space-y-1">
      {brands.length >= BRAND_SEARCH_FROM && (
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Szukaj marki"
          aria-label="Szukaj marki"
          className="w-full mb-2 bg-transparent border border-white/20 px-2.5 py-2 text-[13px] text-text placeholder:text-text-dim/60 focus:outline-none focus:border-white/60 transition-colors"
        />
      )}
      {rows.map(({ brand, count }) => (
        <CheckRow
          key={brand}
          checked={selected === brand}
          onToggle={() => onSelect(selected === brand ? null : brand)}
          label={brand}
          count={count}
        />
      ))}
      {rows.length === 0 && (
        <p className="text-[13px] text-text-dim py-1">Brak marek pasujących do „{query}”.</p>
      )}
      {!showAll && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 text-[13px] text-text-dim hover:text-text underline underline-offset-4 decoration-white/30 transition-colors"
        >
          Pokaż więcej ({hiddenCount})
        </button>
      )}
      {expanded && q === '' && brands.length > BRAND_VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 text-[13px] text-text-dim hover:text-text underline underline-offset-4 decoration-white/30 transition-colors"
        >
          Pokaż mniej
        </button>
      )}
    </div>
  );
}

// ── Category tree ───────────────────────────────────────────────────────────

export interface CategoryTreeProps {
  tree: CategoryTreeNode[];
  /** Products per category, descendants included; missing id = 0. */
  counts: Map<number, number>;
  totalCount: number;
  selectedCategory: number | null;
  onSelectCategory: (id: number | null) => void;
}

/**
 * Two-level tree. A root expands on its chevron (and automatically when it or
 * one of its children is active); clicking a name selects the category.
 */
export function CategoryTree({ tree, counts, totalCount, selectedCategory, onSelectCategory }: CategoryTreeProps) {
  const [manuallyExpanded, setManuallyExpanded] = useState<Record<number, boolean>>({});

  const activeRootId = useMemo(() => {
    if (selectedCategory === null) return null;
    const node = tree.find(
      ({ category, children }) => category.id === selectedCategory || children.some(c => c.id === selectedCategory),
    );
    return node?.category.id ?? null;
  }, [tree, selectedCategory]);

  const isExpanded = (rootId: number) => manuallyExpanded[rootId] ?? rootId === activeRootId;

  const rowClass = (active: boolean) =>
    `flex-1 min-w-0 text-left flex items-center gap-1.5 py-1.5 text-[14px] leading-snug transition-colors ${
      active ? 'text-accent' : 'text-text hover:text-accent'
    }`;

  return (
    <nav aria-label="Kategorie" data-testid="category-tree">
      <ul className="space-y-0.5">
        <li>
          <button
            type="button"
            aria-current={selectedCategory === null ? 'page' : undefined}
            onClick={() => onSelectCategory(null)}
            className={`${rowClass(selectedCategory === null)} w-full pl-2 border-l-2 ${
              selectedCategory === null ? 'border-accent' : 'border-transparent'
            }`}
          >
            <span>Wszystkie</span>
            <Count value={totalCount} />
          </button>
        </li>
        {tree.map(({ category: root, children }) => {
          const rootActive = selectedCategory === root.id;
          const inPath = activeRootId === root.id;
          const expanded = children.length > 0 && isExpanded(root.id);
          return (
            <li key={root.id}>
              <div
                className={`flex items-stretch border-l-2 ${inPath ? 'border-accent' : 'border-transparent'}`}
              >
                <button
                  type="button"
                  aria-current={rootActive ? 'page' : undefined}
                  onClick={() => {
                    onSelectCategory(root.id);
                    if (children.length > 0) setManuallyExpanded(m => ({ ...m, [root.id]: true }));
                  }}
                  className={`${rowClass(rootActive)} pl-2 ${inPath && !rootActive ? 'text-text' : ''}`}
                >
                  <span className="min-w-0 break-words">{categoryDisplayName(root.name)}</span>
                  <Count value={counts.get(root.id) ?? 0} />
                </button>
                {children.length > 0 && (
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-label={`${expanded ? 'Zwiń' : 'Rozwiń'}: ${categoryDisplayName(root.name)}`}
                    onClick={() => setManuallyExpanded(m => ({ ...m, [root.id]: !expanded }))}
                    className="w-8 flex items-center justify-center text-text-dim hover:text-text transition-colors"
                  >
                    <ChevronIcon open={expanded} />
                  </button>
                )}
              </div>
              {expanded && (
                <ul className="ml-2 border-l border-white/10 pl-3 mb-1.5">
                  {children.map(child => {
                    const active = selectedCategory === child.id;
                    return (
                      <li key={child.id}>
                        <button
                          type="button"
                          aria-current={active ? 'page' : undefined}
                          onClick={() => onSelectCategory(child.id)}
                          className={`${rowClass(active)} w-full text-[13px] ${active ? 'text-accent' : 'text-text-dim hover:text-accent'}`}
                        >
                          <span className="min-w-0 break-words">{categoryDisplayName(child.name)}</span>
                          <Count value={counts.get(child.id) ?? 0} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ── Filter sections (shared by sidebar and mobile sheet) ────────────────────

export interface FilterSectionsProps {
  filters: FilterState;
  actions: FilterActions;
  options: FilterOptions;
  /** Null when no category is selected — spec filters need one. */
  selectedCategory: number | null;
}

export function FilterSections({ filters, actions, options, selectedCategory }: FilterSectionsProps) {
  const priceActive = (filters.priceMinInput !== '' ? 1 : 0) + (filters.priceMaxInput !== '' ? 1 : 0);
  return (
    <div>
      <AccordionSection title="Dostępność" defaultOpen activeCount={filters.onlyInStock ? 1 : 0}>
        <CheckRow checked={filters.onlyInStock} onToggle={actions.toggleStock} label="Tylko dostępne" />
      </AccordionSection>

      <AccordionSection
        title="Dostawa"
        defaultOpen
        activeCount={filters.deliveryMode ? 1 : 0}
        onClear={() => actions.setDeliveryMode(null)}
      >
        {(Object.keys(DELIVERY_MODE_LABELS) as DeliveryMode[]).map(mode => (
          <CheckRow
            key={mode}
            checked={filters.deliveryMode === mode}
            onToggle={() => actions.setDeliveryMode(filters.deliveryMode === mode ? null : mode)}
            label={DELIVERY_MODE_LABELS[mode]}
          />
        ))}
      </AccordionSection>

      <AccordionSection
        title="Cena"
        defaultOpen
        activeCount={priceActive > 0 ? 1 : 0}
        onClear={() => { actions.setPriceMin(''); actions.setPriceMax(''); }}
      >
        <PriceFilter
          minInput={filters.priceMinInput}
          maxInput={filters.priceMaxInput}
          range={options.priceRange}
          onMin={actions.setPriceMin}
          onMax={actions.setPriceMax}
        />
      </AccordionSection>

      {options.availableBrands.length > 0 && (
        <AccordionSection
          title="Marka"
          defaultOpen
          activeCount={filters.selectedBrand ? 1 : 0}
          onClear={() => actions.setBrand(null)}
        >
          <BrandFilter brands={options.availableBrands} selected={filters.selectedBrand} onSelect={actions.setBrand} />
        </AccordionSection>
      )}

      {options.availableSpecs.map(({ key, values }) => {
        const selected = filters.selectedSpecs[key] ?? [];
        return (
          <AccordionSection
            key={key}
            title={key}
            activeCount={selected.length}
            onClear={() => actions.clearSpec(key)}
          >
            {values.map(({ val, count }) => (
              <CheckRow
                key={val}
                checked={selected.includes(val)}
                onToggle={() => actions.toggleSpec(key, val)}
                label={val}
                count={count}
              />
            ))}
          </AccordionSection>
        );
      })}

      {selectedCategory === null && options.availableSpecs.length === 0 && (
        <p className="text-[13px] text-text-dim leading-relaxed pt-4">
          Wybierz kategorię, aby zobaczyć filtry specyfikacji.
        </p>
      )}
    </div>
  );
}

// ── Sidebar ─────────────────────────────────────────────────────────────────

export interface FiltersSidebarProps extends CategoryTreeProps, FilterSectionsProps {
  /** Number of active non-category filters, shown next to the "Filtry" header. */
  activeFilterCount: number;
  onClearFilters: () => void;
}

function selectedCategoryName(tree: CategoryTreeNode[], selectedCategory: number | null): string | null {
  if (selectedCategory === null) return 'Wszystkie';
  for (const { category, children } of tree) {
    if (category.id === selectedCategory) return categoryDisplayName(category.name);
    const child = children.find(c => c.id === selectedCategory);
    if (child) return categoryDisplayName(child.name);
  }
  return null;
}

export default function FiltersSidebar({
  tree,
  counts,
  totalCount,
  selectedCategory,
  onSelectCategory,
  filters,
  actions,
  options,
  activeFilterCount,
  onClearFilters,
}: FiltersSidebarProps) {
  // Collapsed by default so the filters stay above the fold; the header still
  // names the active category. `hidden` (not unmount) keeps the tree's expand state.
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const selectedName = selectedCategoryName(tree, selectedCategory);

  return (
    <div className="space-y-8">
      <section aria-labelledby="sidebar-categories-heading">
        <h2 id="sidebar-categories-heading" className={`border-b border-white/10 ${categoriesOpen ? 'mb-2' : ''}`}>
          <button
            type="button"
            aria-expanded={categoriesOpen}
            aria-controls="sidebar-categories-tree"
            onClick={() => setCategoriesOpen(o => !o)}
            className="w-full flex items-center justify-between gap-3 pb-3 text-left group"
          >
            <span className="font-[var(--font-mono)] text-[11px] tracking-[0.25em] uppercase text-text-dim group-hover:text-text transition-colors">
              Kategorie
            </span>
            <span className="flex items-center gap-2 min-w-0">
              {!categoriesOpen && selectedName && (
                <span className={`text-[13px] truncate ${selectedCategory === null ? 'text-text-dim' : 'text-accent'}`}>
                  {selectedName}
                </span>
              )}
              <ChevronIcon open={categoriesOpen} className="text-text-dim" />
            </span>
          </button>
        </h2>
        <div id="sidebar-categories-tree" hidden={!categoriesOpen}>
          <CategoryTree
            tree={tree}
            counts={counts}
            totalCount={totalCount}
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
          />
        </div>
      </section>

      <section aria-labelledby="sidebar-filters-heading">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h2 id="sidebar-filters-heading" className="flex items-center gap-2">
            <span className="font-[var(--font-mono)] text-[11px] tracking-[0.25em] uppercase text-text-dim">Filtry</span>
            {activeFilterCount > 0 && (
              <span className="font-[var(--font-mono)] text-[11px] text-accent tabular-nums">({activeFilterCount})</span>
            )}
          </h2>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-[13px] text-text-dim hover:text-text underline underline-offset-4 decoration-white/30 transition-colors"
            >
              Wyczyść filtry
            </button>
          )}
        </div>
        <FilterSections filters={filters} actions={actions} options={options} selectedCategory={selectedCategory} />
      </section>
    </div>
  );
}
