


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."product_type" AS ENUM (
    'standard',
    'age_restricted',
    'pickup_only'
);


ALTER TYPE "public"."product_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."checkout_create_order"("p_session_id" "text", "p_user_id" "uuid", "p_shipping" "jsonb", "p_fulfillment_route" "text", "p_items" "jsonb") RETURNS TABLE("order_id" "uuid", "order_total" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_item     RECORD;
  v_product  shop_products%ROWTYPE;
  v_order_id UUID;
  v_total    NUMERIC(10,2) := 0;
BEGIN
  FOR v_item IN
    SELECT (i->>'product_id')::BIGINT AS product_id,
           (i->>'quantity')::INT      AS quantity
    FROM jsonb_array_elements(p_items) AS i
  LOOP
    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY:%', v_item.product_id;
    END IF;

    -- Relative decrement guarded by stock >= qty: concurrent orders serialize
    -- on the row lock, and any failure aborts the whole transaction.
    UPDATE shop_products
       SET stock = stock - v_item.quantity
     WHERE id = v_item.product_id
       AND is_active = TRUE
       AND stock >= v_item.quantity
    RETURNING * INTO v_product;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_item.product_id;
    END IF;

    v_total := v_total + COALESCE(v_product.price, 0) * v_item.quantity;
  END LOOP;

  INSERT INTO orders (session_id, user_id, status, shipping_address, total, fulfillment_route)
  VALUES (p_session_id, p_user_id, 'paid', p_shipping, ROUND(v_total, 2), p_fulfillment_route)
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, product_snapshot)
  SELECT v_order_id,
         (i->>'product_id')::BIGINT,
         (i->>'quantity')::INT,
         COALESCE(p.price, 0),
         jsonb_build_object(
           'id',       p.id,
           'name',     p.name,
           'sku',      p.sku,
           'ean',      p.ean,
           'tax_rate', p.tax_rate,
           'images',   p.images
         )
  FROM jsonb_array_elements(p_items) AS i
  JOIN shop_products p ON p.id = (i->>'product_id')::BIGINT;

  RETURN QUERY SELECT v_order_id, ROUND(v_total, 2);
END;
$$;


