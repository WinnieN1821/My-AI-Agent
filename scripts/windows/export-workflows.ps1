. (Join-Path $PSScriptRoot "Common.ps1")

if (-not (Test-Path $script:EnvFile)) {
    throw "Local setup has not been completed. Run setup-windows.cmd first."
}

Assert-DockerAvailable

if (-not (Test-ServiceRunning "n8n")) {
    throw "n8n is not running. Start the local stack first."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$exportDirectory = Join-Path $script:ProjectRoot "n8n\exports\$timestamp"
New-Item -ItemType Directory -Path $exportDirectory -Force | Out-Null

function Export-AgentWorkflow {
    param(
        [string]$WorkflowId,
        [string]$OutputName
    )

    $containerFile = "/tmp/$WorkflowId-export.json"
    Invoke-Compose @(
        "exec",
        "-T",
        "n8n",
        "n8n",
        "export:workflow",
        "--id=$WorkflowId",
        "--pretty",
        "--output=$containerFile"
    ) *> $null
    Invoke-Compose @(
        "cp",
        "n8n:$containerFile",
        (Join-Path $exportDirectory $OutputName)
    ) *> $null
}

Export-AgentWorkflow "phase3StartHere" "00-start-here-project-partner.json"
Export-AgentWorkflow "phase3AgentHealth" "90-debug-agent-health.json"

Write-Host "Workflow copies exported to:`n  $exportDirectory" -ForegroundColor Green
Write-Host "This folder is ignored by Git. Review credential references and the diff before replacing canonical workflow files."
