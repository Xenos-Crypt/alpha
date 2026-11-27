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

## 26 November 2026 - website startup recovery and responsiveness

Based on GitHub main 74f6f010, in a separate website checkout. The older local game/Unity/Unreal work was preserved.

- A failed entry-bundle request now shows a connection message and a working reload button. Optional asset failures do not block entry. A loading failure cancels any outstanding phone-rotation completion so it cannot erase the error.
- Loading video respects reduced motion and pauses when hidden, backgrounded, or failed.
- World construction yields between stages. Authentication starts after construction to keep partially initialized systems out of the login flow. A loading cover remains during account/home preparation so a full-world render cannot slip between sign-in and the menu.
- Restored npm test to the current Node tests, added standalone loading regression checks, and added a real-bundle WebGL startup/guest-menu probe.

Validation: production build passed; all 50 existing logic tests passed; loading recovery checks passed. Desktop startup/guest-menu test reported no JavaScript errors, no missing local assets and no world geometry uploaded behind the menu. The measured longest startup task fell from 11.9 seconds in the initial sign-in probe to 4.5 seconds after staging; initial total sign-in time was 18 seconds and the final run was about 22 seconds. This is improved responsiveness, not a total-load-time or real-device FPS improvement claim. A separate guest-transition run before the cover fix exposed an 18.8-second task and 937 uploaded geometries; after the fix, zero geometries were uploaded through guest-menu entry.

Remaining: multi-second construction tasks, actual gameplay profiling, physical phone/Safari verification, and signed-in multiplayer checks. No production deployment was performed for this pass.

### 26 November 2026: reputation and world corrections (local branch)

Reputation is independent of XP, bounded at -1000..1000, and starts at 0 for new lives and saves without the new field. -1000 is Demon, +1000 Saint, and negative reputation immediately makes ordinary citizens unfavorable while Yatan believers regard the player as a friend. Public favor grows continuously in opposite directions for these factions; personal memories still matter. A stable subset of citizens identifies as Church of Yatan believers in conversation. This introduces the faction, not a new church building or individual character storylines.

Current balancing: coffee kindness +1, player-defeated monster +2, paid donations +1 per 20 gold (max +25 per donation), assault -10 (30-second per-target cooldown), NPC knockout -50, vehicle/shop theft -15, criminal building destruction -20. Knockouts can also incur the initial assault penalty. Reputation persists in per-account alignment cache, solo saves, and online account snapshots; new story resets it. HUD and City Hall show the score. Titles are reversible when the score changes.

Other local changes retain moving menu video, move conflicting intercity rail segments, provide door recesses/outward clearance, stabilize overlapping flat surfaces without moving geometry, replace rain meshes with a fixed streak buffer, and make police/military responses arrest-first, lasers for resistance after warning, and firearms for an armed/firing player.

Validation: 61 logic tests passed; production build passed; standalone loading recovery passed. Cloud account roundtrips and full gameplay visual inspection on player hardware have not been verified. Changes have not been deployed to production.
Browser verification also passed against the production bundle: neutral initial reputation, negative action, inverse Yatan standing, per-account local persistence, return to neutral, guest menu without JS errors or local missing assets, and real menu video playback/pause controls. Software-rendered startup took 38.3 seconds on this run (longest task 7.3 seconds); startup performance still has room for improvement.

27 November follow-up: real bundled NPC conversations passed at -1000, -1, 0, +1 and +1000, including actual Yatan believers. Coffee rewards passed insufficient-funds, successful-payment and repeat-cooldown checks. Older public-opinion dialogue now reports the reputation score consistently. Rail footprint audit returned no candidates across the checked routes (19 door assemblies present). Final production build and whitespace checks passed. This remains local; authenticated cloud persistence and hardware gameplay performance are unverified.

Deployment preparation: integrated origin/main through 2e1b4015, retaining its newer rain renderer, mansion rooms/basements and naval base. Removed the duplicate rain-field implementation. All 60 remaining logic tests and the merged production build pass.
