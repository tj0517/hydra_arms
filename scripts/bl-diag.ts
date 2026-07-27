import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const API_URL = 'https://api.baselinker.com/connector.php';

async function blCall(method: string, params: Record<string, unknown> = {}) {
  const body = new URLSearchParams({
    token: process.env.BASELINKER_TOKEN ?? '',
    method,
    parameters: JSON.stringify(params),
  });
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return res.json();
}

const INVENTORY_ID = parseInt(process.env.BASELINKER_INVENTORY_ID ?? '35743', 10);

async function main() {
  const list = await blCall('getInventoryProductsList', { inventory_id: INVENTORY_ID, page: 1 }) as any;
  const ids = Object.keys(list.products ?? {}).slice(0, 5);
  const data = await blCall('getInventoryProductsData', { inventory_id: INVENTORY_ID, products: ids }) as any;
  const products = data.products ?? {};
  for (const [id, p] of Object.entries(products) as [string, any][]) {
    const total = Object.values(p.stock as Record<string, number>).reduce((a: number, v) => a + (v as number), 0);
    console.log(`${id}  price=${p.prices?.['96827'] ?? 0}  stock=${total}  name=${String(p.text_fields?.name ?? '').slice(0, 50)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
