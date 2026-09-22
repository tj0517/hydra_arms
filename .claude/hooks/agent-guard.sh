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

# Normalised copy: collapse repeated slashes (scripts//x.ts -> scripts/x.ts)
# for path-substring matching. Only used where slash-collapsing is safe.
NORM_CMD="$(printf '%s' "$CMD" | sed -E 's#/+#/#g')"

# Left/right boundaries for matching a bare filename as its own shell word
# (e.g. after `cd scripts &&`), not as part of a longer token.
BOUND_L='(^|[/[:space:]"'"'"'`;&|=])'
BOUND_R='([[:space:]"'"'"'`;&|]|$)'

# --- Bypass-attempt detection (always blocks, unlocked or not) ------------
if printf '%s' "$CMD" | grep -Eq '(^|[;&|[:space:]])(export[[:space:]]+)?HA_ALLOW_PROD[[:space:]]*=|(^|[;&|[:space:]])env([[:space:]]+[A-Za-z0-9_]+=[^[:space:]]*)*[[:space:]]+HA_ALLOW_PROD='; then
  deny "agent-guard: blocked — HA_ALLOW_PROD referenced inline in a command is treated as a bypass attempt. Unlock only by starting the session itself with: HA_ALLOW_PROD=1 claude"
fi

# Inline SUPABASE_TARGET=local is also a bypass attempt — same rule as HA_ALLOW_PROD.
# Only =local is the unlock value; other SUPABASE_TARGET values are not unlock paths.
if printf '%s' "$CMD" | grep -Eq '(^|[;&|[:space:]])(export[[:space:]]+)?SUPABASE_TARGET[[:space:]]*=[[:space:]]*local([[:space:]]|$|[;&|])|(^|[;&|[:space:]])env([[:space:]]+[A-Za-z0-9_]+=[^[:space:]]*)*[[:space:]]+SUPABASE_TARGET=local([[:space:]]|$|[;&|])'; then
  deny "agent-guard: blocked — SUPABASE_TARGET=local set inline is treated as a bypass attempt. Unlock only by starting the session itself with: SUPABASE_TARGET=local claude"
fi

IS_UNLOCKED=false
if [ -n "${HA_ALLOW_PROD:-}" ]; then
  IS_UNLOCKED=true
fi

IS_LOCAL=false
if [ "${SUPABASE_TARGET:-}" = "local" ]; then
  IS_LOCAL=true
fi

# --- Test runners: separate unlock via SUPABASE_TARGET=local --------------
# Block-only: must NEVER short-circuit to allow(), since a compound command
# like `npm test; npx tsx scripts/reset-shop-db.ts` has to keep falling
# through to the checks below even when the test part is fine.
if printf '%s' "$CMD" | grep -Eq '(^|[;&|[:space:]])playwright[[:space:]]+test([[:space:]]|$)|(^|[;&|[:space:]])npm[[:space:]]+test\b|(^|[;&|[:space:]])npm[[:space:]]+run[[:space:]]+test'; then
  if [ "${SUPABASE_TARGET:-}" != "local" ]; then
    deny "agent-guard: blocked — test run (playwright test / npm test / npm run test*) can hit prod. Set SUPABASE_TARGET=local in the session environment to run tests, or use HA_ALLOW_PROD=1 claude if you deliberately mean prod."
  fi
fi

if [ "$IS_UNLOCKED" = true ]; then
  allow
fi

# --- Writing scripts (path form, bare filename after cd, or glob) ---------
for name in "${WRITE_SCRIPTS[@]}"; do
  # scripts/<name> as a path substring (npx tsx scripts/x.ts, ./scripts/x.ts,
  # web/scripts/x.ts, absolute paths, scripts//x.ts normalised to scripts/x.ts)
  if printf '%s' "$NORM_CMD" | grep -qF "scripts/$name"; then
    deny "agent-guard: blocked — scripts/$name writes to prod (Supabase/BaseLinker/Sanity). Unlock deliberately: HA_ALLOW_PROD=1 claude"
  fi
  # Bare filename as its own word (e.g. `cd scripts && npx tsx reset-shop-db.ts`)
  escaped_name="$(printf '%s' "$name" | sed 's/\./\\./g')"
  if printf '%s' "$CMD" | grep -Eq "${BOUND_L}${escaped_name}${BOUND_R}"; then
    deny "agent-guard: blocked — $name writes to prod (Supabase/BaseLinker/Sanity), invoked without a scripts/ prefix (e.g. after cd). Unlock deliberately: HA_ALLOW_PROD=1 claude"
  fi
done

# Any runner (tsx, ts-node, node, npx tsx, npm run) invoked on a glob path
# under scripts/ — block conservatively, it could expand to a writing script.
if printf '%s' "$NORM_CMD" | grep -Eq '(^|[;&|[:space:]])(npx[[:space:]]+tsx|tsx|ts-node|node|npm[[:space:]]+run)[[:space:]]' \
   && printf '%s' "$NORM_CMD" | grep -Eq 'scripts/[^[:space:]"'"'"']*[*?\[][^[:space:]"'"'"']*'; then
  deny "agent-guard: blocked — runner invoked on a glob path under scripts/ (e.g. scripts/reset-*.ts) — could expand to a writing script. Unlock deliberately: HA_ALLOW_PROD=1 claude"
fi

# --- supabase db push / migration repair -----------------------------------
if printf '%s' "$CMD" | grep -Eq '(^|[;&|[:space:]])supabase[[:space:]]+db[[:space:]]+push([[:space:]]|$)'; then
  deny "agent-guard: blocked — 'supabase db push' writes to prod schema. Unlock deliberately: HA_ALLOW_PROD=1 claude"
