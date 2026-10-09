/**
 * Red proof (HA-2.14): the read-only BaseLinker client cannot write.
 *
 * Every write method (addInventoryProduct, updateInventoryProductsStock,
 * addOrder, …), every order/customer read, and every unknown method name
 * must throw BaseLinkerReadOnlyError BEFORE anything reaches blCall.
 *
 * Runner: npx tsx --test xml-integration/__tests__/bl-readonly-client.test.ts
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  blReadOnlyCall,
  isReadOnlyMethod,
  BaseLinkerReadOnlyError,
  READ_ONLY_METHODS,
  getInventoryProductsList,
  getInventoryTags,
} from '../../src/lib/baselinker/readonly';

// Belt and braces: even if a method slipped through, the underlying client
// would hit the mock (no token, no network — blCall reads these lazily at call
// time). The guard must fire first anyway.
process.env.BASELINKER_MOCK = 'true';
delete process.env.BASELINKER_TOKEN;

const WRITE_METHODS = [
  'addInventoryProduct',
  'updateInventoryProductsStock',
  'updateInventoryProductsPrices',
  'deleteInventoryProduct',
  'setInventoryProductTags',
  'addInventoryCategory',
  'addOrder',
  'setOrderStatus',
];

const ORDER_READS = ['getOrders', 'getOrderStatusList', 'getInvoices', 'getOrderSources'];

const RAW_NON_GET = ['', 'GETINVENTORIES', 'getinventories', 'runRequest', 'get', 'getInventoryProductsList2'];

describe('read-only BaseLinker client — red proof', () => {
  for (const method of WRITE_METHODS) {
    test(`write method "${method}" throws BaseLinkerReadOnlyError`, async () => {
      await assert.rejects(
        () => blReadOnlyCall(method, { inventory_id: 1 }),
        (err: unknown) => {
          assert.ok(err instanceof BaseLinkerReadOnlyError, 'must be BaseLinkerReadOnlyError');
          assert.equal((err as BaseLinkerReadOnlyError).method, method);
          assert.match((err as Error).message, /not allowed/);
          return true;
        },
      );
      assert.equal(isReadOnlyMethod(method), false);
    });
  }

  for (const method of ORDER_READS) {
    test(`order/customer read "${method}" is NOT allowlisted (out of scope)`, async () => {
      await assert.rejects(() => blReadOnlyCall(method), BaseLinkerReadOnlyError);
      assert.equal(isReadOnlyMethod(method), false);
    });
  }

  for (const method of RAW_NON_GET) {
    test(`raw method name ${JSON.stringify(method)} throws`, async () => {
      await assert.rejects(() => blReadOnlyCall(method), BaseLinkerReadOnlyError);
    });
  }

  test('allowlist contains only get* catalogue methods', () => {
    assert.ok(READ_ONLY_METHODS.length > 0);
    for (const m of READ_ONLY_METHODS) {
      assert.match(m, /^getInventor/);
      assert.equal(isReadOnlyMethod(m), true);
    }
    assert.equal(READ_ONLY_METHODS.some((m) => /order|customer|invoice/i.test(m)), false);
  });

  test('allowlisted reads pass through to the (mock) client', async () => {
    const list = await getInventoryProductsList(35743, 1);
    assert.ok(Object.keys(list).length > 0, 'mock products_list should not be empty');
    const tags = await getInventoryTags(35743);
    assert.ok(Array.isArray(tags));
  });
});
