// Read-only: attempts to read source_connectors using the public anon key only.
// Prints row count and error code — never column values.
// No service-role import, no writes, no HA_ALLOW_PROD needed.
import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

import { createClient } from '@supabase/supabase-js'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  const anon = createClient(url, anonKey)

  const { data, error } = await anon.from('source_connectors').select('name')

  console.log('row_count:', data?.length ?? 0)
  console.log('error:', error ? `${error.code}: ${error.message}` : 'none')
}

main().catch((err) => { console.error(err); process.exit(1) })
