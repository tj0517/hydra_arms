/**
 * Feed guard (HA-2.33): an empty feed is an error, not an import of nothing.
 *
 * Four cron nights (2026-10-15…19) showed Spechurt answering the 04:05 UTC import with an
 * empty body (`Received 0.0 MB`, `Parsed 0`) while the same URL at 05:40 UTC carried 16 MB.
 * The import treated it as success (a "nothing to import" line, exit 0), so the journal stayed
 * green and no new Spechurt product reached the catalogue for days.
 *
 * Two pure pieces, both without I/O so they can be unit-tested with an injected clock:
 *   - classifyFeed(): empty body / parsed 0 products / ok
 *   - retryPolicyFromEnv() + fetchFeedWithRetry(): re-fetch an empty feed N times, D seconds
 *     apart (env FEED_RETRY_ATTEMPTS / FEED_RETRY_DELAY_S, defaults 3 / 600), never for a
 *     local file (--from-file), and throw EmptyFeedError after the last attempt. The script's
 *     `main().catch` prints the message as `[fatal] empty feed after N attempts` and exits 1;
 *     scripts/server/run-bl.sh copies that line into the journal's END result.
 */

export type FeedClass = 'empty-body' | 'no-products' | 'ok';

/** A body of only whitespace is 'empty-body'; a body that parsed to nothing is 'no-products'. */
export function classifyFeed(xml: string, productCount: number): FeedClass {
  if (xml.trim().length === 0) return 'empty-body';
  if (productCount === 0) return 'no-products';
  return 'ok';
}

/** process.env or a test stub — only string lookups are needed. */
export type EnvLike = Readonly<Record<string, string | undefined>>;

export const FEED_RETRY_DEFAULTS = { attempts: 3, delayS: 600 } as const;

export interface RetryPolicy {
  /** Total number of fetch attempts, including the first one (≥ 1). */
  attempts: number;
  /** Pause between attempts, in milliseconds. */
  delayMs: number;
  /** Why no retry happens, when attempts is forced to 1 (printed in the fatal line). */
  noRetryReason?: string;
}

function readPositiveInt(env: EnvLike, name: string, fallback: number, min: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  if (!/^\d+$/.test(raw.trim())) {
    throw new Error(`${name} must be a whole number of ${name.endsWith('_S') ? 'seconds' : 'attempts'}, got "${raw}"`);
  }
  const value = parseInt(raw.trim(), 10);
  if (value < min) throw new Error(`${name} must be at least ${min}, got "${raw}"`);
  return value;
}

/**
 * Attempts and delay from the environment (defaults 3 attempts, 600 s). A feed read from a
 * local file is never retried — the file will not change between attempts.
 * A value the policy does not understand is refused (thrown), not silently defaulted.
 */
export function retryPolicyFromEnv(env: EnvLike, opts: { fromFile: boolean }): RetryPolicy {
  if (opts.fromFile) return { attempts: 1, delayMs: 0, noRetryReason: 'no retry for --from-file' };
  const attempts = readPositiveInt(env, 'FEED_RETRY_ATTEMPTS', FEED_RETRY_DEFAULTS.attempts, 1);
  const delayS = readPositiveInt(env, 'FEED_RETRY_DELAY_S', FEED_RETRY_DEFAULTS.delayS, 0);
  return { attempts, delayMs: delayS * 1000 };
}

export class EmptyFeedError extends Error {
  constructor(
    public readonly attempts: number,
    public readonly lastClass: Exclude<FeedClass, 'ok'>,
    noRetryReason?: string,
  ) {
    super(formatEmptyFeedMessage(attempts, noRetryReason));
    this.name = 'EmptyFeedError';
  }
}

/** `empty feed after 3 attempts` / `empty feed after 1 attempt (no retry for --from-file)`. */
export function formatEmptyFeedMessage(attempts: number, noRetryReason?: string): string {
  const base = `empty feed after ${attempts} attempt${attempts === 1 ? '' : 's'}`;
  return noRetryReason ? `${base} (${noRetryReason})` : base;
}

export interface FeedAttempt<T> {
  xml: string;
  products: T[];
}

export interface RetryDeps {
  /** Pause for the given milliseconds — injected so tests never sleep. */
  sleep: (ms: number) => Promise<unknown>;
  /** One line per failed attempt, e.g. for console.warn. */
  warn: (line: string) => void;
}

/**
 * Runs `attempt` until it yields a non-empty feed or the policy is exhausted.
 * Only an empty result is retried; a thrown error (HTTP failure, parse error) propagates
 * unchanged on the first occurrence, as before.
 */
export async function fetchFeedWithRetry<T>(
  attempt: () => Promise<FeedAttempt<T>>,
  policy: RetryPolicy,
  deps: RetryDeps,
): Promise<{ products: T[]; attempts: number }> {
  let lastClass: Exclude<FeedClass, 'ok'> = 'empty-body';
  for (let n = 1; n <= policy.attempts; n++) {
    const { xml, products } = await attempt();
    const cls = classifyFeed(xml, products.length);
    if (cls === 'ok') return { products, attempts: n };
    lastClass = cls;
    const what = cls === 'empty-body' ? 'empty body' : '0 products parsed';
    if (n < policy.attempts) {
      deps.warn(`[warn] empty feed (${what}) — attempt ${n}/${policy.attempts}, retrying in ${Math.round(policy.delayMs / 1000)} s`);
      await deps.sleep(policy.delayMs);
    } else {
      deps.warn(`[warn] empty feed (${what}) — attempt ${n}/${policy.attempts}, giving up`);
    }
  }
  throw new EmptyFeedError(policy.attempts, lastClass, policy.noRetryReason);
}
