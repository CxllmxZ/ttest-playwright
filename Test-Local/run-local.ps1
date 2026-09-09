# ttest - Universal Interactive Local Test Runner
# Project > Access Flow > Module > Test Scope

# ===== Setup =====
$ErrorActionPreference = "Stop"

# Keep the current terminal configuration that works
Remove-Item Env:FORCE_COLOR -ErrorAction SilentlyContinue
$env:CI = "true"
$env:NO_COLOR = "1"

# Change to repository root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

Set-Location $repoRoot

# Use Playwright shared browser cache
Remove-Item Env:PLAYWRIGHT_BROWSERS_PATH `
    -ErrorAction SilentlyContinue

# Base directory for local tests
$testBaseDir = "Test-Local"

# ===== Verify Setup =====
if (-not (Test-Path "node_modules")) {
    Write-Host "[ERROR] Packages are not installed" `
        -ForegroundColor Red

    Write-Host "Please run Test-Local\setup.bat first" `
        -ForegroundColor Yellow

    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "playwright.config.ts")) {
    Write-Host "[ERROR] playwright.config.ts was not found" `
        -ForegroundColor Red

    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path $testBaseDir)) {
    Write-Host "[ERROR] Test-Local directory was not found" `
        -ForegroundColor Red

    Read-Host "Press Enter to exit"
    exit 1
}

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
        [string]$Hint = "(Use arrow keys, Enter to select, Esc to go back)"
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

        $key = [Console]::ReadKey($true).Key

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

# ===== Helper: Get Directories =====
function Get-VisibleDirectories {
    param(
        [string]$Path,
        [string[]]$ExcludedNames = @()
    )

    if (-not (Test-Path $Path)) {
        return @()
    }

    return @(
        Get-ChildItem `
            -LiteralPath $Path `
            -Directory |
            Where-Object {
                $_.Name -notin $ExcludedNames -and
                -not $_.Name.StartsWith("_") -and
                -not $_.Name.StartsWith(".")
            } |
            Sort-Object Name
    )
}

# ===== Helper: Get Spec Files =====
function Get-SpecFiles {
    param(
        [string]$Path,
        [switch]$Recursive
    )

    if (-not (Test-Path $Path)) {
        return @()
    }

    if ($Recursive) {
        return @(
            Get-ChildItem `
                -LiteralPath $Path `
                -Filter "*.spec.ts" `
                -File `
                -Recurse |
                Sort-Object FullName
        )
    }

    return @(
        Get-ChildItem `
            -LiteralPath $Path `
            -Filter "*.spec.ts" `
            -File |
            Sort-Object Name
    )
}

# ===== Helper: Get Relative Path =====
# Compatible with Windows PowerShell 5.1
function Get-RelativePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BasePath,

        [Parameter(Mandatory = $true)]
        [string]$TargetPath
    )

    $resolvedBasePath = (
        Resolve-Path -LiteralPath $BasePath
    ).Path

    $resolvedTargetPath = (
        Resolve-Path -LiteralPath $TargetPath
    ).Path

    if (-not $resolvedBasePath.EndsWith(
        [System.IO.Path]::DirectorySeparatorChar
    )) {
        $resolvedBasePath +=
            [System.IO.Path]::DirectorySeparatorChar
    }

    $baseUri = New-Object System.Uri($resolvedBasePath)
    $targetUri = New-Object System.Uri($resolvedTargetPath)

    $relativeUri = $baseUri.MakeRelativeUri($targetUri)
    $relativePath = [System.Uri]::UnescapeDataString(
        $relativeUri.ToString()
    )

    return $relativePath -replace "/", "\"
}

# ===== Helper: Get Access Flows =====
function Get-AccessFlows {
    param(
        [string]$ProjectPath
    )

    $directories = Get-VisibleDirectories `
        -Path $ProjectPath `
        -ExcludedNames @(
            "node_modules"
        )

    return @(
        $directories |
            Where-Object {
                $configPath = Join-Path `
                    $_.FullName `
                    "project.config.json"

                $specFiles = Get-SpecFiles `
                    -Path $_.FullName `
                    -Recursive

                (Test-Path $configPath) -or
                $specFiles.Count -gt 0
            }
    )
}

