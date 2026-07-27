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

Write-Host "`nImporting the reviewed workflows as inactive drafts..."
Invoke-Compose @(
    "exec",
    "-T",
    "n8n",
    "n8n",
    "import:workflow",
    "--separate",
    "--input=/opt/ai-solopreneur/workflows"
)

$n8nPort = if ($env:N8N_PORT) {
    $env:N8N_PORT
}
else {
    Get-EnvValue "N8N_PORT" "5678"
}
$setupPublished = $false

try {
    Write-Host "`nPreparing the local task tables and read-only tool..."
    Invoke-Compose @(
        "exec",
        "-T",
        "n8n",
        "n8n",
        "publish:workflow",
        "--id=phase4TaskSetup"
    ) *> $null
    $setupPublished = $true
    Invoke-Compose @(
        "exec",
        "-T",
        "n8n",
        "n8n",
        "publish:workflow",
        "--id=phase4ListTasks"
    ) *> $null

    Invoke-Compose @("restart", "n8n") *> $null
    Invoke-Compose @("up", "-d", "--wait", "--wait-timeout", "240", "n8n") *> $null

    $setupResult = Invoke-RestMethod `
        -Method Post `
        -Uri "http://127.0.0.1:$n8nPort/webhook/setup-task-data"
    if (-not $setupResult.ok) {
        throw "Local task setup returned an unexpected response."
    }
}
finally {
    if ($setupPublished) {
        Write-Host "`nRemoving the temporary local setup webhook..."
        Invoke-Compose @(
            "exec",
            "-T",
            "n8n",
            "n8n",
            "unpublish:workflow",
            "--id=phase4TaskSetup"
        ) *> $null
        Invoke-Compose @("restart", "n8n") *> $null
        Invoke-Compose @("up", "-d", "--wait", "--wait-timeout", "240", "n8n") *> $null
    }
}

Write-Host "`nWorkflows imported successfully." -ForegroundColor Green
Write-Host "Local task tables and three sample tasks are ready."
Write-Host "Open http://localhost:$n8nPort and follow docs/N8N_AGENT_SETUP.md."
Write-Host "The main agent stays inactive until you select your Anthropic credential and publish it."
