import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
import { createClient } from '@supabase/supabase-js';
import categories from '../src/lib/baselinker/fixtures/categories.json';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const INVENTORY_ID = 35743;

async function main() {
  const rows = categories.map(c => ({
    id: c.category_id,
    name: c.name,
    parent_id: c.parent_id === 0 ? null : c.parent_id,
    inventory_id: INVENTORY_ID,
  }));

  const { error } = await sb.from('shop_categories').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(error.message);
  console.log(`✓ Seeded ${rows.length} categories`);
}

main().catch(e => { console.error(e); process.exit(1); });
