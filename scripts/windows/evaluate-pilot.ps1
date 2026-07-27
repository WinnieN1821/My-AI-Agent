. (Join-Path $PSScriptRoot "Common.ps1")

Assert-DockerAvailable

& docker run --rm `
    -v "${script:ProjectRoot}:/workspace:ro" `
    -w /workspace `
    node:24.16.0-alpine3.22 `
    node scripts/evaluate-pilot.mjs

exit $LASTEXITCODE
