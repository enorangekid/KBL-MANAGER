@echo off
cd /d "%~dp0"

set CHROME1="C:\Program Files\Google\Chrome\Application\chrome.exe"
set CHROME2="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
set CHROME3="%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
set EDGE1="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set EDGE2="C:\Program Files\Microsoft\Edge\Application\msedge.exe"
set PROFILE="%LOCALAPPDATA%\KBLManagerProfile"

netstat -ano | findstr :8791 >nul
if errorlevel 1 (
  start "KBLServer" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
  timeout /t 1 /nobreak >nul
)

if exist %CHROME1% (
  start "" %CHROME1% --app=http://localhost:8791/ --user-data-dir=%PROFILE%
) else if exist %CHROME2% (
  start "" %CHROME2% --app=http://localhost:8791/ --user-data-dir=%PROFILE%
) else if exist %CHROME3% (
  start "" %CHROME3% --app=http://localhost:8791/ --user-data-dir=%PROFILE%
) else if exist %EDGE1% (
  start "" %EDGE1% --app=http://localhost:8791/ --user-data-dir=%PROFILE%
) else if exist %EDGE2% (
  start "" %EDGE2% --app=http://localhost:8791/ --user-data-dir=%PROFILE%
) else (
  start "" http://localhost:8791/
)
