#!/usr/bin/env bash
# Self-test of scripts/server/run-bl.sh (HA-2.15). Linux only (flock, GNU-style tools).
#
# Safe to run anywhere, including the import server: the wrapper is only ever called with
# --cmd (a stand-in command) or --check, and every path it uses — repo root, server marker,
# lock file, log directory — points into a temporary directory. The import itself is never
# started. The placeholder that stands where tsx would be leaves a trace if it is ever
# executed, and the last check fails if such a trace exists.
#
# Usage: bash scripts/server/test-run-bl.sh
# Exit code: 0 when every check passes, 1 otherwise.

set -u

# Nothing from the caller's shell may leak into the wrapper calls below.
unset HYDRA_DIR HYDRA_LOG_DIR HYDRA_LOCK_FILE HYDRA_SERVER_MARKER HYDRA_LOG_KEEP_DAYS \
  HYDRA_MAX_SECONDS HYDRA_KILL_AFTER_SECONDS HYDRA_STAND_IN_CHECKS BASELINKER_MOCK NODE_DEBUG

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
W="$here/run-bl.sh"
T="$(mktemp -d)" || exit 1
[ -n "$T" ] && [ -d "$T" ] || exit 1
trap 'rm -rf "$T"' EXIT
LOGS="$T/logs"
LOCK="$T/lock/run-bl.lock"
mkdir -p "$T/lock"

passed=0
failed=0
ok() { passed=$((passed + 1)); printf 'ok   - %s\n' "$1"; }
bad() { failed=$((failed + 1)); printf 'FAIL - %s\n       %s\n' "$1" "$2"; }
expect() { # description, expected, actual
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "expected: $2 | actual: $3"; fi
}
has() { # description, text, pattern
  if printf '%s' "$2" | grep -qE -- "$3"; then ok "$1"; else bad "$1" "no match for /$3/ in: $2"; fi
}
shown() { sed "s#$T#<tmp>#g" | cut -c1-210; }

# A test "repo root": an env file and an executable placeholder where tsx would be.
mk_repo() { # name, env lines…
  local dir="$T/$1"
  shift
  mkdir -p "$dir/node_modules/.bin"
  printf '#!/bin/sh\ntouch "$(dirname "$0")/../../tsx-ran"\nexit 0\n' > "$dir/node_modules/.bin/tsx"
  chmod +x "$dir/node_modules/.bin/tsx"
  printf '%s\n' "$@" > "$dir/.env.local"
  chmod 600 "$dir/.env.local"
}
mk_repo good 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID=119068'
mk_repo good-loose 'BASELINKER_TOKEN=dummy' 'export BASELINKER_INVENTORY_ID = "119068"   # katalog' 'BASELINKER_MOCK=false' '# HA_ALLOW_PROD='
mk_repo other-catalogue 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID=35743'
mk_repo duplicate-catalogue 'BASELINKER_INVENTORY_ID=119068' 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID=35743'
mk_repo inventory-empty 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID='
mk_repo inventory-absent 'BASELINKER_TOKEN=dummy'
mk_repo mock 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID=119068' 'BASELINKER_MOCK=true'
mk_repo mock-spaced 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID=119068' 'BASELINKER_MOCK = true'
mk_repo mock-quoted 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID=119068' 'BASELINKER_MOCK="true"'
mk_repo mock-colon 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID=119068' 'BASELINKER_MOCK: true'
mk_repo unlock 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID=119068' 'HA_ALLOW_PROD=1'
mk_repo unlock-spaced 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID=119068' 'export HA_ALLOW_PROD = 1'
mk_repo unreadable 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID=119068'
chmod 000 "$T/unreadable/.env.local"
mk_repo no-tsx 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID=119068'
rm "$T/no-tsx/node_modules/.bin/tsx"
mkdir -p "$T/no-env"
printf 'inventory=119068\n' > "$T/marker-ok"
: > "$T/marker-empty"
printf 'inventory=35743\n' > "$T/marker-other"

