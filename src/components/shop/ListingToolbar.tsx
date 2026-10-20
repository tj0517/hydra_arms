'use client';

/**
 * Listing toolbar (HA-2.30): product count, search input, sort dropdown with
 * full labels ("Cena: od najniższej"). Stateless — SklepClient owns the values.
 */
import { useEffect, useRef, useState } from 'react';
import { SORT_OPTIONS, type SortKey } from './listingFilters';

interface ListingToolbarProps {
  count: number;
  searchInput: string;
  onSearchChange: (value: string) => void;
  sortBy: SortKey;
  onSortChange: (value: SortKey) => void;
}

function pluralProducts(n: number): string {
  if (n === 1) return '1 produkt';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return `${n} produkty`;
  return `${n} produktów`;
}

export { pluralProducts };

export function SortDropdown({
  sortBy,
  onSortChange,
  align = 'right',
}: {
  sortBy: SortKey;
  onSortChange: (value: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = SORT_OPTIONS.find(o => o.value === sortBy) ?? SORT_OPTIONS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sortowanie: ${current.label}`}
        onClick={() => setOpen(o => !o)}
        className={`h-10 flex items-center gap-2 border px-3 text-[13px] text-text transition-colors ${
          open ? 'border-white/60' : 'border-white/20 hover:border-white/50'
        }`}
      >
        <span className="text-text-dim">Sortuj:</span>
        <span>{current.label}</span>
        <svg
          aria-hidden="true"
          className={`shrink-0 text-text-dim transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Sortowanie"
          className={`absolute top-full mt-1 z-50 min-w-full w-max border border-white/20 bg-bg-card shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {SORT_OPTIONS.map(opt => {
            const selected = sortBy === opt.value;
            return (
              <li key={opt.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => { onSortChange(opt.value); setOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 text-[13px] transition-colors ${
                    selected ? 'text-accent bg-white/[0.04]' : 'text-text hover:bg-white/[0.06]'
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ListingToolbar({
  count,
  searchInput,
  onSearchChange,
  sortBy,
  onSortChange,
}: ListingToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pb-5 border-b border-white/10">
      <p className="text-[14px] text-text" aria-live="polite" data-testid="product-count">
        {pluralProducts(count)}
      </p>

      <div className="flex items-center gap-3 flex-1 sm:flex-none min-w-0">
        <label className="relative flex-1 sm:flex-none min-w-0">
          <span className="sr-only">Szukaj produktu</span>
          <svg
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
            width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"
          >
            <circle cx="6" cy="6" r="4.5" />
            <path d="M9.5 9.5L13 13" />
          </svg>
          <input
            type="search"
            value={searchInput}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Szukaj produktu…"
            className="h-10 w-full sm:w-56 lg:w-72 bg-transparent border border-white/20 pl-9 pr-8 text-[13px] text-text placeholder:text-text-dim/60 focus:outline-none focus:border-white/60 transition-colors [&::-webkit-search-cancel-button]:appearance-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Wyczyść wyszukiwanie"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-text-dim hover:text-text transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" />
              </svg>
            </button>
          )}
        </label>

        <div className="hidden lg:block">
          <SortDropdown sortBy={sortBy} onSortChange={onSortChange} />
        </div>
      </div>
    </div>
  );
}
