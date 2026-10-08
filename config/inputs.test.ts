/**
 * Unit tests for the input registry and its guard (HA-2.16) — Node built-in runner.
 * Run: npx tsx --test config/inputs.test.ts
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { INPUTS, type InputEntry } from './inputs.js';
import { checkInputs, parseShopMode, renderDocs } from './inputsCheck.js';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const MARKER = 'SECRET_MARKER_123';

function entry(over: Partial<InputEntry>): InputEntry {
  return {
    name: 'FIXTURE_INPUT',
    source: 'env',
    status: 'confirmed',
    owner: 'client',
    provisional: false,
    secret: false,
    usedIn: ['not yet — HA-9.99'],
    question: 'O-99',
    task: 'HA-9.99',
    ...over,
  };
}

/** Fixture registry: exactly one placeholder among confirmed entries. */
const ONE_PLACEHOLDER: InputEntry[] = [
  entry({ name: 'FIXTURE_CONFIRMED_A' }),
  entry({ name: 'FIXTURE_MISSING_PRICE', status: 'placeholder' }),
  entry({ name: 'FIXTURE_CONFIRMED_B' }),
];

const ALL_CONFIRMED: InputEntry[] = [
  entry({ name: 'FIXTURE_CONFIRMED_A' }),
  entry({ name: 'FIXTURE_CONFIRMED_B' }),
];

describe('parseShopMode — closed list (tj 2026-10-08)', () => {
  test('unset → dev', () => {
    assert.deepEqual(parseShopMode(undefined), { ok: true, mode: 'dev' });
  });

  test('empty string (SHOP_MODE= in an env file) → dev', () => {
    assert.deepEqual(parseShopMode(''), { ok: true, mode: 'dev' });
  });

  test('live → live', () => {
    assert.deepEqual(parseShopMode('live'), { ok: true, mode: 'live' });
  });

  test('verification → verification', () => {
    assert.deepEqual(parseShopMode('verification'), { ok: true, mode: 'verification' });
  });

  for (const bad of ['Live', 'LIVE', 'production', 'prod', 'live ', ' live', 'dev', 'test']) {
    test(`unknown value ${JSON.stringify(bad)} → not ok`, () => {
      assert.deepEqual(parseShopMode(bad), { ok: false });
    });
  }
});

describe('checkInputs — live mode blocks on placeholders', () => {
  test('red proof: one placeholder + live → exit != 0 and names that input', () => {
    const r = checkInputs(ONE_PLACEHOLDER, 'live');
    assert.notEqual(r.exitCode, 0);
    assert.equal(r.exitCode, 1);
    assert.deepEqual(r.placeholders, ['FIXTURE_MISSING_PRICE']);
    const err = r.stderr.join('\n');
    assert.match(err, /FIXTURE_MISSING_PRICE/);
    assert.doesNotMatch(err, /FIXTURE_CONFIRMED_A/);
  });

  test('all confirmed + live → exit 0', () => {
    const r = checkInputs(ALL_CONFIRMED, 'live');
    assert.equal(r.exitCode, 0);
    assert.deepEqual(r.placeholders, []);
    assert.deepEqual(r.stderr, []);
    assert.match(r.stdout.join('\n'), /every input is confirmed/);
  });

  test('live names every placeholder, not just the first', () => {
    const many = [
      entry({ name: 'FIXTURE_P1', status: 'placeholder' }),
      entry({ name: 'FIXTURE_P2', status: 'placeholder' }),
      entry({ name: 'FIXTURE_OK' }),
    ];
    const r = checkInputs(many, 'live');
    assert.equal(r.exitCode, 1);
    const err = r.stderr.join('\n');
    assert.match(err, /FIXTURE_P1/);
    assert.match(err, /FIXTURE_P2/);
  });

  test('the real registry in live mode fails while anything is a placeholder', () => {
    const r = checkInputs(INPUTS, 'live');
    const open = INPUTS.filter((i) => i.status === 'placeholder');
    if (open.length > 0) {
      assert.equal(r.exitCode, 1);
      for (const i of open) assert.match(r.stderr.join('\n'), new RegExp(i.name));
    } else {
      assert.equal(r.exitCode, 0);
    }
  });
});

describe('checkInputs — non-live modes are not blocked by placeholders', () => {
  for (const raw of [undefined, '', 'verification'] as const) {
    test(`SHOP_MODE=${JSON.stringify(raw)} + placeholders → exit 0`, () => {
      const r = checkInputs(ONE_PLACEHOLDER, raw);
      assert.equal(r.exitCode, 0);
      assert.deepEqual(r.stderr, []);
      assert.deepEqual(r.placeholders, ['FIXTURE_MISSING_PRICE']);
    });
  }

  test('real registry, unset mode → exit 0 and the table lists every input', () => {
    const r = checkInputs(INPUTS, undefined);
    assert.equal(r.exitCode, 0);
    const out = r.stdout.join('\n');
    for (const i of INPUTS) assert.match(out, new RegExp(i.name));
  });
});

