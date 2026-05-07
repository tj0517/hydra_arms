'use client';

import { createContext, useContext, useEffect, useReducer } from 'react';
import type { ShopProduct } from '@/lib/supabase/types';

export interface CartEntry {
  product: ShopProduct;
  quantity: number;
}

interface CartState {
  items: CartEntry[];
  isOpen: boolean;
}

type CartAction =
  | { type: 'ADD'; product: ShopProduct; quantity: number }
  | { type: 'REMOVE'; productId: number }
  | { type: 'UPDATE'; productId: number; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'LOAD'; items: CartEntry[] };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      const idx = state.items.findIndex(i => i.product.id === action.product.id);
      if (idx >= 0) {
        const items = [...state.items];
        items[idx] = { ...items[idx], quantity: items[idx].quantity + action.quantity };
        return { ...state, items, isOpen: true };
      }
      return { ...state, items: [...state.items, { product: action.product, quantity: action.quantity }], isOpen: true };
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter(i => i.product.id !== action.productId) };
    case 'UPDATE':
      if (action.quantity <= 0) return { ...state, items: state.items.filter(i => i.product.id !== action.productId) };
      return { ...state, items: state.items.map(i => i.product.id === action.productId ? { ...i, quantity: action.quantity } : i) };
    case 'CLEAR':
      return { ...state, items: [], isOpen: false };
    case 'OPEN':
      return { ...state, isOpen: true };
    case 'CLOSE':
      return { ...state, isOpen: false };
    case 'LOAD':
      return { ...state, items: action.items };
  }
}

interface CartContextValue {
  items: CartEntry[];
  itemCount: number;
  total: number;
  isOpen: boolean;
  addItem(product: ShopProduct, quantity?: number): void;
  removeItem(productId: number): void;
  updateQuantity(productId: number, quantity: number): void;
  clearCart(): void;
  openCart(): void;
  closeCart(): void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], isOpen: false });

  useEffect(() => {
    try {
      const raw = localStorage.getItem('hydra-cart');
      if (raw) dispatch({ type: 'LOAD', items: JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('hydra-cart', JSON.stringify(state.items)); } catch { /* ignore */ }
  }, [state.items]);

  const itemCount = state.items.reduce((s, i) => s + i.quantity, 0);
  const total = state.items.reduce((s, i) => s + (i.product.price ?? 0) * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items: state.items,
      isOpen: state.isOpen,
      itemCount,
      total,
      addItem: (p, qty = 1) => dispatch({ type: 'ADD', product: p, quantity: qty }),
      removeItem: id => dispatch({ type: 'REMOVE', productId: id }),
      updateQuantity: (id, qty) => dispatch({ type: 'UPDATE', productId: id, quantity: qty }),
      clearCart: () => dispatch({ type: 'CLEAR' }),
      openCart: () => dispatch({ type: 'OPEN' }),
      closeCart: () => dispatch({ type: 'CLOSE' }),
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart requires CartProvider');
  return ctx;
}
