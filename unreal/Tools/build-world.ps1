param([string]$EditorPath = 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe')
$projectPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../AnotherWorld/AnotherWorld.uproject'))
$scriptPath = Join-Path $PSScriptRoot 'build_world.py'
if (!(Test-Path -LiteralPath $EditorPath)) { throw "Unreal Editor not found: $EditorPath" }
[Environment]::SetEnvironmentVariable('UE-LocalDataCachePath', (Join-Path (Split-Path $projectPath) 'DerivedDataCache'), 'Process')
& $EditorPath $projectPath -run=pythonscript "-script=$scriptPath" -ddc=InstalledNoZenLocalFallback -unattended -nosplash -nullrhi -stdout
if ($LASTEXITCODE -ne 0) { throw "World generation failed with exit code $LASTEXITCODE" }
