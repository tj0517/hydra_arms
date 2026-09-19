export type FulfillmentRoute = 'own' | 'sourced' | 'pickup'

export interface CartAnalysis {
  route: FulfillmentRoute
  label: string
  timing: string
  fast: boolean
  pickup: boolean
  isMixed: boolean
}

interface AnalysableProduct {
  product_type: string
  source_warehouse: string | null
  requires_license: boolean
  delivery_allowed: boolean
  age_min: number
}

/**
 * Returns true when a product cannot be shipped and requires personal pickup
 * at Hydra Arms. Mirrors the mustPickup check in /api/shop/checkout — both
 * must stay in sync.
 *
 * Rules (confirmed 2026-08):
 * - product_type !== 'standard'  → age_restricted / pickup_only
 * - requires_license             → license verified in person at pickup
 * - !delivery_allowed            → physical/legal delivery restriction
 * - age_min >= 18                → age verified in person at pickup
 */
export function mustPickup(p: AnalysableProduct): boolean {
  return (
    p.product_type !== 'standard' ||
    p.requires_license ||
    !p.delivery_allowed ||
    p.age_min >= 18
  )
}

export function analyzeCart(
  items: { product: AnalysableProduct }[]
): CartAnalysis {
  if (items.length === 0) {
    return { route: 'sourced', label: 'Dostawa kurierska', timing: '', fast: false, pickup: false, isMixed: false }
  }

  const hasPickup = items.some(i => mustPickup(i.product))
  const hasShippable = items.some(i => !mustPickup(i.product))
  const isMixed = hasPickup && hasShippable

  if (hasPickup) {
    return {
      route: 'pickup',
      label: isMixed
        ? 'Część produktów wymaga odbioru osobistego w Hydra Arms'
        : 'Odbiór osobisty w Hydra Arms',
      timing: 'Do uzgodnienia',
      fast: false,
      pickup: true,
      isMixed,
    }
  }

  // All items are shippable — determine timing based on stock location
  const allOwn = items.every(i => i.product.source_warehouse?.toLowerCase() === 'own')

  if (allOwn) {
    return {
      route: 'own',
      label: 'Wysyłka z magazynu własnego',
      timing: 'Szybka realizacja',
      fast: true,
      pickup: false,
      isMixed: false,
    }
  }

  return {
    route: 'sourced',
    label: 'Zamówienie u dostawcy — wysyłka przez Hydra Arms',
    timing: 'Dłuższy czas realizacji',
    fast: false,
    pickup: false,
    isMixed: false,
  }
}
