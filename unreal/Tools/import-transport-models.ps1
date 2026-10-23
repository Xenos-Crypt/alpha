$ErrorActionPreference='Stop'
$projectPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../AnotherWorld/AnotherWorld.uproject'))
[Environment]::SetEnvironmentVariable('UE-LocalDataCachePath',(Join-Path (Split-Path $projectPath) 'DerivedDataCache'),'Process')
& 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe' $projectPath -run=pythonscript "-script=$(Join-Path $PSScriptRoot 'import_transport_models.py')" -nullrhi -ddc=InstalledNoZenLocalFallback -unattended -nosplash -stdout
if($LASTEXITCODE -ne 0){throw "Transport model import failed ($LASTEXITCODE)"}
