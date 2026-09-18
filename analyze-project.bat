@echo off
setlocal
chcp 437 >nul

powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0analyze-project.ps1"

if errorlevel 1 (
    echo.
    echo [ERROR] Project analyzer failed
    pause
    exit /b 1
)
