#!/usr/bin/env bash
# Cron wrapper for the supplier feed → BaseLinker import on the import server (HA-2.15).
# Deployment and crontab: docs/ops/serwer-importu.md.
#
# Usage:
#   scripts/server/run-bl.sh <kolba|sharg|spechurt> <import|sync>
#   scripts/server/run-bl.sh --check <kolba|sharg|spechurt> <import|sync>
#   scripts/server/run-bl.sh --cmd '<stand-in command>' <kolba|sharg|spechurt> <import|sync>
#
# What it does:
#   - One run at a time on the whole server: `flock -n` on a single lock file. When the
#     lock is held the run is skipped — one journal line, exit 0, so cron does not treat
#     a skipped run as a failure. Feeds are parsed in memory and all runs share one
#     BaseLinker rate limit, so two runs must never overlap.
#   - One log file per run: <log dir>/<supplier>-<mode>-<YYYYmmdd-HHMMSS>.log, plus a
#     monthly journal run-bl-<YYYY-MM>.log with one line per start / end / skip / error.
#     Log files older than HYDRA_LOG_KEEP_DAYS are deleted at the start of a run.
#     The end line counts run-log lines that look like a URL with credentials
#     (url-credentials=N, expected 0).
#   - The production unlock checked by scripts/lib/prodGuard.ts is set for the import
#     process only. It is never exported and never read from a file — keep it out of
#     .env.local, shell profiles and the crontab environment.
#   - The import runs only on a machine marked as the import server: the file
#     ~/.hydra-import-server must exist (create it once, by hand, on the server). The
#     agent guard hook does not know this wrapper, so without the marker a run on a
#     developer machine would write to production BaseLinker unnoticed.
#   - --check runs the setup checks of a real run and exits without running anything.
#   - --cmd replaces the import with a stand-in command, to test locking and logging
#     without touching BaseLinker. A stand-in never receives the unlock.
#
# Settings (environment, all optional):
#   HYDRA_DIR            repo root; default: two levels above this file
#   HYDRA_LOG_DIR        default: $HOME/logs
#   HYDRA_LOCK_FILE      default: $HYDRA_LOG_DIR/run-bl.lock
#   HYDRA_LOG_KEEP_DAYS  default: 30; 0 = never delete
#   HYDRA_MAX_SECONDS    stop the run after this many seconds; default: 0 = no limit
#   HYDRA_STAND_IN_CHECKS  1 = run the setup checks before a --cmd stand-in as well, to
#                        prove on the real run path that a failed check stops the command
#   TZ                   default: Europe/Warsaw — BaseLinker reports rate-limit blocks in
#                        Polish time and src/lib/baselinker/client.ts reads them as local time
#
# Exit codes: 0 run finished, skipped (lock held) or --check passed · 64 bad arguments ·
#   69 flock or timeout missing · 73 cannot write logs or lock · 78 setup check failed ·
#   124 / 137 stopped by HYDRA_MAX_SECONDS · anything else: exit code of the import.

set -u
umask 077

usage() {
  echo "usage: $0 [--check | --cmd '<stand-in command>'] <kolba|sharg|spechurt> <import|sync>" >&2
  exit 64
}

stand_in=""
check_only=0
case "${1:-}" in
  --cmd)
    [ $# -ge 2 ] || usage
    stand_in="$2"
    [ -n "$stand_in" ] || usage
    shift 2
    ;;
  --check)
    check_only=1
    shift
    ;;
esac
[ $# -eq 2 ] || usage
supplier="$1"
mode="$2"
case "$supplier" in kolba|sharg|spechurt) ;; *) usage ;; esac
case "$mode" in import|sync) ;; *) usage ;; esac

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HYDRA_DIR="${HYDRA_DIR:-$(cd "$script_dir/../.." && pwd)}"
LOG_DIR="${HYDRA_LOG_DIR:-$HOME/logs}"
LOCK_FILE="${HYDRA_LOCK_FILE:-$LOG_DIR/run-bl.lock}"
KEEP_DAYS="${HYDRA_LOG_KEEP_DAYS:-30}"
MAX_SECONDS="${HYDRA_MAX_SECONDS:-0}"
SERVER_MARKER="$HOME/.hydra-import-server"
case "$KEEP_DAYS" in ''|*[!0-9]*) KEEP_DAYS=30 ;; esac
case "$MAX_SECONDS" in ''|*[!0-9]*) MAX_SECONDS=0 ;; esac
export TZ="${TZ:-Europe/Warsaw}"
# Node's HTTP debug output prints request paths, and feed URLs carry credentials there.
unset NODE_DEBUG
# Never inherit the production unlock from the caller: it is set below, on the import
# command only, so a stand-in or anything else started here cannot receive it.
unset HA_ALLOW_PROD

mkdir -p "$LOG_DIR" || { echo "run-bl: cannot create $LOG_DIR" >&2; exit 73; }
journal_file="$LOG_DIR/run-bl-$(date +%Y-%m).log"
run_log="$LOG_DIR/$supplier-$mode-$(date +%Y%m%d-%H%M%S).log"
tsx="$HYDRA_DIR/node_modules/.bin/tsx"

now() { date '+%F %T%z'; }

# One line per event in the monthly journal; echoed on manual runs and with --check.
journal() {
  local line
  line="$(now) $supplier $mode pid=$$ $*"
  printf '%s\n' "$line" >> "$journal_file" || { echo "run-bl: cannot write $journal_file" >&2; exit 73; }
  if [ -t 1 ] || [ "$check_only" -eq 1 ]; then printf '%s\n' "$line"; fi
}

fail() {
  local code="$1"
  shift
  journal "ERROR $*"
  exit "$code"
}

