export type ProductType = 'standard' | 'age_restricted' | 'pickup_only';

export interface BLInventory {
  inventory_id: number;
  name: string;
  description: string;
  languages: string[];
  default_language: string;
  price_groups: number[];
  default_price_group: number;
  warehouses: string[];
  default_warehouse: string;
  reservations: boolean;
  is_default: boolean;
}

export interface BLCategory {
  category_id: number;
  name: string;
  parent_id: number;
}

/** Lightweight product from getInventoryProductsList */
export interface BLProduct {
  id: number;
  ean: string;
  asin: string;
  sku: string;
  name: string;
  parent_id: number;
  stock: Record<string, number>;
  prices: Record<string, number>;
}

export interface BLOrderStatus {
  id: number;
  name: string;
  name_for_customer: string;
  color: string;
}

export interface BLOrderItem {
  order_product_id: number;
  product_id: string;
  name: string;
  sku: string;
  ean: string;
  quantity: number;
  price_brutto: number;
  tax_rate: number;
}

export interface BLOrder {
  order_id: number;
  order_status_id: number;
  date_add: number;
  delivery_fullname: string;
  delivery_address: string;
  delivery_city: string;
  delivery_postcode: string;
  email: string;
  phone: string;
  delivery_tracking_number: string;
  delivery_package_module: string;
  products: BLOrderItem[];
}

/** Full product detail from getInventoryProductsData */
export interface BLProductDetail {
  is_bundle: boolean;
  ean: string;
  asin: string;
  parent_id: number;
  sku: string;
  tags: string[];
  tax_rate: number;
  weight: number;
  height: number;
  width: number;
  length: number;
  star: number;
  category_id: number;
  manufacturer_id: number;
  text_fields: {
    name: string;
    description?: string;
    description_extra1?: string;
    description_extra2?: string;
    features?: Record<string, string>;
  };
  stock: Record<string, number>;
  prices: Record<string, number>;
  locations: Record<string, string>;
  links: Record<string, unknown>;
  average_cost: number;
  average_landed_cost: number;
  images: Record<string, string>;
}

