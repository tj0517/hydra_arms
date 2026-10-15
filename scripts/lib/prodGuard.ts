/**
 * In-script production safety guards (HA-1.05).
 *
 * Call assertNotProd() after dotenv.config() in every script that writes to Supabase.
 * Call assertExternalProd(system) in every script that writes to BaseLinker or Sanity —
 * those have no local equivalent, so any run is a prod run.
 *
 * Unlock deliberately for a single run: HA_ALLOW_PROD=1 npx tsx scripts/<name>.ts
 * Never set HA_ALLOW_PROD permanently in .env.local or shell profile.
 */

const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost']);

/**
 * Port of Hydra's own local API (supabase/config.toml [api] port, HA-2.29).
 * A localhost URL on any other port is another project's stack (e.g. one still on
 * the Supabase default API port) — the host alone cannot tell them apart.
 */
const LOCAL_API_PORT = '55321';

function isAllowProd(): boolean {
  return process.env.HA_ALLOW_PROD === '1';
}

function supabaseTarget(): { host: string; port: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    const parsed = new URL(url);
    // URL.port is '' when the URL uses its scheme's default port.
    const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
    return { host: parsed.hostname, port };
  } catch {
    return null;
  }
}

/**
 * Guard for scripts that write to Supabase.
 * Passes when NEXT_PUBLIC_SUPABASE_URL host is localhost or 127.0.0.1 AND the port is
 * Hydra's local API port (55321). A localhost URL on another port always throws — the
 * prod override does not unlock it: it is not prod, it is someone else's local stack.
 * Any other host (including production) requires HA_ALLOW_PROD=1.
 * Must be called after dotenv.config() so the URL is populated.
 *
 * @param commandHint - The command to suggest in the error message.
 *   Override when calling from non-script contexts (e.g. playwright.config.ts).
 */
export function assertNotProd(commandHint: string = 'npx tsx scripts/<name>.ts'): void {
  const target = supabaseTarget();
  if (!target) {
    throw new Error(
      '[prod-guard] NEXT_PUBLIC_SUPABASE_URL is not set — cannot verify database target.\n' +
      '  Set it in .env.development.local (local) or .env.local (prod) and run from the project root.'
    );
  }
  const { host, port } = target;
  if (ALLOWED_HOSTS.has(host)) {
    if (port === LOCAL_API_PORT) return;
    throw new Error(
      `[prod-guard] Refused: NEXT_PUBLIC_SUPABASE_URL points to ${host}:${port}, but Hydra's local stack listens on ${LOCAL_API_PORT} — another project's local stack?\n` +
      '  Fix NEXT_PUBLIC_SUPABASE_URL in .env.development.local (npm run db:start, then supabase status).'
    );
  }
  if (isAllowProd()) {
    console.warn(
      `\n\x1b[33m⚠  [prod-guard] WARNING: writing to Supabase at host "${host}" (not a local instance).\x1b[0m` +
      '\n\x1b[33m   HA_ALLOW_PROD=1 is set — proceeding. Make sure this is intentional.\x1b[0m\n'
    );
    return;
  }
  throw new Error(
    `[prod-guard] Refused: NEXT_PUBLIC_SUPABASE_URL points to "${host}" which is not a local database.\n` +
    '  To run against this target deliberately:\n' +
    `    HA_ALLOW_PROD=1 ${commandHint}\n` +
    '  Do NOT set HA_ALLOW_PROD permanently.'
  );
}

/**
 * Guard for scripts that write to BaseLinker or Sanity (no local equivalent exists).
 * Always requires HA_ALLOW_PROD=1 — every run writes to production.
 * @param system Human-readable system name, e.g. "BaseLinker" or "Sanity".
 */
export function assertExternalProd(system: string): void {
  if (isAllowProd()) {
    console.warn(
      `\n\x1b[33m⚠  [prod-guard] WARNING: writing to ${system} (no local equivalent — this is production).\x1b[0m` +
      '\n\x1b[33m   HA_ALLOW_PROD=1 is set — proceeding. Make sure this is intentional.\x1b[0m\n'
    );
    return;
  }
  throw new Error(
    `[prod-guard] Refused: ${system} has no local equivalent — every run writes to production.\n` +
    '  To run deliberately:\n' +
    '    HA_ALLOW_PROD=1 npx tsx scripts/<name>.ts\n' +
    '  Do NOT set HA_ALLOW_PROD permanently.'
  );
}
