import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

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

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/konto/login')

  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('id, status, total, shipping_address, fulfillment_route, created_at, user_id')
    .eq('id', id)
    .single()

  if (!order || order.user_id !== user.id) notFound()

  const { data: items } = await admin
    .from('order_items')
    .select('quantity, unit_price, product_snapshot, product_id')
    .eq('order_id', id)

  const addr = order.shipping_address as Record<string, string> | null
  const orderItems = items ?? []
  const itemCount = orderItems.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <main className="min-h-screen pt-32 pb-20 px-6 md:px-16">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div>
          <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.3em] uppercase mb-3">
            HYDRA ARMS / Konto
          </p>
          <div className="flex items-end justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Zamówienie #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <Link
              href="/konto/zamowienia"
              className="font-[var(--font-mono)] text-[10px] text-text-dim hover:text-accent transition-colors tracking-wider"
            >
              ← Zamówienia
            </Link>
          </div>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5">
          <div className="bg-bg-card px-5 py-4">
            <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.2em] uppercase mb-1">Status</p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-white/30'}`} />
              <span className="text-sm text-white">{STATUS_LABELS[order.status] ?? order.status}</span>
            </div>
          </div>
          <div className="bg-bg-card px-5 py-4">
            <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.2em] uppercase mb-1">Kwota</p>
            <p className="font-[var(--font-mono)] text-sm text-accent">{fmt(order.total ?? 0)} PLN</p>
          </div>
          <div className="bg-bg-card px-5 py-4">
            <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.2em] uppercase mb-1">Produkty</p>
            <p className="text-sm text-white">{itemCount} szt.</p>
          </div>
          <div className="bg-bg-card px-5 py-4">
            <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.2em] uppercase mb-1">Data</p>
            <p className="text-sm text-white">
              {new Date(order.created_at).toLocaleDateString('pl-PL', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Items */}
        <section className="border border-white/10 divide-y divide-white/10">
          <div className="px-6 py-4">
            <h2 className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.25em] uppercase">Produkty</h2>
          </div>
          {orderItems.map((item, i) => {
            const snap = item.product_snapshot as Record<string, unknown> | null
            const images = snap?.images as Record<string, string> | null
            const firstImg = images ? Object.values(images).sort()[0] : null
            return (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <div className="w-12 h-12 border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden bg-white/[0.02]">
                  {firstImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={firstImg} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-text-dim/30 text-lg">+</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/sklep/${item.product_id}`}
                    className="text-sm text-white hover:text-accent transition-colors leading-snug truncate block"
                  >
                    {(snap?.name as string) || 'Produkt'}
                  </Link>
                  <p className="font-[var(--font-mono)] text-[10px] text-text-dim mt-0.5">
                    {snap?.sku ? `SKU: ${snap.sku} · ` : ''}{item.quantity} × {fmt(item.unit_price)} PLN
                  </p>
                </div>
                <p className="font-[var(--font-mono)] text-sm text-accent whitespace-nowrap">
                  {fmt(item.unit_price * item.quantity)} PLN
                </p>
              </div>
            )
          })}
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

        {/* Fulfillment info */}
        {order.fulfillment_route && (
          <section className="border border-white/10 px-6 py-5">
            <h2 className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.25em] uppercase mb-3">Realizacja</h2>
            <p className="text-sm text-white">
              {order.fulfillment_route === 'direct_H1' && 'Wysyłka bezpośrednia z magazynu H1'}
              {order.fulfillment_route === 'direct_H2' && 'Wysyłka bezpośrednia z magazynu H2'}
              {order.fulfillment_route === 'consolidated' && 'Wysyłka skonsolidowana'}
            </p>
          </section>
        )}

        <div className="flex items-center justify-center gap-6 pt-4">
          <Link
            href="/konto/zamowienia"
            className="border border-white/15 px-6 py-3 font-[var(--font-mono)] text-xs text-white/70 hover:border-accent hover:text-accent transition-colors tracking-[0.15em]"
          >
            ZAMÓWIENIA
          </Link>
          <Link
            href="/sklep"
            className="border border-white/15 px-6 py-3 font-[var(--font-mono)] text-xs text-white/70 hover:border-accent hover:text-accent transition-colors tracking-[0.15em]"
          >
            SKLEP
          </Link>
        </div>
      </div>
    </main>
  )
}
