/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState } from 'react'
import { set, unset } from 'sanity'
import type { ArrayOfPrimitivesInputProps } from 'sanity'

interface ProductItem {
  id: number
  name: string
  category: string
  price: number | null
  inStock: boolean
}

export function ProductPickerInput(props: ArrayOfPrimitivesInputProps) {
  const { value, onChange, readOnly } = props

  // ── Local selection state (source of truth for the UI) ──────────────────────
  // Initialised once from Sanity's value; not re-derived from it on every render
  // to avoid the "can't uncheck" bug caused by lagging prop updates.

  const initialised = useRef(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Sync Sanity → local state on first mount only
  useEffect(() => {
    if (initialised.current) return
    initialised.current = true
    const initial = (value as unknown[] | undefined) ?? []
    setSelected(new Set(initial.map(String)))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Product list ─────────────────────────────────────────────────────────────

  const [products, setProducts] = useState<ProductItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(false)

  useEffect(() => {
    fetch('/api/shop/products-list')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: ProductItem[]) => { setProducts(data); setLoading(false) })
      .catch(() => { setApiError(true); setLoading(false) })
  }, [])

  // ── Toggle ───────────────────────────────────────────────────────────────────

  function toggle(id: number) {
    if (readOnly) return
    const idStr = String(id)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idStr)) next.delete(idStr)
      else next.add(idStr)
      // Persist to Sanity
      const arr = Array.from(next)
      onChange(arr.length ? set(arr) : unset())
      return next
    })
  }

  function removeChip(idStr: string) {
    if (readOnly) return
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(idStr)
      const arr = Array.from(next)
      onChange(arr.length ? set(arr) : unset())
      return next
    })
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const catLabel = (cat: string) => {
    if (cat.includes(' > ')) return cat.split(' > ').at(-1) ?? cat
    if (cat.includes('/')) return cat.split('/').at(-1)?.trim() ?? cat
    return cat
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)

  const productMap = new Map(products.map((p) => [String(p.id), p]))

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      catLabel(p.category).toLowerCase().includes(search.toLowerCase()),
  )

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Selected chips */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {Array.from(selected).map((idStr) => {
            const p = productMap.get(idStr)
            const name = loading
              ? `#${idStr} (ładowanie…)`
              : (p?.name ?? `#${idStr} — nie znaleziono`)
            return (
              <span
                key={idStr}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 3,
                  background: '#e8f4fd',
                  border: '1px solid #b3d7f5',
                  fontSize: 12,
                  color: '#1a5276',
                }}
              >
                {name}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeChip(idStr)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0 2px',
                      color: '#555',
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                    title="Usuń"
                  >
                    ×
                  </button>
                )}
              </span>
            )
          })}
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Szukaj po nazwie lub kategorii…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={readOnly || loading}
        style={{
          padding: '7px 10px',
          border: '1px solid #ccc',
          borderRadius: 4,
          fontSize: 13,
          outline: 'none',
        }}
      />

      {/* Product list */}
      <div
        style={{
          maxHeight: 320,
          overflowY: 'auto',
          border: '1px solid #e0e0e0',
          borderRadius: 4,
          fontSize: 13,
        }}
      >
        {loading && (
          <div style={{ padding: '12px 14px', color: '#888' }}>
            Ładowanie produktów…
          </div>
        )}
        {apiError && (
          <div style={{ padding: '12px 14px', color: '#c0392b' }}>
            Nie można załadować produktów. Sprawdź połączenie z serwerem.
          </div>
        )}
        {!loading && !apiError && filtered.length === 0 && (
          <div style={{ padding: '12px 14px', color: '#888' }}>
            {search ? `Brak wyników dla „${search}"` : 'Brak produktów w katalogu'}
          </div>
        )}
        {!loading &&
          !apiError &&
          filtered.map((p, i) => {
            const isSelected = selected.has(String(p.id))
            return (
              <label
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 12px',
                  cursor: readOnly ? 'default' : 'pointer',
                  background: isSelected
                    ? '#f0f7ff'
                    : i % 2 === 0
                    ? '#fafafa'
                    : '#fff',
                  borderBottom: '1px solid #f0f0f0',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(p.id)}
                  disabled={readOnly}
                  style={{ margin: 0, accentColor: '#2980b9' }}
                />
                <span style={{ flex: 1, lineHeight: 1.4 }}>
                  <span style={{ fontWeight: isSelected ? 600 : 400 }}>
                    {p.name}
                  </span>
                  <span style={{ color: '#999', marginLeft: 8, fontSize: 11 }}>
                    {catLabel(p.category)}
                    {p.price != null && ` · ${fmt(p.price)} PLN`}
                    {!p.inStock && (
                      <span style={{ color: '#e74c3c', marginLeft: 4 }}>
                        · BRAK
                      </span>
                    )}
                  </span>
                </span>
              </label>
            )
          })}
      </div>

      <div style={{ fontSize: 11, color: '#aaa' }}>
        {selected.size} wybranych · {products.length} produktów w katalogu
      </div>
    </div>
  )
}
