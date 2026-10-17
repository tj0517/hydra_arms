import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { addOrder, getOrderStatusList, getOrders } from '@/lib/baselinker/client'
import { mapBLStatus } from '@/lib/shop/blStatusMap'
import { isSyncAuthorized, isCronAuthorized } from '@/lib/apiAuth'
import type { BLOrder } from '@/lib/baselinker/types'
import { canPushToBaseLinker } from '@/lib/shop/shopMode'
import { BL_ORDER_COLUMNS, buildBlOrderParams } from '@/lib/shop/blOrderPayload'
import { recordBlMockDelivery } from '@/lib/baselinker/mockCounter'

export const maxDuration = 300

// Vercel cron invokes this path with GET + `Authorization: Bearer $CRON_SECRET`
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runOrderSync()
}

// Manual trigger (VPS / curl) with x-sync-secret
export async function POST(req: NextRequest) {
  if (!isSyncAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runOrderSync()
}

async function runOrderSync() {
  const supabase = createAdminClient()

  // ── Phase A: Retry orphaned orders (BL push failed at checkout) ───────────
  const phaseA = { found: 0, retried: 0, ok: 0 }

  const blStatusId = parseInt(
    process.env.BASELINKER_ORDER_STATUS_ID ?? process.env.BASELINKER_STATUS_PAID ?? '0',
    10,
  )
  if (blStatusId === 0) {
    console.log('[orders/sync] Phase A skipped — BASELINKER_STATUS_PAID not set')
  }
  // HA-2.08: no orphan retry in verification mode (or with an unknown SHOP_MODE).
  const blPushAllowed = canPushToBaseLinker()
  if (!blPushAllowed) {
    console.log('[orders/sync] Phase A skipped — SHOP_MODE does not allow BaseLinker pushes')
  }

  // Only retry paid orders — pending_payment orders must not go to BL before payment.
  const { data: orphaned } = await supabase
    .from('orders')
    .select(BL_ORDER_COLUMNS)
    .is('baselinker_order_id', null)
    .eq('status', 'paid')
    // HA-2.08: test orders (verification mode) are never pushed, whatever SHOP_MODE is now.
    .eq('is_test', false)
    .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  phaseA.found = orphaned?.length ?? 0

  for (const order of blStatusId === 0 || !blPushAllowed ? [] : orphaned ?? []) {
    phaseA.retried++
    try {
      if (!order.shipping_address) continue

      const { data: items } = await supabase
        .from('order_items')
        .select('quantity, unit_price, product_snapshot')
        .eq('order_id', order.id)

      if (!items?.length) continue

      const params = buildBlOrderParams(order, items, blStatusId)
      const blOrderId = await addOrder(params, { blockedRetries: 1 })
      if (process.env.BASELINKER_MOCK === 'true') recordBlMockDelivery(order.id, params)

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
    const newStatus = mapBLStatus(statusName) as import('@/lib/supabase/types').OrderStatus
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
