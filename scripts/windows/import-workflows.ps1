. (Join-Path $PSScriptRoot "Common.ps1")

if (-not (Test-Path $script:EnvFile)) {
    throw "Local setup has not been completed. Run setup-windows.cmd first."
}

Assert-DockerAvailable

Write-Host "Checking the workflow exports..."
& docker run --rm `
    -v "${script:ProjectRoot}:/workspace:ro" `
    -w /workspace `
    node:24.16.0-alpine3.22 `
    node scripts/validate-workflows.mjs
if ($LASTEXITCODE -ne 0) {
    throw "Workflow validation failed."
}

Write-Host "`nStarting n8n..."
Invoke-Compose @("up", "-d", "--wait", "--wait-timeout", "240", "n8n")

Write-Host "`nImporting the two Phase 3 workflows as inactive drafts..."
Invoke-Compose @(
    "exec",
    "-T",
    "n8n",
    "n8n",
    "import:workflow",
    "--separate",
    "--input=/opt/ai-solopreneur/workflows"
)

Write-Host "`nRestarting n8n so the imported drafts appear in the editor..."
Invoke-Compose @("restart", "n8n") *> $null
Invoke-Compose @("up", "-d", "--wait", "--wait-timeout", "240", "n8n") *> $null

$n8nPort = Get-EnvValue "N8N_PORT" "5678"
Write-Host "`nWorkflows imported successfully." -ForegroundColor Green
Write-Host "Open http://localhost:$n8nPort and follow docs/N8N_AGENT_SETUP.md."
Write-Host "The workflows stay inactive until you select your Anthropic credential and publish them."
