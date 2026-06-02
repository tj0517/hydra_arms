export type FulfillmentRoute = 'direct_H1' | 'direct_H2' | 'consolidated' | 'pickup'

export interface CartAnalysis {
  route: FulfillmentRoute
  label: string
  timing: string
  fast: boolean
  pickup: boolean
}

export function analyzeCart(
  items: { product: { source_warehouse: string | null; product_type: string } }[]
): CartAnalysis {
  const hasRestricted = items.some(i => i.product.product_type !== 'standard')

  if (hasRestricted) {
    return {
      route: 'pickup',
      label: 'Odbiór osobisty — wymagany dla części produktów',
      timing: 'Do uzgodnienia',
      fast: false,
      pickup: true,
    }
  }

  const sources = new Set(
    items.map(i => i.product.source_warehouse).filter(Boolean)
  )

  if (sources.size === 1) {
    const src = [...sources][0]
    if (src === 'H1')
      return { route: 'direct_H1', label: 'Hurtownia 1 — dostawa bezpośrednia', timing: 'Szybko', fast: true, pickup: false }
    if (src === 'H2')
      return { route: 'direct_H2', label: 'Hurtownia 2 — dostawa bezpośrednia', timing: 'Szybko', fast: true, pickup: false }
  }

  // Multiple different known warehouses → consolidation needed
  if (sources.size > 1)
    return { route: 'consolidated', label: 'Magazyn własny — konsolidacja', timing: 'Dłuższy czas', fast: false, pickup: false }

  // No warehouse data set yet — default to standard delivery
  return { route: 'consolidated', label: 'Dostawa kurierska', timing: 'Standardowy czas dostawy', fast: true, pickup: false }
}
