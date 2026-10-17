import CheckoutClient from '@/components/shop/CheckoutClient'
import { getShippingPriceList } from '@/lib/shop/shippingPrices'

// Prices and the Geowidget token come from env at request time (HA-2.02).
export const dynamic = 'force-dynamic'

export default function CheckoutPage() {
  // Display only — the checkout route reads the price list again and the RPC computes the cost.
  const priceList = getShippingPriceList()
  // Public token by InPost's design (bound to the site domain). Unset → manual Paczkomat code field.
  const geowidgetToken = process.env.INPOST_GEOWIDGET_TOKEN?.trim() || null
  return (
    <CheckoutClient
      priceList={priceList.ok ? priceList.priceList : null}
      geowidgetToken={geowidgetToken}
    />
  )
}
