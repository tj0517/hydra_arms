'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const fmt = (n: number) =>
  new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

interface Props {
  orderId: string
  p24SessionId: string
  amountGrosze: number
  currency: string
  attemptStatus: string
  orderStatus: string
}

export default function MockPaymentClient({
  orderId, p24SessionId, amountGrosze, currency, attemptStatus, orderStatus,
}: Props) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'paying' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const alreadyPaid = orderStatus === 'paid' || attemptStatus === 'verified'
  const amount = (amountGrosze / 100).toFixed(2)

  async function handlePay() {
    setState('paying')
    setErrorMsg('')
    try {
      const res = await fetch('/api/shop/payments/p24/mock-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, p24SessionId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      setState('done')
      router.push(`/sklep/zamowienie/${orderId}`)
    } catch (err) {
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Nieznany błąd')
    }
  }

  function handleReject() {
    router.push(`/sklep/zamowienie/${orderId}`)
  }

  return (
    <main className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Mock banner */}
        <div className="border border-yellow-500/40 bg-yellow-500/5 px-5 py-3">
          <p className="font-[var(--font-mono)] text-[10px] text-yellow-400 tracking-[0.2em] uppercase">
            Środowisko mock — brak prawdziwych płatności
          </p>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Symulacja płatności P24</h1>
          <p className="font-[var(--font-mono)] text-xs text-text-dim tracking-widest">
            Zamówienie: {orderId.slice(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Amount */}
        <div className="border border-white/10 px-6 py-5 text-center">
          <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.25em] uppercase mb-2">Do zapłaty</p>
          <p className="font-[var(--font-mono)] text-3xl text-accent">
            {fmt(parseFloat(amount))} {currency}
          </p>
        </div>

        {alreadyPaid ? (
          <div className="border border-green-500/30 bg-green-500/5 px-6 py-5 text-center space-y-3">
            <p className="font-[var(--font-mono)] text-xs text-green-400 tracking-widest">Zamówienie już opłacone</p>
            <button
              onClick={() => router.push(`/sklep/zamowienie/${orderId}`)}
              className="border border-white/15 px-6 py-3 font-[var(--font-mono)] text-xs text-white/70 hover:border-accent hover:text-accent transition-colors tracking-widest"
            >
              SZCZEGÓŁY ZAMÓWIENIA
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {state === 'error' && (
              <div className="border border-red-500/30 bg-red-500/5 px-5 py-3">
                <p className="font-[var(--font-mono)] text-[10px] text-red-400">{errorMsg}</p>
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={state === 'paying' || state === 'done'}
              className="w-full py-4 bg-accent text-black font-[var(--font-mono)] text-xs tracking-[0.2em] uppercase hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {state === 'paying' ? 'PRZETWARZANIE...' : 'ZAPŁAĆ (SYMULACJA)'}
            </button>

            <button
              onClick={handleReject}
              disabled={state === 'paying' || state === 'done'}
              className="w-full py-3 border border-white/15 font-[var(--font-mono)] text-xs text-white/50 hover:border-white/30 hover:text-white/70 transition-colors tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ANULUJ / ODRZUĆ
            </button>
          </div>
        )}

        <p className="font-[var(--font-mono)] text-[9px] text-text-dim/40 tracking-wider text-center">
          Session ID: {p24SessionId.slice(0, 8)}...
        </p>
      </div>
    </main>
  )
}
