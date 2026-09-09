# ttest - Universal Playwright Codegen Runner
# Select Project > Access Flow > Codegen Mode > Record URLs

# ===== Setup =====
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

Set-Location $repoRoot

# Use Playwright shared browser cache
Remove-Item Env:PLAYWRIGHT_BROWSERS_PATH `
    -ErrorAction SilentlyContinue

$testBaseDir = Join-Path $repoRoot "Test-Local"
$microsoftProfilePath = Join-Path `
    $repoRoot `
    "Authen\Microsoft\profile"

# ===== Helper: Wait for any key =====
function Wait-ForAnyKey {
    param(
        [string]$Message = "Press any key to continue..."
    )

    Write-Host ""
    Write-Host $Message -ForegroundColor Yellow
    [console]::ReadKey($true) | Out-Null
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

# ===== Helper: Get visible directories =====
function Get-VisibleDirectories {
    param(
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        return @()
    }

    return @(
        Get-ChildItem `
            -LiteralPath $Path `
            -Directory |
            Where-Object {
                -not $_.Name.StartsWith("_") -and
                -not $_.Name.StartsWith(".") -and
                $_.Name -ne "node_modules"
            } |
            Sort-Object Name
    )
}

# ===== Helper: Read Access Flow configuration =====
function Get-AccessFlowConfiguration {
    param(
        [string]$AccessFlowPath,
        [string]$ProjectName,
        [string]$AccessFlowName
    )

    $configPath = Join-Path `
        $AccessFlowPath `
        "project.config.json"

    if (-not (Test-Path $configPath)) {
        return @{
            AuthType   = "none"
            ConfigPath = $null
            StatePath  = $null
        }
    }

    try {
        $config = Get-Content `
            -LiteralPath $configPath `
            -Raw |
            ConvertFrom-Json
    }
    catch {
        $message = @(
            "Invalid project configuration."
            ""
            "Project: $ProjectName"
            "Access flow: $AccessFlowName"
            "Configuration: $configPath"
            ""
            $_.Exception.Message
        ) -join [System.Environment]::NewLine

        throw $message
    }

    if (
        -not $config.authType -or
        [string]::IsNullOrWhiteSpace(
            [string]$config.authType
        )
    ) {
        throw "authType is required in: $configPath"
    }

    $authType = (
        [string]$config.authType
    ).Trim().ToLowerInvariant()

    switch ($authType) {
        "none" {
            return @{
                AuthType   = "none"
                ConfigPath = $configPath
                StatePath  = $null
            }
        }

        "microsoft" {
            if (
                -not (
                    Test-Path (
                        Join-Path $microsoftProfilePath "Local State"
                    )
                )
            ) {
                $message = @(
                    "Microsoft profile is not ready."
                    ""
                    "Expected:"
                    $microsoftProfilePath
                    ""
                    "Please run:"
                    "Authen\Microsoft\setup-microsoft-auth.bat"
                ) -join [System.Environment]::NewLine

                throw $message
            }

            return @{
                AuthType   = "microsoft"
                ConfigPath = $configPath
                StatePath  = $null
            }
        }

        "form" {
            $formStatePath = Join-Path `
                $AccessFlowPath `
                "_login\state.json"

            return @{
                AuthType   = "form"
                ConfigPath = $configPath
                StatePath  = $formStatePath
            }
        }

        default {
            $message = @(
                "Unsupported authentication type: $authType"
                ""
                "Project: $ProjectName"
                "Access flow: $AccessFlowName"
                ""
                "Supported values:"
                "- none"
                "- microsoft"
                "- form"
            ) -join [System.Environment]::NewLine

            throw $message
        }
    }
}

# ===== Verify Setup =====
if (-not (Test-Path "node_modules")) {
    Write-Host "[ERROR] Packages are not installed" `
        -ForegroundColor Red

    Write-Host "Please run Test-Local\setup.bat first" `
        -ForegroundColor Yellow

    Wait-ForAnyKey
    exit 1
}

if (-not (Test-Path $testBaseDir)) {
    Write-Host "[ERROR] Test-Local directory was not found" `
        -ForegroundColor Red

    Wait-ForAnyKey
    exit 1
}

