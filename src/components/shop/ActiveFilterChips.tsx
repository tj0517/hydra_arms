'use client';

/**
 * Row of active-filter chips above the product grid (HA-2.30). One chip with ×
 * per active filter — category, query, availability, delivery, brand, price,
 * each spec — plus "Wyczyść wszystko". SklepClient builds the list and owns
 * the removal callbacks, so removing a chip updates the URL the same way the
 * sidebar does.
 */
import type { ActiveChip } from './listingFilters';

interface ActiveFilterChipsProps {
  chips: ActiveChip[];
  onClearAll: () => void;
}

export default function ActiveFilterChips({ chips, onClearAll }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <div data-testid="active-filters" className="flex flex-wrap items-center gap-2 mb-6">
      <span className="sr-only">Aktywne filtry:</span>
      <ul className="contents">
        {chips.map(chip => (
          <li key={chip.id} className="contents">
            <button
              type="button"
              onClick={chip.onRemove}
              aria-label={`Usuń filtr: ${chip.label}`}
              data-chip={chip.id}
              className="group inline-flex items-center gap-2 border border-white/20 bg-white/[0.04] pl-3 pr-2 py-1.5 text-[13px] leading-none text-text hover:border-white/50 hover:bg-white/[0.08] transition-colors"
            >
              <span>{chip.label}</span>
              <span
                aria-hidden="true"
                className="w-4 h-4 flex items-center justify-center text-text-dim group-hover:text-text"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" />
                </svg>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClearAll}
        className="ml-1 text-[13px] text-text-dim hover:text-text underline underline-offset-4 decoration-white/30 transition-colors"
      >
        Wyczyść wszystko
      </button>
    </div>
  );
}
