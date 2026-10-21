@echo off
setlocal
cd /d "%~dp0"
title Homeroom Workbench - LAN Firewall Setup

echo ========================================================
echo   Homeroom Workbench - LAN Firewall Configuration Tool
echo ========================================================
echo.

:: 1. Check for administrative privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Administrator privileges required.
    echo Requesting elevation, please click YES in the UAC popup...
    echo.
    powershell -NoProfile -Command "Start-Process cmd -ArgumentList '/c ""%~f0""' -Verb RunAs"
    exit /b
)

:: 2. Add Windows Firewall inbound rule for port 8768
echo [1/3] Adding Windows Firewall inbound rule for TCP port 8768...
netsh advfirewall firewall delete rule name="Homeroom_Workbench_8768" >nul 2>&1
netsh advfirewall firewall add rule name="Homeroom_Workbench_8768" dir=in action=allow protocol=TCP localport=8768 >nul 2>&1

if %errorlevel% equ 0 (
    echo   [OK] Inbound rule for TCP port 8768 added successfully.
) else (
    echo   [WARN] Firewall rule addition warning, continuing...
)

:: 3. Set network profile to Private
echo.
echo [2/3] Setting network profile to Private for local device discovery...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue" >nul 2>&1
echo   [OK] Network profile configured.

:: 4. Detect primary LAN IPv4 address
echo.
echo [3/3] Detecting local network IPv4 address...
for /f "tokens=*" %%a in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'vEthernet|VirtualBox|VMware|Loopback' -and $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1).IPAddress"') do set LOCAL_IP=%%a

if "%LOCAL_IP%"=="" set LOCAL_IP=127.0.0.1

echo.
echo ========================================================
echo   [Configuration Completed]
echo.
echo   Local Web Access:
echo     http://localhost:8768/index.html
echo.
echo   LAN Device Access (Other PCs / Phones / Tablets):
echo     http://%LOCAL_IP%:8768/index.html
echo.
echo   Admin Management Portal:
echo     http://%LOCAL_IP%:8768/admin.html
echo.
echo   Tips:
echo   1. Ensure mobile devices are connected to the same Wi-Fi.
echo   2. Run start.bat to keep the background server active.
echo ========================================================
echo.
pause
