#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"
WORKFLOW_PATH="/opt/ai-solopreneur/workflows"
SETUP_WORKFLOW_ID="phase4TaskSetup"
LIST_TOOL_WORKFLOW_ID="phase4ListTasks"
SETUP_PUBLISHED=0

compose() {
  docker compose \
    --project-directory "${PROJECT_ROOT}" \
    --env-file "${ENV_FILE}" \
    -f "${PROJECT_ROOT}/compose.yaml" \
    "$@"
}

cleanup_setup_webhook() {
  if [[ "${SETUP_PUBLISHED}" == "1" ]]; then
    printf '\nRemoving the temporary local setup webhook...\n'
    compose exec -T n8n \
      n8n unpublish:workflow --id="${SETUP_WORKFLOW_ID}" >/dev/null 2>&1 || true
    compose restart n8n >/dev/null 2>&1 || true
    compose up -d --wait --wait-timeout 240 n8n >/dev/null 2>&1 || true
  fi
}

if [[ ! -f "${ENV_FILE}" ]]; then
  printf 'Local setup has not been completed. Run ./setup.command first.\n' >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  printf 'Docker Desktop is not running.\n' >&2
  exit 1
fi

if [[ -z "${N8N_PORT:-}" ]]; then
  N8N_PORT="$(sed -n 's/^N8N_PORT=//p' "${ENV_FILE}" | tail -n 1)"
fi
N8N_PORT="${N8N_PORT:-5678}"

printf 'Checking the workflow exports...\n'
docker run --rm \
  -v "${PROJECT_ROOT}:/workspace:ro" \
  -w /workspace \
  node:24.16.0-alpine3.22 \
  node scripts/validate-workflows.mjs

printf '\nStarting n8n...\n'
compose up -d --wait --wait-timeout 240 n8n

printf '\nImporting the reviewed workflows as inactive drafts...\n'
compose exec -T n8n \
  n8n import:workflow --separate --input="${WORKFLOW_PATH}"

printf '\nPreparing the local task tables and read-only tool...\n'
compose exec -T n8n \
  n8n publish:workflow --id="${SETUP_WORKFLOW_ID}" >/dev/null
SETUP_PUBLISHED=1
trap cleanup_setup_webhook EXIT INT TERM
compose exec -T n8n \
  n8n publish:workflow --id="${LIST_TOOL_WORKFLOW_ID}" >/dev/null

compose restart n8n >/dev/null
compose up -d --wait --wait-timeout 240 n8n >/dev/null

setup_response="$(
  curl --fail --silent --show-error \
    -X POST "http://127.0.0.1:${N8N_PORT}/webhook/setup-task-data"
)"
if [[ "${setup_response}" != *'"ok":true'* ]]; then
  printf 'Local task setup returned an unexpected response: %s\n' \
    "${setup_response}" >&2
  exit 1
fi

compose exec -T n8n \
  n8n unpublish:workflow --id="${SETUP_WORKFLOW_ID}" >/dev/null
SETUP_PUBLISHED=0
trap - EXIT INT TERM

printf '\nRestarting n8n so the imported drafts appear in the editor...\n'
compose restart n8n >/dev/null
compose up -d --wait --wait-timeout 240 n8n >/dev/null

printf '\nWorkflows imported successfully.\n'
printf 'Local task tables and three sample tasks are ready.\n'
printf 'Open http://localhost:%s and follow docs/N8N_AGENT_SETUP.md.\n' "${N8N_PORT}"
printf 'The main agent stays inactive until you select your Anthropic credential and publish it.\n'
