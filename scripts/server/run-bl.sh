#!/usr/bin/env bash
# Cron wrapper for the supplier feed → BaseLinker import on the import server (HA-2.15).
# Deployment and crontab: docs/ops/serwer-importu.md. Self-test: scripts/server/test-run-bl.sh.
#
# Usage:
#   scripts/server/run-bl.sh <kolba|sharg|spechurt> <import|sync>          a real run
#   scripts/server/run-bl.sh --check <supplier> <mode>                      setup checks only
#   scripts/server/run-bl.sh --cmd '<stand-in command>' <supplier> <mode>   test of lock and logs
#
# A real run
#   - starts only on the import server: ~/.hydra-import-server must exist and contain a line
#     inventory=<BaseLinker catalogue ID>, and BASELINKER_INVENTORY_ID in .env.local must be
#     that same ID. Two reasons: the agent guard hook does not know this wrapper, so on a
#     developer machine nothing else would stop it; and the import falls back to a
#     hard-coded catalogue when the variable is missing.
#   - is refused (exit 78, journal line ERROR) when .env.local is missing or unreadable,
#     stores the production unlock, switches BASELINKER_MOCK on, when tsx or node is missing,
#     or when it is started from an AI coding agent session (CLAUDECODE is set).
#   - takes nothing about its target from the environment: the repo is the one this file
#     lives in; the marker and the lock are in the account's home directory.
#   - gets the production unlock checked by scripts/lib/prodGuard.ts on the import command
#     only. It is never exported, never read from a file and never inherited from the caller.
#
# Every run, real or stand-in
#   - one at a time on the whole server: `flock -n` on one lock file. When the lock is held
#     the run is skipped — one journal line, no output, exit 0 — so cron does not treat a
#     skipped run as a failure. Feeds are parsed in memory and all runs share one BaseLinker
#     rate limit, so two runs must never overlap.
#   - writes its own log <log dir>/<supplier>-<mode>-<YYYYmmdd-HHMMSS>.log and one line per
#     START / END / SKIP / STOP / ERROR / WARN in the monthly journal run-bl-<YYYY-MM>.log.
#     The END line carries the exit code, the duration, the import's own summary
#     (result="…") and the number of run-log lines that look like a URL with credentials
#     (url-credentials=N, expected 0). Own logs older than HYDRA_LOG_KEEP_DAYS are deleted
#     at the start of a run.
#   - runs the command in its own process group. TERM, INT or HUP sent to the wrapper stop
#     the whole run and are journalled; HYDRA_MAX_SECONDS does the same after a time limit.
#     END is written only when no process of the run is left, i.e. when the lock is free.
#   - prints nothing on success or skip; errors and failed runs also go to stderr.
#
# --check runs the setup checks of a real run and reports what a real run would start;
#   it starts nothing. --cmd replaces the import with a stand-in command, which never
#   receives the unlock.
#
# Settings (environment, all optional):
#   HYDRA_LOG_DIR         log directory; default ~/logs
#   HYDRA_LOG_KEEP_DAYS   default 30; 0 = never delete
#   HYDRA_MAX_SECONDS     stop the run after this many seconds; default 0 = no limit
#   TZ                    default Europe/Warsaw — BaseLinker reports rate-limit blocks in
#                         Polish time and src/lib/baselinker/client.ts reads them as local time
# Honoured with --cmd and --check only (for the self-test); a real run ignores them:
#   HYDRA_DIR, HYDRA_SERVER_MARKER, HYDRA_LOCK_FILE, HYDRA_KILL_AFTER_SECONDS (default 60),
#   HYDRA_STAND_IN_CHECKS=1 (run the setup checks before a stand-in as well)
#
# Exit codes: 0 finished, skipped or --check passed · 64 bad arguments · 69 flock missing ·
#   73 cannot write logs or lock · 78 setup check or setting refused · 124 stopped by the
#   time limit · 128+N the command was killed by signal N · anything else: exit code of
#   the import.

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

