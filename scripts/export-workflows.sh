#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"
TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
EXPORT_DIRECTORY="${PROJECT_ROOT}/n8n/exports/${TIMESTAMP}"

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

if ! compose ps --status running --services | grep -qx n8n; then
  printf 'n8n is not running. Start the local stack first.\n' >&2
  exit 1
fi

mkdir -p "${EXPORT_DIRECTORY}"

export_workflow() {
  local workflow_id="$1"
  local output_name="$2"
  local container_file="/tmp/${workflow_id}-export.json"

  compose exec -T n8n \
    n8n export:workflow \
    --id="${workflow_id}" \
    --pretty \
    --output="${container_file}" >/dev/null
  compose cp "n8n:${container_file}" "${EXPORT_DIRECTORY}/${output_name}" >/dev/null
}

export_workflow "phase3StartHere" "00-start-here-project-partner.json"
export_workflow "phase4TaskSetup" "10-setup-local-task-data.json"
export_workflow "phase5SyncEnabledSkills" "11-setup-sync-enabled-skills.json"
export_workflow "phase4ListTasks" "20-tool-list-tasks.json"
export_workflow "phase4CreateTask" "21-tool-create-task.json"
export_workflow "phase4UpdateTaskStatus" "22-tool-update-task-status.json"
export_workflow "phase5ProposeCreateTask" "30-tool-propose-create-task.json"
export_workflow "phase5ProposeTaskStatus" "31-tool-propose-update-task-status.json"
export_workflow "phase5ConfirmTaskWrite" "40-confirm-task-write.json"
export_workflow "phase3AgentHealth" "90-debug-agent-health.json"

printf 'Workflow copies exported to:\n  %s\n' "${EXPORT_DIRECTORY}"
printf 'This folder is ignored by Git. Review credential references and the diff before replacing canonical workflow files.\n'
