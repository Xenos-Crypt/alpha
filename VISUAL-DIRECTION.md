# Another World — visual direction

## Target

The setting is the advanced civilization established in the Unity version: layered white and graphite architecture, panoramic glass, cyan service lighting, landscaped public spaces, glass villas, levitating transport, elevated maglev and a transparent honeycomb climate/cloaking canopy. Carry that identity into Unreal with believable materials, lighting and human scale. The earlier period brick streetscape is a preserved experiment. See `unreal/FUTURE-DIRECTION.md` for the reviewed Unity references and current migration limits.

Current implementation direction: Unreal Engine 5.8. The browser requirements below describe the earlier prototype. Its layout is a migration reference, not an acceptable substitute for the realism target. Establish a reviewed street section with physical architectural depth, photographed PBR surfaces and grounded lighting before extending that treatment across the country. The Intel HD 530 / DirectX 11 workstation preview cannot validate the final high-end lighting target.

Bodycam is a reference for environmental photorealism. The game's name is Another World. A body-camera recording interface, combat premise, or imitation of Bodycam's maps is not part of the requirement.

References reviewed:
- https://reissad.com/ — official studio description of photoreal UE5 visuals, lighting and materials.
- https://store.steampowered.com/app/2406770/Bodycam/ — official description of detailed environments inspired by real locations, and camera/exposure research.

## First playable environment

One small, walkable town block with a street, café, homes and a public space. Establish visual quality on this block before expanding the town. Keep the open world simulation, residents with powers, emotions and goals, and first-person player body. The player's face is visible only through a selfie phone, mirrors or similar in-world reflections.

## Required rendering upgrade

Replace the current untextured cube renderer with a browser 3D renderer that supports physically based materials, textured glTF models, shadows, environment lighting and appropriate color management. Browser delivery remains a requirement. Bodycam's native Unreal Engine rendering does not transfer directly into this WebGL prototype.

Use legitimately licensed, realistic assets with base color, roughness and normal maps. Prioritize believable human scale, sidewalk edges, varied building facades, doors/windows, street wear, foliage silhouettes and contact shadows. Asset licenses, browser download size and GPU cost must be recorded before assets are committed.

Replace box-shaped people with rigged characters and animation. Replace the drawn selfie illustration with a second camera viewing the actual player model. Player-body placement and animation must follow movement and facing. Mirrors require explicit reflection rendering.

## Acceptance criteria

- Streets and buildings read as real places without relying on grain or dark filters.
- Materials respond consistently to light; people and street furniture cast grounded shadows.
- The playable block has realistic silhouettes, scale, weathering and vegetation.
- Player body and phone reflection represent the same character.
- NPC decisions and power consequences still operate during exploration.
- Measure actual loading and frame time in a desktop browser; do not claim Bodycam-equivalent quality from a mock render test.

## Current state

The rendering foundation is now Three.js with PBR surface maps, an HDR sky, shadows, detailed procedural façades and an accessible café. Static meshes are batched and leaves are instanced. Browser screenshots verify the scene and the phone's second-camera view. NPCs have route planning and local decision rules. All residents and the player use a textured human GLB with independent skeletal animation. A diverse civilian cast and scanned town assets are still needed; the scene does not match Bodycam's photorealism and residents do not use an LLM.
