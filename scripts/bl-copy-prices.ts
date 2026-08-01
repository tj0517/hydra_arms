/**
 * One-shot: copy sell prices from group 96827 → Domyślna 93594 for all products in BL.
 * Run once after the initial import that wrote prices to 96827 instead of 93594.
 * Usage: npx tsx scripts/bl-copy-prices.ts [--from=96827] [--to=93594]
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import { blCall } from '../src/lib/baselinker/client';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const RATE_LIMIT_MS = 700;
const INVENTORY_ID = parseInt(process.env.BASELINKER_INVENTORY_ID ?? '35743', 10);

const args = process.argv.slice(2);
const fromGroup = parseInt(args.find((a) => a.startsWith('--from='))?.split('=')[1] ?? '96827', 10);
const toGroup   = parseInt(args.find((a) => a.startsWith('--to='))?.split('=')[1]   ?? '93594', 10);

async function main() {
  console.log(`\nCopying BL prices: group ${fromGroup} → ${toGroup}`);
  console.log(`  inventory: ${INVENTORY_ID}\n`);

  // 1. Collect all product IDs
  const allIds: string[] = [];
  for (let page = 1; ; page++) {
    const data = await blCall('getInventoryProductsList', { inventory_id: INVENTORY_ID, page }) as any;
    const ids = Object.keys(data.products ?? {});
    if (ids.length === 0) break;
    allIds.push(...ids);
    process.stdout.write(`  page ${page}: ${allIds.length} products\r`);
    if (ids.length < 1000) break;
    await sleep(RATE_LIMIT_MS);
  }
  console.log(`\n  total: ${allIds.length} products`);

  // 2. Fetch prices in chunks of 100, build update map
  const updates: Record<string, Record<string, number>> = {};
  let copied = 0, skipped = 0;

  for (let i = 0; i < allIds.length; i += 100) {
    const chunk = allIds.slice(i, i + 100);
    const data = await blCall('getInventoryProductsData', { inventory_id: INVENTORY_ID, products: chunk }) as any;
    for (const [id, p] of Object.entries(data.products ?? {}) as [string, any][]) {
      const price = p.prices?.[fromGroup];
      if (price && price > 0) {
        updates[id] = { [toGroup]: price };
        copied++;
      } else {
        skipped++;
      }
    }
    process.stdout.write(`  fetched ${Math.min(i + 100, allIds.length)}/${allIds.length}\r`);
    await sleep(RATE_LIMIT_MS);
  }
  console.log(`\n  ${copied} products with price > 0, ${skipped} skipped (price 0 or missing)`);

  if (copied === 0) { console.log('Nothing to update.'); return; }

  // 3. Bulk update prices (max 1000 per call)
  const ids = Object.keys(updates);
  for (let i = 0; i < ids.length; i += 1000) {
    const chunk = Object.fromEntries(ids.slice(i, i + 1000).map((id) => [id, updates[id]]));
    const res = await blCall('updateInventoryProductsPrices', { inventory_id: INVENTORY_ID, products: chunk }) as any;
    console.log(`  updated ${Math.min(i + 1000, ids.length)}/${ids.length}: ${res.counter} accepted`);
    if (Object.keys(res.warnings ?? {}).length) {
      console.warn('  warnings:', res.warnings);
    }
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\n✓ Done — ${copied} products updated in group ${toGroup}\n`);
}

main().catch((e) => { console.error('\n[fatal]', e.message); process.exit(1); });
