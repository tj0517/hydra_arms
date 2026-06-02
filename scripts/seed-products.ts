import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
import { createClient } from '@supabase/supabase-js';
import fixtureData from '../src/lib/baselinker/fixtures/products.json';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const INVENTORY_ID = 35743;
const PRICE_GROUP = 23934;
const WAREHOUSE = 'blconnect_6820';

async function main() {
  const details = fixtureData.products_data as Record<string, {
    sku: string; ean: string; tax_rate: number; weight: number;
    category_id: number; text_fields: { name: string; description?: string; features?: Record<string, string> };
    prices: Record<string, number>; stock: Record<string, number>; images: Record<string, string>;
  }>;

  const rows = Object.entries(details).map(([idStr, p]) => ({
    id: parseInt(idStr, 10),
    inventory_id: INVENTORY_ID,
    sku: p.sku || null,
    ean: p.ean || null,
    name: p.text_fields.name,
    description: p.text_fields.description ?? null,
    features: p.text_fields.features ?? null,
    price: p.prices[PRICE_GROUP] ?? Object.values(p.prices)[0] ?? 0,
    tax_rate: p.tax_rate,
    stock: p.stock[WAREHOUSE] ?? Object.values(p.stock).reduce((a, b) => a + b, 0),
    weight: p.weight ?? null,
    category_id: p.category_id || null,
    images: Object.keys(p.images).length ? p.images : null,
    is_active: true,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await sb.from('shop_products').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(error.message);
  console.log(`✓ Seeded ${rows.length} products with correct category_ids`);
}

main().catch(e => { console.error(e); process.exit(1); });
