# Another World — Unity URP port

This directory contains Hidrok, the first playable Unity country prototype for Another World: five city areas inside a warm, cloaked Antarctic enclosure. The existing JavaScript game remains a separate application. Accounts, multiplayer, quests, combat and save migration still need C# ports.

## Open and play

Install **Unity 6000.5.1f1** and **Web Build Support** through Unity Hub, then add this directory as a project. The project resolves **URP 17.5.0**, matching the package shipped with this Editor. On the first successful script import, `ProjectSetup` creates the Low, Medium and High render assets, post-processing profiles, and the neighbourhood scene.

For this workspace, the repaired editor is under `.unity-editor/Editor`. Sign in to Unity Hub and activate a license under **Settings → Licenses** before opening the project. Launch it with `powershell -ExecutionPolicy Bypass -File unity/Tools/open-project.ps1`. Both helper scripts prefer this local editor and accept `-EditorPath` for another installation.

Open `Assets/Scenes/Neighbourhood.unity` and press Play. If setup did not run automatically, use **Another World → Set up URP project**.

- WASD: walk or drive. Hold the right mouse button to look.
- E: enter a stopped vehicle, leave it, or board/leave a tram at a platform when its doors are open.
- F: switch camera perspective.
- M: city map and destination markers.
- At a corner, click the east/west button, north/south button, or both. E presses the nearest physical button. Wait for the corresponding pedestrian green.
- Esc or Settings: quality presets and a 30/60 FPS frame cap.
- Touch controls appear on small screens.

## Included systems

The city uses a consistent 64 m street grid with 28 m roadways, raised pavements, separate car and bicycle lanes, and a reserved central tram corridor. Car lane centres are 7.4 m from the street centre; bicycle lanes are at 11.8 m. Bicycle paint ends before the zebras, behind a separate bicycle stop line. Normal junctions have car and bicycle approach heads, two directional pedestrian buttons at each corner, and track-facing white-bar signals on the tram boulevard. Two junctions use planted circular roundabouts, curved circulating routes and yield signs.

Pedestrian greens require an explicit button request. Standing near a zebra does not request a green, and the automatic car cycle never opens a pedestrian crossing. Directions are queued separately; pressing both buttons coordinates both crossings while conflicting traffic stays red. NPCs reach a corner and activate a physical button. Amber and all-red clearance protect the transition, and occupied crossings remain protected. Bicycle directions are separated, tram reservations wait for clearance, and normal car turns are restored between detector services. Vehicles already committed can clear the junction.

Six tram stops have boarding islands beside the central rails, shelters, tactile edges and traffic-side guardrails. Passengers board and exit on these islands, reached via controlled crossings. The bus loop has four recessed bays and shelters; two buses pull into their bays and dwell for boarding, leaving the through lane clear. Routes have curved turns instead of teleporting between lane offsets.

Four police cars patrol the road network. Red-signal offences, wrong-way driving, pavement driving and roundabout yield/island violations dispatch a patrol to the player using street routes. A stopped offender can settle a traffic citation near the responding unit or at police/court reception. The patrol resumes afterward. These are local game rules, not jurisdiction-specific road regulations.

The map includes Ashford School, Supermarket, Hospital, Police Station, Fire Station, Library, Courthouse, Bank, Town Hall and Bus Depot. These buildings have accessible reception/interior spaces. Basic local interactions support buying groceries, studying, treatment, banking and settling traffic reports; coins and these activities are not yet connected to the legacy Supabase saves.

Residents have shaped heads, faces, tapered clothing and articulated walking limbs. Motorcycle and bicycle riders use seated poses and open-face helmets. Signals use circular car lenses, bicycle and pedestrian icons, and white tram bars. World-sized texture coordinates, trilinear filtering and anisotropic filtering on Medium/High keep street and building surfaces from stretching.

The vehicle models include a saloon, police car, ambulance van, motorcycle, spoked bicycle and city bus. The bicycle and bus are native shared-mesh models. Imported vehicle winding stays aligned with outward normals; reversing those indices had rendered tyres and shells inside-out. Other vehicle geometry is exported from the improved Three.js models into Unity mesh data; equivalent materials are grouped and duplicate vertices welded. Re-export with:

```powershell
node unity/Tools/export-vehicle-models.mjs
```

## Scalable quality

| Preset | Shadows | Imported textures | Effects |
|---|---|---|---|
| Low | Disabled | Half size via mip limit | Post-processing off; render scale 0.75 |
| Medium | Hard; 1024 shadow map | Full Web size | SMAA, color grading and ACES |
| High | Soft; 1024 shadow map | Full Web size | SMAA, bloom and camera motion blur |

The menu swaps actual URP assets at runtime. All presets support a saved 30 or 60 FPS cap. Mobile browsers default to Low/30. Performance must be measured on real devices; these settings do not guarantee 60 FPS.

