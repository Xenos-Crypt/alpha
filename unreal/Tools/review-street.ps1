param(
    [ValidateSet('HidrokStreet','HidrokAuthoredStreet')][string]$Map='HidrokAuthoredStreet',
    [string]$EditorPath='C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe'
)
$projectPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../AnotherWorld/AnotherWorld.uproject'))
$scriptPath=Join-Path $PSScriptRoot 'review_street.py'
[Environment]::SetEnvironmentVariable('UE-LocalDataCachePath',(Join-Path (Split-Path $projectPath) 'DerivedDataCache'),'Process')
[Environment]::SetEnvironmentVariable('ANOTHER_WORLD_REVIEW_MAP',('/Game/Maps/'+$Map),'Process')
[Environment]::SetEnvironmentVariable('ANOTHER_WORLD_REVIEW_OUTPUT',($Map+'.png'),'Process')
[Environment]::SetEnvironmentVariable('ANOTHER_WORLD_REVIEW_DELAY','30','Process')
$launchArguments='"'+$projectPath+'" /Game/Maps/'+$Map+' -d3d11 -ddc=InstalledNoZenLocalFallback -ExecutePythonScript="'+$scriptPath+'" -unattended -windowed -ResX=1280 -ResY=720 -log=AuthoredStreetReview.log'
Start-Process -FilePath $EditorPath -ArgumentList $launchArguments -WindowStyle Hidden
