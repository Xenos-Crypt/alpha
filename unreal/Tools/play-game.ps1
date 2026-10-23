param([string]$EditorPath='C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe', [switch]$FullQuality, [ValidateSet('HidrokFuture','HidrokPlayable')][string]$Map='HidrokFuture')
$ErrorActionPreference='Stop'
$projectPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../AnotherWorld/AnotherWorld.uproject'))
if (!(Test-Path (Join-Path (Split-Path $projectPath) 'Binaries/Win64/UnrealEditor-AnotherWorld.dll'))) {
    throw 'Run unreal/Tools/build-game.ps1 first to compile the game module.'
}
[Environment]::SetEnvironmentVariable('UE-LocalDataCachePath',(Join-Path (Split-Path $projectPath) 'DerivedDataCache'),'Process')
. (Join-Path $PSScriptRoot 'preview-settings.ps1')
$commands=Get-AWPreviewCommands -FullQuality:$FullQuality
$arguments='"'+$projectPath+'" /Game/Maps/'+$Map+' -game -d3d11 -ddc=InstalledNoZenLocalFallback -windowed -ResX=1280 -ResY=720 -ExecCmds="'+$commands+'"'
Start-Process -FilePath $EditorPath -ArgumentList $arguments -WindowStyle Hidden
