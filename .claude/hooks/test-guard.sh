#!/usr/bin/env bash
# Unit test for .claude/hooks/agent-guard.sh — feeds it sample PreToolUse
# inputs and asserts allowed/blocked. Run: bash .claude/hooks/test-guard.sh
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK="$SCRIPT_DIR/agent-guard.sh"

PASS=0
FAIL=0

# run_case NAME EXPECTED(allow|block) [ENV_ASSIGNMENTS...] -- COMMAND
run_case() {
  local name="$1" expected="$2" command="$3"
  shift 3
  local env_args=("$@")

  local output
  output="$(env ${env_args[@]+"${env_args[@]}"} bash -c 'printf "%s" "$1" | "$2"' _ \
    "$(printf '{"tool_name":"Bash","tool_input":{"command":%s}}' "$(jq -Rs . <<<"$command")")" \
    "$HOOK")"

  local decision="allow"
  if printf '%s' "$output" | grep -q '"permissionDecision":"deny"'; then
    decision="block"
  fi

  if [ "$decision" = "$expected" ]; then
    PASS=$((PASS + 1))
    printf 'OK   %-55s [%s]\n' "$name" "$expected"
  else
    FAIL=$((FAIL + 1))
    printf 'FAIL %-55s expected=%s got=%s\n     cmd: %s\n     out: %s\n' \
      "$name" "$expected" "$decision" "$command" "$output"
  fi
}

run_raw_case() {
  local name="$1" expected="$2" raw_stdin="$3"
  local output
  output="$(printf '%s' "$raw_stdin" | "$HOOK")"
  local decision="allow"
  if printf '%s' "$output" | grep -q '"permissionDecision":"deny"'; then
    decision="block"
  fi
  if [ "$decision" = "$expected" ]; then
    PASS=$((PASS + 1))
    printf 'OK   %-55s [%s]\n' "$name" "$expected"
  else
    FAIL=$((FAIL + 1))
    printf 'FAIL %-55s expected=%s got=%s\n     out: %s\n' "$name" "$expected" "$decision" "$output"
  fi
}

echo "=== read-only commands (from acceptance criteria) — must allow ==="
run_case "npm run lint"                       allow "npm run lint"
run_case "git status"                         allow "git status"
run_case "check-db.ts (read-only script)"     allow "npx tsx scripts/check-db.ts"
run_case "baselinker-explore.ts (BL read)"    allow "npx tsx scripts/baselinker-explore.ts"
run_case "bl-diag.ts (BL read)"               allow "npx tsx scripts/bl-diag.ts"
run_case "export-csv.ts (reads, local file)"  allow "npx tsx scripts/export-csv.ts"
run_case "xml-check.ts (zero writes)"         allow "npx tsx scripts/xml-check.ts kolba"
run_case "xml-export-bl.ts (local CSV only)"  allow "npx tsx scripts/xml-export-bl.ts kolba"

echo "=== writing scripts — path variants, VAR= prefixes, runners ==="
for script in baselinker-sync.ts bl-build-categories.ts bl-copy-prices.ts bl-test.ts \
              cleanup-products.ts patch-homepage-fields.ts rebuild-categories.ts \
              remap-categories.ts reset-shop-db.ts sanity-seed.ts seed-categories.ts \
              seed-products.ts supabase-to-baselinker.ts xml-to-baselinker.ts; do
  run_case "npx tsx scripts/$script"            block "npx tsx scripts/$script"
  run_case "tsx scripts/$script"                block "tsx scripts/$script"
  run_case "node scripts/$script"               block "node scripts/$script"
  run_case "./scripts/$script"                  block "./scripts/$script"
  run_case "web/scripts/$script"                block "npx tsx web/scripts/$script"
  run_case "absolute path $script"              block "npx tsx /Users/tj/Desktop/hydra_arms/web/scripts/$script"
  run_case "VAR= prefix before $script"         block "SUPABASE_SERVICE_ROLE_KEY=invalid npx tsx scripts/$script"
  run_case "multiple VAR= prefixes $script"     block "FOO=1 BAR=2 npx tsx scripts/$script"
done

