@echo off
setlocal
chcp 65001 >nul

REM Change to repo root (parent of Test-Local)
cd /d "%~dp0.."

echo ==========================================
echo   ttest - First Time Setup
echo ==========================================
echo.
echo Repo location: %CD%
echo.

REM Set Playwright to use local browsers folder (in repo)
set PLAYWRIGHT_BROWSERS_PATH=%CD%\browsers

REM ---- Check Node.js ----
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not installed
    echo Please install from: https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VERSION=%%v
echo [OK] Node.js: %NODE_VERSION%
echo.

REM ---- Check pnpm ----
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing pnpm globally...
    call npm install -g pnpm
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install pnpm
        pause
        exit /b 1
    )
)

for /f "tokens=*" %%v in ('pnpm --version') do set PNPM_VERSION=%%v
echo [OK] pnpm: %PNPM_VERSION%
echo.

REM ---- Install packages ----
echo Installing packages into ./node_modules/...
call pnpm install --frozen-lockfile
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install packages
    pause
    exit /b 1
)
echo [OK] Packages installed
echo.

REM ---- Install Chromium ----
echo Installing Chromium (~200MB) into ./browsers/...
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
echo Next: Double-click "run-local.bat"
echo.
pause