fi
if printf '%s' "$CMD" | grep -Eq '(^|[;&|[:space:]])supabase[[:space:]]+migration[[:space:]]+repair([[:space:]]|$)'; then
  deny "agent-guard: blocked — 'supabase migration repair' mutates prod migration history. Unlock deliberately: HA_ALLOW_PROD=1 claude"
fi

# --- psql / raw SQL with DDL or DML -----------------------------------------
# Both the psql check and the DDL/DML scanner run on SCAN_CMD — a version of
# the command with git commit and gh pr/issue message text stripped — so English
# words like "psql", "grant", "revoke" in commit message bodies don't trigger
# the checks (HA-1.11 false-alarm fix). Local exception: psql and DDL against
# an explicit local host (127.0.0.1 or localhost, not subdomains) are allowed
# when SUPABASE_TARGET=local is in the session env. Compound commands fall
# through to all remaining checks regardless.
#
# Multi-line commands are flattened first (tr '\n' ' ') so a heredoc -m
# argument is stripped in a single pass rather than line by line.
#
# SAFETY: if a -m/--body/--title argument contains a non-heredoc command
# substitution ($(...) other than $(cat <<) or a backtick), do NOT strip —
# scan the full command so injection attempts are caught.
FLAT_CMD="$(printf '%s' "$CMD" | tr '\n' ' ')"

_unsafe_subst=false
if printf '%s' "$FLAT_CMD" | grep -Eq 'git[[:space:]]+commit'; then
  if printf '%s' "$FLAT_CMD" | grep -Eq '(-m[[:space:]]+|--message[[:space:]]+|--message=)"[^"]*(`|\$\()'; then
    if ! printf '%s' "$FLAT_CMD" | grep -Eq '(-m[[:space:]]+|--message[[:space:]]+|--message=)"[^"]*\$\(cat[[:space:]]+<<'; then
      _unsafe_subst=true
    fi
  fi
fi
if printf '%s' "$FLAT_CMD" | grep -Eq 'gh[[:space:]]+(pr|issue)'; then
  if printf '%s' "$FLAT_CMD" | grep -Eq '(--(body|title)[[:space:]]+|--(body|title)=)"[^"]*(`|\$\()'; then
    if ! printf '%s' "$FLAT_CMD" | grep -Eq '(--(body|title)[[:space:]]+|--(body|title)=)"[^"]*\$\(cat[[:space:]]+<<'; then
      _unsafe_subst=true
    fi
  fi
fi

if [ "$_unsafe_subst" = true ]; then
  SCAN_CMD="$FLAT_CMD"
else
  # The heredoc rules (with .*) must come first so that commit message bodies
  # containing double-quoted words don't fool the simpler [^"]* rules below.
  SCAN_CMD="$(printf '%s' "$FLAT_CMD" | sed -E \
    -e 's/(-m[[:space:]]+|--message[[:space:]]+|--message=)"[^"]*\$\(cat[[:space:]]+<<.* EOF[[:space:]]*\)"/\1"STRIPPED"/g' \
    -e 's/(-m[[:space:]]+|--message[[:space:]]+|--message=)"[^"]*"/\1"STRIPPED"/g' \
    -e 's/(-m[[:space:]]+|--message[[:space:]]+|--message=)'"'"'[^'"'"']*'"'"'/\1'"'"'STRIPPED'"'"'/g' \
    -e 's/(--body[[:space:]]+|--body=|--title[[:space:]]+|--title=)"[^"]*\$\(cat[[:space:]]+<<.* EOF[[:space:]]*\)"/\1"STRIPPED"/g' \
    -e 's/(--body[[:space:]]+|--body=|--title[[:space:]]+|--title=)"[^"]*"/\1"STRIPPED"/g' \
    -e 's/(--body[[:space:]]+|--body=|--title[[:space:]]+|--title=)'"'"'[^'"'"']*'"'"'/\1'"'"'STRIPPED'"'"'/g')"
fi

if printf '%s' "$SCAN_CMD" | grep -Eq '(^|[;&|[:space:]])psql([[:space:]]|$)'; then
  if [ "$IS_LOCAL" = true ] \
     && printf '%s' "$CMD" | grep -Eq '(127\.0\.0\.1|localhost($|[^.[:alnum:]]))' \
     && ! printf '%s' "$CMD" | grep -Eq '(supabase\.co|breqmmlcaxsvxcqlcmqc|--linked)'; then
    : # local exception — falls through to remaining checks
  else
    deny "agent-guard: blocked — psql can run arbitrary SQL against prod. Set SUPABASE_TARGET=local in the session environment and use an explicit local host (127.0.0.1 or localhost) to allow local DB work. Unlock deliberately: HA_ALLOW_PROD=1 claude"
  fi
fi

if printf '%s' "$SCAN_CMD" | grep -Eqi '\b(insert[[:space:]]+into|update[[:space:]]+[a-z_."]+[[:space:]]+set|delete[[:space:]]+from|drop[[:space:]]+(table|database|schema|index)|alter[[:space:]]+(table|database|schema)|truncate([[:space:]]+table)?|create[[:space:]]+(table|database|schema)|grant[[:space:]]|revoke[[:space:]])\b'; then
  if [ "$IS_LOCAL" = true ] \
     && printf '%s' "$CMD" | grep -Eq '(127\.0\.0\.1|localhost($|[^.[:alnum:]]))' \
     && ! printf '%s' "$CMD" | grep -Eq '(supabase\.co|breqmmlcaxsvxcqlcmqc|--linked)'; then
    : # local exception — DDL/DML against local DB is allowed
  else
    deny "agent-guard: blocked — command contains SQL DDL/DML against prod. Unlock deliberately: HA_ALLOW_PROD=1 claude"
  fi
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
