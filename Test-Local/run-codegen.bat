@echo off
setlocal
chcp 437 >nul

REM Launch universal Codegen PowerShell script
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0run-codegen.ps1"

REM Pause only when an unexpected error occurs
if errorlevel 1 (
    echo.
    echo [ERROR] Codegen runner ended with an error.
    pause
)

exit /b %ERRORLEVEL%