self="$(readlink -f "${BASH_SOURCE[0]}")"
repo_dir="$(cd "$(dirname "$self")/../.." && pwd)"
# The home directory comes from the password database, not from $HOME.
home_dir="$(getent passwd "$(id -u)" 2>/dev/null | cut -d: -f6)"
[ -n "$home_dir" ] || home_dir="${HOME:-}"
[ -n "$home_dir" ] || { echo "run-bl: cannot determine the home directory" >&2; exit 78; }

HYDRA_DIR_EFF="$repo_dir"
SERVER_MARKER="$home_dir/.hydra-import-server"
LOCK_FILE="$home_dir/.hydra-run-bl.lock"
KILL_AFTER=60
stand_in_checks=0
if [ -n "$stand_in" ] || [ "$check_only" -eq 1 ]; then
  HYDRA_DIR_EFF="${HYDRA_DIR:-$HYDRA_DIR_EFF}"
  SERVER_MARKER="${HYDRA_SERVER_MARKER:-$SERVER_MARKER}"
  LOCK_FILE="${HYDRA_LOCK_FILE:-$LOCK_FILE}"
  KILL_AFTER="${HYDRA_KILL_AFTER_SECONDS:-$KILL_AFTER}"
  if [ "${HYDRA_STAND_IN_CHECKS:-0}" = "1" ]; then stand_in_checks=1; fi
fi
HOLDER_FILE="$LOCK_FILE.holder"
LOG_DIR="${HYDRA_LOG_DIR:-$home_dir/logs}"
KEEP_DAYS="${HYDRA_LOG_KEEP_DAYS:-30}"
MAX_SECONDS="${HYDRA_MAX_SECONDS:-0}"

