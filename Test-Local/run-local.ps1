# ttest - Interactive Local Test Runner
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
if (-not (Test-Path "dist\cli.js")) {
    Write-Host "[ERROR] ttest not built" -ForegroundColor Red
    Write-Host "Please run Test-Local\setup.bat first" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Host "[ERROR] Packages not installed" -ForegroundColor Red
    Write-Host "Please run Test-Local\setup.bat first" -ForegroundColor Yellow
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
    
    while ($key -ne 13 -and $key -ne 27) {  # 13=Enter, 27=Esc
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

# ===== Helper: Run Test =====
function Invoke-TTest {
    param([string]$Path)
    
    Clear-Host
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  Running: $Path" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    
    node dist\cli.js run $Path
    
    $exitCode = $LASTEXITCODE
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    
    if (Test-Path "report\index.html") {
        Write-Host "Opening report..." -ForegroundColor Green
        Start-Process "report\index.html"
    } else {
        Write-Host "[WARNING] No report generated" -ForegroundColor Yellow
    }
    
    return $exitCode
}

# ===== Main Loop =====
$testBaseDir = "Test-Local\project-testcase-local"

while ($true) {
    # ---- Level 1: Select Project ----
    if (-not (Test-Path $testBaseDir)) {
        Write-Host "[ERROR] Folder not found: $testBaseDir" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    $projects = @(Get-ChildItem -Path $testBaseDir -Directory | Select-Object -ExpandProperty Name)
    
    if ($projects.Count -eq 0) {
        Write-Host "[WARNING] No projects in $testBaseDir" -ForegroundColor Yellow
        Write-Host "Create a folder with .yaml files first" -ForegroundColor Gray
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
    
    # ---- Level 2: Select Scope ----
    $scopeMenu = @(
        "Run ALL tests in $selectedProject",
        "Select SPECIFIC test file",
        "[ Back ]"
    )
    
    $scopeChoice = Show-Menu -Title "Project: $selectedProject" -Items $scopeMenu
    
    if ($scopeChoice -eq -1 -or $scopeChoice -eq 2) {
        continue  # back to project menu
    }
    
    if ($scopeChoice -eq 0) {
        # Run all
        $yamlFiles = @(Get-ChildItem -Path $projectPath -Filter "*.yaml" -File)
        
        if ($yamlFiles.Count -eq 0) {
            Write-Host "[WARNING] No .yaml files in $selectedProject" -ForegroundColor Yellow
            Read-Host "Press Enter to continue"
            continue
        }
        
        Invoke-TTest -Path $projectPath
    }
    else {
        # ---- Level 3: Select File ----
        $yamlFiles = @(Get-ChildItem -Path $projectPath -Filter "*.yaml" -File | Select-Object -ExpandProperty Name)
        
        if ($yamlFiles.Count -eq 0) {
            Write-Host "[WARNING] No .yaml files in $selectedProject" -ForegroundColor Yellow
            Read-Host "Press Enter to continue"
            continue
        }
        
        $fileMenu = $yamlFiles + "[ Back ]"
        $fileChoice = Show-Menu -Title "Select Test File in $selectedProject" -Items $fileMenu
        
        if ($fileChoice -eq -1 -or $fileChoice -eq ($fileMenu.Count - 1)) {
            continue  # back to scope menu
        }
        
        $selectedFile = $yamlFiles[$fileChoice]
        $fullPath = Join-Path $projectPath $selectedFile
        
        Invoke-TTest -Path $fullPath
    }
    
    # ---- After Run ----
    $continueMenu = @(
        "Run another test",
        "[ Exit ]"
    )
    
    $continueChoice = Show-Menu -Title "Test complete" -Items $continueMenu
    
    if ($continueChoice -eq -1 -or $continueChoice -eq 1) {
        Clear-Host
        Write-Host "Goodbye!" -ForegroundColor Green
        exit 0
    }
}