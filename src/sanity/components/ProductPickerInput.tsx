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

const MIN_QUERY = 2
const MAX_RESULTS = 50
const SEARCH_DEBOUNCE_MS = 300

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing, fixed in HA-1.10
    setSelected(new Set(initial.map(String)))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Products: search results + names of selected items (HA-2.36) ──────────
  // Never the whole catalogue: ?ids= loads the selected items once on mount,
  // ?q= (debounced, min 2 chars, max 50 results) feeds the list below.

  const [known, setKnown] = useState<Map<string, ProductItem>>(new Map())
  const [results, setResults] = useState<ProductItem[]>([])
  const [search, setSearch] = useState('')
  const [loadingSelected, setLoadingSelected] = useState(false)
  const [searching, setSearching] = useState(false)
  const [apiError, setApiError] = useState(false)

  const remember = (items: ProductItem[]) =>
    setKnown((prev) => {
      const next = new Map(prev)
      for (const p of items) next.set(String(p.id), p)
      return next
    })

  useEffect(() => {
    const ids = ((value as unknown[] | undefined) ?? []).map(String).filter((s) => /^\d+$/.test(s))
    if (!ids.length) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot load on mount
    setLoadingSelected(true)
    fetch(`/api/shop/products-list?ids=${ids.join(',')}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: ProductItem[]) => remember(data))
      .catch(() => setApiError(true))
      .finally(() => setLoadingSelected(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const term = search.trim()

  useEffect(() => {
    if (term.length < MIN_QUERY) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale results
      setResults([])
      setSearching(false)
      return
    }
    const ctrl = new AbortController()
    setSearching(true)
    const timer = setTimeout(() => {
      fetch(`/api/shop/products-list?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((data: ProductItem[]) => {
          setResults(data)
          remember(data)
          setApiError(false)
          setSearching(false)
        })
        .catch(() => {
          if (ctrl.signal.aborted) return
          setApiError(true)
          setSearching(false)
        })
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [term])

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

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Selected chips */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {Array.from(selected).map((idStr) => {
            const p = known.get(idStr)
            const name = loadingSelected && !p
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
        placeholder="Szukaj po nazwie lub SKU (min. 2 znaki)…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={readOnly}
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
        {term.length < MIN_QUERY && (
          <div style={{ padding: '12px 14px', color: '#888' }}>
            Wpisz co najmniej {MIN_QUERY} znaki nazwy lub SKU.
          </div>
        )}
        {searching && (
          <div style={{ padding: '12px 14px', color: '#888' }}>
            Szukanie…
          </div>
        )}
        {apiError && (
          <div style={{ padding: '12px 14px', color: '#c0392b' }}>
            Nie można załadować produktów. Sprawdź połączenie z serwerem.
          </div>
        )}
        {term.length >= MIN_QUERY && !searching && !apiError && results.length === 0 && (
          <div style={{ padding: '12px 14px', color: '#888' }}>
            {`Brak wyników dla „${term}"`}
          </div>
        )}
        {!searching &&
          !apiError &&
          results.map((p, i) => {
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
        {selected.size} wybranych
        {term.length >= MIN_QUERY && !searching && ` · ${results.length} wyników`}
        {results.length >= MAX_RESULTS && ' (pokazano pierwsze 50 — doprecyzuj frazę)'}
      </div>
    </div>
  )
}