# Setup checks of a real run. Everything here must hold before the import may start.
check_setup() {
  local env_file="$HYDRA_DIR/.env.local" env_mode
  [ -e "$SERVER_MARKER" ] \
    || fail 78 "this machine is not marked as the import server ($SERVER_MARKER is missing) — the import was not started"
  [ -f "$env_file" ] || fail 78 "$env_file not found"
  # The import loads .env.local with override, so an unlock stored there would be permanent.
  if grep -Eq '^[[:space:]]*(export[[:space:]]+)?HA_ALLOW_PROD[[:space:]]*=' "$env_file"; then
    fail 78 "the production unlock is stored in $env_file — remove that line, it must be per run only"
  fi
  # Without this variable the import falls back to a hard-coded catalogue ID
  # (scripts/xml-to-baselinker.ts) — never run against a default target.
  grep -Eq "^[[:space:]]*(export[[:space:]]+)?BASELINKER_INVENTORY_ID=[\"']?[0-9]+" "$env_file" \
    || fail 78 "BASELINKER_INVENTORY_ID is not set to a number in $env_file — the import would write to a default catalogue"
  # With the mock switched on nothing is written, yet the import reports products as created.
  if grep -Eqi "^[[:space:]]*(export[[:space:]]+)?BASELINKER_MOCK=[\"']?true" "$env_file"; then
    fail 78 "BASELINKER_MOCK=true in $env_file — the import would report success without writing anything"
  fi
  [ -x "$tsx" ] || fail 78 "$tsx not found — run npm ci in $HYDRA_DIR"
  command -v node >/dev/null 2>&1 || fail 78 "node is not on PATH ($PATH)"
  env_mode="$(stat -c '%a' "$env_file" 2>/dev/null)"
  [ "$env_mode" = "600" ] || journal "WARN $env_file has mode ${env_mode:-?}, expected 600"
}

command -v flock >/dev/null 2>&1 || fail 69 "flock not found (util-linux)"
if [ "$MAX_SECONDS" -gt 0 ]; then
  command -v timeout >/dev/null 2>&1 || fail 69 "timeout not found (coreutils) but HYDRA_MAX_SECONDS is set"
fi

if [ "$check_only" -eq 1 ]; then
  check_setup
  journal "CHECK ok — setup is ready for a real run (nothing was run)"
  exit 0
fi

# The lock lives on file descriptor 9 and is inherited by the import process, so it
# stays held for as long as the import is alive, even if this wrapper is killed.
exec 9>>"$LOCK_FILE" || fail 73 "cannot open lock file $LOCK_FILE"
if ! flock -n 9; then
  holder="$(head -n 1 "$LOCK_FILE" 2>/dev/null)"
  journal "SKIP lock held by another run — skipping${holder:+ (holder: $holder)}"
  exit 0
fi
printf '%s %s pid=%s since %s\n' "$supplier" "$mode" "$$" "$(now)" > "$LOCK_FILE"

if [ "$KEEP_DAYS" -gt 0 ]; then
  find "$LOG_DIR" -maxdepth 1 -type f \
    \( -name 'kolba-*.log' -o -name 'sharg-*.log' -o -name 'spechurt-*.log' -o -name 'run-bl-*.log' \) \
    -mtime +"$((KEEP_DAYS - 1))" -delete 2>/dev/null
fi

if [ -z "$stand_in" ] || [ "${HYDRA_STAND_IN_CHECKS:-0}" = "1" ]; then
  check_setup
fi

limit=()
if [ "$MAX_SECONDS" -gt 0 ]; then
  limit=(timeout --kill-after=60 "$MAX_SECONDS")
fi

cd "$HYDRA_DIR" || fail 78 "cannot cd to $HYDRA_DIR"

commit="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
started="$(date +%s)"
journal "START commit=$commit log=$run_log"
printf '=== %s run-bl start: %s %s (pid %s, commit %s)\n' "$(now)" "$supplier" "$mode" "$$" "$commit" >> "$run_log" \
  || fail 73 "cannot write $run_log"

if [ -n "$stand_in" ]; then
  printf '=== stand-in command (--cmd): the import is not run and the production unlock is not passed\n' >> "$run_log"
  ${limit[@]+"${limit[@]}"} bash -c "$stand_in" >> "$run_log" 2>&1 < /dev/null
  rc=$?
else
  # The unlock is an environment assignment on this one command — not exported.
  HA_ALLOW_PROD=1 ${limit[@]+"${limit[@]}"} "$tsx" scripts/xml-to-baselinker.ts "$supplier" "$mode" >> "$run_log" 2>&1 < /dev/null
  rc=$?
fi

elapsed=$(( $(date +%s) - started ))
note=""
if [ "$MAX_SECONDS" -gt 0 ] && { [ "$rc" -eq 124 ] || [ "$rc" -eq 137 ]; }; then
  note=" stopped-by-limit=${MAX_SECONDS}s"
fi
printf '\n=== %s run-bl end: %s %s (exit %s, %ss)%s\n' "$(now)" "$supplier" "$mode" "$rc" "$elapsed" "$note" >> "$run_log"
# Feed URLs carry credentials as query parameters. The import strips them from its own
# messages, but an error text from a library can still quote a URL — count such lines.
url_credentials="$(grep -cE '(key|token|client)=' "$run_log" 2>/dev/null)"
journal "END exit=$rc duration=${elapsed}s${note} url-credentials=${url_credentials:-?} log=$run_log"
if [ "${url_credentials:-0}" != "0" ]; then
  journal "WARN ${url_credentials:-?} line(s) of the run log look like a URL with credentials — read it, then delete the file"
fi
: > "$LOCK_FILE"
exit "$rc"
