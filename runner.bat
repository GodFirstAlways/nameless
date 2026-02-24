@echo off
setlocal
title START FRONTEND ONLY

REM Use the folder where this .bat lives
set "FRONTEND_PATH=%~dp0"
REM remove trailing backslash
if "%FRONTEND_PATH:~-1%"=="\" set "FRONTEND_PATH=%FRONTEND_PATH:~0,-1%"

echo.
echo Starting frontend dev server...
echo Using: "%FRONTEND_PATH%"

REM Verify package.json exists (so we know it's the project root)
if not exist "%FRONTEND_PATH%\package.json" (
  echo ERROR: package.json not found in "%FRONTEND_PATH%"
  echo Put this .bat in the same folder as package.json.
  pause
  exit /b 1
)

cd /d "%FRONTEND_PATH%"

REM Install only if node_modules is missing (faster)
if not exist "%FRONTEND_PATH%\node_modules" (
  echo Installing dependencies...
  npm install
)

start "Frontend Dev Server" cmd /k "cd /d ""%FRONTEND_PATH%"" && npm run dev"

REM Vite default port is 5173 (but may change if busy) :contentReference[oaicite:1]{index=1}
timeout /t 3 >nul
start http://localhost:5173

echo.
echo Frontend should now be running.
pause
