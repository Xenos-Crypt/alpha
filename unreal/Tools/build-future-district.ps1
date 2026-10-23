param([string]$EditorPath='C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe')
$ErrorActionPreference='Stop'
$projectPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../AnotherWorld/AnotherWorld.uproject'))
[Environment]::SetEnvironmentVariable('UE-LocalDataCachePath',(Join-Path (Split-Path $projectPath) 'DerivedDataCache'),'Process')
& $EditorPath $projectPath -run=pythonscript "-script=$(Join-Path $PSScriptRoot 'build_future_district.py')" -ddc=InstalledNoZenLocalFallback -nullrhi -unattended -nosplash -stdout
if ($LASTEXITCODE -ne 0) { throw "Future district generation failed ($LASTEXITCODE)" }
