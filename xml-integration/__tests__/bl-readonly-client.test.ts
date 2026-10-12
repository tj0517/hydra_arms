/**
 * Red proof (HA-2.14): the read-only BaseLinker client cannot write.
 *
 * Every write method (addInventoryProduct, updateInventoryProductsStock,
 * addOrder, …), every order/customer read, and every unknown method name
 * must throw BaseLinkerReadOnlyError BEFORE anything reaches blCall.
 *
 * HA-2.26 (approved by tj, 2026-10-12): getInventoryPriceGroups,
 * getOrderSources and getOrderStatusList joined the allowlist as
 * account-configuration reads. getOrderStatusList and getOrderSources were
 * deliberately MOVED out of the must-throw list below; getOrders and
 * getInvoices stay in it.
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
  getInventoryPriceGroups,
  getOrderSources,
  getOrderStatusList,
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
  'deleteInventoryCategory',
  'addInventoryTag',
  'deleteInventoryTag',
  'addInventoryPriceGroup',
  'deleteInventoryPriceGroup',
  'addOrder',
  'setOrderStatus',
];

const ORDER_READS = ['getOrders', 'getInvoices'];

const CATALOGUE_READS = [
  'getInventories',
  'getInventoryWarehouses',
  'getInventoryCategories',
  'getInventoryTags',
  'getInventoryProductsList',
  'getInventoryProductsData',
  'getInventoryProductsStock',
];

// Account configuration (ids and names) — on the allowlist since HA-2.26
const ACCOUNT_CONFIG_READS = ['getInventoryPriceGroups', 'getOrderSources', 'getOrderStatusList'];

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

  for (const method of ACCOUNT_CONFIG_READS) {
    test(`account-configuration read "${method}" is accepted`, async () => {
      assert.equal(isReadOnlyMethod(method), true);
      await assert.doesNotReject(() => blReadOnlyCall(method));
    });
  }

  test('allowlist is exactly the 7 catalogue reads + the 3 account-configuration reads', () => {
    assert.deepEqual([...READ_ONLY_METHODS], [...CATALOGUE_READS, ...ACCOUNT_CONFIG_READS]);
    for (const m of READ_ONLY_METHODS) {
      assert.match(m, /^get/);
      assert.equal(isReadOnlyMethod(m), true);
    }
    assert.equal(READ_ONLY_METHODS.some((m) => /customer|invoice/i.test(m)), false);
    // The only order-related names are the two configuration lists
    assert.deepEqual(READ_ONLY_METHODS.filter((m) => /order/i.test(m)), ['getOrderSources', 'getOrderStatusList']);
  });

  test('allowlisted reads pass through to the (mock) client', async () => {
    const list = await getInventoryProductsList(35743, 1);
    assert.ok(Object.keys(list).length > 0, 'mock products_list should not be empty');
    const tags = await getInventoryTags(35743);
    assert.ok(Array.isArray(tags));
  });

  test('account-configuration wrappers resolve on the mock (no fixture → empty)', async () => {
    assert.deepEqual(await getInventoryPriceGroups(), []);
    assert.deepEqual(await getOrderSources(), {});
    assert.deepEqual(await getOrderStatusList(), []);
  });
});
