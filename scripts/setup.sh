#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
    return
  fi

  od -An -N32 -tx1 /dev/urandom | tr -d ' \n'
}

compose() {
  docker compose \
    --project-directory "${PROJECT_ROOT}" \
    --env-file "${ENV_FILE}" \
    -f "${PROJECT_ROOT}/compose.yaml" \
    "$@"
}

env_value() {
  local key="$1"
  local fallback="$2"
  local value=""

  value="$(sed -n "s/^${key}=//p" "${ENV_FILE}" | tail -n 1)"
  printf '%s' "${value:-${fallback}}"
}

set_encryption_key() {
  local encryption_key="$1"
  local temporary_file=""

  temporary_file="$(mktemp "${PROJECT_ROOT}/.env.tmp.XXXXXX")"
  awk -v encryption_key="${encryption_key}" '
    BEGIN { replaced = 0 }
    /^N8N_ENCRYPTION_KEY=/ {
      print "N8N_ENCRYPTION_KEY=" encryption_key
      replaced = 1
      next
    }
    { print }
    END {
      if (!replaced) {
        print "N8N_ENCRYPTION_KEY=" encryption_key
      }
    }
  ' "${ENV_FILE}" >"${temporary_file}"
  chmod 600 "${temporary_file}"
  mv "${temporary_file}" "${ENV_FILE}"
}

if [[ ! -f "${ENV_FILE}" ]]; then
  umask 077
  ENCRYPTION_KEY="$(generate_secret)"
  {
    printf 'COMPOSE_PROJECT_NAME=ai-solopreneur\n'
    printf 'CHAT_PORT=3000\n'
    printf 'N8N_PORT=5678\n'
    printf 'GENERIC_TIMEZONE=Australia/Melbourne\n'
    printf 'N8N_ENCRYPTION_KEY=%s\n' "${ENCRYPTION_KEY}"
  } >"${ENV_FILE}"
  chmod 600 "${ENV_FILE}"
  printf 'Created a private .env file with a generated n8n encryption key.\n'
else
  EXISTING_KEY="$(env_value N8N_ENCRYPTION_KEY '')"
  if [[ "${#EXISTING_KEY}" -lt 32 || "${EXISTING_KEY}" == replace-* ]]; then
    set_encryption_key "$(generate_secret)"
    printf 'Replaced the example encryption-key placeholder with a private generated key.\n'
  else
    printf 'Using the existing private .env file.\n'
  fi
fi

"${PROJECT_ROOT}/scripts/preflight.sh"

printf '\nDownloading the pinned local images...\n'
compose pull n8n

printf '\nBuilding the local chat app...\n'
compose build chat

printf '\nStarting AI Solopreneur...\n'
compose up -d --wait --wait-timeout 240

CHAT_PORT="$(env_value CHAT_PORT 3000)"
N8N_PORT="$(env_value N8N_PORT 5678)"

curl --fail --silent --show-error "http://127.0.0.1:${CHAT_PORT}/health" >/dev/null
curl --fail --silent --show-error "http://127.0.0.1:${N8N_PORT}/healthz" >/dev/null

printf '\nLocal stack is healthy.\n'
printf '  Chat app:          http://localhost:%s\n' "${CHAT_PORT}"
printf '  n8n editor:       http://localhost:%s\n' "${N8N_PORT}"
