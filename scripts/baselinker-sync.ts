/**
 * BaseLinker → Supabase sync script
 * Usage: npx tsx scripts/baselinker-sync.ts
 *
 * Reads BASELINKER_MOCK, BASELINKER_TOKEN, BASELINKER_INVENTORY_ID,
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY from .env.local
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import { createClient } from '@supabase/supabase-js';
import {
  getCategories,
  getProductsList,
  getProductsData,
  getPrice,
  getWarehouseStock,
} from '../src/lib/baselinker/client';

// Read after dotenv so ESM hoisting doesn't freeze the value
const INVENTORY_ID = parseInt(process.env.BASELINKER_INVENTORY_ID ?? '35743', 10);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CHUNK = 100; // products per getInventoryProductsData call

async function syncCategories() {
  console.log('\n── Categories ──');
  const cats = await getCategories(INVENTORY_ID);
  console.log(`  fetched ${cats.length} categories`);

  const rows = cats.map((c) => ({
    id: c.category_id,
    name: c.name,
    parent_id: c.parent_id === 0 ? null : c.parent_id,
    inventory_id: INVENTORY_ID,
  }));

  const { error } = await supabase
    .from('shop_categories')
    .upsert(rows, { onConflict: 'id' });

  if (error) throw new Error(`Category upsert failed: ${error.message}`);
  console.log(`  upserted ${rows.length} categories`);
}

async function syncProducts() {
  console.log('\n── Products ──');

  // Paginate through all products
  const allIds: string[] = [];
  let page = 1;
  while (true) {
    const batch = await getProductsList(INVENTORY_ID, page);
    const ids = Object.keys(batch);
    if (ids.length === 0) break;
    allIds.push(...ids);
    console.log(`  page ${page}: ${ids.length} products`);
    if (Object.keys(batch).length < 1000) break; // BL returns up to 1000/page
    page++;
  }

  console.log(`  total product IDs: ${allIds.length}`);

  let added = 0;
  let updated = 0;

  // Fetch and upsert in chunks
  for (let i = 0; i < allIds.length; i += CHUNK) {
    const chunkIds = allIds.slice(i, i + CHUNK);
    const details = await getProductsData(INVENTORY_ID, chunkIds);

    const rows = Object.entries(details).map(([idStr, p]) => {
      const id = parseInt(idStr, 10);
      const tags: string[] = p.tags ?? [];
      const product_type = tags.includes('age_restricted')
        ? 'age_restricted'
        : tags.includes('pickup_only')
        ? 'pickup_only'
        : 'standard';

      return {
        id,
        inventory_id: INVENTORY_ID,
        sku: p.sku || null,
        ean: p.ean || null,
        name: p.text_fields.name,
        description: p.text_fields.description ?? null,
        features: p.text_fields.features ?? null,
        price: getPrice(p.prices),
        tax_rate: p.tax_rate,
        stock: getWarehouseStock(p.stock),
        weight: p.weight ?? null,
        category_id: p.category_id || null,
        images: p.images && Object.keys(p.images).length > 0 ? p.images : null,
        product_type,
        is_active: true,
        synced_at: new Date().toISOString(),
      };
    });

    const { data, error } = await supabase
      .from('shop_products')
      .upsert(rows, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select('id');

    if (error) throw new Error(`Product upsert failed: ${error.message}`);

    // Count new vs updated (simple heuristic: compare with existing)
    added += rows.length;
    console.log(`  chunk ${Math.floor(i / CHUNK) + 1}: upserted ${rows.length} products`);
    updated = data?.length ?? 0;
  }

  console.log(`\n  done — ${added} products synced (product_type derived from BL tags)`);
}

async function main() {
  console.log(`\nBaseLinker → Supabase sync`);
  console.log(`  inventory : ${INVENTORY_ID}`);
  console.log(`  mock mode : ${process.env.BASELINKER_MOCK === 'true' ? 'YES' : 'NO'}`);
  console.log(`  supabase  : ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(not set)'}`);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('\n[error] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
    process.exit(1);
  }

  await syncCategories();
  await syncProducts();
  console.log('\n✓ Sync complete\n');
}

main().catch((err) => {
  console.error('\n[fatal]', err.message);
  process.exit(1);
});
