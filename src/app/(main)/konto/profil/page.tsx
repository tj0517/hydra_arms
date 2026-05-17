'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

export default function ProfilPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [saving, setSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/konto/login')
        return
      }
      setUser(user)
      setFirstName((user.user_metadata?.first_name as string) ?? '')
      setLastName((user.user_metadata?.last_name as string) ?? '')
      setLoading(false)
    })
  }, [router, supabase.auth])

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setProfileMsg(null)

    const { error } = await supabase.auth.updateUser({
      data: { first_name: firstName.trim(), last_name: lastName.trim() },
    })

    if (error) {
      setProfileMsg({ ok: false, text: error.message })
    } else {
      setProfileMsg({ ok: true, text: 'Dane zostały zaktualizowane' })
      router.refresh()
    }
    setSaving(false)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)

    if (newPassword.length < 8) {
      setPwMsg({ ok: false, text: 'Nowe hasło musi mieć co najmniej 8 znaków' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ ok: false, text: 'Hasła nie są identyczne' })
      return
    }

    setPwSaving(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: currentPassword,
    })

    if (signInError) {
      setPwMsg({ ok: false, text: 'Aktualne hasło jest nieprawidłowe' })
      setPwSaving(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPwMsg({ ok: false, text: error.message })
    } else {
      setPwMsg({ ok: true, text: 'Hasło zostało zmienione' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setPwSaving(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen pt-32 pb-20 px-6">
        <div className="max-w-lg mx-auto flex justify-center">
          <div className="w-10 h-10 border border-white/20 border-t-accent rounded-full animate-spin" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen pt-32 pb-20 px-6 md:px-16">
      <div className="max-w-2xl mx-auto space-y-12">
        {/* Header */}
        <div>
          <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.3em] uppercase mb-3">
            HYDRA ARMS / Konto
          </p>
          <div className="flex items-end justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Profil</h1>
            <Link
              href="/konto"
              className="font-[var(--font-mono)] text-[10px] text-text-dim hover:text-accent transition-colors tracking-wider"
            >
              ← Konto
            </Link>
          </div>
        </div>

        {/* Personal data */}
        <section className="border border-white/10">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.25em] uppercase">
              Dane osobowe
            </h2>
          </div>
          <form onSubmit={handleProfileSave} className="px-6 py-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Imię" value={firstName} onChange={setFirstName} />
              <Field label="Nazwisko" value={lastName} onChange={setLastName} />
            </div>

            <div className="space-y-1.5">
              <span className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.15em] uppercase">
                Email
              </span>
              <p className="text-sm text-white/50 px-4 py-3 border border-white/5 bg-white/[0.02]">
                {user?.email}
              </p>
            </div>

            {profileMsg && (
              <p className={`font-[var(--font-mono)] text-xs ${profileMsg.ok ? 'text-green-400' : 'text-red-300'}`}>
                {profileMsg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-accent text-black font-[var(--font-mono)] text-xs tracking-[0.2em] uppercase hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'ZAPISYWANIE...' : 'ZAPISZ ZMIANY'}
            </button>
          </form>
        </section>

        {/* Password change */}
        <section className="border border-white/10">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.25em] uppercase">
              Zmiana hasła
            </h2>
          </div>
          <form onSubmit={handlePasswordChange} className="px-6 py-6 space-y-5">
            <Field
              label="Aktualne hasło"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              required
            />
            <Field
              label="Nowe hasło"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              required
            />
            <Field
              label="Potwierdź nowe hasło"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
            />

            {pwMsg && (
              <p className={`font-[var(--font-mono)] text-xs ${pwMsg.ok ? 'text-green-400' : 'text-red-300'}`}>
                {pwMsg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={pwSaving}
              className="px-8 py-3 border border-white/15 text-white/70 font-[var(--font-mono)] text-xs tracking-[0.2em] uppercase hover:border-accent hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pwSaving ? 'ZMIENIAM...' : 'ZMIEŃ HASŁO'}
            </button>
          </form>
        </section>

        {/* Account info */}
        <section className="border border-white/10 px-6 py-5">
          <h2 className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.25em] uppercase mb-3">
            Informacje o koncie
          </h2>
          <div className="space-y-2 text-xs text-text-dim">
            <p>
              Konto utworzone:{' '}
              <span className="text-white">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('pl-PL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—'}
              </span>
            </p>
            <p>
              Ostatnie logowanie:{' '}
              <span className="text-white">
                {user?.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleDateString('pl-PL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </span>
            </p>
          </div>
        </section>
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
