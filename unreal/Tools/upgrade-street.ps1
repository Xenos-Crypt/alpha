param([string]$EditorPath = 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe')
$projectPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../AnotherWorld/AnotherWorld.uproject'))
[Environment]::SetEnvironmentVariable('UE-LocalDataCachePath', (Join-Path (Split-Path $projectPath) 'DerivedDataCache'), 'Process')
& $EditorPath $projectPath -run=pythonscript "-script=$(Join-Path $PSScriptRoot 'upgrade_street.py')" -ddc=InstalledNoZenLocalFallback -unattended -nosplash -nullrhi -stdout
if ($LASTEXITCODE -ne 0) { throw "Street upgrade failed: $LASTEXITCODE" }
