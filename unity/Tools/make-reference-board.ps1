$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$logs=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../Logs'))
$names=@('car','motorcycle','bicycle','police','ambulance','bus','tram','train','helicopter','plane','ferry','landscape')
$board=[System.Drawing.Bitmap]::new(1500,1512)
$graphics=[System.Drawing.Graphics]::FromImage($board)
$font=[System.Drawing.Font]::new('Arial',16)
try {
    $graphics.Clear([System.Drawing.Color]::FromArgb(14,28,42))
    for($i=0;$i -lt $names.Length;$i++){
        $picture=[System.Drawing.Image]::FromFile((Join-Path $logs ('reference-'+$names[$i]+'.png')))
        try {
            $x=($i%3)*500;$y=[Math]::Floor($i/3)*378
            $graphics.DrawImage($picture,[int]$x,[int]$y,500,345)
            $graphics.DrawString($names[$i],$font,[System.Drawing.Brushes]::White,[single]($x+12),[single]($y+349))
        } finally {$picture.Dispose()}
    }
    $output=Join-Path $logs 'transport-landscape-comparison.png'
    $board.Save($output);Write-Output $output
} finally {$font.Dispose();$graphics.Dispose();$board.Dispose()}
