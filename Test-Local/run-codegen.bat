@echo off
setlocal
chcp 65001 >nul

REM Change to repo root
cd /d "%~dp0.."

REM Set Playwright to use local browsers (same as setup.bat installed)
set PLAYWRIGHT_BROWSERS_PATH=%CD%\browsers

echo ==========================================
echo   Playwright Codegen
echo ==========================================
echo.

REM Verify setup done
if not exist node_modules\@playwright\test (
    echo [ERROR] Playwright not installed
    echo Please run Test-Local\setup.bat first
    pause
    exit /b 1
)

if not exist browsers (
    echo [ERROR] Chromium not installed
    echo Please run Test-Local\setup.bat first
    pause
    exit /b 1
)

REM Ask for URL
set /p URL="Enter URL to record: "

if "%URL%"=="" (
    echo [ERROR] URL is required
    pause
    exit /b 1
)

echo.
echo Launching codegen for: %URL%
echo Browser + Inspector will open
echo.

REM Launch codegen (uses same Chromium as setup.bat installed)
call npx playwright codegen %URL%

echo.
echo Codegen closed
pause
