Hidrok transport and city expansion
=================================

Controls: E enters/leaves nearby transport, G takes a slow or stopped road vehicle, M opens the destination map. In the skycar, Space ascends and Left Ctrl descends. Land before leaving it. Trams and the intercity maglev are public passenger transport and cannot be stolen. Taking cars, buses or bikes alerts police; displaced bike riders become walking civilians. Abandoned stolen vehicles stay parked.

Player-driven road vehicles can mount low pavements and kerbs (up to 0.4 m) and follow their height. Walls, tram safety rails and other tall obstacles remain solid. AI traffic stays on its road routes. Driving into unsupported open water sinks the vehicle and releases the player to swim; a submerged wreck cannot be entered again. Flying craft can cross water while airborne, but sink when lowered into it.

Swimming uses WASD, with Shift for faster swimming. Stamina drains in water and recovers on land; exhaustion drains health. Swim toward a clear shoreline to climb out. Tide has faster swimming and reduced stamina use. The ocean has open water columns and a seabed instead of an invisible floor at its surface.

Elemental controls: T cycles Ember, Gale, Tide and Terra; 1–4 activate dash, rising/area attack, barrage and slam; R activates a charged ultimate. Abilities consume energy, have cooldowns, show elemental effects, and can damage vehicles or push residents. These are the Unity versions of the four original elemental kits; the original combat cinematics and full combat system have not been ported.

The harbour ferry cruises at up to 3.5 m/s. A shipping request closes the bridge road approaches. The lift waits until vehicles and the player clear the span, raises its actual deck and parapets, and admits the ferry only at full clearance. Physical barriers protect the open approaches. The reservation stays active until the stern has cleared. The ferry remains a public passenger service.

Ocean and shipping-channel surfaces share a water level below the closed road deck. The thicker lift slab and its approaches keep the same driving height, so the lowered span renders as road without adding a step for AI traffic. The map includes Ashford lift bridge and Capital lift bridge viewpoints.

Road cars, emergency vehicles, buses and bikes use tire-free induction pods. The tram has magnetic suspension and aerodynamic ends. The elevated intercity maglev links three stations with platform lifts. The skycar and the parked electric VTOL planes and ducted-fan helicopters support player flight; additional aircraft follow patrol routes.

The innovation quarter adds 18 public/company buildings, including hover vehicle manufacturing, aerospace, nuclear energy, robotics/transit, a materials factory, school, market, pub and church. The saucer workshop has an accessible underground assembly floor via its reception lift. Production controls now reserve inputs and energy, advance timed jobs, create shared stock, and support sales and hovercar delivery. Nuclear energy and materials plants replenish industrial supplies. Output, active jobs and progress save locally in the browser; these saves are not cloud account saves. Zoo penguins/deer and coastal penguins roam bounded habitats; the beach has visitors and loungers.

Two parked helicopters and two VTOL planes at the airport now support player flight using the skycar controls. Enter through their pad interaction or take them with G; aircraft theft alerts police. Flight has physical collision sweeps, and airborne exit is blocked. Manufactured hovercars, VTOL planes and saucers belong to the player and do not trigger theft reports. Collect aircraft at the Aerospace delivery bay and saucers at the Saucer delivery bay; an occupied delivery pad retains the finished stock. The autonomous air patrols remain separate from the available player aircraft.

Homes now have flat solar and planted roofs, apartments have balconies and facade ribs, and civic/industrial buildings have distinct atriums or manufacturing skylights. Characters have sculpted heads, layered clothing, collars, hair variants and boots. Art direction remains stylized and does not reproduce another game's proprietary assets.

Verification: TrafficChecks covers traffic rules and C# syntax; WorldScenarioReview exercises bridge road/ship exclusion, occupied bike theft, lift access, transit, police pursuit and physical collisions. verify-web.cjs loads the Web build and captures existing regions and the new destinations. Do not claim a new preview is ready until the Unity build and browser checks have completed.
