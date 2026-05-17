import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from './actions'
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

export default async function KontoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/konto/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const firstName = user.user_metadata?.first_name as string | undefined
  const lastName = user.user_metadata?.last_name as string | undefined
  const displayName = firstName ? `${firstName} ${lastName ?? ''}`.trim() : user.email

  return (
    <main className="min-h-screen pt-32 pb-20 px-6 md:px-16">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.3em] uppercase mb-3">
              HYDRA ARMS / Konto
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{displayName}</h1>
            <p className="font-[var(--font-mono)] text-xs text-text-dim mt-1">{user.email}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="font-[var(--font-mono)] text-[10px] text-text-dim hover:text-accent transition-colors tracking-[0.2em] uppercase"
            >
              [ WYLOGUJ ]
            </button>
          </form>
        </div>

        {/* Quick tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/5 mb-12">
          <Link
            href="/sklep"
            className="bg-bg-card px-6 py-5 group hover:bg-white/[0.03] transition-colors"
          >
            <p className="font-[var(--font-mono)] text-[10px] text-accent tracking-[0.25em] mb-1">SKLEP</p>
            <p className="text-sm text-text-dim group-hover:text-white transition-colors">Kontynuuj zakupy</p>
          </Link>
          <Link
            href="/konto/zamowienia"
            className="bg-bg-card px-6 py-5 group hover:bg-white/[0.03] transition-colors"
          >
            <p className="font-[var(--font-mono)] text-[10px] text-accent tracking-[0.25em] mb-1">ZAMÓWIENIA</p>
            <p className="text-sm text-text-dim group-hover:text-white transition-colors">
              {orders?.length ? `${orders.length} ostatnich` : 'Historia zamówień'}
            </p>
          </Link>
          <Link
            href="/konto/profil"
            className="bg-bg-card px-6 py-5 group hover:bg-white/[0.03] transition-colors"
          >
            <p className="font-[var(--font-mono)] text-[10px] text-accent tracking-[0.25em] mb-1">PROFIL</p>
            <p className="text-sm text-text-dim group-hover:text-white transition-colors">Dane i hasło</p>
          </Link>
        </div>

        {/* Orders */}
        <section>
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-6">
            <h2 className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.25em] uppercase">
              Ostatnie zamówienia
            </h2>
            {orders && orders.length > 0 && (
              <Link
                href="/konto/zamowienia"
                className="font-[var(--font-mono)] text-[10px] text-text-dim hover:text-accent transition-colors tracking-wider"
              >
                Zobacz wszystkie →
              </Link>
            )}
          </div>

          {!orders?.length ? (
            <div className="py-12 text-center space-y-3">
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
              {orders.map(order => (
                <li key={order.id}>
                  <Link
                    href={`/konto/zamowienia/${order.id}`}
                    className="flex items-center justify-between px-5 py-4 border border-white/10 hover:border-white/20 transition-colors group"
                  >
                    <div>
                      <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-wider mb-1">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-text-dim">
                        {new Date(order.created_at).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="font-[var(--font-mono)] text-sm text-accent">
                          {order.total ? `${fmt(order.total)} PLN` : '—'}
                        </p>
                        <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-wider mt-0.5 uppercase">
                          {STATUS_LABELS[order.status] ?? order.status}
                        </p>
                      </div>
                      <span className="font-[var(--font-mono)] text-[10px] text-text-dim/40 group-hover:text-accent transition-colors">
                        →
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
