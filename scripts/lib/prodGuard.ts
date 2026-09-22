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

function isAllowProd(): boolean {
  return process.env.HA_ALLOW_PROD === '1';
}

function supabaseHost(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Guard for scripts that write to Supabase.
 * Passes when NEXT_PUBLIC_SUPABASE_URL host is localhost or 127.0.0.1.
 * Any other host (including production) requires HA_ALLOW_PROD=1.
 * Must be called after dotenv.config() so the URL is populated.
 */
export function assertNotProd(): void {
  const host = supabaseHost();
  if (!host) {
    throw new Error(
      '[prod-guard] NEXT_PUBLIC_SUPABASE_URL is not set — cannot verify database target.\n' +
      '  Set it in .env.local and run from the project root.'
    );
  }
  if (ALLOWED_HOSTS.has(host)) {
    return;
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
    '    HA_ALLOW_PROD=1 npx tsx scripts/<name>.ts\n' +
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
