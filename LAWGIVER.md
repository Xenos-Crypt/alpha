# LAWGIVER.md — the Lawgiver's decision log

One entry per run: what was decided, why, and what was declined. The owner reviews and merges every change.

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
