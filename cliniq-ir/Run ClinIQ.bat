@echo off
setlocal
title ClinIQ - Clinical Records Explorer
pushd "%~dp0"
if errorlevel 1 exit /b 1

echo ============================================================
echo   ClinIQ - Week 5 Information Retrieval Assignment
echo ============================================================
echo.

where powershell.exe >nul 2>nul
if errorlevel 1 (
    echo ERROR: Windows PowerShell is required to start ClinIQ.
    goto failed
)
where node.exe >nul 2>nul
if errorlevel 1 (
    echo ERROR: Install Node.js 22.12 or newer, then run this file again.
    goto failed
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
    echo ERROR: npm was not found. Reinstall Node.js with npm enabled.
    goto failed
)

if not exist ".venv\Scripts\python.exe" goto check_python
".venv\Scripts\python.exe" -c "import fastapi, uvicorn" >nul 2>nul
if errorlevel 1 goto setup
if not exist "frontend\node_modules\.bin\vite.cmd" goto setup
goto launch

:check_python
where python.exe >nul 2>nul
if errorlevel 1 (
    echo ERROR: Install Python 3.12 or newer and enable Add Python to PATH.
    goto failed
)

:setup
echo Installing dependencies for the first launch. Internet access is required.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup.ps1"
if errorlevel 1 goto failed
echo.

:launch
echo Starting ClinIQ. Your browser will open when both services are ready.
echo Keep this window open while using the application.
echo Press Ctrl+C to stop the backend and frontend.
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start.ps1" -OpenBrowser
if errorlevel 1 goto failed
popd
exit /b 0

:failed
echo.
echo ClinIQ could not start. Review the error above and try again.
pause
popd
exit /b 1
