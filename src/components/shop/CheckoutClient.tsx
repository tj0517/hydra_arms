'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from './CartProvider'
import Link from 'next/link'
import { analyzeCart } from '@/lib/shop/cartAnalysis'
import { createClient } from '@/lib/supabase/client'

const fmt = (n: number) =>
  new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

type Step = 'shipping' | 'processing' | 'error'

export default function CheckoutClient() {
  const { items, total, clearCart } = useCart()
  const router = useRouter()
  const [step, setStep] = useState<Step>('shipping')
  const analysis = analyzeCart(items)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    zip: '',
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const m = user.user_metadata ?? {}
      const fullName: string = m.full_name ?? m.name ?? ''
      const parts = fullName.trim().split(' ')
      setForm(prev => ({
        ...prev,
        email: user.email ?? prev.email,
        firstName: m.first_name ?? m.given_name ?? parts[0] ?? prev.firstName,
        lastName: m.last_name ?? m.family_name ?? parts.slice(1).join(' ') ?? prev.lastName,
        phone: m.phone ?? prev.phone,
      }))
    })
  }, [])

  function updateField(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!items.length) return

    setStep('processing')
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
          shipping: form,
          idempotency_key: idempotencyKey,
          fulfillment_route: analysis.route,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStep('error')
        setSubmitting(false)
        setError(data.error || 'Wystąpił błąd')
        return
      }

      clearCart()
      router.push(`/sklep/zamowienie/${data.order_id}`)
    } catch {
      setStep('error')
      setSubmitting(false)
      setError('Brak połączenia z serwerem')
    }
  }

  if (!items.length && step === 'shipping') {
    return (
      <main className="min-h-screen pt-32 pb-20 px-6">
        <div className="max-w-lg mx-auto text-center space-y-6">
          <p className="font-[var(--font-mono)] text-xs text-text-dim tracking-[0.2em] uppercase">Koszyk jest pusty</p>
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

  if (step === 'processing') {
    return (
      <main className="min-h-screen pt-32 pb-20 px-6">
        <div className="max-w-lg mx-auto text-center space-y-6">
          <div className="w-12 h-12 border border-accent/40 border-t-accent rounded-full animate-spin mx-auto" />
          <p className="font-[var(--font-mono)] text-xs text-text-dim tracking-[0.2em] uppercase">
            Przetwarzanie płatności...
          </p>
          <p className="font-[var(--font-mono)] text-[10px] text-text-dim/60 tracking-wider">
            SYMULACJA — automatyczna akceptacja
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <Link href="/sklep" className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.2em] hover:text-accent transition-colors">
            ← SKLEP
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-4 tracking-tight">Zamówienie</h1>
        </div>

        {error && (
          <div className="mb-8 border border-red-500/30 bg-red-500/5 px-5 py-4 flex items-start gap-3">
            <span className="text-red-400 text-lg leading-none">!</span>
            <div>
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={() => setStep('shipping')}
                className="mt-2 font-[var(--font-mono)] text-[10px] text-red-400 hover:text-white transition-colors tracking-widest"
              >
                SPRÓBUJ PONOWNIE
              </button>
            </div>
          </div>
        )}

        <div className={`flex items-center gap-3 border px-4 py-3 mb-6 ${
          analysis.pickup
            ? 'border-blue-500/20 bg-blue-500/5'
            : analysis.fast
            ? 'border-green-500/20 bg-green-500/5'
            : 'border-yellow-500/20 bg-yellow-500/5'
        }`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            analysis.pickup ? 'bg-blue-400' : analysis.fast ? 'bg-green-400' : 'bg-yellow-400'
          }`} />
          <div className="space-y-0.5">
            <p className="font-[var(--font-mono)] text-[10px] text-white tracking-widest uppercase">{analysis.label}</p>
            <p className="font-[var(--font-mono)] text-[9px] text-text-dim tracking-wider">{analysis.timing}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12">
          {/* Form */}
          <form onSubmit={handleSubmit} id="checkout-form" className="space-y-8">
            <section className="space-y-5">
              <h2 className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.25em] uppercase border-b border-white/10 pb-3">
                Dane kontaktowe
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Imię" value={form.firstName} onChange={v => updateField('firstName', v)} required />
                <Field label="Nazwisko" value={form.lastName} onChange={v => updateField('lastName', v)} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Email" type="email" value={form.email} onChange={v => updateField('email', v)} required />
                <Field label="Telefon" type="tel" value={form.phone} onChange={v => updateField('phone', v)} />
              </div>
            </section>

            {analysis.pickup ? (
              <section className="space-y-5">
                <h2 className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.25em] uppercase border-b border-white/10 pb-3">
                  Odbiór osobisty
                </h2>
                <div className="border border-blue-500/20 bg-blue-500/5 px-5 py-4 space-y-2">
                  <p className="font-[var(--font-mono)] text-xs text-blue-300 tracking-wider">ODBIÓR W SIEDZIBIE HYDRA ARMS</p>
                  <p className="text-sm text-text-dim">
                    Zamówienie zostanie przygotowane do odbioru osobistego. Skontaktujemy się z Tobą telefonicznie lub mailowo w celu ustalenia terminu.
                  </p>
                </div>
              </section>
            ) : (
              <section className="space-y-5">
                <h2 className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.25em] uppercase border-b border-white/10 pb-3">
                  Adres dostawy
                </h2>
                <Field label="Ulica i numer" value={form.street} onChange={v => updateField('street', v)} required />
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-4">
                  <Field label="Miasto" value={form.city} onChange={v => updateField('city', v)} required />
                  <Field label="Kod pocztowy" value={form.zip} onChange={v => updateField('zip', v)} required placeholder="00-000" />
                </div>
              </section>
            )}

            <section className="space-y-5">
              <h2 className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.25em] uppercase border-b border-white/10 pb-3">
                Płatność
              </h2>
              <div className="border border-accent/20 bg-accent/5 px-5 py-4 space-y-2">
                <p className="font-[var(--font-mono)] text-xs text-accent tracking-wider">TRYB SYMULACJI</p>
                <p className="text-sm text-text-dim">
                  Płatność zostanie automatycznie zaakceptowana. W wersji produkcyjnej zostaniesz przekierowany do bramki płatności.
                </p>
              </div>
            </section>
          </form>

          {/* Order summary */}
          <aside className="lg:sticky lg:top-28 self-start space-y-6">
            <h2 className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.25em] uppercase border-b border-white/10 pb-3">
              Podsumowanie ({items.length} {items.length === 1 ? 'produkt' : items.length < 5 ? 'produkty' : 'produktów'})
            </h2>

            <ul className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
              {items.map(({ product, quantity }) => {
                const imgUrl = product.images ? Object.values(product.images)[0] : null
                return (
                  <li key={product.id} className="flex gap-3">
                    <div className="w-12 h-12 bg-bg-card border border-white/10 flex-shrink-0 overflow-hidden">
                      {imgUrl ? (
                        <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">?</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white leading-snug line-clamp-2">{product.name}</p>
                      <p className="font-[var(--font-mono)] text-[10px] text-text-dim mt-0.5">
                        {quantity} × {fmt(product.price ?? 0)} PLN
                      </p>
                    </div>
                    <p className="font-[var(--font-mono)] text-xs text-accent whitespace-nowrap">
                      {fmt((product.price ?? 0) * quantity)}
                    </p>
                  </li>
                )
              })}
            </ul>

            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="flex justify-between">
                <span className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-widest">PRODUKTY</span>
                <span className="font-[var(--font-mono)] text-sm text-white">{fmt(total)} PLN</span>
              </div>
              <div className="flex justify-between">
                <span className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-widest">DOSTAWA</span>
                <span className="font-[var(--font-mono)] text-sm text-text-dim">do ustalenia</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-white/10">
                <span className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-widest uppercase">Razem</span>
                <span className="font-[var(--font-mono)] text-xl text-accent">{fmt(total)} PLN</span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="w-full py-4 bg-accent text-black font-[var(--font-mono)] text-xs tracking-[0.2em] uppercase hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ZŁÓŻ ZAMÓWIENIE
            </button>

            <p className="font-[var(--font-mono)] text-[9px] text-text-dim/50 tracking-wider text-center">
              Składając zamówienie akceptujesz regulamin sklepu
            </p>
          </aside>
        </div>
      </div>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.15em] uppercase">
        {label}{required && <span className="text-accent ml-1">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full bg-transparent border border-white/15 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-accent focus:outline-none transition-colors"
      />
    </label>
  )
}
