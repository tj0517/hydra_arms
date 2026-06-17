/** Maps Polish BL status name → our internal status string */
export function mapBLStatus(statusName: string): string {
  const n = statusName.toLowerCase()
  if (/anulowa|zwrot|reject/.test(n))            return 'cancelled'
  if (/dostarczon|odebran|zrealizow/.test(n))    return 'delivered'
  if (/wysłan|wysyłk|transit|transport/.test(n)) return 'shipped'
  return 'paid'
}
