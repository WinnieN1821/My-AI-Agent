# Local Operations and Recovery

## Start

### macOS

Double-click `start.command`.

### Windows

Double-click `start-windows.cmd`.

Starting does not reset n8n. Existing local users, settings, credentials, and workflows remain in the Docker volume.

## Stop

### macOS

Double-click `stop.command`.

### Windows

Double-click `stop-windows.cmd`.

Stopping containers preserves local data and the private `.env` file.

## Check health

Open:

- [http://localhost:3000/health](http://localhost:3000/health)
- [http://localhost:5678/healthz](http://localhost:5678/healthz)
- [http://localhost:5678/webhook/agent-health](http://localhost:5678/webhook/agent-health) after the debug workflow is published

Technical contributors can also run:

```bash
docker compose ps
```

Both services should report `healthy`.

The first endpoint checks the chat service, the second checks n8n itself, and the third checks that n8n can run a published workflow. The workflow health response deliberately does not call Claude or expose credentials.

## Import the supplied workflows

Workflow import is safe to repeat. It imports the canonical repository files as inactive drafts so a learner can inspect them before publishing.

### macOS

Double-click `import-workflows.command`, or run:

```bash
./scripts/import-workflows.sh
```

### Windows

Double-click `import-workflows-windows.cmd`, or run:

```powershell
.\scripts\windows\import-workflows.ps1
```

After import, select the learner's `Anthropic account` credential in the Claude node and publish both workflows. See [N8N_AGENT_SETUP.md](N8N_AGENT_SETUP.md).

## Export workflow copies

Export after making a deliberate visual workflow change:

### macOS

```bash
./scripts/export-workflows.sh
```

### Windows

```powershell
.\scripts\windows\export-workflows.ps1
```

The scripts write timestamped copies below `n8n/exports/`. That directory is ignored by Git. Exports may contain credential references even though they do not contain the decrypted API key, so review them carefully before copying changes into `n8n/workflows/`.

## Conversation memory

The first workflow uses n8n Simple Memory:

- The browser's `sessionId` separates one conversation from another.
- The latest six interactions are supplied to the agent.
- Selecting **New conversation** in the browser creates a fresh session.
- Memory is held inside the running n8n process, not in the persistent Docker volume.
- Restarting or stopping n8n clears conversation memory.

Workflows, the n8n owner account, and encrypted credentials do persist across a normal restart. Durable conversation history is deliberately deferred from the local beginner release.

## Create a backup

A backup contains:

- The complete local n8n data directory.
- Local users and settings.
- Workflows and execution data.
- Encrypted credentials.
- A copy of the n8n encryption key required to decrypt those credentials.

Backups are written below `backups/YYYYMMDD-HHMMSS` and ignored by Git.

### macOS

From the repository directory:

```bash
./scripts/backup.sh
```

### Windows

From PowerShell in the repository directory:

```powershell
.\scripts\windows\backup.ps1
```

The backup script briefly stops n8n to produce a consistent SQLite and filesystem archive. If n8n was running before the backup, the script starts it again and waits for the stack to become healthy.

Treat the backup directory as a secret. Do not commit, upload, or share it casually.

## Restore a backup

Restore replaces all current local n8n data. Create a fresh backup first if the current state matters.

### macOS

```bash
./scripts/restore.sh backups/YYYYMMDD-HHMMSS
```

Type `RESTORE` when prompted.

### Windows

```powershell
.\scripts\windows\restore.ps1 -BackupDirectory .\backups\YYYYMMDD-HHMMSS
```

Type `RESTORE` when prompted.

Restore reinstates both the n8n volume data and the matching encryption key, then starts the stack and waits for healthy services.

## Reset all local n8n data

Reset permanently removes:

- The local n8n owner account.
- Credentials.
- Workflows.
- Execution history.
- Other data in the n8n Docker volume.

It preserves `.env`.

Create a backup first if any local state matters.

### macOS

```bash
./scripts/reset.sh
```

Type `RESET` when prompted.

### Windows

```powershell
.\scripts\windows\reset.ps1
```

Type `RESET` when prompted.

After reset, start the stack and create a new local n8n owner account.

## Update container versions

Container versions are intentionally pinned in `compose.yaml`. Do not change them during a live workshop.

To evaluate an update:

1. Create a backup.
2. Change the exact image tag on a separate branch.
3. Pull and start the stack.
4. Test setup, persistence, backup, restore, and the current workflows.
5. Record the tested version in the pull request.

Do not replace pinned tags with `latest`.

## Secret hygiene

- `.env` is ignored by Git.
- `backups/` content is ignored by Git.
- `.env.example` contains a placeholder, not a working key.
- The chat container has no n8n encryption key or Claude API key.
- The n8n encryption key is required only by the n8n service.
- Workflow exports can contain credential names and IDs, but never commit a manually created credential export or an API key.

If `.env` or a backup is exposed, replace the local credentials before using that instance again.
