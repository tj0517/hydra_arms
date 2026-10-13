#!/usr/bin/env bash
# Self-test of scripts/server/run-bl.sh (HA-2.15).
#
# Safe to run anywhere, including the import server: the wrapper is only ever called with
# --cmd (a stand-in command) or --check, against temporary directories. The import itself
# is never started and nothing outside the temporary directory is touched.
#
# Usage: bash scripts/server/test-run-bl.sh
# Exit code: 0 when every check passes, 1 otherwise.

set -u

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
W="$here/run-bl.sh"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
LOGS="$T/logs"

passed=0
failed=0
ok() { passed=$((passed + 1)); printf 'ok   - %s\n' "$1"; }
bad() { failed=$((failed + 1)); printf 'FAIL - %s\n       %s\n' "$1" "$2"; }
expect() { # description, expected, actual
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "expected: $2 | actual: $3"; fi
}
shown() { sed "s#$T#<tmp>#g" | cut -c1-200; }

# A test "repo root": an env file and an executable placeholder where tsx would be.
# The placeholder is never executed — every call below uses --cmd or --check.
mk_repo() { # name, env lines…
  local dir="$T/$1"
  shift
  mkdir -p "$dir/node_modules/.bin"
  printf '#!/bin/sh\nexit 0\n' > "$dir/node_modules/.bin/tsx"
  chmod +x "$dir/node_modules/.bin/tsx"
  printf '%s\n' "$@" > "$dir/.env.local"
  chmod 600 "$dir/.env.local"
}
mk_repo good 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID=119068'
mk_repo mock 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID=119068' 'BASELINKER_MOCK=true'
mk_repo inventory-empty 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID='
mk_repo inventory-absent 'BASELINKER_TOKEN=dummy'
mk_repo unlock 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID=119068' 'HA_ALLOW_PROD=1'
mk_repo no-tsx 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID=119068'
rm "$T/no-tsx/node_modules/.bin/tsx"
mkdir -p "$T/no-env" "$T/home-server" "$T/home-dev"
touch "$T/home-server/.hydra-import-server"

# Runs the wrapper with a test home and test repo root. Sets RC and LAST (last journal line).
CHECKS=0
run() { # home, repo, wrapper arguments…
  local home="$1" repo="$2"
  shift 2
  HOME="$T/$home" HYDRA_DIR="$T/$repo" HYDRA_LOG_DIR="$LOGS" HYDRA_STAND_IN_CHECKS="$CHECKS" \
    "$W" "$@" > "$T/out" 2>&1
  RC=$?
  LAST="$(cat "$LOGS"/run-bl-*.log 2>/dev/null | tail -n 1)"
}
run_logs() { find "$LOGS" -maxdepth 1 -name "$1" 2>/dev/null | wc -l | tr -d ' '; }

echo "# setup checks stop the command on the real run path (stand-in command, checks on)"
refused() { # description, home, repo, text expected in the journal line
  local before
  before="$(run_logs '*-import-*.log')"
  rm -f "$T/sentinel"
  CHECKS=1 run "$2" "$3" --cmd "touch '$T/sentinel'" sharg import
  CHECKS=0
  printf '       %s\n       exit=%s\n' "$(printf '%s' "$LAST" | shown)" "$RC"
  if [ "$RC" = "78" ] && [ ! -e "$T/sentinel" ] && [ "$(run_logs '*-import-*.log')" = "$before" ] \
     && printf '%s' "$LAST" | grep -q "ERROR.*$4"; then
    ok "$1 → refused, command not run"
  else
    bad "$1" "exit=$RC sentinel=$([ -e "$T/sentinel" ] && echo present || echo absent) line=$LAST"
  fi
}
refused "no server marker file" home-dev good 'not marked as the import server'
refused "BASELINKER_MOCK=true in the env file" home-server mock 'BASELINKER_MOCK=true'
refused "BASELINKER_INVENTORY_ID empty" home-server inventory-empty 'BASELINKER_INVENTORY_ID is not set'
refused "BASELINKER_INVENTORY_ID line absent" home-server inventory-absent 'BASELINKER_INVENTORY_ID is not set'
refused "production unlock stored in the env file" home-server unlock 'production unlock is stored'
refused "env file missing" home-server no-env '.env.local not found'
refused "tsx not installed" home-server no-tsx 'run npm ci'

rm -f "$T/sentinel"
CHECKS=1 run home-server good --cmd "touch '$T/sentinel'" sharg import
CHECKS=0
if [ "$RC" = "0" ] && [ -e "$T/sentinel" ]; then ok "control: complete setup → command runs"; else bad "control: complete setup" "exit=$RC line=$LAST"; fi

echo "# --check reports the same without running anything"
run home-dev good --check sharg import;               expect "--check, no marker → 78" 78 "$RC"
run home-server mock --check sharg import;            expect "--check, mock on → 78" 78 "$RC"
run home-server inventory-absent --check sharg import; expect "--check, no catalogue ID → 78" 78 "$RC"
run home-server unlock --check sharg import;          expect "--check, unlock in env file → 78" 78 "$RC"
before="$(run_logs '*-import-*.log')"
run home-server good --check sharg import;            expect "--check, complete setup → 0" 0 "$RC"
expect "--check creates no run log" "$before" "$(run_logs '*-import-*.log')"
chmod 644 "$T/good/.env.local"
run home-server good --check sharg import
if [ "$RC" = "0" ] && grep -q 'WARN.*has mode 644, expected 600' "$T/out"; then ok "--check warns when the env file is not mode 600"; else bad "env file mode warning" "exit=$RC out=$(cat "$T/out")"; fi
chmod 600 "$T/good/.env.local"