# Runs the wrapper against test paths only. Sets RC and LAST (last journal line);
# stdout goes to $T/out, stderr to $T/err.
CHECKS=0
AGENT=0
run() { # marker file, repo, wrapper arguments…
  local marker="$1" repo="$2" agent=(-u CLAUDECODE)
  shift 2
  # The test itself may be started from an agent session; the wrapper must not see that
  # unless a case asks for it.
  if [ "$AGENT" = "1" ]; then agent=(CLAUDECODE=1); fi
  env "${agent[@]}" HYDRA_SERVER_MARKER="$T/$marker" HYDRA_DIR="$T/$repo" HYDRA_LOG_DIR="$LOGS" \
    HYDRA_LOCK_FILE="$LOCK" HYDRA_STAND_IN_CHECKS="$CHECKS" "$W" "$@" > "$T/out" 2> "$T/err"
  RC=$?
  LAST="$(cat "$LOGS"/run-bl-*.log 2>/dev/null | tail -n 1)"
}
journal_all() { cat "$LOGS"/run-bl-*.log 2>/dev/null; }
starts() { journal_all | grep -c ' START '; }
last_log() { journal_all | grep ' START ' | tail -n 1 | sed -nE 's/.* log=([^ ]+).*/\1/p'; }
tsx_traces() { find "$T" -name tsx-ran | wc -l | tr -d ' '; }
alive() { pgrep -f -- "$1" > /dev/null 2>&1 && echo yes || echo no; }

echo "# a failed setup check stops the command on the run path (stand-in command, checks on)"
refused() { # description, marker, repo, text expected in the journal line
  local before
  before="$(starts)"
  rm -f "$T/sentinel"
  CHECKS=1
  run "$2" "$3" --cmd "touch '$T/sentinel'" sharg import
  CHECKS=0
  printf '       %s\n       exit=%s\n' "$(printf '%s' "$LAST" | shown)" "$RC"
  if [ "$RC" = "78" ] && [ ! -e "$T/sentinel" ] && [ "$(starts)" = "$before" ] \
     && printf '%s' "$LAST" | grep -q "ERROR.*$4" && grep -q '^run-bl: sharg import: ' "$T/err"; then
    ok "$1 → refused, command not run, reported on stderr"
  else
    bad "$1" "exit=$RC sentinel=$([ -e "$T/sentinel" ] && echo present || echo absent) line=$LAST err=$(cat "$T/err")"
  fi
}
refused "no server marker file" marker-missing good 'not marked as the import server'
refused "marker without a catalogue line" marker-empty good 'does not name the catalogue'
refused "marker names another catalogue" marker-other good 'catalogue mismatch'
refused "env file names another catalogue" marker-ok other-catalogue 'catalogue mismatch'
refused "catalogue set twice, last line differs" marker-ok duplicate-catalogue 'catalogue mismatch'
refused "BASELINKER_INVENTORY_ID empty" marker-ok inventory-empty 'BASELINKER_INVENTORY_ID is not set'
refused "BASELINKER_INVENTORY_ID line absent" marker-ok inventory-absent 'BASELINKER_INVENTORY_ID is not set'
refused "BASELINKER_MOCK=true" marker-ok mock 'BASELINKER_MOCK is true'
refused "BASELINKER_MOCK = true (spaces)" marker-ok mock-spaced 'BASELINKER_MOCK is true'
refused 'BASELINKER_MOCK="true" (quoted)' marker-ok mock-quoted 'BASELINKER_MOCK is true'
refused "BASELINKER_MOCK: true (colon)" marker-ok mock-colon 'BASELINKER_MOCK is true'
refused "production unlock stored in the env file" marker-ok unlock 'production unlock is stored'
refused "production unlock with export and spaces" marker-ok unlock-spaced 'production unlock is stored'
refused "env file missing" marker-ok no-env '.env.local not found'
if [ "$(id -u)" != "0" ]; then
  refused "env file unreadable" marker-ok unreadable 'is not readable by'
fi
refused "tsx not installed" marker-ok no-tsx 'run npm ci'
AGENT=1
refused "complete setup, but started from an agent session" marker-ok good 'AI coding agent session'
AGENT=0

for repo in good good-loose; do
  rm -f "$T/sentinel"
  CHECKS=1
  run marker-ok "$repo" --cmd "touch '$T/sentinel'" sharg import
  CHECKS=0
  if [ "$RC" = "0" ] && [ -e "$T/sentinel" ]; then ok "control: complete setup ($repo) → command runs"; else bad "control: complete setup ($repo)" "exit=$RC line=$LAST"; fi
