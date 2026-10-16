import type { Metadata } from 'next'
import Link from 'next/link'
import { getGuestOrderStatus } from '@/lib/shop/guestOrderStatus'

// Bearer link: never indexed, never cached, never leaked through Referer.
export const metadata: Metadata = {
  title: 'Status zamówienia',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}
export const dynamic = 'force-dynamic'

const fmt = (n: number) =>
  new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Czeka na płatność',
  paid: 'Opłacone',
  shipped: 'Wysłane',
  delivered: 'Dostarczone',
  cancelled: 'Anulowane',
}

const monoLabel = 'font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.25em] uppercase'

function Notice({ testId, title, text }: { testId: string; title: string; text: string }) {
  return (
    <main className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-lg mx-auto text-center space-y-6" data-testid={testId}>
        <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
        <p className="text-sm text-text-dim">{text}</p>
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

export default async function GuestOrderStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string | string[] }>
}) {
  const { id } = await params
  const { t } = await searchParams
  const result = await getGuestOrderStatus(id, typeof t === 'string' ? t : null)

  if (result.kind === 'expired') {
    return (
      <Notice
        testId="order-status-expired"
        title="Link wygasł"
        text="Ten link do statusu zamówienia przestał być ważny. Skontaktuj się z nami, a sprawdzimy zamówienie za Ciebie."
      />
    )
  }
  if (result.kind === 'not_found') {
    return (
      <Notice
        testId="order-status-refused"
        title="Nie można wyświetlić zamówienia"
        text="Link jest nieprawidłowy. Skorzystaj z linku z najnowszej wiadomości e-mail o zamówieniu."
      />
    )
  }

  const { order } = result
  const delivery = order.fulfillment_route === 'pickup'
    ? 'Odbiór osobisty w siedzibie HYDRA ARMS'
    : 'Dostawa kurierem'

  return (
    <main className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-2xl mx-auto space-y-10" data-testid="order-status-ok">
        <div className="text-center space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Status zamówienia</h1>
          <p className="font-[var(--font-mono)] text-xs text-text-dim tracking-[0.15em]">
            Nr zamówienia: <span className="text-accent">{order.id.slice(0, 8).toUpperCase()}</span>
          </p>
        </div>

        <section className="border border-white/10 px-6 py-5">
          <h2 className={`${monoLabel} mb-3`}>Status</h2>
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${order.status === 'pending_payment' ? 'bg-yellow-500' : 'bg-accent'}`} />
            <span className="text-sm text-white" data-testid="order-status-label">
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
        </section>

        <section className="border border-white/10 divide-y divide-white/10">
          <div className="px-6 py-4">
            <h2 className={monoLabel}>Produkty</h2>
          </div>
          {order.items.map((item, i) => (
            <div key={i} className="px-6 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-white leading-snug">{item.name}</p>
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
            <span className={monoLabel}>Razem</span>
            <span className="font-[var(--font-mono)] text-xl text-accent">{fmt(order.total)} PLN</span>
          </div>
        </section>

        <section className="border border-white/10 px-6 py-5">
          <h2 className={`${monoLabel} mb-3`}>Dostawa</h2>
          <p className="text-sm text-white">{delivery}</p>
        </section>
      </div>
    </main>
  )
}