ALTER FUNCTION "public"."checkout_create_order"("p_session_id" "text", "p_user_id" "uuid", "p_shipping" "jsonb", "p_fulfillment_route" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."next_xml_product_id"() RETURNS bigint
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT nextval('xml_product_id_seq');
$$;


ALTER FUNCTION "public"."next_xml_product_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "text",
    "user_id" "uuid",
    "product_id" bigint NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "cart_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "cart_owner" CHECK ((("session_id" IS NOT NULL) OR ("user_id" IS NOT NULL)))
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" bigint NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "product_snapshot" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_id" "text",
    "baselinker_order_id" bigint,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "shipping_address" "jsonb",
    "total" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "fulfillment_route" "text",
    "tracking_number" "text",
    "shipping_carrier" "text",
    "bl_status_id" integer,
    CONSTRAINT "orders_fulfillment_route_check" CHECK (("fulfillment_route" = ANY (ARRAY['own'::"text", 'sourced'::"text", 'pickup'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shop_categories" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "parent_id" bigint,
    "inventory_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shop_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shop_products" (
    "id" bigint NOT NULL,
    "inventory_id" bigint,
    "sku" "text",
    "ean" "text",
    "name" "text" NOT NULL,
    "description" "text",
    "features" "jsonb",
    "price" numeric(10,2),
    "tax_rate" numeric(5,2),
    "stock" integer DEFAULT 0 NOT NULL,
    "weight" numeric(8,3),
    "category_id" bigint,
    "images" "jsonb",
    "product_type" "public"."product_type" DEFAULT 'standard'::"public"."product_type" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "synced_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "source_warehouse" "text",
    "connector" "text",
    "connector_product_id" "text",
    "connector_sku" "text",
    "primary_source" "text" DEFAULT 'baselinker'::"text",
    "age_min" integer DEFAULT 0 NOT NULL,
    "requires_license" boolean DEFAULT false NOT NULL,
    "license_category" "text",
    "delivery_allowed" boolean DEFAULT true NOT NULL,
    "review_flags" "jsonb" DEFAULT '[]'::"jsonb",
    "completeness_score" integer DEFAULT 0,
    "notes_internal" "text",
    "sync_locked_fields" "text"[] DEFAULT ARRAY[]::"text"[],
    "price_purchase" numeric(10,2),
    "price_compare" numeric(10,2),
    "slug" "text",
    "short_description" "text",
    "is_featured" boolean DEFAULT false NOT NULL,
    "badge" "text",
    "availability_status" "text" DEFAULT 'available'::"text",
    "meta_title" "text",
    "meta_description" "text",
    "dimensions" "jsonb",
    "shipping_class" "text" DEFAULT 'standard'::"text"
);


ALTER TABLE "public"."shop_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."source_connectors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text",
    "xml_url" "text" NOT NULL,
    "auth_type" "text" DEFAULT 'none'::"text" NOT NULL,
    "auth_config" "jsonb" DEFAULT '{}'::"jsonb",
    "charset" "text" DEFAULT 'utf-8'::"text" NOT NULL,
    "feed_type" "text" DEFAULT 'full'::"text",
    "extra_config" "jsonb" DEFAULT '{}'::"jsonb",
    "sync_schedule" "text" DEFAULT '0 2 * * *'::"text",
    "is_active" boolean DEFAULT true NOT NULL,
    "last_synced_at" timestamp with time zone,
    "last_sync_status" "text" DEFAULT 'never'::"text",
    "last_sync_stats" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."source_connectors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "age_verified" boolean DEFAULT false NOT NULL,
    "age_verified_at" timestamp with time zone,
    "verification_method" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."xml_product_id_seq"
    START WITH 2000000000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."xml_product_id_seq" OWNER TO "postgres";


ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_categories"
    ADD CONSTRAINT "shop_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_products"
    ADD CONSTRAINT "shop_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."source_connectors"
    ADD CONSTRAINT "source_connectors_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."source_connectors"
    ADD CONSTRAINT "source_connectors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



CREATE INDEX "cart_items_session_idx" ON "public"."cart_items" USING "btree" ("session_id") WHERE ("session_id" IS NOT NULL);



CREATE INDEX "cart_items_user_idx" ON "public"."cart_items" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_connector_product" ON "public"."shop_products" USING "btree" ("connector", "connector_product_id") WHERE (("connector" IS NOT NULL) AND ("connector_product_id" IS NOT NULL));



CREATE UNIQUE INDEX "idx_shop_products_slug" ON "public"."shop_products" USING "btree" ("slug") WHERE ("slug" IS NOT NULL);



CREATE UNIQUE INDEX "orders_session_id_uniq" ON "public"."orders" USING "btree" ("session_id") WHERE ("session_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "cart_items_updated_at" BEFORE UPDATE ON "public"."cart_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "shop_products_updated_at" BEFORE UPDATE ON "public"."shop_products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."shop_products"("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."shop_products"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."shop_products"
    ADD CONSTRAINT "shop_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."shop_categories"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own cart" ON "public"."cart_items" USING ((("auth"."uid"() = "user_id") OR ("session_id" IS NOT NULL)));



CREATE POLICY "own order items" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "own orders" ON "public"."orders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "own profile" ON "public"."user_profiles" USING (("auth"."uid"() = "id"));



CREATE POLICY "public read categories" ON "public"."shop_categories" FOR SELECT USING (true);



CREATE POLICY "public read products" ON "public"."shop_products" FOR SELECT USING (("is_active" = true));



ALTER TABLE "public"."shop_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shop_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."source_connectors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."checkout_create_order"("p_session_id" "text", "p_user_id" "uuid", "p_shipping" "jsonb", "p_fulfillment_route" "text", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."checkout_create_order"("p_session_id" "text", "p_user_id" "uuid", "p_shipping" "jsonb", "p_fulfillment_route" "text", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."next_xml_product_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."next_xml_product_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."next_xml_product_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."shop_categories" TO "anon";
GRANT ALL ON TABLE "public"."shop_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_categories" TO "service_role";



GRANT ALL ON TABLE "public"."shop_products" TO "anon";
GRANT ALL ON TABLE "public"."shop_products" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_products" TO "service_role";



GRANT ALL ON TABLE "public"."source_connectors" TO "anon";
GRANT ALL ON TABLE "public"."source_connectors" TO "authenticated";
GRANT ALL ON TABLE "public"."source_connectors" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."xml_product_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."xml_product_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."xml_product_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































