import type { BLInventory, BLCategory, BLProduct, BLProductDetail } from './types';
import { getMockResponse } from './fixtures/index';

const API_URL = 'https://api.baselinker.com/connector.php';

export const INVENTORY_ID = parseInt(process.env.BASELINKER_INVENTORY_ID ?? '35743', 10);
const DEFAULT_PRICE_GROUP = 23934;
const DEFAULT_WAREHOUSE = 'blconnect_6820';

export async function blCall(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  // Read lazily so dotenv has time to populate process.env before first call
  if (process.env.BASELINKER_MOCK === 'true') {
    return getMockResponse(method, params);
  }

  const token = process.env.BASELINKER_TOKEN ?? process.env.base ?? '';
  const body = new URLSearchParams({
    token,
    method,
    parameters: JSON.stringify(params),
  });

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) throw new Error(`BaseLinker HTTP error: ${res.status}`);
  const data = await res.json();
  if (data.status !== 'SUCCESS') {
    throw new Error(`BaseLinker error: ${data.error_code} — ${data.error_message}`);
  }
  return data;
}

export async function getInventories(): Promise<BLInventory[]> {
  const data = await blCall('getInventories') as { inventories: BLInventory[] };
  return data.inventories;
}

export async function getCategories(inventoryId: number): Promise<BLCategory[]> {
  const data = await blCall('getInventoryCategories', { inventory_id: inventoryId }) as { categories: BLCategory[] };
  return data.categories;
}

export async function getProductsList(inventoryId: number, page = 1): Promise<Record<string, BLProduct>> {
  const data = await blCall('getInventoryProductsList', {
    inventory_id: inventoryId,
    page,
  }) as { products: Record<string, BLProduct> };
  return data.products ?? {};
}

export async function getProductsData(inventoryId: number, ids: string[]): Promise<Record<string, BLProductDetail>> {
  const data = await blCall('getInventoryProductsData', {
    inventory_id: inventoryId,
    products: ids,
  }) as { products: Record<string, BLProductDetail> };
  return data.products ?? {};
}

/** Extract first image URL from BL images map, or null */
export function firstImage(images: Record<string, string> | null | undefined): string | null {
  if (!images) return null;
  const keys = Object.keys(images).sort((a, b) => Number(a) - Number(b));
  return keys.length > 0 ? images[keys[0]] : null;
}

/** Sum stock across all warehouses */
export function totalStock(stock: Record<string, number>): number {
  return Object.values(stock).reduce((acc, v) => acc + v, 0);
}

/** Get price from the default price group */
export function getPrice(prices: Record<string, number>): number {
  return prices[DEFAULT_PRICE_GROUP] ?? Object.values(prices)[0] ?? 0;
}

/** Get stock from the default warehouse, falling back to total */
export function getWarehouseStock(stock: Record<string, number>): number {
  return stock[DEFAULT_WAREHOUSE] ?? totalStock(stock);
}
