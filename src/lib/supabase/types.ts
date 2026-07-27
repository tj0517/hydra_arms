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
          // ── Core (existing) ──────────────────────────────────────────────
          id: number;
          inventory_id: number | null;          // null for XML-sourced products
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
          // ── Source tracking (migration 004) ──────────────────────────────
          connector: string | null;             // 'baselinker' | 'kolba' | 'sharg' | 'spechurt'
          connector_product_id: string | null;  // their ID in their system
          connector_sku: string | null;         // their SKU
          primary_source: string | null;
          // ── Compliance (migration 004) ───────────────────────────────────
          age_min: number;                      // 0 = no restriction, 18, 21
          requires_license: boolean;
          license_category: string | null;      // 'B', 'PAE', etc.
          delivery_allowed: boolean;
          // ── Sync control (migration 004) ─────────────────────────────────
          sync_locked_fields: string[];         // fields sync cannot overwrite
          // ── Admin / review (migration 004) ──────────────────────────────
          review_flags: Array<{ reason: string; detail: string }> | null;
          completeness_score: number;
          notes_internal: string | null;
          // ── Pricing additions (migration 004) ───────────────────────────
          price_purchase: number | null;        // what we pay the supplier
          price_compare: number | null;         // struck-through "was" price
          // ── Display (migration 004) ──────────────────────────────────────
          slug: string | null;
          short_description: string | null;
          is_featured: boolean;
          badge: string | null;
          availability_status: string;
          meta_title: string | null;
          meta_description: string | null;
          // ── Shipping (migration 004) ─────────────────────────────────────
          dimensions: { l: number; w: number; h: number } | null;
          shipping_class: string;
        };
        Insert: {
          id: number;
          inventory_id?: number | null;
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
          connector?: string | null;
          connector_product_id?: string | null;
          connector_sku?: string | null;
          primary_source?: string | null;
          age_min?: number;
          requires_license?: boolean;
          license_category?: string | null;
          delivery_allowed?: boolean;
          sync_locked_fields?: string[];
          review_flags?: Array<{ reason: string; detail: string }> | null;
          completeness_score?: number;
          notes_internal?: string | null;
          price_purchase?: number | null;
          price_compare?: number | null;
          slug?: string | null;
          short_description?: string | null;
          is_featured?: boolean;
          badge?: string | null;
          availability_status?: string;
          meta_title?: string | null;
          meta_description?: string | null;
          dimensions?: { l: number; w: number; h: number } | null;
          shipping_class?: string;
        };
        Update: {
          id?: number;
          inventory_id?: number | null;
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
          connector?: string | null;
          connector_product_id?: string | null;
          connector_sku?: string | null;
          primary_source?: string | null;
          age_min?: number;
          requires_license?: boolean;
          license_category?: string | null;
          delivery_allowed?: boolean;
          sync_locked_fields?: string[];
          review_flags?: Array<{ reason: string; detail: string }> | null;
          completeness_score?: number;
          notes_internal?: string | null;
          price_purchase?: number | null;
          price_compare?: number | null;
          slug?: string | null;
          short_description?: string | null;
          is_featured?: boolean;
          badge?: string | null;
          availability_status?: string;
          meta_title?: string | null;
          meta_description?: string | null;
          dimensions?: { l: number; w: number; h: number } | null;
          shipping_class?: string;
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
          tracking_number: string | null;
          shipping_carrier: string | null;
          bl_status_id: number | null;
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
          tracking_number?: string | null;
          shipping_carrier?: string | null;
          bl_status_id?: number | null;
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
          tracking_number?: string | null;
          shipping_carrier?: string | null;
          bl_status_id?: number | null;
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
      source_connectors: {
        Row: {
          id: string;
          name: string;
          display_name: string | null;
          xml_url: string;
          auth_type: string;
          auth_config: Record<string, unknown>;
          charset: string;
          feed_type: string;
          extra_config: Record<string, unknown>;
          sync_schedule: string;
          is_active: boolean;
          last_synced_at: string | null;
          last_sync_status: string;
          last_sync_stats: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_name?: string | null;
          xml_url: string;
          auth_type?: string;
          auth_config?: Record<string, unknown>;
          charset?: string;
          feed_type?: string;
          extra_config?: Record<string, unknown>;
          sync_schedule?: string;
          is_active?: boolean;
          last_synced_at?: string | null;
          last_sync_status?: string;
          last_sync_stats?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          display_name?: string | null;
          xml_url?: string;
          auth_type?: string;
          auth_config?: Record<string, unknown>;
          charset?: string;
          feed_type?: string;
          extra_config?: Record<string, unknown>;
          sync_schedule?: string;
          is_active?: boolean;
          last_synced_at?: string | null;
          last_sync_status?: string;
          last_sync_stats?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      next_xml_product_id: {
        Args: Record<string, never>;
        Returns: number;
      };
      checkout_create_order: {
        Args: {
          p_session_id: string;
          p_user_id: string | null;
          p_shipping: Record<string, string>;
          p_fulfillment_route: string;
          p_items: Array<{ product_id: number; quantity: number }>;
        };
        Returns: Array<{ order_id: string; order_total: number }>;
      };
    };
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
