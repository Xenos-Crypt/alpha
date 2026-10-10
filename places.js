import * as THREE from 'three';

export function buildPlaces(ctx) {
  const { scene, box, colliders, camBlockers, planeBlocks, sitSpots, interactables, makeTex, toast } = ctx;
  const rooms = [], destinations = [];
  const palette = { wall: 0xdad5cb, trim: 0x34495e, floor: 0xb0b1ad, glass: 0x7596a5 };
  const fences = [], gates = [];
  const wireTexture = makeTex(128, 128, g => {
    g.clearRect(0, 0, 128, 128); g.strokeStyle = '#b9c1c5'; g.lineWidth = 3;
    for (let offset = -128; offset <= 256; offset += 32) {
      g.beginPath(); g.moveTo(offset, 0); g.lineTo(offset + 128, 128); g.stroke();
      g.beginPath(); g.moveTo(offset, 0); g.lineTo(offset - 128, 128); g.stroke();
    }
  });
  function fence(x1, z1, x2, z2, height = 2.7) {
    const length = Math.hypot(x2 - x1, z2 - z1), alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
    if (length < .1) return;
    const texture = wireTexture.clone(); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(length / 2, height / 2); texture.needsUpdate = true;
    const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: .35, side: THREE.DoubleSide, roughness: .65 });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(length, height), material);
    panel.position.set((x1+x2)/2,height/2,(z1+z2)/2);panel.rotation.y=alongX?0:Math.PI/2;scene.add(panel);
    const count = Math.ceil(length / 5);
    for (let i = 0; i <= count; i++) {
      const x = x1 + (x2-x1)*i/count, z = z1+(z2-z1)*i/count;
      box(.09,height+.25,.09,x,(height+.25)/2,z,0x59636a,false);
    }
    for (const y of [.15,height-.1]) {
      box(alongX?length:.06,.06,alongX?.06:length,(x1+x2)/2,y,(z1+z2)/2,0x68737a,false);
    }
    const barrier={minX:Math.min(x1,x2)-.12,maxX:Math.max(x1,x2)+.12,minZ:Math.min(z1,z2)-.12,maxZ:Math.max(z1,z2)+.12};
    colliders.push(barrier); planeBlocks.push({...barrier,top:height}); fences.push(barrier);
  }
  function fencedYard(name, minX, maxX, minZ, maxZ, gateX, gateWidth = 8, height = 2.7) {
    fence(minX,minZ,maxX,minZ,height);fence(minX,minZ,minX,maxZ,height);fence(maxX,minZ,maxX,maxZ,height);
    fence(minX,maxZ,gateX-gateWidth/2,maxZ,height);fence(gateX+gateWidth/2,maxZ,maxX,maxZ,height);
    gates.push({name,x:gateX,z:maxZ,width:gateWidth});
    for(const x of [gateX-gateWidth/2,gateX+gateWidth/2])box(.25,height+.5,.25,x,(height+.5)/2,maxZ,0x444f59,false);
    sign(name,gateX,height+.75,maxZ+.2,Math.min(12,gateWidth+2),'#3d4c43');
  }
  function sign(text, x, y, z, width = 12, colour = '#15364a') {
    const texture = makeTex(1024, 128, g => {
      g.fillStyle = colour; g.fillRect(0, 0, 1024, 128);
      g.fillStyle = '#ffffff'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 512, 64, 970);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 8), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    m.position.set(x, y, z); scene.add(m); return m;
  }
  function slab(w, d, x, z, colour, y = .06) { return box(w, .04, d, x, y, z, colour, false); }
  function wall(w, h, d, x, y, z, colour = palette.wall) {
    const m = box(w, h, d, x, y, z, colour); camBlockers.push(m); return m;
  }
  function room(name, x, z, w, d, colour = palette.wall, h = 6) {
    slab(w, d, x, z, palette.floor);
    wall(w, h, .4, x, h / 2, z - d / 2, colour);
    wall(.4, h, d, x - w / 2, h / 2, z, colour); wall(.4, h, d, x + w / 2, h / 2, z, colour);
    // Four-metre door opening: both walking and the third-person camera fit.
    wall((w - 4) / 2, h, .4, x - (w + 4) / 4, h / 2, z + d / 2, colour);
    wall((w - 4) / 2, h, .4, x + (w + 4) / 4, h / 2, z + d / 2, colour);
    box(4, 1, .4, x, h - .5, z + d / 2, palette.trim, false);
    const roof = box(w + 1, .25, d + 1, x, h + .12, z, palette.trim, false);
    camBlockers.push(roof);
    planeBlocks.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: h + .25 });
    sign(name, x, h - 1.4, z + d / 2 + .25, Math.min(w - 2, 18));
    for (let dx = -w / 2 + 3; dx < w / 2 - 2; dx += 5) {
      if (Math.abs(dx) < 4) continue;
      box(3, 2, .1, x + dx, 2.7, z + d / 2 + .26, palette.glass, false);
    }
    rooms.push({ x, z, w, d, roof });
    destinations.push({ name, x, z: z + d / 2 + 6 });
    slab(5, 12, x, z + d / 2 + 6, 0x999c9b);
    return { x, z, w, d };
  }
  function bench(x, z, yaw = Math.PI, label = 'Sit on bench') {
    box(2.4, .15, .65, x, .5, z, 0x665747, false);
    box(2.4, .7, .1, x, .85, z + .3, 0x665747, false);
    for (const dx of [-.9, .9]) box(.12, .5, .5, x + dx, .25, z, 0x30343a, false);
    sitSpots.push({ x, z, yaw, seatY: .575, label });
  }
  function desk(x, z, label, action) {
    box(4, .9, 1.2, x, .45, z, 0x6a5949); box(.9, .5, .08, x, 1.15, z, 0x233342, false);
    if (label) interactables.push({ pos: new THREE.Vector3(x, 0, z + 1.6), r: 2, label, action });
  }
  function parking(x, z, w = 34, d = 18) {
    slab(w, d, x, z, 0x44484c);
    for (let dx = -w / 2 + 3; dx < w / 2; dx += 3) slab(.1, 5, x + dx, z - d / 2 + 3, 0xf2f0df, .1);
  }
  // New district to the east, separate from the real Edinburgh map patch.
  slab(340, 260, 540, -70, 0x788367, -.04);
  slab(300, 10, 510, -4, 0x44484c); slab(10, 190, 540, -65, 0x44484c);
  slab(240, 10, 300, -4, 0x44484c); // road connecting town and district
  const police = room('ASHFORD POLICE STATION', 410, -65, 34, 28, 0xc4cbd3);
  desk(police.x, police.z - 5, 'Police reception', ctx.policeReception);
  bench(400, -59); bench(421, -59);
  for (let dx = -11; dx <= 11; dx += 11) {
    wall(8, 2.8, .15, police.x + dx, 1.4, police.z - 9, 0x777d84);
    for (let bar = -3.5; bar <= 3.5; bar += .5) box(.06, 2.6, .06, police.x + dx + bar, 1.3, police.z - 8.8, 0x30353b);
  }
  sign('RECEPTION  |  REPORTS  |  CUSTODY', 410, 2.4, -72, 13);
  parking(410, -28); ctx.addPoliceCar?.(390, -30);

  const office = room('ASHFORD CONSTRUCTION', 470, -66, 30, 26, 0xc9bfa8);
  desk(470, -71, 'Take construction shift', ctx.constructionShift);
  for (let x = 461; x <= 479; x += 9) { box(3, .8, 1.8, x, .4, -61, 0x6c6458); sign('PROJECT PLANS', x, 1.7, -62, 3); }
  slab(30, 25, 470, -101, 0x918773);
  for (let x = 460; x <= 480; x += 5) box(3, 1.2, 2, x, .6, -103, 0xa66c49);
  // Crane mast, jib and hook; a visible work yard rather than a generic office block.
  wall(.7, 19, .7, 486, 9.5, -102, 0xd1a12c);
  box(27, .65, .65, 478, 19, -102, 0xd1a12c, false);
  box(.08, 7, .08, 466, 15.4, -102, 0x34383b, false); box(.5, .5, .5, 466, 11.7, -102, 0x333333, false);

  const market = room('ASHFORD SUPERMARKET', 590, -66, 42, 34, 0xe0daca);
  for (const x of [577, 585, 595, 603]) {
    box(2.2, 1.7, 18, x, .85, -69, 0x59636b);
    for (let z = -76; z <= -62; z += 2) for (const side of [-1, 1]) box(.35, .5, .8, x + side * 1.2, 1.05, z, side < 0 ? 0xb06840 : 0x75a064, false);
  }
  sign('PRODUCE    GROCERIES    HOUSEHOLD', 590, 3.8, -79, 18);
  desk(590, -53, 'Buy groceries (�15)', ctx.buyGroceries);
  parking(590, -29, 44);

  const mall = room('ASHFORD GALLERIA', 625, 55, 70, 44, 0xd8d0c4, 8);
  for (const x of [600, 616, 634, 650]) {
    const names = ['CLOTHING', 'ELECTRONICS', 'BOOKSHOP', 'FOOD COURT'];
    const i = [600, 616, 634, 650].indexOf(x);
    box(12, .9, 2, x, .45, 40, i === 3 ? 0xb08154 : 0x6d7786);
    sign(names[i], x, 3.5, 37, 11);
    interactables.push({ pos: new THREE.Vector3(x, 0, 42), r: 2.4, label: i === 3 ? 'Buy meal (�10)' : 'Browse ' + names[i].toLowerCase(), action: i === 3 ? ctx.buyMeal : () => toast(['Clothing shop: civilian outfits on display.', 'Electronics shop: phones, computers and televisions.', 'Bookshop: local history and travel guides.'][i]) });
  }
  for (const x of [610, 640]) { bench(x, 57); box(1, 2, 1, x, 1, 50, 0x74916a); }
  // Glass clerestory and a broad entrance canopy.
  box(50, 1.5, .15, 625, 6.5, 77.3, palette.glass, false);
  box(20, .3, 5, 625, 4.5, 79, palette.trim, false); parking(625, 105, 72, 20);

  room('BASE VISITOR RECEPTION', 430, 62, 28, 22, 0x929780);
  desk(430, 58, 'Military visitor reception', () => toast('Visitors must remain in reception. Beyond the checkpoint is restricted.'));
  slab(80, 75, 470, 111, 0x7b8066);
  for (const x of [449, 477, 500]) room('BARRACKS', x, 108, 20, 24, 0x858b74, 4);
  fence(438,74,438,148,3.2); fence(510,74,510,148,3.2); fence(438,148,510,148,3.2);
  fence(438,74,458,74,3.2); fence(472,74,510,74,3.2);
  gates.push({name:'Military checkpoint',x:465,z:74,width:14});
  sign('RESTRICTED AREA � AUTHORISED PERSONNEL', 466, 3, 75, 17, '#763529');
  destinations.push({ name: 'Military base', x: 430, z: 78 });

  // Compact fictional regional airport: organised passenger and airside zones.
  const ax = -550;
  slab(310, 540, ax - 30, 0, 0x77866b, -.04);
  slab(32, 460, ax, 0, 0x383c42); slab(14, 410, ax - 48, 0, 0x53595b);
  for (let z = -190; z <= 190; z += 22) slab(.5, 10, ax, z, 0xf5f2e6, .1);
  for (const x of [ax - 15, ax + 15]) for (let z = -220; z <= 220; z += 20) {
    slab(.3, 15, x, z, 0xe7e8e1, .1); box(.2, .16, .2, x - Math.sign(x - ax) * .5, .14, z, 0xf2dbaa, false);
  }
  for (const z of [-205, 205]) for (let dx = -10; dx <= 10; dx += 4) slab(2, 18, ax + dx, z, 0xf4f2e7, .1);
  // Horizontal ground labels face upward, with runway heading 18/36.
  for (const [text, z] of [['36', -185], ['18', 185]]) { const m = sign(text, ax, .15, z, 10, '#383c42'); m.rotation.x = -Math.PI / 2; }
  for (const z of [-160, 0, 160]) { slab(48, 14, ax - 24, z, 0x53595b, .07); slab(48, .3, ax - 24, z, 0xd7bb52, .11); }
  slab(90, 120, ax - 106, -20, 0x8b8e8b); // apron
  const terminal = room('ASHFORD REGIONAL AIRPORT', ax - 111, 80, 74, 34, 0xd6dce0, 7);
  desk(ax - 126, 82, 'Airport information', () => toast('Check-in and security lead to the departure lounge. Flyable aircraft are on the apron south of the terminal.'));
  sign('CHECK-IN    SECURITY    DEPARTURES', ax - 111, 3.6, 65, 24);
  for (const x of [ax - 137, ax - 119, ax - 101, ax - 83]) {
    box(7, 1, 1.3, x, .5, 71, 0x567889); bench(x, 88, Math.PI, 'Sit in departure lounge');
    box(4, 3, .1, x, 2.3, 63.3, palette.glass, false);
  }
  parking(ax - 111, 125, 80, 24);
  for (const z of [-48, -12, 24]) {
    slab(20, .3, ax - 106, z, 0xd6bc55, .1); slab(.3, 20, ax - 96, z, 0xd6bc55, .1);
    box(15, 3, 3, ax - 106, 1.5, z - 11, 0xa4adb3, false); // covered gate access
  }
  room('AIRCRAFT MAINTENANCE', ax - 115, -115, 40, 36, 0x8e979d, 11);
  wall(7, 20, 7, ax - 162, 10, -15, 0xa9b1b8);
  box(12, 3.5, 12, ax - 162, 21, -15, palette.glass, false);
  planeBlocks.push({ minX: ax - 168, maxX: ax - 156, minZ: -21, maxZ: -9, top: 23 });
  sign('CONTROL', ax - 162, 17, -11, 7);
  destinations.push({ name: 'Airport aircraft apron', x: ax - 95, z: -25 });

  // Keep public entrances open; fence hazardous yards and secure perimeters.
  fencedYard('CONSTRUCTION YARD',450,490,-118,-85,470,10,2.4);
  fencedYard('POLICE STAFF COURTYARD',389,431,-100,-83,410,8,2.8);
  fencedYard('SUPERMARKET DELIVERIES',568,612,-105,-87,590,10,2.2);
  fencedYard('MALL LOADING AREA',589,661,6,29,625,12,2.2);
  fencedYard('AIRPORT PUBLIC ENTRANCE',-740,-510,-250,250,-660,16,3);
  // Landside terminal and car park are separate from the aircraft apron.
  fence(-740,60,-651,60,3); fence(-639,60,-568,60,3);
  gates.push({name:'Airport apron access',x:-645,z:60,width:12});
  sign('AIRCRAFT APRON ACCESS',-645,3.8,60.2,12,'#634f24');

  function openTravel() {
    let panel = document.getElementById('placesTravel');
    if (!panel) { panel = document.createElement('div'); panel.id = 'placesTravel'; panel.style.cssText = 'position:fixed;inset:12% 25%;overflow:auto;background:#14202eef;color:white;padding:24px;z-index:60;border-radius:14px;font:16px system-ui'; document.body.append(panel); }
    panel.replaceChildren();
    const heading = document.createElement('h2'); heading.textContent = 'Town travel board'; panel.append(heading);
    const close = document.createElement('button'); close.textContent = 'Close'; close.onclick = () => { panel.hidden = true; ctx.resume(); }; panel.append(close);
    for (const d of destinations.filter(d => !d.name.includes('BARRACKS'))) {
      const button = document.createElement('button'); button.textContent = d.name; button.style.cssText = 'display:block;width:100%;padding:12px;margin-top:8px;text-align:left;cursor:pointer';
      button.onclick = () => { ctx.travelTo(d); panel.hidden = true; ctx.resume(); }; panel.append(button);
    }
    panel.hidden = false; ctx.pause?.(); document.exitPointerLock();
  }
  sign('TOWN TRAVEL - PRESS E', 20, 2, 12, 6);
  interactables.push({ pos: new THREE.Vector3(20, 0, 12), r: 2.5, label: 'Open town travel board', action: openTravel });
  for (const d of destinations.filter(d => !d.name.includes('BARRACKS'))) interactables.push({ pos: new THREE.Vector3(d.x + 5, 0, d.z), r: 2.5, label: 'Open town travel board', action: openTravel });
  // Street name signs at intersections around town, purely decorative — gives streets
  // a visible identity instead of every block looking the same.
  const streetNames = ['MAPLE ST', 'OAK AVE', 'ELM ST', 'BIRCH RD', 'CEDAR AVE', 'PINE ST', 'ASH RD', 'WILLOW AVE'];
  let streetSignIdx = 0;
  for (let bx = -4; bx <= 4; bx++) {
    for (let bz = -4; bz <= 4; bz++) {
      if ((bx + bz) % 2 !== 0) continue; // every other intersection, not literally everywhere
      const x = bx * 40, z = bz * 40;
      if (Math.hypot(x, z) < 15) continue; // keep the area right at spawn clear
      box(0.12, 2.6, 0.12, x + 1.6, 1.3, z + 1.6, 0x4a4a4a, false);
      sign(streetNames[streetSignIdx++ % streetNames.length], x + 1.6, 2.7, z + 1.6, 4.2, '#1d2e1f');
    }
  }
  let restrictedWarned = false;
  return { destinations, rooms, fences, gates, airportX: ax, update(player, inCar) {
    for (const r of rooms) r.roof.visible = inCar || !(Math.abs(player.position.x - r.x) < r.w / 2 && Math.abs(player.position.z - r.z) < r.d / 2);
    const restricted = player.position.x > 438 && player.position.x < 510 && player.position.z > 75 && player.position.z < 148;
    if (restricted && !restrictedWarned) { toast('Restricted military compound: security has been alerted.'); ctx.restrictedEntry(); }
    restrictedWarned = restricted;
  } };
}
