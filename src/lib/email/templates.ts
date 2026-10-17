import 'server-only'
import type { CompanyInfo } from './company'
import { isShippingMethod, SHIPPING_METHOD_LABELS } from '@/lib/shop/shipping'

export interface OrderEmailItem {
  name: string
  quantity: number
  unitPrice: number
}

export interface OrderEmailData {
  orderId: string
  total: number
  fulfillmentRoute: string | null
  /** HA-2.02: NULL for orders created before migration 018 (then no delivery line, total only). */
  shippingMethod: string | null
  shippingCost: number | null
  /** InPost Paczkomat code for shipping_method = inpost_locker. */
  deliveryPointId: string | null
  firstName: string
  lastName: string
  email: string
  items: OrderEmailItem[]
  company: CompanyInfo
  /** Absolute signed guest status link (HA-2.19); null → the link is omitted. */
  statusUrl: string | null
}

const mono = `'Courier New', Courier, monospace`
const green = `#13ff15`
const dim = `rgba(19,255,21,0.45)`
const bg = `#060806`
const border = `rgba(19,255,21,0.18)`

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const fmt = (n: number) =>
  new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

function describeDelivery(route: string | null, method: string | null, pointId: string | null): string {
  if (route !== 'pickup' && isShippingMethod(method)) {
    return method === 'inpost_locker' && pointId
      ? `${SHIPPING_METHOD_LABELS[method]} ${pointId}`
      : SHIPPING_METHOD_LABELS[method]
  }
  switch (route) {
    case 'pickup':
      return 'Odbiór osobisty w siedzibie HYDRA ARMS'
    case 'own':
    case 'sourced':
      return 'Dostawa kurierem'
    default:
      return 'Dostawa kurierem'
  }
}

function shortOrderId(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase()
}

function itemsTable(items: OrderEmailItem[]): string {
  return items
    .map(
      item => `
    <tr>
      <td style="padding:8px 0;color:#e8ffe8;font-size:12px;font-family:${mono};vertical-align:top;">${escapeHtml(item.name)}</td>
      <td style="padding:8px 0;color:${dim};font-size:11px;font-family:${mono};text-align:right;white-space:nowrap;vertical-align:top;">${item.quantity} &times; ${fmt(item.unitPrice)} PLN</td>
      <td style="padding:8px 0 8px 16px;color:${green};font-size:12px;font-family:${mono};text-align:right;white-space:nowrap;vertical-align:top;">${fmt(item.quantity * item.unitPrice)} PLN</td>
    </tr>`,
    )
    .join('')
}

function companyBlock(company: CompanyInfo): string {
  return `
  <p style="margin:0 0 4px;font-family:${mono};font-size:12px;color:#e8ffe8;letter-spacing:0.04em;">${escapeHtml(company.name)}</p>
  <p style="margin:0 0 4px;font-family:${mono};font-size:11px;color:${dim};letter-spacing:0.04em;">${escapeHtml(company.address)}</p>
  <p style="margin:0;font-family:${mono};font-size:11px;color:${dim};letter-spacing:0.04em;">NIP ${escapeHtml(company.nip)} &nbsp;&middot;&nbsp; REGON ${escapeHtml(company.regon)} &nbsp;&middot;&nbsp; KRS ${escapeHtml(company.krs)}</p>`
}

function statusLinkBlock(statusUrl: string | null): string {
  if (!statusUrl) return ''
  return `
  <p style="margin:0 0 12px;font-family:${mono};font-size:11px;color:${dim};line-height:1.8;letter-spacing:0.03em;">
    Status zamówienia sprawdzisz bez logowania pod tym linkiem (ważny 30 dni):<br>
    <a href="${escapeHtml(statusUrl)}" style="color:${green};text-decoration:none;word-break:break-all;">${escapeHtml(statusUrl)}</a>
  </p>`
}

// Without SHOP_BASE_URL there is no absolute address, so the sentence stays
// but carries no link (a relative href is useless in a mail client).
function accountNudge(): string {
  const baseUrl = (process.env.SHOP_BASE_URL ?? '').trim().replace(/\/+$/, '')
  const href = /^https?:\/\/[^/]/.test(baseUrl) ? `${baseUrl}/konto/zamowienia` : null
  const link = href
    ? ` — <a href="${escapeHtml(href)}" style="color:${green};text-decoration:none;">${escapeHtml(href)}</a>`
    : ''
  return `
  <p style="margin:0;font-family:${mono};font-size:11px;color:${dim};line-height:1.8;letter-spacing:0.03em;">
    Możesz też założyć konto (lub zalogować się) na ten sam adres e-mail, aby widzieć wszystkie swoje zamówienia${link}
  </p>`
}

