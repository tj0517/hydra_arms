/**
 * Read-only BaseLinker client (HA-2.14).
 *
 * Exposes ONLY catalogue read methods. Every call goes through
 * `blReadOnlyCall`, which checks the method name against a closed allowlist
 * BEFORE anything reaches `blCall` (and therefore before the mock switch, the
 * token, or the network). Any other method name — a write (`add*`, `update*`,
 * `delete*`, `set*`), an order/customer read (`getOrders`, …), or a typo —
 * throws `BaseLinkerReadOnlyError`. Writes are impossible by construction:
 * there is no code path in this module that can send a non-allowlisted method.
 *
 * Allowlisted methods (all read-only, product catalogue only):
 *   getInventories, getInventoryWarehouses, getInventoryCategories,
 *   getInventoryTags, getInventoryProductsList, getInventoryProductsData,
 *   getInventoryProductsStock
 *
 * Deliberately NOT allowlisted even though they start with `get`:
 *   getOrders, getOrderStatusList, getInvoices, … — orders/customers are out of
 *   scope for the inventory report (HA-2.14 STOP gate).
 */

import { blCall } from './client';
import type { BLCategory, BLInventory, BLProduct, BLProductDetail } from './types';

export const READ_ONLY_METHODS = [
  'getInventories',
  'getInventoryWarehouses',
  'getInventoryCategories',
  'getInventoryTags',
  'getInventoryProductsList',
  'getInventoryProductsData',
  'getInventoryProductsStock',
] as const;

export type ReadOnlyMethod = (typeof READ_ONLY_METHODS)[number];

const ALLOWED = new Set<string>(READ_ONLY_METHODS);

export class BaseLinkerReadOnlyError extends Error {
  readonly method: string;
  constructor(method: string) {
    super(
      `BaseLinker read-only client: method "${method}" is not allowed ` +
        `(allowed: ${READ_ONLY_METHODS.join(', ')})`,
    );
    this.name = 'BaseLinkerReadOnlyError';
    this.method = method;
  }
}

/** True only for the closed allowlist above (exact, case-sensitive match). */
export function isReadOnlyMethod(method: string): method is ReadOnlyMethod {
  return typeof method === 'string' && method.startsWith('get') && ALLOWED.has(method);
}

/**
 * The single choke point. Throws synchronously-at-call-time (as a rejected
 * promise) for any method outside the allowlist; nothing is sent.
 */
export async function blReadOnlyCall(
  method: string,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  if (!isReadOnlyMethod(method)) {
    throw new BaseLinkerReadOnlyError(method);
  }
  return blCall(method, params);
}

// ── Typed wrappers (each one is a fixed allowlisted method name) ──────────────

export interface BLWarehouse {
  warehouse_type: string;
  warehouse_id: number | string;
  name: string;
  description?: string;
  stock_edition?: boolean;
  is_default?: boolean;
}

export interface BLTag {
  tag_id: number;
  name: string;
}

export async function getInventories(): Promise<BLInventory[]> {
  const data = (await blReadOnlyCall('getInventories')) as { inventories?: BLInventory[] };
  return data.inventories ?? [];
}

export async function getInventoryWarehouses(): Promise<BLWarehouse[]> {
  const data = (await blReadOnlyCall('getInventoryWarehouses')) as { warehouses?: BLWarehouse[] };
  return data.warehouses ?? [];
}

export async function getInventoryCategories(inventoryId: number): Promise<BLCategory[]> {
  const data = (await blReadOnlyCall('getInventoryCategories', { inventory_id: inventoryId })) as {
    categories?: BLCategory[];
  };
  return data.categories ?? [];
}

export async function getInventoryTags(inventoryId: number): Promise<BLTag[]> {
  const data = (await blReadOnlyCall('getInventoryTags', { inventory_id: inventoryId })) as {
    tags?: BLTag[];
  };
  return data.tags ?? [];
}

/** One page (BL returns up to 1 000 products per page). */
export async function getInventoryProductsList(
  inventoryId: number,
  page = 1,
): Promise<Record<string, BLProduct>> {
  const data = (await blReadOnlyCall('getInventoryProductsList', {
    inventory_id: inventoryId,
    page,
  })) as { products?: Record<string, BLProduct> };
  return data.products ?? {};
}

/** Full product data (tags, category, per-warehouse stock) for up to 1 000 ids. */
export async function getInventoryProductsData(
  inventoryId: number,
  ids: string[],
): Promise<Record<string, BLProductDetail>> {
  const data = (await blReadOnlyCall('getInventoryProductsData', {
    inventory_id: inventoryId,
    products: ids,
  })) as { products?: Record<string, BLProductDetail> };
  return data.products ?? {};
}

export async function getInventoryProductsStock(
  inventoryId: number,
  ids: string[],
): Promise<Record<string, { stock: Record<string, number> }>> {
  const data = (await blReadOnlyCall('getInventoryProductsStock', {
    inventory_id: inventoryId,
    products: ids,
  })) as { products?: Record<string, { stock: Record<string, number> }> };
  return data.products ?? {};
}
