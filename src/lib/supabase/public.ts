import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Anon-key client for server components that only read public data.
 * No cookies / session needed — RLS public policies cover it.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
