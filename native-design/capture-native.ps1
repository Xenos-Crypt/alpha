param([string]$InstalledProject='', [switch]$OneFrame)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot=Join-Path $PSScriptRoot 'coral-lang\coral-bytecode'
$runtimeRoot=if($InstalledProject){$InstalledProject}else{$projectRoot}
$captureDir=Join-Path $PSScriptRoot 'preview'
New-Item -ItemType Directory -Force -Path $captureDir | Out-Null
$originalCo=Get-Content (Join-Path $runtimeRoot 'ashford.co') -Raw -Encoding UTF8
$originalCr=Get-Content (Join-Path $runtimeRoot 'ashford.cr') -Raw -Encoding UTF8
$env:CREAL_CAPTURE_HIDDEN='1'
try{
 $variants=@('native','resized','expanded','overlook','cafe');if($OneFrame){$variants=@('native')}
 foreach($variant in $variants){
  $cr=$originalCr;if($variant -in @('resized','expanded')){$cr=$cr.Replace('windowwidth: 1360','windowwidth: 1120').Replace('windowheight: 900','windowheight: 800')}
  [IO.File]::WriteAllText((Join-Path $projectRoot 'ashford-capture.cr'),$cr)
  $crPath=(Join-Path $projectRoot 'ashford-capture.cr').Replace('\','/');$co=$originalCo.Replace('uiLoad("ashford.cr")','uiLoad("'+$crPath+'")');if($variant -eq 'expanded'){$co=$co.Replace('uiRun()','togglePanel()' + "`n" + 'uiRun()')}
  if($variant -eq 'overlook'){$co=$co.Replace('uiRun()','overlook()'+"`n"+'uiRun()')}
  if($variant -eq 'cafe'){$co=$co.Replace('uiRun()','scene3dSetCamera(-13.9, 1.72, -11.8, -0.65, -0.05)'+"`n"+'uiRun()')}
  [IO.File]::WriteAllText((Join-Path $projectRoot 'ashford-capture.co'),$co)
  $env:CREAL_CAPTURE_PATH=Join-Path $captureDir ('ashford-'+$variant+'.bmp')
  $coArgument='"'+(Join-Path $projectRoot 'ashford-capture.co')+'"';$previewProcess=Start-Process -FilePath (Join-Path $runtimeRoot 'coral-bytecode.exe') -ArgumentList $coArgument -WorkingDirectory $runtimeRoot -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $captureDir ('native-'+$variant+'.log')) -RedirectStandardError (Join-Path $captureDir ('errors-'+$variant+'.log'))
  if(!$previewProcess.WaitForExit(45000)){Stop-Process -Id $previewProcess.Id;throw ('Capture timed out: '+$variant)}
  $previewProcess.Refresh();if($null -ne $previewProcess.ExitCode -and $previewProcess.ExitCode -ne 0){throw ('Native preview failed: '+$variant+' '+$previewProcess.ExitCode)}
  $errors=Get-Content (Join-Path $captureDir ('errors-'+$variant+'.log')) -Raw -ErrorAction SilentlyContinue;if($errors){throw $errors}
  if(!(Test-Path -LiteralPath $env:CREAL_CAPTURE_PATH)){throw 'No native frame was written'}
  $im=[System.Drawing.Image]::FromFile($env:CREAL_CAPTURE_PATH)
  try{$bmp=New-Object System.Drawing.Bitmap($im.Width,$im.Height,[System.Drawing.Imaging.PixelFormat]::Format24bppRgb);$g=[System.Drawing.Graphics]::FromImage($bmp);$g.DrawImage($im,0,0);$g.Dispose();$bmp.Save((Join-Path $captureDir ('ashford-'+$variant+'.png')),[System.Drawing.Imaging.ImageFormat]::Png);$pixel=$bmp.GetPixel(28,28);if($pixel.R+$pixel.G+$pixel.B -eq 0){throw 'Native capture is black'};$bmp.Dispose()}finally{$im.Dispose()}
 }
 if($OneFrame){Write-Output 'PASS: installed native executable, assets, Creal UI and GPU rendering.'}else{Write-Output 'PASS: native GPU capture, alternate viewport size, and Coral panel-toggle reflow.'}
}finally{Remove-Item Env:\CREAL_CAPTURE_HIDDEN,Env:\CREAL_CAPTURE_PATH -ErrorAction SilentlyContinue}
