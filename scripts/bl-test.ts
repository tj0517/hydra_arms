/**
 * Quick test: try adding a single minimal product to BaseLinker
 * Usage: BASELINKER_INVENTORY_ID=104623 npx tsx scripts/bl-test.ts
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const INVENTORY_ID = parseInt(process.env.BASELINKER_INVENTORY_ID ?? '35743', 10);
const PRICE_GROUP  = parseInt(process.env.BASELINKER_PRICE_GROUP  ?? '23934', 10);
const WAREHOUSE    = process.env.BASELINKER_WAREHOUSE ?? 'blconnect_6820';
const TOKEN        = process.env.BASELINKER_TOKEN ?? process.env.base ?? '';

async function blRaw(method: string, params: Record<string, unknown>) {
  const body = new URLSearchParams({
    token: TOKEN,
    method,
    parameters: JSON.stringify(params),
  });
  const res  = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return res.json();
}

async function tryVariant(label: string, product: Record<string, unknown>) {
  console.log(`\n── ${label} ──`);
  console.log('payload:', JSON.stringify({ inventory_id: INVENTORY_ID, product }, null, 2));
  const result = await blRaw('addInventoryProduct', { inventory_id: INVENTORY_ID, product });
  console.log('response:', JSON.stringify(result, null, 2));
}

async function main() {
  console.log(`inventory: ${INVENTORY_ID}, price_group: ${PRICE_GROUP}, warehouse: ${WAREHOUSE}`);

  // Variant 1: minimal — just name + prices + stock
  await tryVariant('1: minimal name (no prefix)', {
    parent_id: 0,
    sku: 'TEST-V1',
    prices: { [PRICE_GROUP]: 10 },
    stock:  { [WAREHOUSE]: 1 },
    text_fields: { name: 'Test V1' },
  });

  // Variant 2: pl_ prefix
  await tryVariant('2: pl_name prefix', {
    parent_id: 0,
    sku: 'TEST-V2',
    prices: { [PRICE_GROUP]: 10 },
    stock:  { [WAREHOUSE]: 1 },
    text_fields: { pl_name: 'Test V2' },
  });

  // Variant 3: text_fields as JSON string (double-encoded)
  await tryVariant('3: text_fields as JSON string', {
    parent_id: 0,
    sku: 'TEST-V3',
    prices: { [PRICE_GROUP]: 10 },
    stock:  { [WAREHOUSE]: 1 },
    text_fields: JSON.stringify({ name: 'Test V3' }),
  });

  // Variant 4: no text_fields — name at top level of product
  await tryVariant('4: name at product root', {
    parent_id: 0,
    sku: 'TEST-V4',
    name: 'Test V4',
    prices: { [PRICE_GROUP]: 10 },
    stock:  { [WAREHOUSE]: 1 },
  });

  // Variant 5: pipe-separated key format "field|lang"
  await tryVariant('5: name|pl (pipe format)', {
    parent_id: 0,
    sku: 'TEST-V5',
    prices: { [PRICE_GROUP]: 10 },
    stock:  { [WAREHOUSE]: 1 },
    text_fields: { 'name|pl': 'Test V5' },
  });

  // Variant 6: pipe format, no language (use default)
  await tryVariant('6: name| (pipe, no lang)', {
    parent_id: 0,
    sku: 'TEST-V6',
    prices: { [PRICE_GROUP]: 10 },
    stock:  { [WAREHOUSE]: 1 },
    text_fields: { 'name|': 'Test V6' },
  });
}

main().catch(e => { console.error(e); process.exit(1); });
