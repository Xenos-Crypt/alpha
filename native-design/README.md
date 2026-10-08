# Another World — native design pass

This staging copy targets `C:\Users\WINDOWS11\device-root\coral-lang\coral-bytecode` and the sibling Creal C renderer. The browser prototype is unchanged.

The pass adds a larger responsive viewport, town façades and pitched roofs, photographic BMP surfaces, static posed human OBJ meshes, signs, furniture, foliage, cached directional shadows, camera collision and focus-scoped controls. The Creal interface has a stat panel, meters, camera reset, town overlook, panel toggle and Hold view. It contains no NPC thinking or AI integration.

Run the installed `launch-ashford.bat`, or run `coral-bytecode.exe ashford.co` from its directory. Place the pointer over the town: WASD moves, Shift runs, and right-drag looks. Reset view returns to the street; Town overlook shows the district from above.

Checks include native compilation/linking, Coral disassembly, CPU mesh/collision tests and images captured through Creal's own paint routine. Direct native captures are in `preview/`. The external WM_PRINTCLIENT method returned black images and was replaced with in-process capture.

Surface credits and character usage terms are in the installed asset directory. The character models are static poses. Native runtime skeletal animation, dynamic NPC behavior, and Bodycam-level photorealism are outside this pass.

`apply-native.ps1` validates prepared source hashes, checks destination hashes, backs up existing files, copies only the reviewed native files and verifies applied hashes. `apply-manifest.json` lists the exact scope. `applied.json`, when present, records the backup location.
