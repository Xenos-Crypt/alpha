# LAWGIVER.md — the Lawgiver's decision log

One entry per run: what was decided, why, and what was declined. The owner reviews and merges every change.

## 2026-11-27 — The last three flickering surfaces: indoor rugs, the lobby doormat, the raceway's start line

**Decision:** Two causes, three overlaps, the world audit goes from 3 to 0.
- `interiors.js`: every indoor rug (`F.rug`) and the lobby doormat were laid at y 0.11, exactly where the tile and marble floor patches lie (both 2 cm thick, top 0.12). Wherever a rug lay on a patch the two shared a plane: the bathroom rug in the furnished flats was simply invisible, and the lobby doormat in front of the exit was torn into stripes. Rugs and the doormat now lie 1.5 cm higher (y 0.125, top 0.135), the same remedy as the bedside rug on 2026-11-14.
- `venues.js`: the Ashford Raceway start/finish line was 5 mm above the main straight's top (0.08 vs 0.075), too thin for depth precision at a distance (the same gap that made Anthos Bay flicker). It now sits 1 cm above (0.085).

**Where:** interiors (far-region rooms): bathroom rug on bathroom tiles at (-5097, -7), `LND-FLR-WHT.CER-REQ-VHQCUM + LND-SRF-BGE.STN-REQ-1MKCC0`; lobby doormat on the marble floor at (-6500, 8), `LND-SRF-BLK.WOD-REQ-19VPH4 + LND-SRF-WHT.PLR-REQ-M59DOM`. Ashford Raceway start/finish at (-320, -808), `LND-SRF-BLK.SHT-REQ-EAHJT1 + LND-SRF-WHT.PLR-REQ-15XDM4`. (The raised surfaces' own IDs change, because the ID seed includes the surface height.)

**Why:** These three have been deferred in every entry since 2026-11-14. With them gone the overlap audit is clean, so any pair it reports from now on is new and worth reading. Three numbers, no collider, walking height, race logic or save key touched (rugs and lines have no colliders; `race.js` times laps by position, not by the line mesh).

**Input this run:** no open issues, no Petitions issue, no open PRs. Supabase `world_bugs` (fixed = false), `world_events`, `world_entities`: empty. Vercel production logs: no `[world-report]` lines in the last 50 minutes.

**Looked at and declined:**
- Deephaven's load-time `[world-grid] … can't go` warnings (about 20): not rule-breaking. `deep-city.js` deliberately offers more building plots than fit and lets the grid refuse the colliding ones. The way the city is laid out is correct; only the console is noisy. Not worth a change.
- The `?audit` solid-clash list (mostly props inside hollow cave shells): still needs a sorting pass before it can be trusted.

## 2026-11-26 — The world's audit no longer buries Cinder Row's mud and potholes

**Decision:** In `world-ids.js`, the surface scan (which runs on its own about 15 s after the world loads, and "fixes" any two flat surfaces at the same height by lifting the smaller one 1.5–2 cm) now skips decals: materials drawn on top by design (`polygonOffset` towards the camera, `depthWrite: false`). Cinder Row's lanes are dark slabs (top 0.04) with a grime decal 5 mm above them (0.045). The scan took each lane and its grime for two flickering floors, lifted the *lane* to 0.06, and so the main lane (z 500) and the back lane (z 550) rose 1.5 cm over their own grime: every pothole, mud patch and puddle vanished and the lanes went bare black. Decals cannot z-fight (the offset and the missing depth write already settle it), so they are simply not counted.

**Where:** Cinder Row (slum), x 596…844, z 447…598. The 16 false world-audit pairs no longer appear (24 → 8 in a full scan), e.g.
`LND-SRF-BLK.WOD-REQ-6D31AJ + LND-SRF-WHT.PLR-REQ-1SLHNZ` (600, 500) … (840, 500), `LND-SRF-BLK.WOD-REQ-6D31AJ + LND-SRF-WHT.PLR-REQ-10JDF7` (720, 500), `LND-SRF-BLK.WOD-REQ-18E93I + LND-SRF-WHT.PLR-REQ-14M971` (720, 550), and the seven north-south lane pairs at (600…840, 523). Other decals that now count as decals too: road wear (`road-wear.js`) and house grime (`home-styles.js`).

**Why:** The Lawgiver's own auditor was breaking the world it audits — a rule-breaking at its cause, seen by every player who walks Cinder Row a few seconds after loading — and it also filled two-thirds of the overlap reports with noise. One condition, no geometry, collider, walking height or save key touched.

**Input this run:** no open issues, no Petitions issue. Open PRs #103–#106 (`main.js`, `npc-conversations.js`, `snack-shop.js`, `space-wing.js`, `building-sites.js`, `walkin.js`, `chores.js`); this change stays out of all of them. Supabase `world_bugs` (fixed = false), `world_events`, `world_entities`: empty. Vercel production logs: no `[world-report]` lines in the last hour (Hobby plan keeps one hour).

**Looked at and deferred:**
- The remaining 8 audit pairs, unchanged from earlier runs: far-region floors at (-5097, -7) and (-6500, 8); glass/plastic at (1157, 545); road paint at (-320, -808), (277, 702), (243, 702); the funfair/karting bounding-box false positives (248, -710), (668, -953).
- The `?audit` solid-clash list (376 entries, mostly cave interiors and the Bone Crypt): largely props inside hollow shells; needs a sorting pass before it can be trusted.

## 2026-11-21 — The Ashford Supermarket's entrance path no longer runs under its car park

**Decision:** In `places.js`, the Ashford Supermarket's car park was centred at z -29 (z -38…-20) while the supermarket's 12 m entrance path runs from the door (z -49) to z -37. Both are slabs with their top at y 0.08, so for 1 m the path and the car park lay in the same plane and flickered through each other. The car park now starts where the path ends (centre z -28, z -37…-19), the same layout as the police HQ car park next door.

**Where:** Ashford Supermarket, east district (590, -66); car park and entrance path at (590, -37). World-audit pair cleared:
`LND-SRF-BLK.SHT-REQ-IOQEG6 + LND-SRF-BRN.CON-REQ-17YDV1` (590, -37) — also reported from production today by `PER-PLR-HUM-PLR-13QVK3` via `/api/world-report`. (The car park's own surface ID changes, because the ID seed includes its extent.) Full scan: 25 → 24 overlaps.

**Why:** It is one of the overlaps a resident reported from the live world today, it sits in front of a shop every resident uses, and the cause is a single coordinate: no collider, walking height, car spawn or save key depends on it (the slab has no collider; nothing else references (590, -29)).

**Input this run:** no open issues, no Petitions issue. One open PR (#97, tenement doors and windows: `slum.js`, `main.js`, `supermarket.js`, `action-menu.js`, `black-market.js`), so this change stays out of those files. Supabase `world_bugs` (fixed = false): empty. Vercel production logs: two `[world-report]` posts (11:08, 11:11 UTC) from one resident: (590, -37), (1157, 545), (-6500, 8), (-5097, -7), and several Cinder Row lane pairs (WHT.PLR + BLK.WOD) at x 720…840, z 500…550.

**Looked at and deferred:**
- Cinder Row lanes (720…840, 500…550): this is `slum.js`, which open PR #97 rewrites; I do not stack a change on it. Earlier finding stands: mostly lane surfaces vs polygon-offset grime decals, better fixed in the audit than by moving lanes.
- Still open: glass/plastic at (1157, 545); far-region floors at (-5097, -7) and (-6500, 8); road paint at (-320, -808), (277, 702), (243, 702); the audit false positives (248, -710), (668, -953); the unused karting kerb texture.

## 2026-11-20 — Anthos Bay: the wet sand, the surf and the towels no longer flicker through each other

**Decision:** In `resort-beach.js` (Anthos Bay, merged today in #64/#65) three flat layers along the shoreline were stacked only 4–6 mm apart: the dry sand (top `SAND` = 0.065), the wet-sand edge (`SAND + 0.004`), and both the surf foam and the beach towels (`SAND + 0.01`). With the camera's 0.1–1000 depth range that is below depth precision from roughly 100 m out, so the strip z-fought with the sand and the towels with the wet edge. The layers are now 1 cm apart: wet sand `SAND + 0.01`, foam `SAND + 0.02`, towels `SAND + 0.03`.

**Where:** Anthos Bay beach, x 60…300, the shoreline at z ≈ 246…252. World-audit pairs cleared (13; 60 → 47 in a full scan):
`LND-SRF-WHT.PLR-REQ-Q6KNJ0 + LND-SRF-BRN.WOD-REQ-14M6A6` (180, 248) dry sand / wet sand,
`LND-SRF-BRN.WOD-REQ-14M6A6 + LND-SRF-WHT.GLS-REQ-1VYE1L` (180, 250) wet sand / foam,
and wet sand + towel at (67, 247), (94, 248), (103, 247), (130, 248), (139, 247), (166, 248), (175, 247), (202, 248), (211, 247), (238, 248), (247, 247).
(The moved surfaces' own IDs change, because the ID seed includes the surface height.)

**Why:** It is the largest group of real overlaps in the newest place in the world, and the fix is at the cause: three heights, no colliders, walking floors, gameplay or save keys touched.

**Input this run:** no open issues, no Petitions issue. One open PR (#58, Grand Park south gate, `grand-park.js`), so this change stays out of that file. Supabase registry (via the connector): `world_bugs`, `world_events`, `world_entities` empty. Vercel production logs: no `[world-report]` lines in the last 50 minutes.

**Looked at and deferred:**
- Cinder Row (x 596…844, z 448…598): 37 audit pairs between each lane's dark surface (top 0.04) and the grime decals (0.045, `polygonOffset`, transparent, no depth write). These are intended decals, not two floors; most are audit noise. Better solved by teaching the audit to skip polygon-offset decals than by moving the lanes. A later run.
- Anthos Bay: some towels and the parasol row reach 1–2 m onto the wet sand at the waterline. Moving the row landward would put a parasol into the lifeguard tower at (262, 241), so it needs a careful re-layout, not a quick shift.
- Still open from earlier runs: road paint at road height (590, -37), (-320, -808), (277, 702), (243, 702); glass/plastic at (1157, 545); far-region floors at (-5097, -7) and (-6500, 8); the funfair/karting bounding-box false positives (248, -710), (668, -953).
## 2026-11-17 — The Grand Park's south gate no longer paves through Ventura's wall

**Decision:** In `grand-park.js`, the gravel apron outside each of the three south gates ran 8 m out of the park (to z -904). At the gate at x 540 that is 7 m from Ventura's north wall (z -905), so the apron passed under the solid wall and 0.85 m into the fun centre, where it z-fought with Ventura's tech floor (tops 0.055 and 0.06). The aprons now stop 6.5 m out (z -905.5), just short of the wall. The other two gates (x 300, 420) have open ground in front and only lose 1.5 m of apron.

**Where:** Westhaven Grand Park south gate at (540, -912) and Ventura fun centre north wall (x 486…576, z -905). World-audit pair cleared:
`LND-FLR-BLK.TCH-REQ-OYEP2I + LND-SRF-BRN.BRK-REQ-1QXZ9Z` (540, -904). (The apron's own surface ID changes, because the ID seed includes its extent.)

**Why:** A path must not run through a building; the cause is the apron length, a one-number change with no collider, gameplay or save-key effect.

**Input this run:** no open issues, no Petitions issue, no open PRs. Supabase registry (via the Supabase connector; direct REST still 403 from the sandbox): `world_bugs`, `world_events`, `world_entities` empty. Vercel production logs: no `[world-report]` lines in the last 50 minutes.

**Looked at and deferred:**
- (248, -710) funfair path vs circus sawdust ring and (668, -953) karting red vs white kerb strips: audit false positives — the audit compares bounding boxes, and the round ring / the two kerbs on opposite sides of the kart track do not actually touch. Worth teaching the audit later, not worth moving scenery.
- Ventura Karting builds a red/white striped kerb texture (`kerbT`) and never uses it; the kerbs are plain red on one side, plain white on the other. Cosmetic, for a later run.
- Still open: road paint at road height (590, -37), (-320, -808), (277, 702), (243, 702); glass/plastic at (1157, 545); far-region floors at (-5097, -7) and (-6500, 8).

## 2026-11-16 — The military base yard no longer swallows its own paths

**Decision:** In `places.js`, the military base yard (`slab(80, 75, 470, 111, 0x7b8066)`) was laid at the default slab height (top y = 0.08), the same plane as the three barracks floors and the concrete entrance paths in front of them and the visitor reception. They z-fought: from most angles the paths in front of the barracks were torn into stripes or vanished into the yard. The yard now sits 2 cm lower (top 0.06), still above the ground plane (y = 0).

**Where:** Military base, east of the city (x 430…510, z 73.5…148.5): barracks at (449, 108), (477, 108), (500, 108), their paths at z 120…132, and the reception path at (430, 79). World-audit pairs cleared (7 of 17):
`LND-SRF-BRN.CON-REQ-1DKW5L + LND-SRF-BLK.SHT-REQ-11VNMA` (431, 79),
`LND-SRF-BLK.SHT-REQ-11VNMA + LND-FLR-BGE.STN-REQ-70GWWN` (449, 108),
`LND-SRF-BLK.SHT-REQ-11VNMA + LND-SRF-BRN.CON-REQ-SE3UI8` (449, 126),
`LND-SRF-BLK.SHT-REQ-11VNMA + LND-FLR-BGE.STN-REQ-EURJMG` (477, 108),
`LND-SRF-BLK.SHT-REQ-11VNMA + LND-SRF-BRN.CON-REQ-19WPUL` (477, 126),
`LND-SRF-BLK.SHT-REQ-11VNMA + LND-FLR-BGE.STN-REQ-1PM1AJ` (500, 108),
`LND-SRF-BLK.SHT-REQ-11VNMA + LND-SRF-BRN.CON-REQ-9IS3JJ` (500, 126).
(The yard's own surface ID changes, because the ID seed includes the surface height.)

**Why:** One surface caused 7 of the 17 remaining overlaps; fixing it at the cause is a one-argument change with no gameplay, collider or save-key effect (the slab has no collider).

**Input this run:** no open issues, no Petitions issue, no open PRs. Supabase registry reachable this time: `world_bugs`, `world_events`, `world_entities` exist but are empty. Vercel production logs: no `[world-report]` lines in the last 50 minutes.

**Still deferred (10 overlaps):** road paint at road height (590, -37), (-320, -808), (277, 702), (243, 702); brick/terracotta pairs at (248, -710), (668, -953), (540, -904); glass/plastic at (1157, 545); far-region floors at (-5097, -7) and (-6500, 8).

## 2026-11-15 — The Westhaven Superstore shelves carry real stock again

**Decision:** In `supermarket.js`, the colour of each product box on the aisle shelves was picked with `stock[(... + Math.floor(z)) % stock.length]`. The aisles stand at z ≈ -230…-210, so the sum is mostly negative, and JS `%` keeps the sign: 765 of the 880 boxes looked up `stock[-n]` = `undefined` and rendered as plain white (Three.js also warned at load). A small `shelfColour()` helper now wraps the index into 0..7, so every box has one of the eight product colours.

**Where:** Westhaven Superstore, North Road (x 36…72, z -242…-198), the five shelving runs between x 50 and 66.

**Why:** Deferred from yesterday's run. It is the store every resident shops in; a supermarket of blank boxes breaks the rule that goods come from somewhere. Cause-level fix, five lines, no save keys touched.

**Input this run:** no open issues, no Petitions issue, no open PRs. Supabase registry still unreachable from the Lawgiver's sandbox (network policy 403). Vercel production logs: no `[world-report]` lines in the last 50 minutes (Hobby keeps 1 h).

**Still deferred:** the 17 remaining surface overlaps listed on 2026-11-14 (road paint at road height, far-region floors, the hover body at (-40, 680)).

## 2026-11-14 — The bedside rug no longer sinks into the bedroom carpet

**Decision:** In every furnished house (`house-rooms.js`), the bedside rug and the bedroom carpet were laid at the same height (top y = 0.035), so the two surfaces z-fought and the rug was in practice invisible. The rug now sits 1.5 cm higher (top 0.05). `floorPatch` takes an optional `top` for this.

**Where:** the five furnished houses around spawn. World audit pairs that disappear (carpet + rug):
`LND-FLR-GRY.CPT-REQ-T7Y0B8 + LND-FLR-BGE.CPT-REQ-DOB6UR` (17, 24),
`LND-FLR-GRY.CPT-REQ-10YUOQ + LND-FLR-BGE.CPT-REQ-LD4EK3` (-28, -17),
`LND-FLR-GRY.CPT-REQ-1HWCFW + LND-FLR-BGE.CPT-REQ-1TRWKB` (-18, -17),
`LND-FLR-GRY.CPT-REQ-13LR9E + LND-FLR-BGE.CPT-REQ-9CDTTV` (12, -17),
`LND-FLR-GRY.CPT-REQ-13YL6S + LND-FLR-BGE.CPT-REQ-GM34WE` (22, -17).
(The rug's own surface ID changes, because the ID seed includes the surface height.)

**Why:** It breaks the rule "surfaces don't overlap", it is the overlap closest to where every newcomer starts, and the fix is at the cause, two lines, no risk to saves.

**Input this run:** no open issues, no Petitions issue, no open PRs. Supabase registry unreachable from the Lawgiver's sandbox (network policy 403), Vercel logs had no `[world-report]` lines in the last hour (Hobby plan keeps 1 h only).

**Found and deferred (for later runs):**
- `supermarket.js:56` shelf stock colour uses `% stock.length` on a sum with `Math.floor(z)` where z is negative, so the index goes negative and some products get `color: undefined` (plain white boxes; Three.js warns at load).
- 17 other surface overlaps remain: road markings and kerbs at road height (e.g. 600–840, 233–407; 430–510, 73–148), hospital/far-region floors at x ≈ -5100 and -6500, the hover body at (-40, 680). Most are road paint at road height; each needs a look before a fix.
