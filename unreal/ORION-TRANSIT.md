# Orion Transit Systems in Unreal

The user's final route instruction takes priority over the concept board's original ground-train wording: **regional trains run underground; urban trams retain the elevated guideway**. Neither vehicle flies. The reference is saved as `References/Orion-transit.png` from https://chatgpt.com/s/m_6adb04049fd88191b65f2842dc281d95.

| Service | Regional train | Urban tram |
| --- | --- | --- |
| Infrastructure | Enclosed, atmospheric underground tunnel | Elevated supported guideway above the street |
| Consist | Eight approximately 25 m sections | Four approximately 10 m sections |
| Nominal length | 200 m, plus small coupling gaps | 40 m, plus small coupling gaps |
| Section width / height | 3.4 m / 4.2 m | 2.8 m / 3.2 m |
| Central platform length | 240 m | 50 m |
| Guideway deck elevation | 18 m below the surface datum | 9 m above it |
| Demonstration guideway length | 1,300 m | 400 m |
| Local turnbacks | ±480 m from Central | ±150 m from Central |
| Local controller speed cap | 162 km/h | 50 km/h |

The concept's 400 km/h regional and 120 km/h tram figures are design aspirations, not speeds achieved on these short demonstration routes. Acceleration and braking-distance constraints produce lower speeds between nearby stops. A larger intercity network remains future work.

## Access and use

Near the starting area, the **UNDERGROUND TRAINS** and **ELEVATED TRAMS** signs mark separate lift access points on the east pavement. Approach and press **T** to transfer to the corresponding Central platform. Use the platform lift with T to return to the street.

Wait at the marked boarding area. The HUD shows service, speed and door state. Press **E** while the train/tram is stopped with its doors open to board. Look around during the ride; the service drives automatically. E alights only at Central while stopped and open. Moving vehicles reject alighting.

The lift interaction transfers the character between landings. A moving lift cabin, lift travel animation and underground stair excavation are not simulated. The passenger ride attaches the character to a seated/standing ride position; a freely walkable moving carriage interior and large NPC crowds are not complete.

## Route and vehicle implementation

`AWOrionLine` maintains a train transform constrained to its fixed guideway axis and elevation. Eight/four section components form one consist, with distinct cab and passenger-coach meshes. Cab ends face outward at both ends, so a turnback reverses propulsion without rotating the train. The metallic bodies, panoramic glazing, seats, blue trim, underbody equipment and boarding-door leaves are original project meshes based on the board.

The underground line has a tunnel shell, track/reaction structure, maintenance ledges, a wider Central station box, platforms, lights, benches and wayfinding. Collision supports the platform and encloses the tunnel. Its station is below the existing surface support slab. The elevated tram has a separate supported guideway, platform and canopy. It is not an underground train model moved into the sky.

Reaction surfaces and underbody equipment have a nominal visual clearance of approximately 10 mm at the maglev interface. There is no simulated magnetic-field solver or independent suspension feedback loop: the game controller constrains the consist to the guideway. Linear-motor thrust, regenerative braking, power availability and emergency braking are represented by controller state and speed changes, not validated electromagnetic hardware or a certified train-control system.

## Stops, doors and safety behaviour

- Services dwell at Central, close the boarding doors, travel to a turnback, stop and reverse, then return through Central. Each line currently has one passenger station; the ends are turnbacks rather than connected cities or fully equipped passenger terminals.
- The controller limits speed using remaining stopping distance, accelerates gradually and brakes toward the target. It does not teleport from stop to stop.
- Door opening is limited to a stopped Central dwell. Motion is inhibited until doors close. A platform boarding gate follows the same door state, and fixed guards protect the surrounding platform edge.
- Boarding requires proximity and open doors. Alighting is rejected while moving or away from Central.
- An emergency-stop request commands stronger braking. Loss of the controller's power-available flag commands a stop while retaining guideway alignment as a simplified backup-support assumption.
- Route position, speed, door state and guideway deviation are available as game telemetry. Full signalling blocks, multi-train separation, redundant sensing, degraded recovery, evacuation procedures and engineered backup support are unfinished.

The tunnel is open to normal atmospheric conditions. Compressed air is not used for lift and the route is not a sealed low-pressure tube.

## Rebuilding and verification

Generate/import meshes with `Tools/make-transport-models.mjs` and `Tools/import-transport-models.ps1`. Build the C++ module, then run `Tools/build-future-district.ps1`, which executes `build_orion_network.py` and saves both services and four lift landings into HidrokFuture. Generated network metadata is in `SourceData/orion-network-report.json`.

`AnotherWorld.Gameplay.OrionTransit` checks the route elevations, both platform floors, street/platform lift transfers, boarding, guided motion with an attached passenger, locked moving doors, rejected moving exits, emergency braking and station alighting. Its setup resets a service at Central to avoid waiting for a complete cycle; that maintenance/test reset is not exposed as a player travel shortcut. The normal walking and car-mechanics tests continue to cover the existing world and cars.

Rendered captures are saved under `AnotherWorld/Saved/Screenshots/WindowsEditor` as `Orion_UndergroundStation.png`, `Orion_RegionalRide.png`, `Orion_ElevatedPlatform.png` and `Orion_TramRide.png`. A completed import or map save alone does not verify their appearance.