echo "# one run at a time"
run home-dev good --cmd 'sleep 3' sharg sync &
holder=$!
sleep 1
started="$(date +%s)"
run home-dev good --cmd 'sleep 3' sharg sync
took=$(( $(date +%s) - started ))
printf '       %s\n       exit=%s\n' "$(printf '%s' "$LAST" | shown)" "$RC"
if [ "$RC" = "0" ] && [ "$took" -le 1 ] && printf '%s' "$LAST" | grep -q 'SKIP lock held by another run'; then
  ok "second run while the first holds the lock → skipped, exit 0"
else
  bad "second run skipped" "exit=$RC took=${took}s line=$LAST"
fi
run home-dev good --cmd 'sleep 3' kolba import
if [ "$RC" = "0" ] && printf '%s' "$LAST" | grep -q 'kolba import .*SKIP'; then ok "another supplier is skipped too (one lock for the server)"; else bad "other supplier skipped" "exit=$RC line=$LAST"; fi
wait "$holder"
expect "skipped runs leave no run log" 1 "$(run_logs 'sharg-sync-*.log')"
run home-dev good --cmd 'echo after' kolba sync
if [ "$RC" = "0" ] && printf '%s' "$LAST" | grep -q 'kolba sync .*END exit=0'; then ok "lock is free again after the first run ends"; else bad "lock released" "exit=$RC line=$LAST"; fi

echo "# exit codes"
run home-dev good --cmd 'exit 3' spechurt sync;  expect "exit code of the command is passed through" 3 "$RC"
run home-dev good;                               expect "no arguments → 64" 64 "$RC"
run home-dev good --cmd 'true' allegro sync;     expect "unknown supplier → 64" 64 "$RC"
run home-dev good --cmd 'true' sharg preview;    expect "unknown mode → 64" 64 "$RC"
run home-dev good --cmd '' sharg sync;           expect "empty stand-in → 64" 64 "$RC"
HYDRA_MAX_SECONDS=1 run home-dev good --cmd 'sleep 10' sharg import
if [ "$RC" = "124" ] && printf '%s' "$LAST" | grep -q 'stopped-by-limit=1s'; then ok "HYDRA_MAX_SECONDS stops a long run → 124"; else bad "time limit" "exit=$RC line=$LAST"; fi

echo "# the production unlock never reaches a stand-in"
HA_ALLOW_PROD=1 run home-dev good --cmd 'env | cut -d= -f1 | grep -c "^HA_ALLOW_PROD$"; true' spechurt import
expect "stand-in environment has no unlock, even when the caller has it" 0 "$(sed -n '3p' "$LOGS"/spechurt-import-*.log)"

echo "# logs"
run home-dev good --cmd 'echo "Failed to parse URL from x.php?client=FAKE&token=FAKE"' kolba import
if printf '%s' "$LAST" | grep -q 'WARN 1 line(s) of the run log look like a URL with credentials'; then ok "a log line with URL credentials is counted and flagged in the journal"; else bad "url-credentials flag" "line=$LAST"; fi
expect "the journal itself never contains key= or token=" 0 "$(cat "$LOGS"/run-bl-*.log | grep -cE 'key=|token=')"
expect "log files are private (600)" 600 "$(stat -c '%a' "$LOGS"/kolba-import-*.log | head -n 1)"
expect "log directory is private (700)" 700 "$(stat -c '%a' "$LOGS")"
NODE_DEBUG=fetch TZ='' run home-dev good --cmd 'echo "TZ=$TZ NODE_DEBUG=${NODE_DEBUG:-unset}"' spechurt sync
expect "import runs in Polish time, HTTP debug output off" "TZ=Europe/Warsaw NODE_DEBUG=unset" "$(sed -n '3p' "$(find "$LOGS" -maxdepth 1 -name 'spechurt-sync-*.log' | sort | tail -n 1)")"

echo "# retention (default 30 days)"
touch -d '-29 days -23 hours' "$LOGS/sharg-sync-20000101-000001.log"
touch -d '-30 days -1 hours' "$LOGS/sharg-sync-20000101-000002.log"
touch -d '-45 days' "$LOGS/run-bl-2000-01.log" "$LOGS/preview-sharg.log" "$LOGS/notes.txt"
run home-dev good --cmd 'true' kolba sync
expect "own log younger than 30 days is kept" yes "$([ -e "$LOGS/sharg-sync-20000101-000001.log" ] && echo yes || echo no)"
expect "own log older than 30 days is deleted" no "$([ -e "$LOGS/sharg-sync-20000101-000002.log" ] && echo yes || echo no)"
expect "old journal is deleted" no "$([ -e "$LOGS/run-bl-2000-01.log" ] && echo yes || echo no)"
expect "files the wrapper did not write are kept" yes "$([ -e "$LOGS/preview-sharg.log" ] && [ -e "$LOGS/notes.txt" ] && echo yes || echo no)"
touch -d '-45 days' "$LOGS/sharg-sync-20000101-000003.log"
HYDRA_LOG_KEEP_DAYS=0 run home-dev good --cmd 'true' kolba sync
expect "HYDRA_LOG_KEEP_DAYS=0 deletes nothing" yes "$([ -e "$LOGS/sharg-sync-20000101-000003.log" ] && echo yes || echo no)"

echo
echo "passed: $passed, failed: $failed"
[ "$failed" -eq 0 ]
