#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"
WORKFLOW_PATH="/opt/ai-solopreneur/workflows"

compose() {
  docker compose \
    --project-directory "${PROJECT_ROOT}" \
    --env-file "${ENV_FILE}" \
    -f "${PROJECT_ROOT}/compose.yaml" \
    "$@"
}

if [[ ! -f "${ENV_FILE}" ]]; then
  printf 'Local setup has not been completed. Run ./setup.command first.\n' >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  printf 'Docker Desktop is not running.\n' >&2
  exit 1
fi

printf 'Checking the workflow exports...\n'
docker run --rm \
  -v "${PROJECT_ROOT}:/workspace:ro" \
  -w /workspace \
  node:24.16.0-alpine3.22 \
  node scripts/validate-workflows.mjs

printf '\nStarting n8n...\n'
compose up -d --wait --wait-timeout 240 n8n

printf '\nImporting the two Phase 3 workflows as inactive drafts...\n'
compose exec -T n8n \
  n8n import:workflow --separate --input="${WORKFLOW_PATH}"

printf '\nRestarting n8n so the imported drafts appear in the editor...\n'
compose restart n8n >/dev/null
compose up -d --wait --wait-timeout 240 n8n >/dev/null

N8N_PORT="$(sed -n 's/^N8N_PORT=//p' "${ENV_FILE}" | tail -n 1)"
printf '\nWorkflows imported successfully.\n'
printf 'Open http://localhost:%s and follow docs/N8N_AGENT_SETUP.md.\n' "${N8N_PORT:-5678}"
printf 'The workflows stay inactive until you select your Anthropic credential and publish them.\n'
