@echo off
REM VEIL - one-click start (Windows). Creates .env on first run, frees ports 3000/3001/5001, starts all services.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-all.ps1"
pause
