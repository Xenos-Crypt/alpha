# Unreal fleet: mechanical layout and service record

Applies to the existing Aurora X9, Skyline X7 and Aerodynex X12 in HidrokFuture. The user's fleet reference is retained as `References/Mechanical-reference.png` from https://chatgpt.com/s/m_6adb006f7244819184810adae57e6ac3. It guides road stance, wheel proportions and separate retractable stabilisers. The earlier individual boards remain the source of each existing vehicle's model name and gameplay performance profile; the new collage contains different names and conflicting speed figures, which have not silently replaced those profiles.

This is documentation for the game implementation and proposed mechanical design. It is not a build specification for a real road vehicle or aircraft. In particular, wheel dimensions alone do not establish tyre load capacity. Tyre certification, suspension strength, brake sizing, fatigue, thermal limits, flight loads and actual control-system redundancy remain unvalidated.

## 1. Exterior, proportions and load paths

| Item | Current game dimension / behaviour |
| --- | --- |
| Body length | Approximately 5.8 m; trim can extend slightly beyond the nominal shell |
| Road tyre | 840 mm nominal outer diameter, approximately 320 mm section width, modelled tread |
| Wheel rim | Approximately 560 mm diameter; distinct hub and spokes |
| Wheelbase | 3.60 m, axle centres at local fore/aft ±1.80 m |
| Wheel-centre track | 2.50 m, centres at lateral ±1.25 m |
| Tyre outer-to-outer width | Approximately 2.82 m; body/tail trim can be wider |
| Road collision width | 3.10 m, deliberately enclosing tyres and existing tail trim |
| Visual underbody clearance | Approximately 0.16–0.24 m depending on body shell; road wheels remain exposed alongside the shell |
| Flight spans | Aurora 6.2 m; Skyline 6.4 m; Aerodynex 5.2 m |
| Parking pads | Four independent 0.34 × 0.44 m feet, inside the wheel track |
| Suspension presentation | Independent wheel road-height traces, up to ±80 mm visual travel |

The previous approximately 350 mm wheels and Aurora's use of landing feet as its only road support were placeholders. Every variant now has four road tyres. Tyres, hubs, upright/brake assemblies and parking stabilisers are separate components. Wheel spin does not rotate the shock absorber or caliper; front wheel steering is separate from spin.

The intended road load path is tyre → hub/bearing → upright → suspension arms/spring/damper → reinforced subframe → body structure. The intended parking-pad path is foot → telescopic leg → local crossmember/subframe. The pad is a stationary stabiliser, not a replacement for road suspension. The visual carbon panels, alloy frame, titanium-looking joints and glass materials do not currently have independent structural material properties.

For scale checking only: a proposed 4,500 kg gross case gives 1,125 kg equivalent static load per wheel if evenly shared. A 60% front-axle share would instead give 1,350 kg per front wheel before bumps, braking or landing loads. A tyre must be selected by its rated load, pressure, speed rating and duty cycle, not by appearance or diameter. No such tyre selection has been certified here. Four 0.34 × 0.44 m pads have approximately 0.598 m² total nominal area; that same evenly shared gross case would produce about 74 kPa average pad pressure, before uneven support or dynamic effects. The game checks contact geometry, not pavement bearing capacity.

## 2. Road powertrain and running gear

Implemented motion is a kinematic swept-body controller, not Chaos wheel physics. Throttle moves a target speed; acceleration and braking approach it; a swept box stops against blocking geometry. Tyre spin follows travelled speed/radius. Front wheels show steering angle, while chassis yaw remains the existing arcade controller. Wheel rays position the visual suspension; they do not calculate forces, grip, axle weight transfer or damper forces.

The proposed mechanical layout is electric traction with an underfloor energy module and controlled left/right torque distribution. Mechanical reduction gears, differential internals, coolant pumps, reduction-gear lubrication, ABS, regenerative/friction brake blending and steering assistance are **not simulated**. A visible disc/caliper and upright identify the intended service location; they are not an assertion of calculated braking capacity. Parking pads must retract before propulsion is enabled.

The prototype retains the shared 180 kWh gameplay energy store. Aurora's board supplies 120 kW fuel-cell assistance and Skyline's board 50 kW; the X12 board's speculative power sources are not functioning fusion or quantum simulations. The model's displayed reserve and energy use are simplified gameplay values. A kW power rating is not treated as a kWh storage capacity.

## 3. Flight mechanism and landing sequence

Four outboard motor housings and wings fold about separate scene-component pivots. Aurora and Skyline also display the two forward lift ducts from their earlier boards; Aerodynex uses four main lift fans. Flight deployment expands the collision envelope. `F` requests deployment; `Space/Q` controls vertical motion; `Shift` raises the speed limit. `L` can move landing gear while flying. Road mode keeps its wheels deployed.

