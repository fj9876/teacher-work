@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Homeroom Workbench

echo ========================================================
echo    Starting Homeroom Teacher Workbench Server ...
echo ========================================================
echo.

:: 1. Try project virtual environment (.venv) if present
if exist "%~dp0.venv\Scripts\python.exe" (
    echo [INFO] Virtual environment detected. Launching server...
    "%~dp0.venv\Scripts\python.exe" server.py
    goto end
)

:: 2. Try system python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] System Python detected. Launching server...
    python server.py
    goto end
)

:: 3. Try Windows py launcher
py --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Windows Python launcher detected. Launching server...
    py server.py
    goto end
)

:: 4. Fallback if Python runtime is not installed
echo [WARN] Python runtime was not detected on this computer.
echo [INFO] Opening index.html directly in your default browser...
start "" "%~dp0index.html"

:end
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server process exited with code %errorlevel%.
    pause
)
