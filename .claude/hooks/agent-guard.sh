#!/usr/bin/env bash
# PreToolUse hook for Bash — blocks commands that could write to the
# production Supabase DB / BaseLinker / Sanity, or otherwise touch prod
# infra, before Claude Code runs them.
#
# Unlock: start the session with `HA_ALLOW_PROD=1 claude`. The hook only
# trusts HA_ALLOW_PROD from ITS OWN process environment (inherited from the
# session that launched claude) — a command that itself sets/exports/passes
# HA_ALLOW_PROD is treated as a bypass attempt and always blocked, even in
# an unlocked session.
#
# Fails closed: any parse failure blocks rather than allows.
set -u

# Scripts that write to prod Supabase, BaseLinker, or Sanity (see HA-1.04
# report for the read/write classification table).
WRITE_SCRIPTS=(
  "baselinker-sync.ts"
  "bl-build-categories.ts"
  "bl-copy-prices.ts"
  "bl-test.ts"
  "cleanup-products.ts"
  "patch-homepage-fields.ts"
  "rebuild-categories.ts"
  "remap-categories.ts"
  "reset-shop-db.ts"
  "sanity-seed.ts"
  "seed-categories.ts"
  "seed-products.ts"
  "supabase-to-baselinker.ts"
  "xml-to-baselinker.ts"
)

deny() {
  local reason="$1"
  # Escape for JSON string value.
  local escaped
  escaped=$(printf '%s' "$reason" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$escaped"
  exit 0
}

allow() {
  exit 0
}

INPUT="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  deny "agent-guard: jq not found, cannot verify this command is safe — blocked (fail closed). Install jq or unlock with HA_ALLOW_PROD=1 claude."
fi

if ! printf '%s' "$INPUT" | jq -e . >/dev/null 2>&1; then
  deny "agent-guard: could not parse hook input as JSON — blocked (fail closed)."
fi

TOOL_NAME="$(printf '%s' "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)"
if [ -z "$TOOL_NAME" ]; then
  deny "agent-guard: hook input missing tool_name — blocked (fail closed)."
fi

if [ "$TOOL_NAME" != "Bash" ]; then
  allow
fi

CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)"
if [ -z "$CMD" ]; then
  deny "agent-guard: Bash tool call with no command field — blocked (fail closed)."
fi

# --- Bypass-attempt detection (always blocks, unlocked or not) ------------
if printf '%s' "$CMD" | grep -Eq '(^|[;&|[:space:]])(export[[:space:]]+)?HA_ALLOW_PROD[[:space:]]*=|(^|[;&|[:space:]])env([[:space:]]+[A-Za-z0-9_]+=[^[:space:]]*)*[[:space:]]+HA_ALLOW_PROD='; then
  deny "agent-guard: blocked — HA_ALLOW_PROD referenced inline in a command is treated as a bypass attempt. Unlock only by starting the session itself with: HA_ALLOW_PROD=1 claude"
fi

IS_UNLOCKED=false
if [ -n "${HA_ALLOW_PROD:-}" ]; then
  IS_UNLOCKED=true
fi

# --- Test runners: separate unlock via SUPABASE_TARGET=local --------------
if printf '%s' "$CMD" | grep -Eq '(^|[;&|[:space:]])playwright[[:space:]]+test([[:space:]]|$)|(^|[;&|[:space:]])npm[[:space:]]+test\b|(^|[;&|[:space:]])npm[[:space:]]+run[[:space:]]+test'; then
  if [ "${SUPABASE_TARGET:-}" != "local" ]; then
    deny "agent-guard: blocked — test run (playwright test / npm test / npm run test*) can hit prod. Set SUPABASE_TARGET=local in the session environment to run tests, or use HA_ALLOW_PROD=1 claude if you deliberately mean prod."
  fi
  allow
fi

if [ "$IS_UNLOCKED" = true ]; then
  allow
fi

# --- Writing scripts/*.ts (any path form, any VAR= prefix, any runner) ----
for name in "${WRITE_SCRIPTS[@]}"; do
  if printf '%s' "$CMD" | grep -qF "scripts/$name"; then
    deny "agent-guard: blocked — scripts/$name writes to prod (Supabase/BaseLinker/Sanity). Unlock deliberately: HA_ALLOW_PROD=1 claude"
  fi
done

# --- supabase db push / migration repair -----------------------------------
if printf '%s' "$CMD" | grep -Eq '(^|[;&|[:space:]])supabase[[:space:]]+db[[:space:]]+push([[:space:]]|$)'; then
  deny "agent-guard: blocked — 'supabase db push' writes to prod schema. Unlock deliberately: HA_ALLOW_PROD=1 claude"
fi
if printf '%s' "$CMD" | grep -Eq '(^|[;&|[:space:]])supabase[[:space:]]+migration[[:space:]]+repair([[:space:]]|$)'; then
  deny "agent-guard: blocked — 'supabase migration repair' mutates prod migration history. Unlock deliberately: HA_ALLOW_PROD=1 claude"
fi

# --- psql / raw SQL with DDL or DML -----------------------------------------
if printf '%s' "$CMD" | grep -Eq '(^|[;&|[:space:]])psql([[:space:]]|$)'; then
  deny "agent-guard: blocked — psql can run arbitrary SQL against prod. Unlock deliberately: HA_ALLOW_PROD=1 claude"
fi
if printf '%s' "$CMD" | grep -Eqi '\b(insert[[:space:]]+into|update[[:space:]]+[a-z_."]+[[:space:]]+set|delete[[:space:]]+from|drop[[:space:]]+(table|database|schema|index)|alter[[:space:]]+(table|database|schema)|truncate([[:space:]]+table)?|create[[:space:]]+(table|database|schema)|grant[[:space:]]|revoke[[:space:]])\b'; then
  deny "agent-guard: blocked — command contains SQL DDL/DML against prod. Unlock deliberately: HA_ALLOW_PROD=1 claude"
fi

# --- vercel env --------------------------------------------------------------
if printf '%s' "$CMD" | grep -Eq '(^|[;&|[:space:]])vercel[[:space:]]+env([[:space:]]|$)'; then
  deny "agent-guard: blocked — 'vercel env' reads/writes prod environment variables. Unlock deliberately: HA_ALLOW_PROD=1 claude"
fi

# --- git push --force / -f ---------------------------------------------------
if printf '%s' "$CMD" | grep -Eq '(^|[;&|[:space:]])git[[:space:]]+push\b' \
   && printf '%s' "$CMD" | grep -Eq -- '--force(-with-lease)?([[:space:]]|=|$)|(^|[[:space:]])-[a-zA-Z]*f([[:space:]]|$)'; then
  deny "agent-guard: blocked — force-pushing can overwrite shared history. Unlock deliberately: HA_ALLOW_PROD=1 claude"
fi

allow