describe('checkInputs — unknown SHOP_MODE fails', () => {
  for (const bad of ['Live', 'production']) {
    test(`SHOP_MODE=${bad} → exit != 0 with a clear message`, () => {
      const r = checkInputs(ONE_PLACEHOLDER, bad);
      assert.notEqual(r.exitCode, 0);
      assert.equal(r.exitCode, 2);
      assert.equal(r.mode, null);
      const err = r.stderr.join('\n');
      assert.match(err, /SHOP_MODE has an unknown value/);
      assert.match(err, /live, verification, or unset/);
    });
  }

  test('the unknown value itself is not echoed', () => {
    const r = checkInputs(ONE_PLACEHOLDER, MARKER);
    assert.equal(r.exitCode, 2);
    assert.doesNotMatch([...r.stdout, ...r.stderr].join('\n'), new RegExp(MARKER));
  });
});

describe('output is value-free', () => {
  const envInputs = INPUTS.filter((i) => i.source === 'env').map((i) => i.name);

  function runCheck(extraEnv: Record<string, string>) {
    const env: NodeJS.ProcessEnv = { ...process.env };
    for (const name of envInputs) env[name] = MARKER;
    Object.assign(env, extraEnv);
    return spawnSync('npx', ['tsx', 'scripts/inputs-check.ts'], {
      cwd: REPO_ROOT,
      env,
      encoding: 'utf8',
    });
  }

  test('every env input set to the marker → marker absent from stdout and stderr (live)', () => {
    const r = runCheck({ SHOP_MODE: 'live' });
    assert.equal(r.status, 1, `expected exit 1, got ${r.status}\n${r.stdout}\n${r.stderr}`);
    assert.doesNotMatch(r.stdout, new RegExp(MARKER));
    assert.doesNotMatch(r.stderr, new RegExp(MARKER));
  });

  test('every env input set to the marker → marker absent (unset mode)', () => {
    const r = runCheck({ SHOP_MODE: '' });
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.stdout}\n${r.stderr}`);
    assert.doesNotMatch(r.stdout, new RegExp(MARKER));
    assert.doesNotMatch(r.stderr, new RegExp(MARKER));
  });

  test('marker in SHOP_MODE itself → unknown mode, marker still absent', () => {
    const r = runCheck({ SHOP_MODE: MARKER });
    assert.notEqual(r.status, 0);
    assert.doesNotMatch(r.stdout, new RegExp(MARKER));
    assert.doesNotMatch(r.stderr, new RegExp(MARKER));
  });
});

describe('docs/inputs.md matches the registry', () => {
  test('generated output is byte-identical to the committed file', () => {
    const committed = readFileSync(new URL('../docs/inputs.md', import.meta.url), 'utf8');
    assert.equal(
      renderDocs(INPUTS),
      committed,
      'docs/inputs.md is stale — run: npm run inputs:docs'
    );
  });

  test('the generated doc holds no values, only names', () => {
    const doc = renderDocs(INPUTS);
    assert.match(doc, /PLIK GENEROWANY/);
    assert.doesNotMatch(doc, /\bhydraarms\.pl\/\S/);
  });
});

describe('registry invariants', () => {
  test('names are unique', () => {
    const names = INPUTS.map((i) => i.name);
    assert.equal(new Set(names).size, names.length);
  });

  test('every input says where it is used', () => {
    for (const i of INPUTS) {
      assert.ok(i.usedIn.length > 0, `${i.name} has no usedIn`);
      for (const u of i.usedIn) assert.ok(u.length > 0, `${i.name} has an empty usedIn entry`);
    }
  });

  test('provisional inputs are not yet read anywhere in code', () => {
    for (const i of INPUTS.filter((x) => x.provisional)) {
      assert.ok(
        i.usedIn.every((u) => u.startsWith('not yet —')),
        `${i.name} is provisional but claims a real usage path`
      );
    }
  });

  test('the starter entries required by HA-2.16 are present', () => {
    const required = [
      'P24_MERCHANT_ID',
      'P24_POS_ID',
      'P24_CRC_KEY',
      'P24_API_KEY',
      'P24_NOTIFY_ALLOWED_IPS',
      'BASELINKER_MARKUP_KOLBA',
      'BASELINKER_MARKUP_SHARG',
      'BASELINKER_MARKUP_SPECHURT',
      'SHIPPING_PRICE_DHL',
      'SHIPPING_PRICE_DPD',
      'SHIPPING_PRICE_INPOST',
      'FREE_SHIPPING_THRESHOLD',
      'SITE_URL',
      'ORDER_LINK_SECRET',
    ];
    const names = new Set(INPUTS.map((i) => i.name));
    for (const r of required) assert.ok(names.has(r), `missing starter input: ${r}`);
  });

  test('known secrets carry the secret flag', () => {
    for (const name of ['P24_CRC_KEY', 'P24_API_KEY', 'ORDER_LINK_SECRET']) {
      const i = INPUTS.find((x) => x.name === name);
      assert.ok(i, `${name} not in registry`);
      assert.equal(i.secret, true, `${name} is not flagged secret`);
    }
  });
});
