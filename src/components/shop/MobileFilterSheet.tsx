'use client';

/**
 * Mobile (< 1024 px) filters (HA-2.30): a sticky bottom bar "Filtry (n) · Sortuj"
 * and a full-height bottom sheet with the same category tree and filter
 * sections as the desktop sidebar. Filters apply immediately (same state in
 * SklepClient); "Pokaż N produktów" closes the sheet. A second, short sheet
 * holds the sort options.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { CategoryTree, FilterSections, type CategoryTreeProps, type FilterSectionsProps } from './FiltersSidebar';
import { pluralProducts } from './ListingToolbar';
import { SORT_OPTIONS, type SortKey } from './listingFilters';

export interface MobileFilterSheetProps extends CategoryTreeProps, FilterSectionsProps {
  /** Active filters including the category — the number in "Filtry (n)". */
  activeFilterCount: number;
  resultCount: number;
  sortBy: SortKey;
  onSortChange: (value: SortKey) => void;
  onClearAll: () => void;
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [locked]);
}

function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, onClose]);
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 2l10 10M12 2L2 12" />
    </svg>
  );
}

/** Backdrop + panel. `full` = full-height sheet, otherwise a short one. */
function Sheet({
  open,
  onClose,
  label,
  full,
  testId,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  full: boolean;
  testId: string;
  children: ReactNode;
}) {
  useBodyScrollLock(open);
  useEscape(open, onClose);
  if (!open) return null;
  // Above Nav (z-1000) and CartTrigger (z-500); below CartDrawer (z-9998).
  return (
    <div className="lg:hidden fixed inset-0 z-[1100]">
      <button
        type="button"
        aria-label="Zamknij"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-testid={testId}
        className={`absolute inset-x-0 bottom-0 flex flex-col bg-bg border-t border-white/15 ${
          full ? 'top-0' : 'max-h-[70vh]'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function MobileFilterSheet({
  tree,
  counts,
  totalCount,
  selectedCategory,
  onSelectCategory,
  filters,
  actions,
  options,
  activeFilterCount,
  resultCount,
  sortBy,
  onSortChange,
  onClearAll,
}: MobileFilterSheetProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const currentSort = SORT_OPTIONS.find(o => o.value === sortBy) ?? SORT_OPTIONS[0];

  return (
    <>
      {/* Sticky bottom bar */}
      <div
        data-testid="mobile-filter-bar"
        className="lg:hidden fixed bottom-0 inset-x-0 z-[60] grid grid-cols-2 bg-bg-card border-t border-white/15"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="h-14 flex items-center justify-center gap-2 text-[14px] text-text border-r border-white/15"
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 4h12M4 8h8M6 12h4" />
          </svg>
          <span>Filtry</span>
          {activeFilterCount > 0 && (
            <span className="font-[var(--font-mono)] text-[12px] text-accent tabular-nums">({activeFilterCount})</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSortOpen(true)}
          className="h-14 flex items-center justify-center gap-2 text-[14px] text-text"
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 2v12M5 14l-2.5-2.5M5 14l2.5-2.5M11 14V2M11 2L8.5 4.5M11 2l2.5 2.5" />
          </svg>
          <span>Sortuj</span>
        </button>
      </div>

      {/* Filters sheet — full height */}
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} label="Filtry" full testId="mobile-filter-sheet">
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/10 flex-shrink-0">
          <span className="flex items-center gap-2">
            <span className="font-[var(--font-mono)] text-[11px] tracking-[0.25em] uppercase text-text-dim">Filtry</span>
            {activeFilterCount > 0 && (
              <span className="font-[var(--font-mono)] text-[11px] text-accent tabular-nums">({activeFilterCount})</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            aria-label="Zamknij filtry"
            className="w-10 h-10 -mr-2 flex items-center justify-center text-text-dim hover:text-text"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-8">
          <section aria-labelledby="sheet-categories-heading">
            <h2
              id="sheet-categories-heading"
              className="font-[var(--font-mono)] text-[11px] tracking-[0.25em] uppercase text-text-dim pb-3 mb-2 border-b border-white/10"
            >
              Kategorie
            </h2>
            <CategoryTree
              tree={tree}
              counts={counts}
              totalCount={totalCount}
              selectedCategory={selectedCategory}
              onSelectCategory={onSelectCategory}
            />
          </section>
          <section aria-label="Filtry">
            <FilterSections filters={filters} actions={actions} options={options} selectedCategory={selectedCategory} />
          </section>
        </div>

        <div
          className="flex items-center gap-3 px-5 py-3 border-t border-white/10 bg-bg flex-shrink-0"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="h-12 px-4 text-[13px] text-text-dim hover:text-text underline underline-offset-4 decoration-white/30"
            >
              Wyczyść wszystko
            </button>
          )}
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="flex-1 h-12 bg-accent text-bg text-[14px] font-medium"
          >
            Pokaż {pluralProducts(resultCount)}
          </button>
        </div>
      </Sheet>

      {/* Sort sheet — short */}
      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} label="Sortowanie" full={false} testId="mobile-sort-sheet">
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/10">
          <span className="font-[var(--font-mono)] text-[11px] tracking-[0.25em] uppercase text-text-dim">Sortuj</span>
          <button
            type="button"
            onClick={() => setSortOpen(false)}
            aria-label="Zamknij sortowanie"
            className="w-10 h-10 -mr-2 flex items-center justify-center text-text-dim hover:text-text"
          >
            <CloseIcon />
          </button>
        </div>
        <ul role="listbox" aria-label="Sortowanie" className="py-2 overflow-y-auto">
          {SORT_OPTIONS.map(opt => {
            const selected = opt.value === currentSort.value;
            return (
              <li key={opt.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => { onSortChange(opt.value); setSortOpen(false); }}
                  className={`w-full flex items-center justify-between px-5 h-12 text-[14px] ${
                    selected ? 'text-accent' : 'text-text'
                  }`}
                >
                  <span>{opt.label}</span>
                  {selected && (
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M2 7l3.5 3.5L12 3.5" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
