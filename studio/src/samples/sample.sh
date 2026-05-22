#!/usr/bin/env bash
# Demo shell script — exercises a range of bash syntax for theme testing.
set -euo pipefail
IFS=$'\n\t'

# --- variables & expansion ---
readonly VERSION="1.11.9"
readonly NAME="paddy-studio"
COUNT=0
PADDY_HOME="${HOME}/.paddy"
declare -A USERS=( [alice]=42 [bob]=17 [carol]=99 )

# --- functions ---
log() {
    local level="$1"; shift
    printf '%s [%s] %s\n' "$(date +%H:%M:%S)" "${level}" "$*" >&2
}

warn()  { log WARN  "$*"; }
fatal() { log FATAL "$*"; exit 1; }

trap 'log INFO "exiting"' EXIT
trap 'fatal "interrupted"' INT TERM

# --- argument parsing ---
DRY_RUN=0
VERBOSE=0
while [[ $# -gt 0 ]]; do
    case "$1" in
        -n|--dry-run) DRY_RUN=1; shift ;;
        -v|--verbose) VERBOSE=1; shift ;;
        -h|--help)
            cat <<-EOF
				Usage: ${0##*/} [options] <target>
				  -n, --dry-run    don't actually do anything
				  -v, --verbose    extra logging
				  -h, --help       show this help
			EOF
            exit 0
            ;;
        --) shift; break ;;
        -*) fatal "unknown flag: $1" ;;
        *)  break ;;
    esac
done

TARGET="${1:-default}"

# --- arithmetic & tests ---
if (( DRY_RUN )); then
    warn "dry-run mode"
fi

if [[ -d "${PADDY_HOME}" && -r "${PADDY_HOME}/config" ]]; then
    log INFO "reading config from ${PADDY_HOME}/config"
    # shellcheck disable=SC1090
    source "${PADDY_HOME}/config"
fi

# --- loops & arrays ---
for name in "${!USERS[@]}"; do
    score="${USERS[$name]}"
    if (( score > 50 )); then
        printf '  %-10s %3d ★\n' "$name" "$score"
        ((COUNT++))
    fi
done

# --- command substitution & pipes ---
files=$(find . -type f -name '*.json' 2>/dev/null | head -5)
echo "${files}" | while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    bytes=$(wc -c < "$f")
    log INFO "$f → ${bytes} bytes"
done

# --- heredoc ---
cat <<-MSG
	${NAME} ${VERSION}
	matched ${COUNT}/${#USERS[@]} users above threshold
	target: ${TARGET}
MSG

exit 0
