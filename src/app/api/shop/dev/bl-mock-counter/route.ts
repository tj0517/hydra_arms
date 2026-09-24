import { NextRequest, NextResponse } from 'next/server'
import { getBlMockCounter } from '@/lib/baselinker/mockCounter'

// Only available when BASELINKER_MOCK=true — 404 otherwise
export async function GET(req: NextRequest) {
  if (process.env.BASELINKER_MOCK !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const orderId = req.nextUrl.searchParams.get('orderId')
  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  }

  return NextResponse.json({ orderId, count: getBlMockCounter(orderId) })
}