done
has "START names the catalogue" "$(journal_all | grep ' START ' | tail -n 1)" 'START catalogue=119068 '

echo "# --check reports the same and starts nothing"
before="$(starts)"
run marker-missing good --check sharg import;       expect "--check, no marker → 78" 78 "$RC"
run marker-other good --check sharg import;         expect "--check, marker names another catalogue → 78" 78 "$RC"
run marker-ok mock-spaced --check sharg import;     expect "--check, mock on → 78" 78 "$RC"
run marker-ok inventory-absent --check sharg import; expect "--check, no catalogue ID → 78" 78 "$RC"
run marker-ok unlock --check sharg import;          expect "--check, unlock in env file → 78" 78 "$RC"
run marker-ok good --check sharg import;            expect "--check, complete setup → 0" 0 "$RC"
printf '       %s\n' "$(printf '%s' "$LAST" | shown)"
has "--check says what a real run would start" "$LAST" 'CHECK ok — nothing was run\. A real run would start in .*/good: .*/node_modules/\.bin/tsx scripts/xml-to-baselinker\.ts sharg import \(catalogue 119068, limit none, lock '
expect "--check starts no run" "$before" "$(starts)"
AGENT=1
run marker-ok good --check sharg import
AGENT=0
expect "--check from an agent session → 78" 78 "$RC"

# The real home directory comes from the password database: a marker and a lock path
# cannot be redirected through $HOME, and the lock does not follow the log directory.
real_home="$(getent passwd "$(id -u)" | cut -d: -f6)"
mk_repo catalogue-one 'BASELINKER_TOKEN=dummy' 'BASELINKER_INVENTORY_ID=1'
mkdir -p "$T/fake-home"
printf 'inventory=1\n' > "$T/fake-home/.hydra-import-server"
env -u CLAUDECODE HOME="$T/fake-home" HYDRA_DIR="$T/catalogue-one" HYDRA_LOG_DIR="$LOGS" "$W" --check sharg import > "$T/out" 2> "$T/err"
expect "a marker in a directory named by HOME is not accepted" 78 "$?"
env -u CLAUDECODE HOME="$T/fake-home" HYDRA_SERVER_MARKER="$T/marker-ok" HYDRA_DIR="$T/good" HYDRA_LOG_DIR="$T/other-logs" "$W" --check sharg import > "$T/out" 2> "$T/err"
has "the default lock is in the real home directory, whatever HOME and the log directory say" "$(cat "$T/out")" "lock $real_home/\.hydra-run-bl\.lock\)"
chmod 644 "$T/good/.env.local"
run marker-ok good --check sharg import
if [ "$RC" = "0" ] && grep -q 'WARN.*has mode 644, expected 600' "$T/out"; then ok "--check warns when the env file is not mode 600"; else bad "env file mode warning" "exit=$RC out=$(cat "$T/out")"; fi
chmod 600 "$T/good/.env.local"

echo "# settings that cannot be understood are refused, not replaced by a default"
HYDRA_MAX_SECONDS=90m run marker-ok good --cmd 'true' kolba sync
if [ "$RC" = "78" ] && printf '%s' "$LAST" | grep -q 'HYDRA_MAX_SECONDS must be whole seconds'; then ok "HYDRA_MAX_SECONDS=90m → 78"; else bad "bad time limit" "exit=$RC line=$LAST"; fi
HYDRA_MAX_SECONDS=99999999999999999999 run marker-ok good --cmd 'true' kolba sync
expect "a time limit too large to be a number → 78" 78 "$RC"
HYDRA_MAX_SECONDS=90m run marker-ok good --check sharg import
expect "--check refuses a bad time limit too" 78 "$RC"
HYDRA_LOG_KEEP_DAYS=never run marker-ok good --cmd 'true' kolba sync
if [ "$RC" = "78" ] && printf '%s' "$LAST" | grep -q 'HYDRA_LOG_KEEP_DAYS must be a whole number'; then ok "HYDRA_LOG_KEEP_DAYS=never → 78"; else bad "bad retention" "exit=$RC line=$LAST"; fi
HYDRA_LOG_DIR=relative/logs HYDRA_LOCK_FILE="$LOCK" "$W" --cmd 'true' kolba sync > "$T/out" 2> "$T/err"
expect "relative log directory → 78" 78 "$?"

