@echo off
setlocal
chcp 437 >nul

REM Change to repository root
cd /d "%~dp0.."

REM Use Playwright shared browser cache
set "PLAYWRIGHT_BROWSERS_PATH="

echo ==========================================
echo   Playwright Codegen - Microsoft Profile
echo ==========================================
echo.

REM ---- Verify Playwright ----
call pnpm.cmd exec playwright --version >nul 2>&1

if errorlevel 1 (
    echo [ERROR] Playwright is not installed
    echo Please run Test-Local\setup.bat first
    pause
    exit /b 1
)

echo [SUCCESS] Playwright is available
call pnpm.cmd exec playwright --version
echo.

REM ---- Verify Microsoft profile directory ----
set "MICROSOFT_PROFILE=%CD%\Authen\Microsoft\profile"

if not exist "%MICROSOFT_PROFILE%\Local State" (
    echo [ERROR] Microsoft profile is not ready
    echo.
    echo Expected profile:
    echo %MICROSOFT_PROFILE%
    echo.
    echo Please run:
    echo Authen\Microsoft\setup-microsoft-auth.bat
    pause
    exit /b 1
)

REM ---- Ask for URL ----
set /p "URL=Enter URL to record: "

if "%URL%"=="" (
    echo [ERROR] URL is required
    pause
    exit /b 1
)

echo.
echo Launching Codegen for:
echo %URL%
echo.
echo Microsoft profile:
echo %MICROSOFT_PROFILE%
echo.
echo Browser and Playwright Inspector will open.
echo Close the Inspector when finished.
echo.

REM ---- Launch Playwright Codegen with Microsoft profile ----
call pnpm.cmd exec playwright codegen ^
  --user-data-dir="%MICROSOFT_PROFILE%" ^
  --target=playwright-test ^
  "%URL%"

set "CODEGEN_EXIT_CODE=%ERRORLEVEL%"

echo.

if not "%CODEGEN_EXIT_CODE%"=="0" (
    echo [ERROR] Microsoft Profile Codegen failed
    echo Exit code: %CODEGEN_EXIT_CODE%
    pause
    exit /b %CODEGEN_EXIT_CODE%
)

echo ==========================================
echo   Codegen closed successfully
echo ==========================================
echo.
pause

exit /b 0