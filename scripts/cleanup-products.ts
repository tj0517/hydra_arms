import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { error, count } = await sb.from('shop_products').delete({ count: 'exact' }).is('category_id', null);
  if (error) throw new Error(error.message);
  console.log(`✓ Deleted ${count} uncategorized products`);
}
main().catch(e => { console.error(e); process.exit(1); });
