param(
    [string]$EditorPath = 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe',
    [ValidateSet('d3d11', 'd3d12')][string]$GraphicsApi = 'd3d11'
)
$projectPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../AnotherWorld/AnotherWorld.uproject'))
if (!(Test-Path -LiteralPath $EditorPath)) { throw "Unreal Editor not found: $EditorPath" }
[Environment]::SetEnvironmentVariable('UE-LocalDataCachePath', (Join-Path (Split-Path $projectPath) 'DerivedDataCache'), 'Process')
$launchArguments = '"' + $projectPath + '" -ddc=InstalledNoZenLocalFallback -' + $GraphicsApi
if ($GraphicsApi -eq 'd3d11') {
    . (Join-Path $PSScriptRoot 'preview-settings.ps1')
    $launchArguments+=' -ExecCmds="'+(Get-AWPreviewCommands)+'"'
}
Start-Process -FilePath $EditorPath -ArgumentList $launchArguments -WindowStyle Hidden
