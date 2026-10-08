/**
 * Pure check + docs logic for the input registry (HA-2.16).
 *
 * Every function here takes the registry as an argument, so tests can feed a
 * fixture instead of the real list. Nothing in this file reads process.env for
 * a registry input, and nothing prints a value — not even the raw SHOP_MODE,
 * which is why an unknown mode is reported without echoing what was set.
 */

import type { InputEntry, InputStatus } from './inputs.js';

/** Shop mode. `dev` is the absence of SHOP_MODE, not a value you can set. */
export type ShopMode = 'live' | 'verification' | 'dev';

/** Values SHOP_MODE may carry. Anything else is an error, including `Live`. */
export const SHOP_MODE_VALUES = ['live', 'verification'] as const;

export type ModeResult =
  | { ok: true; mode: ShopMode }
  | { ok: false };

/**
 * Closed list, decided by tj 2026-10-08: `live`, `verification`, or unset (= dev).
 * Case-sensitive — `Live` and `production` are errors, not synonyms.
 * An empty string counts as unset (that is what `SHOP_MODE=` in an env file gives).
 */
export function parseShopMode(raw: string | undefined): ModeResult {
  if (raw === undefined || raw === '') return { ok: true, mode: 'dev' };
  if (raw === 'live') return { ok: true, mode: 'live' };
  if (raw === 'verification') return { ok: true, mode: 'verification' };
  return { ok: false };
}

export interface CheckResult {
  /** 0 = pass, 1 = live mode with placeholders, 2 = unknown SHOP_MODE. */
  exitCode: number;
  /** null when SHOP_MODE could not be parsed. */
  mode: ShopMode | null;
  /** Names of inputs still marked placeholder (all modes). */
  placeholders: string[];
  stdout: string[];
  stderr: string[];
}

function describeMode(mode: ShopMode): string {
  return mode === 'dev' ? 'dev (SHOP_MODE unset)' : `${mode} (SHOP_MODE=${mode})`;
}

function count(inputs: readonly InputEntry[], status: InputStatus): number {
  return inputs.filter((i) => i.status === status).length;
}

/** Fixed-width table of name / status / owner / O-xx. Never any value. */
export function renderTable(inputs: readonly InputEntry[]): string[] {
  const head = ['NAME', 'STATUS', 'OWNER', 'QUESTION'];
  const rows = inputs.map((i) => [i.name, i.status, i.owner, i.question ?? '—']);
  const widths = head.map((h, c) =>
    Math.max(h.length, ...rows.map((r) => r[c].length))
  );
  const line = (cells: string[]) =>
    cells.map((c, idx) => (idx === cells.length - 1 ? c : c.padEnd(widths[idx]))).join('  ');
  return [line(head), ...rows.map(line)];
}

/**
 * The guard. Pure: registry + raw SHOP_MODE in, lines and an exit code out.
 * Only `live` blocks on placeholders.
 */
export function checkInputs(
  inputs: readonly InputEntry[],
  rawMode: string | undefined
): CheckResult {
  const parsed = parseShopMode(rawMode);
  const placeholders = inputs.filter((i) => i.status === 'placeholder').map((i) => i.name);

  if (!parsed.ok) {
    return {
      exitCode: 2,
      mode: null,
      placeholders,
      stdout: [],
      stderr: [
        '✖ SHOP_MODE has an unknown value.',
        `  Allowed: ${SHOP_MODE_VALUES.join(', ')}, or unset (= dev). Case-sensitive.`,
        '  The value you set is not printed — this command never echoes environment values.',
      ],
    };
  }

  const mode = parsed.mode;
  const stdout = [
    'Input registry — HA-2.16 (metadata only; no values are read or printed)',
    `mode: ${describeMode(mode)}`,
    '',
    ...renderTable(inputs),
    '',
    `${inputs.length} inputs: ${count(inputs, 'placeholder')} placeholder, ${count(inputs, 'confirmed')} confirmed`,
  ];

  if (placeholders.length === 0) {
    stdout.push('✓ every input is confirmed.');
    return { exitCode: 0, mode, placeholders, stdout, stderr: [] };
  }

  if (mode !== 'live') {
    stdout.push(
      `✓ ${mode} mode — placeholders do not block (${placeholders.length} still open).`
    );
    return { exitCode: 0, mode, placeholders, stdout, stderr: [] };
  }

  const stderr = [
    `✖ live mode blocked — ${placeholders.length} input(s) still marked placeholder:`,
    ...inputs
      .filter((i) => i.status === 'placeholder')
      .map((i) => `  - ${i.name} (owner: ${i.owner}${i.question ? `, ${i.question}` : ''}, ${i.task})`),
    "  Confirm each value with its owner, then set status: 'confirmed' in config/inputs.ts.",
  ];
  return { exitCode: 1, mode, placeholders, stdout, stderr };
}

/** docs/inputs.md — generated from the registry. Keep in sync: npm run inputs:docs */
export function renderDocs(inputs: readonly InputEntry[]): string {
  const open = inputs.filter((i) => i.status === 'placeholder');
  const done = inputs.filter((i) => i.status === 'confirmed');

  const row = (i: InputEntry) =>
    `| \`${i.name}\`${i.provisional ? ' ⟨nazwa wstępna⟩' : ''} | ${i.owner} | ${i.question ?? '—'} | ${i.task} | ${i.usedIn.map((u) => (u.startsWith('not yet') ? u.replace('not yet —', 'jeszcze nie —') : `\`${u}\``)).join('<br>')} | ${i.secret ? 'tak' : 'nie'} |`;

  const header = [
    '| nazwa | właściciel | pytanie | zadanie | gdzie użyte | sekret |',
    '|---|---|---|---|---|---|',
  ];

  const lines: string[] = [
    '# Inputy — co jeszcze trzeba dostarczyć',
    '',
    '<!-- PLIK GENEROWANY z config/inputs.ts — nie edytuj ręcznie.',
    '     Regeneracja: npm run inputs:docs · sprawdzenie: npm run inputs:check -->',
    '',
    'Rejestr trzyma wyłącznie metadane — żadnych wartości (HA-2.16). Statusy:',
    '`placeholder` = wartość nieustalona, `confirmed` = ustalona i można ruszać na produkcję.',
    'Start sprzedaży (HA-2.09) z `SHOP_MODE=live` nie przejdzie, dopóki jakikolwiek input jest',
    '`placeholder`. `⟨nazwa wstępna⟩` = nazwa jeszcze nie istnieje w kodzie; zadanie właściciela',
    'może ją zmienić.',
    '',
    `## Do dostarczenia (${open.length})`,
    '',
  ];

  if (open.length === 0) {
    lines.push('Nic — wszystkie inputy potwierdzone.', '');
  } else {
    lines.push(...header, ...open.map(row), '');
  }

  lines.push(`## Potwierdzone (${done.length})`, '');
  if (done.length === 0) {
    lines.push('Nic jeszcze.', '');
  } else {
    lines.push(...header, ...done.map(row), '');
  }

  lines.push('## Uwagi', '');
  for (const i of inputs) {
    if (i.note) lines.push(`- \`${i.name}\` — ${i.note}`);
  }
  lines.push('');

  return lines.join('\n');
}
