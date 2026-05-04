'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ShopProduct, ShopCategory } from '@/lib/supabase/types';
import { useCart } from './CartProvider';
import CartDrawer from './CartDrawer';

interface Props {
  product: ShopProduct;
  categories: ShopCategory[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function decodeHtml(html: string): string {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, '\u00a0');
}

function CrosshairPlaceholder({ size = 64 }: { size?: number }) {
  const r = size * 0.44;
  const r2 = size * 0.08;
  const gap = size * 0.12;
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" className="text-white/10">
      <circle cx={c} cy={c} r={r} stroke="currentColor" strokeWidth="0.75"/>
      <circle cx={c} cy={c} r={r2} stroke="currentColor" strokeWidth="0.75"/>
      <line x1={gap} y1={c} x2={c - r2 - 4} y2={c} stroke="currentColor" strokeWidth="0.75"/>
      <line x1={c + r2 + 4} y1={c} x2={size - gap} y2={c} stroke="currentColor" strokeWidth="0.75"/>
      <line x1={c} y1={gap} x2={c} y2={c - r2 - 4} stroke="currentColor" strokeWidth="0.75"/>
      <line x1={c} y1={c + r2 + 4} x2={c} y2={size - gap} stroke="currentColor" strokeWidth="0.75"/>
    </svg>
  );
}

