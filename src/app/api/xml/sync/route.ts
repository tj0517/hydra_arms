/**
 * POST /api/xml/sync
 *
 * Triggers a full XML import for one or all connectors.
 * Called manually from the VPS (or any HTTP client) — not a cron.
 *
 * Auth:   x-sync-secret header must match SYNC_SECRET env var
 * Body:   { "connector": "kolba" | "sharg" | "spechurt" | "all" }
 *
 * Example (from VPS):
 *   curl -X POST https://hydra-arms.com/api/xml/sync \
 *     -H "Content-Type: application/json" \
 *     -H "x-sync-secret: $SYNC_SECRET" \
 *     -d '{"connector":"sharg"}'
 */

import { NextRequest, NextResponse } from 'next/server'
import { isSyncAuthorized } from '@/lib/apiAuth'
import { kolbaConnector } from '../../../../../xml-integration/connectors/kolba'
import { shargConnector } from '../../../../../xml-integration/connectors/sharg'
import { spechurtConnector } from '../../../../../xml-integration/connectors/spechurt'
import { runFullImport } from '../../../../../xml-integration/engine'
import type { Connector } from '../../../../../xml-integration/types'

// Vercel Pro: allow up to 300s for large feeds (Sharg full = ~230 MB)
export const maxDuration = 300

const CONNECTORS: Record<string, Connector> = {
  kolba: kolbaConnector,
  sharg: shargConnector,
  spechurt: spechurtConnector,
}

async function fetchXml(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return res.text()
}

async function runConnector(name: string, connector: Connector) {
  const xml = await fetchXml(connector.config.xml_url)
  const products = connector.parse(xml)
  const result = await runFullImport(name, products)
  return result
}

export async function POST(req: NextRequest) {
  // ── Kill switch ───────────────────────────────────────────────────────────
  // Architecture decision: BaseLinker is the source of truth for products.
  // The XML→Supabase path (this route + engine.ts) conflicts with the
  // BL→Supabase replica sync, so it stays disabled unless explicitly enabled.
  if (process.env.XML_SYNC_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'XML→Supabase import is disabled (BaseLinker is the source of truth — use scripts/xml-to-baselinker.ts). Set XML_SYNC_ENABLED=true to re-enable.' },
      { status: 410 },
    )
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (!isSyncAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let connector: string
  try {
    const body = await req.json()
    connector = body?.connector
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!connector || (connector !== 'all' && !CONNECTORS[connector])) {
    return NextResponse.json(
      { error: `Unknown connector "${connector}". Use: kolba | sharg | spechurt | all` },
      { status: 400 },
    )
  }

  // ── Run import ────────────────────────────────────────────────────────────
  const started_at = new Date().toISOString()

  try {
    if (connector === 'all') {
      // Sequential — running three ~200 MB feed parses concurrently in one
      // function invocation risks OOM/timeouts
      const summary: unknown[] = []
      for (const [name, conn] of Object.entries(CONNECTORS)) {
        try {
          summary.push(await runConnector(name, conn))
        } catch (err) {
          summary.push({ connector: name, error: err instanceof Error ? err.message : String(err) })
        }
      }

      return NextResponse.json({ ok: true, started_at, results: summary })
    }

    const result = await runConnector(connector, CONNECTORS[connector])
    return NextResponse.json({ ok: true, started_at, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, started_at, error: message }, { status: 500 })
  }
}
