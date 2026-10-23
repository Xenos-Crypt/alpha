function Resolve-HidrokEditor {
    param([string]$EditorPath='', [switch]$RequireWeb)
    $projectRoot=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
    $candidates=if($EditorPath){@($EditorPath)}else{@((Join-Path $projectRoot '../.unity-editor/Editor/Unity.exe'),'C:\Program Files\Unity\Hub\Editor\6000.5.1f1\Editor\Unity.exe')}
    foreach($candidate in $candidates){
        $editor=[System.IO.Path]::GetFullPath($candidate)
        $data=Join-Path (Split-Path $editor) 'Data'
        $server=Join-Path $data 'Resources/PackageManager/Server/UnityPackageManager.exe'
        $web=Join-Path $data 'PlaybackEngines/WebGLSupport'
        if((Test-Path -LiteralPath $editor) -and (Test-Path -LiteralPath $server) -and (!$RequireWeb -or (Test-Path -LiteralPath $web))){return $editor}
    }
    throw "No complete Unity editor found. Checked: $($candidates -join ', '). Unity.exe and Data/Resources/PackageManager/Server/UnityPackageManager.exe must exist beside each other; web builds also need Data/PlaybackEngines/WebGLSupport. Use the complete project-local .unity-editor installation or repair the incomplete Hub installation."
}
