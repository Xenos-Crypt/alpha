@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath '.\coral-bytecode.exe' -ArgumentList 'ashford.co' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden"
