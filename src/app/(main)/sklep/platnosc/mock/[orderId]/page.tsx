import { notFound } from 'next/navigation'
import MockPaymentClient from './MockPaymentClient'
import { createAdminClient } from '@/lib/supabase/admin'
import { getP24Mode } from '@/lib/p24/mode'

// Only renders when P24_MODE=mock
export default async function MockPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{ sid?: string }>
}) {
  if (getP24Mode() !== 'mock') notFound()

  const { orderId } = await params
  const { sid: p24SessionId } = await searchParams

  if (!p24SessionId) notFound()

  const supabase = createAdminClient()

  const { data: attempt } = await supabase
    .from('order_payments')
    .select('id, amount_grosz, currency, status')
    .eq('p24_session_id', p24SessionId)
    .eq('order_id', orderId)
    .single()

  if (!attempt) notFound()

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, total, shipping_address')
    .eq('id', orderId)
    .single()

  if (!order) notFound()

  return (
    <MockPaymentClient
      orderId={orderId}
      p24SessionId={p24SessionId}
      amountGrosze={attempt.amount_grosz}
      currency={attempt.currency}
      attemptStatus={attempt.status}
      orderStatus={order.status}
    />
  )
}
