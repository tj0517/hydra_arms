'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './CartProvider';

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
        className={`fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-[440px] z-[2001] flex flex-col bg-bg border-l border-white/10 transition-transform duration-300 ease-in-out ${
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
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-white/10">
                <rect x="1" y="1" width="38" height="38" stroke="currentColor" strokeWidth="1"/>
                <path d="M12 14h16M14 20h12M16 26h8" stroke="currentColor" strokeWidth="1"/>
              </svg>
              <p className="font-[var(--font-mono)] text-xs text-text-dim tracking-[0.2em]">KOSZYK JEST PUSTY</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5 py-2">
              {items.map(({ product, quantity }) => {
                const imgUrl = product.images ? Object.values(product.images)[0] : null;
                return (
                  <li key={product.id} className="flex gap-4 px-6 py-4 group/item">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 bg-bg-card border border-white/10 flex-shrink-0 overflow-hidden relative">
                      {imgUrl ? (
                        <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-white/15">
                            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1"/>
                            <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1"/>
                            <line x1="2" y1="10" x2="6" y2="10" stroke="currentColor" strokeWidth="1"/>
                            <line x1="14" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="1"/>
                            <line x1="10" y1="2" x2="10" y2="6" stroke="currentColor" strokeWidth="1"/>
                            <line x1="10" y1="14" x2="10" y2="18" stroke="currentColor" strokeWidth="1"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-sm text-white font-medium leading-snug line-clamp-2 pr-4">{product.name}</p>
                      <p className="font-[var(--font-mono)] text-sm text-accent">{fmt(product.price ?? 0)} PLN</p>

                      {/* Qty controls */}
                      <div className="flex items-center gap-0">
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
                        <span className="ml-3 font-[var(--font-mono)] text-xs text-text-dim">
                          = {fmt((product.price ?? 0) * quantity)} PLN
                        </span>
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(product.id)}
                      className="text-white/20 hover:text-accent transition-colors self-start mt-0.5 font-[var(--font-mono)] text-sm"
                      title="Usuń"
                    >×</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-white/10 px-6 py-5 space-y-4">
            <div className="flex justify-between items-center py-1">
              <span className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.2em] uppercase">Suma</span>
              <span className="font-[var(--font-mono)] text-xl text-accent">{fmt(total)} PLN</span>
            </div>
            <div className="text-[10px] font-[var(--font-mono)] text-text-dim/60 tracking-wider -mt-2">
              Ceny brutto · dostawa liczona przy zamówieniu
            </div>
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
