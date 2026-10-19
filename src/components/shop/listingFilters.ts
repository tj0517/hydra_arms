/**
 * Shared contract between SklepClient (owner of filter state and the URL) and
 * the listing UI pieces extracted in HA-2.30: FiltersSidebar, ActiveFilterChips,
 * ListingToolbar, MobileFilterSheet. Pure types and constants — no React.
 *
 * URL contract (unchanged since HA-2.10): cat, q, stock, min, max, sort, marka, dostawa.
 */
import type { ShopCategory } from '@/lib/supabase/types';

export type SortKey = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'newest';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name_asc',   label: 'Nazwa: A–Z' },
  { value: 'name_desc',  label: 'Nazwa: Z–A' },
  { value: 'price_asc',  label: 'Cena: od najniższej' },
  { value: 'price_desc', label: 'Cena: od najwyższej' },
  { value: 'newest',     label: 'Najnowsze' },
];

export function isSortKey(v: string | null): v is SortKey {
  return SORT_OPTIONS.some(o => o.value === v);
}

// URL value ↔ label for the universal "shippable / pickup only" filter (dostawa=).
// Values are the known set the ?dostawa= param is validated against.
export type DeliveryMode = 'wysylka' | 'odbior';
export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  wysylka: 'Wysyłka kurierem',
  odbior: 'Tylko odbiór osobisty',
};
export function isDeliveryMode(v: string | null): v is DeliveryMode {
  return v === 'wysylka' || v === 'odbior';
}

/** Two-level category tree: a root and its direct children. */
export interface CategoryTreeNode {
  category: ShopCategory;
  children: ShopCategory[];
}

/** Current values of the non-category filters, as SklepClient holds them. */
export interface FilterState {
  onlyInStock: boolean;
  deliveryMode: DeliveryMode | null;
  /** Raw text of the price inputs ('' = no bound) — the URL carries the same strings. */
  priceMinInput: string;
  priceMaxInput: string;
  selectedBrand: string | null;
  /** { [specKey]: values[] } — OR within a key, AND between keys. */
  selectedSpecs: Record<string, string[]>;
}

/** Mutations SklepClient exposes to the filter UI. */
export interface FilterActions {
  toggleStock: () => void;
  setDeliveryMode: (mode: DeliveryMode | null) => void;
  setPriceMin: (value: string) => void;
  setPriceMax: (value: string) => void;
  setBrand: (brand: string | null) => void;
  toggleSpec: (key: string, value: string) => void;
  clearSpec: (key: string) => void;
}

/** Option lists derived from the product set. */
export interface FilterOptions {
  priceRange: { min: number; max: number };
  availableBrands: { brand: string; count: number }[];
  availableSpecs: { key: string; values: { val: string; count: number }[] }[];
}

/** One active filter as rendered in the chip row. */
export interface ActiveChip {
  id: string;
  label: string;
  onRemove: () => void;
}
