import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  INVENTORY_ID,
  getCategories,
  getProductsList,
  getProductsData,
  getPrice,
  getWarehouseStock,
} from '@/lib/baselinker/client';

const SYNC_SECRET = process.env.SYNC_SECRET;
const CHUNK = 100;

export async function POST(req: NextRequest) {
  // Validate secret
  const authHeader = req.headers.get('x-sync-secret');
  if (!SYNC_SECRET || authHeader !== SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const log: string[] = [];

  try {
    // Sync categories
    const cats = await getCategories(INVENTORY_ID);
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

      const rows = Object.entries(details).map(([idStr, p]) => ({
        id: parseInt(idStr, 10),
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
        is_active: true,
        synced_at: new Date().toISOString(),
      }));

      const { error: prodError } = await supabase
        .from('shop_products')
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: false });

      if (prodError) throw new Error(`Product sync chunk ${i / CHUNK + 1}: ${prodError.message}`);
      totalSynced += rows.length;
    }

    log.push(`products: ${totalSynced} upserted (product_type, source_warehouse preserved)`);

    return NextResponse.json({ ok: true, log });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message, log }, { status: 500 });
  }
}
