/**
 * Breadcrumb path for the product page (HA-2.32).
 *
 * Sklep › <root> › … › <leaf> › <product>. Category labels go through
 * categoryDisplayName (HA-2.30), links point at the listing with ?cat=<id> —
 * the URL contract SklepClient already understands. A product whose root is
 * the importer's "00. DO PRZYPISANIA" bucket gets no category crumbs at all
 * (the bucket is never shown publicly, D1 A): Sklep › product.
 */
import type { ShopCategory } from '@/lib/supabase/types';
import { categoryDisplayName, isWorkingCategory } from './categoryLabel';

export interface Crumb {
  label: string;
  /** Absent on the last crumb — the current page. */
  href?: string;
}


const MAX_DEPTH = 6;

/** Ancestors first, leaf last. Empty when the chain starts in a "00." root or the category is unknown. */
export function categoryChain(categoryId: number | null | undefined, categories: ShopCategory[]): ShopCategory[] {
  const chain: ShopCategory[] = [];
  let current = categoryId == null ? undefined : categories.find(c => c.id === categoryId);
  while (current && chain.length < MAX_DEPTH) {
    chain.unshift(current);
    const parentId: number | null = current.parent_id;
    current = parentId == null ? undefined : categories.find(c => c.id === parentId);
  }
  if (chain.length === 0 || isWorkingCategory(chain[0].name)) return [];
  return chain;
}

export function productBreadcrumbs(
  product: { name: string; category_id: number | null },
  categories: ShopCategory[],
): Crumb[] {
  return [
    { label: 'Sklep', href: '/sklep' },
    ...categoryChain(product.category_id, categories).map(c => ({
      label: categoryDisplayName(c.name),
      href: `/sklep?cat=${c.id}`,
    })),
    { label: product.name },
  ];
}

/**
 * schema.org BreadcrumbList — serialised with JSON.stringify by the caller, never concatenated.
 * `baseUrl` is siteUrl() read on the server: this also renders in the browser, where SITE_URL is unset.
 */
export function breadcrumbJsonLd(crumbs: Crumb[], currentPath: string, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: `${baseUrl}${c.href ?? currentPath}`,
    })),
  };
}
