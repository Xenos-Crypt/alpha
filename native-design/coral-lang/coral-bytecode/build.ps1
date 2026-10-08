# Builds coral-bytecode.exe -- Phase 1 only (compile + disassemble, no
# execution yet, see README.md). Links against c/'s own lexer/parser/ast/
# value/repl sources directly (not interp.c/builtins.c/main.c -- this tool
# never evaluates anything, so none of that is needed), the same "two
# recipes in sync" pattern this project already uses elsewhere (see
# coral-lang/xenos/build_xenos.sh's own comment). Refreshes PATH from the
# registry first, matching c/build.ps1 -- a fresh shell here doesn't
# always pick up gcc's PATH entry automatically.
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path", "User")

# Creal's window/render code (everything the ui* builtins in
# vm_builtins_win.c call through win32_backend()) is linked straight in,
# same as c/build.ps1 does for coral.exe -- see that file's own comment
# on the Coral<->Creal bridge. Creal's own main.c (creal.exe's standalone
# entry point) is excluded, same reasoning as c/build.ps1.
#
# vm_builtins_win.c (not vm.c) is the file with every platform-specific
# builtin/header in it -- see vm.h's own comment on why call_builtin
# lives in its own file now, separate from the VM core. xenos-os links a
# much smaller vm_builtins_xenos.c instead (see xenos/build_xenos_vm.sh).
#
# scene3d_gl.c is Scene3D's (scene3d.h) Win32+WGL+OpenGL implementation --
# the scene3d* builtins in vm_builtins_win.c call through it the same way
# the ui* builtins call through win32_backend.c. Needs -lopengl32 on top
# of win32_backend.c's own link libs.
$crealDir = "..\..\creal-lang\c"
if (-not (Get-Command gcc -ErrorAction SilentlyContinue)) {
    & "$PSScriptRoot\build-clang.ps1"
    exit $LASTEXITCODE
}
gcc -std=c11 -Wall -Wextra -O2 -I "$crealDir" -o coral-bytecode.exe `
    main.c chunk.c compiler.c debug.c vm.c vm_builtins_win.c memory.c `
    ../c/lexer.c ../c/ast.c ../c/parser.c ../c/value.c ../c/repl.c ../c/dirlist.c ../c/json_value.c ../c/native_jobs.c ../c/project_search.c `
    "$crealDir\win32_backend.c" "$crealDir\lexer.c" "$crealDir\element.c" "$crealDir\catalog.c" "$crealDir\edit.c" "$crealDir\scene3d_gl.c" `
    -lgdi32 -lmsimg32 -ladvapi32 -lshell32 -lws2_32 -lopengl32
