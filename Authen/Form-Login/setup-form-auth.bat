@echo off
setlocal
chcp 437 >nul

REM Change to the Form-Login script directory
cd /d "%~dp0"

echo ==========================================
echo   Universal Form Login Setup
echo ==========================================
echo.

REM Verify PowerShell script
if not exist "%~dp0setup-form-auth.ps1" (
    echo [ERROR] Form Login PowerShell script was not found
    echo.
    echo Expected:
    echo %~dp0setup-form-auth.ps1
    echo.
    pause
    exit /b 1
)

REM Launch Universal Form Login Setup
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0setup-form-auth.ps1"

REM Save PowerShell exit code immediately
set "FORM_AUTH_EXIT_CODE=%ERRORLEVEL%"

if not "%FORM_AUTH_EXIT_CODE%"=="0" (
    echo.
    echo [ERROR] Form Login Setup ended with an error
    echo Exit code: %FORM_AUTH_EXIT_CODE%
    echo.
    pause
    exit /b %FORM_AUTH_EXIT_CODE%
)

exit /b 0