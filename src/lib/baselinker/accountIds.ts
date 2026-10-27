/**
 * Pure helpers for scripts/bl-account-ids.ts (HA-2.26).
 *
 * Match the account's price groups / order sources / order statuses to the
 * BASELINKER_* variables by the names documented in .env.local.example and
 * render lines for .env.local. A variable gets an id only on exactly one name
 * match (case- and whitespace-insensitive, otherwise exact) — no fuzzy
 * matching: a missing or duplicated name is reported, never guessed.
 *
 * No I/O here — see xml-integration/__tests__/bl-account-ids.test.ts.
 */

import type { BLOrderStatus } from './types';

export interface BLPriceGroup {
  price_group_id: number;
  name: string;
  description?: string;
  currency?: string;
  is_default?: boolean;
}

/** getOrderSources: type → { id: name }; BL returns a plain list for some types (e.g. order_return). */
export type BLOrderSources = Record<string, Record<string, string> | string[]>;

export type AccountIdKind = 'priceGroup' | 'orderSource' | 'status';

export interface AccountEntry {
  id: string;
  name: string;
  /** Extra column for the listing: currency, source type, … */
  detail?: string;
}

export const KIND_LABEL: Record<AccountIdKind, string> = {
  priceGroup: 'price group',
  orderSource: 'order source',
  status: 'order status',
};

/** Variable ← expected name on the account; names come from .env.local.example. */
export const EXPECTED_ACCOUNT_IDS: ReadonlyArray<{ variable: string; kind: AccountIdKind; name: string }> = [
  { variable: 'BASELINKER_PRICE_GROUP', kind: 'priceGroup', name: 'Cena sprzedaży' },
  { variable: 'BASELINKER_PRICE_GROUP_PURCHASE', kind: 'priceGroup', name: 'Cena zakupu' },
  // HA-2.39: each supplier's own purchase price (xml-integration/shared-pricing.ts PURCHASE_GROUP_NAME)
  { variable: 'BASELINKER_PRICE_GROUP_PURCHASE_KOLBA', kind: 'priceGroup', name: 'Zakup Kolba' },
  { variable: 'BASELINKER_PRICE_GROUP_PURCHASE_SHARG', kind: 'priceGroup', name: 'Zakup Sharg' },
  { variable: 'BASELINKER_PRICE_GROUP_PURCHASE_SPECHURT', kind: 'priceGroup', name: 'Zakup Spechurt' },
  { variable: 'BASELINKER_ORDER_SOURCE_ID', kind: 'orderSource', name: 'Sklep internetowy' },
  { variable: 'BASELINKER_STATUS_PAID', kind: 'status', name: 'Opłacone' },
  { variable: 'BASELINKER_STATUS_PROCESSING', kind: 'status', name: 'W realizacji' },
  { variable: 'BASELINKER_STATUS_SHIPPED', kind: 'status', name: 'Wysłane' },
  { variable: 'BASELINKER_STATUS_DELIVERED', kind: 'status', name: 'Dostarczone' },
  { variable: 'BASELINKER_STATUS_CANCELLED', kind: 'status', name: 'Anulowane' },
  { variable: 'BASELINKER_STATUS_RETURN', kind: 'status', name: 'Zwrot' },
];

export interface EnvLine {
  variable: string;
  kind: AccountIdKind;
  expectedName: string;
  /** Entries whose name matches: exactly one → found, none → missing, several → ambiguous. */
  matches: AccountEntry[];
}

const normName = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl');

export function priceGroupEntries(groups: readonly BLPriceGroup[]): AccountEntry[] {
  return groups.map((g) => ({
    id: String(g.price_group_id),
    name: g.name,
    detail: [g.currency, g.is_default ? 'default' : ''].filter(Boolean).join(' '),
  }));
}

export function orderSourceEntries(sources: BLOrderSources): AccountEntry[] {
  const out: AccountEntry[] = [];
  for (const [type, byId] of Object.entries(sources)) {
    for (const [id, name] of Object.entries(byId)) {
      out.push({ id, name: String(name), detail: type });
    }
  }
  return out;
}

export function statusEntries(statuses: readonly BLOrderStatus[]): AccountEntry[] {
  return statuses.map((s) => ({ id: String(s.id), name: s.name }));
}

export function resolveEnvLines(entries: Record<AccountIdKind, readonly AccountEntry[]>): EnvLine[] {
  return EXPECTED_ACCOUNT_IDS.map(({ variable, kind, name }) => ({
    variable,
    kind,
    expectedName: name,
    matches: entries[kind].filter((e) => normName(e.name) === normName(name)),
  }));
}

/** A line to paste into .env.local, or a commented-out line saying what to create in the BL panel. */
export function formatEnvLine(line: EnvLine): string {
  const label = KIND_LABEL[line.kind];
  if (line.matches.length === 1) {
    return `${line.variable}=${line.matches[0].id}  # "${line.matches[0].name}"`;
  }
  if (line.matches.length === 0) {
    return `# ${line.variable}=  ← MISSING: no ${label} named "${line.expectedName}"`;
  }
  const ids = line.matches.map((m) => m.id).join(', ');
  return `# ${line.variable}=  ← AMBIGUOUS: ${line.matches.length} ${label} entries named "${line.expectedName}" (ids ${ids})`;
}

export function unresolvedCount(lines: readonly EnvLine[]): number {
  return lines.filter((l) => l.matches.length !== 1).length;
}