`WebAssetPolicy` caps imported Web textures at 1024×1024 and rejects oversized overrides before a Web build. Audio imports use Vorbis, Decompress on Load, preloading and background loading. The slice includes original engine, ambience, footstep and ambulance-siren clips compressed as Ogg Vorbis. Clips are decoded before playback, and browser audio starts after a user gesture. Unity's Web build may transcode clips for the browser.

Static streets and building decoration use Unity static batching. Repeated vehicle parts and signal lamps use explicit `Graphics.RenderMeshInstanced` batches, with ordinary renderers as a fallback when instancing is unsupported. Shared meshes and materials are cached. Runtime-generated geometry is not advertised as imported 4K PC artwork.

## Build

Use **Another World → Build Web preview**, or:

```powershell
powershell -ExecutionPolicy Bypass -File unity/Tools/build-web.ps1
```

For a different editor location, pass `-EditorPath`. Output goes to `unity/Builds/Web`. Build artifacts and Unity caches are ignored. The source project is excluded from the existing Vercel upload; publishing this Web output is a separate deployment step.

The custom Web template shows loading progress and supports Gzip with Unity's decompression fallback.

## Verification and migration limits

The current world is **Hidrok**, a fictional hidden Antarctic enclave with five city areas: Ashford, Riverside, Ashford Capital, Northhaven and Poison Land. It restores the ocean, six islands, regional bridges, harbour, naval dock, airport, highlands, caves, military sites and space-centre landmarks. A 1,700 m radius dome, climate-control facility and research saucers establish the contemporary/futuristic setting. The interior uses a fictional 22 C climate; the Antarctic exterior applies cold exposure and hides the interior scenery. This does not reconstruct the entire real Antarctic continent. See [COUNTRY-WORKFLOW.md](COUNTRY-WORKFLOW.md) for the real-map country workflow and remaining scope.

The latest Unity runtime check passed with 192 road junctions, 1,248 directional crossing buttons, eight patrols, 76 destinations and all five cities. It checks island landing points, ocean/bridge classification, connected police routes, ferry/tram/bus boarding, third-person avatar presence, occupied-bike protection, house/platform collisions, officer pursuit and interior/exterior climate and cloaking. The Hidrok Web build and Chromium render checks also passed. Screenshots under `Logs/` cover the visible dome, city arrivals, airport, island and climate facility, plus Low/Medium/High quality and the 30 FPS setting. This verifies desktop browser behavior; mobile frame rates have not been benchmarked.

The local build used `build-web.ps1 -SkipBurst` to bypass a delayed optional Burst compilation stage. The default build command retains Burst. Web presets use linear upscaling. URP eagerly constructs its unused FSR pass and logs a shader warning on the test GPU; this specific warning is recorded in `web-browser-check.json`. Project shader failures and other rendering errors fail the browser check. The build wrapper also rejects shader compilation errors even if Unity reports a successful build.

Run `dotnet run --project unity/Checks/TrafficChecks.csproj` with .NET 10 to test the pure traffic rules and parse all Unity scripts with C# 9 syntax. These checks do **not** compile Unity APIs, execute the scene, or measure browser performance. Unity compilation and a Web build are still required.

`AnotherWorld.Editor.WorldScenarioReview.Run` runs the city in the Unity Editor and checks junction/button counts, civic destinations, moving vehicles, route validity, outward vehicle surfaces, tram and bus boarding/exits, and police dispatch/citation handling. Results are recorded in `Logs/world-scenario-check.json`. On 2026-10-14 these runtime checks passed for 49 junctions, 392 directional buttons, four patrols, two buses, ten civic destinations and six tram stops.

Unity 6000.5.1f1 successfully compiled and imported the project and generated the scene and URP quality assets after license activation and installation repair. On 2026-10-14, the Web build succeeded and Chromium loaded and rendered it with no browser errors. Low, Medium and High switches, the 30 FPS setting and the settings menu were exercised; screenshots and diagnostics are under `Logs/`. This is a desktop browser verification, not a mobile FPS benchmark.

The updated resident models, separate signal icons and world-sized texture scaling were also reviewed in the rebuilt Web player. `Logs/web-street-close.png` shows the signal faces and street surfaces; `Logs/humans-signals-review.png` is an isolated editor review of the people and signals.

Run `node unity/Tools/verify-web.cjs` from the repository root to repeat the browser check, or `node unity/Tools/serve-web.cjs` for a local preview. `node unity/Tools/prepare-preview.cjs` prepares the generated output for a separate Vercel preview with correct Gzip/MIME headers; it does not upload or publish anything.

The country geography, road traffic, tram, buses, ferry, basic civic interactions and quality settings are ported. Supabase accounts, room chat, AI NPC conversations, combat, quests, aircraft operation, intercity rail and save migration remain in the JavaScript game and need subsequent C# ports. The current Unity output is a separate preview while those gameplay systems are migrated.

## Asset attribution

The reused surface images are CC0 assets from Poly Haven. Original names, URLs and attribution are in `Assets/Art/CREDITS.json`, copied from the original project's asset manifest. Vehicle geometry and procedural scenery are project code.