Gear retracts by translating and rotating complete upright/wheel assemblies into their stowage positions; it no longer shrinks tyres or flattens the suspension mesh. Full-stow visibility suppresses hidden geometry. Fan/wing locks shown in diagnostics are controller states inferred from deployment position, not independently simulated mechanical locking pins or redundant position switches.

Landing request lowers the wheels and commands controlled descent. At ground height the controller returns to road mode and folds the wings. Parking feet can then be deployed separately with `P`. Foot deployment requires a stopped, grounded vehicle and nearby ground under each foot. It is blocked in flight. Propulsion and takeoff are interlocked while feet are deployed or still retracting. Pads do not lift the vehicle off its tyres and are not an approved maintenance jack.

Aerodynamic lift, duct thrust curves, wing structural loads, independent flight-computer voting, asymmetric motor failures, real flight-envelope protection and validated aircraft landing dynamics remain future work.

## 4. Doors, bonnet and luggage boot

Controls while occupying a stopped car:

| Key | Function |
| --- | --- |
| B | Release/open or close the rear luggage boot |
| H | Open/close the forward service bonnet |
| O | Open/close the two cabin-door skins |
| P | Deploy/retract the stationary parking stabilisers |
| K | Show/hide service telemetry and interlock states |

Motion or flight prevents new service-opening requests. Open panels prevent driving and takeoff. Occupants may exit to inspect an open car from outside. Cabin doors are articulated exterior skins; full door apertures, interior trim, seals, window lifters and a walk-through cabin collision model are not complete.

### Rear luggage boot sequence

1. **Release request:** `B` is accepted only while stopped and grounded. The controller clears its lock and latch state and runs a 0.25-second release delay. This represents a release switch, body controller and latch solenoid; electrical contacts and individual latch pawls are not separately animated.
2. **Powered opening:** after release, the lid rotates around a transverse hinge at the forward edge of the rear compartment. The hinge is at body-relative lateral 0, aft 1.65 m, height 0.98 m. The approximately 0.98 m lid extends aft from that pivot.
3. **Movement path:** the rear edge rises through a 68-degree arc at 42 degrees/second. Two visible actuator/strut cylinders update their length and direction between fixed body anchors and moving lid anchors. This is geometric articulation, not a gas-strut pressure or motor-torque simulation.
4. **Open hold:** the controller holds the open position. The luggage tub has a floor and walls independent of the forward service compartment. The lid includes a seal-shaped perimeter strip and a latch/striker block. Water sealing, compression, gutters and drains still need detailed modelling and validation.
5. **Closing request:** a second `B` reverses the actuator command. A game collision-overlap sensor checks the moving lid against external blocking objects. An obstruction reverses the request, leaves the latch/lock released, and sets `BOOT_OBSTRUCTION` in diagnostics. This is a simplified obstruction check, not validated human pinch protection or a force sensor.
6. **Close detection:** when lid angle is below 0.1 degrees and no reopen request is active, the controller reports the latch caught and the boot locked. A physically independent latch-position sensor and secondary catch are proposed service items rather than simulated hardware.
7. **Fault indication:** an obstruction remains indicated until a subsequent release cycle clears it. Do not interpret a closed-looking mesh alone as a locked boot; the interlock checks controller latch and lock states.

The **rear luggage tub is for cargo**. The **forward bonnet covers the service/power-electronics bay**, with partition walls, module blocks and routed cable presentation. Wing/fan mechanisms and their stowage volumes are separate again. Luggage must not occupy a rotor, actuator, high-voltage or landing-gear envelope. A production design would need additional sealed barriers, drainage and fire separation; those properties are not simulated by the mesh walls.

## 5. Electronics, controllers and diagnostics

| Logical device / signal | Current representation | Proposed physical service location |
| --- | --- | --- |
| Body controller | Vehicle service-state code | Forward dry service bay |
| Boot release input | B input action | Cabin switch and rear exterior switch |
| Latch / close detection | Controller state and lid angle | Rear latch/striker assembly |
| Boot obstruction input | Moving-lid blocking-overlap query | Lid edge sensors plus actuator-current sensing |
| Wheel/road height | Four ray queries | Wheel travel sensors and ride-height inputs |
| Wing position / lock | Deployment value and end-state labels | Each hinge/actuator/locking pin |
| Landing gear | Four animated upright/wheel assemblies | Gear bays and independent position switches |
| Parking-foot contact | Ground checks at four feet | Foot contact/load sensors |
| Pack and reserve | Simplified game energy values | Underfloor pack/BMS and isolated reserve system |