function wrap(titleBar: string, bootLines: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${bg};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid ${border};background:${bg};">

      <tr>
        <td style="padding:10px 20px;border-bottom:1px solid ${border};background:rgba(19,255,21,0.03);">
          <span style="color:${dim};font-size:10px;font-family:${mono};letter-spacing:0.15em;text-transform:uppercase;">
            &#9679; &#9679; &#9679;&nbsp;&nbsp;&nbsp;${titleBar}
          </span>
        </td>
      </tr>

      <tr><td style="padding:32px 28px;">
        <p style="margin:0 0 20px;font-family:${mono};font-size:10px;color:rgba(19,255,21,0.3);line-height:1.9;letter-spacing:0.04em;">
          ${bootLines}
        </p>
        <p style="margin:0 0 16px;font-family:${mono};font-size:10px;color:rgba(19,255,21,0.15);letter-spacing:0.1em;">&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;</p>

        ${body}

      </td></tr>

      <tr>
        <td style="padding:12px 28px;border-top:1px solid ${border};">
          <span style="font-family:${mono};font-size:10px;color:rgba(19,255,21,0.2);letter-spacing:0.12em;text-transform:uppercase;">
            HYDRA<span style="color:${dim};">.</span>ARMS &mdash; ZAMÓWIENIE #${'{ORDER_ID}'}
          </span>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// HA-2.02: goods + delivery above RAZEM, so the e-mail adds up to the charged total.
function deliveryRows(data: OrderEmailData): string {
  if (!isShippingMethod(data.shippingMethod) || data.shippingCost === null) return ''
  const goods = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const row = (label: string, value: string) => `
          <tr>
            <td style="padding:8px 0 0;font-family:${mono};font-size:11px;color:${dim};letter-spacing:0.1em;">${label}</td>
            <td style="padding:8px 0 0;font-family:${mono};font-size:12px;color:#e8ffe8;text-align:right;">${value}</td>
          </tr>`
  return (
    row('PRODUKTY', `${fmt(goods)} PLN`) +
    row(`DOSTAWA &middot; ${escapeHtml(SHIPPING_METHOD_LABELS[data.shippingMethod].toUpperCase())}`, `${fmt(data.shippingCost)} PLN`)
  )
}

function orderBody(data: OrderEmailData, statusLabel: string): string {
  const fullName = `${data.firstName} ${data.lastName}`.trim()
  return `
        <p style="margin:0 0 4px;font-family:${mono};font-size:11px;color:${dim};letter-spacing:0.1em;">$ hydra --status-zamowienia</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid ${border};background:rgba(19,255,21,0.02);margin-bottom:20px;">
          <tr><td style="padding:16px 20px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-family:${mono};font-size:11px;color:${dim};letter-spacing:0.08em;width:130px;padding:4px 0;vertical-align:top;">NR ZAMÓWIENIA</td>
                <td style="font-family:${mono};font-size:12px;color:${green};padding:4px 0;">${shortOrderId(data.orderId)}</td>
              </tr>
              <tr>
                <td style="font-family:${mono};font-size:11px;color:${dim};letter-spacing:0.08em;padding:4px 0;vertical-align:top;">STATUS</td>
                <td style="font-family:${mono};font-size:12px;color:${green};padding:4px 0;">${escapeHtml(statusLabel)}</td>
              </tr>
              <tr>
                <td style="font-family:${mono};font-size:11px;color:${dim};letter-spacing:0.08em;padding:4px 0;vertical-align:top;">DOSTAWA</td>
                <td style="font-family:${mono};font-size:12px;color:#e8ffe8;padding:4px 0;">${escapeHtml(describeDelivery(data.fulfillmentRoute, data.shippingMethod, data.deliveryPointId))}</td>
              </tr>
              ${fullName ? `<tr>
                <td style="font-family:${mono};font-size:11px;color:${dim};letter-spacing:0.08em;padding:4px 0;vertical-align:top;">ODBIORCA</td>
                <td style="font-family:${mono};font-size:12px;color:#e8ffe8;padding:4px 0;">${escapeHtml(fullName)}</td>
              </tr>` : ''}
            </table>
          </td></tr>
        </table>

        <p style="margin:0 0 12px;font-family:${mono};font-size:11px;color:${dim};letter-spacing:0.1em;">$ cat /var/log/hydra/pozycje.txt</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:8px;">
          ${itemsTable(data.items)}
        </table>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid ${border};margin-bottom:24px;">
          ${deliveryRows(data)}
          <tr>
            <td style="padding:10px 0 0;font-family:${mono};font-size:11px;color:${dim};letter-spacing:0.1em;">RAZEM</td>
            <td style="padding:10px 0 0;font-family:${mono};font-size:15px;color:${green};text-align:right;">${fmt(data.total)} PLN</td>
          </tr>
        </table>

        <p style="margin:0 0 16px;font-family:${mono};font-size:10px;color:rgba(19,255,21,0.15);letter-spacing:0.1em;">&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;</p>

        ${statusLinkBlock(data.statusUrl)}
        ${accountNudge()}

        <p style="margin:20px 0 16px;font-family:${mono};font-size:10px;color:rgba(19,255,21,0.15);letter-spacing:0.1em;">&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;</p>

        ${companyBlock(data.company)}`
}

export function renderOrderReceivedEmail(data: OrderEmailData): { subject: string; html: string } {
  const html = wrap(
    'hydra-arms@terminal:~/zamowienie — POTWIERDZENIE ZŁOŻENIA v1.0',
    `Inicjalizacja zamówienia... <span style="color:${dim}">OK</span><br>
     Rezerwacja pozycji magazynowych... <span style="color:${dim}">OK</span><br>
     Oczekiwanie na płatność...&nbsp;<span style="color:${green};font-weight:bold;">W TOKU</span>`,
    orderBody(data, 'Czeka na płatność'),
  ).replace('{ORDER_ID}', shortOrderId(data.orderId))
  return { subject: `[ HYDRA ARMS ] Zamówienie ${shortOrderId(data.orderId)} przyjęte — czeka na płatność`, html }
}

export function renderPaymentReceivedEmail(data: OrderEmailData): { subject: string; html: string } {
  const html = wrap(
    'hydra-arms@terminal:~/platnosc — POTWIERDZENIE PŁATNOŚCI v1.0',
    `Weryfikacja płatności... <span style="color:${dim}">OK</span><br>
     Aktualizacja statusu zamówienia...&nbsp;<span style="color:${green};font-weight:bold;">OPŁACONE</span>`,
    orderBody(data, 'Opłacone'),
  ).replace('{ORDER_ID}', shortOrderId(data.orderId))
  return { subject: `[ HYDRA ARMS ] Płatność za zamówienie ${shortOrderId(data.orderId)} przyjęta`, html }
}
