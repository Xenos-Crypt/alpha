param([string]$EditorPath='')
$ErrorActionPreference='Stop'
$projectRoot=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
. (Join-Path $PSScriptRoot 'resolve-editor.ps1')
$EditorPath=Resolve-HidrokEditor -EditorPath $EditorPath -RequireWeb
Start-Process -FilePath $EditorPath -ArgumentList @('-projectPath',('"'+$projectRoot+'"'),'-buildTarget','WebGL') -WindowStyle Normal
