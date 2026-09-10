# Universal Form Login Authentication Setup
# Scans Test-Local for access flows with authType = form

# ===== Setup =====
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$authenDir = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent $authenDir

Set-Location $repoRoot

$testBaseDir = Join-Path $repoRoot "Test-Local"

$authConfigPath = Join-Path `
    $scriptDir `
    "playwright.form-auth.config.ts"

# Use Playwright shared browser cache
Remove-Item Env:PLAYWRIGHT_BROWSERS_PATH `
    -ErrorAction SilentlyContinue

# ===== Helper: Wait for any key =====
function Wait-ForAnyKey {
    param(
        [string]$Message = "Press any key to continue..."
    )

    Write-Host ""
    Write-Host $Message -ForegroundColor Yellow

    [Console]::ReadKey($true) | Out-Null
}

# ===== Helper: Interactive Menu =====
function Show-Menu {
    param(
        [string]$Title,
        [string[]]$Items,
        [string]$Hint = "(Use arrow keys, Enter to select, Esc to exit)"
    )

    if ($Items.Count -eq 0) {
        return -1
    }

    $selected = 0

    while ($true) {
        Clear-Host

        Write-Host "==========================================" `
            -ForegroundColor Cyan

        Write-Host "  $Title" `
            -ForegroundColor Cyan

        Write-Host "==========================================" `
            -ForegroundColor Cyan

        Write-Host ""

        for ($i = 0; $i -lt $Items.Count; $i++) {
            if ($i -eq $selected) {
                Write-Host "  > $($Items[$i])" `
                    -ForegroundColor Green
            }
            else {
                Write-Host "    $($Items[$i])" `
                    -ForegroundColor Gray
            }
        }

        Write-Host ""
        Write-Host $Hint -ForegroundColor DarkGray

        $key = [console]::ReadKey($true).Key

        switch ($key) {
            "UpArrow" {
                if ($selected -gt 0) {
                    $selected--
                }
            }

            "DownArrow" {
                if ($selected -lt ($Items.Count - 1)) {
                    $selected++
                }
            }

            "Enter" {
                return $selected
            }

            "Escape" {
                return -1
            }
        }
    }
}

# ===== Helper: Find Form Login Access Flows =====
function Get-FormLoginAccessFlows {
    param(
        [string]$BasePath
    )

    $formAccessFlows = @()

    if (-not (Test-Path $BasePath)) {
        return $formAccessFlows
    }

    $configFiles = @(
        Get-ChildItem `
            -LiteralPath $BasePath `
            -Filter "project.config.json" `
            -File `
            -Recurse
    )

    foreach ($configFile in $configFiles) {
        try {
            $config = Get-Content `
                -LiteralPath $configFile.FullName `
                -Raw |
                ConvertFrom-Json
        }
        catch {
            Write-Host "[WARNING] Invalid configuration skipped:" `
                -ForegroundColor Yellow

            Write-Host $configFile.FullName `
                -ForegroundColor DarkGray

            continue
        }

        if (
            -not $config.authType -or
            [string]::IsNullOrWhiteSpace(
                [string]$config.authType
            )
        ) {
            continue
        }

        $authType = (
            [string]$config.authType
        ).Trim().ToLowerInvariant()

        if ($authType -ne "form") {
            continue
        }

        $accessFlowDirectory = $configFile.Directory
        $projectDirectory = $accessFlowDirectory.Parent

        if (-not $projectDirectory) {
            continue
        }

        $loginDirectory = Join-Path `
            $accessFlowDirectory.FullName `
            "_login"

        $loginSetupPath = Join-Path `
            $loginDirectory `
            "login.setup.ts"

        $statePath = Join-Path `
            $loginDirectory `
            "session-storage.json"

        $formAccessFlows += [PSCustomObject]@{
            ProjectName    = $projectDirectory.Name
            AccessFlowName = $accessFlowDirectory.Name
            AccessFlowPath = $accessFlowDirectory.FullName
            ConfigPath     = $configFile.FullName
            LoginSetupPath = $loginSetupPath
            StatePath      = $statePath
            DisplayName    = (
                "$($projectDirectory.Name) / " +
                "$($accessFlowDirectory.Name)"
            )
        }
    }

    return @(
        $formAccessFlows |
            Sort-Object ProjectName, AccessFlowName
    )
}