& pnpm.cmd exec playwright --version *> $null

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Playwright is not available" `
        -ForegroundColor Red

    Write-Host "Please run Test-Local\setup.bat first" `
        -ForegroundColor Yellow

    Wait-ForAnyKey
    exit 1
}

# ===== Select Project =====
$projects = Get-VisibleDirectories `
    -Path $testBaseDir

if ($projects.Count -eq 0) {
    Write-Host "[ERROR] No projects were found" `
        -ForegroundColor Red

    Wait-ForAnyKey
    exit 1
}

$projectNames = @(
    $projects |
        Select-Object -ExpandProperty Name
)

$projectMenu = $projectNames + "[ Exit ]"

$projectChoice = Show-Menu `
    -Title "Playwright Codegen - Select Project" `
    -Items $projectMenu

if (
    $projectChoice -eq -1 -or
    $projectChoice -eq ($projectMenu.Count - 1)
) {
    Clear-Host
    Write-Host "Goodbye!" -ForegroundColor Green
    exit 0
}

$selectedProjectDirectory = $projects[$projectChoice]
$selectedProject = $selectedProjectDirectory.Name
$projectPath = $selectedProjectDirectory.FullName

# ===== Select Access Flow =====
$accessFlows = @(
    Get-VisibleDirectories `
        -Path $projectPath |
        Where-Object {
            Test-Path (
                Join-Path $_.FullName "project.config.json"
            )
        }
)

if ($accessFlows.Count -eq 0) {
    Write-Host "[ERROR] No valid access flow was found" `
        -ForegroundColor Red

    Write-Host "Project: $selectedProject" `
        -ForegroundColor Yellow

    Wait-ForAnyKey
    exit 1
}

if ($accessFlows.Count -eq 1) {
    $selectedAccessFlowDirectory = $accessFlows[0]
}
else {
    $accessFlowNames = @(
        $accessFlows |
            Select-Object -ExpandProperty Name
    )

    $accessFlowMenu = $accessFlowNames + "[ Exit ]"

    $accessFlowChoice = Show-Menu `
        -Title "$selectedProject - Select Access Flow" `
        -Items $accessFlowMenu

    if (
        $accessFlowChoice -eq -1 -or
        $accessFlowChoice -eq ($accessFlowMenu.Count - 1)
    ) {
        Clear-Host
        Write-Host "Goodbye!" -ForegroundColor Green
        exit 0
    }

    $selectedAccessFlowDirectory =
        $accessFlows[$accessFlowChoice]
}

$selectedAccessFlow = $selectedAccessFlowDirectory.Name
$accessFlowPath = $selectedAccessFlowDirectory.FullName

try {
    $accessConfiguration = Get-AccessFlowConfiguration `
        -AccessFlowPath $accessFlowPath `
        -ProjectName $selectedProject `
        -AccessFlowName $selectedAccessFlow
}
catch {
    Clear-Host

    Write-Host "[ERROR] Access flow configuration failed" `
        -ForegroundColor Red

    Write-Host ""
    Write-Host $_.Exception.Message `
        -ForegroundColor Yellow

    Wait-ForAnyKey
    exit 1
}

# ===== Select Form Codegen Mode =====
$formCodegenMode = $null

if ($accessConfiguration.AuthType -eq "form") {
    $formModeMenu = @(
        "Record login flow"
        "Record tests after login"
        "[ Exit ]"
    )

    $formModeChoice = Show-Menu `
        -Title "$selectedProject / $selectedAccessFlow" `
        -Items $formModeMenu

    switch ($formModeChoice) {
        0 {
            $formCodegenMode = "login"
        }

        1 {
            $formCodegenMode = "authenticated"

            if (-not (Test-Path $accessConfiguration.StatePath)) {
                Clear-Host

                Write-Host "[ERROR] Form login state was not found" `
                    -ForegroundColor Red

                Write-Host ""
                Write-Host "Expected:" `
                    -ForegroundColor Yellow

                Write-Host $accessConfiguration.StatePath
                Write-Host ""

                Write-Host "Create the form login state first." `
                    -ForegroundColor Yellow

                Wait-ForAnyKey
                exit 1
            }
        }

        default {
            Clear-Host
            Write-Host "Goodbye!" -ForegroundColor Green
            exit 0
        }
    }
}

