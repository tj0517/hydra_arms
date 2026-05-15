'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Nieprawidłowy email lub hasło')
      setLoading(false)
      return
    }

    router.push('/konto')
    router.refresh()
  }

  return (
    <main className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-md mx-auto">
        <div className="mb-10">
          <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.3em] uppercase mb-3">
            HYDRA ARMS / Konto
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Logowanie</h1>
        </div>

        {error && (
          <div className="mb-6 border border-red-500/30 bg-red-500/5 px-5 py-4">
            <p className="font-[var(--font-mono)] text-xs text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            required
          />
          <Field
            label="Hasło"
            type="password"
            value={password}
            onChange={setPassword}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-accent text-black font-[var(--font-mono)] text-xs tracking-[0.2em] uppercase hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'LOGOWANIE...' : 'ZALOGUJ SIĘ'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10">
          <Link
            href="/konto/rejestracja"
            className="font-[var(--font-mono)] text-[10px] text-text-dim hover:text-accent transition-colors tracking-wider"
          >
            Nie masz konta? Zarejestruj się →
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