export default function ProductDetailClient({ product, categories }: Props) {
  const { addItem, openCart, itemCount } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [adding, setAdding] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

  const images = product.images ? Object.values(product.images) : [];
  const category = categories.find(c => c.id === product.category_id);
  const parentCategory = category?.parent_id ? categories.find(c => c.id === category.parent_id) : null;
  const outOfStock = product.stock === 0;

  function handleAdd() {
    if (outOfStock || adding) return;
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

      {/* Cart trigger in top-right when items */}
      {itemCount > 0 && (
        <button
          onClick={openCart}
          className="fixed top-24 right-6 z-[500] flex items-center gap-2 border border-accent/40 px-3 py-2 font-[var(--font-mono)] text-[10px] text-accent tracking-widest hover:bg-accent/5 transition-colors bg-bg"
        >
          KOSZYK
          <span className="w-4 h-4 bg-accent text-black text-[9px] font-bold flex items-center justify-center rounded-full">{itemCount}</span>
        </button>
      )}

      <div className="max-w-[1300px] mx-auto px-6 md:px-10 py-12">

        {/* Breadcrumb */}
        <nav className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-10 font-[var(--font-mono)] text-[9px] text-text-dim tracking-[0.2em] uppercase">
          <Link href="/sklep" className="hover:text-accent transition-colors">Sklep</Link>
          {parentCategory && (
            <>
              <span className="text-white/15">/</span>
              <Link href={`/sklep?cat=${parentCategory.id}`} className="hover:text-accent transition-colors">
                {parentCategory.name}
              </Link>
            </>
          )}
          {category && (
            <>
              <span className="text-white/15">/</span>
              <Link href={`/sklep?cat=${category.id}`} className="hover:text-accent transition-colors">
                {category.name}
              </Link>
            </>
          )}
          <span className="text-white/15">/</span>
          <span className="text-white/50 normal-case truncate max-w-[240px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">

          {/* ── Gallery ── */}
          <div className="space-y-3">
            {/* Main image */}
            <div className="aspect-square bg-bg-card border border-white/10 relative overflow-hidden group">
              {hasValidImg(activeImg) ? (
                <img
                  key={activeImg}
                  src={images[activeImg]}
                  alt={product.name}
                  className="w-full h-full object-contain p-6 transition-opacity duration-200"
                  onError={() => handleImgError(activeImg)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <CrosshairPlaceholder size={80} />
                </div>
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
                {images.slice(0, 6).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`w-14 h-14 border overflow-hidden transition-colors ${
                      i === activeImg ? 'border-accent' : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    {!imgErrors.has(i) ? (
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => handleImgError(i)}
                      />
                    ) : (
                      <div className="w-full h-full bg-bg-card flex items-center justify-center">
                        <CrosshairPlaceholder size={24} />
                      </div>
                    )}
                  </button>
                ))}
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
                  className="font-[var(--font-mono)] text-[9px] text-text-dim tracking-[0.22em] uppercase hover:text-accent transition-colors"
                >
                  {parentCategory ? `${parentCategory.name} · ` : ''}{category.name}
                </Link>
              )}
              <h1 className="text-2xl md:text-3xl font-semibold text-white leading-tight">{product.name}</h1>
              {product.sku && (
                <p className="font-[var(--font-mono)] text-[9px] text-text-dim/60 tracking-[0.22em]">
                  SKU: {product.sku}{product.ean ? ` · EAN: ${product.ean}` : ''}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="py-4 border-t border-b border-white/8 flex items-end gap-3">
              <span className="font-[var(--font-mono)] text-3xl text-accent leading-none">
                {fmt(product.price ?? 0)}
              </span>
              <span className="font-[var(--font-mono)] text-sm text-text-dim mb-0.5">PLN</span>
              {product.tax_rate ? (
                <span className="font-[var(--font-mono)] text-[9px] text-text-dim/60 tracking-wider mb-0.5">
                  brutto (VAT {product.tax_rate}%)
                </span>
              ) : null}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${!outOfStock ? 'bg-accent' : 'bg-white/15'}`} />
              <span className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.18em]">
                {!outOfStock ? `W MAGAZYNIE · ${product.stock} SZT. DOSTĘPNYCH` : 'PRODUKT NIEDOSTĘPNY'}
              </span>
            </div>

            {/* Type warnings */}
            {product.product_type === 'age_restricted' && (
              <div className="border border-accent/30 bg-accent/5 px-4 py-3">
                <p className="font-[var(--font-mono)] text-[10px] text-accent tracking-widest">
                  ⚠ PRODUKT PRZEZNACZONY DLA OSÓB PEŁNOLETNICH (18+)
                </p>
              </div>
            )}
            {product.product_type === 'pickup_only' && (
              <div className="border border-white/15 bg-white/3 px-4 py-3">
                <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-widest">
                  ⚠ PRODUKT DOSTĘPNY WYŁĄCZNIE DO ODBIORU OSOBISTEGO
                </p>
              </div>
            )}

            {/* Quantity + Add */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-4">
                <span className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.2em] w-14">ILOŚĆ</span>
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
                <span className="font-[var(--font-mono)] text-xs text-text-dim">
                  = {fmt((product.price ?? 0) * quantity)} PLN
                </span>
              </div>

              <button
                onClick={handleAdd}
                disabled={outOfStock || adding}
                className={`w-full py-4 font-[var(--font-mono)] text-xs tracking-[0.2em] border transition-all duration-300 ${
                  outOfStock
                    ? 'border-white/8 text-white/15 cursor-not-allowed'
                    : adding
                    ? 'border-accent bg-accent/8 text-accent'
                    : 'border-accent/50 text-accent hover:bg-accent/8 hover:border-accent'
                }`}
              >
                {adding ? '[ DODANO DO KOSZYKA ✓ ]' : '[ DODAJ DO KOSZYKA ]'}
              </button>
            </div>

            {/* Features table */}
            {product.features && Object.keys(product.features).length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="pb-2 border-b border-white/8">
                  <span className="font-[var(--font-mono)] text-[9px] text-text-dim/60 tracking-[0.25em] uppercase">Dane techniczne</span>
                </div>
                <table className="w-full">
                  <tbody>
                    {Object.entries(product.features).map(([k, v]) => (
                      <tr key={k} className="border-b border-white/5 last:border-0">
                        <td className="py-2 pr-4 font-[var(--font-mono)] text-[9px] text-text-dim tracking-wider align-top w-2/5">
                          {k}
                        </td>
                        <td className="py-2 font-[var(--font-mono)] text-[9px] text-white/80">
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

        {/* Description */}
        {product.description && (
          <div className="mt-16 pt-10 border-t border-white/8">
            <div className="pb-4 mb-8 border-b border-white/8">
              <span className="font-[var(--font-mono)] text-[9px] text-text-dim/60 tracking-[0.25em] uppercase">Opis produktu</span>
            </div>
            <div
              className="shop-description text-text-dim text-sm leading-relaxed max-w-3xl space-y-4"
              dangerouslySetInnerHTML={{ __html: decodeHtml(product.description) }}
            />
          </div>
        )}
      </div>
    </>
  );
}
