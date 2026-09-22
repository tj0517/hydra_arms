# Prod schema baseline — 2026-09-22

## Dump

- File: `supabase/baseline/prod-schema-2026-09-22.sql`
- Project: `breqmmlcaxsvxcqlcmqc` (linked via Supabase CLI, confirmed with `supabase projects list` — marked ●)
- Command used (schema-only by default, no data):
  ```
  supabase db dump --linked -f supabase/baseline/prod-schema-2026-09-22.sql
  ```
- Reproduce: `SUPABASE_DB_PASSWORD` must be set in the shell (never print it), then run the command above from the repo root with the CLI linked to `breqmmlcaxsvxcqlcmqc`.
- Verified against acceptance criteria:
  - `grep -c 'CREATE TABLE' supabase/baseline/prod-schema-2026-09-22.sql` → `7` (6 tables from 001 + `source_connectors` from 004)
  - all four function names (`create_user_profile`, `next_xml_product_id`, `checkout_create_order`, `update_updated_at`) present
  - `grep -n -E '^(INSERT INTO|COPY) ' supabase/baseline/prod-schema-2026-09-22.sql` → empty
  - `grep -rn -E '(token|key)=[A-Za-z0-9_-]{6,}' supabase/baseline/` → empty

## Odczyty

All queries below were run read-only through the `supabase-prod` MCP server (`project_ref=breqmmlcaxsvxcqlcmqc&read_only=true`), confirmed live (not from memory/notes/types.ts).

### RLS per table (`public`)

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
```

Result:

```json
[{"table_name":"cart_items","rls_enabled":true,"rls_forced":false},
 {"table_name":"order_items","rls_enabled":true,"rls_forced":false},
 {"table_name":"orders","rls_enabled":true,"rls_forced":false},
 {"table_name":"shop_categories","rls_enabled":true,"rls_forced":false},
 {"table_name":"shop_products","rls_enabled":true,"rls_forced":false},
 {"table_name":"source_connectors","rls_enabled":true,"rls_forced":false},
 {"table_name":"user_profiles","rls_enabled":true,"rls_forced":false}]
```

**RLS on `source_connectors`: YES, enabled.** (Not set by any migration in 001–007 — see "Rozjazd" below; it was applied by hand on prod.)

### Policies (`pg_policies`, schema `public`)

```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, policyname;
```

Result:

```json
[{"tablename":"cart_items","policyname":"own cart","cmd":"ALL","qual":"((auth.uid() = user_id) OR (session_id IS NOT NULL))"},
 {"tablename":"order_items","policyname":"own order items","cmd":"SELECT","qual":"(EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()))"},
 {"tablename":"orders","policyname":"own orders","cmd":"SELECT","qual":"(auth.uid() = user_id)"},
 {"tablename":"shop_categories","policyname":"public read categories","cmd":"SELECT","qual":"true"},
 {"tablename":"shop_products","policyname":"public read products","cmd":"SELECT","qual":"(is_active = true)"},
 {"tablename":"user_profiles","policyname":"own profile","cmd":"ALL","qual":"(auth.uid() = id)"}]
```

**No policy exists for `source_connectors`.** RLS is enabled with zero policies, which means default-deny for `anon`/`authenticated` (they cannot SELECT any row); only roles that bypass RLS (e.g. `service_role`, or the Postgres role owning the table) can read it. This matches the 6 policies defined in migration `001_shop_schema.sql` exactly — `source_connectors` has no policy in any migration file (001–007 never mention it in a `CREATE POLICY`).

### EXECUTE privileges on the four functions

```sql
select p.proname as function_name, r.rolname as grantee, has_function_privilege(r.rolname, p.oid, 'EXECUTE') as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join (select rolname from pg_roles where rolname in ('anon','authenticated','service_role','public')) r
where n.nspname = 'public'
and p.proname in ('create_user_profile','next_xml_product_id','checkout_create_order','update_updated_at')
order by p.proname, r.rolname;
```

Result:

```json
[{"function_name":"checkout_create_order","grantee":"anon","can_execute":false},
 {"function_name":"checkout_create_order","grantee":"authenticated","can_execute":false},
 {"function_name":"checkout_create_order","grantee":"service_role","can_execute":true},
 {"function_name":"create_user_profile","grantee":"anon","can_execute":true},
 {"function_name":"create_user_profile","grantee":"authenticated","can_execute":true},
 {"function_name":"create_user_profile","grantee":"service_role","can_execute":true},
 {"function_name":"next_xml_product_id","grantee":"anon","can_execute":true},
 {"function_name":"next_xml_product_id","grantee":"authenticated","can_execute":true},
 {"function_name":"next_xml_product_id","grantee":"service_role","can_execute":true},
 {"function_name":"update_updated_at","grantee":"anon","can_execute":true},
 {"function_name":"update_updated_at","grantee":"authenticated","can_execute":true},
 {"function_name":"update_updated_at","grantee":"service_role","can_execute":true}]
