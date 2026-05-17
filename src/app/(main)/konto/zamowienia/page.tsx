import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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

export default async function ZamowieniaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/konto/login')

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, status, total, shipping_address, fulfillment_route, created_at
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen pt-32 pb-20 px-6 md:px-16">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.3em] uppercase mb-3">
            HYDRA ARMS / Konto
          </p>
          <div className="flex items-end justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Zamówienia</h1>
            <Link
              href="/konto"
              className="font-[var(--font-mono)] text-[10px] text-text-dim hover:text-accent transition-colors tracking-wider"
            >
              ← Konto
            </Link>
          </div>
        </div>

        {!orders?.length ? (
          <div className="py-16 text-center space-y-4">
            <p className="font-[var(--font-mono)] text-xs text-text-dim tracking-wider">Brak zamówień</p>
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
              const addr = order.shipping_address as Record<string, string> | null
              return (
                <li key={order.id}>
                  <Link
                    href={`/konto/zamowienia/${order.id}`}
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
