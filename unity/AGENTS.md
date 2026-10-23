# Visual reference workflow

The user requires repeated visual comparison while changing landscaping or vehicles.

- Inspect `References/Landscaping-concept.png` and `References/Transport-concept.png` before relevant visual work. Keep the existing game systems functional.
- Render actual changed geometry with `AnotherWorld.Editor.LandscapeTransportReview.Run`, inspect the affected `Logs/reference-*.png` files against the boards, and correct visible problems. Repeat this comparison after visual revisions. Asset/schema checks alone are insufficient.
- Offscreen SRP requests omit explicit GPU-instanced draws; the review's editor-only `GpuMeshBatch.PreviewRenderers` uses ordinary renderers for captures. Validate the real instanced web build in Chromium as well. Do not enable that preview behavior in the player.
- Build/open/verification tools must resolve the complete project-local editor. The hardcoded Hub editor installation may be incomplete; see `Tools/README.md`.
- Describe remaining differences honestly. Do not claim an exact visual match or guaranteed mobile frame rate based on screenshots or asset checks.
