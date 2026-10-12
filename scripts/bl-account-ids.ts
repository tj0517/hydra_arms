/**
 * Read-only: prints the BaseLinker account's price groups, order sources and
 * order statuses (ids + names) and the matching lines for .env.local (HA-2.26).
 *
 * Usage:
 *   npx tsx scripts/bl-account-ids.ts
 *
 * Goes through src/lib/baselinker/readonly.ts only — a closed allowlist, so
 * this script cannot write and cannot read orders or customers. Prints ids
 * and names; never the token or any other variable value.
 *
 * A variable gets an id only when exactly one entry on the account carries the
 * name documented in .env.local.example; otherwise the line is commented out
 * and says what is missing (create it in the BL panel, then re-run).
 *
 * Exit code: 0 — every variable resolved; 1 — something missing or ambiguous,
 * a BL error, or running on mock.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import {
  READ_ONLY_METHODS,
  getInventories,
  getInventoryPriceGroups,
  getOrderSources,
  getOrderStatusList,
} from '../src/lib/baselinker/readonly';
import {
  formatEnvLine,
  orderSourceEntries,
  priceGroupEntries,
  resolveEnvLines,
  statusEntries,
  unresolvedCount,
  type AccountEntry,
} from '../src/lib/baselinker/accountIds';

// Shell-level BASELINKER_MOCK wins over .env.local (offline smoke test)
const mockFlagFromShell = process.env.BASELINKER_MOCK;
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
if (mockFlagFromShell !== undefined) process.env.BASELINKER_MOCK = mockFlagFromShell;

const METHODS_CALLED = ['getInventories', 'getInventoryPriceGroups', 'getOrderSources', 'getOrderStatusList'] as const;

function printEntries(title: string, entries: readonly AccountEntry[]) {
  console.log(`\n── ${title} (${entries.length}) ──`);
  if (entries.length === 0) { console.log('  —'); return; }
  const w = Math.max(...entries.map((e) => e.id.length));
  for (const e of entries) {
    console.log(`  ${e.id.padStart(w)}  "${e.name}"${e.detail ? `  [${e.detail}]` : ''}`);
  }
}

async function main() {
  const isMock = process.env.BASELINKER_MOCK === 'true';

  console.log('\n=== bl-account-ids (READ-ONLY) ===');
  console.log(`BASELINKER_MOCK: ${isMock}`);
  console.log(`BL methods      : ${METHODS_CALLED.join(', ')}`);
  console.log(`Client allowlist: ${READ_ONLY_METHODS.join(', ')}`);

  if (isMock) {
    console.warn('\n⚠  Running on MOCK — the mock has no account configuration; everything below is empty.');
  } else if (!process.env.BASELINKER_TOKEN) {
    console.error('[error] BASELINKER_TOKEN must be set for a live run.');
    process.exit(1);
  }

  const inventoryRaw = (process.env.BASELINKER_INVENTORY_ID ?? '').trim();
  const inventoryId = /^\d+$/.test(inventoryRaw) ? parseInt(inventoryRaw, 10) : null;

  const inventories = await getInventories();
  const inventory = inventoryId === null ? undefined : inventories.find((i) => i.inventory_id === inventoryId);
  const priceGroups = priceGroupEntries(await getInventoryPriceGroups());
  const orderSources = orderSourceEntries(await getOrderSources());
  const statuses = statusEntries(await getOrderStatusList());

  // Mark which price groups the target catalogue actually uses
  const inCatalogue = new Set((inventory?.price_groups ?? []).map(String));
  if (inventory) {
    console.log(`Catalogue       : ${inventory.inventory_id} "${inventory.name}"`);
    for (const g of priceGroups) {
      g.detail = [g.detail, inCatalogue.has(g.id) ? 'in catalogue' : 'NOT in catalogue'].filter(Boolean).join(', ');
    }
  } else {
    const why = inventoryId === null ? 'BASELINKER_INVENTORY_ID not set' : `${inventoryId} not found on the account`;
    console.log(`Catalogue       : ${why} — price groups not cross-checked`);
  }

  printEntries('Price groups', priceGroups);
  printEntries('Order sources', orderSources);
  printEntries('Order statuses', statuses);

  const lines = resolveEnvLines({ priceGroup: priceGroups, orderSource: orderSources, status: statuses });

  console.log('\n── Lines for .env.local ──');
  for (const line of lines) console.log(formatEnvLine(line));

  let problems = unresolvedCount(lines);
  if (inventory) {
    for (const line of lines) {
      if (line.kind === 'priceGroup' && line.matches.length === 1 && !inCatalogue.has(line.matches[0].id)) {
        console.log(`# ⚠ ${line.variable}: price group ${line.matches[0].id} is not attached to catalogue ${inventory.inventory_id}`);
        problems++;
      }
    }
  }

  console.log('\n========================================');
  if (isMock) {
    console.log('RESULT: mock run — smoke test only, exit 1');
    process.exit(1);
  }
  if (problems === 0) {
    console.log(`RESULT: all ${lines.length} ids resolved ✓`);
    process.exit(0);
  }
  console.log(`RESULT: ${problems} of ${lines.length} variables need attention — see MISSING / AMBIGUOUS / ⚠ lines above`);
  process.exit(1);
}

main().catch((err) => {
  console.error('\n[fatal]', err instanceof Error ? err.message : err);
  process.exit(1);
});
