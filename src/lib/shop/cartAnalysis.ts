export type FulfillmentRoute = 'direct_H1' | 'direct_H2' | 'consolidated'

export interface CartAnalysis {
  route: FulfillmentRoute
  label: string
  timing: string
  fast: boolean
}

export function analyzeCart(
  items: { product: { source_warehouse: string | null } }[]
): CartAnalysis {
  const sources = new Set(
    items.map(i => i.product.source_warehouse).filter(Boolean)
  )

  if (sources.size === 1) {
    const src = [...sources][0]
    if (src === 'H1')
      return { route: 'direct_H1', label: 'Hurtownia 1 — dostawa bezpośrednia', timing: 'Szybko', fast: true }
    if (src === 'H2')
      return { route: 'direct_H2', label: 'Hurtownia 2 — dostawa bezpośrednia', timing: 'Szybko', fast: true }
  }

  return { route: 'consolidated', label: 'Magazyn własny — konsolidacja', timing: 'Dłuższy czas', fast: false }
}
