param([string]$EditorPath='C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe')
$projectPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../AnotherWorld/AnotherWorld.uproject'))
if (!(Test-Path -LiteralPath $EditorPath)) { throw "Unreal Editor not found: $EditorPath" }
[Environment]::SetEnvironmentVariable('UE-LocalDataCachePath',(Join-Path (Split-Path $projectPath) 'DerivedDataCache'),'Process')
foreach ($scriptName in @('build_authored_street.py','verify_authored_street.py')) {
    & $EditorPath $projectPath -run=pythonscript "-script=$(Join-Path $PSScriptRoot $scriptName)" -ddc=InstalledNoZenLocalFallback -unattended -nosplash -nullrhi -stdout
    if ($LASTEXITCODE -ne 0) { throw "$scriptName failed with exit code $LASTEXITCODE" }
}
