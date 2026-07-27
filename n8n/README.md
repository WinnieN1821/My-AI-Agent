# n8n Workflows

This directory contains portable workflow exports for the local AI agent.

| File | Purpose |
| --- | --- |
| `workflows/00-start-here-project-partner.json` | Validates chat requests, calls Claude, keeps session memory, and returns the chat contract |
| `workflows/90-debug-agent-health.json` | Exposes a safe local health response without secrets |

The workflow exports contain a credential reference named `Anthropic account`, but no API key. After import, create or select a real Anthropic credential inside n8n.

Use the repository import script rather than editing JSON by hand:

```bash
./scripts/import-workflows.sh
```

Workflow setup and testing are documented in [N8N_AGENT_SETUP.md](../docs/N8N_AGENT_SETUP.md).