echo "# one run at a time"
run marker-missing good --cmd 'sleep 3' sharg sync &
holder=$!
sleep 1
started="$(date +%s)"
run marker-missing good --cmd 'sleep 3' sharg sync
took=$(( $(date +%s) - started ))
printf '       %s\n       exit=%s\n' "$(printf '%s' "$LAST" | shown)" "$RC"
if [ "$RC" = "0" ] && [ "$took" -le 1 ] \
   && printf '%s' "$LAST" | grep -q 'SKIP lock held by another run — skipping (holder: sharg sync pid=[0-9]* since .*, running 0 min)'; then
  ok "second run while the first holds the lock → skipped, exit 0"
else
  bad "second run skipped" "exit=$RC took=${took}s line=$LAST"
fi
expect "a skipped run prints nothing (cron stays quiet)" "0 0" "$(wc -c < "$T/out" | tr -d ' ') $(wc -c < "$T/err" | tr -d ' ')"
run marker-missing good --cmd 'sleep 3' kolba import
has "another supplier is skipped too (one lock for the server)" "$LAST" 'kolba import .*SKIP'
wait "$holder"
expect "skipped runs leave no run log" 1 "$(find "$LOGS" -name 'sharg-sync-*.log' | wc -l | tr -d ' ')"
run marker-missing good --cmd 'echo after' kolba sync
has "lock is free again after the first run ends" "$LAST" 'kolba sync .*END exit=0'
expect "the lock file itself is never written" 0 "$(wc -c < "$LOCK" | tr -d ' ')"
printf 'sharg import pid=1 since 2026-01-01 00:00:00+0100 epoch=1\n' > "$LOCK.holder"
run marker-missing good --cmd 'true' kolba sync
if journal_all | grep -q 'WARN the previous run did not end cleanly: sharg import pid=1 since 2026-01-01'; then ok "a leftover holder line is reported as an unclean end"; else bad "unclean end warning" "$(journal_all | tail -n 3)"; fi

echo "# exit codes and visibility"
run marker-missing good --cmd 'exit 3' spechurt sync
expect "exit code of the command is passed through" 3 "$RC"
has "a failed run is reported on stderr" "$(cat "$T/err")" '^run-bl: spechurt sync: run ended with exit 3'
run marker-missing good;                            expect "no arguments → 64" 64 "$RC"
run marker-missing good --cmd 'true' allegro sync;  expect "unknown supplier → 64" 64 "$RC"
run marker-missing good --cmd 'true' sharg preview; expect "unknown mode → 64" 64 "$RC"
run marker-missing good --cmd '' sharg sync;        expect "empty stand-in → 64" 64 "$RC"
run marker-missing good sharg sync --cmd 'true';    expect "options after the supplier → 64" 64 "$RC"

echo "# stopping a run: time limit, signal, and a kill from outside"
HYDRA_MAX_SECONDS=1 run marker-missing good --cmd "sleep 7771.$$" sharg import
printf '       %s\n' "$(printf '%s' "$LAST" | shown)"
if [ "$RC" = "124" ] && printf '%s' "$LAST" | grep -q 'END exit=124 .*stopped-by=limit-1s'; then ok "HYDRA_MAX_SECONDS stops a long run → 124"; else bad "time limit" "exit=$RC line=$LAST"; fi
has "START shows the limit in force" "$(journal_all | grep ' START ' | tail -n 1)" ' limit=1s '
expect "nothing of the stopped run is left" no "$(alive "sleep 7771.$$")"
started="$(date +%s)"
HYDRA_MAX_SECONDS=1 HYDRA_KILL_AFTER_SECONDS=1 run marker-missing good --cmd "trap '' TERM; sleep 7772.$$ & wait" sharg import
took=$(( $(date +%s) - started ))
if [ "$RC" = "124" ] && [ "$took" -le 6 ]; then ok "a command that ignores TERM is killed after the grace period"; else bad "kill after grace" "exit=$RC took=${took}s line=$LAST"; fi
expect "its child process is gone as well" no "$(alive "sleep 7772.$$")"
run marker-missing good --cmd "sleep 7773.$$" kolba import &
bg=$!
sleep 1
wrapper_pid="$(sed -nE 's/.* pid=([0-9]+) since .*/\1/p' "$LOCK.holder")"
kill -TERM "$wrapper_pid"
wait "$bg"
LAST="$(journal_all | tail -n 1)"
printf '       %s\n' "$(printf '%s' "$LAST" | shown)"
if journal_all | grep -q 'kolba import .*STOP signal-TERM' && printf '%s' "$LAST" | grep -q 'END exit=143 .*stopped-by=signal-TERM'; then
  ok "TERM sent to the wrapper stops the run and is journalled"
