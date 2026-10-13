# Feature verification

Audit updated: 13 October 2026. Verification uses the actual current game modules and a full-game instrumented browser build. Generated clips, screenshots and detailed results are in `test-results/`.

## Confirmed

- 34 automated suites passed after fixing two outdated fixtures: four-city expectations and a generated video containing no usable frames. TV playback now uses a valid MP4 and checks advancing playback time and a real `VideoTexture`.
- Full-game checks passed for couch/street seating, vehicle-damaged benches, water entry, boats rejecting land, parachute exits, aircraft bridge crashes, repeated collapse/reconstruction with restored colliders, class skill activation, dungeon clearing and the level-50 Sovereign bonus.
- Full-game checks also passed for ship passage through the lifting bridge, arrest without health loss, rocket boarding/Moon landing, submarine depth/camera, cave monsters, skeletons, NPC conversations/calls, lethal-zone death/respawn, airport service phases, bird landing and local character progress save/restore.
- Five-city subway, visible street stairs, actual walking down to the platform, 50 waiting/boarding passengers and rendered lamp breakage were checked in the actual scene.
- Mobile host/join layout, keyboard-height scrolling, control preferences, manual gears/drift buttons, aircraft roll controls, local voice volume/mute UI and microphone cleanup passed browser checks.
- 3D map/search/waypoints, TV file playback, advertising contact controls, house advert rotation and city boards/balloons passed browser checks.
- Production bundle matched the audited build before the later login-video and graphics changes.

## Limits and unfinished work

| Area | Actual verification status |
| --- | --- |
| Online rooms, permanent class and cloud progression | Mocked-client tests passed. Live read-only checks confirmed installed RPCs and correct denial of anonymous access. Real signed-in multi-account testing is still required. |
| Live class claim | Automatic approval review rejected the check because it could modify an account. No account was changed. |
| Voice chat | Controls/signalling lifecycle tested with mocked clients. Real peer-to-peer audio across two accounts/devices remains unverified. Only STUN is configured; TURN relay support is absent. |
| World persistence | Character progress and travel snapshots restore. Building reconstruction, broken benches/streetlights and general world damage are not stored across reloads. |
| Online world simulation | Player appearances/positions are broadcast. Shared authoritative vehicle, NPC, building damage and combat simulation is not implemented. |
| Google advertising | Intentionally disabled until publisher/VAST/consent configuration is available. House advertising works. |
| Audio | Procedural audio is implemented. This headless machine reports a running audio context with a frozen clock, so actual sound output could not be verified here. Real-device listening remains necessary. |
| iPad/Safari | Phone layouts and inline media attributes are tested in Chromium mobile emulation. A physical iPad/Safari test is still needed. |
| Older verification scripts | Several pre-bundle scripts inject hooks into inline HTML and are obsolete. They were excluded rather than counted as passing. Current full-game probes replace their core interaction coverage. |

## Repeating checks

Start the local server on port 8080. Run `node verify-feature-audit.cjs`, `node verify-regional-runtime.cjs`, `node verify-street-subway.cjs` and `node verify-offline.cjs`. Run the full-game/scene suites individually to avoid software-renderer contention. `verify-map-tv.cjs` uses the valid gameplay MP4 included in `assets/`, so no external download is required.

Later checks add `node transit-police.test.mjs`, `node verify-auth-video.cjs`, `node auth-feedback.test.mjs`, `node verify-auth-feedback.cjs` and `node visual-condition.test.mjs`. These cover station-only arrests with a walking officer, a 12-second gameplay login video, duplicate-email feedback and deformation of the upgraded rounded car bodies. They do not remove the limitations above.
