# Local Setup

## Outcome

At the end of setup, two local services will be healthy:

- The chat app at [http://localhost:3000](http://localhost:3000).
- The n8n editor at [http://localhost:5678](http://localhost:5678).

Both services run in Docker. Nothing is published to the internet.

## Before starting

You need:

- A supported macOS or Windows computer.
- Docker Desktop installed.
- Docker Desktop open and reporting that its engine is running.
- This repository on the computer.

The complete preparation checklist is in [WORKSHOP_PREREQUISITES.md](WORKSHOP_PREREQUISITES.md).

## macOS setup

1. Open Docker Desktop.
2. Wait until Docker says it is running.
3. Open the repository folder in Finder.
4. Double-click `setup.command`.
5. If macOS asks for confirmation, allow the local script to run.
6. Wait for the terminal window to report `Local stack is healthy`.
7. Open [http://localhost:3000](http://localhost:3000).
8. Open [http://localhost:5678](http://localhost:5678).

If macOS will not open the command file, Control-click it, select **Open**, then confirm.

## Windows setup

1. Open Docker Desktop.
2. Wait until Docker says it is running.
3. Open the repository folder in File Explorer.
4. Double-click `setup-windows.cmd`.
5. Wait for the window to report `Local stack is healthy`.
6. Press a key when prompted to close the setup window.
7. Open [http://localhost:3000](http://localhost:3000).
8. Open [http://localhost:5678](http://localhost:5678).

The Windows wrapper runs the included PowerShell setup script without requiring the learner to change their permanent PowerShell execution policy.

## First n8n visit

On the first visit to n8n:

1. Create the local n8n owner account.
2. Use a password that is not shared with another team.
3. Store the password privately.
4. Import the supplied workflows before adding the Claude credential.

The n8n owner account exists only in this local Docker volume.

## What setup creates

The setup script creates a `.env` file containing:

- The local Compose project name.
- Chat and n8n localhost ports.
- The configured timezone.
- A randomly generated n8n encryption key.

The real `.env` file is ignored by Git. Do not copy its values into `.env.example`, screenshots, issues, or chat messages.

The script then:

1. Validates Docker and Docker Compose.
2. Validates the Compose configuration.
3. Checks whether ports 3000 and 5678 are available.
4. Pulls the pinned n8n image and builds the TypeScript chat image.
5. Starts n8n.
6. Waits for n8n to become healthy.
7. Starts the chat app.
8. Confirms both local health endpoints.

## Local-only networking

Docker publishes both services to `127.0.0.1`:

- `127.0.0.1:3000`
- `127.0.0.1:5678`

Other computers on the local network cannot connect through these port mappings. This is a local learning environment, not a public deployment.

## Changing ports

If another application needs port 3000 or 5678:

1. Stop the local stack.
2. Open `.env` in a text editor.
3. Change `CHAT_PORT` or `N8N_PORT`.
4. Save the file.
5. Start the stack again.

When a port changes, use the matching new localhost address in the browser.

## Technical setup

Technical contributors can use:

```bash
./scripts/setup.sh
```

The underlying Compose command uses the repository's `.env` and `compose.yaml`; a host installation of Node.js or n8n is not required.

The chat image compiles TypeScript during setup. Learners do not need to install Node.js or run an npm command.

## Expected success

Setup is successful only when:

- The setup command exits successfully.
- `docker compose ps` reports `chat` and `n8n` as healthy.
- `http://localhost:3000/health` returns `{"status":"ok"}`.
- `http://localhost:5678/healthz` returns a successful response.
- Restarting the stack preserves the local n8n owner and saved settings.

If any check fails, use [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Make the chat your own

After setup, follow [CUSTOMISE_CHAT.md](CUSTOMISE_CHAT.md) to change the agent name, welcome message, colour, and example prompts. Those beginner-facing settings update after a browser refresh and do not require an image rebuild.

## Connect the agent

When setup and customisation are complete, follow [N8N_AGENT_SETUP.md](N8N_AGENT_SETUP.md). It walks through importing the visual workflow, storing the Anthropic API key safely in n8n, publishing the workflow, and sending a first message.