else
  bad "signal to the wrapper" "line=$LAST"
fi
expect "the command is gone after the signal" no "$(alive "sleep 7773.$$")"
HYDRA_MAX_SECONDS=7200 run marker-missing good --cmd 'kill -KILL $$' spechurt import
printf '       %s\n' "$(printf '%s' "$LAST" | shown)"
if [ "$RC" = "137" ] && printf '%s' "$LAST" | grep -q 'END exit=137 .*killed-by-signal=9' && ! printf '%s' "$LAST" | grep -q 'stopped-by'; then
  ok "a kill from outside (e.g. out of memory) is not blamed on the time limit"
else
  bad "kill from outside" "exit=$RC line=$LAST"
fi
expect "stderr of a killed run carries only the wrapper's own line" 0 "$(grep -vc '^run-bl: ' "$T/err")"
if [ "$(id -u)" != "0" ]; then
  HYDRA_MAX_SECONDS=2 run marker-missing good --cmd "sleep 7774.$$" sharg import &
  bg=$!
  sleep 1
  chmod 400 "$LOGS"/run-bl-*.log
  wait "$bg"
  chmod 600 "$LOGS"/run-bl-*.log
  expect "the limit still stops a run when the journal cannot be written" no "$(alive "sleep 7774.$$")"
  run marker-missing good --cmd 'true' sharg import
  has "and the lock is free afterwards" "$LAST" 'sharg import .*END exit=0'
fi

echo "# what a stand-in can and cannot see"
HA_ALLOW_PROD=1 run marker-missing good --cmd 'env | cut -d= -f1 | grep -c "^HA_ALLOW_PROD$"; true' kolba import
expect "no production unlock, even when the caller has it" 0 "$(sed -n '3p' "$(last_log)")"
BASELINKER_MOCK=true NODE_DEBUG=fetch TZ='' run marker-missing good --cmd 'echo "TZ=$TZ NODE_DEBUG=${NODE_DEBUG:-unset} MOCK=${BASELINKER_MOCK:-unset}"' kolba import
expect "Polish time; HTTP debug output and an inherited mock switch are removed" "TZ=Europe/Warsaw NODE_DEBUG=unset MOCK=unset" "$(sed -n '3p' "$(last_log)")"

