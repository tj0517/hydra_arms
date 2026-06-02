import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { count: cats } = await sb.from('shop_categories').select('*', { count: 'exact', head: true });
  const { count: prods } = await sb.from('shop_products').select('*', { count: 'exact', head: true });
  const { count: withCat } = await sb.from('shop_products').select('*', { count: 'exact', head: true }).not('category_id', 'is', null);
  console.log(`categories: ${cats}, products: ${prods}, products with category: ${withCat}`);
}
main();