# ===== URL Loop =====
while ($true) {
    Clear-Host

    Write-Host "==========================================" `
        -ForegroundColor Cyan

    Write-Host "  Playwright Codegen" `
        -ForegroundColor Cyan

    Write-Host "==========================================" `
        -ForegroundColor Cyan

    Write-Host ""
    Write-Host "Project:     $selectedProject"
    Write-Host "Access flow: $selectedAccessFlow"
    Write-Host "Auth type:   $($accessConfiguration.AuthType)"

    if ($formCodegenMode) {
        Write-Host "Mode:        $formCodegenMode"
    }

    Write-Host ""
    Write-Host "Type X to exit." `
        -ForegroundColor DarkGray

    Write-Host ""

    $targetUrl = Read-Host "Enter URL to record"

    if (
        :IsNullOrWhiteSpace($targetUrl)
    ) {
        Write-Host ""
        Write-Host "[ERROR] URL is required" `
            -ForegroundColor Red

        Wait-ForAnyKey
        continue
    }

    if ($targetUrl.Trim().ToLowerInvariant() -eq "x") {
        Clear-Host
        Write-Host "Goodbye!" -ForegroundColor Green
        exit 0
    }

    $parsedUrl = $null

    $isValidUrl = [System.Uri]::TryCreate(
        $targetUrl,
        [System.UriKind]::Absolute,
        [ref]$parsedUrl
    )

    if (
        -not $isValidUrl -or
        $parsedUrl.Scheme -notin @("http", "https")
    ) {
        Write-Host ""
        Write-Host "[ERROR] Invalid URL" `
            -ForegroundColor Red

        Write-Host "Example: http://localhost:4200/" `
            -ForegroundColor Yellow

        Wait-ForAnyKey
        continue
    }

    Clear-Host

    Write-Host "==========================================" `
        -ForegroundColor Cyan

    Write-Host "  Launching Playwright Codegen" `
        -ForegroundColor Cyan

    Write-Host "==========================================" `
        -ForegroundColor Cyan

    Write-Host ""
    Write-Host "Project:     $selectedProject"
    Write-Host "Access flow: $selectedAccessFlow"
    Write-Host "URL:         $targetUrl"
    Write-Host ""

    $codegenArguments = @(
        "exec"
        "playwright"
        "codegen"
        "--target=playwright-test"
    )

    switch ($accessConfiguration.AuthType) {
        "microsoft" {
            Write-Host "Using Microsoft profile:" `
                -ForegroundColor Green

            Write-Host $microsoftProfilePath `
                -ForegroundColor DarkGray

            $codegenArguments +=
                "--user-data-dir=$microsoftProfilePath"
        }

        "form" {
            if ($formCodegenMode -eq "authenticated") {
                Write-Host "Using form authentication state:" `
                    -ForegroundColor Green

                Write-Host $accessConfiguration.StatePath `
                    -ForegroundColor DarkGray

                $codegenArguments +=
                    "--load-storage=$($accessConfiguration.StatePath)"
            }
            else {
                Write-Host "Recording form login flow with a clean session" `
                    -ForegroundColor Green
            }
        }

        default {
            Write-Host "Using a clean browser session" `
                -ForegroundColor Green
        }
    }

    $codegenArguments += $targetUrl

    Write-Host ""
    Write-Host "Browser and Playwright Inspector will open."
    Write-Host "Close Codegen when recording is finished."
    Write-Host ""

    & pnpm.cmd @codegenArguments

    $codegenExitCode = $LASTEXITCODE

    Write-Host ""

    if ($codegenExitCode -eq 0) {
        Write-Host "[SUCCESS] Codegen closed" `
            -ForegroundColor Green
    }
    else {
        Write-Host "[ERROR] Codegen ended with an error" `
            -ForegroundColor Red

        Write-Host "Exit code: $codegenExitCode" `
            -ForegroundColor Red
    }

    Wait-ForAnyKey `
        -Message "Press any key to enter another URL..."
}