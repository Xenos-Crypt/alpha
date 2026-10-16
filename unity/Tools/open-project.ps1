param([string]$EditorPath='')
$ErrorActionPreference='Stop'
$projectRoot=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if(-not $EditorPath){
    $portableEditor=Join-Path $projectRoot '../.unity-editor/Editor/Unity.exe'
    $EditorPath=if(Test-Path -LiteralPath $portableEditor){$portableEditor}else{'C:\Program Files\Unity\Hub\Editor\6000.5.1f1\Editor\Unity.exe'}
}
if(-not(Test-Path -LiteralPath $EditorPath)){throw 'Unity Editor is missing. Install Unity 6000.5.1f1 with Web Build Support or pass -EditorPath.'}
Start-Process -FilePath $EditorPath -ArgumentList @('-projectPath',('"'+$projectRoot+'"'),'-buildTarget','WebGL') -WindowStyle Normal
