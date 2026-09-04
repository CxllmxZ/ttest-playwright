@echo off
echo Testing node detection...
echo.

echo Method 1: node --version
node --version
echo Errorlevel: %errorlevel%
echo.

echo Method 2: where node
where node
echo Errorlevel: %errorlevel%
echo.

echo Method 3: call node --version
call node --version
echo Errorlevel: %errorlevel%
echo.

pause