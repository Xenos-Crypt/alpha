param([string]$Output='baseline',[string]$ExtraCommands='')
$ErrorActionPreference='Stop'
$projectPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../AnotherWorld/AnotherWorld.uproject'))
$projectRoot=Split-Path $projectPath
[Environment]::SetEnvironmentVariable('UE-LocalDataCachePath',(Join-Path $projectRoot 'DerivedDataCache'),'Process')
. (Join-Path $PSScriptRoot 'preview-settings.ps1')
$commands=(Get-AWPreviewCommands)+',stat unit,csvprofile frames=150'
if ($ExtraCommands) { $commands+=','+$ExtraCommands }
$arguments='"'+$projectPath+'" /Game/Maps/HidrokFuture -game -d3d11 -ddc=InstalledNoZenLocalFallback -windowed -ResX=1280 -ResY=720 -unattended -csvGpuStats -csvCompression=0 -ExitAfterCsvProfiling -ExecCmds="'+$commands+'" -abslog="'+(Join-Path $projectRoot "Saved/Logs/Profile-$Output.log")+'"'
$process=Start-Process 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe' -ArgumentList $arguments -WindowStyle Hidden -PassThru
$process.WaitForExit()
if($process.ExitCode -ne 0) {throw "Profiling failed ($($process.ExitCode))"}
$capture=Get-ChildItem (Join-Path $projectRoot 'Saved/Profiling/CSV') -Filter '*.csv' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if(!$capture){throw 'No CSV capture was produced'}
Copy-Item -LiteralPath $capture.FullName -Destination (Join-Path $PSScriptRoot "../SourceData/profile-$Output.csv")
Write-Output $capture.FullName
