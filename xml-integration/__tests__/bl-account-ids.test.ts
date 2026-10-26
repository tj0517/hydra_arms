/**
 * Unit tests for src/lib/baselinker/accountIds.ts (HA-2.26) — name matching and
 * .env.local line rendering used by scripts/bl-account-ids.ts.
 *
 * Runner: npx tsx --test xml-integration/__tests__/bl-account-ids.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  EXPECTED_ACCOUNT_IDS,
  formatEnvLine,
  orderSourceEntries,
  priceGroupEntries,
  resolveEnvLines,
  statusEntries,
  unresolvedCount,
} from '../../src/lib/baselinker/accountIds';

const status = (id: number, name: string) => ({ id, name, name_for_customer: name, color: '#000000' });

const FULL = {
  priceGroup: priceGroupEntries([
    { price_group_id: 104, name: 'Cena sprzedaży', currency: 'PLN', is_default: true },
    { price_group_id: 105, name: 'Cena zakupu', currency: 'PLN', is_default: false },
    { price_group_id: 106, name: 'Zakup Kolba', currency: 'PLN', is_default: false },
    { price_group_id: 107, name: 'Zakup Sharg', currency: 'PLN', is_default: false },
    { price_group_id: 108, name: 'Zakup Spechurt', currency: 'PLN', is_default: false },
  ]),
  orderSource: orderSourceEntries({
    personal: { '0': 'Osobiście / telefonicznie', '1621': 'Sklep internetowy' },
    shop: { '8235': 'Shop 1' },
    order_return: ['Order return'],
  }),
  status: statusEntries([
    status(1, 'Opłacone'), status(2, 'W realizacji'), status(3, 'Wysłane'),
    status(4, 'Dostarczone'), status(5, 'Anulowane'), status(6, 'Zwrot'),
  ]),
};

test('EXPECTED_ACCOUNT_IDS: covers the price-group, order-source and status variables of .env.local.example', () => {
  const example = readFileSync(resolve(process.cwd(), '.env.local.example'), 'utf8');
  const inExample = [...example.matchAll(/^(BASELINKER_(?:PRICE_GROUP|ORDER_SOURCE|STATUS)[A-Z_]*)=/gm)].map((m) => m[1]);
  assert.deepEqual(EXPECTED_ACCOUNT_IDS.map((e) => e.variable).sort(), inExample.sort());
});

test('resolveEnvLines: every variable resolved when all names exist on the account', () => {
  const lines = resolveEnvLines(FULL);
  assert.equal(unresolvedCount(lines), 0);
  assert.deepEqual(lines.map(formatEnvLine), [
    'BASELINKER_PRICE_GROUP=104  # "Cena sprzedaży"',
    'BASELINKER_PRICE_GROUP_PURCHASE=105  # "Cena zakupu"',
    'BASELINKER_PRICE_GROUP_PURCHASE_KOLBA=106  # "Zakup Kolba"',
    'BASELINKER_PRICE_GROUP_PURCHASE_SHARG=107  # "Zakup Sharg"',
    'BASELINKER_PRICE_GROUP_PURCHASE_SPECHURT=108  # "Zakup Spechurt"',
    'BASELINKER_ORDER_SOURCE_ID=1621  # "Sklep internetowy"',
    'BASELINKER_STATUS_PAID=1  # "Opłacone"',
    'BASELINKER_STATUS_PROCESSING=2  # "W realizacji"',
    'BASELINKER_STATUS_SHIPPED=3  # "Wysłane"',
    'BASELINKER_STATUS_DELIVERED=4  # "Dostarczone"',
    'BASELINKER_STATUS_CANCELLED=5  # "Anulowane"',
    'BASELINKER_STATUS_RETURN=6  # "Zwrot"',
  ]);
});

test('resolveEnvLines: name match ignores case and surrounding/double spaces, nothing else', () => {
  const lines = resolveEnvLines({
    ...FULL,
    status: statusEntries([status(11, '  opłacone '), status(12, 'W  Realizacji'), status(13, 'Wysłano')]),
  });
  const byVar = new Map(lines.map((l) => [l.variable, l]));
  assert.equal(formatEnvLine(byVar.get('BASELINKER_STATUS_PAID')!), 'BASELINKER_STATUS_PAID=11  # "  opłacone "');
  assert.equal(byVar.get('BASELINKER_STATUS_PROCESSING')!.matches[0].id, '12');
  // "Wysłano" is not "Wysłane" — reported missing, never guessed
  assert.equal(
    formatEnvLine(byVar.get('BASELINKER_STATUS_SHIPPED')!),
    '# BASELINKER_STATUS_SHIPPED=  ← MISSING: no order status named "Wysłane"',
  );
});

test('resolveEnvLines: empty account → all twelve variables missing, each line commented out', () => {
  const lines = resolveEnvLines({ priceGroup: [], orderSource: [], status: [] });
  assert.equal(unresolvedCount(lines), 12);
  for (const l of lines.map(formatEnvLine)) assert.match(l, /^# BASELINKER_[A-Z_]+=  ← MISSING: no /);
  assert.equal(
    formatEnvLine(lines.find((l) => l.variable === 'BASELINKER_ORDER_SOURCE_ID')!),
    '# BASELINKER_ORDER_SOURCE_ID=  ← MISSING: no order source named "Sklep internetowy"',
  );
});

test('resolveEnvLines: two entries with the same name → ambiguous, no id chosen', () => {
  const lines = resolveEnvLines({
    ...FULL,
    orderSource: orderSourceEntries({ personal: { '7': 'Sklep internetowy' }, shop: { '9': 'sklep internetowy' } }),
  });
  assert.equal(unresolvedCount(lines), 1);
  assert.equal(
    formatEnvLine(lines.find((l) => l.variable === 'BASELINKER_ORDER_SOURCE_ID')!),
    '# BASELINKER_ORDER_SOURCE_ID=  ← AMBIGUOUS: 2 order source entries named "Sklep internetowy" (ids 7, 9)',
  );
});

test('orderSourceEntries: keeps the source type; list-shaped types use the index as id', () => {
  assert.deepEqual(orderSourceEntries({ personal: { '1621': 'stationary shop' }, order_return: ['Order return'] }), [
    { id: '1621', name: 'stationary shop', detail: 'personal' },
    { id: '0', name: 'Order return', detail: 'order_return' },
  ]);
});
