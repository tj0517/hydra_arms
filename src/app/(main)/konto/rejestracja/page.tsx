'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function update(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Hasła nie są identyczne')
      return
    }
    if (form.password.length < 8) {
      setError('Hasło musi mieć co najmniej 8 znaków')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen pt-32 pb-20 px-6">
        <div className="max-w-md mx-auto space-y-6">
          <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.3em] uppercase">
            Konto utworzone
          </p>
          <h1 className="text-2xl font-bold text-white">Sprawdź email</h1>
          <p className="text-sm text-text-dim leading-relaxed">
            Wysłaliśmy link aktywacyjny na adres{' '}
            <span className="text-white">{form.email}</span>.{' '}
            Kliknij w link, aby aktywować konto.
          </p>
          <Link
            href="/konto/login"
            className="inline-block font-[var(--font-mono)] text-[10px] text-accent hover:text-white transition-colors tracking-wider"
          >
            ← Wróć do logowania
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-md mx-auto">
        <div className="mb-10">
          <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.3em] uppercase mb-3">
            HYDRA ARMS / Konto
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Rejestracja</h1>
        </div>

        {error && (
          <div className="mb-6 border border-red-500/30 bg-red-500/5 px-5 py-4">
            <p className="font-[var(--font-mono)] text-xs text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Imię" value={form.firstName} onChange={v => update('firstName', v)} required />
            <Field label="Nazwisko" value={form.lastName} onChange={v => update('lastName', v)} required />
          </div>
          <Field label="Email" type="email" value={form.email} onChange={v => update('email', v)} required />
          <Field label="Hasło" type="password" value={form.password} onChange={v => update('password', v)} required />
          <Field label="Potwierdź hasło" type="password" value={form.confirmPassword} onChange={v => update('confirmPassword', v)} required />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-accent text-black font-[var(--font-mono)] text-xs tracking-[0.2em] uppercase hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'TWORZENIE KONTA...' : 'UTWÓRZ KONTO'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10">
          <Link
            href="/konto/login"
            className="font-[var(--font-mono)] text-[10px] text-text-dim hover:text-accent transition-colors tracking-wider"
          >
            ← Masz już konto? Zaloguj się
          </Link>
        </div>
      </div>
    </main>
  )
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  required,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  required?: boolean
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
        className="w-full bg-transparent border border-white/15 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-accent focus:outline-none transition-colors"
      />
    </label>
  )
}
