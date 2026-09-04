@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

cd /d "%~dp0.."

echo ==========================================
echo   Playwright Tests - Setup
echo ==========================================
echo.
echo Repo location: %CD%
echo.

set PLAYWRIGHT_BROWSERS_PATH=%CD%\browsers

REM ---- Check Node.js ----
where node >nul 2>nul
if not errorlevel 1 (
    echo [SUCCESS] Node.js is installed
    node -v
) else (
    echo [ERROR] Node.js not installed
    echo Please install from https://nodejs.org
    pause
    exit /b 1
)
echo.

REM ---- Check pnpm ----
where pnpm >nul 2>nul
if not errorlevel 1 (
    echo [SUCCESS] pnpm is installed
    pnpm -v
) else (
    echo [INFO] pnpm not found, installing globally...
    call npm install -g pnpm
    if errorlevel 1 (
        echo [ERROR] Failed to install pnpm
        pause
        exit /b 1
    )
    echo [SUCCESS] pnpm installed
    pnpm -v
)
echo.
echo DEBUG-1: Reached Playwright section
echo.

REM ---- Install Playwright ----
echo Installing @playwright/test...
call pnpm add -D @playwright/test
if errorlevel 1 (
    echo [ERROR] Failed to install Playwright
    pause
    exit /b 1
)

REM Verify Playwright installed
where pnpm >nul 2>nul
call pnpm exec playwright --version
if errorlevel 1 (
    echo [ERROR] Playwright not working
    pause
    exit /b 1
)
echo [SUCCESS] Playwright installed
echo.

REM ---- Install Chromium ----
echo Installing Chromium browser 200MB...
echo This may take 1-3 minutes
call pnpm exec playwright install chromium
if errorlevel 1 (
    echo [ERROR] Failed to install Chromium
    pause
    exit /b 1
)

REM Verify Chromium
if exist browsers (
    echo [SUCCESS] Chromium installed
    dir browsers /b
) else (
    echo [ERROR] browsers folder not created
    pause
    exit /b 1
)
echo.

echo ==========================================
echo   Setup complete!
echo ==========================================
echo.
echo Next steps:
echo   Double-click run-local.bat to run tests
echo   Double-click run-codegen.bat to record tests
echo.
pause