for path in "$HYDRA_DIR_EFF" "$SERVER_MARKER" "$LOCK_FILE" "$LOG_DIR"; do
  case "$path" in
    /*) ;;
    *) echo "run-bl: paths in settings must be absolute, got \"$path\"" >&2; exit 78 ;;
  esac
done

export TZ="${TZ:-Europe/Warsaw}"
# Node's HTTP debug output prints request paths, and feed URLs carry credentials there.
unset NODE_DEBUG
# Never inherit the production unlock from the caller: it is set below, on the import
# command only, so a stand-in or anything else started here cannot receive it.
unset HA_ALLOW_PROD
# The mock switch may only come from .env.local, where the setup checks see it.
unset BASELINKER_MOCK

mkdir -p "$LOG_DIR" || { echo "run-bl: cannot create $LOG_DIR" >&2; exit 73; }
journal_file="$LOG_DIR/run-bl-$(date +%Y-%m).log"
tsx="$HYDRA_DIR_EFF/node_modules/.bin/tsx"
catalogue=""
have_lock=0
interactive=0
if [ -t 1 ] || [ "$check_only" -eq 1 ]; then interactive=1; fi

now() { date '+%F %T%z'; }

# One line per event in the monthly journal; echoed on manual runs and with --check.
journal() {
  local line
  line="$(now) $supplier $mode pid=$$ $*"
  printf '%s\n' "$line" >> "$journal_file" || { echo "run-bl: cannot write $journal_file" >&2; exit 73; }
  if [ "$interactive" -eq 1 ]; then printf '%s\n' "$line"; fi
  return 0
}

# Cron reports only what is printed, so problems must not stay in the journal alone.
complain() {
  if [ "$interactive" -eq 0 ]; then printf 'run-bl: %s %s: %s\n' "$supplier" "$mode" "$*" >&2; fi
  return 0
}

fail() {
  local code="$1"
  shift
  journal "ERROR $*"
  complain "$*"
  if [ "$have_lock" -eq 1 ]; then : > "$HOLDER_FILE"; fi
  exit "$code"
}

# A setting that cannot be understood must not silently turn into "no limit" or "30 days".
# Digits only, at most seven of them; the value itself is not echoed (it is free text).
case "$KEEP_DAYS" in ''|*[!0-9]*|????????*) fail 78 "HYDRA_LOG_KEEP_DAYS must be a whole number of days (digits only, e.g. 30) — nothing was run" ;; esac
case "$MAX_SECONDS" in ''|*[!0-9]*|????????*) fail 78 "HYDRA_MAX_SECONDS must be whole seconds (digits only, e.g. 5400) — nothing was run" ;; esac
case "$KILL_AFTER" in ''|*[!0-9]*|????????*) fail 78 "HYDRA_KILL_AFTER_SECONDS must be whole seconds (digits only) — nothing was run" ;; esac
KEEP_DAYS=$((10#$KEEP_DAYS))
MAX_SECONDS=$((10#$MAX_SECONDS))
KILL_AFTER=$((10#$KILL_AFTER))
limit_text="none"
if [ "$MAX_SECONDS" -gt 0 ]; then limit_text="${MAX_SECONDS}s"; fi

command -v flock >/dev/null 2>&1 || fail 69 "flock not found (util-linux)"

# Setup checks of a real run. Everything here must hold before the import may start.
# The patterns follow dotenv: optional "export", spaces around the separator, "=" or ":".
check_setup() {
  local env_file="$HYDRA_DIR_EFF/.env.local" key_prefix='^[[:space:]]*(export[[:space:]]+)?' env_mode expected line
  # An AI coding agent session marks its shell with this variable. The agent guard hook
  # does not know this wrapper, so the wrapper itself refuses to work for an agent.
  [ -z "${CLAUDECODE:-}" ] \
    || fail 78 "started from an AI coding agent session (CLAUDECODE is set) — the import is never started from there"
  [ -e "$SERVER_MARKER" ] \
    || fail 78 "this machine is not marked as the import server ($SERVER_MARKER is missing) — the import was not started"
  expected="$(sed -nE 's/^[[:space:]]*inventory[[:space:]]*=[[:space:]]*([0-9]+)[[:space:]]*$/\1/p' "$SERVER_MARKER" 2>/dev/null | tail -n 1)"
  [ -n "$expected" ] \
    || fail 78 "$SERVER_MARKER does not name the catalogue — it must contain a line inventory=<BaseLinker catalogue ID>"
  [ -f "$env_file" ] || fail 78 "$env_file not found"
  [ -r "$env_file" ] || fail 78 "$env_file is not readable by $(id -un)"
  # The import loads .env.local with override, so an unlock stored there would be permanent.
  if grep -Eq "${key_prefix}HA_ALLOW_PROD[[:space:]]*[=:]" "$env_file"; then
    fail 78 "the production unlock is stored in $env_file — remove that line, it must be per run only"
  fi
  # With the mock switched on nothing is written, yet the import reports products as created.
  if grep -Eqi "${key_prefix}BASELINKER_MOCK[[:space:]]*[=:][[:space:]]*[\"'\`]?true" "$env_file"; then
    fail 78 "BASELINKER_MOCK is true in $env_file — the import would report success without writing anything"
  fi
  # Without this variable the import falls back to a hard-coded catalogue ID
  # (scripts/xml-to-baselinker.ts). The last line wins, as in dotenv.
  line="$(grep -E "${key_prefix}BASELINKER_INVENTORY_ID[[:space:]]*[=:]" "$env_file" | tail -n 1)"
  catalogue="$(printf '%s\n' "$line" | sed -nE "s/${key_prefix}BASELINKER_INVENTORY_ID[[:space:]]*[=:][[:space:]]*[\"'\`]?([0-9]+)[\"'\`]?[[:space:]]*(#.*)?\$/\2/p")"
  [ -n "$catalogue" ] \
    || fail 78 "BASELINKER_INVENTORY_ID is not set to a number in $env_file — the import would write to a default catalogue"
  [ "$catalogue" = "$expected" ] \
    || fail 78 "catalogue mismatch: $env_file says $catalogue, the server marker says $expected — the import was not started"
  [ -x "$tsx" ] || fail 78 "$tsx not found — run npm ci in $HYDRA_DIR_EFF"
  command -v node >/dev/null 2>&1 || fail 78 "node is not on PATH ($PATH)"
  env_mode="$(stat -c '%a' "$env_file" 2>/dev/null)"
  [ "$env_mode" = "600" ] || journal "WARN $env_file has mode ${env_mode:-?}, expected 600"
}

# One switch decides for --check and for a real run, so the self-test of --check also
# proves that a run without --cmd goes through the checks.
run_checks=1
if [ -n "$stand_in" ] && [ "$stand_in_checks" -eq 0 ]; then run_checks=0; fi
if [ "$run_checks" -eq 1 ]; then check_setup; fi

if [ -n "$stand_in" ]; then
  cmd=(bash -c "$stand_in")
else
  cmd=("$tsx" scripts/xml-to-baselinker.ts "$supplier" "$mode")
fi

if [ "$check_only" -eq 1 ]; then
  journal "CHECK ok — nothing was run. A real run would start in $HYDRA_DIR_EFF: ${cmd[*]} (catalogue $catalogue, limit $limit_text, lock $LOCK_FILE)"
  exit 0
fi

# The lock lives on file descriptor 9 and is inherited by the command, so it stays held
# for as long as any process of the run is alive. Who holds it is kept in a side file:
# the lock file itself is never written.
exec 9>>"$LOCK_FILE" || fail 73 "cannot open lock file $LOCK_FILE"
if ! flock -n 9; then
  holder="$(head -n 1 "$HOLDER_FILE" 2>/dev/null)"
  since="$(printf '%s\n' "$holder" | sed -nE 's/.* epoch=([0-9]+)$/\1/p')"
  running=""
  if [ -n "$since" ]; then running=", running $(( ($(date +%s) - since) / 60 )) min"; fi
  journal "SKIP lock held by another run — skipping${holder:+ (holder: ${holder% epoch=*}$running)}"
  exit 0
fi
have_lock=1
stale="$(head -n 1 "$HOLDER_FILE" 2>/dev/null)"
if [ -n "$stale" ]; then journal "WARN the previous run did not end cleanly: ${stale% epoch=*}"; fi
printf '%s %s pid=%s since %s epoch=%s\n' "$supplier" "$mode" "$$" "$(now)" "$(date +%s)" > "$HOLDER_FILE" \
  || fail 73 "cannot write $HOLDER_FILE"

# Retention: only files this wrapper names itself — exact shapes, digit by digit.
if [ "$KEEP_DAYS" -gt 0 ]; then
  d='[0-9]'
  stamp="$d$d$d$d$d$d$d$d-$d$d$d$d$d$d"
  own=( -name "run-bl-$d$d$d$d-$d$d.log" )
  for s in kolba sharg spechurt; do
    for m in import sync; do
      own+=( -o -name "$s-$m-$stamp.log" -o -name "$s-$m-$stamp-$d.log" -o -name "$s-$m-$stamp-$d$d.log" )
    done
  done
  find "$LOG_DIR/" -maxdepth 1 -type f \( "${own[@]}" \) -mtime +"$((KEEP_DAYS - 1))" -delete 2>/dev/null
fi

# One log file per run, also when two runs start within the same second.
run_log="$LOG_DIR/$supplier-$mode-$(date +%Y%m%d-%H%M%S).log"
log_base="${run_log%.log}"
n=2
while [ -e "$run_log" ]; do
  run_log="$log_base-$n.log"
  n=$((n + 1))
done

cd "$HYDRA_DIR_EFF" || fail 78 "cannot cd to $HYDRA_DIR_EFF"

commit="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
kind=""
if [ -n "$stand_in" ]; then kind=" what=stand-in"; fi
started="$SECONDS"
journal "START${catalogue:+ catalogue=$catalogue} commit=$commit limit=$limit_text log=$run_log$kind"
printf '=== %s run-bl start: %s %s (pid %s, commit %s)\n' "$(now)" "$supplier" "$mode" "$$" "$commit" >> "$run_log" \
  || fail 73 "cannot write $run_log"
if [ -n "$stand_in" ]; then
  printf '=== stand-in command (--cmd): the import is not run and the production unlock is not passed\n' >> "$run_log"
fi

child=""
target=""
stop_reason=""
stop_at=0
request_stop() {
  [ -z "$stop_reason" ] || return 0
  stop_reason="$1"
  stop_at="$SECONDS"
  journal "STOP $1 — stopping the run"
  if [ -n "$target" ]; then kill -TERM -- "$target" 2>/dev/null; fi
  return 0
}
trap 'request_stop signal-TERM' TERM
trap 'request_stop signal-INT' INT
trap 'request_stop signal-HUP' HUP

# Job control puts the command into its own process group, so a signal or the time limit
# reaches the whole tree (tsx starts node as a child) and nothing of it can outlive END.
set -m
if [ -n "$stand_in" ]; then
  "${cmd[@]}" >> "$run_log" 2>&1 < /dev/null &
else
  # The unlock is an environment assignment on this one command — not exported.
  HA_ALLOW_PROD=1 "${cmd[@]}" >> "$run_log" 2>&1 < /dev/null &
fi
child=$!
set +m
if kill -0 -- "-$child" 2>/dev/null; then target="-$child"; else target="$child"; fi
if [ -n "$stop_reason" ]; then kill -TERM -- "$target" 2>/dev/null; fi

# The shell reports a job killed by a signal on its own stderr; the journal says it already.
exec 8>&2 2>/dev/null
while kill -0 -- "$target" 2>/dev/null; do
  if [ -z "$stop_reason" ] && [ "$MAX_SECONDS" -gt 0 ] && [ $((SECONDS - started)) -ge "$MAX_SECONDS" ]; then
    request_stop "limit-${MAX_SECONDS}s"
  fi
  if [ -n "$stop_reason" ] && [ $((SECONDS - stop_at)) -ge "$KILL_AFTER" ]; then
    kill -KILL -- "$target" 2>/dev/null
  fi
  if [ $((SECONDS - started)) -lt 3 ]; then sleep 0.1; else sleep 1; fi
done
wait "$child"
rc=$?
exec 2>&8 8>&-

elapsed=$((SECONDS - started))
note=""
if [ -n "$stop_reason" ]; then
  note=" stopped-by=$stop_reason"
  case "$stop_reason" in limit-*) rc=124 ;; esac
elif [ "$rc" -gt 128 ]; then
  note=" killed-by-signal=$((rc - 128))"
fi
printf '\n=== %s run-bl end: %s %s (exit %s, %ss)%s\n' "$(now)" "$supplier" "$mode" "$rc" "$elapsed" "$note" >> "$run_log"

# The import exits 0 even when products failed, so its own summary goes into the journal.
# The patterns are fixed text and digits: nothing else from the log can ride along.
result="$(grep -aoE 'Import done: [0-9]+ created, [0-9]+ updated, [0-9]+ errors|Sync done: [0-9]+ products refreshed' "$run_log" 2>/dev/null | tail -n 1)"
if [ -z "$result" ]; then
  result="$(grep -aoE 'Matched [0-9]+ products, [0-9]+ not in BL yet|Nothing to (import|sync)\.' "$run_log" 2>/dev/null | tail -n 1)"
fi
# Feed URLs carry credentials as query parameters. The import strips them from its own
# messages, but an error text from a library can still quote a URL — count such lines.
url_credentials="$(grep -acE '(key|token|client)=' "$run_log" 2>/dev/null)"
journal "END exit=$rc duration=${elapsed}s$note url-credentials=${url_credentials:-?} result=\"${result:-none}\" log=$run_log$kind"
if [ "${url_credentials:-0}" != "0" ]; then
  journal "WARN ${url_credentials:-?} line(s) of the run log look like a URL with credentials — read it, then delete the file"
fi
if [ "$rc" -ne 0 ]; then complain "run ended with exit $rc$note — see $run_log"; fi
: > "$HOLDER_FILE"
exit "$rc"
