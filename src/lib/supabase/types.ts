export type ProductType = 'standard' | 'age_restricted' | 'pickup_only';
export type SourceWarehouse = 'H1' | 'H2' | 'own';
export type FulfillmentRoute = 'direct_H1' | 'direct_H2' | 'consolidated' | 'pickup';

export interface Database {
  public: {
    Tables: {
      shop_categories: {
        Row: {
          id: number;
          name: string;
          parent_id: number | null;
          inventory_id: number;
          created_at: string;
        };
        Insert: {
          id: number;
          name: string;
          parent_id?: number | null;
          inventory_id: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          parent_id?: number | null;
          inventory_id?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      shop_products: {
        Row: {
          id: number;
          inventory_id: number;
          sku: string | null;
          ean: string | null;
          name: string;
          description: string | null;
          features: Record<string, string> | null;
          price: number | null;
          tax_rate: number | null;
          stock: number;
          weight: number | null;
          category_id: number | null;
          images: Record<string, string> | null;
          product_type: ProductType;
          source_warehouse: SourceWarehouse | null;
          is_active: boolean;
          synced_at: string | null;
          updated_at: string;
        };
        Insert: {
          id: number;
          inventory_id: number;
          sku?: string | null;
          ean?: string | null;
          name: string;
          description?: string | null;
          features?: Record<string, string> | null;
          price?: number | null;
          tax_rate?: number | null;
          stock?: number;
          weight?: number | null;
          category_id?: number | null;
          images?: Record<string, string> | null;
          product_type?: ProductType;
          source_warehouse?: SourceWarehouse | null;
          is_active?: boolean;
          synced_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          inventory_id?: number;
          sku?: string | null;
          ean?: string | null;
          name?: string;
          description?: string | null;
          features?: Record<string, string> | null;
          price?: number | null;
          tax_rate?: number | null;
          stock?: number;
          weight?: number | null;
          category_id?: number | null;
          images?: Record<string, string> | null;
          product_type?: ProductType;
          source_warehouse?: SourceWarehouse | null;
          is_active?: boolean;
          synced_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          id: string;
          age_verified: boolean;
          age_verified_at: string | null;
          verification_method: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          age_verified?: boolean;
          age_verified_at?: string | null;
          verification_method?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          age_verified?: boolean;
          age_verified_at?: string | null;
          verification_method?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          id: string;
          session_id: string | null;
          user_id: string | null;
          product_id: number;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          product_id: number;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          product_id?: number;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string | null;
          baselinker_order_id: number | null;
          status: string;
          shipping_address: Record<string, unknown> | null;
          total: number | null;
          fulfillment_route: FulfillmentRoute | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          baselinker_order_id?: number | null;
          status?: string;
          shipping_address?: Record<string, unknown> | null;
          total?: number | null;
          fulfillment_route?: FulfillmentRoute | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          baselinker_order_id?: number | null;
          status?: string;
          shipping_address?: Record<string, unknown> | null;
          total?: number | null;
          fulfillment_route?: FulfillmentRoute | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: number;
          quantity: number;
          unit_price: number;
          product_snapshot: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: number;
          quantity: number;
          unit_price: number;
          product_snapshot?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: number;
          quantity?: number;
          unit_price?: number;
          product_snapshot?: Record<string, unknown> | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      product_type: ProductType;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type ShopProduct = Database['public']['Tables']['shop_products']['Row'];
export type ShopCategory = Database['public']['Tables']['shop_categories']['Row'];
export type CartItem = Database['public']['Tables']['cart_items']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
