# Landscape and transport reference pass

References supplied by the user:

- https://chatgpt.com/s/m_6ad24c4812f48191b5dad52a8132b1ce
- https://chatgpt.com/s/m_6ad24f6f81a88191871d4f0090e587e6

Both concept boards were opened and visually inspected through their shared image links. They are visual targets, not game assets or evidence that the game has the same rendering fidelity.

Five shared instancing-enabled URP materials live in `Assets/Resources/Landscaping`: green grass, pale tiled paving, dark asphalt, soil and decorative gravel. All have tiling colour and normal maps. New procedural textures are 256 square with mipmaps; the existing asphalt maps are reused. `WorldShapes.Material` shares these surfaces across existing world generators.

Five reusable planting prefabs contain shared combined low-poly meshes: tree, small tree, shrub, purple flowers and gold flowers. Explicit GPU instancing culls trees at 240 m and shrubs/flowers at 95 m. The `VegetationAsset` marker has its own script asset so the distance settings survive prefab serialization. Tree trunks retain collision. Plot planting uses low kerbs, soil beds, gravel transitions and thin emissive cyan path inlays. Bus docking recesses are excluded. No individual real-time lights are added to the strips.

Transport models now have separate family-specific bodies rather than one repeated wedge. Cars have a lower cabin, bonnet, split running lamps, framed side glazing, door joints, mirrors and integrated lift fairings. Bikes use an exposed frame, separate saddle, smaller fairing and downward induction lenses. Rail vehicles have upright window bands, rounded roof crowns and sliding-door joints. The three-car train and its reference capture include inter-car gangways. Aircraft use a spindle fuselage, swept wings, tailplane, cabin windows and exterior flight-deck glazing; rotorless shuttles have separate cabins and lift sponsons. The ferry uses twin catamaran hulls, an upright glazed cabin and passenger handrails. Emergency variants have distinct markings and medical compartments.

Glazing uses a lightweight analytic sky reflection shader with Fresnel highlights and fog; it does not reflect live scene geometry. Existing vehicle controls, collision envelopes, routes and service logic remain. Trams and trains remain public transit rather than stealable vehicles.

`LandscapeTransportReview.Run` validates material maps/texture limits and serialized planting markers, then captures eleven vehicle variants plus actual landscape/city views. Its offscreen SRP captures temporarily use ordinary mesh renderers because explicit instanced draws are not replayed by an offscreen render request. This editor-only capture setting does not change web rendering. The browser checks validate the actual instanced web build separately.

Comparison found and corrected an omitted-instancing capture issue, excessively tall car canopies, rail posts beyond sloping glazing, brown paving and flower beds outside the main view. Captures are in `Logs/reference-*.png`, with a contact sheet at `Logs/transport-landscape-comparison.png`. This is still a stylized low-poly interpretation; it does not reproduce the boards' photographic materials, foliage or detailed authored vehicle models. No measured 60 FPS guarantee has been established.
