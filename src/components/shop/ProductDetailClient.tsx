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
    .replace(/&nbsp;/g, '\u00a0');
  return DOMPurify.sanitize(decoded, { ALLOWED_TAGS: ['p', 'br', 'b', 'strong', 'i', 'em', 'ul', 'ol', 'li', 'span', 'h2', 'h3', 'h4', 'table', 'tr', 'td', 'th', 'tbody', 'thead'] });
}


export default function ProductDetailClient({ product, categories, related }: Props) {
  const { addItem, openCart, items } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [adding, setAdding] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

  const images = product.images ? Object.values(product.images) : [];
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
    setImgErrors(prev => new Set(prev).add(idx));
  }

  const hasValidImg = (idx: number) => images[idx] && !imgErrors.has(idx);

  return (
    <>
      <CartDrawer />


      <div className="max-w-[1300px] mx-auto px-6 md:px-10 pt-32 pb-16">

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
            {/* Main image */}
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

              {/* SKU watermark */}
              {product.sku && (
                <span className="absolute bottom-3 right-4 font-[var(--font-mono)] text-[9px] text-white/15 tracking-widest select-none">
                  {product.sku}
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {images.slice(0, 6).map((img, i) => {
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
                  className="font-[var(--font-mono)] text-[11px] text-text-dim tracking-[0.22em] uppercase hover:text-accent transition-colors"
                >
                  {parentCategory ? `${parentCategory.name} · ` : ''}{category.name}
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
            <div className="py-4 border-t border-b border-white/8 flex items-end gap-3">
              <span className="font-[var(--font-mono)] text-4xl text-accent leading-none">
                {fmt(product.price ?? 0)}
              </span>
              <span className="font-[var(--font-mono)] text-base text-text-dim mb-0.5">PLN</span>
              {product.tax_rate ? (
                <span className="font-[var(--font-mono)] text-[11px] text-text-dim/60 tracking-wider mb-0.5">
                  brutto (VAT {product.tax_rate}%)
                </span>
              ) : null}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${!outOfStock ? 'bg-accent' : 'bg-white/15'}`} />
              <span className="font-[var(--font-mono)] text-xs text-text-dim tracking-[0.18em]">
                {!outOfStock ? `W MAGAZYNIE · ${product.stock} SZT. DOSTĘPNYCH` : 'PRODUKT NIEDOSTĘPNY'}
              </span>
            </div>

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

        {/* Opis + Dane techniczne — side by side when both present */}
        {(() => {
          const hasDesc = !!product.description;
          const hasFeat = !!(product.features && Object.keys(product.features).length > 0);
          if (!hasDesc && !hasFeat) return null;
          return (
            <div className={`mt-16 pt-10 border-t border-white/8 grid grid-cols-1 gap-12 ${hasDesc && hasFeat ? 'md:grid-cols-2 md:gap-16' : ''}`}>
              {hasDesc && (
                <div>
                  <div className="pb-4 mb-6 border-b border-white/8">
                    <span className="font-[var(--font-mono)] text-xs text-text-dim/60 tracking-[0.25em] uppercase">Opis produktu</span>
                  </div>
                  <div
                    className="shop-description text-text-dim text-base leading-relaxed space-y-4"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description!) }}
                  />
                </div>
              )}
              {hasFeat && (
                <div>
                  <div className="pb-4 mb-6 border-b border-white/8">
                    <span className="font-[var(--font-mono)] text-xs text-text-dim/60 tracking-[0.25em] uppercase">Dane techniczne</span>
                  </div>
                  <table className="w-full">
                    <tbody>
                      {Object.entries(product.features!).map(([k, v]) => (
                        <tr key={k} className="border-b border-white/5 last:border-0">
                          <td className="py-3 pr-6 font-[var(--font-mono)] text-sm text-text-dim tracking-wider align-top w-2/5">{k}</td>
                          <td className="py-3 text-sm text-white/80">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* Related products */}
        {related.length > 0 && (
          <div className="mt-16 pt-10 border-t border-white/8">
            <div className="pb-4 mb-8 border-b border-white/8">
              <span className="font-[var(--font-mono)] text-xs text-text-dim/60 tracking-[0.25em] uppercase">
                {category ? `Więcej z kategorii: ${category.name}` : 'Inne produkty'}
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