echo "# logs and journal"
run marker-missing good --cmd 'echo "Failed to parse URL from x.php?client=FAKE&token=FAKE"' kolba import
has "a log line with URL credentials is counted and flagged" "$LAST" 'WARN 1 line\(s\) of the run log look like a URL with credentials'
run marker-missing good --cmd 'echo "✓ Import done: 3 created, 2 updated, 1 errors"' sharg import
has "the import summary is copied into the END line" "$LAST" 'END exit=0 .*result="Import done: 3 created, 2 updated, 1 errors"'
has "a stand-in run is marked as such in the journal" "$LAST" 'what=stand-in$'
run marker-missing good --cmd 'printf "✓ Import done: 3 created, 2 updated, 1 errors\n  skipped: 1 (no BL data — counted in errors, nothing overwritten)\n"' sharg import
has "the skipped count of the import is carried into the END line" "$LAST" 'result="Import done: 3 created, 2 updated, 1 errors, skipped: 1"'
run marker-missing good --cmd 'printf "Sync done: 5 products refreshed\n  skipped: 9\n"' sharg sync
has "a skipped line is only read for an import summary" "$LAST" 'result="Sync done: 5 products refreshed"'
run marker-missing good --cmd 'printf "\n✓ Sync done: 5 products refreshed\n  zeroed: 3 (approved: 1) — withdrawn by sharg, stock 0 in bl_2 only\n"' sharg sync
has "the zeroed count of the sync is carried into the END line (HA-2.38)" "$LAST" 'result="Sync done: 5 products refreshed, zeroed: 3 \(approved: 1\)"'
run marker-missing good --cmd 'printf "[error] feed looks incomplete: 89 products, previous successful run 100 (< 90%%) — no stock zeroed\n✓ Sync done: 5 products refreshed\n"; exit 1' sharg sync
has "an incomplete feed shows in the END line with exit 1 (HA-2.38)" "$LAST" 'END exit=1 .*result="Sync done: 5 products refreshed, \[error\] feed looks incomplete: 89 products, previous successful run 100"'
run marker-missing good --cmd 'printf "[error] matches look incomplete: 89 matched, previous successful run 100 (< 90%%) — no stock zeroed, no own purchase cleared, counts not stored\n✓ Sync done: 100 products refreshed\n"; exit 1' spechurt sync
has "too few matched records show in the END line with exit 1 (HA-2.39 review)" "$LAST" 'spechurt sync .*END exit=1 .*result="Sync done: 100 products refreshed, \[error\] matches look incomplete: 89 matched, previous successful run 100"'
run marker-missing good --cmd 'echo "Matched 0 products, 2280 not in BL yet (run import)"' sharg sync
has "a sync that matched nothing shows in the END line" "$LAST" 'result="Matched 0 products, 2280 not in BL yet"'
run marker-missing good --cmd 'true' sharg sync
has "no summary → result none" "$LAST" 'result="none"'
run marker-missing good --cmd 'printf "Received 0.0 MB\nParsed 0 products\n"; echo "[fatal] empty feed after 3 attempts" >&2; exit 1' spechurt import
expect "an empty feed ends the run with exit 1" 1 "$RC"
has "the empty-feed fatal line is the result of the END line" "$LAST" 'spechurt import .*END exit=1 .*result="\[fatal\] empty feed after 3 attempts"'
has "and the failed run is reported on stderr" "$(cat "$T/err")" '^run-bl: spechurt import: run ended with exit 1'
run marker-missing good --cmd 'echo "[fatal] empty feed after 1 attempt (no retry for --from-file)" >&2; exit 1' kolba sync
has "a single-attempt empty feed is captured without the reason suffix" "$LAST" 'result="\[fatal\] empty feed after 1 attempt"'
before="$(find "$LOGS" -name 'spechurt-sync-*.log' | wc -l | tr -d ' ')"
run marker-missing good --cmd 'true' spechurt sync
run marker-missing good --cmd 'true' spechurt sync
run marker-missing good --cmd 'true' spechurt sync
expect "three runs in a row get three separate log files" "$((before + 3))" "$(find "$LOGS" -name 'spechurt-sync-*.log' | wc -l | tr -d ' ')"
expect "the journal itself never contains key= or token=" 0 "$(journal_all | grep -cE 'key=|token=')"
expect "log files are private (600)" 600 "$(stat -c '%a' "$(last_log)")"
expect "log directory is private (700)" 700 "$(stat -c '%a' "$LOGS")"

echo "# retention (default 30 days)"
now_s="$(date +%s)"
# Absolute seconds, so a clock change inside the 30 days cannot move the boundary.
keep_at="@$((now_s - 30 * 86400 + 3600))"
drop_at="@$((now_s - 30 * 86400 - 3600))"
old_at="@$((now_s - 45 * 86400))"
foreign=(preview-sharg.log sharg-preview.log sharg-preview-2026-08-29.log sharg-import-first-live-KEEP.log kolba-dry-run.log run-bl-README.log notes.txt)
touch -d "$keep_at" "$LOGS/sharg-sync-20000101-000001.log"
touch -d "$drop_at" "$LOGS/sharg-sync-20000101-000002.log" "$LOGS/kolba-import-20000101-000002-2.log"
touch -d "$old_at" "$LOGS/run-bl-2000-01.log"
for f in "${foreign[@]}"; do touch -d "$old_at" "$LOGS/$f"; done
run marker-missing good --cmd 'true' kolba sync
expect "own log younger than 30 days is kept" yes "$([ -e "$LOGS/sharg-sync-20000101-000001.log" ] && echo yes || echo no)"
expect "own logs older than 30 days are deleted" "no no" "$([ -e "$LOGS/sharg-sync-20000101-000002.log" ] && echo yes || echo no) $([ -e "$LOGS/kolba-import-20000101-000002-2.log" ] && echo yes || echo no)"
expect "old journal is deleted" no "$([ -e "$LOGS/run-bl-2000-01.log" ] && echo yes || echo no)"
kept=0
for f in "${foreign[@]}"; do if [ -e "$LOGS/$f" ]; then kept=$((kept + 1)); fi; done
expect "files the wrapper did not write are kept, also when they start with a supplier name" "${#foreign[@]}" "$kept"
touch -d "$old_at" "$LOGS/sharg-sync-20000101-000003.log"
HYDRA_LOG_KEEP_DAYS=0 run marker-missing good --cmd 'true' kolba sync
expect "HYDRA_LOG_KEEP_DAYS=0 deletes nothing" yes "$([ -e "$LOGS/sharg-sync-20000101-000003.log" ] && echo yes || echo no)"
HYDRA_LOG_KEEP_DAYS=08 run marker-missing good --cmd 'true' kolba sync
expect "HYDRA_LOG_KEEP_DAYS=08 is read as 8, not as a bad octal number" "0 no" "$RC $([ -e "$LOGS/sharg-sync-20000101-000003.log" ] && echo yes || echo no)"