```

`checkout_create_order` matches migration `006`'s explicit `REVOKE ALL ... FROM PUBLIC/anon/authenticated` + `GRANT ... TO service_role`. The other three functions are reachable by `anon`/`authenticated` because no migration ever revoked the default `PUBLIC` grant Postgres applies on function creation — consistent with the migration files as written (not drift), but flagged here since `create_user_profile` and `next_xml_product_id` are `SECURITY DEFINER` and this is exactly the class of issue HA-1.03 (out of scope here) is meant to close.

### Function definitions (`pg_get_functiondef`)

```sql
select p.proname, pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
and p.proname in ('create_user_profile','next_xml_product_id','checkout_create_order','update_updated_at')
order by p.proname;
```

Result (verbatim function bodies, `SECURITY`/`search_path` flags noted):

- **`checkout_create_order`** — `SECURITY DEFINER`, `SET search_path TO 'public'`. Matches migration `006_checkout_atomic.sql` exactly (stock decrement guarded by `stock >= quantity`, insert order as `'paid'`, insert order_items, `REVOKE`/`GRANT` as above).
- **`create_user_profile`** — `SECURITY DEFINER`, `SET search_path TO 'public'`. Matches `001_shop_schema.sql` (trigger, inserts into `user_profiles`). Note: 001's source has no explicit `SET search_path` in the file text, but the live function does have it set — see "Rozjazd".
- **`next_xml_product_id`** — `SECURITY DEFINER`, **no `SET search_path`**. Matches `004_xml_import_fields.sql` exactly (`LANGUAGE SQL SECURITY DEFINER`, no search_path clause in the migration either — so this is *not* drift, it's the migration's own gap, relevant to HA-1.03).
- **`update_updated_at`** — plain `LANGUAGE plpgsql`, no `SECURITY DEFINER`. Matches `001_shop_schema.sql`.

Full bodies are in the dump file (`supabase/baseline/prod-schema-2026-09-22.sql`, lines 58–155) — not repeated here to keep this report to the query results.

### `source_connectors` — row count and token presence

```sql
select
  count(*) as row_count,
  count(*) filter (where xml_url ilike '%token=%' or xml_url ilike '%key=%') as xml_url_with_token_like,
  count(*) filter (where extra_config::text ilike '%token=%' or extra_config::text ilike '%"key"%' or extra_config::text ilike '%key=%') as extra_config_with_token_like
from source_connectors;
```

Result:

```json
[{"row_count":3,"xml_url_with_token_like":2,"extra_config_with_token_like":1}]
```

**Row count: 3. Rows contain tokens: YES** — 2 of 3 rows have `token=` or `key=` in `xml_url`, 1 has token-like content in `extra_config`. No values were selected or printed, only per-column counts, per the task's rule.

Cross-check with exact per-table row counts (also used to sanity-check the MCP `list_tables` summary, whose `"rows"` field for `source_connectors` read `0` — that field is Postgres's estimated `pg_class.reltuples`, not a live count, and was stale/wrong here; the `COUNT(*)` above is authoritative):

```sql
select 'shop_categories' t, count(*) from shop_categories
union all select 'shop_products', count(*) from shop_products
union all select 'user_profiles', count(*) from user_profiles
union all select 'cart_items', count(*) from cart_items
union all select 'orders', count(*) from orders
union all select 'order_items', count(*) from order_items
union all select 'source_connectors', count(*) from source_connectors;
```

Result:

```json
[{"t":"shop_categories","count":206},{"t":"shop_products","count":592},{"t":"user_profiles","count":2},
 {"t":"cart_items","count":0},{"t":"orders","count":4},{"t":"order_items","count":4},
 {"t":"source_connectors","count":3}]
```

### Migration tracking table

```
list_migrations (supabase-prod MCP) → []
```

Empty — prod has **no rows in `supabase_migrations.schema_migrations`**. Migrations 001–007 were applied by hand (as the task description says), so the CLI has no record of which migrations actually ran. This is consistent with the schema matching 001–007's *content*, checked structurally below, but it means the CLI's own migration-history tooling (`supabase migration list`, `db push`) cannot be trusted to know current state — a future `db push` could try to re-apply 001–007 from scratch. Flagged in "Rozjazd".

## Rozjazd (prod vs. migrations 001–007)

1. **`source_connectors` has RLS enabled on prod, but no migration (001–007) ever runs `ALTER TABLE source_connectors ENABLE ROW LEVEL SECURITY`.** This was applied by hand outside the migration files. Net effect is protective (default-deny, no policy), but it's undocumented in the migration history — if `db push` ever replays from a fresh state, this table would come back with RLS *off*, since no migration sets it.
2. **Prod's migration history table is empty** (`list_migrations` → `[]`), confirming migrations were applied by hand, not tracked by the CLI. Any future `supabase db push` will not know 001–007 already ran, and needs `supabase migration repair` before any push — that repair is a write and out of scope here (STOP-gated), just flagging it.
3. **`create_user_profile` has `SET search_path TO 'public'` live, but migration `001_shop_schema.sql`'s source text does not include that clause** for this function (only for `checkout_create_order` in 006 is `SET search_path` written explicitly in the file). Either the function was hand-edited on prod after 001 ran, or a later, unlogged change added it. Net effect is protective, but it means the live function body isn't fully reconstructable from the migration files alone.
4. Everything else checked — table set (7/7), columns added by 002/004/005/007, `orders_fulfillment_route_check` constraint (`'own','sourced','pickup'`, matching 007), the dropped `shop_products_source_warehouse_check` (matching 007), all 6 RLS policies (matching 001), and `checkout_create_order`'s REVOKE/GRANT (matching 006) — **matches migrations exactly, no drift found.**

## Notable but out of scope (recorded in `docs/deferred-tasks.md` under HA-1.01)

- Migration `004_xml_import_fields.sql`, as committed in this repo, seeds `source_connectors.xml_url` / `extra_config` with real Sharg supplier tokens and a Spechurt API key in plaintext SQL. This means the tokens are not only live in the `source_connectors` table (see above) but also permanently in this repo's git history via the migration file itself. Fixing this (rotating tokens, moving them out of committed SQL) is a decision for HA-1.02, not this task — flagged here because it's a stronger exposure than "the current table has tokens."

## Proposed `db.baseline` for `project.md`

```
baseline: supabase/baseline/prod-schema-2026-09-22.sql
```

(I'm not applying this — you apply it yourself per the task instructions.)
