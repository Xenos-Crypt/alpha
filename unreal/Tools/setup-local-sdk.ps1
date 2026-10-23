$ErrorActionPreference='Stop'
$toolchainRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../Toolchain'))
$downloadRoot=Join-Path $toolchainRoot 'NetFx'
New-Item -ItemType Directory -Path $downloadRoot -Force | Out-Null
# Microsoft Visual Studio's .NET Framework 4.8 SDK payloads. SHA256 values are
# from the installed, signed Visual Studio package catalog.
$payloads=@(
    @{Name='sdk_tools48.msi';Hash='61c76da293738f93fd0176837e5e70bf414903ecb527a7fc25fc7c862066f5bc'},
    @{Name='sdk_tools48.cab';Hash='131fa7cd8d661a151a13077a4bed21a4d187c5070b223c28fcf1a2bd1243d817'}
)
foreach($payload in $payloads) {
    $destination=Join-Path $downloadRoot $payload.Name
    if (!(Test-Path $destination)) {
        $url='https://download.visualstudio.microsoft.com/download/pr/33ce7103-7284-4a6b-9efc-a889c13bdcbb/'+$payload.Hash+'/'+$payload.Name
        Invoke-WebRequest -Uri $url -OutFile $destination -UseBasicParsing
    }
    if ((Get-FileHash $destination -Algorithm SHA256).Hash -ne $payload.Hash) { throw 'Microsoft SDK checksum mismatch' }
}
$extraction=Join-Path $downloadRoot 'Extracted'
$arguments=@('/a',('"'+(Join-Path $downloadRoot 'sdk_tools48.msi')+'"'),'/qn',('TARGETDIR="'+$extraction+'"'))
$process=Start-Process msiexec.exe -ArgumentList $arguments -WindowStyle Hidden -Wait -PassThru
if ($process.ExitCode -ne 0) { throw "SDK extraction failed ($($process.ExitCode))" }
# Unreal's AutoSDK discovery probes a fixed 4.6.2 path. This alias contains the
# real 4.8 SDK, which satisfies its 4.6-or-later requirement.
$compatibility=Join-Path $toolchainRoot 'AutoSDK/HostWin64/Win64/Windows Kits/NETFXSDK/4.6.2'
New-Item -ItemType Directory -Path $compatibility -Force | Out-Null
foreach($folder in @('Include','Lib')) {
    Copy-Item -LiteralPath (Join-Path $extraction "Program Files/Windows Kits/NETFXSDK/4.8/$folder") -Destination $compatibility -Recurse -Force
}
Write-Output 'Local .NET Framework 4.8 SDK ready for build-game.ps1. No machine SDK or registry changes made.'
