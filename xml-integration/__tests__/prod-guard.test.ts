/**
 * Red proof: assertExternalProd refuses without HA_ALLOW_PROD=1.
 * Verifies that import and sync modes are gated — dry-run is not.
 *
 * Runner: npx tsx --test xml-integration/__tests__/prod-guard.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';

function runGuard(withAllowProd: boolean): { exitCode: number; output: string } {
  const env = { ...process.env, HA_ALLOW_PROD: withAllowProd ? '1' : '' };
  const script = `
    const { assertExternalProd } = await import('./scripts/lib/prodGuard.ts');
    try {
      assertExternalProd('BaseLinker');
      process.stdout.write('[prod-guard] ALLOWED\\n');
    } catch (e) {
      process.stderr.write(e.message + '\\n');
      process.exit(1);
    }
  `;
  try {
    const out = execSync(`npx tsx --input-type=module`, {
      env,
      cwd: process.cwd(),
      input: script,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { exitCode: 0, output: out };
  } catch (e: any) {
    return { exitCode: e.status ?? 1, output: (e.stdout ?? '') + (e.stderr ?? '') };
  }
}

test('prod-guard: assertExternalProd throws without HA_ALLOW_PROD (import/sync refused)', () => {
  const { exitCode, output } = runGuard(false);
  assert.equal(exitCode, 1, 'process must exit with code 1');
  assert.ok(
    output.includes('[prod-guard] Refused'),
    `Expected "[prod-guard] Refused" in stderr; got:\n${output}`,
  );
  assert.ok(
    output.includes('HA_ALLOW_PROD=1'),
    'Error message must mention HA_ALLOW_PROD=1',
  );
});

test('prod-guard: assertExternalProd warns but continues with HA_ALLOW_PROD=1', () => {
  const { exitCode, output } = runGuard(true);
  assert.equal(exitCode, 0, 'process must exit with code 0 when HA_ALLOW_PROD=1');
  assert.ok(
    output.includes('[prod-guard] ALLOWED') || output.includes('[prod-guard] WARNING'),
    `Expected allow/warning output; got:\n${output}`,
  );
});
