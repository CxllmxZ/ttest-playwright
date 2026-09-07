@echo off
setlocal 
chcp 437 >nul

set "CI=true"
set "NO_COLOR=1"
set "FORCE_COLOR=-"

cd /d "%~dp0.."

echo ==========================================
echo   Playwright Tests - Setup
echo ==========================================
echo.
echo Repo location: %CD%
echo.

REM set PLAYWRIGHT_BROWSERS_PATH=%CD%\browsers

REM ---- Check Node.js ----
where node >nul 2>nul
if not errorlevel 1 (
    echo [SUCCESS] Node.js is installed
    call node -v
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
    call pnpm -v
) else (
    echo [INFO] pnpm not found, installing globally...
    call npm install -g pnpm
    if errorlevel 1 (
        echo [ERROR] Failed to install pnpm
        pause
        exit /b 1
    )
    echo [SUCCESS] pnpm installed
    call pnpm -v
)
echo.
echo DEBUG-1: Reached Playwright section
echo.

echo Checking Playwright...

call pnpm.cmd exec playwright --version >nul 2>&1
if not errorlevel 1 (
    echo [SUCCESS] Playwright is already installed
    call pnpm.cmd exec playwright --version
) else (
    REM ---- Install Playwright ----
    echo Installing @playwright/test...
    call pnpm add -D @playwright/test --reporter=append-only
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

REM ==========================================
REM Check Chromium in shared browser cache
REM ==========================================
echo Checking Chromium...
REM Ask the currently installed Playwright package for the exact
REM Chromium executable path it expects, then check whether it exists.
node.exe -e "const fs=require('fs'); const {chromium}=require('@playwright/test'); const p=chromium.executablePath(); console.log('Expected Chromium: ' + p); process.exit(fs.existsSync(p) ? 0 : 1);"

if not errorlevel 1 (
    echo [SUCCESS] Chromium is already installed
) else (
    echo [INFO] Chromium required by this Playwright version was not found
    echo Installing Chromium browser...
    echo This may take several minutes.
    echo.

    REM Temporary workaround for corporate TLS inspection.
    REM Replace this with NODE_EXTRA_CA_CERTS when company CA is available.
    set "NODE_TLS_REJECT_UNAUTHORIZED=0"
    call pnpm.cmd exec playwright install chromium
    set "CHROMIUM_INSTALL_EXIT_CODE=%ERRORLEVEL%"

    REM Restore TLS verification immediately
    set "NODE_TLS_REJECT_UNAUTHORIZED="

    if not "%CHROMIUM_INSTALL_EXIT_CODE%"=="0" (
        echo [ERROR] Failed to install Chromium
        pause
        exit /b %CHROMIUM_INSTALL_EXIT_CODE%
    )

    REM Verify Chromium executable again after installation
    node.exe -e "const fs=require('fs'); const {chromium}=require('@playwright/test'); const p=chromium.executablePath(); console.log('Expected Chromium: ' + p); process.exit(fs.existsSync(p) ? 0 : 1);"

    if errorlevel 1 (
        echo [ERROR] Chromium installation finished
        echo [ERROR] but the required executable was not found
        pause
        exit /b 1
    )

    echo [SUCCESS] Chromium installed successfully
)
echo.

REM ==========================================
REM Display environment information
REM ==========================================
echo Playwright information:
call pnpm.cmd exec playwright --version
echo.
echo Installed Playwright browsers:
call pnpm.cmd exec playwright install --list
if errorlevel 1 (
    echo [WARNING] Could not display installed browser list
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