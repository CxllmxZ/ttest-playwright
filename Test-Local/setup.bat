@echo off
setlocal
chcp 65001 >nul

REM Change to repo root (parent of Test-Local)
cd /d "%~dp0.."

echo ==========================================
echo   Playwright Tests - Setup
echo ==========================================
echo.
echo Repo location: %CD%
echo.

REM Set Playwright to use local browsers folder
set PLAYWRIGHT_BROWSERS_PATH=%CD%\browsers

REM ---- Check Node.js ----
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Node.js not installed
    echo.
    echo Please install Node.js from: https://nodejs.org
    echo Recommended: LTS version (v22 or higher)
    echo.
    echo After installing:
    echo   1. Restart your terminal
    echo   2. Run this setup.bat again
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VERSION=%%v
echo [OK] Node.js: %NODE_VERSION%
echo.

REM ---- Check pnpm (auto-install if missing) ----
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] pnpm not found - installing globally...
    call npm install -g pnpm
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install pnpm
        echo Please install manually: npm install -g pnpm
        pause
        exit /b 1
    )
    echo [OK] pnpm installed
)

for /f "tokens=*" %%v in ('pnpm --version') do set PNPM_VERSION=%%v
echo [OK] pnpm: %PNPM_VERSION%
echo.

REM ---- Install Playwright (only) ----
echo Installing @playwright/test...
call pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install packages
    pause
    exit /b 1
)
echo [OK] Playwright installed
echo.

REM ---- Install Chromium ----
echo Installing Chromium browser (~200MB)...
echo (This may take 1-3 minutes)
call pnpm exec playwright install chromium
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install Chromium
    pause
    exit /b 1
)
echo [OK] Chromium installed
echo.

echo ==========================================
echo   Setup complete!
echo ==========================================
echo.
echo Next steps:
echo   - Double-click "run-local.bat" to run tests
echo   - Double-click "run-codegen.bat" to record new tests
echo.
pause
