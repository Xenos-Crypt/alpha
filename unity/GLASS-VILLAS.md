Glass villa reference pass
=========================

All generated courtyard houses now use the glass pavilion design, including regional houses. The central example is on the map as **Hidrok Glass Villa**. Existing roads, cities and civic buildings remain.

The model has full-height transparent glazing, narrow dark frames, a deep floating roof, emissive cyan edges, a raised oak floor, five illuminated entrance steps and three shallow reflecting pools. The interior includes a cushioned sofa, pillows, rug, coffee table, lounge chair, dining set, bed, kitchen, lamps, planters and pleated curtains. The central entrance remains open; glass, furniture, floor and roof have physical collision. The visible roof uses a cutaway in third person indoors and remains visible in first person; its separate collision hull remains. Paired plots use compact villas to keep the pavements clear.

Geometry and shaders are built for the web: shared bevelled furniture meshes, existing small tiling textures, one glass shader and one animated pool shader. Glass has angle-dependent sky tint and highlights; it does not capture live scene reflections. The pool ripples and highlights are procedural. Interiors and clear glass are reduced beyond 70 metres. Warm interior point lights have no shadows, work only nearby, and are disabled on Low quality. No new high-resolution texture downloads are required.

`VillaReview` validates glazing, furniture, pool materials, stairs, entrance traversal, glass/roof collision, roof visibility and distance/Low-quality behavior. Browser screenshots are used to inspect the actual rendered result before publication. This is a playable villa interpretation of the supplied architectural image, not an offline photographic render.
