$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
 $vc='C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.44.35207'
 $sdk='C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0'
 & 'C:\Program Files\LLVM\bin\clang++.exe' -x c -std=c11 -D_CRT_SECURE_NO_WARNINGS -O1 -c native-cpu-test.c -o native-cpu-test.obj
 if($LASTEXITCODE -ne 0){throw 'CPU test compilation failed'}
 & "$vc\bin\Hostx64\x64\link.exe" /NOLOGO /OUT:native-cpu-test.exe "/LIBPATH:$vc\lib\x64" "/LIBPATH:$sdk\ucrt\x64" "/LIBPATH:$sdk\um\x64" native-cpu-test.obj libcmt.lib oldnames.lib kernel32.lib user32.lib gdi32.lib opengl32.lib
 if($LASTEXITCODE -ne 0){throw 'CPU test link failed'}
 .\native-cpu-test.exe
 if($LASTEXITCODE -ne 0){throw 'CPU tests failed'}
}finally{Pop-Location}