echo "# pricing of shared records: all price-shared (HA-2.39)"
run marker-missing good --cmd 'true' all sync;            expect "all with a supplier mode → 64" 64 "$RC"
run marker-missing good --cmd 'true' kolba price-shared;  expect "a supplier with price-shared → 64" 64 "$RC"
run marker-missing good --cmd 'true' all import;          expect "all import → 64" 64 "$RC"
run marker-ok good --check all price-shared
if [ "$RC" = "0" ] && grep -qE 'all price-shared pid=[0-9]+ CHECK ok .*node_modules/\.bin/tsx scripts/xml-to-baselinker\.ts price-shared \(catalogue 119068' "$T/out"; then
  ok "--check all price-shared → the pricing command, no supplier argument"
else
  bad "--check all price-shared" "exit=$RC out=$(shown < "$T/out")"
fi
CHECKS=1
AGENT=1
run marker-ok good --cmd "touch '$T/sentinel-pricing'" all price-shared
AGENT=0
CHECKS=0
expect "price-shared from an agent session → refused like a supplier run" "78 absent" "$RC $([ -e "$T/sentinel-pricing" ] && echo present || echo absent)"
HYDRA_MAX_SECONDS=300 run marker-missing good --cmd 'printf "\n✓ Pricing done: 412 shared, 37 changed, 375 unchanged, 2 skipped\n"' all price-shared
has "the pricing summary is the result of the END line, with its own time limit" "$LAST" 'all price-shared pid=[0-9]+ END exit=0 .*result="Pricing done: 412 shared, 37 changed, 375 unchanged, 2 skipped"'
has "its START names its own limit" "$(journal_all | grep 'all price-shared .* START ' | tail -n 1)" 'limit=300s log=.*/all-price-shared-[0-9]{8}-[0-9]{6}(-[0-9]+)?\.log'
run marker-missing good --cmd 'printf "Pricing dry-run: 5 shared, 1 changed, 4 unchanged, 0 skipped\n"; echo "[error] product data read failed: x — nothing written" >&2; exit 1' all price-shared
has "a failed pricing run → exit 1, no summary claimed" "$LAST" 'all price-shared .*END exit=1 .*result="none"'
run marker-missing good --cmd 'sleep 3' spechurt sync &
holder=$!
sleep 1
run marker-missing good --cmd 'echo priced' all price-shared
has "price-shared waits for nobody: skipped while a sync holds the lock" "$LAST" 'all price-shared .*SKIP lock held by another run — skipping \(holder: spechurt sync'
wait "$holder"
touch -d "$drop_at" "$LOGS/all-price-shared-20000101-000004.log"
touch -d "$old_at" "$LOGS/all-price-shared-preview.log"
run marker-missing good --cmd 'true' kolba sync
expect "an old pricing log is deleted, a foreign file with a similar name is kept" "no yes" "$([ -e "$LOGS/all-price-shared-20000101-000004.log" ] && echo yes || echo no) $([ -e "$LOGS/all-price-shared-preview.log" ] && echo yes || echo no)"

echo "# the placeholder standing in for tsx was never executed"
expect "no trace of an import start anywhere" 0 "$(tsx_traces)"

echo
echo "passed: $passed, failed: $failed"
[ "$failed" -eq 0 ]
