'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ImageOff, Check } from 'lucide-react';
import type { ShopProduct } from '@/lib/supabase/types';
import type { ListingCategory } from './listingFilters';
import { useCart } from './CartProvider';
import { categoryDisplayName } from '@/lib/shop/categoryLabel';
import { mustPickup } from '@/lib/shop/cartAnalysis';

interface ProductCardProps {
  product: ShopProduct;
  categories: ListingCategory[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/** "Ostatnie sztuki" threshold (HA-2.31) — the card never shows the exact unit count. */
const LOW_STOCK_MAX = 3;

/**
 * One availability/delivery line (HA-2.31). Pickup comes from mustPickup() only —
 * the card never reimplements the rule.
 */
export function availabilityLine(product: ShopProduct): { text: string; tone: 'ok' | 'pickup' | 'none' } {
  if (product.stock <= 0) return { text: 'Niedostępny', tone: 'none' };
  const low = product.stock <= LOW_STOCK_MAX;
  if (mustPickup(product)) {
    return {
      text: low ? 'Ostatnie sztuki · tylko odbiór osobisty w Krakowie' : 'Tylko odbiór osobisty w Krakowie',
      tone: 'pickup',
    };
  }
  return { text: low ? 'Ostatnie sztuki · wysyłka kurierem' : 'Dostępny · wysyłka kurierem', tone: 'ok' };
}

/** Plain-word tags (HA-2.31). "Odbiór osobisty" only when neither licence nor age explains the pickup. */
export function productTags(product: ShopProduct): string[] {
  const tags: string[] = [];
  if (product.requires_license) tags.push('Wymaga pozwolenia');
  if (product.age_min >= 18) tags.push('18+');
  if (tags.length === 0 && mustPickup(product)) tags.push('Odbiór osobisty');
  return tags;
}

export default function ProductCard({ product, categories }: ProductCardProps) {
  const { addItem, items } = useCart();
  const cardRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [adding, setAdding] = useState(false);

  const imageUrl = product.images ? Object.values(product.images)[0] : null;
  const category = categories.find(c => c.id === product.category_id);
  const parentCategory = category?.parent_id ? categories.find(c => c.id === category.parent_id) : null;
  const categoryLabel = category
    ? categoryDisplayName(parentCategory ? parentCategory.name : category.name)
    : null;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.08 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const cartQty = items.find(i => i.product.id === product.id)?.quantity ?? 0;
  const outOfStock = product.stock <= 0;
  const atStockLimit = !outOfStock && cartQty >= product.stock;
  const price = product.price ?? 0;
  const comparePrice =
    product.price_compare != null && product.price_compare > price ? product.price_compare : null;
  const availability = availabilityLine(product);
  const tags = productTags(product);
  const href = `/sklep/${product.id}`;

  function handleAdd() {
    if (outOfStock || adding || atStockLimit) return;
    addItem(product);
    setAdding(true);
    setTimeout(() => setAdding(false), 1400);
  }

  const buttonLabel = adding ? 'Dodano do koszyka' : atStockLimit ? 'Limit w koszyku' : 'Do koszyka';
  const buttonDisabled = outOfStock || adding || atStockLimit;

  return (
    // The link is stretched over the whole card with ::after; the button sits above it
    // (relative z-10) as a sibling, so nothing interactive is nested and both are tabbable.
    <article
      ref={cardRef}
      data-testid="product-card"
      className={`relative flex flex-col border border-white/8 bg-bg-card transition-all duration-500 group ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } hover:border-white/20 focus-within:border-white/25`}
    >
      <Link
        href={href}
        className="flex flex-col flex-1 outline-none after:absolute after:inset-0 after:content-['']"
      >
        {/* Packshot — whole image on a light background (wholesaler packshots are on white) */}
        <div className={`relative aspect-square overflow-hidden ${imageUrl && !imgError ? 'bg-[#F3F3F1]' : 'bg-[#161616]'}`}>
          {imageUrl && !imgError ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={`object-contain p-4 transition-transform duration-500 group-hover:scale-[1.03] ${
                outOfStock ? 'opacity-40 grayscale' : ''
              }`}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/25" aria-hidden="true">
              <ImageOff size={28} strokeWidth={1.25} />
              <span className="text-[12px]">Brak zdjęcia</span>
            </div>
          )}

          {tags.length > 0 && (
            <ul className="absolute top-2 left-2 flex flex-col items-start gap-1" aria-label="Oznaczenia">
              {tags.map(tag => (
                <li
                  key={tag}
                  className={`px-2 py-0.5 text-[11px] font-medium leading-5 bg-bg/90 backdrop-blur-sm border ${
                    tag === '18+' ? 'border-accent/50 text-accent' : 'border-white/20 text-white'
                  }`}
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 px-4 pt-3 pb-2 gap-1">
          {categoryLabel && (
            <span className="text-[12px] text-text-dim/70 truncate">{categoryLabel}</span>
          )}

          <h3 className="text-[14px] text-white font-medium leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-accent/90 transition-colors duration-200">
            {product.name}
          </h3>

          <div className="flex items-baseline gap-2 mt-1 flex-wrap">
            {comparePrice !== null && (
              <s className="font-[var(--font-mono)] text-[12px] text-text-dim/70" data-testid="price-compare">
                {fmt(comparePrice)}
              </s>
            )}
            <span className="font-[var(--font-mono)] text-[17px] text-white font-medium leading-none">
              {fmt(price)}
            </span>
            <span className="font-[var(--font-mono)] text-[11px] text-text-dim">PLN</span>
          </div>

          <div className="flex items-center gap-1.5 mt-1" data-testid="availability">
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                availability.tone === 'ok' ? 'bg-accent' : availability.tone === 'pickup' ? 'bg-white/60' : 'bg-white/15'
              }`}
            />
            <span className={`text-[12px] leading-tight ${availability.tone === 'none' ? 'text-text-dim/60' : 'text-text-dim'}`}>
              {availability.text}
            </span>
          </div>
        </div>
      </Link>

      <div className="relative z-10 px-4 pb-4 pt-1">
        <button
          type="button"
          onClick={handleAdd}
          disabled={buttonDisabled}
          className={`w-full h-10 text-[13px] font-medium border transition-all duration-200 ${
            outOfStock || atStockLimit
              ? 'border-white/8 text-white/30 cursor-not-allowed'
              : adding
              ? 'border-accent bg-accent text-bg'
              : 'border-accent/60 text-accent hover:bg-accent hover:text-bg'
          }`}
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            {adding && <Check size={14} strokeWidth={2.5} aria-hidden="true" />}
            {buttonLabel}
          </span>
        </button>
      </div>
    </article>
  );
}
