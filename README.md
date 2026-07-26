# AI Solopreneur

AI Solopreneur is a beginner-friendly template for building a useful local AI agent without starting from a blank codebase.

The first release will combine:

- A team-owned browser chat interface.
- A visual n8n agent workflow.
- Claude API integration.
- Local conversation memory.
- A small, safe set of project-management skills and tools.
- Docker-based local startup on macOS and Windows.

## Current milestone

The current milestone is **local-first**. Learners will run the complete project on their own computer before the project adds cloud deployment or external chat channels.

The default teaching scenario is a **Solo Project Assistant** that can help plan work, list locally stored tasks, propose new tasks, and update task status after explicit confirmation.

### Included in the first release

- Local Docker Compose environment.
- Custom browser chat.
- Visual n8n agent workflow.
- Claude credential stored in n8n.
- Local task data and conversation memory.
- Markdown skills.
- Read-only and confirmation-gated task tools.
- Beginner installation, customisation, and troubleshooting guides.

### Deliberately deferred

- Cloud deployment.
- Slack, WhatsApp, Telegram, and email.
- Multi-user accounts and OAuth.
- External project-management services.
- PostgreSQL, Redis, queues, and horizontal scaling.
- File uploads, RAG, vector databases, MCP, and multiple agents.
- Background autonomous work, billing, and production operations.

## Documentation

- [Product baseline](docs/PRODUCT_BASELINE.md)
- [Chat API contract](docs/CHAT_CONTRACT.md)
- [Customise the chat](docs/CUSTOMISE_CHAT.md)
- [Workshop prerequisites](docs/WORKSHOP_PREREQUISITES.md)
- [Local setup](docs/LOCAL_SETUP.md)
- [Connect the visual n8n agent to Claude](docs/N8N_AGENT_SETUP.md)
- [Understand and extend the local task tools](docs/LOCAL_TASK_TOOLS.md)
- [Customise the agent with Markdown skills](docs/CUSTOMISE_SKILLS.md)
- [Understand safe write confirmation](docs/SAFE_WRITE_CONFIRMATION.md)
- [Local operations and recovery](docs/LOCAL_OPERATIONS.md)
- [Local troubleshooting](docs/TROUBLESHOOTING.md)
- [Phased implementation plan](docs/IMPLEMENTATION_PLAN.md)

## Start the local app

Before starting, install Docker Desktop and wait until its engine is running.

### macOS

Double-click `setup.command`.

### Windows

Double-click `setup-windows.cmd`.

The first setup:

1. Generates a private local encryption key.
2. Checks Docker and the required localhost ports.
3. Downloads the pinned n8n image and builds the chat image.
4. Starts n8n and the chat app.
5. Waits until both services are healthy.

Then open:

- Chat app: [http://localhost:3000](http://localhost:3000)
- n8n editor: [http://localhost:5678](http://localhost:5678)

Technical contributors can run:

```bash
./scripts/setup.sh
```

## Connect the agent

After both services are healthy:

1. Create the local n8n owner account at [http://localhost:5678](http://localhost:5678).
2. Import the supplied workflows and local sample data:
   - macOS: double-click `import-workflows.command`.
   - Windows: double-click `import-workflows-windows.cmd`.
3. Follow [Connect the visual n8n agent to Claude](docs/N8N_AGENT_SETUP.md) to add an Anthropic API credential and publish the workflows.
4. Send the first message from the chat app.
5. Change one enabled Markdown skill using [CUSTOMISE_SKILLS.md](docs/CUSTOMISE_SKILLS.md).

## Current status

Phase 0 defines the product and teaching baseline. Phase 1 provides the local Docker foundation, persistent n8n data, lifecycle scripts, and recovery guidance. Phase 2 adds the learner-built chat interface, a TypeScript gateway, a stable API contract, safe error handling, and one-file customisation. Phase 3 adds the visual n8n agent, Claude connection, per-conversation memory, safe validation, workflow import and export helpers, and an isolated automated smoke test. Phase 4 adds local task and audit Data Tables, three narrow tool subworkflows, sample data, strict validation, and idempotent writes. Phase 5 adds reusable Markdown skills, a machine-readable tool-risk policy, and exact confirmation for task writes.

The agent can retrieve factual local tasks automatically and prepare create or status-update proposals. A task changes only when the same browser conversation sends the exact `CONFIRM XXXXXXXX` phrase within five minutes; each phrase is single-use. Delete, archive, and bulk-change capabilities remain unavailable.
