@echo off
setlocal
chcp 437 >nul

powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0analyze-project.ps1"

set "ANALYZER_EXIT_CODE=%ERRORLEVEL%"

if not "%ANALYZER_EXIT_CODE%"=="0" (
    echo.
    echo [ERROR] Project analyzer failed
    echo Exit code: %ANALYZER_EXIT_CODE%
)

echo.
pause
exit /b %ANALYZER_EXIT_CODE%
