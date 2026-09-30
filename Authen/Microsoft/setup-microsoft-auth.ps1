# Microsoft Authentication Profile Setup

$ErrorActionPreference = 'Stop'

# Get script and repository paths
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (
    Split-Path -Parent $scriptDir
)

Set-Location $repoRoot

# Use Playwright shared browser cache
Remove-Item Env:PLAYWRIGHT_BROWSERS_PATH -ErrorAction SilentlyContinue
Clear-Host
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Microsoft Authentication Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Repo location: $repoRoot"
Write-Host ""

# Verify dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "[ERROR] Packages are not installed." -ForegroundColor Red
    Write-Host "Run Test-Local\setup.bat first." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Verify profile launcher
$profileLauncher = Join-Path $scriptDir "microsoft-profile.cjs"

if (-not (Test-Path $profileLauncher)) {
    Write-Host "[ERROR] microsoft-profile.cjs was not found." -ForegroundColor Red
    Write-Host "Expected path:" -ForegroundColor Yellow
    Write-Host $profileLauncher
    Read-Host "Press Enter to exit"
    exit 1
}

# Request application URL
$targetUrl = Read-Host "Enter the application URL that uses Microsoft authentication"

if ([string]::IsNullOrWhiteSpace($targetUrl)) {
    Write-Host ""
    Write-Host "[ERROR] URL is required." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Validate URL format
$parsedUrl = $null
$isValidUrl = [System.Uri]::TryCreate(
    $targetUrl,
    [System.UriKind]::Absolute,
    [ref]$parsedUrl
)

if (-not $isValidUrl) {
    Write-Host ""
    Write-Host "[ERROR] Invalid URL." -ForegroundColor Red
    Write-Host "Example: https://example.company.com" -ForegroundColor Yellow

    Read-Host "Press Enter to exit"
    exit 1
}

if ($parsedUrl.Scheme -notin @("http", "https")) {
    Write-Host ""
    Write-Host "[ERROR] URL must use http or https." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Opening Microsoft authentication profile..." -ForegroundColor Green
Write-Host ""
Write-Host "Instructions:" -ForegroundColor Cyan
Write-Host "1. Complete Microsoft sign-in manually."
Write-Host "2. Complete MFA or approval if required."
Write-Host "3. Wait until the application opens successfully."
Write-Host "4. Close the Chromium window."
Write-Host ""

& node.exe $profileLauncher $targetUrl
$profileExitCode = $LASTEXITCODE
Write-Host ""

if ($profileExitCode -eq 0) {
    Write-Host "[SUCCESS] Microsoft profile is ready." -ForegroundColor Green
}
else {
    Write-Host "[ERROR] Microsoft profile setup failed." -ForegroundColor Red
    Write-Host "Exit code: $profileExitCode" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Yellow
[Console]::ReadKey($true) | Out-Null

exit $profileExitCode