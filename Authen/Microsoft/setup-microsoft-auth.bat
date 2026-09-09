@echo off
setlocal
chcp 437 >nul

REM Launch PowerShell script with execution policy bypass
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0setup-microsoft-auth.ps1"

REM Keep PowerShell exit code
set "AUTH_EXIT_CODE=%ERRORLEVEL%"

REM Pause if error
if not "%AUTH_EXIT_CODE%"=="0" (
    echo.
    echo [ERROR] Microsoft authentication setup failed.
    echo Exit code: %AUTH_EXIT_CODE%
    pause
)

exit /b %AUTH_EXIT_CODE%