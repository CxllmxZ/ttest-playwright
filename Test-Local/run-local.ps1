# ttest - Interactive Local Test Runner (Playwright direct)
# Uses arrow keys + Enter for selection

# ===== Setup =====
$ErrorActionPreference = 'Stop'

# Change to repo root (parent of Test-Local)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
Set-Location $repoRoot

# Set Playwright to use local browsers
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $repoRoot "browsers"

# ===== Verify Setup =====
if (-not (Test-Path "node_modules")) {
    Write-Host "[ERROR] Packages not installed" -ForegroundColor Red
    Write-Host "Please run Test-Local\setup.bat first" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "playwright.config.ts")) {
    Write-Host "[ERROR] playwright.config.ts not found" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# ===== Helper: Interactive Menu with Arrow Keys =====
function Show-Menu {
    param(
        [string]$Title,
        [string[]]$Items,
        [string]$Hint = "(Use arrow keys, Enter to select, Esc to go back)"
    )
    
    $selected = 0
    $key = $null
    
    while ($key -ne 13 -and $key -ne 27) {
        Clear-Host
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host "  $Title" -ForegroundColor Cyan
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host ""
        
        for ($i = 0; $i -lt $Items.Count; $i++) {
            if ($i -eq $selected) {
                Write-Host "  > $($Items[$i])" -ForegroundColor Green
            } else {
                Write-Host "    $($Items[$i])" -ForegroundColor Gray
            }
        }
        
        Write-Host ""
        Write-Host $Hint -ForegroundColor DarkGray
        
        $key = [Console]::ReadKey($true).Key
        
        switch ($key) {
            'UpArrow'   { if ($selected -gt 0) { $selected-- } }
            'DownArrow' { if ($selected -lt ($Items.Count - 1)) { $selected++ } }
            'Enter'     { return $selected }
            'Escape'    { return -1 }
        }
    }
}

# ===== Helper: Run Playwright Test =====
function Invoke-PlaywrightTest {
    param([string]$Path)
    
    Clear-Host
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  Running: $Path" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Playwright CLI - use forward slashes
    $pathForPlaywright = $Path -replace '\\', '/'
    
    & pnpm exec playwright test $pathForPlaywright
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    
    if (Test-Path "playwright-report\index.html") {
        Write-Host "Opening report..." -ForegroundColor Green
        Start-Process "playwright-report\index.html"
    } else {
        Write-Host "[WARNING] No report generated" -ForegroundColor Yellow
    }
}

# ===== Main Loop =====
$testBaseDir = "Test-Local"

:mainLoop while ($true) {
    # ---- Level 1: Select Project ----
    $projects = @(
        Get-ChildItem -Path $testBaseDir -Directory | 
        Where-Object { $_.Name -notin @('.git', 'node_modules') } |
        Select-Object -ExpandProperty Name
    )
    
    if ($projects.Count -eq 0) {
        Write-Host "[WARNING] No projects in $testBaseDir" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    $projectMenu = $projects + "[ Exit ]"
    $projectChoice = Show-Menu -Title "ttest - Select Project" -Items $projectMenu
    
    if ($projectChoice -eq -1 -or $projectChoice -eq ($projectMenu.Count - 1)) {
        Clear-Host
        Write-Host "Goodbye!" -ForegroundColor Green
        exit 0
    }
    
    $selectedProject = $projects[$projectChoice]
    $projectPath = Join-Path $testBaseDir $selectedProject
    
    :scopeLoop while ($true) {
        # ---- Level 2: Select Scope ----
        $scopeMenu = @(
            "Run ALL tests in $selectedProject",
            "Select SPECIFIC test file",
            "[ Back to project selection ]"
        )
        
        $scopeChoice = Show-Menu -Title "Project: $selectedProject" -Items $scopeMenu
        
        if ($scopeChoice -eq -1 -or $scopeChoice -eq 2) {
            continue mainLoop  # back to project selection
        }
        
        # Determine what to run
        if ($scopeChoice -eq 0) {
            # Run all
            $specFiles = @(Get-ChildItem -Path $projectPath -Filter "*.spec.ts" -File)
            
            if ($specFiles.Count -eq 0) {
                Write-Host "[WARNING] No .spec.ts files in $selectedProject" -ForegroundColor Yellow
                Read-Host "Press Enter to continue"
                continue scopeLoop
            }
            
            $runPath = $projectPath
            $runLabel = "ALL tests in $selectedProject"
        }
        else {
            # ---- Level 3: Select File ----
            :fileLoop while ($true) {
                $specFiles = @(
                    Get-ChildItem -Path $projectPath -Filter "*.spec.ts" -File | 
                    Select-Object -ExpandProperty Name
                )
                
                if ($specFiles.Count -eq 0) {
                    Write-Host "[WARNING] No .spec.ts files in $selectedProject" -ForegroundColor Yellow
                    Read-Host "Press Enter to continue"
                    continue scopeLoop
                }
                
                $fileMenu = $specFiles + "[ Back ]"
                $fileChoice = Show-Menu -Title "Select Test File in $selectedProject" -Items $fileMenu
                
                if ($fileChoice -eq -1 -or $fileChoice -eq ($fileMenu.Count - 1)) {
                    continue scopeLoop
                }
                
                $selectedFile = $specFiles[$fileChoice]
                $runPath = Join-Path $projectPath $selectedFile
                $runLabel = $selectedFile
                break fileLoop
            }
        }
        
        # ---- Run Test (with post-run loop for "run again") ----
        :runLoop while ($true) {
            Invoke-PlaywrightTest -Path $runPath
            
            # ---- Post-Run Menu ----
            $postRunMenu = @(
                "Run again: $runLabel",
                "Change test file (same project: $selectedProject)",
                "Change project",
                "[ Exit ]"
            )
            
            $postChoice = Show-Menu -Title "Test complete" -Items $postRunMenu
            
            switch ($postChoice) {
                0 {
                    # Run again - stay in runLoop
                    continue runLoop
                }
                1 {
                    # Change file - go to scope menu (which will lead to file selection)
                    continue scopeLoop
                }
                2 {
                    # Change project - back to top
                    continue mainLoop
                }
                default {
                    # Exit (3 or -1)
                    Clear-Host
                    Write-Host "Goodbye!" -ForegroundColor Green
                    exit 0
                }
            }
        }
    }
}