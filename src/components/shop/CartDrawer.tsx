'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './CartProvider';
import { analyzeCart } from '@/lib/shop/cartAnalysis';

const fmt = (n: number) =>
  new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function CartDrawer() {
  const { items, total, isOpen, closeCart, removeItem, updateQuantity, itemCount } = useCart();
  const router = useRouter();

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [closeCart]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className={`fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-[340px] sm:max-w-[400px] md:max-w-[440px] z-[9999] flex flex-col bg-bg border-l border-white/10 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-4">
            <span className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.25em] uppercase">Koszyk</span>
            {itemCount > 0 && (
              <span className="font-[var(--font-mono)] text-xs text-accent">{itemCount} szt.</span>
            )}
          </div>
          <button
            onClick={closeCart}
            className="w-8 h-8 flex items-center justify-center text-text-dim hover:text-accent transition-colors font-[var(--font-mono)] text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto" data-lenis-prevent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-white/10">
                <rect x="1" y="1" width="38" height="38" stroke="currentColor" strokeWidth="1"/>
                <path d="M12 14h16M14 20h12M16 26h8" stroke="currentColor" strokeWidth="1"/>
              </svg>
              <p className="font-[var(--font-mono)] text-xs text-text-dim tracking-[0.2em]">KOSZYK JEST PUSTY</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {items.map(({ product, quantity }) => {
                const imgUrl = product.images ? Object.values(product.images)[0] : null;
                return (
                  <li key={product.id} className="flex gap-3 px-5 py-4">
                    {/* Thumbnail */}
                    <div className="w-14 h-14 bg-bg-card border border-white/10 flex-shrink-0 overflow-hidden relative">
                      {imgUrl ? (
                        <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-white/15">
                            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1"/>
                            <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {/* Name + remove on same row */}
                      <div className="flex items-start gap-2 mb-1">
                        <p className="flex-1 min-w-0 text-sm text-white font-medium leading-snug line-clamp-2">{product.name}</p>
                        <button
                          onClick={() => removeItem(product.id)}
                          className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-white/30 hover:text-accent transition-colors font-[var(--font-mono)] text-base leading-none mt-0.5"
                          title="Usuń"
                        >×</button>
                      </div>

                      {/* Price */}
                      <p className="font-[var(--font-mono)] text-sm text-accent mb-2">{fmt(product.price ?? 0)} PLN</p>

                      {/* Qty controls + row total */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <button
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="w-7 h-7 border border-white/15 flex items-center justify-center text-text-dim hover:border-accent hover:text-accent transition-colors font-[var(--font-mono)] text-xs"
                          >−</button>
                          <span className="w-8 text-center font-[var(--font-mono)] text-xs text-white border-t border-b border-white/15 h-7 flex items-center justify-center">
                            {quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, Math.min(quantity + 1, product.stock))}
                            disabled={quantity >= product.stock}
                            className="w-7 h-7 border border-white/15 flex items-center justify-center text-text-dim hover:border-accent hover:text-accent transition-colors font-[var(--font-mono)] text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                          >+</button>
                        </div>
                        <span className="font-[var(--font-mono)] text-xs text-text-dim tabular-nums">
                          {fmt((product.price ?? 0) * quantity)} PLN
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-white/10 px-5 pt-4 pb-5 space-y-3">
            {(() => {
              const analysis = analyzeCart(items);
              return (
                <>
                  {analysis.isMixed && (
                    <p className="font-[var(--font-mono)] text-[9px] text-text-dim/50 tracking-[0.12em] uppercase">
                      Możliwość podziału zamówienia przy składaniu
                    </p>
                  )}
                  <div className="flex items-center gap-2 pb-3 border-b border-white/8">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${analysis.fast ? 'bg-green-400' : 'bg-yellow-400'}`} />
                    <span className="font-[var(--font-mono)] text-[9px] text-text-dim tracking-[0.12em] uppercase flex-1 min-w-0 truncate">
                      {analysis.label}
                    </span>
                    <span className={`font-[var(--font-mono)] text-[9px] tracking-[0.12em] uppercase flex-shrink-0 ${analysis.fast ? 'text-green-400' : 'text-yellow-400'}`}>
                      {analysis.timing}
                    </span>
                  </div>
                </>
              );
            })()}

            <div className="flex justify-between items-baseline">
              <span className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.2em] uppercase">Suma</span>
              <span className="font-[var(--font-mono)] text-xl text-accent tabular-nums">{fmt(total)} PLN</span>
            </div>
            <p className="font-[var(--font-mono)] text-[9px] text-text-dim/50 tracking-wider -mt-1">
              Ceny brutto · dostawa liczona przy zamówieniu
            </p>
            <button
              onClick={() => { closeCart(); router.push('/sklep/zamowienie'); }}
              className="w-full py-3.5 bg-accent text-black font-[var(--font-mono)] text-xs tracking-[0.2em] uppercase hover:bg-accent/90 transition-colors"
            >
              PRZEJDŹ DO KASY
            </button>
          </div>
        )}
      </div>
    </>
  );
}
