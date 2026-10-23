param([string]$EditorPath='C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe', [switch]$Headless, [ValidateSet('HidrokPlayable','HidrokFuture')][string]$Map='HidrokPlayable')
$ErrorActionPreference='Stop'
$projectPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../AnotherWorld/AnotherWorld.uproject'))
$projectRoot=Split-Path $projectPath
[Environment]::SetEnvironmentVariable('UE-LocalDataCachePath',(Join-Path $projectRoot 'DerivedDataCache'),'Process')
. (Join-Path $PSScriptRoot 'preview-settings.ps1')
$filter=if($Map -eq 'HidrokFuture'){'AnotherWorld.Gameplay'}else{'AnotherWorld.Gameplay.StreetWalking'}
$commands=(Get-AWPreviewCommands)+',Automation RunTests '+$filter
# This checks gameplay on an integrated GPU, not a target frame rate. Keep the
# engine's startup guard from coupling functional tests to a 10 FPS target.
$arguments='"'+$projectPath+'" /Game/Maps/'+$Map+' -game -d3d11 -ddc=InstalledNoZenLocalFallback -unattended -windowed -ResX=1280 -ResY=720 -ini:Engine:[/Script/Engine.AutomationTestSettings]:DefaultInteractiveFramerate=3 -ExecCmds="'+$commands+'" -TestExit="Automation Test Queue Empty" -ReportExportPath="'+(Join-Path $projectRoot 'Saved/GameplayChecks')+'" -log=WalkingGameplay.log'
if ($Headless) { $arguments+=' -nullrhi -nosound' }
$process=Start-Process $EditorPath -ArgumentList $arguments -WindowStyle Hidden -PassThru
$process.WaitForExit()
if ($process.ExitCode -ne 0) { throw "Walking check failed ($($process.ExitCode)); see Saved/Logs/WalkingGameplay.log" }
$logPath=Join-Path $projectRoot 'Saved/Logs/WalkingGameplay.log'
$report=Get-Content -LiteralPath (Join-Path $projectRoot 'Saved/GameplayChecks/index.json') -Raw | ConvertFrom-Json
function Test-AWSuccess([string]$Name) { return @($report.tests | Where-Object { $_.fullTestPath -eq ('AnotherWorld.Gameplay.'+$Name) -and $_.state -eq 'Success' }).Count -eq 1 }
if (!(Test-AWSuccess 'StreetWalking')) {
    throw "Walking test did not report success; inspect $logPath"
}
Write-Output 'PASS: real-map spawn, street walking, sprint speed, jump and landing'
if($Map -eq 'HidrokFuture') {
    if (!(Test-AWSuccess 'VehicleFlight')) {
        throw "Aurora vehicle check did not pass; inspect $logPath"
    }
    Write-Output 'PASS: all three cars: wheel contact, parking pads, service interlocks, boot opening/latch/lock, obstruction reversal, steering, road/flight and exit'
    if (!(Test-AWSuccess 'OrionTransit')) {
        throw "Orion transit check did not pass; inspect $logPath"
    }
    Write-Output 'PASS: underground regional train, elevated tram, lift access, boarding, guideway alignment, braking and station exit'
}
