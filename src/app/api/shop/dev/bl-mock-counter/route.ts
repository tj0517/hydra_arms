import { NextRequest, NextResponse } from 'next/server'
import { getBlMockCounter, getBlMockDelivery } from '@/lib/baselinker/mockCounter'

// Only available when BASELINKER_MOCK=true — 404 otherwise
export async function GET(req: NextRequest) {
  if (process.env.BASELINKER_MOCK !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const orderId = req.nextUrl.searchParams.get('orderId')
  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  }

  // delivery: delivery fields of the last mock addOrder payload (HA-2.02), never buyer data.
  return NextResponse.json({ orderId, count: getBlMockCounter(orderId), delivery: getBlMockDelivery(orderId) })
}