# ===== Helper: Convert SecureString =====
function Convert-SecureStringToPlainText {
    param(
        [Parameter(Mandatory = $true)]
        [Security.SecureString]$SecureValue
    )

    $credential = New-Object `
        System.Management.Automation.PSCredential(
            "FormLogin",
            $SecureValue
        )

    return $credential.GetNetworkCredential().Password
}

# ===== Verify Repository Setup =====
if (-not (Test-Path $testBaseDir)) {
    Write-Host "[ERROR] Test-Local directory was not found" `
        -ForegroundColor Red

    Write-Host $testBaseDir `
        -ForegroundColor Yellow

    Wait-ForAnyKey
    exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Host "[ERROR] Packages are not installed" `
        -ForegroundColor Red

    Write-Host "Please run Test-Local\setup.bat first" `
        -ForegroundColor Yellow

    Wait-ForAnyKey
    exit 1
}

$playwrightCommand = Join-Path `
    $repoRoot `
    "node_modules\.bin\playwright.cmd"

if (-not (Test-Path $playwrightCommand)) {
    Write-Host "[ERROR] Playwright command was not found" `
        -ForegroundColor Red

    Write-Host "Expected:" `
        -ForegroundColor Yellow

    Write-Host $playwrightCommand

    Wait-ForAnyKey
    exit 1
}

if (-not (Test-Path $authConfigPath)) {
    Write-Host "[ERROR] Form authentication config was not found" `
        -ForegroundColor Red

    Write-Host "Expected:" `
        -ForegroundColor Yellow

    Write-Host $authConfigPath

    Wait-ForAnyKey
    exit 1
}

# ===== Scan Form Login Access Flows =====
$formAccessFlows = Get-FormLoginAccessFlows `
    -BasePath $testBaseDir

if ($formAccessFlows.Count -eq 0) {
    Write-Host "[WARNING] No Form Login access flows were found" `
        -ForegroundColor Yellow

    Write-Host ""
    Write-Host "Expected project configuration:" `
        -ForegroundColor DarkGray

    Write-Host '{ "authType": "form" }' `
        -ForegroundColor DarkGray

    Wait-ForAnyKey
    exit 0
}

# ===== Select Form Login Access Flow =====
$formFlowLabels = @(
    $formAccessFlows |
        Select-Object -ExpandProperty DisplayName
)

$formFlowMenu = $formFlowLabels + "[ Exit ]"

$formFlowChoice = Show-Menu `
    -Title "Form Login Setup - Select Access Flow" `
    -Items $formFlowMenu

if (
    $formFlowChoice -eq -1 -or
    $formFlowChoice -eq ($formFlowMenu.Count - 1)
) {
    Clear-Host
    Write-Host "Goodbye!" -ForegroundColor Green
    exit 0
}

$selectedFlow = $formAccessFlows[$formFlowChoice]

# ===== Verify Login Setup File =====
if (-not (Test-Path $selectedFlow.LoginSetupPath)) {
    Clear-Host

    Write-Host "[ERROR] Login setup file was not found" `
        -ForegroundColor Red

    Write-Host ""
    Write-Host "Project:     $($selectedFlow.ProjectName)"
    Write-Host "Access flow: $($selectedFlow.AccessFlowName)"
    Write-Host ""

    Write-Host "Expected:" `
        -ForegroundColor Yellow

    Write-Host $selectedFlow.LoginSetupPath

    Wait-ForAnyKey
    exit 1
}

# ===== Get Form Login Credentials =====
Clear-Host

Write-Host "==========================================" `
    -ForegroundColor Cyan

Write-Host "  Form Login Authentication Setup" `
    -ForegroundColor Cyan

Write-Host "==========================================" `
    -ForegroundColor Cyan

Write-Host ""
Write-Host "Project:     $($selectedFlow.ProjectName)"
Write-Host "Access flow: $($selectedFlow.AccessFlowName)"
Write-Host "Setup file:  $($selectedFlow.LoginSetupPath)"
Write-Host "State file:  $($selectedFlow.StatePath)"
Write-Host ""

$username = Read-Host "Enter username"

if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host ""
    Write-Host "[ERROR] Username is required" `
        -ForegroundColor Red

    Wait-ForAnyKey
    exit 1
}

$securePassword = Read-Host `
    "Enter password" `
    -AsSecureString

$password = Convert-SecureStringToPlainText `
    -SecureValue $securePassword

if ([string]::IsNullOrWhiteSpace($password)) {
    Write-Host ""
    Write-Host "[ERROR] Password is required" `
        -ForegroundColor Red

    Wait-ForAnyKey
    exit 1
}

# ===== Run Login Setup =====
Clear-Host

Write-Host "==========================================" `
    -ForegroundColor Cyan

Write-Host "  Creating Form Login State" `
    -ForegroundColor Cyan

Write-Host "==========================================" `
    -ForegroundColor Cyan

Write-Host ""
Write-Host "Project:     $($selectedFlow.ProjectName)"
Write-Host "Access flow: $($selectedFlow.AccessFlowName)"
Write-Host ""

# Remove the previous state before creating a new state
if (Test-Path $selectedFlow.StatePath) {
    Remove-Item `
        -LiteralPath $selectedFlow.StatePath `
        -Force
}

# Generic environment variables used by every form login setup
$env:FORM_LOGIN_USERNAME = $username
$env:FORM_LOGIN_PASSWORD = $password
$env:FORM_LOGIN_STATE_PATH = $selectedFlow.StatePath

$formAuthExitCode = 1

try {
    # Convert login setup path to a path relative to Test-Local
    $resolvedTestBaseDir = (
        Resolve-Path -LiteralPath $testBaseDir
    ).Path.TrimEnd("\")

    $resolvedLoginSetupPath = (
        Resolve-Path -LiteralPath $selectedFlow.LoginSetupPath
    ).Path

    $relativeLoginSetupPath = $resolvedLoginSetupPath.Substring(
        $resolvedTestBaseDir.Length
    ).TrimStart("\")

    # Playwright uses forward slashes for test filters
    $loginSetupFilter = $relativeLoginSetupPath -replace "\\", "/"

    Write-Host "Login setup filter:" `
        -ForegroundColor DarkGray

    Write-Host "  $loginSetupFilter" `
        -ForegroundColor DarkGray

    Write-Host ""

    $playwrightArguments = @(
        "test"
        "--config=$authConfigPath"
        $loginSetupFilter
    )

    & $playwrightCommand @playwrightArguments

    $formAuthExitCode = $LASTEXITCODE
}
finally {
    # Clear credentials immediately after setup finishes
    Remove-Item Env:FORM_LOGIN_USERNAME `
        -ErrorAction SilentlyContinue

    Remove-Item Env:FORM_LOGIN_PASSWORD `
        -ErrorAction SilentlyContinue

    Remove-Item Env:FORM_LOGIN_STATE_PATH `
        -ErrorAction SilentlyContinue

    $username = $null
    $password = $null
    $securePassword = $null
}

Write-Host ""

if ($formAuthExitCode -ne 0) {
    Write-Host "[ERROR] Form Login Setup failed" `
        -ForegroundColor Red

    Write-Host "Exit code: $formAuthExitCode" `
        -ForegroundColor Red

    Wait-ForAnyKey
    exit $formAuthExitCode
}

# ===== Verify State File =====
if (-not (Test-Path $selectedFlow.StatePath)) {
    Write-Host "[ERROR] Login completed but session-storage.json was not created" `
        -ForegroundColor Red

    Write-Host ""
    Write-Host "Expected:" `
        -ForegroundColor Yellow

    Write-Host $selectedFlow.StatePath

    Wait-ForAnyKey
    exit 1
}

$stateFile = Get-Item `
    -LiteralPath $selectedFlow.StatePath

if ($stateFile.Length -eq 0) {
    Write-Host "[ERROR] session-storage.json was created but is empty" `
        -ForegroundColor Red

    Wait-ForAnyKey
    exit 1
}

Write-Host "[SUCCESS] Form Login state was created" `
    -ForegroundColor Green

Write-Host ""
Write-Host "State:" `
    -ForegroundColor DarkGray

Write-Host $selectedFlow.StatePath `
    -ForegroundColor DarkGray

Wait-ForAnyKey `
    -Message "Press any key to exit..."

exit 0