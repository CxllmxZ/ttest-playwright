@echo off
setlocal
chcp 65001 >nul

REM Change to repo root
cd /d "%~dp0.."

echo ==========================================
echo   Playwright Tests - Setup
echo ==========================================
echo.
echo Repo location: %CD%
echo.

REM Set Playwright to use local browsers
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

REM ---- Install packages via npm ----
echo Installing packages...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install packages
    pause
    exit /b 1
)
echo [OK] Packages installed
echo.

REM ---- Install Chromium ----
echo Installing Chromium browser (~200MB)...
call npx playwright install chromium
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
echo Next: Double-click "run-local.bat" to test
echo Or:   Double-click "run-codegen.bat" to record new tests
echo.
pause
