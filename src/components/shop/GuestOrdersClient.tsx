'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface GuestOrder {
  id: string
  status: string
  total: number | null
  shipping_address: Record<string, string> | null
  fulfillment_route: string | null
  created_at: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const STATUS_LABELS: Record<string, string> = {
  pending: 'Oczekuje',
  paid: 'Opłacone',
  shipped: 'Wysłane',
  delivered: 'Dostarczone',
  cancelled: 'Anulowane',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  paid: 'bg-accent',
  shipped: 'bg-blue-400',
  delivered: 'bg-green-400',
  cancelled: 'bg-red-400',
}

export default function GuestOrdersClient() {
  const [orders, setOrders] = useState<GuestOrder[] | null>(null)

  useEffect(() => {
    fetch('/api/shop/orders/guest')
      .then(res => res.json())
      .then(data => setOrders(data.orders ?? []))
      .catch(() => setOrders([]))
  }, [])

  return (
    <main className="min-h-screen pt-32 pb-20 px-6 md:px-16">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.3em] uppercase mb-3">
            HYDRA ARMS / Sklep
          </p>
          <div className="flex items-end justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Moje zamówienia</h1>
            <Link
              href="/sklep"
              className="font-[var(--font-mono)] text-[10px] text-text-dim hover:text-accent transition-colors tracking-wider"
            >
              ← Sklep
            </Link>
          </div>
          <p className="text-xs text-text-dim/60 mt-3">
            Lista zamówień złożonych bez logowania z tej przeglądarki. Aby mieć stały dostęp do historii zamówień, załóż konto.
          </p>
        </div>

        {orders === null ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border border-white/20 border-t-accent rounded-full animate-spin mx-auto" />
          </div>
        ) : !orders.length ? (
          <div className="py-16 text-center space-y-4">
            <p className="font-[var(--font-mono)] text-xs text-text-dim tracking-wider">
              Brak zamówień powiązanych z tą przeglądarką
            </p>
            <Link
              href="/sklep"
              className="inline-block font-[var(--font-mono)] text-[10px] text-accent hover:text-white transition-colors tracking-wider"
            >
              Przejdź do sklepu →
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {orders.map(order => {
              const addr = order.shipping_address
              return (
                <li key={order.id}>
                  <Link
                    href={`/sklep/zamowienie/${order.id}`}
                    className="block border border-white/10 hover:border-white/20 transition-colors group"
                  >
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-white/30'}`} />
                          <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-wider">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="font-[var(--font-mono)] text-[10px] text-text-dim/60 tracking-wider uppercase">
                            {STATUS_LABELS[order.status] ?? order.status}
                          </p>
                        </div>
                        <p className="text-xs text-text-dim">
                          {new Date(order.created_at).toLocaleDateString('pl-PL', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {addr && (
                          <p className="text-xs text-text-dim/50 mt-0.5">
                            {addr.firstName} {addr.lastName} — {addr.city}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <p className="font-[var(--font-mono)] text-sm text-accent">
                          {order.total ? `${fmt(order.total)} PLN` : '—'}
                        </p>
                        <span className="font-[var(--font-mono)] text-[10px] text-text-dim/40 group-hover:text-accent transition-colors">
                          →
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
