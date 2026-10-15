/**
 * Unit tests for prodGuard.ts — Node built-in test runner.
 * Run: npx tsx --test scripts/lib/prodGuard.test.ts
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { assertNotProd, assertExternalProd } from './prodGuard.js';

const PROD_URL = 'https://breqmmlcaxsvxcqlcmqc.supabase.co';
const OTHER_REMOTE_URL = 'https://other-project.supabase.co';
const LOCALHOST_URL = 'http://localhost:55321';
const LOOPBACK_URL = 'http://127.0.0.1:55321';
// Supabase default ports — another project's local stack on the same machine (HA-2.29).
const FOREIGN_API_URL = 'http://127.0.0.1:54321';
const FOREIGN_DB_PORT_URL = 'http://localhost:54322';

function setEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

function cleanEnv() {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.HA_ALLOW_PROD;
}

describe('assertNotProd', () => {
  beforeEach(cleanEnv);

  test('prod URL → throws', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: PROD_URL });
    assert.throws(() => assertNotProd(), /prod-guard/);
  });

  test('other remote URL → throws', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: OTHER_REMOTE_URL });
    assert.throws(() => assertNotProd(), /prod-guard/);
  });

  test('localhost URL → passes silently', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: LOCALHOST_URL });
    assert.doesNotThrow(() => assertNotProd());
  });

  test('127.0.0.1 URL → passes silently', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: LOOPBACK_URL });
    assert.doesNotThrow(() => assertNotProd());
  });

  test("127.0.0.1:54321 (another project's stack) → throws naming the port", () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: FOREIGN_API_URL });
    assert.throws(
      () => assertNotProd(),
      (err: Error) => /54321/.test(err.message) && /another project's local stack\?/.test(err.message)
    );
  });

  test('localhost:54322 → throws naming the port', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: FOREIGN_DB_PORT_URL });
    assert.throws(
      () => assertNotProd(),
      (err: Error) => /54322/.test(err.message) && /another project's local stack\?/.test(err.message)
    );
  });

  test('localhost without a port (default 80) → throws', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: 'http://localhost' });
    assert.throws(() => assertNotProd(), /another project's local stack\?/);
  });

  test('wrong local port + prod override → still throws (not a prod switch)', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: FOREIGN_API_URL, HA_ALLOW_PROD: '1' });
    assert.throws(() => assertNotProd(), /another project's local stack\?/);
  });

  test('prod URL + HA_ALLOW_PROD=1 → passes with warning', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: PROD_URL, HA_ALLOW_PROD: '1' });
    assert.doesNotThrow(() => assertNotProd());
  });

  test('URL not set → throws', () => {
    cleanEnv();
    assert.throws(() => assertNotProd(), /NEXT_PUBLIC_SUPABASE_URL is not set/);
  });
});

describe('assertExternalProd', () => {
  beforeEach(cleanEnv);

  test('no HA_ALLOW_PROD → throws naming the system', () => {
    assert.throws(
      () => assertExternalProd('BaseLinker'),
      (err: Error) => /BaseLinker/.test(err.message)
    );
  });

  test('HA_ALLOW_PROD=1 → passes with warning', () => {
    setEnv({ HA_ALLOW_PROD: '1' });
    assert.doesNotThrow(() => assertExternalProd('Sanity'));
  });

  test('system name appears in error message', () => {
    assert.throws(
      () => assertExternalProd('Sanity'),
      (err: Error) => /Sanity/.test(err.message)
    );
  });
});
