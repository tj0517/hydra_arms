'use client'

import { useEffect, useRef } from 'react'
import { normalizeLockerCode } from '@/lib/shop/shipping'

/**
 * InPost Paczkomat picker (HA-2.02, approved by tj 2026-10-17).
 *
 * With a token: loads the official Geowidget from geowidget.inpost.pl — only when
 * this component mounts, i.e. after the customer picked Paczkomat — and fills the
 * code field from the selected point. Without a token nothing is loaded from
 * InPost; the customer types the code. The code field is always there, so a
 * failed script load still leaves a way to order. The server validates the code
 * again; name/address from the widget are informational only.
 */

const GEOWIDGET_JS = 'https://geowidget.inpost.pl/inpost-geowidget.js'
const GEOWIDGET_CSS = 'https://geowidget.inpost.pl/inpost-geowidget.css'
const CALLBACK = 'hydraInpostPointSelected'

export interface LockerPoint {
  id: string
  name: string | null
  address: string | null
  postcode: string | null
  city: string | null
}

interface GeowidgetPoint {
  name?: string
  address?: { line1?: string | null; line2?: string | null }
  address_details?: { post_code?: string | null; city?: string | null }
}

function loadOnce(tag: 'script' | 'link', id: string, url: string) {
  if (document.getElementById(id)) return
  if (tag === 'script') {
    const el = document.createElement('script')
    el.id = id
    el.src = url
    el.defer = true
    document.head.appendChild(el)
  } else {
    const el = document.createElement('link')
    el.id = id
    el.rel = 'stylesheet'
    el.href = url
    document.head.appendChild(el)
  }
}

export default function InpostLockerPicker({
  token,
  code,
  point,
  onCodeChange,
  onPointSelected,
  invalid,
}: {
  token: string | null
  code: string
  point: LockerPoint | null
  onCodeChange: (code: string) => void
  onPointSelected: (point: LockerPoint) => void
  invalid: boolean
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const onPointRef = useRef(onPointSelected)
  useEffect(() => { onPointRef.current = onPointSelected }, [onPointSelected])

  useEffect(() => {
    if (!token || !mapRef.current) return
    const w = window as unknown as Record<string, unknown>
    w[CALLBACK] = (p: GeowidgetPoint) => {
      const id = normalizeLockerCode(p?.name)
      if (!id) return
      onPointRef.current({
        id,
        name: `Paczkomat ${id}`,
        address: p.address?.line1 ?? null,
        postcode: p.address_details?.post_code ?? null,
        city: p.address_details?.city ?? null,
      })
    }
    loadOnce('link', 'inpost-geowidget-css', GEOWIDGET_CSS)
    loadOnce('script', 'inpost-geowidget-js', GEOWIDGET_JS)

    const container = mapRef.current
    const widget = document.createElement('inpost-geowidget')
    widget.setAttribute('token', token)
    widget.setAttribute('language', 'pl')
    // Paczkomaty only (tj D2 2026-10-17) — no PaczkoPunkty.
    widget.setAttribute('config', 'parcelCollect247')
    widget.setAttribute('onpoint', CALLBACK)
    container.appendChild(widget)
    return () => {
      container.removeChild(widget)
      delete w[CALLBACK]
    }
  }, [token])

  return (
    <div className="space-y-3" data-testid="locker-picker">
      {token && <div ref={mapRef} className="h-[420px] border border-white/10" data-testid="locker-map" />}
      <label className="block space-y-1.5">
        <span className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-[0.15em] uppercase">
          Kod Paczkomatu<span className="text-accent ml-1">*</span>
        </span>
        <input
          type="text"
          name="locker_code"
          value={code}
          onChange={e => onCodeChange(e.target.value.toUpperCase())}
          placeholder="np. KRA01M"
          maxLength={12}
          aria-invalid={invalid}
          className="w-full bg-transparent border border-white/15 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-accent focus:outline-none transition-colors"
        />
      </label>
      {point && point.id === code && (point.address || point.city) && (
        <p className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-wider" data-testid="locker-selected">
          {point.name} · {[point.address, [point.postcode, point.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
        </p>
      )}
      {!token && (
        <p className="font-[var(--font-mono)] text-[9px] text-text-dim/70 tracking-wider">
          Kod automatu (np. KRA01M) znajdziesz na mapie Paczkomatów na stronie lub w aplikacji InPost.
        </p>
      )}
      {invalid && (
        <p role="alert" className="text-sm text-red-400" data-testid="locker-error">
          Wpisz poprawny kod Paczkomatu (np. KRA01M).
        </p>
      )}
    </div>
  )
}
