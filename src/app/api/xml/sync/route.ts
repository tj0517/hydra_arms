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
  // ── Auth ──────────────────────────────────────────────────────────────────
  const secret = process.env.SYNC_SECRET
  if (!secret || req.headers.get('x-sync-secret') !== secret) {
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
      const results = await Promise.allSettled(
        Object.entries(CONNECTORS).map(([name, conn]) => runConnector(name, conn)),
      )

      const summary = Object.keys(CONNECTORS).map((name, i) => {
        const r = results[i]
        return r.status === 'fulfilled'
          ? r.value
          : { connector: name, error: r.reason?.message ?? String(r.reason) }
      })

      return NextResponse.json({ ok: true, started_at, results: summary })
    }

    const result = await runConnector(connector, CONNECTORS[connector])
    return NextResponse.json({ ok: true, started_at, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, started_at, error: message }, { status: 500 })
  }
}
