/**
 * Supabase → BaseLinker push script
 * Usage: npx tsx scripts/supabase-to-baselinker.ts
 *
 * Reads all categories + products from Supabase and creates them in BaseLinker.
 * After this script finishes, run baselinker-sync.ts to re-populate Supabase
 * with the new BaseLinker IDs so everything stays consistent.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import { createClient } from '@supabase/supabase-js';
import { blCall } from '../src/lib/baselinker/client';

const INVENTORY_ID = parseInt(process.env.BASELINKER_INVENTORY_ID ?? '35743', 10);
const PRICE_GROUP  = parseInt(process.env.BASELINKER_PRICE_GROUP  ?? '23934', 10);
const WAREHOUSE    = process.env.BASELINKER_WAREHOUSE ?? 'blconnect_6820';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// BaseLinker free tier rate limit: ~1 req/s
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Categories ────────────────────────────────────────────────────────────────

async function pushCategories(): Promise<Map<number, number>> {
  console.log('\n── Categories ──');

  const { data: cats, error } = await supabase
    .from('shop_categories')
    .select('id, name, parent_id')
    .order('parent_id', { ascending: true, nullsFirst: true });

  if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
  if (!cats?.length) { console.log('  no categories found'); return new Map(); }

  console.log(`  found ${cats.length} categories`);

  // old Supabase category_id → new BaseLinker category_id
  const idMap = new Map<number, number>();

  for (const cat of cats) {
    const parentNewId = cat.parent_id ? (idMap.get(cat.parent_id) ?? 0) : 0;

    const res = await blCall('addInventoryCategory', {
      inventory_id: INVENTORY_ID,
      name: cat.name,
      parent_id: parentNewId,
    }) as { category_id: number };

    idMap.set(cat.id, res.category_id);
    console.log(`  ✓ "${cat.name}" → BL id ${res.category_id}`);
    await sleep(300);
  }

  console.log(`  pushed ${idMap.size} categories`);
  return idMap;
}

// ── Products ──────────────────────────────────────────────────────────────────

async function pushProducts(categoryMap: Map<number, number>): Promise<void> {
  console.log('\n── Products ──');

  const PAGE = 500;
  let offset = 0;
  let total  = 0;

  while (true) {
    const { data: products, error } = await supabase
      .from('shop_products')
      .select('id, sku, ean, name, description, features, price, tax_rate, stock, weight, category_id, images')
      .eq('is_active', true)
      .range(offset, offset + PAGE - 1);

    if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
    if (!products?.length) break;

    for (const p of products) {
      const newCategoryId = p.category_id
        ? (categoryMap.get(p.category_id) ?? 0)
        : 0;

      // Rebuild images object: { "1": url, "2": url, ... }
      const images: Record<string, string> = {};
      if (p.images && typeof p.images === 'object') {
        Object.entries(p.images as Record<string, string>).forEach(([k, v]) => {
          images[k] = v;
        });
      }

      const textFields: Record<string, string> = {
        name: p.name,
      };
      if (p.description) textFields['description'] = p.description;

      const product: Record<string, unknown> = {
        parent_id: 0,
        sku: p.sku ?? '',
        ean: p.ean ?? '',
        tax_rate: p.tax_rate ?? 23,
        weight: p.weight ?? 0,
        category_id: newCategoryId,
        text_fields: textFields,
        prices: { [PRICE_GROUP]: p.price ?? 0 },
        stock:  { [WAREHOUSE]:   p.stock  ?? 0 },
        ...(Object.keys(images).length ? { images } : {}),
      };

      // Debug first product only
      if (total === 0) {
        console.log('\n  [debug] first product payload:');
        console.log(JSON.stringify({ inventory_id: INVENTORY_ID, product }, null, 2));
      }

      try {
        await blCall('addInventoryProduct', {
          inventory_id: INVENTORY_ID,
          product,
        });
        process.stdout.write('.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`\n  ⚠ product ${p.id} (${p.name}): ${msg}`);
      }

      await sleep(300);
      total++;
    }

    offset += PAGE;
    if (products.length < PAGE) break;
  }

  console.log(`\n  pushed ${total} products`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nSupabase → BaseLinker push');
  console.log(`  inventory : ${INVENTORY_ID}`);
  console.log(`  price grp : ${PRICE_GROUP}`);
  console.log(`  warehouse : ${WAREHOUSE}`);
  console.log(`  supabase  : ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(not set)'}`);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('\n[error] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }

  const categoryMap = await pushCategories();
  await pushProducts(categoryMap);

  console.log('\n✓ Push complete');
  console.log('\nNext step: re-run the sync to update Supabase with the new BL product IDs:');
  console.log('  BASELINKER_INVENTORY_ID=104623 npx tsx scripts/baselinker-sync.ts\n');
}

main().catch(err => {
  console.error('\n[fatal]', err.message);
  process.exit(1);
});
