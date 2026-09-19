'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Check } from 'lucide-react';
import type { ShopProduct, ShopCategory } from '@/lib/supabase/types';
import { useCart } from './CartProvider';

interface ProductCardProps {
  product: ShopProduct;
  categories: ShopCategory[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);


export default function ProductCard({ product, categories }: ProductCardProps) {
  const { addItem, items } = useCart();
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [adding, setAdding] = useState(false);

  const imageUrl = product.images ? Object.values(product.images)[0] : null;
  const category = categories.find(c => c.id === product.category_id);
  const parentCategory = category?.parent_id ? categories.find(c => c.id === category.parent_id) : null;
  const categoryLabel = category
    ? parentCategory
      ? parentCategory.name
      : category.name
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
  const outOfStock = product.stock === 0;
  const atStockLimit = cartQty >= product.stock;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock || adding || atStockLimit) return;
    addItem(product);
    setAdding(true);
    setTimeout(() => setAdding(false), 1400);
  }

  return (
    <div
      ref={cardRef}
      style={{ transitionDelay: '0ms' }}
      className={`flex flex-col border border-white/8 bg-bg-card transition-all duration-500 group ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } hover:border-white/20`}
    >
      {/* Image — clicking navigates to product */}
      <Link href={`/sklep/${product.id}`} className="block relative aspect-[4/3] bg-[#111] overflow-hidden">
        {imageUrl && !imgError ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            onError={() => setImgError(true)}
          />
        ) : (
          <Image
            src={`/img/service-0${(product.id % 4) + 1}.jpg`}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
          />
        )}

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-bg/60 flex items-center justify-center">
            <span className="font-[var(--font-mono)] text-xs text-text-dim tracking-[0.2em] border border-white/20 px-3 py-1">
              NIEDOSTĘPNY
            </span>
          </div>
        )}

        {/* Badges */}
        {product.product_type === 'age_restricted' && (
          <div className="absolute top-2 left-2 bg-bg/90 border border-accent/40 px-2 py-0.5">
            <span className="font-[var(--font-mono)] text-[9px] text-accent tracking-widest">18+</span>
          </div>
        )}
        {product.product_type === 'pickup_only' && (
          <div className="absolute top-2 left-2 bg-bg/90 border border-white/20 px-2 py-0.5">
            <span className="font-[var(--font-mono)] text-[9px] text-text-dim tracking-widest">ODBIÓR</span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {categoryLabel && (
          <span className="font-[var(--font-mono)] text-[9px] text-text-dim/70 tracking-[0.2em] uppercase truncate">
            {categoryLabel}
          </span>
        )}

        <Link href={`/sklep/${product.id}`} className="block">
          <h3 className="text-sm text-white font-medium leading-snug line-clamp-2 flex-1 min-h-[2.5rem] hover:text-accent/80 transition-colors duration-200">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="font-[var(--font-mono)] text-base text-accent leading-none">
            {fmt(product.price ?? 0)}
          </span>
          <span className="font-[var(--font-mono)] text-[10px] text-text-dim">PLN</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${!outOfStock ? 'bg-accent' : 'bg-white/15'}`} />
          <span className="font-[var(--font-mono)] text-[9px] text-text-dim tracking-wider">
            {!outOfStock ? `W MAGAZYNIE · ${product.stock} SZT.` : 'BRAK W MAGAZYNIE'}
          </span>
        </div>

        <div className="mt-1 flex gap-2">
          <Link
            href={`/sklep/${product.id}`}
            className="flex-1 py-2.5 border border-white/15 font-[var(--font-mono)] text-[10px] tracking-[0.18em] text-text-dim hover:border-accent/50 hover:text-accent hover:bg-accent/3 transition-all duration-200 text-center"
          >
            [ SZCZEGÓŁY ]
          </Link>
          <button
            onClick={handleAdd}
            disabled={outOfStock || adding || atStockLimit}
            title={adding ? 'Dodano do koszyka' : atStockLimit ? 'Brak w magazynie' : 'Dodaj do koszyka'}
            className={`w-10 h-10 flex-shrink-0 flex items-center justify-center border transition-all duration-200 ${
              outOfStock || atStockLimit
                ? 'border-white/8 text-white/15 cursor-not-allowed'
                : adding
                ? 'border-accent text-accent bg-accent/5'
                : 'border-white/15 text-text-dim hover:border-accent/50 hover:text-accent hover:bg-accent/3'
            }`}
          >
            {adding ? (
              <Check size={14} strokeWidth={2} />
            ) : (
              <span className="relative">
                <ShoppingCart size={14} strokeWidth={1.5} />
                <span className="absolute -top-1.5 -right-1.5 w-3 h-3 flex items-center justify-center text-[8px] leading-none font-bold">+</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
