import Link from 'next/link';
import { breadcrumbJsonLd, type Crumb } from '@/lib/shop/breadcrumbs';

/**
 * Breadcrumb trail + schema.org BreadcrumbList (HA-2.32).
 * `currentPath` is the page's own path, used as the last item's URL in JSON-LD.
 * Labels come from the database; React escapes them in the markup and
 * JSON.stringify serialises them in the script — never string-concatenated.
 * "<" is escaped so a label can never close the script element.
 */
export default function Breadcrumbs({ items, currentPath }: { items: Crumb[]; currentPath: string }) {
  const jsonLd = JSON.stringify(breadcrumbJsonLd(items, currentPath)).replace(/</g, '\\u003c');
  return (
    <nav aria-label="Breadcrumb" data-testid="breadcrumbs">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-[var(--font-mono)] text-[11px] tracking-[0.2em] uppercase text-text-dim">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.href ?? 'current'}-${i}`} className="flex items-center gap-x-2 min-w-0">
              {item.href && !last ? (
                <Link href={item.href} className="hover:text-accent transition-colors whitespace-nowrap">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-white/80 truncate max-w-[60vw] md:max-w-[480px]">
                  {item.label}
                </span>
              )}
              {!last && <span aria-hidden="true" className="text-text-dim/50">›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
