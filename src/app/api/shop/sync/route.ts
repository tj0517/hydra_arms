import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { SHOP_CACHE_TAG } from '@/lib/shop/fetchProducts';
import {
  INVENTORY_ID,
  getCategories,
  getProductsList,
  getProductsData,
  getPrice,
  getWarehouseStock,
} from '@/lib/baselinker/client';
import { isSyncAuthorized, isCronAuthorized } from '@/lib/apiAuth';
import { getReservedQuantities } from '@/lib/shop/reservedStock';
import { filterHydraCategories } from '@/lib/shop/categoryFilter';

const CHUNK = 100;

// Full BL→Supabase sync can take a while on large catalogues
export const maxDuration = 300;

// Vercel cron invokes this path with GET + `Authorization: Bearer $CRON_SECRET`
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runSync();
}

// Manual trigger (VPS / curl) with x-sync-secret
export async function POST(req: NextRequest) {
  if (!isSyncAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runSync();
}

async function runSync() {
  const supabase = createAdminClient();
  const log: string[] = [];

  try {
    // Sync categories — BL inventory also carries ~55 auto-generated
    // marketplace category paths unrelated to the real product tree; keep
    // only the Hydra taxonomy (see filterHydraCategories).
    const cats = filterHydraCategories(await getCategories(INVENTORY_ID));
    const catRows = cats.map((c) => ({
      id: c.category_id,
      name: c.name,
      parent_id: c.parent_id === 0 ? null : c.parent_id,
      inventory_id: INVENTORY_ID,
    }));

    const { error: catError } = await supabase
      .from('shop_categories')
      .upsert(catRows, { onConflict: 'id' });

    if (catError) throw new Error(`Category sync: ${catError.message}`);
    log.push(`categories: ${catRows.length} upserted`);

    // Sync products (paginated)
    const allIds: string[] = [];
    let page = 1;
    while (true) {
      const batch = await getProductsList(INVENTORY_ID, page);
      const ids = Object.keys(batch);
      if (ids.length === 0) break;
      allIds.push(...ids);
      if (ids.length < 1000) break;
      page++;
    }

    let totalSynced = 0;
    for (let i = 0; i < allIds.length; i += CHUNK) {
      const chunkIds = allIds.slice(i, i + CHUNK);
      const details = await getProductsData(INVENTORY_ID, chunkIds);

      // Net out paid-but-unfulfilled orders so this overwrite doesn't
      // resurrect stock that's already been sold (see getReservedQuantities).
      const reserved = await getReservedQuantities(supabase, chunkIds.map((id) => parseInt(id, 10)));

      const rows = Object.entries(details).map(([idStr, p]) => {
        const id = parseInt(idStr, 10);
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
          stock: Math.max(0, getWarehouseStock(p.stock) - (reserved.get(id) ?? 0)),
          weight: p.weight ?? null,
          category_id: p.category_id || null,
          images: p.images && Object.keys(p.images).length > 0 ? p.images : null,
          // Publish gate: only products the admin tagged `approved` in BL go live
          is_active: (p.tags ?? []).includes('approved'),
          synced_at: new Date().toISOString(),
        };
      });

      const { error: prodError } = await supabase
        .from('shop_products')
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: false });

      if (prodError) throw new Error(`Product sync chunk ${i / CHUNK + 1}: ${prodError.message}`);
      totalSynced += rows.length;
    }

    log.push(`products: ${totalSynced} upserted (product_type, source_warehouse preserved)`);

    // Bust the shop page cache so the next visitor sees fresh stock/prices
    // @ts-expect-error — Next.js 16 revalidateTag signature varies; runtime works fine
    revalidateTag(SHOP_CACHE_TAG);
    log.push('cache: shop-products tag revalidated');

    return NextResponse.json({ ok: true, log });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message, log }, { status: 500 });
  }
}
