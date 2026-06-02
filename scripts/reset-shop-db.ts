/**
 * Truncates all shop tables in the correct FK order.
 * Usage: npx tsx scripts/reset-shop-db.ts
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('Resetting shop tables...');
  for (const table of ['order_items', 'orders', 'cart_items', 'shop_products', 'shop_categories']) {
    const { error } = await sb.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      // shop_categories and shop_products use bigint ids
      const { error: e2 } = await sb.from(table).delete().neq('id', 0);
      if (e2) console.error(`  ✗ ${table}: ${e2.message}`);
      else console.log(`  ✓ ${table} cleared`);
    } else {
      console.log(`  ✓ ${table} cleared`);
    }
  }
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
