@echo off
cd /d "%~dp0.."

echo Step 1
echo.

where node
echo After node check

echo Step 2
echo.

where pnpm
echo After pnpm check

echo Step 3 - trying to install
call pnpm add -D @playwright/test
echo After pnpm add - errorlevel: %errorlevel%

echo Step 4 - trying chromium
call pnpm exec playwright install chromium
echo After chromium - errorlevel: %errorlevel%

echo.
echo Done!
pause