# ===== Helper: Get Modules =====
function Get-Modules {
    param(
        [string]$AccessFlowPath
    )

    $directories = Get-VisibleDirectories `
        -Path $AccessFlowPath `
        -ExcludedNames @(
            "Login"
            "_login"
            "node_modules"
        )

    return @(
        $directories |
            Where-Object {
                $specFiles = Get-SpecFiles `
                    -Path $_.FullName `
                    -Recursive

                $specFiles.Count -gt 0
            }
    )
}

# ===== Helper: Read Authentication Configuration =====
function Get-ProjectAuthentication {
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
            Type       = "none"
            StatePath  = $null
            ConfigPath = $null
        }
    }

    try {
        $config = Get-Content `
            -LiteralPath $configPath `
            -Raw |
            ConvertFrom-Json
    }
    catch {
        $errorMessage = @(
            "Invalid authentication configuration."
            ""
            "Project: $ProjectName"
            "Access flow: $AccessFlowName"
            "Configuration: $configPath"
            ""
            $_.Exception.Message
        ) -join [System.Environment]::NewLine

        throw $errorMessage
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
                Type       = "none"
                StatePath  = $null
                ConfigPath = $configPath
            }
        }

        "microsoft" {
            $statePath = Join-Path `
                $repoRoot `
                "Authen\Microsoft\state.json"

            if (-not (Test-Path $statePath)) {
                $errorMessage = @(
                    "Microsoft authentication state was not found."
                    ""
                    "Project: $ProjectName"
                    "Access flow: $AccessFlowName"
                    "Expected: $statePath"
                    ""
                    "Please run:"
                    "Authen\Microsoft\setup-microsoft-auth.bat"
                ) -join [System.Environment]::NewLine

                throw $errorMessage
            }

            return @{
                Type       = "microsoft"
                StatePath  = $statePath
                ConfigPath = $configPath
            }
        }

        "form" {
            $formStatePath = Join-Path `
                $AccessFlowPath `
                "_login\state.json"

            if (-not (Test-Path $formStatePath)) {
                $errorMessage = @(
                    "Form authentication state was not found."
                    ""
                    "Project: $ProjectName"
                    "Access flow: $AccessFlowName"
                    "Expected: $formStatePath"
                    ""
                    "Form authentication is not implemented yet."
                ) -join [System.Environment]::NewLine

                throw $errorMessage
            }

            return @{
                Type       = "form"
                StatePath  = $formStatePath
                ConfigPath = $configPath
            }
        }

        default {
            $errorMessage = @(
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

            throw $errorMessage
        }
    }
}

# ===== Helper: Apply Authentication =====
function Set-TestAuthentication {
    param(
        [hashtable]$Authentication
    )

    switch ($Authentication.Type) {
        "microsoft" {
            $env:AUTH_TYPE = "microsoft"
            $env:AUTH_STATE_PATH = $Authentication.StatePath

            Write-Host "[AUTH] Type: Microsoft" `
                -ForegroundColor Green

            Write-Host "[AUTH] State: $($Authentication.StatePath)" `
                -ForegroundColor DarkGray
        }

        "form" {
            $env:AUTH_TYPE = "form"
            $env:AUTH_STATE_PATH = $Authentication.StatePath

            Write-Host "[AUTH] Type: Form" `
                -ForegroundColor Green

            Write-Host "[AUTH] State: $($Authentication.StatePath)" `
                -ForegroundColor DarkGray
        }

        default {
            $env:AUTH_TYPE = "none"

            Remove-Item Env:AUTH_STATE_PATH `
                -ErrorAction SilentlyContinue

            Write-Host "[AUTH] Type: None" `
                -ForegroundColor DarkGray
        }
    }
}

# ===== Helper: Clear Authentication =====
function Clear-TestAuthentication {
    Remove-Item Env:AUTH_TYPE `
        -ErrorAction SilentlyContinue

    Remove-Item Env:AUTH_STATE_PATH `
        -ErrorAction SilentlyContinue
}

