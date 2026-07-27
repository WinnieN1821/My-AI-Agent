# Local Troubleshooting

## Docker command not found

Docker Desktop is not installed, has not finished installing, or its command is not on the system path.

Install Docker Desktop, restart the computer if requested, then rerun setup.

## Docker engine is not running

Open Docker Desktop and wait until it reports that the engine is running. The Docker application being installed is not enough; its engine must be active.

Then rerun:

- `setup.command` on macOS.
- `setup-windows.cmd` on Windows.

## Port 3000 or 5678 is already in use

Another application is listening on the required local port.

Either close that application or change the matching value in `.env`:

```dotenv
CHAT_PORT=3000
N8N_PORT=5678
```

After changing a port, use the new localhost address in the browser.

## The chat foundation does not open

1. Open [http://localhost:3000/health](http://localhost:3000/health).
2. Run the start script again.
3. Check that Docker Desktop is running.
4. Run `docker compose ps` if comfortable using a terminal.

The chat service starts only after n8n reports healthy.

## n8n does not open

1. Open [http://localhost:5678/healthz](http://localhost:5678/healthz).
2. Wait another minute on the first start.
3. Run the start script again.
4. Check Docker Desktop for a stopped or unhealthy n8n container.

## Log says the Python task runner is unavailable

The pinned standard n8n image starts its JavaScript task runner but does not include Python 3. It records a warning that the optional internal Python runner could not start.

This does not make the service unhealthy and does not affect the visual agent, Claude integration, or JavaScript workflow nodes used by this project. Python Code nodes are outside the local-first release.

## Compose reports a missing encryption key

The private `.env` file is missing or incomplete.

Run the setup script rather than invoking Compose directly. Setup generates the key and protects it from Git.

## A browser warns about secure cookies

The local stack explicitly disables n8n secure cookies because it uses local HTTP rather than public HTTPS. Confirm that the address begins with `http://localhost`, not a public hostname.

Public deployments require HTTPS and a different security configuration.

## Data disappeared

Stopping and starting preserves data. Data is removed only when the Docker volume is deleted or the reset script is confirmed.

Look for a recent private backup below `backups/`. Follow [LOCAL_OPERATIONS.md](LOCAL_OPERATIONS.md) to restore it.

## Backup or restore fails

Check:

- Docker Desktop is running.
- `.env` exists.
- The selected backup contains both `n8n-data.tar.gz` and `env.backup`.
- The backup path is local and accessible to Docker Desktop.
- There is enough disk space.

Restore requires the matching encryption-key backup. A data archive alone cannot reliably restore encrypted credentials.

## Windows script execution error

Use the supplied `.cmd` wrappers for setup, start, and stop. They invoke the repository's PowerShell scripts without changing the computer's permanent execution policy.

For backup, restore, or reset, open PowerShell in the repository directory and run the documented command.

## macOS blocks a command file

Control-click the `.command` file, choose **Open**, then confirm. This allows the specific local script without broadly disabling macOS protections.

## Get diagnostic status

Technical contributors can run:

```bash
./scripts/preflight.sh
docker compose ps
docker compose logs --tail 100 n8n
docker compose logs --tail 100 chat
```

Do not paste `.env`, credential exports, full backups, or logs containing secrets into a public issue.
