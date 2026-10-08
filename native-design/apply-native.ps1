$ErrorActionPreference='Stop'
$nativeTargetRoot=[IO.Path]::GetFullPath('C:\Users\WINDOWS11\device-root\')
$stagingRoot=[IO.Path]::GetFullPath($PSScriptRoot+'\')
$manifest=Get-Content (Join-Path $stagingRoot 'apply-manifest.json') -Raw | ConvertFrom-Json
$changes=@()
foreach($entry in $manifest){
 $destination=[IO.Path]::GetFullPath((Join-Path $nativeTargetRoot $entry.path));$source=[IO.Path]::GetFullPath((Join-Path $stagingRoot $entry.path))
 $allowed=$destination.StartsWith((Join-Path $nativeTargetRoot 'coral-lang\coral-bytecode\'),[StringComparison]::OrdinalIgnoreCase) -or $destination -in @((Join-Path $nativeTargetRoot 'creal-lang\c\scene3d.h'),(Join-Path $nativeTargetRoot 'creal-lang\c\scene3d_gl.c'),(Join-Path $nativeTargetRoot 'creal-lang\c\win32_backend.c'))
 if(!$allowed -or !$source.StartsWith($stagingRoot,[StringComparison]::OrdinalIgnoreCase)){throw 'Unexpected file target'}
 if((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLower() -ne $entry.stagedSHA256){throw ('Staged file changed: '+$entry.path)}
 $exists=Test-Path -LiteralPath $destination
 if($entry.originalSHA256){if(!$exists -or (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLower() -ne $entry.originalSHA256){throw ('Native source changed since preparation: '+$entry.path)}}elseif($exists){throw ('New target now exists: '+$entry.path)}
 $changes+=@{Entry=$entry;Source=$source;Destination=$destination;Exists=$exists}
}
$backupRoot=[IO.Path]::GetFullPath((Join-Path $nativeTargetRoot ('coral-lang\coral-bytecode\design-backup-'+(Get-Date -Format yyyyMMdd-HHmmss))))
if(!$backupRoot.StartsWith((Join-Path $nativeTargetRoot 'coral-lang\coral-bytecode\'),[StringComparison]::OrdinalIgnoreCase)){throw 'Invalid backup target'}
New-Item -ItemType Directory -Path $backupRoot | Out-Null
foreach($change in $changes){if($change.Exists){$backupFile=Join-Path $backupRoot $change.Entry.path;New-Item -ItemType Directory -Force -Path (Split-Path $backupFile) | Out-Null;Copy-Item -LiteralPath $change.Destination -Destination $backupFile}}
foreach($change in $changes){New-Item -ItemType Directory -Force -Path (Split-Path $change.Destination) | Out-Null;Copy-Item -LiteralPath $change.Source -Destination $change.Destination -Force}
foreach($change in $changes){if((Get-FileHash -LiteralPath $change.Destination -Algorithm SHA256).Hash.ToLower() -ne $change.Entry.stagedSHA256){throw ('Applied-file verification failed: '+$change.Entry.path)}}
[IO.File]::WriteAllText((Join-Path $stagingRoot 'applied.json'),(@{files=$changes.Count;backup=$backupRoot;time=(Get-Date).ToString('o')} | ConvertTo-Json))
Write-Output ('Applied '+$changes.Count+' verified native design files. Backup: '+$backupRoot)
