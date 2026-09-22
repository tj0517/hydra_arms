-- Codifies the RLS that was enabled by hand on prod (HA-1.01) and strips
-- feed-URL secrets from rows. Feed URLs are now built from environment variables
-- (SHARG_TOKEN_FULL, SHARG_TOKEN_LIGHT, SHARG_TOKEN_GATEWAY, SPECHURT_KEY);
-- the database rows are no longer the source of truth for those URLs.
-- No policies are added: the table is service-role only (engine.ts upsert).

-- Idempotent: does not fail if RLS is already enabled.
ALTER TABLE public.source_connectors ENABLE ROW LEVEL SECURITY;

-- Strip token/key query params from rows where they are present.
-- Rows without secrets (e.g. kolba) do not match the WHERE clause and are untouched.

UPDATE public.source_connectors
  SET xml_url = 'env:SHARG_TOKEN_FULL'
  WHERE name = 'sharg'
    AND xml_url ~ '(token|key)=';

UPDATE public.source_connectors
  SET extra_config = jsonb_set(
        jsonb_set(
          extra_config,
          '{light_url}', '"env:SHARG_TOKEN_LIGHT"'
        ),
        '{gateway_url}', '"env:SHARG_TOKEN_GATEWAY"'
      )
  WHERE name = 'sharg'
    AND extra_config::text ~ '(token|key)=';

UPDATE public.source_connectors
  SET xml_url = 'env:SPECHURT_KEY'
  WHERE name = 'spechurt'
    AND xml_url ~ '(token|key)=';
