'use client';

import { usePathname } from 'next/navigation';
import { useCart } from './CartProvider';

/** Floating cart button — always visible on shop pages, elsewhere only when cart has items */
export default function CartTrigger() {
  const { itemCount, openCart } = useCart();
  const pathname = usePathname();
  const isShop = pathname.startsWith('/sklep');

  if (!isShop && itemCount === 0) return null;

  return (
    <button
      onClick={openCart}
      className="fixed bottom-6 right-6 z-[500] flex items-center gap-3 bg-bg border border-accent/50 px-4 py-3 font-[var(--font-mono)] text-xs text-accent tracking-widest hover:bg-accent/5 transition-all duration-200 shadow-[0_0_20px_rgba(19,255,21,0.08)]"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 2h2l1.5 6h5l1.5-5H4.5"/>
        <circle cx="7" cy="12" r="0.75" fill="currentColor"/>
        <circle cx="10" cy="12" r="0.75" fill="currentColor"/>
      </svg>
      KOSZYK
      <span className="w-5 h-5 bg-accent text-black text-[10px] font-bold flex items-center justify-center rounded-full leading-none">
        {itemCount}
      </span>
    </button>
  );
}
