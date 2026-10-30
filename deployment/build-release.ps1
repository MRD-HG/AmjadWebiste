param([string]$Version = (Get-Date -Format 'yyyyMMdd-HHmmss'), [switch]$AuditOnly)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$releaseDirectory = Join-Path $projectRoot 'release'
New-Item -ItemType Directory -Force -Path $releaseDirectory | Out-Null
$staging = Join-Path ([System.IO.Path]::GetTempPath()) ('amjad-release-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $staging | Out-Null

try {
    $tracked = git -C $projectRoot ls-files
    if ($LASTEXITCODE -ne 0) { throw 'git ls-files failed' }
    $excluded = '^(tests/|artifacts/|release/|admin/storage/|admin/bin/|\.git/|\.playwright/|\.gitignore$|deployment/build-release\.ps1$)|\.zip$'
    foreach ($relative in $tracked) {
        $normalized = $relative -replace '\\','/'
        if ($normalized -match $excluded) { continue }
        $source = Join-Path $projectRoot $relative
        if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { continue }
        $target = Join-Path $staging $relative
        New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
        Copy-Item -LiteralPath $source -Destination $target
    }

    $entries = Get-ChildItem -LiteralPath $staging -Recurse -File | Sort-Object FullName | ForEach-Object {
        [ordered]@{
            path = $_.FullName.Substring($staging.Length + 1).Replace('\','/')
            sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLowerInvariant()
            bytes = $_.Length
        }
    }
    $paths = @($entries | ForEach-Object { $_.path })
    foreach ($required in @('admin/.htaccess', 'admin/includes/.htaccess', 'images/uploads/.htaccess')) {
        if ($required -notin $paths) { throw "Required protection file missing from release: $required" }
    }
    if ($paths | Where-Object { $_ -match '^(tests/|artifacts/|release/|admin/storage/|admin/bin/)|\.zip$' }) {
        throw 'Forbidden private or nested release content reached staging.'
    }
    $manifest = [ordered]@{ release = "amjad-website-v9-$Version"; created_at = (Get-Date).ToString('o'); files = @($entries) }
    $manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $staging 'DEPLOYMENT_MANIFEST.json') -Encoding UTF8
    if ($AuditOnly) {
        Write-Output "Audit passed: $($entries.Count) public files staged; no archive created."
        return
    }
    $zip = Join-Path $releaseDirectory "amjad-website-v9-$Version.zip"
    Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zip -CompressionLevel Optimal
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $zip).Hash.ToLowerInvariant()
    Write-Output "Package: $zip"
    Write-Output "SHA256: $hash"
} finally {
    $resolvedTemp = [System.IO.Path]::GetFullPath($staging)
    $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if ($resolvedTemp.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and (Split-Path $resolvedTemp -Leaf).StartsWith('amjad-release-')) {
        Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
    }
}
