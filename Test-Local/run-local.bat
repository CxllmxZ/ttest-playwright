@echo off
setlocal
chcp 65001 >nul

REM Launch PowerShell script with execution policy bypass
REM (avoids ExecutionPolicy issues without changing system settings)

powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0run-local.ps1"

REM Pause if error
if %ERRORLEVEL% NEQ 0 (
    pause
)