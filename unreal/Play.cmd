@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Tools\play-game.ps1"
if errorlevel 1 pause