echo "=== supabase / psql / vercel / git push --force ==="
run_case "supabase db push"                    block "supabase db push"
run_case "supabase migration repair"           block "supabase migration repair"
run_case "psql direct"                         block "psql \"\$DATABASE_URL\" -c 'select 1'"
run_case "raw SQL INSERT"                      block "echo \"INSERT INTO shop_products VALUES (1)\" | psql \$DB"
run_case "raw SQL DROP TABLE"                  block "some-tool --sql 'DROP TABLE shop_products'"
run_case "vercel env pull"                     block "vercel env pull"
run_case "git push --force"                    block "git push --force origin main"
run_case "git push -f"                         block "git push -f origin main"
run_case "git push origin main (no force)"     allow "git push origin main"

echo "=== inline HA_ALLOW_PROD bypass attempt — always blocked ==="
run_case "inline HA_ALLOW_PROD= before script" block "HA_ALLOW_PROD=1 npx tsx scripts/reset-shop-db.ts"
run_case "export HA_ALLOW_PROD"                block "export HA_ALLOW_PROD=1 && npx tsx scripts/reset-shop-db.ts"
run_case "env HA_ALLOW_PROD=1 prefix"          block "env HA_ALLOW_PROD=1 npx tsx scripts/reset-shop-db.ts"
output="$(HA_ALLOW_PROD=1 bash -c 'printf "%s" "$1" | "$2"' _ \
  '{"tool_name":"Bash","tool_input":{"command":"HA_ALLOW_PROD=1 npx tsx scripts/reset-shop-db.ts"}}' "$HOOK")"
if printf '%s' "$output" | grep -q '"permissionDecision":"deny"'; then
  PASS=$((PASS + 1)); printf 'OK   %-55s [block]\n' "inline HA_ALLOW_PROD wins even in unlocked session"
else
  FAIL=$((FAIL + 1)); printf 'FAIL %-55s expected=block got=allow\n' "inline HA_ALLOW_PROD wins even in unlocked session"
fi

echo "=== HA_ALLOW_PROD unlock (session env only) ==="
output="$(HA_ALLOW_PROD=1 bash -c 'printf "%s" "$1" | "$2"' _ \
  '{"tool_name":"Bash","tool_input":{"command":"npx tsx scripts/reset-shop-db.ts"}}' "$HOOK")"
if printf '%s' "$output" | grep -q '"permissionDecision":"deny"'; then
  FAIL=$((FAIL + 1)); printf 'FAIL %-55s expected=allow got=block\n' "unlocked session allows writing script"
else
  PASS=$((PASS + 1)); printf 'OK   %-55s [allow]\n' "unlocked session allows writing script"
fi
output="$(HA_ALLOW_PROD=1 bash -c 'printf "%s" "$1" | "$2"' _ \
  '{"tool_name":"Bash","tool_input":{"command":"supabase db push"}}' "$HOOK")"
if printf '%s' "$output" | grep -q '"permissionDecision":"deny"'; then
  FAIL=$((FAIL + 1)); printf 'FAIL %-55s expected=allow got=block\n' "unlocked session allows supabase db push"
else
  PASS=$((PASS + 1)); printf 'OK   %-55s [allow]\n' "unlocked session allows supabase db push"
fi

echo "=== test runners — SUPABASE_TARGET=local unlock (independent of HA_ALLOW_PROD) ==="
run_case "playwright test (no SUPABASE_TARGET)"        block "playwright test"
run_case "npm test (no SUPABASE_TARGET)"                block "npm test"
run_case "npm run test:shop (no SUPABASE_TARGET)"       block "npm run test:shop"
run_case "playwright test with SUPABASE_TARGET=local"   allow "playwright test" SUPABASE_TARGET=local
run_case "npm test with SUPABASE_TARGET=local"          allow "npm test" SUPABASE_TARGET=local
run_case "npm run test:shop w/ SUPABASE_TARGET=local"   allow "npm run test:shop" SUPABASE_TARGET=local
run_case "npm run lint is not a test run"                allow "npm run lint"

echo "=== malformed input — fail closed ==="
run_raw_case "not JSON at all"                 block "this is not json"
run_raw_case "empty input"                     block ""
run_raw_case "JSON missing tool_name"          block '{"tool_input":{"command":"git status"}}'
run_raw_case "Bash tool with no command field" block '{"tool_name":"Bash","tool_input":{}}'
run_raw_case "non-Bash tool passes through"    allow '{"tool_name":"Read","tool_input":{"file_path":"/tmp/x"}}'

echo
echo "===================================="
echo "PASS: $PASS  FAIL: $FAIL"
echo "===================================="
[ "$FAIL" -eq 0 ]
