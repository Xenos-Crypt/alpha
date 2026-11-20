# LAWGIVER.md — the Lawgiver's decision log

One entry per run: what was decided, why, and what was declined. The owner reviews and merges every change.

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
