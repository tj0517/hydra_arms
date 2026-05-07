import OrderConfirmationClient from '@/components/shop/OrderConfirmationClient'

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <OrderConfirmationClient orderId={id} />
}
