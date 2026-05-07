'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface OrderData {
  id: string
  status: string
  total: number | null
  shipping_address: Record<string, string> | null
  created_at: string
  items: {
    quantity: number
    unit_price: number
    product_snapshot: { name?: string; sku?: string } | null
  }[]
}

const fmt = (n: number) =>
  new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

export default function OrderConfirmationClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/shop/orders/${orderId}`)
      .then(res => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(data => setOrder(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [orderId])

  if (loading) {
    return (
      <main className="min-h-screen pt-32 pb-20 px-6">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-10 h-10 border border-white/20 border-t-accent rounded-full animate-spin mx-auto" />
        </div>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="min-h-screen pt-32 pb-20 px-6">
        <div className="max-w-lg mx-auto text-center space-y-6">
          <p className="text-sm text-red-300">Nie znaleziono zamówienia</p>
          <Link
            href="/sklep"
            className="inline-block border border-white/15 px-6 py-3 font-[var(--font-mono)] text-xs text-white/70 hover:border-accent hover:text-accent transition-colors tracking-widest"
          >
            WRÓĆ DO SKLEPU
          </Link>
        </div>
      </main>
    )
  }

  const addr = order.shipping_address

  return (
    <main className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Success banner */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-2 border-accent rounded-full flex items-center justify-center mx-auto">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Zamówienie złożone</h1>
          <p className="font-[var(--font-mono)] text-xs text-text-dim tracking-[0.15em]">
            Nr zamówienia: <span className="text-accent">{order.id.slice(0, 8).toUpperCase()}</span>
          </p>
          <p className="font-[var(--font-mono)] text-[10px] text-accent/70 tracking-widest uppercase">
            Płatność zasymulowana — automatycznie zaakceptowana
          </p>
        </div>

        {/* Order details */}
        <section className="border border-white/10 divide-y divide-white/10">
          <div className="px-6 py-4">
            <h2 className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.25em] uppercase">Produkty</h2>
          </div>
          {order.items.map((item, i) => (
            <div key={i} className="px-6 py-3 flex justify-between items-center gap-4">
              <div className="min-w-0">
                <p className="text-sm text-white leading-snug truncate">{item.product_snapshot?.name || 'Produkt'}</p>
                <p className="font-[var(--font-mono)] text-[10px] text-text-dim mt-0.5">
                  {item.quantity} × {fmt(item.unit_price)} PLN
                </p>
              </div>
              <p className="font-[var(--font-mono)] text-sm text-accent whitespace-nowrap">
                {fmt(item.unit_price * item.quantity)} PLN
              </p>
            </div>
          ))}
          <div className="px-6 py-4 flex justify-between items-center">
            <span className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-widest uppercase">Razem</span>
            <span className="font-[var(--font-mono)] text-xl text-accent">{fmt(order.total ?? 0)} PLN</span>
          </div>
        </section>

        {/* Shipping address */}
        {addr && (
          <section className="border border-white/10 px-6 py-5 space-y-2">
            <h2 className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.25em] uppercase mb-3">Adres dostawy</h2>
            <p className="text-sm text-white">{addr.firstName} {addr.lastName}</p>
            <p className="text-sm text-text-dim">{addr.street}</p>
            <p className="text-sm text-text-dim">{addr.zip} {addr.city}</p>
            {addr.email && <p className="text-sm text-text-dim mt-2">{addr.email}</p>}
            {addr.phone && <p className="text-sm text-text-dim">{addr.phone}</p>}
          </section>
        )}

        {/* Status */}
        <section className="border border-white/10 px-6 py-5">
          <h2 className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.25em] uppercase mb-3">Status</h2>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-sm text-white capitalize">{order.status === 'paid' ? 'Opłacone' : order.status}</span>
          </div>
        </section>

        <div className="text-center pt-4">
          <Link
            href="/sklep"
            className="inline-block border border-white/15 px-8 py-3.5 font-[var(--font-mono)] text-xs text-white/70 hover:border-accent hover:text-accent transition-colors tracking-[0.2em]"
          >
            KONTYNUUJ ZAKUPY
          </Link>
        </div>
      </div>
    </main>
  )
}
