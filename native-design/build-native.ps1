$ErrorActionPreference='Stop'
$projectRoot=Join-Path $PSScriptRoot 'coral-lang\coral-bytecode'
Push-Location $projectRoot
try {
    $compilerPath='C:\Program Files\LLVM\bin\clang++.exe'
    $msvcDir='C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.44.35207'
    $sdkDir='C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0'
    $linkerPath=Join-Path $msvcDir 'bin\Hostx64\x64\link.exe'
    $sources=@('main.c','chunk.c','compiler.c','debug.c','vm.c','vm_builtins_win.c','memory.c','../c/lexer.c','../c/ast.c','../c/parser.c','../c/value.c','../c/repl.c','../c/dirlist.c','../c/json_value.c','../c/native_jobs.c','../c/project_search.c','../../creal-lang/c/win32_backend.c','../../creal-lang/c/lexer.c','../../creal-lang/c/element.c','../../creal-lang/c/catalog.c','../../creal-lang/c/edit.c','../../creal-lang/c/scene3d_gl.c')
    New-Item -ItemType Directory -Force -Path build-design | Out-Null
    $objects=@();$index=0
    foreach($source in $sources){$object='build-design\unit'+$index+'.obj';$index++; & $compilerPath -x c -std=c11 -O2 -c -D_CRT_SECURE_NO_WARNINGS -Dstrdup=_strdup -Dstrcasecmp=_stricmp -Dstrncasecmp=_strnicmp -I '../../creal-lang/c' -o $object $source;if($LASTEXITCODE -ne 0){throw ('Compile failed: '+$source)};$objects+=$object}
    & $linkerPath /NOLOGO /SUBSYSTEM:CONSOLE /OUT:coral-bytecode.exe "/LIBPATH:$msvcDir\lib\x64" "/LIBPATH:$sdkDir\ucrt\x64" "/LIBPATH:$sdkDir\um\x64" @objects libcmt.lib oldnames.lib kernel32.lib user32.lib gdi32.lib msimg32.lib advapi32.lib shell32.lib ws2_32.lib opengl32.lib
    if($LASTEXITCODE -ne 0){throw 'Native link failed'}
    Write-Output 'Native design build passed.'
}finally{Pop-Location}
