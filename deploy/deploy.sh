#!/usr/bin/env bash
# Deploys a new `web` image on the Home server when its digest changes, and rolls back
# to the previous digest when the new container is not healthy within the time limit.
#
# Reference copy: install it on the server by hand (see README.md, "Deploy on the Home
# server"). It only updates the image; compose.yaml and this script change by hand.
#
# Configuration comes from the environment (the systemd unit loads it from an env file):
#   COMPOSE_DIR   directory holding compose.yaml (required)
#   NTFY_URL      ntfy topic URL for failure pushes, e.g. https://ntfy.sh/<topic>
#   STATE_DIR     where bad digests are remembered (default: $STATE_DIRECTORY from
#                 systemd, else /var/lib/portfolio-deploy)
#   SERVICE       compose service to deploy (default: web)
#   WAIT_TIMEOUT  seconds the new container gets to become healthy (default: 60)
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: deploy.sh [--dry-run]

Pulls the service's image and recreates the container only when the digest changed.
If the new container is not healthy in time, restarts the previous digest, marks the
new digest bad so later runs skip it, sends an ntfy push and exits non-zero.

  -n, --dry-run   print what would happen without pulling or changing anything
  -h, --help      show this help
EOF
}

dry_run=false
while (($# > 0)); do
  case "$1" in
    -n | --dry-run) dry_run=true ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 2
      ;;
  esac
  shift
done

: "${COMPOSE_DIR:?Set COMPOSE_DIR to the directory that holds compose.yaml}"
NTFY_URL="${NTFY_URL:-}"
STATE_DIR="${STATE_DIR:-${STATE_DIRECTORY:-/var/lib/portfolio-deploy}}"
SERVICE="${SERVICE:-web}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-60}"
bad_digests="$STATE_DIR/bad-digests"

log() { printf '%s\n' "$*"; }

# Sends an ntfy push. A failed push is logged but never hides the deploy's own result.
notify() {
  local title="$1" message="$2"
  if [[ -z "$NTFY_URL" ]]; then
    log "NTFY_URL is not set; no push sent."
    return 0
  fi
  curl --fail --silent --show-error --max-time 10 \
    --header "Title: $title" --header "Priority: high" --header "Tags: warning" \
    --data "$message" "$NTFY_URL" >/dev/null ||
    log "Could not send the ntfy push."
}

# The digest part (sha256:...) of an image's first repo digest. The image is a manifest
# list, so the repo digest, not the image ID, is what identifies a published version.
repo_digest() {
  local digest
  digest="$(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$1" | head -n 1)"
  printf '%s' "${digest##*@}"
}

running_digest() {
  local container
  container="$(docker compose ps -q "$SERVICE")"
  if [[ -z "$container" ]]; then return 0; fi
  repo_digest "$(docker inspect --format '{{.Image}}' "$container")"
}

is_bad() {
  [[ -f "$bad_digests" ]] && grep -qxF "$1" "$bad_digests"
}

mark_bad() {
  mkdir -p "$STATE_DIR"
  printf '%s\n' "$1" >>"$bad_digests"
}

# Recreates the service and waits for its healthcheck. An optional image tag (which may
# pin a digest as `<tag>@sha256:...`) overrides IMAGE_TAG for this run only, so
# compose.yaml stays the source of the service's configuration.
up() {
  local -a env=()
  if (($# > 0)); then env=("IMAGE_TAG=$1"); fi
  # compose's own --wait-timeout should fire first; `timeout` is the backstop for a
  # compose that hangs anyway.
  env "${env[@]}" timeout "$((WAIT_TIMEOUT + 5))" \
    docker compose up --detach --wait --wait-timeout "$WAIT_TIMEOUT" "$SERVICE"
}

cd "$COMPOSE_DIR"

ref="$(docker compose config --images "$SERVICE")"
tag="${ref%%@*}"
tag="${tag##*:}"
running="$(running_digest)"
log "Running: ${running:-nothing}."

if [[ "$dry_run" == true ]]; then
  # Ask the registry instead of pulling, so not even the local `:main` tag moves.
  new="$(docker buildx imagetools inspect --format '{{.Manifest.Digest}}' "$ref")"
else
  docker compose pull --quiet "$SERVICE"
  new="$(repo_digest "$ref")"
fi
if [[ -z "$new" ]]; then
  log "Could not read the digest of $ref." >&2
  exit 1
fi

if [[ "$new" == "$running" ]]; then
  log "No change: $ref is still $running."
  exit 0
fi
if is_bad "$new"; then
  log "Skipping $new: it was marked bad. Waiting for a newer image."
  exit 0
fi
if [[ "$dry_run" == true ]]; then
  log "Would deploy $new (pull, then up --wait with a ${WAIT_TIMEOUT}s limit)."
  log "On failure would mark it bad and roll back to ${running:-nothing}."
  exit 0
fi

log "Deploying $ref: ${running:-nothing} -> $new."
if up; then
  log "Deployed $new."
  exit 0
fi

mark_bad "$new"
log "$new did not become healthy within ${WAIT_TIMEOUT}s; marked bad." >&2

if [[ -z "$running" ]]; then
  notify "Portfolio deploy failed" \
    "$new did not become healthy within ${WAIT_TIMEOUT}s and there was no previous container to roll back to."
  exit 1
fi

if up "$tag@$running"; then
  log "Rolled back to $running."
  notify "Portfolio deploy rolled back" \
    "$new did not become healthy within ${WAIT_TIMEOUT}s. Rolled back to $running."
else
  log "Rollback to $running failed too." >&2
  notify "Portfolio deploy and rollback failed" \
    "$new did not become healthy within ${WAIT_TIMEOUT}s, and rolling back to $running failed too. The site may be down."
fi
exit 1
