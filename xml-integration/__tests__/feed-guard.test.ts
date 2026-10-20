/**
 * Feed guard (HA-2.33): an empty feed classifies as empty and is retried per policy;
 * after the last attempt the error carries the `[fatal] empty feed after N attempts` text.
 * No network, no sleep — the clock is injected.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import {
  EmptyFeedError,
  classifyFeed,
  fetchFeedWithRetry,
  formatEmptyFeedMessage,
  retryPolicyFromEnv,
  type RetryPolicy,
} from '../feed-guard';
import { spechurtConnector } from '../connectors/spechurt';

const SAMPLE = path.resolve(process.cwd(), 'xml-integration/samples/spechurt_sample.xml');

// ── classification ────────────────────────────────────────────────────────────

test('an empty XML (0 bytes) classifies as empty-body', () => {
  assert.equal(classifyFeed('', 0), 'empty-body');
});

test('a whitespace-only body classifies as empty-body', () => {
  assert.equal(classifyFeed('\n  \n', 0), 'empty-body');
});

test('an XML without products classifies as no-products', () => {
  const xml = '<?xml version="1.0" ?>\n<produkty generated="2026-10-19 06:05:00">\n</produkty>\n';
  assert.equal(classifyFeed(xml, spechurtConnector.parse(xml).length), 'no-products');
});

test('an HTTP 200 error page (HTML, 0 products) classifies as no-products', () => {
  const html = '<html><body>Feed is being regenerated</body></html>';
  assert.equal(classifyFeed(html, 0), 'no-products');
});

test('xml-integration/samples/spechurt_sample.xml classifies as ok (red proof)', () => {
  const xml = fs.readFileSync(SAMPLE, 'utf8');
  const products = spechurtConnector.parse(xml);
  assert.ok(products.length > 0, 'the sample parses to at least one product');
  assert.equal(classifyFeed(xml, products.length), 'ok');
});

// ── retry policy from env ─────────────────────────────────────────────────────

test('retry policy defaults to 3 attempts, 600 s apart', () => {
  assert.deepEqual(retryPolicyFromEnv({}, { fromFile: false }), { attempts: 3, delayMs: 600_000 });
});

test('retry policy reads FEED_RETRY_ATTEMPTS and FEED_RETRY_DELAY_S from env', () => {
  const policy = retryPolicyFromEnv({ FEED_RETRY_ATTEMPTS: '5', FEED_RETRY_DELAY_S: '30' }, { fromFile: false });
  assert.deepEqual(policy, { attempts: 5, delayMs: 30_000 });
});

test('retry policy treats an empty env value as unset (default)', () => {
  assert.equal(retryPolicyFromEnv({ FEED_RETRY_ATTEMPTS: '' }, { fromFile: false }).attempts, 3);
});

test('retry policy refuses a value that is not a whole number', () => {
  assert.throws(() => retryPolicyFromEnv({ FEED_RETRY_ATTEMPTS: 'three' }, { fromFile: false }), /FEED_RETRY_ATTEMPTS must be a whole number/);
  assert.throws(() => retryPolicyFromEnv({ FEED_RETRY_DELAY_S: '10m' }, { fromFile: false }), /FEED_RETRY_DELAY_S must be a whole number/);
  assert.throws(() => retryPolicyFromEnv({ FEED_RETRY_ATTEMPTS: '0' }, { fromFile: false }), /at least 1/);
});

test('--from-file never retries: one attempt, no delay, even when env asks for more', () => {
  const policy = retryPolicyFromEnv({ FEED_RETRY_ATTEMPTS: '5', FEED_RETRY_DELAY_S: '30' }, { fromFile: true });
  assert.equal(policy.attempts, 1);
  assert.equal(policy.delayMs, 0);
  assert.equal(policy.noRetryReason, 'no retry for --from-file');
});

// ── fetchFeedWithRetry — injected clock ───────────────────────────────────────

function harness(results: Array<{ xml: string; products: string[] }>) {
  const slept: number[] = [];
  const warned: string[] = [];
  let calls = 0;
  const attempt = async () => {
    const r = results[Math.min(calls, results.length - 1)];
    calls++;
    return r;
  };
  const deps = {
    sleep: async (ms: number) => { slept.push(ms); },
    warn: (line: string) => { warned.push(line); },
  };
  return { attempt, deps, slept, warned, calls: () => calls };
}

const EMPTY = { xml: '', products: [] as string[] };
const FULL = { xml: '<produkty><produkt/></produkty>', products: ['p1'] };

test('a non-empty feed on the first attempt is returned without sleeping', async () => {
  const h = harness([FULL]);
  const policy: RetryPolicy = { attempts: 3, delayMs: 600_000 };
  const out = await fetchFeedWithRetry(h.attempt, policy, h.deps);
  assert.deepEqual(out, { products: ['p1'], attempts: 1 });
  assert.deepEqual(h.slept, []);
  assert.deepEqual(h.warned, []);
});

test('an empty feed is re-fetched after the configured delay and the full one is used', async () => {
  const h = harness([EMPTY, EMPTY, FULL]);
  const policy: RetryPolicy = { attempts: 3, delayMs: 600_000 };
  const out = await fetchFeedWithRetry(h.attempt, policy, h.deps);
  assert.deepEqual(out, { products: ['p1'], attempts: 3 });
  assert.deepEqual(h.slept, [600_000, 600_000], 'two pauses between three attempts');
  assert.match(h.warned[0], /^\[warn\] empty feed \(empty body\) — attempt 1\/3, retrying in 600 s$/);
});

test('after N failed attempts the error says "empty feed after N attempts" and the clock was used N-1 times', async () => {
  const h = harness([EMPTY]);
  const policy = retryPolicyFromEnv({ FEED_RETRY_ATTEMPTS: '4', FEED_RETRY_DELAY_S: '7' }, { fromFile: false });
  await assert.rejects(
    fetchFeedWithRetry(h.attempt, policy, h.deps),
    (err: unknown) => err instanceof EmptyFeedError && err.attempts === 4 && err.message === 'empty feed after 4 attempts',
  );
  assert.equal(h.calls(), 4, 'FEED_RETRY_ATTEMPTS decides how many fetches happen');
  assert.deepEqual(h.slept, [7_000, 7_000, 7_000]);
  assert.match(h.warned[3], /attempt 4\/4, giving up$/);
});

test('with the default policy an empty feed fails after exactly 3 attempts', async () => {
  const h = harness([EMPTY]);
  await assert.rejects(fetchFeedWithRetry(h.attempt, retryPolicyFromEnv({}, { fromFile: false }), h.deps), /empty feed after 3 attempts/);
  assert.equal(h.calls(), 3);
});

test('--from-file: one attempt, no sleep, message names the reason', async () => {
  const h = harness([{ xml: '<produkty></produkty>', products: [] }]);
  await assert.rejects(
    fetchFeedWithRetry(h.attempt, retryPolicyFromEnv({}, { fromFile: true }), h.deps),
    (err: unknown) => err instanceof EmptyFeedError
      && err.lastClass === 'no-products'
      && err.message === 'empty feed after 1 attempt (no retry for --from-file)',
  );
  assert.equal(h.calls(), 1);
  assert.deepEqual(h.slept, []);
});

test('a thrown fetch error is not retried — it propagates on the first attempt', async () => {
  let calls = 0;
  const attempt = async () => { calls++; throw new Error('Feed fetch failed: HTTP 503'); };
  const h = harness([]);
  await assert.rejects(fetchFeedWithRetry(attempt, { attempts: 3, delayMs: 1 }, h.deps), /HTTP 503/);
  assert.equal(calls, 1);
  assert.deepEqual(h.slept, []);
});

test('the fatal line the wrapper greps for is "[fatal] empty feed after 3 attempts"', () => {
  // scripts/xml-to-baselinker.ts prints `[fatal] ${err.message}`; run-bl.sh matches
  // `\[fatal\] empty feed after [0-9]+ attempts?` — keep the three in step.
  assert.equal(`[fatal] ${formatEmptyFeedMessage(3)}`, '[fatal] empty feed after 3 attempts');
  assert.match(`[fatal] ${formatEmptyFeedMessage(1, 'no retry for --from-file')}`, /^\[fatal\] empty feed after [0-9]+ attempts?/);
});
