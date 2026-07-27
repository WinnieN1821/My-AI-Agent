# n8n Workflows

This directory contains portable workflow exports for the local AI agent.

| File | Purpose |
| --- | --- |
| `workflows/00-start-here-project-partner.json` | Validates chat requests, calls Claude, keeps session memory, and returns the chat contract |
| `workflows/10-setup-local-task-data.json` | Idempotently creates the `tasks` and `tool_audit` tables and three sample tasks |
| `workflows/20-tool-list-tasks.json` | Validates filters, reads factual task rows, and audits the read |
| `workflows/21-tool-create-task.json` | Validates and idempotently creates one task; held back from the agent until confirmation exists |
| `workflows/22-tool-update-task-status.json` | Validates and changes only one task status; held back from the agent until confirmation exists |
| `workflows/90-debug-agent-health.json` | Exposes a safe local health response without secrets |

The workflow exports contain a credential reference named `Anthropic account`, but no API key. After import, create or select a real Anthropic credential inside n8n.

Use the repository import script rather than editing JSON by hand:

```bash
./scripts/import-workflows.sh
```

Workflow setup and testing are documented in [N8N_AGENT_SETUP.md](../docs/N8N_AGENT_SETUP.md). The task schema, audit boundary, and extension rules are in [LOCAL_TASK_TOOLS.md](../docs/LOCAL_TASK_TOOLS.md).
