param([string]$EditorPath='C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe')
$ErrorActionPreference='Stop'
$projectPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../AnotherWorld/AnotherWorld.uproject'))
[Environment]::SetEnvironmentVariable('UE-LocalDataCachePath',(Join-Path (Split-Path $projectPath) 'DerivedDataCache'),'Process')
foreach ($script in @('prepare_runtime_materials.py','prepare_playable_city.py')) {
    & $EditorPath $projectPath -run=pythonscript "-script=$(Join-Path $PSScriptRoot $script)" -ddc=InstalledNoZenLocalFallback -unattended -nosplash -nullrhi -stdout
    if ($LASTEXITCODE -ne 0) { throw "$script failed ($LASTEXITCODE)" }
}
