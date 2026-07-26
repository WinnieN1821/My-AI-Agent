. (Join-Path $PSScriptRoot "Common.ps1")

if (-not (Test-Path $script:EnvFile)) {
    $bytes = New-Object byte[] 32
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
    }
    finally {
        $generator.Dispose()
    }

    $encryptionKey = -join ($bytes | ForEach-Object { $_.ToString("x2") })
    $content = @(
        "COMPOSE_PROJECT_NAME=ai-solopreneur"
        "CHAT_PORT=3000"
        "N8N_PORT=5678"
        "GENERIC_TIMEZONE=Australia/Melbourne"
        "N8N_ENCRYPTION_KEY=$encryptionKey"
    ) -join [Environment]::NewLine

    [IO.File]::WriteAllText(
        $script:EnvFile,
        "$content$([Environment]::NewLine)",
        [Text.UTF8Encoding]::new($false)
    )
    Write-Host "Created a private .env file with a generated n8n encryption key."
}
else {
    $existingKey = Get-EnvValue "N8N_ENCRYPTION_KEY" ""
    if ($existingKey.Length -lt 32 -or $existingKey.StartsWith("replace-")) {
        $bytes = New-Object byte[] 32
        $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
        try {
            $generator.GetBytes($bytes)
        }
        finally {
            $generator.Dispose()
        }

        $replacementKey = -join ($bytes | ForEach-Object { $_.ToString("x2") })
        $lines = @(Get-Content $script:EnvFile)
        $replaced = $false
        $updatedLines = foreach ($line in $lines) {
            if ($line -match "^N8N_ENCRYPTION_KEY=") {
                "N8N_ENCRYPTION_KEY=$replacementKey"
                $replaced = $true
            }
            else {
                $line
            }
        }
        if (-not $replaced) {
            $updatedLines += "N8N_ENCRYPTION_KEY=$replacementKey"
        }

        [IO.File]::WriteAllText(
            $script:EnvFile,
            (($updatedLines -join [Environment]::NewLine) + [Environment]::NewLine),
            [Text.UTF8Encoding]::new($false)
        )
        Write-Host "Replaced the example encryption-key placeholder with a private generated key."
    }
    else {
        Write-Host "Using the existing private .env file."
    }
}

& (Join-Path $PSScriptRoot "preflight.ps1")

Write-Host "`nDownloading the pinned local images..."
Invoke-Compose @("pull", "n8n")

Write-Host "`nBuilding the local chat app..."
Invoke-Compose @("build", "chat")

Write-Host "`nStarting AI Solopreneur..."
Invoke-Compose @("up", "-d", "--wait", "--wait-timeout", "240")

$chatPort = Get-EnvValue "CHAT_PORT" "3000"
$n8nPort = Get-EnvValue "N8N_PORT" "5678"

Wait-Endpoint "http://127.0.0.1:$chatPort/health"
Wait-Endpoint "http://127.0.0.1:$n8nPort/healthz"

Write-Host "`nLocal stack is healthy." -ForegroundColor Green
Write-Host "  Chat app:          http://localhost:$chatPort"
Write-Host "  n8n editor:       http://localhost:$n8nPort"
