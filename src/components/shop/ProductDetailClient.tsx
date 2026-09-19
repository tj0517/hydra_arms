'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';
import type { ShopProduct, ShopCategory } from '@/lib/supabase/types';
import { useCart } from './CartProvider';
import CartDrawer from './CartDrawer';

import ProductCard from './ProductCard';

interface Props {
  product: ShopProduct;
  categories: ShopCategory[];
  related: ShopProduct[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function sanitizeHtml(html: string): string {
  const decoded = html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  // BaseLinker descriptions use inline-styled spans (Tahoma, pt sizes) and embed
  // HTML tables for "Dane techniczne". Strip inline styles so our CSS takes over,
  // strip the table (we show features as our own clean table), then remove the
  // orphaned "Dane techniczne:" label and empty paragraphs left behind.
  const withoutTables = decoded.replace(/<table[\s\S]*?<\/table>/gi, '');
  const purified = DOMPurify.sanitize(withoutTables, {
    ALLOWED_TAGS: ['p', 'br', 'b', 'strong', 'i', 'em', 'ul', 'ol', 'li', 'span', 'h2', 'h3', 'h4'],
    FORBID_ATTR: ['style', 'class'],
  });
  return purified
    // Remove paragraphs whose only content is "Dane techniczne" (the table label)
    .replace(/<p>[^<]*<span>[^<]*[Dd]ane\s+[Tt]echniczne[^<]*<\/span>[^<]*<\/p>/gi, '')
    // Remove paragraphs that are empty or contain only whitespace/nbsp
    .replace(/<p>(?:\s|&nbsp;|<span>(?:\s|&nbsp;)*<\/span>)*<\/p>/gi, '')
    // Remove outer wrapper span if the whole thing is just a span
    .replace(/^<span>([\s\S]*)<\/span>$/, '$1')
    .trim();
}

function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

export default function ProductDetailClient({ product, categories, related }: Props) {
  const { addItem, openCart, items } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [adding, setAdding] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

  const images = product.images ? Object.values(product.images) : [];
  const validImages = images.filter((_, i) => !imgErrors.has(i));
  const category = categories.find(c => c.id === product.category_id);
  const parentCategory = category?.parent_id ? categories.find(c => c.id === category.parent_id) : null;
  const outOfStock = product.stock === 0;
  const cartQty = items.find(i => i.product.id === product.id)?.quantity ?? 0;
  const atStockLimit = cartQty + quantity > product.stock;

  function handleAdd() {
    if (outOfStock || adding || atStockLimit) return;
    addItem(product, quantity);
    setAdding(true);
    setTimeout(() => { setAdding(false); openCart(); }, 900);
  }

  function handleImgError(idx: number) {
    setImgErrors(prev => {
      const next = new Set(prev).add(idx);
      if (activeImg === idx) {
        const nextValid = images.findIndex((_, i) => i !== idx && !next.has(i));
        if (nextValid !== -1) setActiveImg(nextValid);
      }
      return next;
    });
  }

  const hasValidImg = (idx: number) => images[idx] && !imgErrors.has(idx);

  function prevImg() {
    const valid = images.map((_, i) => i).filter(i => !imgErrors.has(i));
    if (valid.length < 2) return;
    const cur = valid.indexOf(activeImg);
    setActiveImg(valid[(cur - 1 + valid.length) % valid.length]);
  }

  function nextImg() {
    const valid = images.map((_, i) => i).filter(i => !imgErrors.has(i));
    if (valid.length < 2) return;
    const cur = valid.indexOf(activeImg);
    setActiveImg(valid[(cur + 1) % valid.length]);
  }

  const cleanedDescription = product.description ? sanitizeHtml(product.description) : '';
  const hasDesc = cleanedDescription.replace(/<[^>]*>/g, '').trim().length > 0;
  const features = product.features && Object.keys(product.features).length > 0 ? product.features : null;
  const extraRows: [string, string][] = [];
  if (product.weight) extraRows.push(['Waga', `${product.weight} kg`]);
  if (product.dimensions) {
    const { l, w, h } = product.dimensions;
    extraRows.push(['Wymiary', `${l} × ${w} × ${h} mm`]);
  }
  if (product.requires_license) extraRows.push(['Wymagane zezwolenie', product.license_category ?? 'tak']);
  const allFeatureRows: [string, string][] = [
    ...(features ? Object.entries(features) : []),
    ...extraRows,
  ];
  const hasFeat = allFeatureRows.length > 0;

  return (
    <>
      <CartDrawer />

      <div className="max-w-[1300px] mx-auto px-[clamp(32px,5vw,64px)] pt-32 pb-16">

        {/* Back button */}
        <div className="mb-10">
          <Link
            href="/sklep"
            className="font-[var(--font-mono)] text-[11px] text-text-dim hover:text-accent transition-colors tracking-[0.2em] uppercase border border-white/10 hover:border-accent/30 px-4 py-2 inline-flex items-center"
          >
            ← Powrót do sklepu
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">

          {/* ── Gallery ── */}
          <div className="space-y-3">
            {/* Main image with arrows */}
            <div className="aspect-square bg-bg-card border border-white/10 relative overflow-hidden group">
              {hasValidImg(activeImg) ? (
                <Image
                  key={activeImg}
                  src={images[activeImg]}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain p-6 transition-opacity duration-200"
                  onError={() => handleImgError(activeImg)}
                />
              ) : (
                <Image
                  src={`/img/service-0${(product.id % 4) + 1}.jpg`}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              )}

              {/* Gallery arrows — only shown when >1 valid image */}
              {validImages.length > 1 && (
                <>
                  <button
                    onClick={prevImg}
                    aria-label="Poprzednie zdjęcie"
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center border border-white/15 bg-bg/80 text-text-dim hover:text-accent hover:border-accent/40 transition-all duration-200 opacity-0 group-hover:opacity-100 font-[var(--font-mono)] text-base"
                  >
                    ←
                  </button>
                  <button
                    onClick={nextImg}
                    aria-label="Następne zdjęcie"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center border border-white/15 bg-bg/80 text-text-dim hover:text-accent hover:border-accent/40 transition-all duration-200 opacity-0 group-hover:opacity-100 font-[var(--font-mono)] text-base"
                  >
                    →
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => imgErrors.has(i) ? null : (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${i === activeImg ? 'bg-accent' : 'bg-white/25 hover:bg-white/50'}`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* SKU watermark */}
              {product.sku && (
                <span className="absolute top-3 right-4 font-[var(--font-mono)] text-[9px] text-white/15 tracking-widest select-none">
                  {product.sku}
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {images.slice(0, 8).map((img, i) => {
                  if (imgErrors.has(i)) return null;
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`w-14 h-14 border overflow-hidden transition-colors ${
                        i === activeImg ? 'border-accent' : 'border-white/10 hover:border-white/25'
                      }`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => handleImgError(i)}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Product Info ── */}
          <div className="space-y-5">

            {/* Title block */}
            <div className="space-y-1.5">
              {category && (
                <Link
                  href={`/sklep?cat=${category.id}`}
                  className="font-[var(--font-mono)] text-[11px] text-text-dim tracking-[0.22em] uppercase hover:text-accent transition-colors block truncate"
                >
                  {parentCategory ? `${cleanName(parentCategory.name)} · ` : ''}{cleanName(category.name)}
                </Link>
              )}
              <h1 className="text-3xl md:text-4xl font-semibold text-white leading-tight">{product.name}</h1>
              {product.sku && (
                <p className="font-[var(--font-mono)] text-[11px] text-text-dim/60 tracking-[0.22em]">
                  SKU: {product.sku}{product.ean ? ` · EAN: ${product.ean}` : ''}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="py-4 border-t border-b border-white/8 flex items-end gap-3 flex-wrap">
              <span className="font-[var(--font-mono)] text-4xl text-accent leading-none">
                {fmt(product.price ?? 0)}
              </span>
              <span className="font-[var(--font-mono)] text-base text-text-dim mb-0.5">PLN</span>
              {product.tax_rate ? (
                <span className="font-[var(--font-mono)] text-[11px] text-text-dim/60 tracking-wider mb-0.5">
                  brutto (VAT {product.tax_rate}%)
                </span>
              ) : null}
              {product.price_compare && product.price_compare > (product.price ?? 0) && (
                <span className="font-[var(--font-mono)] text-sm text-text-dim/40 line-through mb-0.5">
                  {fmt(product.price_compare)} PLN
                </span>
              )}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${!outOfStock ? 'bg-accent' : 'bg-white/15'}`} />
              <span className="font-[var(--font-mono)] text-xs text-text-dim tracking-[0.18em]">
                {!outOfStock ? `W MAGAZYNIE · ${product.stock} SZT. DOSTĘPNYCH` : 'PRODUKT NIEDOSTĘPNY'}
              </span>
            </div>

            {/* Short description if present */}
            {product.short_description && (
              <p className="text-text-dim text-sm leading-relaxed border-l-2 border-accent/30 pl-4">
                {product.short_description}
              </p>
            )}

            {/* Type warnings */}
            {product.product_type === 'age_restricted' && (
              <div className="border border-accent/30 bg-accent/5 px-4 py-3">
                <p className="font-[var(--font-mono)] text-xs text-accent tracking-widest">
                  ⚠ PRODUKT PRZEZNACZONY DLA OSÓB PEŁNOLETNICH (18+)
                </p>
              </div>
            )}
            {product.product_type === 'pickup_only' && (
              <div className="border border-white/15 bg-white/3 px-4 py-3">
                <p className="font-[var(--font-mono)] text-xs text-text-dim tracking-widest">
                  ⚠ PRODUKT DOSTĘPNY WYŁĄCZNIE DO ODBIORU OSOBISTEGO
                </p>
              </div>
            )}

            {/* Quantity + Add */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-4">
                <span className="font-[var(--font-mono)] text-xs text-text-dim tracking-[0.2em] w-14">ILOŚĆ</span>
                <div className="flex items-stretch border border-white/15">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={outOfStock}
                    className="w-10 h-10 flex items-center justify-center text-text-dim hover:text-accent transition-colors font-[var(--font-mono)] border-r border-white/15 disabled:opacity-30"
                  >−</button>
                  <span className="w-12 flex items-center justify-center font-[var(--font-mono)] text-sm text-white">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(q => Math.min(q + 1, Math.max(1, product.stock)))}
                    disabled={outOfStock}
                    className="w-10 h-10 flex items-center justify-center text-text-dim hover:text-accent transition-colors font-[var(--font-mono)] border-l border-white/15 disabled:opacity-30"
                  >+</button>
                </div>
                <span className="font-[var(--font-mono)] text-sm text-text-dim">
                  = {fmt((product.price ?? 0) * quantity)} PLN
                </span>
              </div>

              <button
                onClick={handleAdd}
                disabled={outOfStock || adding || atStockLimit}
                className={`w-full py-4 font-[var(--font-mono)] text-xs tracking-[0.2em] border transition-all duration-300 ${
                  outOfStock || atStockLimit
                    ? 'border-white/8 text-white/15 cursor-not-allowed'
                    : adding
                    ? 'border-accent bg-accent/8 text-accent'
                    : 'border-accent/50 text-accent hover:bg-accent/8 hover:border-accent'
                }`}
              >
                {adding ? '[ DODANO DO KOSZYKA ✓ ]' : atStockLimit ? '[ BRAK W MAGAZYNIE ]' : '[ DODAJ DO KOSZYKA ]'}
              </button>
            </div>

          </div>
        </div>

        {/* ── Description + Tech specs ── */}
        {(hasDesc || hasFeat) && (
          <div className="mt-16 border-t border-white/8">
            <div className={`pt-10 grid grid-cols-1 gap-12 ${hasDesc && hasFeat ? 'lg:grid-cols-[1fr_360px] lg:gap-16' : ''}`}>
              {hasDesc && (
                <div>
                  <div className="pb-4 mb-6 border-b border-white/8 flex items-center gap-3">
                    <span className="font-[var(--font-mono)] text-xs text-text-dim/60 tracking-[0.25em] uppercase">Opis produktu</span>
                  </div>
                  <div
                    className="shop-description text-text-dim text-base leading-relaxed space-y-4"
                    dangerouslySetInnerHTML={{ __html: cleanedDescription }}
                  />
                </div>
              )}
              {hasFeat && (
                <div>
                  <div className="pb-4 mb-6 border-b border-white/8 flex items-center gap-3">
                    <span className="font-[var(--font-mono)] text-xs text-text-dim/60 tracking-[0.25em] uppercase">Dane techniczne</span>
                    <span className="font-[var(--font-mono)] text-[9px] text-text-dim/30 tracking-widest">{allFeatureRows.length} PARAMETRÓW</span>
                  </div>
                  <table className="w-full">
                    <tbody>
                      {allFeatureRows.map(([k, v]) => (
                        <tr key={k} className="border-b border-white/5 last:border-0 group/row">
                          <td className="py-2.5 pr-4 font-[var(--font-mono)] text-[11px] text-text-dim/70 tracking-wider align-top w-[45%] group-hover/row:text-text-dim transition-colors">
                            {k}
                          </td>
                          <td className="py-2.5 text-sm text-white/80 align-top group-hover/row:text-white transition-colors">
                            {v}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Related products */}
        {related.length > 0 && (
          <div className="mt-16 pt-10 border-t border-white/8">
            <div className="pb-4 mb-8 border-b border-white/8">
              <span className="font-[var(--font-mono)] text-xs text-text-dim/60 tracking-[0.25em] uppercase">
                {category ? `Więcej z kategorii: ${cleanName(category.name)}` : 'Inne produkty'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
              {related.map(p => (
                <ProductCard key={p.id} product={p} categories={categories} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
