# Playable road/flight cars

HidrokFuture contains all three cars together. Approach a car and press E. WASD controls throttle/steering (A left, D right), Shift boosts, F deploys flight mode or requests landing, Space/Q climbs/descends, L toggles gear and C changes camera. Stop, land and fold before exiting with E.

| Model | Reference board | Body length | Flight width | Boosted road / air caps | Visible cabin |
| --- | --- | --- | --- | --- | --- |
| Aurora X9 | References/Aurora-X9.png | 5.8 m | 6.2 m | 250 / 320 km/h | Four seats |
| Skyline X7 | References/Variant-A.png | 5.8 m | 6.4 m | 320 / 620 km/h | Six seats |
| Aerodynex X12 | References/Variant-B.png | 5.8 m | 5.2 m | 320 / 620 km/h | Six seats |

Skyline uses a dark body, longer folding outriggers and its own fan housings. Aerodynex uses a pearl/carbon shell, sharper side panels, tail stabilizers and four main lift fans. All three models have full-size retractable road-wheel assemblies; separate parking pads deploy only when stopped. See VEHICLE-SERVICE.md for dimensions, boot sequence and service limitations. These are original procedural interpretations of the supplied boards; additional modeling and material work is needed to match the reference renders.

Skyline source: https://chatgpt.com/s/m_6ada696fcbe481918d0a3e349bd56883

Aerodynex source: https://chatgpt.com/s/m_6ada6af13e4081918b2f80feeb6e7c33

Meshes: Tools/make-transport-models.mjs; import: Tools/import-transport-models.ps1; native shared controller: AnotherWorld/Source/AnotherWorld/AWAuroraVehicle.cpp. VehicleVariant is serialized per actor (0 Aurora, 1 Skyline, 2 Aerodynex). Rebuild the module before regenerating the future map.

Gameplay uses simplified swept collision, acceleration and energy calculations. The X12 board's speculative fusion/quantum systems are not engineering simulations. Its battery storage capacity is not given in kWh, so it retains the shared prototype energy capacity rather than converting the board's kW power rating into storage. Full autonomy, shielding, safety systems, passenger interaction and voice/remote controls remain pending.

The real-map VehicleFlight automation runs entry, left/right steering, drive, takeoff, battery use, landing and exit for every variant, saving separate road/flight captures under AnotherWorld/Saved/Screenshots/WindowsEditor.

Final three-car startup profile: 120 measured frames after skipping the first 30; mean 33.67 ms (about 30 FPS), p95 61.49 ms on Intel HD 530 at 1280x720 / 85% internal resolution with FXAA. See SourceData/profile-variants.json. This short sample does not establish smooth performance throughout the world.

Service controls while stopped: P parking pads, B luggage boot, H forward service bonnet, O doors, K diagnostics. Parking pads and open panels interlock driving and takeoff.
