@echo off
cd /d "%~dp0"
title Homeroom Workbench

echo ========================================================
echo    Starting Homeroom Teacher Workbench Server ...
echo ========================================================
echo.

:: Automatically open browser
start "" "http://localhost:8768/index.html"

:: 1. Check and use project virtual environment
if exist "%~dp0.venv\Scripts\activate.bat" goto use_venv_act
if exist "%~dp0.venv\Scripts\python.exe" goto use_venv_py
goto check_system

:use_venv_act
echo [INFO] Activating project virtual environment .venv ...
call "%~dp0.venv\Scripts\activate.bat"
python server.py
goto end

:use_venv_py
echo [INFO] Launching with project virtual environment python ...
"%~dp0.venv\Scripts\python.exe" server.py
goto end

:check_system
python --version >nul 2>&1
if %errorlevel% equ 0 goto use_sys_python

py --version >nul 2>&1
if %errorlevel% equ 0 goto use_py_launcher

echo [WARN] Python runtime was not detected on this computer.
echo [INFO] Opening local index.html directly ...
start "" "%~dp0index.html"
goto end

:use_sys_python
echo [INFO] Using system Python ...
python server.py
goto end

:use_py_launcher
echo [INFO] Using Windows py launcher ...
py server.py
goto end

:end
echo.
echo ========================================================
echo   Server process finished.
echo ========================================================
pause
