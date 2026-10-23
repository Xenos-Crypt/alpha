param([string]$EditorPath='', [string]$Method='AnotherWorld.Editor.VillaReview.Run')
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'resolve-editor.ps1')
$editor=Resolve-HidrokEditor -EditorPath $EditorPath -RequireWeb
$projectRoot=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$log=Join-Path $projectRoot 'Logs/editor-verification.log'
New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null
Write-Output "Using editor: $editor"
# Play-mode verification methods exit themselves; -quit would stop them early.
$process=Start-Process -FilePath $editor -ArgumentList @('-batchmode','-nographics','-projectPath',('"'+$projectRoot+'"'),'-executeMethod',$Method,'-logFile',('"'+$log+'"')) -WindowStyle Hidden -PassThru
$process.WaitForExit()
if($process.ExitCode -ne 0){throw "Unity verification failed with exit code $($process.ExitCode). See $log"}
Write-Output "Verification finished. Log: $log"