# ===== Helper: Run Playwright Test =====
function Invoke-PlaywrightTest {
    param(
        [string]$Path,
        [string]$ProjectName,
        [string]$AccessFlowName,
        [string]$AccessFlowPath,
        [string]$RunLabel
    )

    Clear-Host

    Write-Host "==========================================" `
        -ForegroundColor Cyan

    Write-Host "  Running Playwright Tests" `
        -ForegroundColor Cyan

    Write-Host "==========================================" `
        -ForegroundColor Cyan

    Write-Host ""
    Write-Host "Project:     $ProjectName"
    Write-Host "Access flow: $AccessFlowName"
    Write-Host "Test scope:  $RunLabel"
    Write-Host "Path:        $Path"
    Write-Host ""

    try {
        $authentication = Get-ProjectAuthentication `
            -AccessFlowPath $AccessFlowPath `
            -ProjectName $ProjectName `
            -AccessFlowName $AccessFlowName
    }
    catch {
        Write-Host "[ERROR] Authentication configuration failed" `
            -ForegroundColor Red

        Write-Host ""
        Write-Host $_.Exception.Message `
            -ForegroundColor Yellow

        Wait-ForAnyKey `
            -Message "Press any key to return to the menu..."

        return @{
            Executed = $false
            ExitCode = 1
        }
    }

    Set-TestAuthentication `
        -Authentication $authentication

    Write-Host ""

    # Find every spec file under the selected scope
    $discoveredTests = Get-SpecFiles `
        -Path $Path `
        -Recursive

    if ($discoveredTests.Count -eq 0) {
        Clear-TestAuthentication

        Write-Host "[ERROR] No .spec.ts files were found" `
            -ForegroundColor Red

        Write-Host "Path: $Path" `
            -ForegroundColor Yellow

        Wait-ForAnyKey `
            -Message "Press any key to return to the menu..."

        return @{
            Executed = $false
            ExitCode = 1
        }
    }

    Write-Host "Spec files found: $($discoveredTests.Count)" `
        -ForegroundColor DarkGray

    # Convert every discovered spec file to a repository-relative path
    $playwrightTestPaths = @(
        foreach ($specFile in $discoveredTests) {
            $relativeSpecPath = Get-RelativePath `
                -BasePath $repoRoot `
                -TargetPath $specFile.FullName

            $relativeSpecPath -replace "\\", "/"
        }
    )

    Write-Host "Playwright test files:" `
        -ForegroundColor DarkGray

    foreach ($testPath in $playwrightTestPaths) {
        Write-Host "  - $testPath" `
            -ForegroundColor DarkGray
    }

    Write-Host ""

    $playwrightCommand = Join-Path `
        $repoRoot `
        "node_modules\.bin\playwright.cmd"

    if (-not (Test-Path $playwrightCommand)) {
        Clear-TestAuthentication

        Write-Host "[ERROR] Playwright command was not found" `
            -ForegroundColor Red

        Write-Host "Expected: $playwrightCommand" `
            -ForegroundColor Yellow

        Wait-ForAnyKey `
            -Message "Press any key to return to the menu..."

        return @{
            Executed = $false
            ExitCode = 1
        }
    }

    $testExitCode = 1

    try {
        $playwrightArguments = @(
            "test"
        ) + $playwrightTestPaths

        & $playwrightCommand @playwrightArguments

        $testExitCode = $LASTEXITCODE
    }
    finally {
        Clear-TestAuthentication
    }

    Write-Host ""
    Write-Host "==========================================" `
        -ForegroundColor Cyan

    if ($testExitCode -eq 0) {
        Write-Host "[SUCCESS] Test execution completed" `
            -ForegroundColor Green
    }
    else {
        Write-Host "[FAILED] Test execution failed" `
            -ForegroundColor Red

        Write-Host "Exit code: $testExitCode" `
            -ForegroundColor Red
    }

    Write-Host ""

    if (Test-Path "playwright-report\index.html") {
        Write-Host "Opening report..." `
            -ForegroundColor Green

        Start-Process "playwright-report\index.html"
    }
    else {
        Write-Host "[WARNING] No report generated" `
            -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "==========================================" `
        -ForegroundColor Cyan

    Wait-ForAnyKey `
        -Message "Press any key to return to the menu..."

    return @{
        Executed = $true
        ExitCode = $testExitCode
    }
}

# ===== Main Loop =====
:mainLoop while ($true) {
    Clear-TestAuthentication

    # ---- Level 1: Select Project ----
    $projectDirectories = Get-VisibleDirectories `
        -Path $testBaseDir `
        -ExcludedNames @(
            "node_modules"
            "Authen"
        )

    if ($projectDirectories.Count -eq 0) {
        Write-Host "[WARNING] No projects were found in $testBaseDir" `
            -ForegroundColor Yellow

        Read-Host "Press Enter to exit"
        exit 1
    }

    $projectNames = @(
        $projectDirectories |
            Select-Object -ExpandProperty Name
    )

    $projectMenu = $projectNames + "[ Exit ]"

    $projectChoice = Show-Menu `
        -Title "ttest - Select Project" `
        -Items $projectMenu

    if (
        $projectChoice -eq -1 -or
        $projectChoice -eq ($projectMenu.Count - 1)
    ) {
        Clear-Host

        Write-Host "Goodbye!" `
            -ForegroundColor Green

        exit 0
    }

    $selectedProjectDirectory = $projectDirectories[$projectChoice]
    $selectedProject = $selectedProjectDirectory.Name
    $projectPath = $selectedProjectDirectory.FullName

    :accessFlowLoop while ($true) {
        # ---- Level 2: Select Access Flow ----
        $accessFlows = Get-AccessFlows `
            -ProjectPath $projectPath

        if ($accessFlows.Count -eq 0) {
            Clear-Host

            Write-Host "[ERROR] No valid access flows were found" `
                -ForegroundColor Red

            Write-Host ""
            Write-Host "Project: $selectedProject"
            Write-Host "Expected structure:"
            Write-Host ""
            Write-Host "Test-Local\<project>\<access-flow>\project.config.json"
            Write-Host "Test-Local\<project>\<access-flow>\<module>\*.spec.ts"

            Wait-ForAnyKey `
                -Message "Press any key to return to project selection..."

            continue mainLoop
        }

        if ($accessFlows.Count -eq 1) {
            $selectedAccessFlowDirectory = $accessFlows[0]
        }
        else {
            $accessFlowNames = @(
                $accessFlows |
                    Select-Object -ExpandProperty Name
            )

            $accessFlowMenu = $accessFlowNames +
                "[ Back to project selection ]"

            $accessFlowChoice = Show-Menu `
                -Title "$selectedProject - Select Access Flow" `
                -Items $accessFlowMenu

            if (
                $accessFlowChoice -eq -1 -or
                $accessFlowChoice -eq ($accessFlowMenu.Count - 1)
            ) {
                continue mainLoop
            }

            $selectedAccessFlowDirectory =
                $accessFlows[$accessFlowChoice]
        }

        $selectedAccessFlow =
            $selectedAccessFlowDirectory.Name

        $accessFlowPath =
            $selectedAccessFlowDirectory.FullName

        :moduleLoop while ($true) {
            # ---- Level 3: Select Module ----
            $modules = Get-Modules `
                -AccessFlowPath $accessFlowPath

            if ($modules.Count -eq 0) {
                Clear-Host

                Write-Host "[WARNING] No test modules were found" `
                    -ForegroundColor Yellow

                Write-Host ""
                Write-Host "Project: $selectedProject"
                Write-Host "Access flow: $selectedAccessFlow"
                Write-Host "Path: $accessFlowPath"

                Wait-ForAnyKey `
                    -Message "Press any key to go back..."

                if ($accessFlows.Count -eq 1) {
                    continue mainLoop
                }

                continue accessFlowLoop
            }

            $moduleNames = @(
                $modules |
                    Select-Object -ExpandProperty Name
            )

            $moduleMenu = @(
                "[ Run ALL modules in $selectedAccessFlow ]"
            ) +
            $moduleNames +
            "[ Back ]"

            $moduleChoice = Show-Menu `
                -Title "$selectedProject / $selectedAccessFlow - Select Module" `
                -Items $moduleMenu

            if (
                $moduleChoice -eq -1 -or
                $moduleChoice -eq ($moduleMenu.Count - 1)
            ) {
                if ($accessFlows.Count -eq 1) {
                    continue mainLoop
                }

                continue accessFlowLoop
            }

            if ($moduleChoice -eq 0) {
                # Run every test under the selected access flow immediately
                $runPath = $accessFlowPath
                $runLabel = "ALL modules in $selectedAccessFlow"

                :allModulesRunLoop while ($true) {
                    Invoke-PlaywrightTest `
                        -Path $runPath `
                        -ProjectName $selectedProject `
                        -AccessFlowName $selectedAccessFlow `
                        -AccessFlowPath $accessFlowPath `
                        -RunLabel $runLabel

                    $postRunMenu = @(
                        "Run again: $runLabel"
                        "Change module"
                        "Change access flow"
                        "Change project"
                        "[ Exit ]"
                    )

                    $postChoice = Show-Menu `
                        -Title "Test Complete" `
                        -Items $postRunMenu

                    switch ($postChoice) {
                        0 {
                            continue allModulesRunLoop
                        }

                        1 {
                            continue moduleLoop
                        }

                        2 {
                            if ($accessFlows.Count -eq 1) {
                                continue mainLoop
                            }

                            continue accessFlowLoop
                        }

                        3 {
                            continue mainLoop
                        }

                        default {
                            Clear-TestAuthentication
                            Clear-Host
                            Write-Host "Goodbye!" -ForegroundColor Green
                            exit 0
                        }
                    }
                }
            }
            else {
                $selectedModuleDirectory = $modules[$moduleChoice - 1]
                $selectedModule = $selectedModuleDirectory.Name
                $modulePath = $selectedModuleDirectory.FullName
            }

            :scopeLoop while ($true) {
                # ---- Level 4: Select Scope ----
                $allSpecFiles = Get-SpecFiles `
                    -Path $modulePath `
                    -Recursive

                if ($allSpecFiles.Count -eq 0) {
                    Clear-Host

                    Write-Host "[WARNING] No .spec.ts files were found" `
                        -ForegroundColor Yellow

                    Write-Host ""
                    Write-Host "Path: $modulePath"

                    Wait-ForAnyKey `
                        -Message "Press any key to go back..."

                    continue moduleLoop
                }

                $scopeMenu = @(
                    "Run ALL tests in $selectedModule"
                    "Select SPECIFIC test file"
                    "[ Back ]"
                )

                $scopeChoice = Show-Menu `
                    -Title "$selectedProject / $selectedAccessFlow / $selectedModule" `
                    -Items $scopeMenu

                if (
                    $scopeChoice -eq -1 -or
                    $scopeChoice -eq 2
                ) {
                    continue moduleLoop
                }

                if ($scopeChoice -eq 0) {
                    $runPath = $modulePath
                    $runLabel = "ALL tests in $selectedModule"
                }
                else {
                    # ---- Level 5: Select Spec File ----
                    :fileLoop while ($true) {
                        $specFileLabels = @(
                            foreach ($specFile in $allSpecFiles) {
                                Get-RelativePath `
                                    -BasePath $modulePath `
                                    -TargetPath $specFile.FullName
                            }
                        )                        

                        $fileMenu = $specFileLabels + "[ Back ]"

                        $fileChoice = Show-Menu `
                            -Title "Select Test File" `
                            -Items $fileMenu

                        if (
                            $fileChoice -eq -1 -or
                            $fileChoice -eq ($fileMenu.Count - 1)
                        ) {
                            continue scopeLoop
                        }

                        $selectedSpecFile =
                            $allSpecFiles[$fileChoice]

                        $runPath =
                            $selectedSpecFile.FullName

                        $runLabel =
                            $specFileLabels[$fileChoice]

                        break fileLoop
                    }
                }

                # ---- Run Test and Post-run Menu ----
                :runLoop while ($true) {
                    $runResult = Invoke-PlaywrightTest `
                        -Path $runPath `
                        -ProjectName $selectedProject `
                        -AccessFlowName $selectedAccessFlow `
                        -AccessFlowPath $accessFlowPath `
                        -RunLabel $runLabel

                    $postRunMenu = @(
                        "Run again: $runLabel"
                        "Change test scope"
                        "Change module"
                        "Change access flow"
                        "Change project"
                        "[ Exit ]"
                    )

                    $postChoice = Show-Menu `
                        -Title "Test Complete" `
                        -Items $postRunMenu

                    switch ($postChoice) {
                        0 {
                            continue runLoop
                        }

                        1 {
                            continue scopeLoop
                        }

                        2 {
                            continue moduleLoop
                        }

                        3 {
                            if ($accessFlows.Count -eq 1) {
                                continue mainLoop
                            }

                            continue accessFlowLoop
                        }

                        4 {
                            continue mainLoop
                        }

                        default {
                            Clear-TestAuthentication
                            Clear-Host

                            Write-Host "Goodbye!" `
                                -ForegroundColor Green

                            exit 0
                        }
                    }
                }
            }
        }
    }
}