The proposed wiring separates traction/flight high voltage from an isolated low-voltage body circuit. The low-voltage branch would supply release switches, body controller, position sensors, service connector and latch/actuator controls through separately protected outputs. A production design would require appropriately rated contactors, fuses, precharge, insulation monitoring, grounded shielding, harness separation, environmental connectors and isolation procedures. Those circuits, fuse ratings, wire gauges, redundancy and emergency release hardware have not been designed or validated here.

`K` displays nominal wheel dimensions, wheelbase/track, wheel-to-road error, gear/wing state, parking-pad position, boot release/latch/lock state, and gameplay diagnostic flags. `PANEL_INTERLOCK` and `PARKING_INTERLOCK` indicate inhibited motion. `BOOT_OBSTRUCTION` records a rejected closing attempt. These codes do not implement an automotive OBD protocol, a full BMS, actuator thermal protection or redundant aircraft diagnostics.

## 6. Technician service workflow

**Game inspection procedure:** stop on level ground, deploy pads with P if desired, show K telemetry, open B/H/O as needed, then exit with E to inspect. Confirm road tyres are full size, contact the road and do not squash during stowage. Confirm calipers/struts remain fixed while tyres rotate; inspect front-wheel steering and pad clearance. Close service panels and retract pads before driving or deploying wings.

**Component relationships:** the body sits under `VisualRoot`; each `LandingGear` component carries its `RoadWheel`; `ParkingStabiliser` components are independent; `LuggageBoot` and `ForwardServiceBay` have separate hinge pivots; `BootActuator` components follow the boot anchors. `MainMotor`, `MainRotor`, `FoldingWing` and `FrontLiftRotor` components retain their flight presentation roles. The controller owns the interlocks and input actions.

**Inspection points:** wheel/rim damage, visible tread, suspension-arm and hose clearances, tyre/body overlap at steering limits, stowage clearance, parking-foot contact, hatch perimeter and latch alignment, actuator swept clearance, cable routing away from hinges, and separation of luggage from the forward service bay. In a physical design, bearing play, joint fasteners, brake wear, fluid condition, insulation and fatigue inspection would need manufacturer-approved procedures and limits; none are supplied as real maintenance instructions.

**Expected game failure modes and checks:**

| Symptom | First diagnostic / repair check |
| --- | --- |
| Car will not move or take off | Read interlocks; close B/H/O and retract P; wait for actuators to finish |
| Boot reverses while closing | Clear the moving-panel area; inspect `BOOT_OBSTRUCTION`; retry release/close |
| Boot appears closed but motion remains inhibited | Wait for closing detection; inspect latch/lock state and open bonnet/doors |
| Feet refuse to deploy | Stop fully, return to road mode and move onto a supported level surface |
| Wheels look airborne or embedded | Inspect contact error, map ground collision, wheel radius and visual-root offsets |
| Tyre rotates with caliper or strut | Check attachment hierarchy; only RoadWheel receives rolling rotation |
| Missing new parts after rebuilding | Regenerate/import transport meshes, rebuild native module, regenerate derived map |
| Wrong body or stale proportions | Check serialized VehicleVariant and its imported body/gear paths |

**Maintenance schedule:** in the game, run the vehicle automation after changes to geometry, collision, controls or service-state logic; inspect tyres/pads after map-ground changes; inspect wiring/hinge clearances after body or hatch edits. A real calendar, mileage or flight-hour maintenance schedule cannot be established from concept art. It needs actual component suppliers, load tests, operating conditions and certification evidence. No invented torque values or replacement intervals are prescribed.

**Repairability:** procedural meshes are independently replaceable assets; tyres, uprights, pads, lid and actuators can be repaired/rebuilt without replacing the body mesh. The implementation is in `AWAuroraVehicle.cpp` and `AWVehicleService.cpp`; assets are generated by `Tools/make-transport-models.mjs`. The real-map regression checks cover wheel contact, parking/service interlocks, boot opening/closing/locking, obstruction reversal and the normal road/flight cycle for all three variants. Mesh wall sealing, true wheel-force physics and detailed component-level failure simulation remain unfinished.

## Verification record

The rendered real-map StreetWalking and VehicleFlight automation passed after this change. VehicleFlight runs the mechanical/service checks and road/flight sequence for all three variants. Captures include a side view with pads and service panels deployed, plus the injected boot-obstruction case. Imported road-wheel bounds verify 840 mm diameter and 320 mm width. SourceData/aurora-gameplay-verification.json records the checks and reference image hashes.

A short 120-frame sample after skipping 30 startup frames measured mean 27.61 ms (about 36 FPS), p95 32.55 ms, on Intel HD 530 with the compatibility launch profile. SourceData/profile-mechanics.json retains the result. This is a scene sample, not a whole-game performance guarantee.
