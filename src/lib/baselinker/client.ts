import type { BLInventory, BLCategory, BLProduct, BLProductDetail, BLOrderStatus, BLOrder } from './types';
import { getMockResponse } from './fixtures/index';

const API_URL = 'https://api.baselinker.com/connector.php';

export const INVENTORY_ID = parseInt(process.env.BASELINKER_INVENTORY_ID ?? '35743', 10);
const DEFAULT_PRICE_GROUP = parseInt(process.env.BASELINKER_PRICE_GROUP ?? '23934', 10);

export async function blCall(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  // Read lazily so dotenv has time to populate process.env before first call
  if (process.env.BASELINKER_MOCK === 'true') {
    return getMockResponse(method, params);
  }

  const token = process.env.BASELINKER_TOKEN ?? '';
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

/** Get sellable stock: sum across all warehouses (H1 + H2 + …) */
export function getWarehouseStock(stock: Record<string, number>): number {
  return totalStock(stock);
}

/**
 * Add or update a single product in a BL inventory (full import path — slow, rate-limited).
 * Pass `productId` to update an existing product instead of creating a new one.
 * Per BL docs the product fields (sku, ean, prices, stock, text_fields, images, …)
 * go FLAT at the top level of the params — not nested under a `product` key.
 * Returns the BL product_id.
 */
export async function addInventoryProduct(
  inventoryId: number,
  product: Record<string, unknown>,
  productId?: number | string,
): Promise<number> {
  const data = await blCall('addInventoryProduct', {
    inventory_id: inventoryId,
    ...(productId != null ? { product_id: String(productId) } : {}),
    ...product,
  }) as { product_id: number };
  return data.product_id;
}

/**
 * Bulk stock update (fast path for frequent cron syncs).
 * `products` = { [product_id]: { [warehouse_id]: quantity } }, max 1000 products per call.
 */
export async function updateInventoryProductsStock(
  inventoryId: number,
  products: Record<string, Record<string, number>>,
): Promise<{ counter: number; warnings: Record<string, string> }> {
  const data = await blCall('updateInventoryProductsStock', {
    inventory_id: inventoryId,
    products,
  }) as { counter: number; warnings?: Record<string, string> };
  return { counter: data.counter ?? 0, warnings: data.warnings ?? {} };
}

/**
 * Bulk price update (fast path for frequent cron syncs).
 * `products` = { [product_id]: { [price_group_id]: price } }, max 1000 products per call.
 */
export async function updateInventoryProductsPrices(
  inventoryId: number,
  products: Record<string, Record<string, number>>,
): Promise<{ counter: number; warnings: Record<string, string> }> {
  const data = await blCall('updateInventoryProductsPrices', {
    inventory_id: inventoryId,
    products,
  }) as { counter: number; warnings?: Record<string, string> };
  return { counter: data.counter ?? 0, warnings: data.warnings ?? {} };
}

export interface BLOrderProduct {
  storage: 'db';
  storage_id: number;
  product_id: string;
  variant_id: number;
  name: string;
  sku: string;
  ean: string;
  quantity: number;
  price_brutto: number;
  tax_rate: number;
}

export interface BLAddOrderParams {
  order_status_id: number;
  currency: string;
  payment_method: string;
  payment_method_cod: number;
  paid: number;
  user_login: string;
  phone: string;
  email: string;
  delivery_method: string;
  delivery_price: number;
  delivery_fullname: string;
  delivery_address: string;
  delivery_city: string;
  delivery_postcode: string;
  delivery_country_code: string;
  products: BLOrderProduct[];
}

/** Push a new order to BaseLinker. Returns the created BL order_id. */
export async function addOrder(params: BLAddOrderParams): Promise<number> {
  const data = await blCall('addOrder', params as unknown as Record<string, unknown>) as { order_id: number };
  return data.order_id;
}

export async function getOrderStatusList(): Promise<BLOrderStatus[]> {
  const data = await blCall('getOrderStatusList') as { statuses: BLOrderStatus[] };
  return data.statuses ?? [];
}

export async function getOrders(params?: {
  status_id?: number;
  date_from?: number;
  page?: number;
}): Promise<{ orders: BLOrder[]; hasMore: boolean }> {
  const data = await blCall('getOrders', {
    get_unconfirmed_orders: true,
    ...params,
  }) as { orders: Record<string, BLOrder> };
  const orders = Object.values(data.orders ?? {});
  return { orders, hasMore: orders.length === 100 };
}
