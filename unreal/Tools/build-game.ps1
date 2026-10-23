param([string]$EnginePath='C:\Program Files\Epic Games\UE_5.8')
$ErrorActionPreference='Stop'
$projectPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../AnotherWorld/AnotherWorld.uproject'))
$localSdk=Join-Path $PSScriptRoot '../Toolchain/AutoSDK'
if (Test-Path (Join-Path $localSdk 'HostWin64/Win64/Windows Kits/NETFXSDK/4.6.2/Include/um/mscoree.h')) {
    # UE's AutoSDK lookup probes 4.6.2; this compatibility directory contains
    # the actual, checksum-verified .NET Framework 4.8 SDK headers/libraries.
    $env:UE_SDKS_ROOT=[IO.Path]::GetFullPath($localSdk)
}
& (Join-Path $EnginePath 'Engine/Build/BatchFiles/Build.bat') AnotherWorldEditor Win64 Development "-Project=$projectPath" -WaitMutex -NoHotReloadFromIDE
if ($LASTEXITCODE -ne 0) { throw "Unreal C++ build failed ($LASTEXITCODE)" }
