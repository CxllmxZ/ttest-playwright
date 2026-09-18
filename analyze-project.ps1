# analyze-project.ps1
# Scan Test-Local/ folder → generate .agent-cache/project-structure.json
# Full metadata: control types, test case IDs, file paths

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

$testLocalRoot = Join-Path $repoRoot "Test-Local"
$outputPath = Join-Path $repoRoot ".agent-cache\project-structure.json"

if (-not (Test-Path $testLocalRoot)) {
    Write-Host "[ERROR] Test-Local folder not found: $testLocalRoot" -ForegroundColor Red
    exit 1
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  ttest-playwright - Project Analyzer" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Scanning: $testLocalRoot" -ForegroundColor Yellow
Write-Host ""

# Ensure output directory exists
$outputDir = Split-Path -Parent $outputPath
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

# ============================================================
# Helper functions
# ============================================================

function Get-ControlTypes {
    param([string]$FilePath)

    if (-not (Test-Path $FilePath)) { return @() }

    $content = Get-Content -Raw -LiteralPath $FilePath
    $regex = [regex]"controlType:\s*'([^']+)'"
    $matches = $regex.Matches($content)

    $types = @()
    foreach ($m in $matches) {
        $types += $m.Groups[1].Value
    }

    return @($types | Select-Object -Unique)
}

function Get-TestCases {
    param([string]$FilePath)

    if (-not (Test-Path $FilePath)) { return @() }

    $content = Get-Content -Raw -LiteralPath $FilePath

    $idRegex = [regex]"testCaseId:\s*'([^']+)'"
    $scenarioRegex = [regex]"scenario:\s*'([^']+)'"

    $idMatches = $idRegex.Matches($content)
    $scenarioMatches = $scenarioRegex.Matches($content)

    $cases = @()
    for ($i = 0; $i -lt $idMatches.Count; $i++) {
        $id = $idMatches[$i].Groups[1].Value

        $scenario = ""
        if ($i -lt $scenarioMatches.Count) {
            $scenario = $scenarioMatches[$i].Groups[1].Value
        }

        $cases += @{
            id = $id
            scenario = $scenario
        }
    }

    return $cases
}

function Get-AuthType {
    param([string]$AccessFlowPath)

    $configPath = Join-Path $AccessFlowPath "project.config.json"
    if (-not (Test-Path $configPath)) { return "unknown" }

    try {
        $config = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
        return $config.authType
    }
    catch {
        return "unknown"
    }
}

function Get-FeatureFiles {
    param(
        [string]$FeaturePath,
        [string]$FeatureName
    )

    $files = @{}

    # Try convention-based naming first: <feature>.spec.ts etc.
    $conventions = @{
        spec = "$FeatureName.spec.ts"
        helper = "$FeatureName.helper.ts"
        types = "$FeatureName.types.ts"
        data = "$FeatureName.data.ts"
    }

    foreach ($key in $conventions.Keys) {
        $filePath = Join-Path $FeaturePath $conventions[$key]
        if (Test-Path $filePath) {
            $files[$key] = $conventions[$key]
        }
    }

    # If convention didn't match, list any spec files
    if (-not $files.ContainsKey("spec")) {
        $specFiles = @(Get-ChildItem -Path $FeaturePath -Filter "*.spec.ts" -File -ErrorAction SilentlyContinue)
        if ($specFiles.Count -gt 0) {
            $files["spec"] = @($specFiles | ForEach-Object { $_.Name })
        }
    }

    # Locators folder (gitignored, but list files if present)
    $locatorsPath = Join-Path $FeaturePath "_locators"
    if (Test-Path $locatorsPath) {
        $locatorFiles = @(Get-ChildItem -Path $locatorsPath -Filter "*.ts" -File -ErrorAction SilentlyContinue)
        if ($locatorFiles.Count -gt 0) {
            $files["locators"] = @($locatorFiles | ForEach-Object { "_locators/$($_.Name)" })
        }
    }

    return $files
}

function Get-Structure {
    param([hashtable]$Files)

    if ($Files.ContainsKey("helper") -and $Files.ContainsKey("types") -and $Files.ContainsKey("data")) {
        return "4-file"
    }
    return "1-file"
}

# ============================================================
# Main scan
# ============================================================

$projects = @()

$projectDirs = @(Get-ChildItem -Path $testLocalRoot -Directory | Where-Object { $_.Name -notlike "_*" })

foreach ($projectDir in $projectDirs) {
    Write-Host "  Project: $($projectDir.Name)" -ForegroundColor Green

    $accessFlows = @()
    $accessFlowDirs = @(Get-ChildItem -Path $projectDir.FullName -Directory)

    foreach ($accessFlowDir in $accessFlowDirs) {
        $authType = Get-AuthType -AccessFlowPath $accessFlowDir.FullName
        Write-Host "    Access Flow: $($accessFlowDir.Name) (auth: $authType)" -ForegroundColor DarkGreen

        $modules = @()
        $moduleDirs = @(Get-ChildItem -Path $accessFlowDir.FullName -Directory | Where-Object { $_.Name -notlike "_*" })

        foreach ($moduleDir in $moduleDirs) {
            Write-Host "      Module: $($moduleDir.Name)" -ForegroundColor DarkYellow

            $features = @()
            $featureDirs = @(Get-ChildItem -Path $moduleDir.FullName -Directory | Where-Object { $_.Name -notlike "_*" })

            if ($featureDirs.Count -eq 0) {
                # Flat module (no feature subfolders) - treat spec files as features
                $specFiles = @(Get-ChildItem -Path $moduleDir.FullName -Filter "*.spec.ts" -File)

                foreach ($specFile in $specFiles) {
                    $featureName = $specFile.BaseName -replace "\.spec$", ""
                    $files = @{ spec = $specFile.Name }

                    $features += @{
                        name = $featureName
                        structure = "1-file"
                        files = $files
                        controlTypes = @()
                        testCaseCount = 0
                        testCases = @()
                    }

                    Write-Host "        Feature (1-file): $featureName" -ForegroundColor Gray
                }
            }
            else {
                foreach ($featureDir in $featureDirs) {
                    $featureName = $featureDir.Name

                    $files = Get-FeatureFiles -FeaturePath $featureDir.FullName -FeatureName $featureName
                    $structure = Get-Structure -Files $files

                    $controlTypes = @()
                    if ($files.ContainsKey("types")) {
                        $typesFullPath = Join-Path $featureDir.FullName $files["types"]
                        $controlTypes = Get-ControlTypes -FilePath $typesFullPath
                    }

                    $testCases = @()
                    if ($files.ContainsKey("data")) {
                        $dataFullPath = Join-Path $featureDir.FullName $files["data"]
                        $testCases = Get-TestCases -FilePath $dataFullPath
                    }

                    $features += @{
                        name = $featureName
                        structure = $structure
                        files = $files
                        controlTypes = $controlTypes
                        testCaseCount = $testCases.Count
                        testCases = $testCases
                    }

                    Write-Host "        Feature ($structure): $featureName [$($testCases.Count) cases, $($controlTypes.Count) types]" -ForegroundColor Gray
                }
            }

            $modules += @{
                name = $moduleDir.Name
                features = $features
            }
        }

        $accessFlows += @{
            name = $accessFlowDir.Name
            authType = $authType
            modules = $modules
        }
    }

    $projects += @{
        name = $projectDir.Name
        accessFlows = $accessFlows
    }
}

# ============================================================
# Build output + write JSON (UTF-8 no BOM)
# ============================================================

$output = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    generator = "analyze-project.ps1"
    projectCount = $projects.Count
    projects = $projects
}

$json = $output | ConvertTo-Json -Depth 20

# Write without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outputPath, $json, $utf8NoBom)

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Done" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Output: $outputPath" -ForegroundColor Green
Write-Host "Projects: $($projects.Count)" -ForegroundColor Green

$totalFeatures = 0
$totalTestCases = 0
foreach ($p in $projects) {
    foreach ($af in $p.accessFlows) {
        foreach ($m in $af.modules) {
            $totalFeatures += $m.features.Count
            foreach ($f in $m.features) {
                $totalTestCases += $f.testCaseCount
            }
        }
    }
}

Write-Host "Features: $totalFeatures" -ForegroundColor Green
Write-Host "Test cases: $totalTestCases" -ForegroundColor Green
Write-Host ""
