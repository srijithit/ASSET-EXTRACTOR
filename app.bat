@echo off
title Asset Extractors - Web Server Launcher
color 0C

echo =========================================================
echo        ASSET EXTRACTORS - WEB SERVER LAUNCHER
echo          DEV by srijith (https://srijith.vercel.app/)
echo =========================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

echo [2/3] Checking dependencies...
if not exist "node_modules\" (
    echo Installing required npm packages...
    call npm.cmd install
)

echo [3/3] Starting Asset Extractors web server on port 3000...
echo.
echo 🟢 Live at http://localhost:3000
echo ⏱️  Auto keep-alive heartbeat running (every 1 min)
echo.
echo Opening your default browser...
start http://localhost:3000

node server.js
pause
