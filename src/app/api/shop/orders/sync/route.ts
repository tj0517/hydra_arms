import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { addOrder, getOrderStatusList, getOrders } from '@/lib/baselinker/client'
import { mapBLStatus } from '@/lib/shop/blStatusMap'
import type { BLOrder } from '@/lib/baselinker/types'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sync-secret')
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // ── Phase A: Retry orphaned orders (BL push failed at checkout) ───────────
  const phaseA = { found: 0, retried: 0, ok: 0 }

  const { data: orphaned } = await supabase
    .from('orders')
    .select('id, shipping_address, fulfillment_route')
    .is('baselinker_order_id', null)
    .neq('status', 'cancelled')
    .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  phaseA.found = orphaned?.length ?? 0

  for (const order of orphaned ?? []) {
    phaseA.retried++
    try {
      const addr = order.shipping_address as Record<string, string> | null
      if (!addr) continue

      const { data: items } = await supabase
        .from('order_items')
        .select('quantity, unit_price, product_snapshot')
        .eq('order_id', order.id)

      if (!items?.length) continue

      const isPickup = order.fulfillment_route === 'pickup'

      const blOrderId = await addOrder({
        order_status_id: parseInt(process.env.BASELINKER_ORDER_STATUS_ID ?? '0', 10),
        currency: 'PLN',
        payment_method: 'Przelew',
        payment_method_cod: 0,
        paid: 1,
        user_login: addr.email ?? '',
        phone: addr.phone ?? '',
        email: addr.email ?? '',
        delivery_method: isPickup ? 'Odbiór osobisty' : 'Kurier',
        delivery_price: 0,
        delivery_fullname: `${addr.firstName ?? ''} ${addr.lastName ?? ''}`.trim(),
        delivery_address: addr.street ?? '',
        delivery_city: addr.city ?? '',
        delivery_postcode: addr.zip ?? '',
        delivery_country_code: 'PL',
        products: items.map(item => {
          const snap = (item.product_snapshot ?? {}) as Record<string, unknown>
          return {
            storage: 'db' as const,
            storage_id: 0,
            product_id: String(snap.id ?? '0'),
            variant_id: 0,
            name: (snap.name as string) ?? 'Produkt',
            sku: (snap.sku as string) ?? '',
            ean: (snap.ean as string) ?? '',
            quantity: item.quantity,
            price_brutto: item.unit_price,
            tax_rate: (snap.tax_rate as number) ?? 23,
          }
        }),
      })

      await supabase
        .from('orders')
        .update({ baselinker_order_id: blOrderId })
        .eq('id', order.id)

      phaseA.ok++
      console.log(`[orders/sync] Phase A: retried order ${order.id} → BL ${blOrderId}`)
    } catch (err) {
      console.error(`[orders/sync] Phase A: retry failed for order ${order.id}:`, err)
    }
  }

  // ── Phase B: Status sync ──────────────────────────────────────────────────
  const phaseB = { checked: 0, updated: 0 }

  const { data: activeOrders } = await supabase
    .from('orders')
    .select('id, baselinker_order_id, status, tracking_number, shipping_carrier')
    .not('baselinker_order_id', 'is', null)
    .not('status', 'in', '("delivered","cancelled")')

  if (!activeOrders?.length) {
    return NextResponse.json({ phase_a: phaseA, phase_b: phaseB })
  }

  // Fetch BL status list → build id→name map
  let statusMap: Map<number, string> = new Map()
  try {
    const statuses = await getOrderStatusList()
    statusMap = new Map(statuses.map(s => [s.id, s.name]))
  } catch (err) {
    console.error('[orders/sync] Phase B: failed to fetch status list:', err)
    return NextResponse.json({ phase_a: phaseA, phase_b: phaseB, error: 'Failed to fetch BL status list' }, { status: 500 })
  }

  // Fetch all BL orders (paginate)
  const allBLOrders: BLOrder[] = []
  let page = 1
  while (true) {
    try {
      const { orders, hasMore } = await getOrders({ page })
      allBLOrders.push(...orders)
      if (!hasMore) break
      page++
    } catch (err) {
      console.error('[orders/sync] Phase B: failed to fetch BL orders:', err)
      break
    }
  }

  const blOrderMap = new Map<number, BLOrder>(allBLOrders.map(o => [o.order_id, o]))

  for (const order of activeOrders) {
    phaseB.checked++
    const blOrder = blOrderMap.get(order.baselinker_order_id!)
    if (!blOrder) continue

    const statusName = statusMap.get(blOrder.order_status_id) ?? ''
    const newStatus = mapBLStatus(statusName)
    const newTracking = blOrder.delivery_tracking_number || null
    const newCarrier = blOrder.delivery_package_module || null

    if (
      newStatus !== order.status ||
      newTracking !== order.tracking_number ||
      newCarrier !== order.shipping_carrier
    ) {
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          bl_status_id: blOrder.order_status_id,
          tracking_number: newTracking,
          shipping_carrier: newCarrier,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (!error) {
        phaseB.updated++
        console.log(`[orders/sync] Phase B: updated order ${order.id}: ${order.status} → ${newStatus}`)
      }
    }
  }

  return NextResponse.json({ phase_a: phaseA, phase_b: phaseB })
}
