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
- [Workshop prerequisites](docs/WORKSHOP_PREREQUISITES.md)
- [Local setup](docs/LOCAL_SETUP.md)
- [Local operations and recovery](docs/LOCAL_OPERATIONS.md)
- [Local troubleshooting](docs/TROUBLESHOOTING.md)
- [Phased implementation plan](docs/IMPLEMENTATION_PLAN.md)

## Start the local foundation

Before starting, install Docker Desktop and wait until its engine is running.

### macOS

Double-click `setup.command`.

### Windows

Double-click `setup-windows.cmd`.

The first setup:

1. Generates a private local encryption key.
2. Checks Docker and the required localhost ports.
3. Downloads pinned container images.
4. Starts n8n and the chat foundation.
5. Waits until both services are healthy.

Then open:

- Chat foundation: [http://localhost:3000](http://localhost:3000)
- n8n editor: [http://localhost:5678](http://localhost:5678)

Technical contributors can run:

```bash
./scripts/setup.sh
```

## Current status

Phase 0 defines the product and teaching baseline. Phase 1 provides the local Docker foundation, persistent n8n data, health checks, lifecycle scripts, backup and restore, and cross-platform setup guidance.

The learner-built chat interface and Claude agent workflow are implemented in later phases.
