param([string]$EditorPath='', [switch]$SkipBurst)
$ErrorActionPreference='Stop'
$projectRoot=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if(-not $EditorPath){
    $portableEditor=Join-Path $projectRoot '../.unity-editor/Editor/Unity.exe'
    $EditorPath=if(Test-Path -LiteralPath $portableEditor){$portableEditor}else{'C:\Program Files\Unity\Hub\Editor\6000.5.1f1\Editor\Unity.exe'}
}
if(-not (Test-Path -LiteralPath $EditorPath)){throw 'Unity Editor is missing. Install Unity 6000.5.1f1 with Web Build Support in Unity Hub, then pass -EditorPath if needed.'}
$logDirectory=Join-Path $projectRoot 'Logs'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$arguments=@('-batchmode','-nographics','-quit','-buildTarget','WebGL','-projectPath',('"'+$projectRoot+'"'),'-executeMethod','AnotherWorld.Editor.ProjectSetup.BuildWeb','-logFile',('"'+(Join-Path $logDirectory 'web-build.log')+'"'))
if($SkipBurst){$arguments+='--burst-disable-compilation'}
$process=Start-Process -FilePath $EditorPath -ArgumentList $arguments -WindowStyle Hidden -PassThru
$process.WaitForExit()
if($process.ExitCode -ne 0){throw "Unity build failed with exit code $($process.ExitCode). Inspect unity/Logs/web-build.log."}
if(Select-String -LiteralPath (Join-Path $logDirectory 'web-build.log') -Pattern 'Shader error in ' -Quiet){throw 'Unity reported shader compilation errors. Inspect unity/Logs/web-build.log.'}
Write-Output (Join-Path $projectRoot 'Builds/Web/index.html')
