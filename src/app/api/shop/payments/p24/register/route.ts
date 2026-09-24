import { NextRequest, NextResponse } from 'next/server'
import { registerPayment } from '@/lib/shop/registerPayment'

// Register a new payment attempt for a pending_payment order (used for retry)
export async function POST(req: NextRequest) {
  let body: { orderId?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { orderId, email } = body
  if (!orderId || !email) {
    return NextResponse.json({ error: 'Missing orderId or email' }, { status: 400 })
  }

  try {
    const proto = req.headers.get('x-forwarded-proto') ?? 'http'
    const host = req.headers.get('host') ?? 'localhost:3001'
    const { paymentUrl } = await registerPayment(orderId, {
      baseUrl: `${proto}://${host}`,
      email,
    })
    return NextResponse.json({ payment_url: paymentUrl })
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'NOT_PENDING') {
      return NextResponse.json({ error: 'Order is not pending_payment' }, { status: 409 })
    }
    console.error('[p24/register]', err)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
