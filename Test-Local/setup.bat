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

REM Behind a corporate proxy that inspects HTTPS, preferably set
REM   NODE_EXTRA_CA_CERTS=C:\path\to\company-ca.pem
REM As a last resort, TTEST_INSECURE_TLS=1 disables certificate checks
REM for the Chromium download only.

REM ==========================================
REM Node.js
REM ==========================================
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not installed
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
echo [SUCCESS] Node.js is installed
call node -v
echo.

REM ==========================================
REM pnpm
REM ==========================================
where pnpm >nul 2>nul
if not errorlevel 1 goto :pnpm_ok

echo [INFO] pnpm not found, installing globally...
call npm install -g pnpm
if errorlevel 1 (
    echo [ERROR] Failed to install pnpm
    pause
    exit /b 1
)

:pnpm_ok
echo [SUCCESS] pnpm is installed
call pnpm.cmd -v
echo.

REM ==========================================
REM Project dependencies from package.json / pnpm-lock.yaml
REM ==========================================
echo Installing project dependencies...
call pnpm.cmd install --reporter=append-only
if errorlevel 1 (
    echo [ERROR] pnpm install failed
    pause
    exit /b 1
)
echo [SUCCESS] Project dependencies installed
echo.

REM ==========================================
REM Playwright
REM ==========================================
echo Checking Playwright...
call pnpm.cmd exec playwright --version >nul 2>&1
if not errorlevel 1 goto :playwright_ok

echo [INFO] @playwright/test not in package.json, adding it...
call pnpm.cmd add -D @playwright/test --reporter=append-only
if errorlevel 1 (
    echo [ERROR] Failed to install @playwright/test
    pause
    exit /b 1
)
call pnpm.cmd exec playwright --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Playwright is still not working after installation
    pause
    exit /b 1
)

:playwright_ok
echo [SUCCESS] Playwright is installed
call pnpm.cmd exec playwright --version
echo.

REM ==========================================
REM Chromium
REM ==========================================
echo Checking Chromium...
node.exe -e "const fs=require('fs'); const {chromium}=require('@playwright/test'); const p=chromium.executablePath(); console.log('Expected Chromium: ' + p); process.exit(fs.existsSync(p) ? 0 : 1);"
if not errorlevel 1 (
    echo [SUCCESS] Chromium is already installed
    goto :chromium_done
)

echo [INFO] Chromium required by this Playwright version was not found
echo Installing Chromium browser. This may take several minutes.
echo.

if "%TTEST_INSECURE_TLS%"=="1" (
    echo [WARNING] TTEST_INSECURE_TLS=1 - certificate checks are DISABLED for this download.
    echo           Use only behind a corporate proxy. Prefer NODE_EXTRA_CA_CERTS.
    set "NODE_TLS_REJECT_UNAUTHORIZED=0"
)

call pnpm.cmd exec playwright install chromium
set "CHROMIUM_EXIT=%ERRORLEVEL%"

REM Restore TLS verification immediately
set "NODE_TLS_REJECT_UNAUTHORIZED="

if "%CHROMIUM_EXIT%"=="0" goto :chromium_verify

echo [ERROR] Failed to install Chromium
echo.
echo If you are behind a corporate proxy that inspects HTTPS:
echo   1. Preferred: set NODE_EXTRA_CA_CERTS to your company CA certificate file
echo   2. Last resort: set TTEST_INSECURE_TLS=1 and run setup.bat again
pause
exit /b %CHROMIUM_EXIT%

:chromium_verify
node.exe -e "const fs=require('fs'); const {chromium}=require('@playwright/test'); process.exit(fs.existsSync(chromium.executablePath()) ? 0 : 1);"
if errorlevel 1 (
    echo [ERROR] Chromium installation finished but the executable was not found
    pause
    exit /b 1
)
echo [SUCCESS] Chromium installed successfully

:chromium_done
echo.

REM ==========================================
REM @types/node
REM ==========================================
echo Checking @types/node...
node.exe -e "require.resolve('@types/node/package.json')" >nul 2>&1
if not errorlevel 1 (
    echo [SUCCESS] @types/node is installed
    goto :types_done
)
echo [INFO] Installing @types/node...
call pnpm.cmd add -D @types/node --reporter=append-only
if errorlevel 1 (
    echo [ERROR] Failed to install @types/node
    pause
    exit /b 1
)
echo [SUCCESS] @types/node installed

:types_done
echo.

REM ==========================================
REM TypeScript
REM ==========================================
echo Checking TypeScript...
call pnpm.cmd exec tsc --version >nul 2>&1
if not errorlevel 1 (
    echo [SUCCESS] TypeScript is installed
    goto :ts_done
)
echo [INFO] Installing TypeScript...
call pnpm.cmd add -D typescript --reporter=append-only
if errorlevel 1 (
    echo [ERROR] Failed to install TypeScript
    pause
    exit /b 1
)
echo [SUCCESS] TypeScript installed

:ts_done
call pnpm.cmd exec tsc --version
echo.

REM ==========================================
REM Summary
REM ==========================================
echo Playwright information:
call pnpm.cmd exec playwright --version
echo.

echo ==========================================
echo   Setup complete!
echo ==========================================
echo.
echo Next steps:
echo   Double-click Test-Local\run-codegen.bat to record a flow
echo   Double-click Test-Local\run-local.bat to run tests
echo   Guide: doc\GUIDE.md
echo.
pause