Elemental powers and neighbourhood life
======================================

Use **M → Elemental practice field** to try skills away from housing. There are two training targets. **T** changes element, **1–4** uses a regular skill, **R** uses a charged ultimate. Left click or the **Punch** button punches. Energy and cooldowns apply to every regular skill.

| Element | Skill 1 | Skill 2 | Skill 3 | Skill 4 |
| --- | --- | --- | --- | --- |
| Ember / Fire | Flame Dash: ankle flames, fiery dash and swept hits | Rising Blaze: sword uppercut and forward flame plumes | Fireball Barrage: three fireballs | Meteor Slam: select, aim with the pointer, then click; on phones select and tap the ground. A red impact marker precedes a falling burning meteor, ground deformation and fire. |
| Tide / Water | Water Dash: three seconds as an invulnerable moving puddle, including passage through solids and water | Geyser Burst: rising fountain and outward splash | Water Barrage: three curved, hand-cast water streams | Tsunami Slam: a wide, curling, advancing water wall that damages and sweeps targets away |
| Terra / Earth | Bull Charge: horned stone mantle, continuous charge hit detection and stun | Stone Fist: visible stone gauntlets and 22-damage punches instead of 8 for eight seconds | Rock Barrage: five pointed rock shards | Ground Pound: a two-handed smash, collision-deformed ground, shockwave, damage and stun |
| Gale / Wind | Gale Flight: eight seconds of free flight; WASD moves, Space rises, Ctrl descends. Phones have Up/Down controls. | Cyclone: 0.6-second arm sweep, one transparent funnel for 3.5 seconds, a six-metre pull/lift and repeated damage, then outward release; eight-second cooldown | Wind Blades: three fast ranged cutting crescents with collision, damage and impact slash marks | Sky Breaker: upward wind launch, aerial plunge, ground dent, radial damage/stun and a circular gust. This replaces the previous storm move. |

Water Dash cannot leave the player embedded in a wall: it returns to the most recent clear position at expiry. Damage reduction checks reject all health loss during that form, and the protection ends with the three-second timer. It cannot be used to board vehicles or teleport while phased. Flying and stone-fist buffs do not grant invulnerability.

Meteor and ground-pound dents change both the visible ground mesh and collision. They are temporary scene changes, restored after roughly two minutes, and are not saved to an account. Fire and cut marks also expire. A defeated resident recovers after a short knockout; attacking residents or damaging vehicles alerts police. Training targets do not trigger a police report.

The life pass adds 412 residents, including 111 child figures, 1,300 flowers, garden butterflies, dogs, two duck ponds with ten ducks, beach visitors, and additional cars, ambulances, bicycles and motorcycles across the five cities. Human rendering and distant animation use distance limits; this is ambient street activity rather than a complete household-schedule simulation.

Inferno Awakening (Fire ultimate)
--------------------------------

At 100% ultimate charge, press **R** or the phone **Ultimate** button. A 10-metre explosion deals 45 immediate damage to visible nearby targets. Three animated flame spirals, body flames and rising embers surround the player for **12 seconds**. Normal skills remain usable with their usual energy costs and cooldowns. Fire Dash ankle flames, Rising Blaze's sword/plumes, Fireball Barrage and Meteor Slam grow visually stronger during awakening. Switching elements, boarding a vehicle or disabling the player ends the aura.

Every successful Fire skill hit ignites surviving residents and vehicles: **4 damage per second for 4 seconds**, delivered in half-second ticks after the direct impact. Fire cast during awakening applies **8 damage per second** instead. Repeated hits refresh the same status and preserve the stronger burn; they never stack extra statuses or tick loops. A burn applied during awakening retains that strength for its remaining four seconds. Knocked-out targets and sunk/destroyed vehicles lose their burning effect. Flames, embers and a subtle animated heat ring remain visible on burning targets. The heat ring is a lightweight visual, not screen-space heat distortion. Decorative ground flames do not repeatedly damage targets.

`InfernoReview` validates blast damage, both burn rates, one-status refresh, expiry, vehicle burning, regular skill availability, and aura cleanup. The shared ChatGPT reference could not be fetched; these rules follow the supplied written brief. Water and Earth ultimates retain their existing behavior pending their own references.

Validation: `PowerPresentationReview` exercises all four kits, target confirmation, physical dents, timed invulnerability, charge stun, punch damage, rock hits, free flight and aerial slam. `WorldScenarioReview` covers existing transport, swimming, collisions, factories, police, bridges and the USA portal. `verify-powers-web.cjs` checks desktop controls, effect screenshots, population, touch meteor targeting and timed Water Dash before publication.

Air showcase revision
---------------------

Gale Flight lasts eight seconds, with a collision-aware lift-off, cyan limb ribbons and a capped particle trail. WASD steers; Space/Ctrl or touch Up/Down changes height. When the timer expires, wind gathers underneath and the player descends at six metres/second, with limited horizontal steering and a landing gust. Flight has a 12-second cooldown from activation and grants no invulnerability.

Cyclone is anchored four metres ahead of the caster. The 0.6-second planted arm sweep precedes a 3.5-second rotating funnel. Every half-second, visible targets within six metres take four damage and are pulled inward/upward; walls block capture. The final eight-damage burst releases them outward, with collision-aware falling. Transparent air uses a small URP shader and animated bands to suggest pressure, rather than costly screen-space refraction. Ribbons and at most 70 orbiting debris particles provide motion.

Wind Blades sends three crescents up to roughly 49 metres at 35 metres/second. Each projectile deals 16 damage once per target and stops on solid geometry. Sky Breaker rises, then plunges with character-controller collision, dealing 36 damage and 1.8 seconds of stun in seven metres on ground impact; a ground dent and nine-metre gust mark the slam. A water landing does not create a ground crater.

Sky Dominion is the Air awakening ultimate (R / Ultimate at full charge). Prototype behavior: a 35-damage, ten-metre opening burst; 12-second cyan aura; faster flight and stronger visual trails, a larger visual funnel, 1.35x cyclone damage, 22-damage blades and a 48-damage aerial slam. Normal cooldowns and energy costs still apply. Switching elements or boarding ends the awakening. The shared links could not be fetched; the written brief defines flight/cyclone and names the other moves, so these ultimate mechanics are a starting interpretation.

`AirReview` checks flight expiry/landing, cyclone cast/duration/radius/pull/lift/ticks/release, wall exclusion, ranged damage, aerial slam and awakening expiry/cleanup.
