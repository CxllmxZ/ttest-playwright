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

$testBaseDir = Join-Path `
    $repoRoot `
    "Test-Local"

$microsoftProfilePath = Join-Path `
    $repoRoot `
    "Authen\Microsoft\profile"

$formCodegenLauncher = Join-Path `
    $repoRoot `
    "Authen\Form-Login\form-codegen.cjs"

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

    # Config is optional. Default authentication is none.
    if (-not (Test-Path $configPath)) {
        return @{
            AuthType           = "none"
            ConfigPath         = $null
            SessionStoragePath = $null
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
                AuthType           = "none"
                ConfigPath         = $configPath
                SessionStoragePath = $null
            }
        }

        "microsoft" {
            $localStatePath = Join-Path `
                $microsoftProfilePath `
                "Local State"

            if (-not (Test-Path $localStatePath)) {
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
                AuthType           = "microsoft"
                ConfigPath         = $configPath
                SessionStoragePath = $null
            }
        }

        "form" {
            $sessionStoragePath = Join-Path `
                $AccessFlowPath `
                "_login\session-storage.json"

            return @{
                AuthType           = "form"
                ConfigPath         = $configPath
                SessionStoragePath = $sessionStoragePath
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

# ===== Helper: Validate URL =====
function Test-ValidHttpUrl {
    param(
        [string]$Url
    )

    $parsedUrl = $null

    $isValidUrl = [System.Uri]::TryCreate(
        $Url,
        [System.UriKind]::Absolute,
        [ref]$parsedUrl
    )

    if (-not $isValidUrl) {
        return $false
    }

    return $parsedUrl.Scheme -in @(
        "http",
        "https"
    )
}

# ===== Helper: Clear temporary environment =====
function Clear-CodegenEnvironment {
    Remove-Item Env:FORM_LOGIN_SESSION_PATH `
        -ErrorAction SilentlyContinue
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

    Write-Host $testBaseDir `
        -ForegroundColor Yellow

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
            $flowConfigPath = Join-Path `
                $_.FullName `
                "project.config.json"

            Test-Path $flowConfigPath
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

$selectedAccessFlow =
    $selectedAccessFlowDirectory.Name

$accessFlowPath =
    $selectedAccessFlowDirectory.FullName

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
        "Record login and test flow"
        "Open authenticated browser / Pick locators"
        "[ Exit ]"
    )

    $formModeChoice = Show-Menu `
        -Title "$selectedProject / $selectedAccessFlow" `
        -Items $formModeMenu

    switch ($formModeChoice) {
        0 {
            $formCodegenMode = "record"
        }

        1 {
            $formCodegenMode = "inspect"

            $sessionStoragePath =
                $accessConfiguration.SessionStoragePath

            if (
                [string]::IsNullOrWhiteSpace(
                    [string]$sessionStoragePath
                )
            ) {
                Clear-Host

                Write-Host `
                    "[ERROR] Session Storage path is missing" `
                    -ForegroundColor Red

                Write-Host ""
                Write-Host "Project:     $selectedProject"
                Write-Host "Access flow: $selectedAccessFlow"
                Write-Host ""

                Write-Host `
                    "Check Get-AccessFlowConfiguration." `
                    -ForegroundColor Yellow

                Wait-ForAnyKey
                exit 1
            }

            if (-not (Test-Path $sessionStoragePath)) {
                Clear-Host

                Write-Host `
                    "[ERROR] Form Login session storage was not found" `
                    -ForegroundColor Red

                Write-Host ""
                Write-Host "Expected:" `
                    -ForegroundColor Yellow

                Write-Host $sessionStoragePath
                Write-Host ""

                Write-Host `
                    "Create the Form Login session first:" `
                    -ForegroundColor Yellow

                Write-Host `
                    "Authen\Form-Login\setup-form-auth.bat" `
                    -ForegroundColor Yellow

                Wait-ForAnyKey
                exit 1
            }

            if (-not (Test-Path $formCodegenLauncher)) {
                Clear-Host

                Write-Host `
                    "[ERROR] Form Codegen launcher was not found" `
                    -ForegroundColor Red

                Write-Host ""
                Write-Host "Expected:" `
                    -ForegroundColor Yellow

                Write-Host $formCodegenLauncher
                Write-Host ""

                Write-Host `
                    "Create Authen\Form-Login\form-codegen.cjs first." `
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
    Clear-CodegenEnvironment
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

    if ($formCodegenMode -eq "record") {
        Write-Host "Mode:        Record login and test flow"
    }
    elseif ($formCodegenMode -eq "inspect") {
        Write-Host "Mode:        Authenticated browser / Pick locators"
    }

    Write-Host ""
    Write-Host "Type X to exit." `
        -ForegroundColor DarkGray

    Write-Host ""

    $targetUrl = Read-Host "Enter URL to record"

    if (
        [string]::IsNullOrWhiteSpace($targetUrl)
    ) {
        Write-Host ""
        Write-Host "[ERROR] URL is required" `
            -ForegroundColor Red

        Wait-ForAnyKey
        continue
    }

    if (
        $targetUrl.Trim().ToLowerInvariant() -eq "x"
    ) {
        Clear-CodegenEnvironment
        Clear-Host

        Write-Host "Goodbye!" `
            -ForegroundColor Green

        exit 0
    }

    if (-not (Test-ValidHttpUrl -Url $targetUrl)) {
        Write-Host ""
        Write-Host "[ERROR] Invalid URL" `
            -ForegroundColor Red

        Write-Host `
            "Example: http://localhost:4200/" `
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

    $codegenExitCode = 1

    try {
        switch ($accessConfiguration.AuthType) {
            "microsoft" {
                Write-Host "Using Microsoft profile:" `
                    -ForegroundColor Green

                Write-Host $microsoftProfilePath `
                    -ForegroundColor DarkGray

                Write-Host ""

                $codegenArguments = @(
                    "exec"
                    "playwright"
                    "codegen"
                    "--target=playwright-test"
                    "--user-data-dir=$microsoftProfilePath"
                    $targetUrl
                )

                & pnpm.cmd @codegenArguments

                $codegenExitCode = $LASTEXITCODE
            }

            "form" {
                if ($formCodegenMode -eq "inspect") {
                    $sessionStoragePath =
                        $accessConfiguration.SessionStoragePath

                    Write-Host `
                        "Using Form Login session storage:" `
                        -ForegroundColor Green

                    Write-Host $sessionStoragePath `
                        -ForegroundColor DarkGray

                    Write-Host ""
                    Write-Host `
                        "Authenticated browser and Playwright Inspector will open." `
                        -ForegroundColor Cyan

                    Write-Host `
                        "Use Pick Locator or inspect the authenticated application." `
                        -ForegroundColor DarkGray

                    Write-Host ""
                    Write-Host `
                        "Note: This mode is not the full Playwright Codegen recorder." `
                        -ForegroundColor Yellow

                    Write-Host ""

                    $formCodegenArguments = @(
                        $formCodegenLauncher
                        $sessionStoragePath
                        $targetUrl
                    )

                    & node.exe @formCodegenArguments

                    $codegenExitCode = $LASTEXITCODE
                }
                else {
                    Write-Host `
                        "Recording Form Login and test flow with a clean session" `
                        -ForegroundColor Green

                    Write-Host ""
                    Write-Host `
                        "Record the login steps and continue with the business flow." `
                        -ForegroundColor DarkGray

                    Write-Host ""

                    $codegenArguments = @(
                        "exec"
                        "playwright"
                        "codegen"
                        "--target=playwright-test"
                        $targetUrl
                    )

                    & pnpm.cmd @codegenArguments

                    $codegenExitCode = $LASTEXITCODE
                }
            }

            default {
                Write-Host "Using a clean browser session" `
                    -ForegroundColor Green

                Write-Host ""

                $codegenArguments = @(
                    "exec"
                    "playwright"
                    "codegen"
                    "--target=playwright-test"
                    $targetUrl
                )

                & pnpm.cmd @codegenArguments

                $codegenExitCode = $LASTEXITCODE
            }
        }
    }
    finally {
        Clear-CodegenEnvironment
    }

    Write-Host ""

    if ($codegenExitCode -eq 0) {
        if (
            $accessConfiguration.AuthType -eq "form" -and
            $formCodegenMode -eq "inspect"
        ) {
            Write-Host `
                "[SUCCESS] Authenticated browser was closed" `
                -ForegroundColor Green
        }
        else {
            Write-Host `
                "[SUCCESS] Codegen closed" `
                -ForegroundColor Green
        }
    }
    else {
        if (
            $accessConfiguration.AuthType -eq "form" -and
            $formCodegenMode -eq "inspect"
        ) {
            Write-Host `
                "[ERROR] Authenticated browser ended with an error" `
                -ForegroundColor Red
        }
        else {
            Write-Host `
                "[ERROR] Codegen ended with an error" `
                -ForegroundColor Red
        }

        Write-Host "Exit code: $codegenExitCode" `
            -ForegroundColor Red
    }

    if (
        $accessConfiguration.AuthType -eq "form" -and
        $formCodegenMode -eq "inspect"
    ) {
        Wait-ForAnyKey `
            -Message "Press any key to open another authenticated URL..."
    }
    else {
        Wait-ForAnyKey `
            -Message "Press any key to record another URL..."
    }
}