import {buildWorldExpansion,insideExclusionZone} from './world-expansion.js';
import {duplicateEmailMessage,verificationEmailMessage} from './auth-feedback.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {upgradeWorldMaterials} from './visual-upgrade.js';
import {transitArrestTarget} from './transit-police.js';
import {createNpcConversations} from './npc-conversations.js';
import {registerAdditionalStructures} from './destructible-structures.js';
import {detailVehicle} from './vehicle-design.js';
import {buildRegionalFacilities} from './regional-facilities.js';
import {buildNavy} from './navy.js';
import {buildIntercityRail} from './intercity-rail.js';
import {shipNeedsBridge,shipCanAdvance,driftVelocity,rollAircraft} from './transport-rules.js';
import {fenceSegments,conditionFactors,applyVehicleCondition} from './crash-infrastructure.js';
import {buildBridgeTraffic} from './bridge-traffic.js';
import {buildAdventureServices} from './adventure-services.js';
import {roadsidePosition} from './roadside-placement.js';
import {buildWorldAdvertising} from './world-advertising.js';
import {createWorldMap} from './world-map.js';
import {createMovieTv} from './movie-tv.js';
import {createOnlineAccount} from './online-account.js';
import {createSupportSkills} from './support-skills.js';
import {buildCityServices} from './city-services.js';
import {requireUsername,createOnlineAvatars} from './online-players.js';
import {createRoomChat} from './room-chat.js';
import {buildCityLife,waterFootprint} from './city-life.js';
import {buildPoisonLand,poisonBossMultiplier} from './poison-land.js';
import {buildHighlandForest,buildVolcanicIsland} from './forest-volcano.js';
import {buildGhostIsland} from './ghost-island.js';
import {createWorldAudio} from './world-audio.js';
import {createHosting,ROOM_CITIES} from './hosting.js';
import {buildCapitalServices} from './capital-services.js';
import {buildSpaceCentre} from './space-centre.js';
import * as THREE from 'three';
import { impactDamage, segmentDistance, collisionImpulse } from './vehicle-physics.js';
import { buildPlaces } from './places.js';
import { createReconstruction } from './reconstruction.js';
import { setupMobileControls } from './mobile-controls.js';
import { buildHarbour } from './harbour.js';
import { buildTransport } from './transport.js';
import { buildBridge } from './bridge.js';
import {liftBridgeSurface,launchBridgeJump,advanceBridgeJump,VEHICLE_GRAVITY} from './bridge-jump-physics.js';
import { buildUrban } from './urban.js';
import { buildSewersAndOffices } from './sewers-offices.js';
import {buildRegionalEnvironment} from './regional-environment.js';
import {buildMetro} from './metro.js';
import {loadControlPreferences,movementKey,buildControlSettings} from './control-preferences.js';
const controlPrefs=loadControlPreferences();
let specialUnlocked=localStorage.getItem('specialUnlocked')==='true';
let villainKills = Number(localStorage.getItem('villainKills')) || 0;
let isVillain = villainKills > 0;
let adventureServices=null,bridgeTraffic=null,worldExpansion=null,npcConversations=null;
let navy=null,intercityRail=null,regionalFacilities=null;
let worldMap=null,movieTv=null,worldAdvertising=null,capitalServiceBuildings=null;
let onlineAccount=null;
let alignmentUserId=null;
function saveAlignment(){if(alignmentUserId)try{localStorage.setItem('alignment:'+alignmentUserId,JSON.stringify({heroDungeonKills,villainKills}));}catch{}}
let heroDungeonKills=0,onlinePlayers=null,onlinePlayReady=false;
const playerAlignment=()=>isVillain?'villain':heroDungeonKills>0?'hero':'neutral';
let specialTrainingKills=Math.min(5,Math.max(0,Number(localStorage.getItem('specialTrainingKills'))||0));
let activeDrivingControls={carMovement:controlPrefs.carMovement,drivingMode:controlPrefs.drivingMode};
import { createClient } from '@supabase/supabase-js';
import { buildCityFromGeoJSON } from './assets/map/importOsm.js';

const supabase = createClient(
  'https://teyuiwdcqzjcvzejlsnc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRleXVpd2RjcXpqY3Z6ZWpsc25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1Nzg3MjcsImV4cCI6MjEwNzE1NDcyN30.fkhPyK21YxN_swhUsfZO2QbcnAdBamjNnXdgXEXOd3s'
);

// =====================================================================
// HELPERS
// =====================================================================
function rng(seed) {
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rand = rng(1337);   // seeded, so the city looks the same every time
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = THREE.MathUtils.lerp;
const lerpAngle = (a, b, t) => {
  const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * t;
};
const angleDiff = (a, b) => ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
const distXZ = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const UP = new THREE.Vector3(0, 1, 0);
function randUnit() {
  const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  return v.lengthSq() > 1e-6 ? v.normalize() : v.set(0, 1, 0);
}
const fwdOf = obj => new THREE.Vector3(Math.sin(obj.rotation.y), 0, Math.cos(obj.rotation.y));
const at = (p, h) => new THREE.Vector3(p.x, p.y + h, p.z);

// =====================================================================
// RENDERER / SCENE / LIGHTS
// =====================================================================
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
const touchDevice = matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0;
renderer.setPixelRatio(Math.min(devicePixelRatio, touchDevice ? 1 : 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.prepend(renderer.domElement);

// Graphics quality (resolution/shadows) — set from the Settings panel, saved across sessions.
const GFX_PRESETS = {
  low: { pr: 0.75, shadows: false, shadowSize: 1024 },
  medium: { pr: touchDevice ? 1 : 1.25, shadows: true, shadowSize: 1024 },
  high: { pr: touchDevice ? 1 : 1.5, shadows: true, shadowSize: 2048 },
  ultra: { pr: touchDevice ? 1.5 : 2, shadows: true, shadowSize: 4096 },
};
// Phones default to Low (no shadows, lower pixel ratio) unless the player has
// already picked a quality themselves -- "medium" for everyone was hammering
// weaker phones, since shadow rendering is the single biggest GPU cost there.
let gfxQuality = GFX_PRESETS[localStorage.getItem('gfxQuality')] ? localStorage.getItem('gfxQuality') : (touchDevice ? 'low' : 'medium');
function setGraphicsQuality(level) {
  gfxQuality = GFX_PRESETS[level] ? level : 'medium';
  const p = GFX_PRESETS[gfxQuality];
  renderer.setPixelRatio(Math.min(devicePixelRatio, p.pr));
  renderer.shadowMap.enabled = p.shadows;
  applyShadowMapSize();   // no-op before `sun` exists; the sun's own setup applies the initial size instead
  localStorage.setItem('gfxQuality', gfxQuality);
}
// The shadow render target is only (re)created lazily at its current size —
// changing mapSize after the first render needs the stale one disposed first.
// Split out from setGraphicsQuality() since `sun` doesn't exist yet the first
// time that runs (declared further down this file); the sun's own setup below
// calls this once more right after creating it, using the already-chosen quality.
let manualGraphics=false;
let sunReady = false;   // `sun` is declared further down this module; guards against touching it before then
function applyShadowMapSize() {
  if (!sunReady) return;
  const size = GFX_PRESETS[gfxQuality].shadowSize;
  if (sun.shadow.mapSize.width !== size) {
    sun.shadow.mapSize.set(size, size);
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
  }
}
setGraphicsQuality(gfxQuality);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfe8ff, 90, 280);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);

const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x6b5a3a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);   // placeholder — applyShadowMapSize() below sets the real size for the active quality preset
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 300 });
scene.add(sun, sun.target);
sunReady = true;
applyShadowMapSize();

const fx2d = document.getElementById('fx2d');
const g2 = fx2d.getContext('2d');
function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  fx2d.width = innerWidth; fx2d.height = innerHeight;
}
addEventListener('resize', resize);
resize();

// =====================================================================
// SKY (gradient dome, sun, moon, clouds)
// =====================================================================
const skyUniforms = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUniforms,
  vertexShader: `varying vec3 vPos;
    void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying vec3 vPos;
    void main() {
      float h = clamp(normalize(vPos).y, 0.0, 1.0);
      gl_FragColor = vec4(mix(horizon, top, pow(h, 0.6)), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
sky.renderOrder = -1;
scene.add(sky);

const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff3d1, fog: false }));
const moonDisc = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), new THREE.MeshBasicMaterial({ color: 0xdfe6f5, fog: false }));
scene.add(sunDisc, moonDisc);

const SKY = {
  dayTop: new THREE.Color(0x4a90d9), dayHorizon: new THREE.Color(0xcfe8ff),
  duskTop: new THREE.Color(0x34407a), duskHorizon: new THREE.Color(0xffa36b),
  nightTop: new THREE.Color(0x03050d), nightHorizon: new THREE.Color(0x141b33),
};

const starGeometry=new THREE.BufferGeometry(),starPositions=new Float32Array(1200*3);
for(let i=0;i<1200;i++){const z=Math.random()*2-1,a=Math.random()*Math.PI*2,r=Math.sqrt(1-z*z);starPositions[i*3]=Math.cos(a)*r*420;starPositions[i*3+1]=z*420;starPositions[i*3+2]=Math.sin(a)*r*420;}
starGeometry.setAttribute('position',new THREE.BufferAttribute(starPositions,3));const spaceStars=new THREE.Points(starGeometry,new THREE.PointsMaterial({color:0xffffff,size:1.2,sizeAttenuation:false,fog:false}));spaceStars.visible=false;scene.add(spaceStars);
const clouds = [];
const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, fog: false, flatShading: true });
const cloudGeo = new THREE.IcosahedronGeometry(1, 1);
for (let i = 0; i < 22; i++) {
  const c = new THREE.Group();
  const n = 4 + Math.floor(rand() * 4);
  for (let j = 0; j < n; j++) {
    const puff = new THREE.Mesh(cloudGeo, cloudMat);
    const s = 5 + rand() * 6;
    puff.scale.set(s, s * 0.6, s);
    puff.position.set((j - n / 2) * 6 + rand() * 3, rand() * 3, rand() * 6);
    c.add(puff);
  }
  c.position.set((rand() - 0.5) * 500, 90 + rand() * 30, (rand() - 0.5) * 500);
  scene.add(c);
  clouds.push(c);
}

// =====================================================================
// PROCEDURAL TEXTURES (drawn on canvases, so no image files are needed)
// =====================================================================
const maxAniso = renderer.capabilities.getMaxAnisotropy();
function makeTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function speckle(g, w, h, count, colors, size = 2) {
  for (let i = 0; i < count; i++) {
    g.fillStyle = colors[Math.floor(rand() * colors.length)];
    g.fillRect(rand() * w, rand() * h, size, size);
  }
}

const grassTex = makeTex(256, 256, (g, w, h) => {
  g.fillStyle = '#5d9a43'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 7000, ['#4f8a38', '#6aab4c', '#578f3d', '#74b556', '#66a347']);
});

// One 40m x 40m road tile centred on an intersection; repeated across the city.
const roadTex = makeTex(512, 512, (g) => {
  g.fillStyle = '#8c8c8c'; g.fillRect(0, 0, 512, 512);           // hidden under pavements
  g.fillStyle = '#3a3c40'; g.fillRect(154, 0, 204, 512); g.fillRect(0, 154, 512, 204);   // widened from 128 to 154px (10m -> ~12m)
  speckle(g, 512, 512, 9000, ['rgba(255,255,255,.05)', 'rgba(0,0,0,.18)']);
  g.fillStyle = '#e8e8e8';                                          // edge lines
  for (const x of [160, 352]) { g.fillRect(x, 0, 2, 137); g.fillRect(x, 375, 2, 137); }
  for (const y of [185, 325]) { g.fillRect(0, y, 137, 2); g.fillRect(375, y, 137, 2); }
  g.fillStyle = '#e6c24a';                                          // centre dashes
  for (let y = 4; y < 137; y += 48) { g.fillRect(254, y, 4, 28); g.fillRect(254, y + 371, 4, 28); }
  for (let x = 4; x < 137; x += 48) { g.fillRect(x, 254, 28, 4); g.fillRect(x + 371, 254, 28, 4); }
  g.fillStyle = '#f0f0f0';                                          // zebra crossings
  for (let x = 160; x < 353; x += 13) {
    g.fillRect(x, 141, 7, 32); g.fillRect(x, 339, 7, 32);
    g.fillRect(141, x, 32, 7); g.fillRect(339, x, 32, 7);
  }
});

const paveTex = makeTex(128, 128, (g, w, h) => {
  g.fillStyle = '#bdb8ae'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 1500, ['#b0aba1', '#c9c4ba', '#a9a49a']);
  g.fillStyle = '#9d988f';
  for (let i = 0; i < 128; i += 32) { g.fillRect(i, 0, 2, 128); g.fillRect(0, i, 128, 2); }
});
paveTex.repeat.set(15, 15);

const woodTex = makeTex(256, 256, (g) => {
  const tones = ['#a8784f', '#9c6e47', '#b3835a', '#a27350'];
  for (let i = 0; i < 8; i++) {
    g.fillStyle = tones[i % 4]; g.fillRect(0, i * 32, 256, 32);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, i * 32, 256, 2);
    g.fillRect(((i * 97) % 200) + 20, i * 32, 2, 32);
  }
  speckle(g, 256, 256, 1500, ['rgba(0,0,0,.08)', 'rgba(255,255,255,.06)']);
});
woodTex.repeat.set(3, 3);

const roofTex = makeTex(128, 128, (g) => {
  g.fillStyle = '#a5432f'; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 16) {
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, y + 13, 128, 3);
    for (let x = (y / 16 % 2) * 8; x < 128; x += 16) g.fillRect(x, y, 2, 16);
  }
});
roofTex.repeat.set(0.5, 0.5);

const sandTex = makeTex(256, 256, (g, w, h) => {
  g.fillStyle = '#d9c49a'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 5000, ['#cdb68a', '#e4d1aa', '#c9b185']);
});
sandTex.repeat.set(6, 6);

// Building facades: each texture is 4 window bays x 4 floors = 12m x 12m.
const FACADE_STYLES = [
  { wall: '#d9c7a7', frame: '#a8916d', glass: '#3f5a70', glass2: '#8fb3cc' },
  { wall: '#7a5245', brick: '#9a6a5a', frame: '#e8e0d0', glass: '#344b5e', glass2: '#86a6bf' },
  { wall: '#efeae0', frame: '#c4bba9', glass: '#45627a', glass2: '#a5c4da' },
  { wall: '#7f8e9b', frame: '#5d6a75', glass: '#2f4458', glass2: '#86b0d1', wide: true },
  { wall: '#26323e', frame: '#3a4856', glass: '#3b6a8f', glass2: '#a9d2ef', wide: true },
  { wall: '#e2b48a', frame: '#b8875f', glass: '#3e566b', glass2: '#94b4ca' },
];
function windowRect(b, f, wide) {
  const x = b * 64, y = f * 64;
  return wide ? [x + 4, y + 6, 56, 50] : [x + 16, y + 12, 32, 40];
}
const facades = FACADE_STYLES.map(s => {
  const color = makeTex(256, 256, (g) => {
    g.fillStyle = s.wall; g.fillRect(0, 0, 256, 256);
    if (s.brick) {
      for (let y = 0; y < 256; y += 8) for (let x = (y / 8 % 2) * 8 - 16; x < 256; x += 16) {
        g.fillStyle = rand() < 0.5 ? s.brick : '#8e5f50';
        g.fillRect(x + 1, y + 1, 14, 6);
      }
    } else {
      speckle(g, 256, 256, 1200, ['rgba(0,0,0,.05)', 'rgba(255,255,255,.05)']);
    }
    for (let f = 0; f < 4; f++) {
      g.fillStyle = s.frame; g.fillRect(0, f * 64 + 60, 256, 4);  // floor band
      for (let b = 0; b < 4; b++) {
        const [wx, wy, ww, wh] = windowRect(b, f, s.wide);
        g.fillStyle = s.frame; g.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
        const grd = g.createLinearGradient(wx, wy, wx + ww, wy + wh);
        grd.addColorStop(0, s.glass2); grd.addColorStop(0.5, s.glass); grd.addColorStop(1, s.glass);
        g.fillStyle = grd; g.fillRect(wx, wy, ww, wh);
        g.fillStyle = s.frame; g.fillRect(wx + ww / 2 - 1, wy, 2, wh);
        if (!s.wide) g.fillRect(wx - 4, wy + wh + 3, ww + 8, 3);  // sill
      }
    }
  });
  // Emissive mask: random windows light up at night
  const glow = makeTex(256, 256, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
    for (let f = 0; f < 4; f++) for (let b = 0; b < 4; b++) {
      if (rand() > 0.45) continue;
      const [wx, wy, ww, wh] = windowRect(b, f, s.wide);
      g.fillStyle = rand() < 0.75 ? '#ffd58a' : '#cfe6ff';
      g.fillRect(wx, wy, ww, wh);
    }
  });
  return { color, glow, style: s };
});

// =====================================================================
// WORLD HELPERS
// =====================================================================
const colliders = [];      // axis-aligned boxes on the ground plane
// Declared here (not down by updateTasks(), where it conceptually lives) because
// addBuilding()'s CCTV cameras call addTask() during the very first world-building
// pass, long before the code near updateTasks() would otherwise run.
const tasks = [];
// Same story: addPet()'s horses register a "Ride the horse" interactable during
// the very first world-building pass too, long before this would otherwise exist.
const interactables = [];
// Same story again: the chapel's organ seat pushes into sitSpots during the
// very first world-building pass, before this would otherwise be declared.
const sitSpots = [];
const camBlockers = [];    // meshes the camera should not pass through
const glowMats = [];       // materials whose windows glow at night
const planeBlocks = [];    // building footprints + heights, so flying into a tower crashes your plane
const mountains = [];       // {x,z,r,h} cone-shaped peaks — groundY() ramps elevation up their slope so they're real climbable terrain
const CAVE_BOUNDS = { x0: -414, x1: -386, z0: 758, z1: 808 };   // the Ashford Cave tunnel+chamber footprint, kept flat despite sitting inside a mountain's radius
let supportSkills=null,cityServices=null,supportCounters={dungeons:0,bosses:0};
function persistSupportProgress(){if(alignmentUserId&&supportSkills)try{localStorage.setItem('support:'+alignmentUserId,JSON.stringify({skill:supportSkills.snapshot(),counters:supportCounters,kills:monsterQuestKills}));}catch{}}
let cityLife=null,monsterQuestKills=0;
let poisonLand = null;
let spaceCentre = null, volcanicIsland = null, ghostIsland = null, worldAudio = null;
let harbour = null, townPlaces = null, transport = null, harbourBridge = null, urban = null, sewers = null, regionalEnvironment = null, metro = null;
const buildings = [];      // every city building, so it can be destroyed

function mesh(geo, color, parent = scene) {
  const mat = color instanceof THREE.Material ? color : new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(w, h, d, x, y, z, color, collide = true) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), color);
  m.position.set(x, y, z);
  if (collide) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  return m;
}
// Push a circle (p, radius r) out of every collider. Returns true if it hit something.
function collide(p, r) {
  let hit = false;
  for (const c of colliders) {
    if(p.x<c.minX-r||p.x>c.maxX+r||p.z<c.minZ-r||p.z>c.maxZ+r)continue;
    if(c.circleRadius!=null){const dx=p.x-c.circleX,dz=p.z-c.circleZ,d=Math.hypot(dx,dz),limit=r+c.circleRadius;if(d<limit){hit=true;p.x+=dx/(d||1)*(limit-d);p.z+=dz/(d||1)*(limit-d);if(d<.0001)p.x=c.circleX+limit;}continue;}
    if(c.baseYAt){const base=c.baseYAt(p.x,p.z);if(p.y<base-.8||p.y>base+2)continue;}
    const cx = clamp(p.x, c.minX, c.maxX), cz = clamp(p.z, c.minZ, c.maxZ);
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    hit = true;
    if (d2 > 1e-6) {
      const d = Math.sqrt(d2);
      p.x += dx / d * (r - d); p.z += dz / d * (r - d);
    } else {
      const opts = [[c.minX - r - p.x, 0], [c.maxX + r - p.x, 0], [0, c.minZ - r - p.z], [0, c.maxZ + r - p.z]];
      opts.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
      p.x += opts[0][0]; p.z += opts[0][1];
    }
  }
  if (p.x > -1000 && p.x < 1500) { p.x = clamp(p.x, -900, 1240); p.z = clamp(p.z, -650, 950); }   // dungeons live far away at x = 2000; south bound extended for Riverside/Capital
  return hit;
}
const insideCollider = p => colliders.some(c => c.circleRadius!=null ? Math.hypot(p.x-c.circleX,p.z-c.circleZ)<c.circleRadius : p.x>c.minX&&p.x<c.maxX&&p.z>c.minZ&&p.z<c.maxZ);

// City layout: roads every 40m (10m wide), blocks in between with 15cm-high pavements.
const CURB = 0.15;
const BRIDGE_X = 0, BRIDGE_HALF_W = 7, BRIDGE_Z0 = 160, BRIDGE_Z1 = 654, BRIDGE_Y = CURB + 0.4;
const RIVERSIDE_Z0 = 640, RIVERSIDE_Z1 = 780, RIVERSIDE_X0 = -80, RIVERSIDE_X1 = 80;
const CAPITAL_X0 = 120, CAPITAL_X1 = 440, CAPITAL_Z0 = 680, CAPITAL_Z1 = 920;
// Bascule lift section of the river bridge — raises for ship traffic.
const GAP0 = 400, GAP1 = 416, GAP_JUMP_SPEED = 18;
const liftPlaneBlocks=[];
let bridgeLeafNorth = null, bridgeLeafSouth = null, bridgeLiftAngle = 0, bridgeLiftState = 'down', bridgeLiftT = 20;
const bridgePostLights = [], bridgeWarnStrips = [];
const ISLAND = new THREE.Vector3(-220, 0, 500), ISLAND_R = 24;
const ROUNDABOUT_CENTRES=[[0,0],[-80,-80],[80,80],[-80,80]];
function groundY(x, z, bodyY = null) {
 const poisonFloor=poisonLand?.groundAt(x,z);if(poisonFloor!=null)return poisonFloor;
  const volcanicFloor=volcanicIsland?.groundAt(x,z);if(volcanicFloor!=null)return volcanicFloor;
  const ghostFloor=ghostIsland?.groundAt(x,z);if(ghostFloor!=null)return ghostFloor;
  const spaceFloor=spaceCentre?.groundAt(x,z,bodyY??player.position.y);if(spaceFloor!=null)return spaceFloor;
  if(ROUNDABOUT_CENTRES.some(([cx,cz])=>Math.hypot(x-cx,z-cz)<9.5))return .17;
  const metroFloor=metro?.groundAt(x,z);if(metroFloor!=null)return metroFloor;
  const navyFloor=navy?.groundAt(x,z);if(navyFloor!=null)return navyFloor;
  const residenceFloor=regionalFacilities?.groundAt(x,z);if(residenceFloor!=null)return residenceFloor;
  const railwayFloor=intercityRail?.groundAt(x,z);if(railwayFloor!=null)return railwayFloor;
  const expandedFloor=worldExpansion?.groundAt(x,z);if(expandedFloor!=null)return expandedFloor;
  const sewerFloor=sewers?.groundAt(x,z);if(sewerFloor!=null)return sewerFloor;
  const platformFloor=transport?.groundAt(x,z);if(platformFloor!=null)return platformFloor;
  const urbanFloor=urban?.groundAt(x,z);if(urbanFloor!=null)return urbanFloor;
  if(harbourBridge){const floor=harbourBridge.groundAt(x,z,bodyY ?? (inCar&&driving?driving.group.position.y:player.position.y));if(floor!=null)return floor;}
  const dockFloor = harbour?.groundAt(x,z); if (dockFloor != null) return dockFloor;
  const terminalFloor = townPlaces?.floorAt(x,z); if (terminalFloor != null) return terminalFloor;
  for (const r of stairRamps) {
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r.y0 + (z - r.z0) / (r.z1 - r.z0) * (r.y1 - r.y0);
  }
  if(x>BRIDGE_X-BRIDGE_HALF_W&&x<BRIDGE_X+BRIDGE_HALF_W&&z>BRIDGE_Z0-4&&z<BRIDGE_Z1+4)return liftBridgeSurface(z,bridgeLiftAngle,BRIDGE_Y,GAP0,GAP1).height??-2;
  const regionFloor=regionalEnvironment?.groundAt(x,z);if(regionFloor!=null)return regionFloor;
  if (x >= RIVERSIDE_X0 && x <= RIVERSIDE_X1 && z >= RIVERSIDE_Z0 && z <= RIVERSIDE_Z1) {   // Riverside, across the bridge
    const lx2 = ((x % 40) + 40) % 40, lz2 = ((z % 40) + 40) % 40;
    return lx2 > 6 && lx2 < 34 && lz2 > 6 && lz2 < 34 ? CURB : 0;
  }
  if (x >= CAPITAL_X0 && x <= CAPITAL_X1 && z >= CAPITAL_Z0 && z <= CAPITAL_Z1) {   // Ashford Capital, across the other bridge
    const lx3 = ((x % 40) + 40) % 40, lz3 = ((z % 40) + 40) % 40;
    return lx3 > 6 && lx3 < 34 && lz3 > 6 && lz3 < 34 ? CURB : 0;
  }
  if (Math.hypot(x - ISLAND.x, z - ISLAND.z) < ISLAND_R) return CURB;   // Driftwood Island, out in the sea
  if (x >= -300 && x <= 300 && z > 187 && z < 900 && !(x > 18 && x < 22 && z < 206)) return -2;
  if (x > 1000) return 0;                                    // dungeon arena floor
  if (x > 18 && x < 22 && z > 164 && z < 206) return CURB;   // harbour pier
  if (x >= CAVE_BOUNDS.x0 && x <= CAVE_BOUNDS.x1 && z >= CAVE_BOUNDS.z0 && z <= CAVE_BOUNDS.z1) return 0;   // hollowed out of the massif below, stays flat
  if (mountains.length) {
    let peakY = -1;
    for (const m of mountains) { const d = Math.hypot(x - m.x, z - m.z); if (d < m.r) peakY = Math.max(peakY, m.h * (1 - d / m.r)); }
    if (peakY >= 0) return peakY;
  }
  if (Math.abs(x) > 160 || Math.abs(z) > 160) return 0;
  const lx = ((x % 40) + 40) % 40, lz = ((z % 40) + 40) % 40;
  return lx > 8 && lx < 32 && lz > 8 && lz < 32 ? CURB : 0;   // roads widened from 10m to ~12m
}

// =====================================================================
// GROUND, ROADS, PAVEMENTS
// =====================================================================
// Was 1800x1300 (z: -650..650) — the mountains/forest (z up to ~950) and Ashford
// Capital (z up to 920) both sit past that far edge, so the ground mesh just
// stopped short of them and you'd see empty void under part of the terrain.
const groundTex = grassTex.clone(); groundTex.repeat.set(150, 215); groundTex.needsUpdate = true;
const ground = mesh(new THREE.PlaneGeometry(1800, 2100), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.castShadow = false;

roadTex.repeat.set(330 / 40, 330 / 40);
roadTex.offset.set(0.375, 0.375);   // puts an intersection exactly at the origin
const roads = mesh(new THREE.PlaneGeometry(330, 330), new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95 }));
roads.rotation.x = -Math.PI / 2;
roads.position.y = 0.02;
roads.castShadow = false;

const curbMat = new THREE.MeshStandardMaterial({ color: 0x9a968d, roughness: 0.9 });
const paveMat = new THREE.MeshStandardMaterial({ map: paveTex, roughness: 0.95 });
const lawnTex = grassTex.clone(); lawnTex.repeat.set(7, 7); lawnTex.needsUpdate = true;
const lawnMat = new THREE.MeshStandardMaterial({ map: lawnTex, roughness: 1 });
const sandMat = new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 });
function pavement(x, z, innerMat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(24, CURB, 24), [curbMat, curbMat, paveMat, curbMat, curbMat, curbMat]);
  m.position.set(x, CURB / 2, z);
  m.receiveShadow = true;
  scene.add(m);
  if (innerMat) {
    const l = mesh(new THREE.PlaneGeometry(20, 20), innerMat);
    l.rotation.x = -Math.PI / 2;
    l.position.set(x, CURB + 0.01, z);
    l.castShadow = false;
  }
}

// =====================================================================
// TREES
// =====================================================================
const leafGeo = new THREE.IcosahedronGeometry(1, 0);
const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 2.2, 7);
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
const leafMats = [0x3f8f3a, 0x4f9d3f, 0x2f7a35, 0x5aa845].map(c => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.9 }));
function addTree(x, z, s = 1, trafficIsland=false) {
  if(!trafficIsland){const safe=roadsidePosition(x,z,9.7);x=safe.x;z=safe.z;}
  const y0 = groundY(x, z);
  const trunk = mesh(trunkGeo, trunkMat);
  trunk.scale.setScalar(s);
  trunk.position.set(x, y0 + 1.1 * s, z);
  const mat = leafMats[Math.floor(rand() * leafMats.length)];
  for (let i = 0; i < 3; i++) {
    const leaf = mesh(leafGeo, mat);
    leaf.scale.setScalar(s * (1.0 + rand() * 0.5));
    leaf.position.set(x + (rand() - 0.5) * 1.3 * s, y0 + (2.6 + rand() * 1.0) * s, z + (rand() - 0.5) * 1.3 * s);
    leaf.rotation.set(rand() * 3, rand() * 3, 0);
  }
  colliders.push({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.3, maxZ: z + 0.3 });
}

// =====================================================================
// BUILDINGS
// =====================================================================
const roofMat = new THREE.MeshStandardMaterial({ color: 0x6d6d6d, roughness: 0.95 });
const woodMatPlain = new THREE.MeshStandardMaterial({ color: 0x9c6e47, roughness: 0.9 });
const AWNING_COLORS = [0xc0392b, 0x2e86de, 0x27ae60, 0xf39c12, 0x8e44ad];

function facadeMats(f, w, h, d) {
  const offX = Math.floor(rand() * 4) / 4, offY = Math.floor(rand() * 4) / 4;
  const make = (len) => {
    const map = f.color.clone(), emap = f.glow.clone();
    for (const t of [map, emap]) { t.repeat.set(len / 12, h / 12); t.offset.set(offX, offY); t.needsUpdate = true; }
    const m = new THREE.MeshStandardMaterial({ map, emissiveMap: emap, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.8 });
    glowMats.push(m);
    return m;
  };
  const side = make(d), front = make(w);
  return [side, side, roofMat, roofMat, front, front];   // +x, -x, top, bottom, +z, -z
}

function addTower(x, baseY, z, w, h, d, f, collide) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facadeMats(f, w, h, d));
  m.position.set(x, baseY + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
  camBlockers.push(m);
  if (collide) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  planeBlocks.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: baseY + h + 0.4 });
  box(w + 0.4, 0.4, d + 0.4, x, baseY + h + 0.2, z, f.style.frame, false);   // cornice
  return baseY + h + 0.4;
}

// Declared here (rather than down by the Edinburgh/civic code, where it originally
// lived) so addBuilding() below can register every generic building into it too —
// every building in the game now has a real, enterable door, not just civic ones.
const civicBuildings = [];
const stairRamps = []; // exterior fire-escape stairs you can actually walk/climb — see groundY()
let buildingAddressN = 100;
function addBuilding(x, z, faceX, faceZ) {
  const centreBoost = Math.max(0, 1 - Math.hypot(x, z) / 130);
  const floors = 2 + Math.floor(rand() * rand() * 10 + centreBoost * rand() * 10);
  const tall = floors >= 8;
  const f = facades[tall ? [2, 3, 4][Math.floor(rand() * 3)] : Math.floor(rand() * facades.length)];
  const regional=z>=640&&z<=950;
  const w=8,d=8;
  const firstChild = scene.children.length, firstCollider = colliders.length, firstBlock = planeBlocks.length;
  let top = addTower(x, CURB, z, w, floors * 3, d, f, true);

  if (tall && rand() < 0.5) {
    top = addTower(x, top, z, w - 3, (2 + Math.floor(rand() * 4)) * 3, d - 3, f, false);
  } else {
    if (rand() < 0.6) box(1.6, 1, 1.2, x + (rand() - 0.5) * (w - 3), top + 0.5, z + (rand() - 0.5) * (d - 3), 0x9aa0a6, false);
    if (rand() < 0.4) {
      const tank = mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.8, 12), 0x7b6a58);
      tank.position.set(x + (rand() - 0.5) * (w - 3), top + 0.9, z + (rand() - 0.5) * (d - 3));
    }
  }
  if (floors <= 6 && rand() < 0.6) {
    const aw = box(w * 0.7, 0.12, 1.4, x, CURB + 3.2, z + faceZ * (d / 2 + 0.7), AWNING_COLORS[Math.floor(rand() * AWNING_COLORS.length)], false);
    aw.rotation.x = faceZ * 0.18;
  }
  // A real door on the street-facing side — enterable with E, using the same shared
  // interior pocket every civic building already uses (not a unique hand-built
  // interior per building, but a genuinely enterable one rather than a flat wall).
  const doorZ = z + faceZ * (d / 2 - 0.03);
  box(1.5, 2.3, 0.1, x, CURB + 1.15, doorZ, 0x241f1a, false);
  box(1.7, 0.15, 0.2, x, CURB + 2.35, doorZ, 0x3a332b, false);   // lintel
  if (rand() < 0.5) addCCTV(x + (w / 2 - 0.6) * (faceX || 1), CURB + 3.6, doorZ + faceZ * 0.1, faceZ);
  const kind = pick(['apartment', 'shop', 'office']);
  const name = (kind === 'apartment' ? buildingAddressN + ' Ashford Apartments' : kind === 'shop' ? buildingAddressN + ' High Street Shop' : buildingAddressN + ' Ashford Offices');
  buildingAddressN += rand() < 0.5 ? 2 : 4;
  civicBuildings.push({ type: kind, name, x, z, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  // Exterior fire-escape staircase up one side, tall buildings only — a real
  // sloped ramp registered in stairRamps (see groundY) so it's actually climbable,
  // not just decoration.
  if (tall) {
    const side = faceX || pick([-1, 1]);
    const sx = x + side * (w / 2 + 0.5);
    const rz0 = z - d / 2, rz1 = z + d / 2, ry0 = CURB, ry1 = floors * 3;
    for (let s = 0; s <= 20; s++) {
      const t = s / 20, zz = rz0 + t * (rz1 - rz0), yy = ry0 + t * (ry1 - ry0);
      box(1.0, 0.12, (rz1 - rz0) / 20 + 0.15, sx, yy, zz, 0x5c6166, false);
    }
    box(0.08, ry1 - ry0, 0.08, sx - side * 0.5, (ry0 + ry1) / 2, (rz0 + rz1) / 2, 0x4a4f54, false);   // rail post
    stairRamps.push({ x0: sx - 0.6, x1: sx + 0.6, z0: Math.min(rz0, rz1), z1: Math.max(rz0, rz1), y0: ry0, y1: ry1 });
  }
  buildings.push({ x, z, w, d, top, alive: true, meshes: scene.children.slice(firstChild),
                   collider: colliders[firstCollider], blocks: planeBlocks.slice(firstBlock) });
}
// A small security camera mounted near a building's entrance, slowly panning.
const cctvMat = new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.5 });
const cctvLensMat = new THREE.MeshStandardMaterial({ color: 0x0a0d10, emissive: 0xff2222, emissiveIntensity: 0 });
function addCCTV(x, y, z, faceZ) {
  const g = new THREE.Group();
  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.3), cctvMat); mount.rotation.x = Math.PI / 2; g.add(mount);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.4), cctvMat); body.position.set(0, -0.02, 0.28); g.add(body);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10), cctvLensMat);
  lens.rotation.x = Math.PI / 2; lens.position.set(0, -0.02, 0.5); g.add(lens);
  g.position.set(x, y, z);
  g.rotation.y = faceZ < 0 ? 0 : Math.PI;
  const baseY = g.rotation.y, phase = rand() * 10;
  scene.add(g);
  addTask({ dur: 1e9, update: (dt, t) => { g.rotation.y = baseY + Math.sin(t * 0.4 + phase) * 0.5; } });
}

// A destroyed building sinks into the ground in a cloud of dust, hurts everything nearby,
// and leaves rubble before construction officers secure and rebuild the site.
function collapseBuilding(b,criminal=true) {
  if (!b.alive) return;
  const rebuild = reconstruction.begin(b, reconstructionDays);
  b.alive = false;
  const colliderIndex = colliders.indexOf(b.collider);
  if (colliderIndex >= 0) colliders.splice(colliderIndex, 1);
  for(const c of b.extraColliders||[]){const i=colliders.indexOf(c);if(i>=0)colliders.splice(i,1);}
  for (const pb of b.blocks) { const i = planeBlocks.indexOf(pb); if (i >= 0) planeBlocks.splice(i, 1); }
  for (const m of b.meshes) { const i = camBlockers.indexOf(m); if (i >= 0) camBlockers.splice(i, 1); }
  const base = new THREE.Vector3(b.x, CURB, b.z), size = Math.max(b.w, b.d), H = b.top;
  impactFrame(1.5);
  callout('BUILDING DESTROYED', 0xff7a2f, true);
  if(criminal)raiseWanted(90);
  hitAround(base, size * 0.9, null, { dmg: 80, kb: 14, up: 8, stun: 2, heavy: true, impact: 1, guardBreak: true,police:!criminal,fromPlayer:criminal }, 60);
  if (!inCar && distXZ(player.position, base) < size) hurtPlayer(30, base, 15);
  reactBystanders(base, false); // raiseWanted(90) above already covers the crime
  const start = b.meshes.map(m => m.position.clone());
  const fallAccel = 2 * (H + 3) / 16;   // reaches the ground in about 4 seconds
  addTask({ dur: 5, update(dt, t) {
    const drop = Math.min(0.5 * fallAccel * t * t, H + 3);
    b.meshes.forEach((m, i) => {
      m.position.set(start[i].x + (Math.random() - 0.5) * 0.25, start[i].y - drop, start[i].z + (Math.random() - 0.5) * 0.25);
    });
    for (let i = 0; i < 4; i++) {   // dust rolling out from the base
      const edge = new THREE.Vector3(b.x + (Math.random() - 0.5) * b.w, CURB + 0.5, b.z + (Math.random() - 0.5) * b.d);
      const out = new THREE.Vector3(edge.x - b.x, 0.6, edge.z - b.z).normalize().multiplyScalar(4 + Math.random() * 6);
      spawnParticle(edge, out, pick([0x9e9a92, 0x8a857c, 0xb5b0a6]), 0.6 + Math.random() * 0.6, 1.6, -0.5);
    }
    if (Math.random() < 0.7) spawnParticle(new THREE.Vector3(b.x + (Math.random() - 0.5) * b.w, CURB + H - drop, b.z + (Math.random() - 0.5) * b.d),
      randUnit().multiplyScalar(3), pick([0x6d6d6d, 0x8a7d66, 0x444444]), 0.4, 1.2, 15);
    if (distXZ(camera.position, base) < 90) shake = Math.max(shake, 0.3 * (1 - t / 5));
  }, end() {
    b.meshes.forEach(m => { m.visible = false; });
    rebuild.debris.push(scorchMark(base, size * 0.75));
    for (let i = 0; i < 10; i++) {   // charred rubble pile — stays like this forever
      const s = 1.2 + Math.random() * 2.2;
      const r = box(s, s * 0.6, s, b.x + (Math.random() - 0.5) * b.w * 0.8, CURB + s * 0.25, b.z + (Math.random() - 0.5) * b.d * 0.8, pick([0x242321, 0x2e2a26, 0x1c1a18]), false);
      r.rotation.set(Math.random(), Math.random() * 3, Math.random());
      rebuild.debris.push(r);
    }
    burnFor(new THREE.Vector3(b.x, CURB + 1, b.z), 60, Math.max(b.w, b.d) * 0.6);
    reconstruction.secure(b);
  } });
}

const streetSeats = [];
function addBench(x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, CURB, z);
  g.rotation.y = rotY;
  scene.add(g);
  mesh(new THREE.BoxGeometry(1.8, 0.08, 0.5), woodMatPlain, g).position.y = 0.45;
  mesh(new THREE.BoxGeometry(1.8, 0.4, 0.06), woodMatPlain, g).position.set(0, 0.75, -0.22);
  for (const sx of [-0.8, 0.8]) mesh(new THREE.BoxGeometry(0.06, 0.45, 0.45), 0x333333, g).position.set(sx, 0.22, 0);
  g.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(g);
  const collider = { minX: bounds.min.x, maxX: bounds.max.x, minZ: bounds.min.z, maxZ: bounds.max.z };
  colliders.push(collider);
  streetSeats.push({ x, z, yaw: rotY, seatY: CURB + .49, label: 'Sit on street bench', model: g, collider, health: 60, broken: false, impactTimes: new WeakMap() });
}

// Fill the city. Cell (0,0) is home, (-1,0) is the park, (1,0) is the training ground,
// (0,-1) and (-1,-1) are houses you can walk into.
const residentialCells = [];
for (let cx = -4; cx < 4; cx++) for (let cz = -4; cz < 4; cz++) {
  if(cz===-3&&[1,2,3].includes(cx)||cx===-4&&cz===2)continue;
  const x0 = cx * 40 + 20, z0 = cz * 40 + 20;
  const isHome = cx === 0 && cz === 0, isPark = cx === -1 && cz === 0, isTraining = cx === 1 && cz === 0;
  const isResidential = cz === -1 && (cx === 0 || cx === -1);
  const isPoliceCell = (cx === 2 && cz === 0) || (cx === -4 && cz === 1) || (cx === 2 && cz === -4);   // downtown police posts — see buildDowntownPolice()
  const isSchoolCell = cx === -2 && cz === 1;   // see buildSchool()
  pavement(x0, z0, isHome || isPark || isResidential ? lawnMat : isTraining ? sandMat : null);
  if (isResidential) residentialCells.push([x0, z0]);
  if (isHome || isPark || isTraining || isResidential || isPoliceCell || isSchoolCell) continue;
  for (const [ox, oz] of [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]]) {
    if (rand() < 0.12) {   // small plaza instead of a building
      addTree(x0 + ox, z0 + oz, 1.1);
      addBench(x0 + ox + Math.sign(ox) * 3, z0 + oz, Math.sign(ox) > 0 ? -Math.PI / 2 : Math.PI / 2);
      continue;
    }
    addBuilding(x0 + ox, z0 + oz, Math.sign(ox), Math.sign(oz));
  }
}

// =====================================================================
// STREET LAMPS (instanced so hundreds cost almost nothing)
// =====================================================================
const lampSpots = [];
const LAMP_OFFSETS = [[-10.2,0],[10.2,0],[0,-10.2],[0,10.2]];
for (let cx = -4; cx < 4; cx++) for (let cz = -4; cz < 4; cz++)
  for (const [ox, oz] of LAMP_OFFSETS) lampSpots.push(new THREE.Vector3(cx * 40 + 20 + ox, 0, cz * 40 + 20 + oz));
// Riverside and the Capital are outside the main town grid and had no lamps at
// all — must be added here, before the InstancedMesh below is sized/built from
// lampSpots.length, or they'd have no mesh instance to actually render.
for (let cx = -2; cx <= 1; cx++) for (let cz = 16; cz <= 18; cz++)
  for (const [ox, oz] of LAMP_OFFSETS) lampSpots.push(new THREE.Vector3(cx * 40 + 20 + ox, 0, cz * 40 + 20 + oz));
for (let cx = 3; cx <= 10; cx++) for (let cz = 17; cz <= 22; cz++)
  for (const [ox, oz] of LAMP_OFFSETS) lampSpots.push(new THREE.Vector3(cx * 40 + 20 + ox, 0, cz * 40 + 20 + oz));

// =====================================================================
// TRAFFIC LIGHTS: one set per intersection, cycling red/amber/green. Visual
// only for now — traffic AI doesn't read them yet, so they don't change
// vehicle behavior.
// =====================================================================
const trafficLights = [];
const TL_MAT = { red: new THREE.MeshStandardMaterial({ color: 0x2a0a0a, emissive: 0xff2020, emissiveIntensity: 0 }),
  amber: new THREE.MeshStandardMaterial({ color: 0x2a1c0a, emissive: 0xffaa20, emissiveIntensity: 0 }),
  green: new THREE.MeshStandardMaterial({ color: 0x0a2a10, emissive: 0x20ff50, emissiveIntensity: 0 }) };
function addTrafficLight(x, z, faceY,baseY=0,phase=null) {
 const cx=Math.round(x/40)*40,cz=Math.round(z/40)*40,sx=x<cx?-1:1,sz=z<cz?-1:1;if(Math.abs(Math.sin(faceY))>.7){x=cx+sx*13;z=cz+sz*9.6;}else{x=cx+sx*9.6;z=cz+sz*13;}
  box(0.14, 5, 0.14, x, baseY+2.5, z, 0x2b2f33, false);   // taller mast — more visible from a distance/while driving
  const head = new THREE.Group(); head.position.set(x, baseY+5, z); head.rotation.y = faceY; scene.add(head);
  mesh(new THREE.BoxGeometry(0.55, 1.3, 0.4), 0x1a1c1e, head);
  const lamps = {};
  let i = 0;
  for (const key of ['red', 'amber', 'green']) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.17, 14), TL_MAT[key].clone());
    m.position.set(0, 0.4 - i * 0.4, 0.21); head.add(m); lamps[key] = m.material; i++;
  }
  const signal={phase:phase??rand()*6,lamps,x,z,axis:Math.abs(Math.sin(faceY))>.7?'x':'z'};trafficLights.push(signal);return signal;
}
// A handful of roundabouts instead of light-controlled intersections.
const ROUNDABOUT_CELLS = new Set(['0,0', '-2,-2', '2,2', '-2,2']);
for (let cx = -3; cx < 4; cx++) for (let cz = -3; cz < 4; cz++) {
  if (ROUNDABOUT_CELLS.has(cx + ',' + cz)) continue;   // roundabouts replace lights at a few intersections
  addTrafficLight(cx * 40 - 9.5, cz * 40 - 9.5, Math.PI * 0.75);
}
for (const key of ROUNDABOUT_CELLS) {
  const [cx, cz] = key.split(',').map(Number);
  const x = cx * 40, z = cz * 40;
  const island = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.3, 24), curbMat);
  island.position.set(x, 0.15, z); scene.add(island);
  const grass = new THREE.Mesh(new THREE.CircleGeometry(3, 24), lawnMat);
  grass.rotation.x = -Math.PI / 2; grass.position.set(x, 0.32, z); scene.add(grass);
  addTree(x, z, 1.3,true);
  colliders.push({ minX:x-3.5,maxX:x+3.5,minZ:z-3.5,maxZ:z+3.5,circleX:x,circleZ:z,circleRadius:3.5 });
  const apron=mesh(new THREE.CircleGeometry(9.5,48),0x3a3c40);apron.rotation.x=-Math.PI/2;apron.position.set(x,.17,z);apron.castShadow=false;
}
function updateTrafficLights(dt) {
  for (const t of trafficLights) {
    t.phase = (t.phase + dt) % 6;   // 3s green, 1s amber, 2s red (offset per light so they're not synced)
    const state = t.phase < 3 ? 'green' : t.phase < 4 ? 'amber' : 'red';
    for (const key in t.lamps) t.lamps[key].emissiveIntensity = key === state ? (key === 'amber' ? 3 : 2) : 0;
  }
}

const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.6 });
const lanternMat = new THREE.MeshStandardMaterial({ color: 0xfff1c9, emissive: 0xffc66b, emissiveIntensity: 0 });
// Sized with headroom: the bridge and regionalEnvironment both push more lamp
// spots onto lampSpots *after* this point (addLampSpot() below handles those),
// but an InstancedMesh's capacity is fixed at construction — undersizing it
// here meant those later lamps had no pole/lantern/cap instance at all, so
// they never rendered and breakLamp() silently no-op'd past the real count.
for(const p of lampSpots)if(p.z>=640&&p.z<=950)p.y=p.x>=120?.4:.2;
const LAMP_CAPACITY = lampSpots.length + 600;
const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.09, 4, 6), poleMat, LAMP_CAPACITY);
const lanterns = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 0.45, 0.32), lanternMat, LAMP_CAPACITY);
const caps = new THREE.InstancedMesh(new THREE.ConeGeometry(0.32, 0.25, 4), poleMat, LAMP_CAPACITY);
const dummyObj = new THREE.Object3D();
function placeLampInstance(i, p) {
  const baseY=p.y||CURB;
  dummyObj.rotation.set(0, 0, 0);
  dummyObj.position.set(p.x, baseY + 2, p.z); dummyObj.updateMatrix(); poles.setMatrixAt(i, dummyObj.matrix);
  dummyObj.position.y = baseY + 4.2; dummyObj.updateMatrix(); lanterns.setMatrixAt(i, dummyObj.matrix);
  dummyObj.position.y = baseY + 4.55; dummyObj.rotation.y = Math.PI / 4; dummyObj.updateMatrix(); caps.setMatrixAt(i, dummyObj.matrix);
  poles.instanceMatrix.needsUpdate = lanterns.instanceMatrix.needsUpdate = caps.instanceMatrix.needsUpdate = true;
}
// Unused instance slots default to an identity matrix (visible at the world
// origin), not hidden — hide the whole reserved range before placing the
// lamps that actually exist yet.
dummyObj.position.set(0, -500, 0); dummyObj.scale.setScalar(0.0001); dummyObj.updateMatrix();
for (let i = 0; i < LAMP_CAPACITY; i++) { poles.setMatrixAt(i, dummyObj.matrix); lanterns.setMatrixAt(i, dummyObj.matrix); caps.setMatrixAt(i, dummyObj.matrix); }
dummyObj.scale.setScalar(1);
lampSpots.forEach(placeLampInstance);
// Any lamp spot registered after this point (bridge, regionalEnvironment) must
// go through here instead of pushing lampSpots directly, so it actually gets
// a pole/lantern/cap instance and can be broken like any other streetlight.
function addLampSpot(x, y, z) {
  const onBridge=Math.abs(x-BRIDGE_X)<BRIDGE_HALF_W&&z>=BRIDGE_Z0&&z<=BRIDGE_Z1&&Math.abs(y-BRIDGE_Y)<.1;
  if(!onBridge){const safe=roadsidePosition(x,z);x=safe.x;z=safe.z;}
  const p = new THREE.Vector3(x,onBridge?y:z>=640&&z<=950?(x>=120?.4:.2):(y||CURB),z);
  const existing=lampSpots.find(q=>q.distanceTo(p)<.5);if(existing)return existing;
  const i = lampSpots.length;
  lampSpots.push(p);
  if (i < LAMP_CAPACITY) placeLampInstance(i, p);
  return p;
}
poles.castShadow = caps.castShadow = true;
scene.add(poles, lanterns, caps);

// Lamps can actually be broken (melee/powers) — see breakLampsNear(), called from
// hitAround(). A broken lamp topples and stops contributing light at night.
const lampBroken = new Array(lampSpots.length).fill(false);
function breakLamp(i) {
  if (lampBroken[i]) return;
  lampBroken[i] = true;
  const p = lampSpots[i];
  dummyObj.rotation.set(0, 0, Math.PI / 2.3);
  dummyObj.position.set(p.x, (p.y||CURB) + 0.3, p.z);
  dummyObj.updateMatrix(); poles.setMatrixAt(i, dummyObj.matrix); poles.instanceMatrix.needsUpdate = true;
  dummyObj.rotation.set(0, 0, 0); dummyObj.scale.setScalar(0); dummyObj.position.set(p.x, -5, p.z);
  dummyObj.updateMatrix();
  lanterns.setMatrixAt(i, dummyObj.matrix); lanterns.instanceMatrix.needsUpdate = true;
  caps.setMatrixAt(i, dummyObj.matrix); caps.instanceMatrix.needsUpdate = true;
  dummyObj.scale.setScalar(1);
  burst(at(p, 4), 14, [0xfff1c9, 0xffc66b, 0x444444], 8, 0.15, 0.4, 6);
  shake = Math.max(shake, 0.15);
}
function breakLampsNear(center, r) {
  for (let i = 0; i < lampSpots.length; i++) {
    if (!lampBroken[i] && distXZ(lampSpots[i], center) < r + 0.6) breakLamp(i);
  }
}

// A small pool of real lights that follows the player to the nearest lamps at night.
const lampLights = [];
for (let i = 0; i < 6; i++) {
  const l = new THREE.PointLight(0xffc77a, 0, 18, 2);
  scene.add(l);
  lampLights.push(l);
}

// =====================================================================
// PARK
// =====================================================================
const PARK = new THREE.Vector3(-20, 0, 20);
const pathMat = new THREE.MeshStandardMaterial({ color: 0xd9c49a, roughness: 1 });
for (const rot of [0, Math.PI / 2]) {
  const path = mesh(new THREE.PlaneGeometry(2.5, 26), pathMat);
  path.rotation.set(-Math.PI / 2, 0, rot);
  path.position.set(PARK.x, CURB + 0.02, PARK.z);
  path.castShadow = false;
}
const pond = mesh(new THREE.CircleGeometry(4, 32), new THREE.MeshStandardMaterial({ color: 0x3d8fc4, roughness: 0.15, metalness: 0.2 }));
pond.rotation.x = -Math.PI / 2;
pond.position.set(PARK.x + 6.5, CURB + 0.03, PARK.z + 6.5);
pond.castShadow = false;
for (const [ox, oz] of [[-9, -9], [-5, -11], [-11, -4], [9, -9], [11, -4], [-9, 9], [-4, 11], [10, -3.5]]) addTree(PARK.x + ox, PARK.z + oz, 1 + rand() * 0.4);
addBench(PARK.x + 2.5, PARK.z - 4, -Math.PI / 2);
addBench(PARK.x - 2.5, PARK.z + 4, Math.PI / 2);

// =====================================================================
// PARK LIFE: flower beds, a duck pond, wandering pets and butterflies, and
// real drowning if you wade into deep water without the Water class.
// =====================================================================
const waterZones = [{ x: PARK.x + 6.5, z: PARK.z + 6.5, r: 4 }]; // ponds — walking in without Water risks drowning
const flowerColors = [0xff6b81, 0xffd166, 0xff9f43, 0xeaff8f, 0xa29bfe];
function addFlowerPatch(x, z, n = 6) {
  for (let i = 0; i < n; i++) {
    const fx = x + (rand() - 0.5) * 2.2, fz = z + (rand() - 0.5) * 2.2, fy = groundY(fx, fz);
    box(0.05, 0.3, 0.05, fx, fy + 0.15, fz, 0x3f8f3a, false);
    mesh(new THREE.ConeGeometry(0.12, 0.18, 6), pick(flowerColors)).position.set(fx, fy + 0.34, fz);
  }
}
for (const [ox, oz] of [[-7, -2], [7, 2], [-2, 8], [3, -8], [-10, 1]]) addFlowerPatch(PARK.x + ox, PARK.z + oz);

const ducks = [];
function addDuck(cx, cz, r) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: pick([0x8d6e3a, 0x5a4a2f, 0xffffff]), roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), bodyMat); body.scale.set(1.3, 0.9, 1); g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), bodyMat); head.position.set(0.22, 0.18, 0); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 6), new THREE.MeshStandardMaterial({ color: 0xff9f1a }));
  beak.rotation.z = Math.PI / 2; beak.position.set(0.32, 0.16, 0); g.add(beak);
  g.position.set(cx, CURB + 0.07, cz);
  scene.add(g);
  ducks.push({ g, cx, cz, r: r * 0.55, phase: rand() * Math.PI * 2, speed: 0.4 + rand() * 0.3 });
}
for (const z of waterZones) for (let i = 0; i < 3; i++) addDuck(z.x, z.z, z.r);
function updateDucks(dt) {
  for (const d of ducks) {
    d.phase += d.speed * dt;
    const x = d.cx + Math.cos(d.phase) * d.r, z = d.cz + Math.sin(d.phase) * d.r;
    d.g.position.set(x, CURB + 0.07 + Math.sin(performance.now() / 300 + d.phase) * 0.02, z);
    d.g.rotation.y = -d.phase - Math.PI / 2;
  }
}

const parkPets = [];
function addPet(kind, x, z) {
  const g = new THREE.Group();
  const horse = kind === 'horse', s = horse ? 2.6 : 1;
  const mat = new THREE.MeshStandardMaterial({ color: horse ? pick([0x6b4a2f, 0x2b2017, 0xe8e0d0, 0x4a3524]) : kind === 'dog' ? pick([0xc68a4a, 0x6b4a2f, 0xe8e0d0]) : pick([0x333333, 0xe8e0d0, 0xc68a4a]), roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.14 * s, (kind === 'dog' ? 0.42 : kind === 'cat' ? 0.3 : 0.62) * s, 4, 8), mat);
  body.rotation.z = Math.PI / 2; body.position.y = 0.22 * s; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 8, 6), mat);
  head.position.set((kind === 'dog' ? 0.32 : kind === 'cat' ? 0.24 : 0.5) * s, (horse ? 0.4 : 0.26) * s, 0); g.add(head);
  if (horse) {   // mane and tail
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x2b2017, roughness: 0.95 });
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.28 * s, 0.1 * s, 0.05 * s), maneMat); mane.position.set(0.12 * s, 0.4 * s, 0); g.add(mane);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * s, 0.05 * s, 0.35 * s, 6), maneMat); tail.rotation.z = Math.PI / 2.6; tail.position.set(-0.32 * s, 0.22 * s, 0); g.add(tail);
  }
  for (const side of [-1, 1]) for (const f of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * s, 0.035 * s, (horse ? 0.4 : 0.22) * s, 6), mat);
    leg.position.set(f * (kind === 'dog' ? 0.16 : kind === 'cat' ? 0.11 : 0.22) * s, (horse ? 0.2 : 0.1) * s, side * 0.09 * s); g.add(leg);
  }
  const home = new THREE.Vector3(x, CURB, z);
  g.position.copy(home);
  scene.add(g);
  const pet = { kind, g, home, target: home.clone(), speed: (horse ? 1.6 : 0.8) + rand() * 0.5, waitT: rand() * 3, ridden: false, hp: horse ? 60 : 20, alive: true, radius: horse ? 1.2 : 0.4 };
  parkPets.push(pet);
  if (horse) {
    pet.mountInteract = { pos: home.clone(), r: 2, label: 'Ride the horse', action: () => mountHorse(pet) };
    interactables.push(pet.mountInteract);
  }
  return pet;
}
addPet('dog', 25, -26);
addPet('dog', -28, -26);
addPet('dog', 28, 14);
addPet('cat', PARK.x - 8, PARK.z + 3);
addPet('horse', PARK.x + 16, PARK.z - 14);
addPet('horse', PARK.x - 14, PARK.z - 10);

// =====================================================================
// HORSE RIDING ARENA: a fenced oval competition ground next to the park, with
// jump obstacles and its own horses. Riding controls (mounting a horse and
// actually steering it) aren't built yet — this is the real, enterable venue,
// not the mount mechanic itself.
// =====================================================================
const ARENA = new THREE.Vector3(PARK.x - 60, CURB, PARK.z + 10);
{
  const rx = 26, rz = 16;
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    box(0.12, 1.1, 0.12, ARENA.x + Math.cos(a) * rx, 0.55, ARENA.z + Math.sin(a) * rz, 0x6b4a2f, false);
  }
  box(rx * 2 + 1, 0.06, rz * 2 + 1, ARENA.x, 0.03, ARENA.z, sandMat, false);
  for (const [ox, oz] of [[-10, 0], [10, 0], [0, -6], [0, 6]]) {
    box(2.6, 0.9, 0.18, ARENA.x + ox, 0.75, ARENA.z + oz, 0xc0392b, false);
    for (const s of [-1, 1]) box(0.14, 1.1, 0.14, ARENA.x + ox + s * 1.3, 0.55, ARENA.z + oz, 0x6b4a2f, false);
  }
  signboard('HORSE RIDING ARENA', ARENA.x, 3, ARENA.z - rz - 1.5, 12, '#4a3b1d');
  addBench(ARENA.x - 5, ARENA.z - rz - 3, 0);
  addBench(ARENA.x + 5, ARENA.z - rz - 3, 0);
  addPet('horse', ARENA.x - 8, ARENA.z + 2);
  addPet('horse', ARENA.x + 6, ARENA.z - 3);
}
function updatePets(dt) {
  for (const a of parkPets) {
    if (!a.alive) continue;
    const p = a.g.position;
    if (a.mountInteract) { a.mountInteract.pos.copy(p); a.mountInteract.label = a.ridden ? 'Dismount' : 'Ride the horse'; }
    if (a.ridden) continue;   // player (or riding()) is driving this one directly
    if(a.owner){
      if(a.owner===player&&(swimming||inCar||transport?.rider)){a.leash.visible=false;a.target.copy(p);continue;}
      a.leash.visible=true;
      if(a.owner!==player){a.ownerPhase=(a.ownerPhase||0)+dt*.2;const next=a.home.clone().add(new THREE.Vector3(Math.sin(a.ownerPhase)*3,0,Math.cos(a.ownerPhase)*2));collide(next,.4);next.y=groundY(next.x,next.z);a.owner.rotation.y=Math.atan2(next.x-a.owner.position.x,next.z-a.owner.position.z);a.owner.position.copy(next);animateHumanoid(a.ownerHuman,null,true,false,true,dt);}
      a.target.copy(a.owner.position).add(new THREE.Vector3(1,0,.7));
      a.leash.geometry.setFromPoints([a.owner.position.clone().add(new THREE.Vector3(0,.9,0)),p.clone().add(new THREE.Vector3(0,.3,0))]);
    }
    if (distXZ(p, a.target) < 0.3) {
      a.waitT -= dt;
      if (!a.owner && a.waitT <= 0) { a.target = a.home.clone().add(new THREE.Vector3((rand() - 0.5) * 8, 0, (rand() - 0.5) * 8)); a.waitT = 2 + rand() * 3; }
    } else {
      const dir = new THREE.Vector3(a.target.x - p.x, 0, a.target.z - p.z).normalize();
      // A companion following the player needs to actually keep up, including
      // sprint/speed-boost — it was using its own fixed (slow) wander speed
      // even while owned, so it dragged behind constantly.
      const chaseSpeed = (a.owner === player) ? Math.max(a.speed, 7 * speedMul()) : a.speed;
      const previous=p.clone();p.addScaledVector(dir,chaseSpeed*dt);if(isSeaWater(p.x,p.z))p.copy(previous);
      a.g.rotation.y = Math.atan2(-dir.z, dir.x);
    }
    collide(p,.2);p.y = groundY(p.x, p.z, p.y);
  }
}

const butterflies = [];
function addButterfly(x, z) {
  const mat = new THREE.MeshBasicMaterial({ color: pick([0xffb6c1, 0xffe66d, 0x74b9ff, 0xffffff]), side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.1, 6), mat);
  scene.add(m);
  butterflies.push({ m, cx: x, cz: z, phase: rand() * 10, h: 0.6 + rand() * 0.4 });
}
// Butterflies now roam several hubs around town, not just the park.
const BUTTERFLY_HUBS = [[PARK.x - 7, PARK.z - 2], [PARK.x + 7, PARK.z + 2], [PARK.x - 2, PARK.z + 8], [PARK.x + 3, PARK.z - 8],
  [30, 14], [60, 40], [-60, 60], [60, -60], [0, -100]];
for (const [ox, oz] of BUTTERFLY_HUBS) addButterfly(ox, oz);
function updateButterflies(dt) {
  for (const b of butterflies) {
    b.phase += dt * 1.5;
    const x = b.cx + Math.sin(b.phase) * 1.4, z = b.cz + Math.sin(b.phase * 1.7) * 1.4;
    const y = groundY(x, z) + b.h + Math.sin(b.phase * 4) * 0.1;
    b.m.position.set(x, y, z);
    b.m.rotation.y = b.phase;
    b.m.rotation.x = Math.sin(b.phase * 6) * 0.6;
  }
}
// Bees buzz tightly around the park's flower beds — quicker, jitterier than butterflies.
const bees = [];
function addBee(x, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf6c80a, roughness: 0.6 }));
  scene.add(m);
  bees.push({ m, cx: x, cz: z, phase: rand() * 10, h: 0.5 + rand() * 0.3 });
}
for (const [ox, oz] of [[-7, -2], [7, 2], [-2, 8], [3, -8], [-10, 1]]) addBee(PARK.x + ox, PARK.z + oz);
function updateBees(dt) {
  for (const b of bees) {
    b.phase += dt * 5;
    const x = b.cx + Math.sin(b.phase) * 0.6 + Math.sin(b.phase * 3.3) * 0.15, z = b.cz + Math.cos(b.phase * 1.3) * 0.6;
    const y = groundY(x, z) + b.h + Math.sin(b.phase * 5) * 0.08;
    b.m.position.set(x, y, z);
  }
}
// Birds circling over town — there was nothing at all flying overhead before.
const birds = [];
function addBird(x, z, h) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.18, 3), new THREE.MeshBasicMaterial({ color: 0x2b2b2b, side: THREE.DoubleSide }));
  scene.add(m);
  birds.push({ m, cx: x, cz: z, r: 14 + rand() * 10, h, state:'flying',timer:8+rand()*10,landing:new THREE.Vector3(x,0,z), phase: rand() * 10, speed: 0.3 + rand() * 0.2 });
}
for (let i = 0; i < 8; i++) addBird(PARK.x + (rand() - 0.5) * 60, PARK.z + (rand() - 0.5) * 60, 13 + rand() * 6);
function updateBirds(dt) {
  for(const b of birds){b.timer-=dt;b.phase+=b.speed*dt;
    const flight=new THREE.Vector3(b.cx+Math.cos(b.phase)*b.r,b.h+Math.sin(b.phase*3)*.4,b.cz+Math.sin(b.phase)*b.r);
    if(b.state==='flying'&&b.timer<=0){const x=b.cx+Math.cos(b.phase)*5,z=b.cz+Math.sin(b.phase)*5;if(!insideCollider(new THREE.Vector3(x,0,z))&&!waterZones.some(w=>Math.hypot(x-w.x,z-w.z)<w.r)){b.landing.set(x,groundY(x,z)+.12,z);b.state='landing';}else b.timer=3;}
    if(b.state==='landing'){const d=b.m.position.distanceTo(b.landing);b.m.position.lerp(b.landing,Math.min(1,6*dt/(d||1)));if(d<.2){b.state='landed';b.timer=5+rand()*4;}}
    else if(b.state==='landed'){b.m.rotation.x=0;if(b.timer<=0||b.m.position.distanceTo(player.position)<2){b.state='taking-off';b.timer=3;}}
    else if(b.state==='taking-off'){b.m.position.lerp(flight,1-Math.exp(-dt));if(b.timer<=0){b.state='flying';b.timer=12;}}
    else b.m.position.copy(flight);
    if(b.state!=='landed'){b.m.rotation.y=-b.phase;b.m.rotation.x=-Math.PI/2+Math.sin(b.phase*9)*.3;}
  }
}
// Squirrels — small, skittish, dart between a few trees near the park.
const squirrels = [];
function addSquirrel(x, z) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: pick([0x8a5a3a, 0x6b4a2f, 0x5a4530]), roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.16, 4, 6), mat); body.rotation.z = Math.PI / 2; body.position.y = 0.1; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat); head.position.set(0.14, 0.12, 0); g.add(head);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 6), mat); tail.rotation.z = -Math.PI / 2.4; tail.position.set(-0.16, 0.22, 0); g.add(tail);
  g.position.set(x, groundY(x, z), z); scene.add(g);
  squirrels.push({ g, home: new THREE.Vector3(x, 0, z), target: new THREE.Vector3(x, 0, z), waitT: rand() * 3 });
}
for (const [ox, oz] of [[-9, -9], [-5, -11], [9, -9], [-9, 9], [10, -3.5]]) addSquirrel(PARK.x + ox, PARK.z + oz);
function updateSquirrels(dt) {
  for (const s of squirrels) {
    const p = s.g.position;
    if (distXZ(p, s.target) < 0.2) {
      s.waitT -= dt;
      if (s.waitT <= 0) { s.target.set(s.home.x + (rand() - 0.5) * 4, 0, s.home.z + (rand() - 0.5) * 4); s.waitT = 1 + rand() * 3; }
    } else {
      const dir = new THREE.Vector3(s.target.x - p.x, 0, s.target.z - p.z).normalize();
      p.addScaledVector(dir, 3 * dt);
      s.g.rotation.y = Math.atan2(dir.x, dir.z);
    }
    p.y = groundY(p.x, p.z);
  }
}
// A handful of fish breaking the surface in the sea/river.
const fish = [];
function addFish(x, z) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 4), new THREE.MeshStandardMaterial({ color: pick([0x4a7ba6, 0x6b9bc9, 0x8aa6b0]), metalness: 0.4, roughness: 0.4 }));
  m.rotation.x = Math.PI / 2; scene.add(m);
  fish.push({ m, cx: x, cz: z, phase: rand() * 10, r: 3 + rand() * 4 });
}
for (let i = 0; i < 10; i++) addFish((rand() - 0.5) * 200, 207 + rand() * 300); // sea starts at z=187; stay clear of the beach/pier
function updateFish(dt) {
  for (const f of fish) {
    f.phase += dt * 0.6;
    const x = f.cx + Math.cos(f.phase) * f.r, z = f.cz + Math.sin(f.phase) * f.r;
    const surface = Math.sin(performance.now() / 900 + f.phase * 3);
    f.m.visible = surface > 0.5;
    f.m.position.set(x, 0.05, z);
    f.m.rotation.y = -f.phase;
  }
}
function updateParkLife(dt) { updateDucks(dt); updatePets(dt); updateButterflies(dt); updateBees(dt); updateBirds(dt); updateSquirrels(dt); updateFish(dt); }

// =====================================================================
// UTILITY POLES: telecom/power poles with sagging wires along a few streets —
// decorative only, not an electrical system.
// =====================================================================
function addWireRun(poleMat, points) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1], mid = a.clone().lerp(b, 0.5); mid.y -= 0.8;
    const curve = new THREE.CatmullRomCurve3([a, mid, b]);
    const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.03, 5, false), poleMat);
    scene.add(wire);
  }
}
{
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 0.9 });
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
  for (const x of [-140, -60, 60, 140]) {
    const tops = [];
    for (let z = -140; z <= 140; z += 40) {
      box(0.18, 7, 0.18, x + 4, 3.5, z, poleMat, false);
      box(2.4, 0.12, 0.12, x + 4, 6.6, z, poleMat, false);
      tops.push(new THREE.Vector3(x + 4 - 1.1, 6.6, z), new THREE.Vector3(x + 4 + 1.1, 6.6, z));
    }
    const left = tops.filter((_, i) => i % 2 === 0), right = tops.filter((_, i) => i % 2 === 1);
    addWireRun(wireMat, left); addWireRun(wireMat, right);
  }
}

// =====================================================================
// TRAINING GROUND (sand arena with a fence and a sign)
// =====================================================================
// The fenced training-arena shell is gone (replaced by a real runway just
// south of here) but TRAIN itself, the combat dummies and the special-ability
// claim point below all still live at this spot — those aren't cosmetic.
const TRAIN = new THREE.Vector3(60, CURB, 20);

// =====================================================================
// ASHFORD CHAPEL: two storeys, a real walk-in building (open door, not a
// civic pocket interior) — pews facing the altar, a staircase up to the
// choir loft, and an organ for worship.
// =====================================================================
(function buildChapel() {
  const x = TRAIN.x, z = TRAIN.z, w = 20, d = 26, h1 = 4.6, h2 = 3.6;
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xcfc3a8, roughness: 0.9 });
  const roofC = new THREE.MeshStandardMaterial({ color: 0x4a3a30, roughness: 0.85 });
  const woodC = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.8 });
  // Ground floor walls — open door on the south (+z) face.
  box(w, h1, 0.4, x, h1 / 2, z - d / 2, stoneMat); camBlockers.push(box(w, h1, 0.4, x, h1 / 2, z - d / 2, stoneMat));
  camBlockers.push(box(0.4, h1, d, x - w / 2, h1 / 2, z, stoneMat));
  camBlockers.push(box(0.4, h1, d, x + w / 2, h1 / 2, z, stoneMat));
  camBlockers.push(box((w - 4.5) / 2, h1, 0.4, x - (w + 4.5) / 4, h1 / 2, z + d / 2, stoneMat));
  camBlockers.push(box((w - 4.5) / 2, h1, 0.4, x + (w + 4.5) / 4, h1 / 2, z + d / 2, stoneMat));
  // Thin wall-only colliders (not a filled footprint) so the inside is actually walkable.
  colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2 - 0.2, maxZ: z - d / 2 + 0.2 },
    { minX: x - w / 2 - 0.2, maxX: x - w / 2 + 0.2, minZ: z - d / 2, maxZ: z + d / 2 },
    { minX: x + w / 2 - 0.2, maxX: x + w / 2 + 0.2, minZ: z - d / 2, maxZ: z + d / 2 },
    { minX: x - w / 2, maxX: x - 2.25, minZ: z + d / 2 - 0.2, maxZ: z + d / 2 + 0.2 },
    { minX: x + 2.25, maxX: x + w / 2, minZ: z + d / 2 - 0.2, maxZ: z + d / 2 + 0.2 });
  // Second storey (choir loft) — only the back third, open over the main hall.
  const loftDepth = 8, loftZ = z - d / 2 + loftDepth / 2 + 1;
  box(w - 1, 0.3, loftDepth, x, h1 + 0.15, loftZ, woodC, false);
  camBlockers.push(box(w, h2, 0.3, x, h1 + h2 / 2, z - d / 2, stoneMat));
  camBlockers.push(box(0.3, h2, loftDepth + 1, x - w / 2, h1 + h2 / 2, loftZ, stoneMat));
  camBlockers.push(box(0.3, h2, loftDepth + 1, x + w / 2, h1 + h2 / 2, loftZ, stoneMat));
  const roof = box(w + 1, 0.3, d + 1, x, h1 + h2 + 0.15, z, roofC, false); camBlockers.push(roof);
  planeBlocks.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: h1 + 0.3 },
    { minX: x - w / 2, maxX: x + w / 2, minZ: loftZ - loftDepth / 2, maxZ: loftZ + loftDepth / 2, top: h1 + h2 + 0.45 });
  // Staircase up to the loft, along the east wall.
  for (let s = 0; s < 14; s++) box(2, 0.12, 0.9, x + w / 2 - 1.3, 0.2 + s * 0.33, z - d / 2 + 2 + s * 0.6, woodC, false);
  box(0.12, h1, 0.12, x + w / 2 - 2.3, h1 / 2, z - d / 2 + 2, woodC, false);
  // Cross on the roof peak, out front above the door.
  box(0.2, 1.8, 0.2, x, h1 + h2 + 1, z - d / 2, 0xe8e2cf, false);
  box(0.9, 0.2, 0.2, x, h1 + h2 + 1.4, z - d / 2, 0xe8e2cf, false);
  signboard('ASHFORD CHAPEL', x, h1 + h2 + 2.4, z + d / 2 + 0.5, 12, '#2a2516');
  // Pews facing the altar (north end), aisle down the middle.
  for (let row = 0; row < 5; row++) for (const side of [-1, 1]) {
    const pz = z - d / 2 + 4 + row * 2.6;
    box(5, 0.9, 0.5, x + side * 3.6, 0.45, pz, woodC, false);
    box(5, 0.5, 0.12, x + side * 3.6, 0.85, pz - 0.2, woodC, false);
  }
  // Altar + organ up in the loft.
  box(3, 1, 1.2, x, 0.5, z - d / 2 + 1.5, 0xe8e2cf, false);
  box(2.4, 1.6, 1, x, h1 + 0.8, loftZ + loftDepth / 2 - 1, 0x3a2a1a, false);   // organ body
  for (let p = -5; p <= 5; p++) box(0.14, 1 + Math.abs(p) * 0.08, 0.14, x + p * 0.2, h1 + 1.9 + Math.abs(p) * 0.04, loftZ + loftDepth / 2 - 1.5, 0xc8b878, false);   // pipes
  sitSpots.push({ x, z: loftZ + loftDepth / 2 - 2.3, yaw: Math.PI, seatY: h1 + 0.75, label: 'Sit at the organ' });
})();

// =====================================================================
// HOME RUNWAY: a short strip just south of the old training ground, for the
// plane parked near home. Outside the main block grid (|z| > 160) so it
// doesn't collide with any street/building there.
// =====================================================================
const RUNWAY = new THREE.Vector3(TRAIN.x, 0, 200);
{
  const len = 90, w = 11;
  box(w, 0.08, len, RUNWAY.x, 0.04, RUNWAY.z, 0x3a3c40, false);
  for (const side of [-1, 1]) box(0.3, 0.1, len, RUNWAY.x + side * w / 2, 0.09, RUNWAY.z, 0xe8e8e8, false);
  for (let z = RUNWAY.z - len / 2 + 4; z < RUNWAY.z + len / 2; z += 10) box(0.3, 0.1, 5, RUNWAY.x, 0.09, z, 0xe6c24a, false);
  signboard('HOME RUNWAY', RUNWAY.x, 2.4, RUNWAY.z - len / 2 - 2, 10, '#2a2f33');
}

// =====================================================================
// HOME (Sims-style house; the roof hides when you walk inside)
// =====================================================================
const HOME = { x: 20, z: 22, minX: 14, maxX: 26, minZ: 17, maxZ: 27 };
const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 0.9 });
const WALL_Y = CURB + 1.5;
box(12, 3, 0.3, HOME.x, WALL_Y, HOME.maxZ, wallMat);           // back
box(0.3, 3, 10, HOME.minX, WALL_Y, HOME.z, wallMat);           // left
box(0.3, 3, 10, HOME.maxX, WALL_Y, HOME.z, wallMat);           // right
box(5, 3, 0.3, 16.5, WALL_Y, HOME.minZ, wallMat);              // front-left
box(5, 3, 0.3, 23.5, WALL_Y, HOME.minZ, wallMat);              // front-right
box(2, 0.8, 0.3, HOME.x, CURB + 2.6, HOME.minZ, wallMat, false); // above door

const houseWindowMat = new THREE.MeshStandardMaterial({ color: 0x8fb3cc, roughness: 0.1, emissive: 0xffd58a, emissiveIntensity: 0 });
glowMats.push(houseWindowMat);
for (const z of [20, 24.5]) {
  box(0.06, 1.1, 1.6, HOME.minX - 0.17, CURB + 1.7, z, houseWindowMat, false);
  box(0.06, 1.1, 1.6, HOME.maxX + 0.17, CURB + 1.7, z, houseWindowMat, false);
}
for (const x of [16.5, 23.5]) box(1.6, 1.1, 0.06, x, CURB + 1.7, HOME.minZ - 0.17, houseWindowMat, false);

const floor = mesh(new THREE.PlaneGeometry(11.7, 9.7), new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 }));
floor.rotation.x = -Math.PI / 2;
floor.position.set(HOME.x, CURB + 0.02, HOME.z);
floor.castShadow = false;

const roofShape = new THREE.Shape([new THREE.Vector2(-5.6, 0), new THREE.Vector2(5.6, 0), new THREE.Vector2(0, 2.2)]);
const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 12.6, bevelEnabled: false });
roofGeo.translate(0, 0, -6.3);
roofGeo.rotateY(Math.PI / 2);
const houseRoof = new THREE.Mesh(roofGeo, [wallMat, new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.9 })]);
houseRoof.position.set(HOME.x, CURB + 3, HOME.z);
houseRoof.castShadow = houseRoof.receiveShadow = true;
scene.add(houseRoof);

const doorPath = mesh(new THREE.PlaneGeometry(2, 11.5), pathMat);
doorPath.rotation.x = -Math.PI / 2;
doorPath.position.set(HOME.x, CURB + 0.02, 11);
doorPath.castShadow = false;

// Furniture
const F_Y = CURB;
const bed = box(2, 0.35, 3, 16, F_Y + 0.175, 25.2, woodMatPlain);
box(1.9, 0.2, 2.9, 16, F_Y + 0.45, 25.2, 0xf4f4f4, false);
box(1.94, 0.08, 1.9, 16, F_Y + 0.58, 24.6, 0x4a6fd1, false);
box(1.3, 0.15, 0.5, 16, F_Y + 0.62, 26.2, 0xffffff, false);
box(2, 0.9, 0.12, 16, F_Y + 0.6, 26.75, woodMatPlain, false);

const fridge = box(1, 2, 0.8, 25.2, F_Y + 1, 26.3, 0xe8eef2);
box(0.05, 0.6, 0.06, 24.75, F_Y + 1.3, 25.88, 0x888888, false);
box(3, 0.9, 0.7, 23, F_Y + 0.45, 26.45, 0xd8d2c4);
box(3, 0.06, 0.74, 23, F_Y + 0.93, 26.45, 0x5a5a5a, false);

box(1.6, 0.08, 1, 22, F_Y + 0.75, 21.5, woodMatPlain);
for (const [sx, sz] of [[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]]) box(0.08, 0.72, 0.08, 22 + sx, F_Y + 0.36, 21.5 + sz, woodMatPlain, false);
for (const sz of [20.6, 22.4]) {
  const stool = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 12), 0x6b4a2f);
  stool.position.set(22, F_Y + 0.25, sz);
}

box(0.9, 0.45, 2.2, 14.75, F_Y + 0.225, 20.8, 0x6c5ce7);
box(0.25, 0.6, 2.2, 14.4, F_Y + 0.6, 20.8, 0x5b4bd6, false);
const rug = mesh(new THREE.PlaneGeometry(2.6, 2.2), 0xd35454);
rug.rotation.x = -Math.PI / 2;
rug.position.set(16.9, F_Y + 0.03, 20.8);
rug.castShadow = false;
box(0.4, 0.5, 1.4, 18.9, F_Y + 0.25, 20.8, 0x3b3b3b);
box(0.06, 0.7, 1.2, 18.9, F_Y + 0.9, 20.8, 0x111111, false);

const houseLight = new THREE.PointLight(0xffe2b0, 6, 12, 2);
houseLight.position.set(HOME.x, CURB + 2.7, HOME.z);
scene.add(houseLight);

for (const [x, z] of [[8, 9], [32, 9], [32, 32], [8, 32]]) addTree(x, z, 1.2);

// =====================================================================
// MORE HOUSES (walk in through the door; the roof hides while you're inside)
// =====================================================================
const houses = [{ roof: houseRoof, minX: HOME.minX, maxX: HOME.maxX, minZ: HOME.minZ, maxZ: HOME.maxZ }];
const HOUSE_COLORS = [[0xf6e3c5, 0x8e3b2f], [0xdfe8ef, 0x34495e], [0xf3d6d6, 0x6d2e46], [0xe3f1df, 0x4b6a3a]];
// Unified sit system: any real seat (house couches, bus stop benches, the civic
// interior's chair) registers here as {x,z,yaw}. One proximity check + one E
// handler covers all of them, instead of a separate one-off per location.
sitSpots.push(
  ...streetSeats,
  { x: 14.75, z: 20.8, yaw: Math.PI / 2, seatY: F_Y + 0.45, label: 'Sit on couch' },
  { x: 22, z: 20.6, yaw: 0, seatY: F_Y + 0.5, label: 'Sit on stool' },
  { x: 22, z: 22.4, yaw: Math.PI, seatY: F_Y + 0.5, label: 'Sit on stool' },
);
// Same idea for sleep/eat spots — originally only the one starting house had a
// working bed+fridge; every procedural house gets one now too.
interactables.push(
  { pos: bed.position, r: 2.4, label: 'Sleep', action: sleep },
  { pos: fridge.position, r: 1.9, label: 'Eat from fridge', action: eat },
);
function buildHouse(x0, z0, face, cellZ, wallColor, roofColor) {
  const W = 10, D = 8;
  const wm = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9 });
  const front = z0 + face * D / 2, back = z0 - face * D / 2;
  box(W, 3, 0.3, x0, WALL_Y, back, wm);
  box(0.3, 3, D, x0 - W / 2, WALL_Y, z0, wm);
  box(0.3, 3, D, x0 + W / 2, WALL_Y, z0, wm);
  box(4, 3, 0.3, x0 - 3, WALL_Y, front, wm);
  box(4, 3, 0.3, x0 + 3, WALL_Y, front, wm);
  box(2, 0.8, 0.3, x0, CURB + 2.6, front, wm, false);
  for (const x of [x0 - 3, x0 + 3]) box(1.6, 1.1, 0.06, x, CURB + 1.7, front + face * 0.17, houseWindowMat, false);
  for (const s of [-1, 1]) box(0.06, 1.1, 1.6, x0 + s * (W / 2 + 0.17), CURB + 1.7, z0, houseWindowMat, false);
  const fl = mesh(new THREE.PlaneGeometry(W - 0.3, D - 0.3), new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 }));
  fl.rotation.x = -Math.PI / 2;
  fl.position.set(x0, CURB + 0.02, z0);
  fl.castShadow = false;

  const shape = new THREE.Shape([new THREE.Vector2(-D / 2 - 0.6, 0), new THREE.Vector2(D / 2 + 0.6, 0), new THREE.Vector2(0, 2)]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: W + 0.6, bevelEnabled: false });
  geo.translate(0, 0, -(W + 0.6) / 2);
  geo.rotateY(Math.PI / 2);
  const roof = new THREE.Mesh(geo, [wm, new THREE.MeshStandardMaterial({ map: roofTex, color: roofColor, roughness: 0.9 })]);
  roof.position.set(x0, CURB + 3, z0);
  roof.castShadow = roof.receiveShadow = true;
  scene.add(roof);

  // Furniture (face = direction from the back wall towards the door)
  box(1.8, 0.45, 2.6, x0 - 3, CURB + 0.225, back + face * 1.6, woodMatPlain);
  box(1.7, 0.1, 1.6, x0 - 3, CURB + 0.5, back + face * 2.0, 0x74b9ff, false);
  box(1.2, 0.12, 0.45, x0 - 3, CURB + 0.52, back + face * 0.6, 0xffffff, false);
  interactables.push({ pos: new THREE.Vector3(x0 - 3, 0, back + face * 1.8), r: 2.4, label: 'Sleep', action: sleep });
  box(2.2, 0.45, 0.9, x0 + 2.5, CURB + 0.225, back + face * 0.75, 0x6c5ce7, false); // non-colliding so the player can actually walk up to sit on it
  box(2.2, 0.55, 0.25, x0 + 2.5, CURB + 0.6, back + face * 0.35, 0x5b4bd6, false);
  sitSpots.push({ x: x0 + 2.5, z: back + face * 0.75, yaw: face > 0 ? 0 : Math.PI, seatY: CURB + 0.45, label: 'Sit on couch' });
  box(1.4, 0.06, 0.9, x0 + 2.5, CURB + 0.75, z0 + face * 0.6, woodMatPlain);
  box(0.12, 0.72, 0.12, x0 + 2.5, CURB + 0.36, z0 + face * 0.6, woodMatPlain, false);
  box(0.7, 1.5, 0.6, x0 + 4.3, CURB + 0.75, back + face * 0.6, 0xe8eef2, false);
  interactables.push({ pos: new THREE.Vector3(x0 + 4.3, 0, back + face * 0.6), r: 1.9, label: 'Eat from fridge', action: eat });

  const lawnEdge = cellZ + face * 13;
  const path = mesh(new THREE.PlaneGeometry(1.8, Math.abs(lawnEdge - front)), pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(x0, CURB + 0.02, (front + lawnEdge) / 2);
  path.castShadow = false;

  houses.push({ roof, minX: x0 - W / 2, maxX: x0 + W / 2, minZ: Math.min(front, back), maxZ: Math.max(front, back) });
}
residentialCells.forEach(([cx, cz], i) => {
  for (const s of [-1, 1]) {
    const [wall, roofC] = HOUSE_COLORS[(i * 2 + (s + 1) / 2) % HOUSE_COLORS.length];
    buildHouse(cx + s * 7.5, cz + 4, 1, cz, wall, roofC);
    addTree(cx + s * 9, cz - 9, 1.1);
  }
});

// =====================================================================
// UI HELPERS (toasts, floating numbers, labels, callouts, combo)
// =====================================================================
const $ = id => document.getElementById(id);
let toastTimer;
function toast(text) {
  $('toast').textContent = text;
  $('toast').style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').style.opacity = 0, 2200);
}

const _proj = new THREE.Vector3();
function toScreen(pos) {
  _proj.copy(pos).project(camera);
  if (_proj.z > 1) return null;
  return { x: (_proj.x + 1) / 2 * innerWidth, y: (1 - _proj.y) / 2 * innerHeight };
}

const pops = [];
function popText(pos, text, cls = '') {
  const el = document.createElement('div');
  el.className = 'pop ' + cls;
  el.textContent = text;
  document.body.appendChild(el);
  pops.push({ el, pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8)), t: 0 });
}
function updatePops(dt) {
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i];
    p.t += dt;
    p.pos.y += dt * 1.4;
    const s = toScreen(p.pos);
    if (s) { p.el.style.left = s.x + 'px'; p.el.style.top = s.y + 'px'; p.el.style.display = ''; } else p.el.style.display = 'none';
    const scale = p.t < 0.08 ? 1.7 - p.t / 0.08 * 0.7 : 1;
    p.el.style.transform = `translate(-50%, -50%) scale(${scale})`;
    p.el.style.opacity = 1 - Math.max(0, (p.t - 0.5) / 0.4);
    if (p.t > 0.9) { p.el.remove(); pops.splice(i, 1); }
  }
}

function makeLabel(name, withGuard) {
  const el = document.createElement('div');
  el.className = 'label3d';
  el.innerHTML = `<div>${name}</div><div class="lb"><div class="lhp"></div></div>` + (withGuard ? '<div class="lb"><div class="lg"></div></div>' : '');
  document.body.appendChild(el);
  return { el, hp: el.querySelector('.lhp'), guard: el.querySelector('.lg') };
}

let calloutTimer;
function callout(text, color, big = false) {
  const el = $('callout');
  el.textContent = text;
  el.style.color = '#' + new THREE.Color(color).getHexString();
  el.className = big ? 'big' : '';
  void el.offsetWidth;   // restart the transition
  el.classList.add('show');
  clearTimeout(calloutTimer);
  calloutTimer = setTimeout(() => el.classList.remove('show'), big ? 1500 : 900);
}
function letterbox(on) { $('lbTop').style.height = $('lbBot').style.height = on ? '12vh' : '0'; }

const combo = { count: 0, dmg: 0, t: 0 };
function registerCombo(dmg) {
  combo.count++; combo.dmg += dmg; combo.t = 1.8;
  $('combo').querySelector('.hits').textContent = combo.count + (combo.count === 1 ? ' HIT' : ' HITS');
  $('combo').querySelector('.dmg').textContent = Math.round(combo.dmg) + ' DMG';
  $('combo').style.opacity = 1;
}

// =====================================================================
// FX: particles, timed effects, impact frames, speed lines
// =====================================================================
const particles = [];
const particleGeo = new THREE.BoxGeometry(1, 1, 1);
const particleMats = {};
const particleMat = c => particleMats[c] ||= new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
function spawnParticle(pos, vel, color, size, life, gravity = 0) {
  if (particles.length > 700) return;
  const m = new THREE.Mesh(particleGeo, particleMat(color));
  m.position.copy(pos);
  m.scale.setScalar(size);
  m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
  scene.add(m);
  particles.push({ m, vel, life, max: life, size, gravity });
}
function burst(pos, n, colors, speed, size, life, gravity = 10, up = 0) {
  for (let i = 0; i < n; i++) {
    const v = randUnit().multiplyScalar(speed * (0.4 + Math.random() * 0.6));
    v.y += up;
    spawnParticle(pos, v, pick(colors), size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.7), gravity);
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vel.y -= p.gravity * dt;
    p.m.position.addScaledVector(p.vel, dt);
    p.m.rotation.x += dt * 5;
    p.m.scale.setScalar(Math.max(0.001, p.size * (p.life / p.max)));
    if (p.life <= 0) { scene.remove(p.m); particles.splice(i, 1); }
  }
}

// Tasks: anything that runs for a while (effects, tornadoes...). update(dt, t, task), end(task)
function addTask(t) { tasks.push(Object.assign({ t: 0 }, t)); }
function updateTasks(dt) {
  for (let i = tasks.length - 1; i >= 0; i--) {
    const k = tasks[i];
    k.t += dt;
    k.update?.(dt, k.t, k);
    if (k.t >= k.dur) { tasks.splice(i, 1); k.end?.(k); }
  }
}
function disposeObj(o) {
  scene.remove(o);
  o.traverse(c => { if (c.isMesh) { c.geometry.dispose(); c.material.dispose(); } });
}
const fxMat = (color, opacity = 1, additive = true) => new THREE.MeshBasicMaterial({
  color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
  blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false,
});
function fxRing(pos, color, size, dur = 0.45) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), fxMat(color));
  m.rotation.x = -Math.PI / 2;
  m.position.set(pos.x, pos.y + 0.15, pos.z);
  scene.add(m);
  addTask({ dur, update: (dt, t) => { const k = t / dur; m.scale.setScalar(0.5 + k * size); m.material.opacity = 1 - k; }, end: () => disposeObj(m) });
}
function fxSphere(pos, color, radius, dur = 0.35) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), fxMat(color, 0.8));
  m.position.copy(pos);
  scene.add(m);
  addTask({ dur, update: (dt, t) => { const k = t / dur; m.scale.setScalar(0.2 + Math.sqrt(k) * radius); m.material.opacity = 0.8 * (1 - k); }, end: () => disposeObj(m) });
}
function fxPillar(pos, color, radius, height, dur = 0.5) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.2, height, 24, 1, true), fxMat(color, 0.9));
  m.position.set(pos.x, pos.y + height / 2, pos.z);
  scene.add(m);
  addTask({ dur, update: (dt, t) => {
    const k = t / dur;
    m.scale.set(1 + k * 0.6, Math.min(1, k * 5), 1 + k * 0.6);
    m.position.y = pos.y + height / 2 * Math.min(1, k * 5);
    m.material.opacity = 0.9 * (1 - k);
  }, end: () => disposeObj(m) });
}
function fxCrater(pos, r) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 28), fxMat(0x1a1410, 0.55, false));
  m.rotation.x = -Math.PI / 2;
  m.position.set(pos.x, groundY(pos.x, pos.z) + 0.04, pos.z);
  scene.add(m);
  addTask({ dur: 3, update: (dt, t) => { m.material.opacity = 0.55 * (1 - t / 3); }, end: () => disposeObj(m) });
}
// Permanent scorch decal left behind by fire/explosions — never disposed, stays forever.
function scorchMark(pos, r) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), fxMat(0x100d0a, 0.7, false));
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = Math.random() * Math.PI;
  m.position.set(pos.x, groundY(pos.x, pos.z) + 0.03, pos.z);
  scene.add(m);
  return m;
}
// Sustained fire/smoke plume that slowly dies down but leaves the scorch mark behind for good.
// Active fires firefighters can respond to and put out early.
const activeFires = [];
function burnFor(pos, dur, spread = 1) {
  const fire = { pos, claimed: false, task: null };
  const task = { dur, update: (dt, t) => {
    const k = t / dur, intensity = 1 - k * 0.7; // flames die down but don't fully vanish till the end
    if (Math.random() < intensity) spawnParticle(
      new THREE.Vector3(pos.x + (Math.random() - 0.5) * spread, pos.y + 0.3, pos.z + (Math.random() - 0.5) * spread),
      new THREE.Vector3((Math.random() - 0.5) * 0.6, 2.5 + Math.random() * 2, (Math.random() - 0.5) * 0.6),
      pick([0xff7a2f, 0xffb347, 0x3d3d3d]), 0.35 + Math.random() * 0.3, 1.5, intensity > 0.3 ? -0.6 : 2);
    if (Math.random() < 0.4 * intensity) spawnParticle(
      new THREE.Vector3(pos.x + (Math.random() - 0.5) * spread * 1.4, pos.y + 0.5, pos.z + (Math.random() - 0.5) * spread * 1.4),
      new THREE.Vector3((Math.random() - 0.5), 3 + Math.random() * 2.5, (Math.random() - 0.5)), pick([0x555555, 0x3d3d3d]), 0.5, 2.5, -0.3);
  }, end: () => { const i = activeFires.indexOf(fire); if (i >= 0) activeFires.splice(i, 1); } };
  fire.task = task;
  activeFires.push(fire);
  addTask(task);
}
function fxSwoosh(pos, dir, color, flip) {
  const g = new THREE.Group();
  g.position.copy(pos);
  g.rotation.y = Math.atan2(dir.x, dir.z);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.05, 6, 24, Math.PI), fxMat(color));
  arc.rotation.set(Math.PI / 2, 0, flip ? 0.4 : -0.4);
  g.add(arc);
  scene.add(g);
  addTask({ dur: 0.16, update: (dt, t) => { arc.material.opacity = 1 - t / 0.16; g.scale.setScalar(1 + t * 2); }, end: () => disposeObj(g) });
}

// Impact frames: hit-stop + black/white inverted flash + speed lines + screen shake
let hitStop = 0, shake = 0, linesT = 0, linesDark = false;
let impactTimers = [];
function impactFrame(power = 1) {
  hitStop = Math.max(hitStop, 0.05 + 0.07 * power);
  shake = Math.max(shake, 0.25 + 0.3 * power);
  linesT = Math.max(linesT, 0.12 + 0.15 * power);
  impactTimers.forEach(clearTimeout);
  const c = renderer.domElement;
  c.style.filter = 'grayscale(1) contrast(8) invert(1)';
  linesDark = true;
  impactTimers = [
    setTimeout(() => { c.style.filter = 'grayscale(1) contrast(8)'; linesDark = false; }, 55),
    setTimeout(() => { c.style.filter = 'saturate(1.7) contrast(1.25)'; }, 110),
    setTimeout(() => { c.style.filter = ''; }, 200),
  ];
}
let linesFrame = 0;
function drawSpeedLines(dt) {
  linesT -= dt;
  if (linesT <= 0) { if (linesFrame) { g2.clearRect(0, 0, fx2d.width, fx2d.height); linesFrame = 0; } return; }
  if (linesFrame++ % 2) return;   // jitter every other frame
  const W = fx2d.width, H = fx2d.height, cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2;
  g2.clearRect(0, 0, W, H);
  g2.fillStyle = linesDark ? 'rgba(0,0,0,.9)' : 'rgba(255,255,255,.85)';
  for (let i = 0; i < 80; i++) {
    const a = Math.random() * Math.PI * 2, w = 0.004 + Math.random() * 0.012, inner = R * (0.42 + Math.random() * 0.4);
    g2.beginPath();
    g2.moveTo(cx + Math.cos(a - w) * R * 1.1, cy + Math.sin(a - w) * R * 1.1);
    g2.lineTo(cx + Math.cos(a + w) * R * 1.1, cy + Math.sin(a + w) * R * 1.1);
    g2.lineTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    g2.fill();
  }
}

// =====================================================================
// HUMANOID MODEL + ANIMATION (shared by the player and the dummies)
// =====================================================================
const stdMat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
function makeHumanoid({ outfit, hair, skin = 0xffdcc0, pants = 0x2d3142, shoes = 0x1b1b2f, handScale = 1 }) {
  const root = new THREE.Group();
  scene.add(root);
  const rig = new THREE.Group();
  rig.scale.setScalar(0.9);
  root.add(rig);
  const mats = { outfit: stdMat(outfit), hair: stdMat(hair), skin: stdMat(skin), pants: stdMat(pants), dark: stdMat(shoes) };

  mesh(new THREE.CapsuleGeometry(0.21, 0.4, 4, 12), mats.outfit, rig).position.y = 1.27;
  mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 14), 0x3b2a1e, rig).position.y = 1.02;
  // Face: the old hair sphere (0.265) was bigger than the head itself (0.24) and
  // wrapped almost all the way around it, which read as an animal mask/hood rather
  // than hair. Shrunk to sit just on top/back of the head, and added eyebrows + a
  // mouth so there's an actual face instead of two dots on a blank sphere.
  mesh(new THREE.SphereGeometry(0.19, 18, 12), mats.skin, rig).position.y = 1.82;
  mesh(new THREE.SphereGeometry(0.18, 18, 12), mats.hair, rig).position.set(0, 1.9, -0.06);
  mesh(new THREE.BoxGeometry(0.27, 0.06, 0.09), mats.hair, rig).position.set(0, 1.98, 0.08);
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.024, 8, 6), mats.dark, rig).position.set(s * 0.064, 1.84, 0.177);
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.06, 0.012, 0.018), mats.hair, rig).position.set(s * 0.064, 1.885, 0.166);
  mesh(new THREE.BoxGeometry(0.075, 0.014, 0.018), mats.dark, rig).position.set(0, 1.75, 0.168);

  function limb(x, y, len, radius, mat, endMat, endGeo) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    rig.add(pivot);
    mesh(new THREE.CapsuleGeometry(radius, len, 4, 8), mat, pivot).position.y = -len / 2 - radius;
    const end = mesh(endGeo, endMat, pivot);
    end.position.y = -len - radius * 2;
    return { pivot, end };
  }
  // Faces +z, so the right side is -x.
  const legL = limb(0.12, 0.98, 0.6, 0.09, mats.pants, mats.dark, new THREE.BoxGeometry(0.16, 0.1, 0.26));
  const legR = limb(-0.12, 0.98, 0.6, 0.09, mats.pants, mats.dark, new THREE.BoxGeometry(0.16, 0.1, 0.26));
  legL.end.position.z = legR.end.position.z = 0.04;
  const armL = limb(0.34, 1.48, 0.42, 0.07, mats.outfit, mats.skin, new THREE.SphereGeometry(0.07 * handScale, 10, 8));
  const armR = limb(-0.34, 1.48, 0.42, 0.07, mats.outfit, mats.skin, new THREE.SphereGeometry(0.07 * handScale, 10, 8));
  return { root, rig, legL, legR, armL, armR, mats, flashMats: Object.values(mats), phase: 0 };
}

// Poses: arm [x, z] rotations and leg x rotations. Arm x of -PI/2 points forward, -PI points up.
const POSES = {
  dash:     { aL: [0.9, 0.25],  aR: [0.9, -0.25], lL: -0.4, lR: 0.7 },
  punchL:   { aL: [-1.6, -0.1], aR: [0.3, -0.1],  lL: 0.3,  lR: -0.3 },
  punchR:   { aL: [0.3, 0.1],   aR: [-1.6, 0.1],  lL: -0.3, lR: 0.3 },
  uppercut: { aL: [0.4, 0.2],   aR: [-3.0, 0],    lL: 0.5,  lR: -0.6 },
  cast:     { aL: [-1.5, -0.25], aR: [-1.5, 0.25], lL: 0.2, lR: -0.2 },
  slam:     { aL: [-2.9, 0.3],  aR: [-2.9, -0.3], lL: 0.6,  lR: 0.6 },
  charge:   { aL: [-0.4, 1.3],  aR: [-0.4, -1.3], lL: 0.1,  lR: -0.1 },
  block:    { aL: [-1.5, -0.7], aR: [-1.5, 0.7],  lL: 0.15, lR: -0.15 },
  windup:   { aL: [-1.2, 0.1],  aR: [0.8, -0.3],  lL: 0.3,  lR: -0.4 },
  stunned:  { aL: [0.3, 0.6],   aR: [0.3, -0.6],  lL: 0.1,  lR: -0.1 },
  sit:      { aL: [-0.15, 0.08], aR: [0.15, -0.08], lL: -1.35, lR: -1.35 }, // negative = forward (see comment above); positive bent them backward, hidden behind the torso
  phone:    { aL: [0.2, 0.1],   aR: [-2.3, 0.1],  lL: 0.1,  lR: -0.1 }, // recording or calling for help
  cpr:      { aL: [-1.1, 0.05], aR: [-1.1, -0.05], lL: -1.0, lR: -0.15 }, // kneeling over an injured bystander
};
function animateHumanoid(h, pose, moving, sprinting, grounded, dt) {
  const k = 1 - Math.exp(-22 * dt);
  h.phase += (moving ? (sprinting ? 14 : 9) : 0) * dt;
  const sw = moving && grounded && !pose ? Math.sin(h.phase) * (sprinting ? 0.9 : 0.6) : 0;
  const P = POSES[pose] || {
    aL: [-sw * 0.8, 0.08], aR: [sw * 0.8 - 0.2, -0.08],
    lL: grounded ? sw : 0.4, lR: grounded ? -sw : -0.5,
  };
  h.armL.pivot.rotation.x = lerp(h.armL.pivot.rotation.x, P.aL[0], k);
  h.armL.pivot.rotation.z = lerp(h.armL.pivot.rotation.z, P.aL[1], k);
  h.armR.pivot.rotation.x = lerp(h.armR.pivot.rotation.x, P.aR[0], k);
  h.armR.pivot.rotation.z = lerp(h.armR.pivot.rotation.z, P.aR[1], k);
  h.legL.pivot.rotation.x = lerp(h.legL.pivot.rotation.x, P.lL, k);
  h.legR.pivot.rotation.x = lerp(h.legR.pivot.rotation.x, P.lR, k);
  h.rig.position.y = moving && grounded && !pose ? Math.abs(Math.sin(h.phase)) * 0.05 : 0;
}

// =====================================================================
// CHARACTERS
// =====================================================================
const characters = [
  {
    name: 'Ember (Pyro)', color: 0xd63a2f, hair: 0x4a1c14, fx: 0xff5a1f, jump: 9, cds: [0, 0, 0, 0],
    skills: [
      { name: 'Flame Dash', icon: '🔥', cd: 5, dmg: '14', desc: 'Dash through enemies in a trail of fire, popping them up.', run: emberDash },
      { name: 'Rising Blaze', icon: '☄️', cd: 7, dmg: '18', desc: 'Fiery uppercut that launches enemies sky-high. Breaks guard.', run: emberUppercut },
      { name: 'Fireball Barrage', icon: '💥', cd: 8, dmg: '3 × 11', desc: 'Throw three exploding fireballs where you aim.', run: emberFireballs },
      { name: 'Meteor Slam', icon: '🌋', cd: 10, dmg: '30', desc: 'Leap into the air and crash down like a meteor. Breaks guard.', run: emberMeteor },
    ],
    ult: { name: 'Inferno Awakening', icon: '👹', dmg: '60', desc: 'Cinematic fire explosion, then +30% damage for 10 seconds.', run: emberUlt },
  },
  {
    name: 'Gale (Anemo)', color: 0x1fa58a, hair: 0xe9edf2, fx: 0x9fffe6, jump: 12, cds: [0, 0, 0, 0],
    skills: [
      { name: 'Gale Step', icon: '💨', cd: 4, dmg: '10', desc: 'Blink forward on the wind, knocking enemies into the air.', run: galeStep },
      { name: 'Cyclone', icon: '🌪️', cd: 9, dmg: '4/tick + 12', desc: 'Summon a tornado that pulls enemies in, lifts them, then bursts.', run: galeCyclone },
      { name: 'Wind Blades', icon: '🍃', cd: 6, dmg: '5 × 9', desc: 'Fire a fan of five piercing wind crescents.', run: galeBlades },
      { name: 'Sky Breaker', icon: '⚡', cd: 11, dmg: '10 + 28', desc: 'Launch everyone nearby into the sky, then dive-bomb them. Breaks guard.', run: galeSky },
    ],
    ult: { name: 'Tempest Sovereign', icon: '🌀', dmg: '6/tick + 40', desc: 'Cinematic giant tornado that drags in everything around you.', run: galeUlt },
  },
  {
    name: 'Tide (Hydro)', color: 0x2a7ab8, hair: 0x0c2f4a, fx: 0x5fc9f3, jump: 9, cds: [0, 0, 0, 0],
    skills: [
      { name: 'Tide Dash', icon: '🌊', cd: 5, dmg: '14', desc: 'Dash through enemies in a rush of water, pulling them along.', run: tideDash },
      { name: 'Geyser Burst', icon: '⛲', cd: 7, dmg: '18', desc: 'Erupting geyser launches enemies skyward. Breaks guard.', run: tideGeyser },
      { name: 'Water Jet Barrage', icon: '💦', cd: 8, dmg: '3 × 11', desc: 'Fire three piercing jets of pressurized water where you aim.', run: tideJets },
      { name: 'Tsunami Slam', icon: '🌀', cd: 10, dmg: '30', desc: 'Leap and crash down in a wave of water. Breaks guard.', run: tideTsunami },
    ],
    ult: { name: 'Tidal Sovereign', icon: '🌊', dmg: '60', desc: 'Cinematic tidal explosion, then +30% damage for 10 seconds.', run: tideUlt },
  },
  {
    name: 'Terra (Geo)', color: 0x8a6a46, hair: 0x3a2b1a, fx: 0xb8a88a, jump: 8, cds: [0, 0, 0, 0],
    skills: [
      { name: 'Boulder Charge', icon: '🪨', cd: 5, dmg: '15', desc: 'Charge through enemies like a rolling boulder.', run: terraCharge },
      { name: 'Stone Fist', icon: '👊', cd: 7, dmg: '19', desc: 'Earthen uppercut that launches enemies skyward. Breaks guard.', run: terraFist },
      { name: 'Rock Barrage', icon: '🌑', cd: 8, dmg: '3 × 12', desc: 'Hurl three heavy stones where you aim.', run: terraBarrage },
      { name: 'Ground Pound', icon: '⛰️', cd: 10, dmg: '32', desc: 'Leap and slam down with crushing force. Breaks guard.', run: terraPound },
    ],
    ult: { name: 'Terra Sovereign', icon: '🗿', dmg: '62', desc: 'Cinematic earthquake explosion, then +30% damage for 10 seconds.', run: terraUlt },
  },
];
let charIdx = 0;
let unlockedCharIndices = [0, 1]; // the primary/secondary pair chosen at class select; T switches only within this pair

// =====================================================================
// PLAYER
// =====================================================================
const P = makeHumanoid({ outfit: characters[0].color, hair: characters[0].hair });
const player = P.root;
const swordGrip = new THREE.Group();
swordGrip.position.copy(P.armR.end.position);
swordGrip.rotation.x = 1.0;
P.armR.pivot.add(swordGrip);
mesh(new THREE.BoxGeometry(0.06, 0.04, 1.0), new THREE.MeshStandardMaterial({ color: 0xe6e9ee, metalness: 0.6, roughness: 0.3 }), swordGrip).position.z = 0.55;
mesh(new THREE.BoxGeometry(0.26, 0.06, 0.06), 0xc9a227, swordGrip).position.z = 0.05;
swordGrip.visible = false; // nobody starts armed — whether you get a weapon at all depends on your birth roll

// =====================================================================
// INVENTORY: a worn backpack (visible on the back), a contents panel (I to
// open), and a separate "Drop bag" action — dropping is distinct from just
// looking at what's inside.
// =====================================================================
const backpack = new THREE.Group();
backpack.position.set(0, 1.35, -0.26);
mesh(new THREE.BoxGeometry(0.34, 0.42, 0.18), 0x5a4530, backpack);
mesh(new THREE.BoxGeometry(0.28, 0.14, 0.05), 0x4a3824, backpack).position.set(0, 0.1, -0.1);
for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), 0x3a2c1c, backpack).position.set(s * 0.14, 0.05, 0.1);
P.rig.add(backpack);
let hasBag = true, inventory = [
  { name: 'Water bottle', icon: '💧' },
  { name: 'Snack bar', icon: '🍫' },
];
function renderInventory() {
  const box = $('inventoryList'); box.innerHTML = '';
  if (!hasBag) { box.innerHTML = '<div class="sub">You dropped your bag — nothing to carry anything in.</div>'; return; }
  if (!inventory.length) { box.innerHTML = '<div class="sub">Empty.</div>'; return; }
  for (const it of inventory) {
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `<span style="font-size:20px">${it.icon}</span><span style="flex:1">${it.name}</span>`;
    box.appendChild(row);
  }
}
let inventoryOpen = false;
function toggleInventory(open) {
  if (freeMouse) { freeMouse = false; $('mouseHint').style.display = 'none'; $('crosshair').style.display = ''; }
  if (open && boardOpen) { boardOpen = false; $('board').style.display = 'none'; }
  if (open && settingsOpen) { settingsOpen = false; $('settingsPanel').style.display = 'none'; }
  inventoryOpen = open;
  $('inventoryPanel').style.display = open ? 'block' : 'none';
  if (open) { renderInventory(); document.exitPointerLock(); locked = false; }
  else requestGameControl();
}

const SPAWN = new THREE.Vector3(HOME.x, CURB, 14);
player.position.copy(SPAWN);
const DEFAULT_SPAWN=SPAWN.clone();
const roomChat=createRoomChat({client:supabase,name:()=>playerUsername||'Player',alignment:playerAlignment,playerState:()=>({position:player.position.toArray(),yaw:player.rotation.y,classIndex:charIdx}),onPlayer:data=>onlinePlayers?.receive(data),onPlayerLeft:id=>onlinePlayers?.remove(id),onClearPlayers:()=>onlinePlayers?.clear(),pause(){locked=false;mouseHeld=false;document.exitPointerLock();$('start').style.display='none';},resume:()=>requestGameControl()});
const hosting=createHosting({client:supabase,onRoomJoined:room=>roomChat.start(room),onRoomLeft:()=>roomChat.stop(),beforeRoomLeave:()=>onlineAccount?.save(),toast,setSpawn(city){SPAWN.set(city.x,groundY(city.x,city.z),city.z);},resetSpawn(){SPAWN.copy(DEFAULT_SPAWN);}});

let vy = 0, onGround = true;
const pvel = new THREE.Vector3();          // knockback velocity
let playerStun = 0, iFrames = 0, playerBlocking = false, awaken = 0, drownWarned = false;
let action = null;                          // the move currently being performed
let comboIdx = 0, lastM1 = 0, m1Cd = 0, dashCd = 0, mouseHeld = false;
const stats = { hp: 100, hunger: 80, energy: 80, ult: 0, gold: 0 };
let kills = 0;

// =====================================================================
// PROGRESSION (XP, levels, stat points)
// =====================================================================
const STAT_INFO = {
  str: { name: 'Strength', desc: '+3 M1 damage, +10% skill damage' },
  def: { name: 'Defence', desc: '+15 max health, take 6% less damage' },
  agi: { name: 'Agility', desc: '+6% movement speed' },
  men: { name: 'Mental', desc: 'Psychic power: stronger Psychic Grip (R), grab more targets, faster ultimate charge' },
};
const prog = { level: 1, xp: 0, points: 0, str: 0, def: 0, agi: 0, men: 0 };

// =====================================================================
// ACCOUNT + BIRTH ONBOARDING
// Sign up/log in with Supabase (real auth, hashed passwords server-side —
// nothing sensitive ever sits in localStorage). Each account gets exactly
// one birth roll, ever; the result is stored in the `profiles` table, keyed
// to that account and locked by row-level security so no one can read or
// forge another player's row from the network tab or DevTools.
// =====================================================================
let origin = null;

function rollDieFace(n) {
  const rot = { 1: 'rotateX(0deg) rotateY(0deg)', 6: 'rotateY(180deg)', 2: 'rotateY(-90deg)',
                5: 'rotateY(90deg)', 3: 'rotateX(-90deg)', 4: 'rotateX(90deg)' };
  return rot[n] || rot[1];
}

function showAuthScreen() {
  return new Promise(resolve => {
    $('auth').style.display = 'flex';
    $('start').style.display = 'none';
    let mode = 'signup';
    const title = $('authTitle'), btn = $('authBtn'), switchEl = $('authSwitch'), err = $('authError'), confirmBanner = $('authConfirmBanner'), forgot = $('authForgot');
    function setMode(m) {
      mode = m;
      confirmBanner.style.display = 'none';
      title.textContent = m === 'signup' ? 'Start your story' : 'Welcome back';
      $('authPass').autocomplete = m === 'signup' ? 'new-password' : 'current-password';
      $('authSubtitle').textContent = m === 'signup' ? 'Create your account, discover your beginnings, then step into the world.' : 'Log in to your account and step back into Ashford.';
      btn.textContent = m === 'signup' ? 'Create account' : 'Continue your story';
      switchEl.textContent = m === 'signup' ? 'Already have an account? Log in' : "Don't have an account? Sign up";
      // Signup still needs a real email (for confirmation); login accepts either, since
      // a username already uniquely resolves to one account via email_for_username().
      $('authEmailLabel').textContent = m === 'signup' ? 'Email address' : 'Username or email';
      $('authEmail').type = m === 'signup' ? 'email' : 'text';
      $('authEmail').placeholder = m === 'signup' ? 'you@example.com' : 'Your username or email';
      $('authEmail').autocomplete = m === 'signup' ? 'email' : 'username';
      // Username/gender only matter at signup; forgot-password only matters when logging in.
      for (const id of ['authUsernameLabel', 'authUsername', 'authGenderLabel', 'authGender']) $(id).style.display = m === 'signup' ? '' : 'none';
      forgot.style.display = m === 'login' ? 'block' : 'none';
    }
    setMode('signup');
    switchEl.addEventListener('click', () => setMode(mode === 'signup' ? 'login' : 'signup'));
    // Login accepts a username or an email in the same box. A real email always logs
    // in directly; anything else is looked up via email_for_username() first.
    async function resolveLoginEmail(value) {
      if (value.includes('@')) return { email: value };
      const { data, error } = await supabase.rpc('email_for_username', { p_username: value });
      if (error) return { error: 'Username login needs the usernames SQL section applied in Supabase.' };
      if (!data) return { error: 'No account found with that username.' };
      return { email: data };
    }
    $('authGuest').addEventListener('click', () => {
      let guestId = localStorage.getItem('guestId');
      if (!guestId) { guestId = 'guest-' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('guestId', guestId); }
      $('auth').style.display = 'none';
      resolve({ user: { id: guestId, email: null, isGuest: true } });
    });
    $('authContact').addEventListener('click', () => { $('contactModal').style.display = 'flex'; });
    $('contactClose').onclick = () => { $('contactModal').style.display = 'none'; };   // wired here too since showMenu() (which also sets this) hasn't run yet pre-login
    forgot.addEventListener('click', async () => {
      const typed = $('authEmail').value.trim();
      err.textContent = '';
      if (!typed) { err.textContent = 'Type your username or email above first, then tap "Forgot password?" again.'; return; }
      forgot.disabled = true; const label = forgot.textContent; forgot.textContent = 'Sending…';
      try {
        const resolved = await resolveLoginEmail(typed);
        if (resolved.error) { err.textContent = resolved.error; }
        else {
          const { error } = await supabase.auth.resetPasswordForEmail(resolved.email, { redirectTo: location.origin + '/reset-password.html' });
          err.textContent = error ? error.message : '';
          confirmBanner.textContent = '📧 CHECK YOUR EMAIL FOR A RESET LINK';
          confirmBanner.style.display = error ? 'none' : 'block';
        }
      } catch { err.textContent = 'Could not connect. Check your connection and try again.'; }
      forgot.disabled = false; forgot.textContent = label;
    });
    $('authForm').addEventListener('submit', async e => {
      e.preventDefault();
      if (btn.disabled) return;
      const typed = $('authEmail').value.trim(), password = $('authPass').value;
      const username = $('authUsername').value.trim(), gender = $('authGender').value;
      err.textContent = ''; confirmBanner.style.display = 'none';
      if (!typed || password.length < 6) { err.textContent = mode === 'signup' ? 'Enter an email and a password of at least 6 characters.' : 'Enter your username (or email) and password.'; return; }
      if (mode === 'signup' && !username) { err.textContent = 'Pick a username.'; return; }
      btn.disabled = true; btn.textContent = 'Please wait…';
      let data, error, email = typed;
      try {
        if (mode === 'signup') {
          ({ data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + '/confirm.html', data: { username, gender: gender || null } } }));
          if (error && /usernames_pkey|usernames.*duplicate|duplicate key.*username/i.test(error.message)) error = { message: 'That username is already taken — try another.' };
        } else {
          const resolved = await resolveLoginEmail(typed);
          if (resolved.error) error = { message: resolved.error };
          else ({ data, error } = await supabase.auth.signInWithPassword({ email: resolved.email, password }));
        }
      }
      catch { error = { message: 'Could not connect. Check your connection and try again.' }; }
      btn.disabled = false; btn.textContent = mode === 'signup' ? 'Create account' : 'Continue your story';
      if(mode==='signup'){const duplicate=duplicateEmailMessage(data,error);if(duplicate){setMode('login');$('authEmail').value=email;err.textContent=duplicate;return;}}
      if (error) { err.textContent = verificationEmailMessage(error) || error.message; return; }
      if (mode === 'signup' && !data.session) {
        // Don't make them retype everything: switch straight to the login form, email
        // already filled in, so coming back to this tab after confirming is one click.
        setMode('login');
        $('authEmail').value = email;
        confirmBanner.textContent = '📧 GO TO YOUR EMAIL AND CONFIRM';
        confirmBanner.style.display = 'block';
        return;
      }
      $('auth').style.display = 'none';
      resolve(data.session);
    });
  });
}

async function signOutAndReload() {
  if(onlinePlayReady&&hosting.room)try{await onlineAccount.save();await hosting.prepareReload();}catch(e){toast('Could not save online progress: '+e.message);return;}
  // Guest progress is saved under guestId — clearing it here (as earlier code
  // did) orphaned that save permanently, since a guest has no account to log
  // back into and reclaim it. Leave it alone so "Continue" still finds it.
  try { await supabase.auth.signOut(); } catch {}
  location.reload();
}
async function loadOrCreateProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  if (data) {
    origin = {
      roll: data.roll, family: data.family, backstory: data.backstory, stats: data.stats, perk: data.perk,
      wealthTier: data.wealth_tier || 'working', housing: data.housing || 'A small rented room',
      startingGold: data.starting_gold ?? 100, maxHealth: data.max_health ?? 100, weapon: data.weapon || null,
    };
    prog.points += data.points || 0;
    stats.gold = data.current_gold ?? origin.startingGold;
    stats.hp = maxHp();
    swordGrip.visible = !!origin.weapon;
    return true; // already born — skip the dice roll
  }
  return false;
}

// =====================================================================
// CLASS SELECT: shown once per new life. Fire and Air are real, built
// characters (Ember/Gale) with full skill kits. Everything else here is
// honestly marked "coming soon" — Water and Rock don't have skill kits
// built yet, and the named specials are locked behind future quests that
// don't exist in the game yet either.
// =====================================================================
const CLASS_DEFS = [
  { key: 'fire', name: 'Fire', icon: '🔥', playable: true, charIndex: 0 },
  { key: 'water', name: 'Water', icon: '💧', playable: true, charIndex: 2 },
  { key: 'air', name: 'Air', icon: '💨', playable: true, charIndex: 1 },
  { key: 'rock', name: 'Rock', icon: '🪨', playable: true, charIndex: 3 },
  { key: 'poison', name: 'Poison', icon: '☠️', locked: true },
  { key: 'lightning', name: 'Lightning', icon: '⚡', locked: true },
  { key: 'thunder', name: 'Thunder', icon: '🌩️', locked: true },
  { key: 'metal', name: 'Metal', icon: '⚙️', locked: true },
  { key: 'blood', name: 'Blood', icon: '🩸', locked: true },
  { key: 'void', name: 'Void', icon: '🕳️', locked: true },
  { key: 'light', name: 'Light', icon: '✨', locked: true },
  { key: 'darkness', name: 'Darkness', icon: '🌑', locked: true },
  { key: 'time', name: 'Time', icon: '⏳', locked: true },
  ...Array.from({ length: 10 }, (_, i) => ({ key: 'soon' + i, name: '???', icon: '❔' })),
];
function showClassSelect(options={}) {
  $('classSelect').querySelector('h1').textContent=options.online?'Choose Your Permanent Class':'Choose Your Elements';
  return new Promise(resolve => {
    $('classSelect').style.display = 'flex';
    const grid = $('classGrid');
    grid.innerHTML = CLASS_DEFS.map((c, i) => `
      <div class="class-card ${c.playable ? 'playable' : 'disabled'}" data-i="${i}">
        ${c.locked ? '<div class="lk">🔒</div>' : `<div class="ico">${c.icon}</div>`}
        <div class="nm">${c.name}</div>
        <div class="st">${c.playable ? 'Ready' : c.locked ? 'Locked' : 'Coming soon'}</div>
      </div>`).join('');
    let primary = null, secondary = null,savingChoice=false;
    const refresh = () => {
      grid.querySelectorAll('.class-card').forEach(card => {
        const def = CLASS_DEFS[Number(card.dataset.i)];
        card.classList.toggle('selected-primary', def === primary);
        card.classList.toggle('selected-secondary', def === secondary);
      });
      $('classSub').textContent = !primary ? 'Pick a primary element, then a secondary — you can switch between the two in-game with T. Most are still being built; only ones marked ready can be picked.'
        : !secondary ? `Primary: ${primary.name}. Now pick a secondary element.` : `Primary: ${primary.name} · Secondary: ${secondary.name}`;
      if(options.online)$('classSub').textContent=primary?'Online class: '+primary.name+'. This choice is permanent for your account.':'Choose one permanent online class. You cannot change it later.';
      $('classConfirm').textContent=options.online?'Choose permanently':'Begin';
      $('classConfirm').disabled = savingChoice||!(primary&&(options.online||secondary));
    };
    grid.querySelectorAll('.class-card').forEach(card => card.addEventListener('click', () => {
      const def = CLASS_DEFS[Number(card.dataset.i)];
      if(savingChoice)return;if(options.online&&def.playable){primary=def;secondary=null;refresh();return;}
      if (!def.playable) { toast(def.locked ? `${def.name} is locked — complete a future quest to unlock it.` : `${def.name} isn't built yet — coming soon.`); return; }
      if (def === primary) { primary = secondary; secondary = null; }
      else if (def === secondary) { secondary = null; }
      else if (!primary) { primary = def; }
      else if (!secondary) { secondary = def; }
      else { primary = def; secondary = null; } // both already picked — start over with this as the new primary
      refresh();
    }));
    refresh();
    $('classConfirm').onclick = async() => {
      if(savingChoice||!primary||!options.online&&!secondary)return;
      if(options.online){savingChoice=true;refresh();try{const account=await options.saveChoice(primary.charIndex);charIdx=account.class_index;unlockedCharIndices=[charIdx];}catch(e){savingChoice=false;refresh();$('classSub').textContent='Class was not saved: '+e.message;return;}}else{unlockedCharIndices=[primary.charIndex,secondary.charIndex];charIdx=primary.charIndex;}
      const c = characters[charIdx];
      P.mats.outfit.color.set(c.color);
      P.mats.hair.color.set(c.hair);
      buildHotbar();
      $('classSelect').style.display = 'none';
      resolve();
    };
  });
}

// Turned off while the OpenAI account has no credits (every roll was silently
// falling back to the same static text, which read as "the AI stopped
// working"). Revisit this properly when building the real game — for now,
// new characters just start with a plain, fixed baseline, no dice, no API call.
const DICE_ENABLED = false;
function runSpawnScreen(userId, persist) {
  if (!DICE_ENABLED) {
    origin = {
      roll: null, family: null, backstory: null,
      stats: { confidence: 50, peace: 50, karma: 50, wisdom: 50 },
      perk: null, wealthTier: 'working', housing: 'A small rented room',
      startingGold: 150, maxHealth: 100, weapon: null,
    };
    stats.gold = origin.startingGold;
    stats.hp = maxHp();
    swordGrip.visible = false;
    return showClassSelect();
  }
  return new Promise(resolve => {
    $('spawn').style.display = 'flex';
    $('start').style.display = 'none';
    const dieEl = $('die'), btn = $('spawnBtn');
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = 'Rolling…';
      let spinTimer = setInterval(() => { dieEl.style.transform = rollDieFace(1 + Math.floor(Math.random() * 6)); }, 120);
      const roll = 1 + Math.floor(Math.random() * 6);
      const [res] = await Promise.all([
        (navigator.onLine?fetch('/api/generate-life', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ roll }) }):Promise.resolve(null))
          .then(r => r?.json()).catch(() => null),
        new Promise(r => setTimeout(r, 1400)),
      ]);
      clearInterval(spinTimer);
      dieEl.style.transform = rollDieFace(roll);
      const data = res && !res.error ? res : null;
      origin = {
        roll,
        family: data?.family || 'An unremembered family',
        backstory: data?.backstory || 'The details of your birth are lost, but you are here now, and that is what matters.',
        stats: data?.stats || { confidence: 50, peace: 50, karma: 50, wisdom: 50 },
        perk: data?.perk || 'A clean slate',
        wealthTier: data?.wealthTier || 'working',
        housing: data?.housing || 'A small rented room',
        startingGold: Number.isFinite(data?.startingGold) ? data.startingGold : 100,
        maxHealth: Number.isFinite(data?.maxHealth) ? data.maxHealth : 100,
        weapon: data?.startingWeapon && data.startingWeapon !== 'none' ? data.startingWeapon : null,
      };
      prog.points += roll;
      stats.gold = origin.startingGold;
      stats.hp = maxHp();
      swordGrip.visible = !!origin.weapon;
      // Solo play re-rolls a fresh life every time — nothing to save. The one-time,
      // permanent roll (saved to `profiles`) is reserved for hosting/joining a
      // persistent shared world, once that exists.
      if (persist) {
        const { error } = await supabase.from('profiles').insert({
          user_id: userId, roll, family: origin.family, backstory: origin.backstory, stats: origin.stats, perk: origin.perk,
          wealth_tier: origin.wealthTier, housing: origin.housing, starting_gold: origin.startingGold, max_health: origin.maxHealth, weapon: origin.weapon,
          points: roll,
        });
        if (error) console.error('Failed to save profile:', error.message);
      }
      $('spawnRoll').textContent = `You rolled a ${roll}`;
      $('spawnFam').textContent = origin.family;
      $('spawnBio').textContent = origin.backstory;
      $('spawnPerk').textContent = `Perk: ${origin.perk} · ${origin.housing} · Starting gold: ${origin.startingGold} · ${origin.weapon ? 'Weapon: ' + origin.weapon : 'Unarmed'}`;
      $('spawnResult').style.display = 'block';
    });
    $('beginBtn').addEventListener('click', () => { $('spawn').style.display = 'none'; showClassSelect().then(resolve); });
  });
}

// =====================================================================
// SOLO SAVE: localStorage, keyed per account, so "Offline mode" remembers
// your life (origin, level, gold, position) across reloads instead of
// re-rolling every time. "New game" explicitly wipes it and rolls fresh.
// =====================================================================
let soloMode = false, soloUserId = null, soloSaveTimer = 0;
const soloSaveKey = userId => 'aw_solo_save_' + userId;
function loadSolo(userId) { try { const raw = localStorage.getItem(soloSaveKey(userId)); return raw ? JSON.parse(raw) : null; } catch { return null; } }
function clearSolo(userId) { try { localStorage.removeItem(soloSaveKey(userId)); } catch {} }
function saveSolo() {
  if (!soloMode || !soloUserId) return true;
  try {
    localStorage.setItem(soloSaveKey(soloUserId), JSON.stringify({
      origin, prog, gold: stats.gold, charIdx, unlockedCharIndices,
      adventure:adventureServices?.snapshot(),cityServices:cityServices?.snapshot(),support: supportSkills?.snapshot(),supportCounters,heroDungeonKills,stats:{...stats},inventory,hasBag,dayTime,reconstructionDays,pitch,cameraView,monsterQuestKills,
      metro:metro?.snapshot(),sewer:sewers?.snapshot(),transport:transport?.snapshot(),sitting:sitting&&activeSitSpot?{x:activeSitSpot.x,z:activeSitSpot.z}:null,
      navy:navy?.snapshot(),intercityRail:intercityRail?.snapshot(),questState:cityLife?.quests.map(q=>({name:q.name,active:q.active,claimed:q.claimed,target:q.target})),space:spaceCentre?.snapshot(),
      driving:inCar&&driving?{kind:driving.kind,name:driving.name,ownedId:driving.ownedId,index:vehicles.indexOf(driving),position:driving.group.position.toArray(),rotation:driving.group.rotation.toArray(),health:driving.health,speed:driving.speed,alt:driving.alt}:null,
      dungeon:dungeon?{gate:{name:dungeon.gate.name,level:dungeon.gate.level,rank:dungeon.gate.rank,stars:dungeon.gate.stars,theme:dungeon.gate.theme,tier:dungeon.gate.tier,finalBoss:dungeon.gate.finalBoss,persistent:dungeon.gate.persistent},wave:dungeon.wave,waves:dungeon.waves,cleared:dungeon.cleared,nextT:dungeon.nextT,entryLevel:dungeon.entryLevel,secretBonus:dungeon.secretBonus,returnPos:dungeon.returnPos.toArray(),mobs:dungeon.mobs.map(m=>({type:m.type,level:m.level,hp:m.hp,alive:m.alive,position:m.root.position.toArray(),boss:m===dungeon.boss}))}:null,
      pos: { x: player.position.x, y: player.position.y, z: player.position.z }, yaw,
    }));
    return true;
  } catch {return false;}
}
function applySoloSave(save) {
  origin = save.origin;
  Object.assign(prog, save.prog);
  stats.gold = save.gold ?? 0;
  stats.hp = maxHp();
  swordGrip.visible = !!origin.weapon;
  if (Array.isArray(save.unlockedCharIndices) && save.unlockedCharIndices.length === 2) unlockedCharIndices = save.unlockedCharIndices;
  if (Number.isInteger(save.charIdx) && characters[save.charIdx]) {
    charIdx = save.charIdx;
    const c = characters[charIdx];
    P.mats.outfit.color.set(c.color);
    P.mats.hair.color.set(c.hair);
    buildHotbar();
  }
  if (save.pos) player.position.set(save.pos.x, save.pos.y, save.pos.z);
  if (typeof save.yaw === 'number') yaw = save.yaw;
  if(save.stats)Object.assign(stats,save.stats);if(Array.isArray(save.inventory))inventory=save.inventory;if(typeof save.hasBag==='boolean'){hasBag=save.hasBag;backpack.visible=hasBag;}
  if(Number.isFinite(save.dayTime))dayTime=save.dayTime;if(Number.isFinite(save.reconstructionDays))reconstructionDays=save.reconstructionDays;if(Number.isFinite(save.pitch))pitch=save.pitch;
  supportSkills?.restore(save.support);if(save.supportCounters)supportCounters=save.supportCounters;specialUnlocked=!!supportSkills?.equipped;buildHotbar();
  heroDungeonKills=save.heroDungeonKills||0;
  monsterQuestKills=save.monsterQuestKills||0;for(const q of cityLife?.quests||[]){const saved=save.questState?.find(s=>s.name===q.name);if(saved)Object.assign(q,saved);}
  navy?.restore(save.navy);intercityRail?.restore(save.intercityRail);spaceCentre?.restore(save.space);metro?.restore(save.metro);sewers?.restore(save.sewer);transport?.restore(save.transport);
  if(save.sitting){const seat=sitSpots.find(s=>s.x===save.sitting.x&&s.z===save.sitting.z&&!s.broken);if(seat)toggleSit(seat);}
  adventureServices?.restore(save.adventure);
  cityServices?.restore(save.cityServices);
  if(save.driving){const v=save.driving.ownedId?vehicles.find(v=>v.ownedId===save.driving.ownedId):vehicles[save.driving.index]?.kind===save.driving.kind?vehicles[save.driving.index]:null;if(v&&!v.disabled){v.group.position.fromArray(save.driving.position);v.group.rotation.fromArray(save.driving.rotation);v.health=save.driving.health??v.health;v.speed=save.driving.speed||0;if(save.driving.alt!=null)v.alt=save.driving.alt;driving=v;inCar=true;v.ai=null;activeDrivingControls={carMovement:controlPrefs.carMovement,drivingMode:controlPrefs.drivingMode};}}
  if(save.dungeon){const d=save.dungeon;dungeon={...d,returnPos:new THREE.Vector3().fromArray(d.returnPos),mobs:[],boss:null};applyTheme(d.gate.theme);for(const saved of d.mobs){if(!MONSTERS[saved.type])continue;const m=makeMonster(saved.type,saved.level,new THREE.Vector3().fromArray(saved.position));m.hp=saved.hp;m.alive=saved.alive;m.root.visible=saved.alive;m.respawn=saved.alive?0:Infinity;dungeon.mobs.push(m);if(saved.boss)dungeon.boss=m;}setGateColor(exitGate,d.cleared?0xffd166:0xffffff);}

}

function showMenu(hasSave) {
  return new Promise(resolve => {
    $('menu').style.display = 'block';
    if (hasSave) {
      $('menuOfflineLabel').textContent = 'Continue';
      $('menuOfflineSub').textContent = 'Pick up where you left off';
      $('menuNewGame').style.display = '';
    }
    $('menuOffline').onclick = () => { $('menu').style.display = 'none'; resolve(hasSave ? 'continue' : 'new'); };
    $('offlineInfoBtn').onclick = (e) => { e.stopPropagation(); const box = $('offlineInfoBox'); box.style.display = box.style.display === 'none' ? 'block' : 'none'; };
    $('menuNewGame').onclick = () => { $('menu').style.display = 'none'; resolve('new'); };
    $('menuHost').onclick = () => hosting.show('host',()=>{ $('menu').style.display='none'; resolve('host'); });
    $('menuJoin').onclick = () => hosting.show('join',()=>{ $('menu').style.display='none'; resolve('join'); });
    $('menuCreate').onclick = () => toast('Creating your own content is still in development — check back soon.');
    $('menuContact').onclick = () => { $('contactModal').style.display = 'flex'; };
    $('contactClose').onclick = () => { $('contactModal').style.display = 'none'; };
    $('menuSignout').onclick = () => signOutAndReload();
  });
}

let playerUsername = null;   // set once the user signs in/up; null for guests or if they skipped it
function offlinePlayerSession(){let id=localStorage.getItem('lastSoloPlayer')||localStorage.getItem('guestId');if(!id){id='guest-'+crypto.randomUUID();localStorage.setItem('guestId',id);}return {user:{id,isGuest:true}};}
async function boot() {
  let session=null;
  if(navigator.onLine){try{const result=await Promise.race([supabase.auth.getSession(),new Promise(resolve=>setTimeout(()=>resolve(null),8000))]);session=result?.data?.session||null;}catch{}}
  window.gameLoading?.hide();
  const activeSession = navigator.onLine?(session||await showAuthScreen()):offlinePlayerSession();
  alignmentUserId=activeSession.user.id;try{const role=JSON.parse(localStorage.getItem('alignment:'+alignmentUserId));if(role){heroDungeonKills=role.heroDungeonKills||0;villainKills=role.villainKills||0;isVillain=villainKills>0;}}catch{}
  playerUsername = activeSession.user.isGuest?(localStorage.getItem('lastPlayerName')||'Guest'):await requireUsername(supabase);
  if(!activeSession.user.isGuest)localStorage.setItem('lastPlayerName',playerUsername);
  try{const support=JSON.parse(localStorage.getItem('support:'+activeSession.user.id));if(support){supportSkills?.restore(support.skill);supportCounters=support.counters||supportCounters;monsterQuestKills=support.kills||monsterQuestKills;specialUnlocked=!!supportSkills?.equipped;buildHotbar();}}catch{}
  if (!activeSession.user.isGuest) supabase.from('logins').insert({ user_id: activeSession.user.id });
  const existingSave = loadSolo(activeSession.user.id);
  const restoringUpdate=sessionStorage.getItem('resumeAfterUpdate')===activeSession.user.id&&!!existingSave;sessionStorage.removeItem('resumeAfterUpdate');
  const mode = restoringUpdate?'continue':await showMenu(!!existingSave);
  window.gameLoading?.show(10,'Preparing your adventure...');
  if (mode === 'continue') {
    applySoloSave(existingSave);
    wanted = 0; pursuitBackupCooldown = 0;   // a reload should never resume with police already after you
  } else if (mode === 'new') {
    clearSolo(activeSession.user.id);
    window.gameLoading?.hide();
    await runSpawnScreen(activeSession.user.id, false);
    window.gameLoading?.show(35,'Creating your character data...');
  }
  if(mode==='host'||mode==='join'){
    let account=await onlineAccount.load();
    origin={roll:null,family:null,backstory:null,stats:{confidence:50,peace:50,karma:50,wisdom:50},perk:null,wealthTier:'working',housing:'Online resident',startingGold:150,maxHealth:100,weapon:null};
    stats.gold=150;stats.hp=maxHp();
    if(!account){window.gameLoading?.hide();await showClassSelect({online:true,saveChoice:index=>onlineAccount.claim(index)});account=onlineAccount.account;}
    charIdx=account.class_index;unlockedCharIndices=[charIdx];const c=characters[charIdx];P.mats.outfit.color.set(c.color);P.mats.hair.color.set(c.hair);swordGrip.visible=false;
    const onlineSave=account.progress||{};
    if(onlineSave.prog)Object.assign(prog,onlineSave.prog);if(onlineSave.stats)Object.assign(stats,onlineSave.stats);
    inventory=Array.isArray(onlineSave.inventory)?onlineSave.inventory:inventory;hasBag=onlineSave.hasBag??true;backpack.visible=hasBag;
    supportSkills.restore(onlineSave.support);supportCounters=onlineSave.supportCounters||{dungeons:0,bosses:0};monsterQuestKills=onlineSave.monsterQuestKills||0;
    heroDungeonKills=onlineSave.heroDungeonKills||0;villainKills=onlineSave.villainKills||0;isVillain=villainKills>0;specialUnlocked=!!supportSkills.equipped;
    adventureServices.restore(onlineSave.adventure);cityServices.restore({owned:onlineSave.ownedCars||[]});for(const q of cityLife.quests){const state=onlineSave.quests?.find(s=>s.name===q.name);if(state)Object.assign(q,state);}
    saveAlignment();persistSupportProgress();buildHotbar();player.position.copy(SPAWN);
  }
  if (mode === 'continue' || mode === 'new') { soloMode = true; soloUserId = activeSession.user.id;localStorage.setItem('lastSoloPlayer',soloUserId); }
  window.addEventListener('beforeunload', saveSolo);
  window.addEventListener('pagehide',saveSolo);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)saveSolo();});
  onlinePlayReady=mode==='host'||mode==='join';
  window.gameLoading?.show(60,'Preparing buildings, vehicles and textures...');
  await visualAssetsReady;
  window.gameLoading?.show(85,'Saving your progress...');
  if(soloMode&&!saveSolo())throw new Error('Unable to save progress on this device.');
  renderer.render(scene,camera);
  await window.gameLoading?.complete();
  $('start').style.display = 'flex';
  if(mobileControls?.mobile)requestGameControl();
  else {locked=true;freeMouse=true;$('start').style.display='none';$('mouseHint').textContent='Click the game to control the camera';$('mouseHint').style.display='block';renderer.domElement.addEventListener('click',()=>{setFreeMouse(false);requestGameControl();},{once:true});}
}
addEventListener('game-before-update',event=>{event.detail.waitUntil((async()=>{if(soloMode){if(!saveSolo())throw new Error('Solo progress could not be written to device storage');sessionStorage.setItem('resumeAfterUpdate',soloUserId);}else if(hosting.room){await onlineAccount?.save();await hosting.prepareReload();}})());});
boot().catch(error=>window.gameLoading?.fail(error.message));
const maxHp = () => (origin?.maxHealth ?? 100) + prog.def * 15;
const xpToNext = () => 50 + prog.level * 50;
// A roll of 1 drains hunger/energy 50% faster for this profile, forever; a roll of 6 drains 30% slower.
// This is the one lasting mechanical consequence of the birth roll — everything else from it is flavor text.
// Real consequence for starting homeless (destitute wealth tier, or housing text that
// says so): hunger/energy drain another 40% faster on top of the roll penalty — sleeping
// rough is harder than even a poor but housed start.
const isHomeless = () => origin && (origin.wealthTier === 'destitute' || /no fixed home|homeless|sleeps rough|shelter/i.test(origin.housing || ''));
const drainMul = () => (origin ? 1.6 - origin.roll * 0.1 : 1) * (isHomeless() ? 1.4 : 1);
const defMul = () => 1 / (1 + prog.def * 0.06);
const psyDmg = () => 10 + prog.men * 4;
const psyCdMax = () => Math.max(4, 9 - prog.men * 0.3);
const speedMul = () => (1 + prog.agi * 0.06) * CHEAT_SPEED_MULT*(supportSkills?.speedMultiplier||1);
// A weak start (low birth-roll confidence) hits for less; a strong one hits harder.
// confidence 0 -> 0.5x, confidence 55 (no origin yet) -> ~1x, confidence 100 -> 1.5x.
// Fighting bare-handed (no starting weapon) hits for 35% less than fighting armed.
const attackDmg = () => (6 + prog.str * 3) * (0.5 + (origin?.stats.confidence ?? 55) / 100) * (origin && !origin.weapon ? 0.65 : 1);
const S = n => n * (1 + prog.str * 0.1);            // scales skill damage by Strength
const dmgMul = () => awaken > 0 ? 1.3 : 1;

function gainXp(n) {
  prog.xp += n;
  while (prog.xp >= xpToNext()) {
    prog.xp -= xpToNext();
    prog.level++;
    prog.points += 3;
    stats.hp = maxHp();
    toast(`Level up! You are level ${prog.level}. Press C to spend points.`);
  }
  if (boardOpen) renderBoard();
}
function spendPoint(key) {
  if (prog.points <= 0) return;
  prog.points--;
  prog[key]++;
  if (key === 'def') stats.hp += 15;
  renderBoard();
}

// =====================================================================
// VEHICLES (your car, traffic, police, buses) + PLANES
// =====================================================================
const vehicles = [];
let driving = null, inCar = false, wanted = 0, pursuitBackupCooldown = 0, militaryAlert = 0;
let riding = null;   // a parkPets horse object currently being ridden
const policeLastSeen = new THREE.Vector3();
const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2cc, emissiveIntensity: 0.3 });
const tailMat = new THREE.MeshStandardMaterial({ color: 0x880000, emissive: 0xff2020, emissiveIntensity: 0.3 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x1c2833, roughness: 0.1, metalness: 0.5 });
const tyreMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
const hubMat = new THREE.MeshStandardMaterial({ color: 0xb0b4b8, metalness: 0.5, roughness: 0.4 });
const tyreGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.32, 10);
const sirenRed = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff0000, emissiveIntensity: 0 });
const sirenBlue = new THREE.MeshStandardMaterial({ color: 0x000055, emissive: 0x2060ff, emissiveIntensity: 0 });
const ambRed = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff0000, emissiveIntensity: 0 });
const ambWhite = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xffffff, emissiveIntensity: 0 });
const ambCrossMat = new THREE.MeshStandardMaterial({ color: 0xe84118, roughness: 0.5 });

function makeVehicle(kind, color) {
  const g = new THREE.Group();
  scene.add(g);
  const isBus = kind === 'bus', isTank = kind === 'tank';
  const L = isBus ? 9 : isTank ? 5.6 : 4.2, W = isBus ? 2.5 : isTank ? 2.7 : 2;
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35 });
  if (isTank) {
    mesh(new THREE.BoxGeometry(W, 0.9, L), paint, g).position.y = 0.75;   // hull
    const turret = mesh(new THREE.BoxGeometry(1.5, 0.6, 1.9), paint, g); turret.position.set(0, 1.5, -0.3);
    const barrel = mesh(new THREE.CylinderGeometry(0.1, 0.11, 3.2, 8), 0x2a2d26, turret); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0, -2.3);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.9 });
    for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.5, 0.65, L), trackMat, g).position.set(s * (W / 2 + 0.05), 0.4, 0);
    const wheels = [];
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(s * (W / 2 + 0.05), 0.4, L / 2 - 0.8 - i * (L - 1.2) / 3);
      g.add(pivot);
      const wheel = new THREE.Mesh(tyreGeo, tyreMat); wheel.rotation.z = Math.PI / 2; wheel.scale.set(0.8, 0.5, 0.8); pivot.add(wheel);
      wheels.push(pivot);
    }
    const v = { kind, group: g, wheels, speed: 0, radius: 2.6, length: L, maxSpeed: 26, ai: null, passengers: null };
    vehicles.push(v);
    return v;
  }
  if (isBus) {
    mesh(new THREE.BoxGeometry(W, 2.6, L), paint, g).position.y = 1.65;
    for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.04, 0.8, L - 1.2), glassMat, g).position.set(s * (W / 2 + 0.01), 2.2, -0.3);
    mesh(new THREE.BoxGeometry(W - 0.3, 1.0, 0.04), glassMat, g).position.set(0, 2.1, L / 2 + 0.01);
    mesh(new THREE.BoxGeometry(W + 0.02, 0.35, L + 0.02), 0xf2f2f2, g).position.y = 1.0;            // white stripe
    mesh(new THREE.BoxGeometry(0.05, 2.0, 1.2), glassMat, g).position.set(W / 2 + 0.02, 1.4, L / 2 - 1.5); // door (kerb side)
  } else {
    mesh(new RoundedBoxGeometry(W, 0.6, L, 2, .08), paint, g).position.y = 0.6;
    const cabin=mesh(new RoundedBoxGeometry(1.76,.62,2.1,2,.06),glassMat,g);cabin.position.set(0,1.2,-.25);const vertices=cabin.geometry.attributes.position;for(let i=0;i<vertices.count;i++)if(vertices.getY(i)>0){vertices.setX(i,vertices.getX(i)*.83);vertices.setZ(i,vertices.getZ(i)*.8);}vertices.needsUpdate=true;cabin.geometry.computeVertexNormals();
    mesh(new RoundedBoxGeometry(1.48,.08,1.65,1,.035),paint,g).position.set(0,1.52,-.25);
    mesh(new RoundedBoxGeometry(1.9,.18,1.15,1,.05),paint,g).position.set(0,.89,1.35);
    for (const z of [2.15, -2.15]) mesh(new THREE.BoxGeometry(2.04, 0.25, 0.2), 0x222222, g).position.set(0, 0.45, z);
  }
  for (const s of [-1, 1]) {
    mesh(new THREE.BoxGeometry(0.42, 0.15, 0.05), headMat, g).position.set(s * (W / 2 - 0.35), isBus ? 0.9 : 0.72, L / 2 + 0.01);
    mesh(new THREE.BoxGeometry(0.42, 0.12, 0.05), tailMat, g).position.set(s * (W / 2 - 0.35), isBus ? 0.9 : 0.72, -L / 2 - 0.01);
  }
  const wheels = [];
  for (const z of isBus ? [L / 2 - 1.6, -L / 2 + 1.8] : [1.3, -1.3]) for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * (W / 2 + 0.05), 0.4, z);
    g.add(pivot);
    const tyre = new THREE.Mesh(tyreGeo, tyreMat); tyre.rotation.z = Math.PI / 2; pivot.add(tyre);
    const hub = new THREE.Mesh(hubGeo, hubMat); hub.rotation.z = Math.PI / 2; pivot.add(hub);
    wheels.push(pivot);
  }
  if (kind === 'police') {
    mesh(new THREE.BoxGeometry(0.5, 0.15, 0.3), sirenRed, g).position.set(0.3, 1.6, -0.25);
    mesh(new THREE.BoxGeometry(0.5, 0.15, 0.3), sirenBlue, g).position.set(-0.3, 1.6, -0.25);
    mesh(new THREE.BoxGeometry(2.02, 0.12, 4.22), 0x1e3799, g).position.y = 0.7;
  }
  if (kind === 'ambulance') {
    mesh(new THREE.BoxGeometry(0.5, 0.15, 0.9), ambRed, g).position.set(0.3, 1.6, -0.25);
    mesh(new THREE.BoxGeometry(0.5, 0.15, 0.9), ambWhite, g).position.set(-0.3, 1.6, -0.25);
    for (const s of [-1, 1]) {
      const cross = new THREE.Group(); cross.position.set(s * (W / 2 + 0.005), 0.75, -0.25);
      cross.rotation.y = s * Math.PI / 2;
      mesh(new THREE.BoxGeometry(0.2, 0.7, 0.02), ambCrossMat, cross);
      mesh(new THREE.BoxGeometry(0.7, 0.2, 0.02), ambCrossMat, cross);
      g.add(cross);
    }
    mesh(new THREE.BoxGeometry(2.02, 0.12, 2.2), 0xcc2b2b, g).position.set(0, 0.7, -L / 2 + 1.1);
  }
  const v = { kind, group: g, wheels, speed: 0, radius: isBus ? 2.6 : 1.8, length: L,
              maxSpeed: isBus ? 24 : kind === 'police' || kind === 'ambulance' ? 85 : 75, ai: null, passengers: isBus ? [] : null };
  if(kind==='car'||kind==='police')detailVehicle(v,kind==='police'?'police':'standard');
  vehicles.push(v);
  return v;
}

// Road network: an intersection every 40m. Traffic drives on the LEFT, like in the UK.
const LANE = 3.6;
const nodePos = (i, j) => new THREE.Vector3(i * 40, 0, j * 40);
function nextNode(cur, prev) {
  const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([di, dj]) => [cur[0] + di, cur[1] + dj])
    .filter(([i, j]) => i >= -4 && i <= 4 && j >= -4 && j <= 4 && !(prev && i === prev[0] && j === prev[1]));
  return pick(opts);
}
const nearestNode = p => [clamp(Math.round(p.x / 40), -4, 4), clamp(Math.round(p.z / 40), -4, 4)];
function laneFrame(ai) {
  const A = nodePos(...ai.from);
  const dir = nodePos(...ai.to).sub(A).normalize();
  const left = new THREE.Vector3(dir.z, 0, -dir.x);
  const pos=A.clone().addScaledVector(dir,ai.s).addScaledVector(left,LANE);for(const [x,z]of ROUNDABOUT_CENTRES){const dx=pos.x-x,dz=pos.z-z,d=Math.hypot(dx,dz);if(d<6.5&&d>.01){pos.x=x+dx/d*6.5;pos.z=z+dz/d*6.5;}}return {A,dir,left,pos};
}

// Bus route (a loop of intersections) and the bus stops along it
const BUS_ROUTE = [[-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [2, 0], [2, 1], [1, 1], [0, 1], [-1, 1], [-2, 1], [-2, 0]];
const BUS_STOP_SEGS = [1, 4, 7, 10];
const busStops = [];
const busSignTex = makeTex(64, 48, g => {
  g.fillStyle = '#1e5bd8'; g.fillRect(0, 0, 64, 48);
  g.fillStyle = '#fff'; g.font = 'bold 22px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('BUS', 32, 25);
});
const shelterGlass = new THREE.MeshStandardMaterial({ color: 0xaad4ee, transparent: true, opacity: 0.35, roughness: 0.1 });
for (const seg of BUS_STOP_SEGS) {
  const A = nodePos(...BUS_ROUTE[seg]), B = nodePos(...BUS_ROUTE[(seg + 1) % BUS_ROUTE.length]);
  const dir = B.clone().sub(A).normalize(), left = new THREE.Vector3(dir.z, 0, -dir.x);
  const mid = A.clone().lerp(B, 0.5);
  const face = Math.atan2(-left.x, -left.z);   // shelter faces the road
  const g = new THREE.Group();
  g.position.copy(mid).addScaledVector(left, 6.0);
  g.position.y = CURB;
  g.rotation.y = face;
  scene.add(g);
  mesh(new THREE.BoxGeometry(3, 2.2, 0.06), shelterGlass, g).position.set(0, 1.2, -0.4);
  mesh(new THREE.BoxGeometry(3.2, 0.08, 1.0), poleMat, g).position.set(0, 2.35, -0.05);
  for (const x of [-1.5, 1.5]) mesh(new THREE.BoxGeometry(0.08, 2.35, 0.08), poleMat, g).position.set(x, 1.17, -0.4);
  mesh(new THREE.BoxGeometry(2.4, 0.08, 0.4), woodMatPlain, g).position.set(0, 0.45, -0.2);
  mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 6), poleMat, g).position.set(1.9, 1.4, 0.2);
  mesh(new THREE.BoxGeometry(0.6, 0.45, 0.05), new THREE.MeshStandardMaterial({ map: busSignTex }), g).position.set(1.9, 2.75, 0.2);
  g.updateMatrixWorld(true);
  const benchWorld = g.localToWorld(new THREE.Vector3(0, 0.45, -0.2));
  sitSpots.push({ x: benchWorld.x, z: benchWorld.z, yaw: face, seatY: benchWorld.y + 0.04, label: 'Sit on bench' });
  busStops.push({ seg, wait: mid.clone().addScaledVector(left, 5.4).setY(CURB), face, waiting: [] });
}

function spawnTraffic(kind, color, route) {
  const v = makeVehicle(kind, color);
  const idx = route ? Math.floor(Math.random() * route.length) : 0;
  const from = route ? route[idx] : [-4 + Math.floor(Math.random() * 9), -4 + Math.floor(Math.random() * 9)];
  const to = route ? route[(idx + 1) % route.length] : nextNode(from, null);
  v.ai = { from, to, prev: null, s: Math.random() * 30, cruise: kind === 'bus' ? 8 : 8 + Math.random() * 4, route, routeIdx: idx,
           stopTimer: 0, stopped: false, chasing: false, blockedT: 0, ignoreT: 0, ramCd: 0 };
  const f = laneFrame(v.ai);
  v.group.position.copy(f.pos);
  v.group.rotation.y = Math.atan2(f.dir.x, f.dir.z);
  return v;
}
const CAR_COLORS = [0x2e86de, 0xf5f6fa, 0x2d3436, 0xe17055, 0x00b894, 0xfdcb6e, 0x6c5ce7, 0xb2bec3, 0x0a3d62, 0x833471];
for (let i = 0; i < 14; i++) spawnTraffic('car', pick(CAR_COLORS));
for (let i = 0; i < 2; i++) spawnTraffic('police', 0xf5f6fa);
for (let i = 0; i < 2; i++) spawnTraffic('bus', 0x8b1a2b, BUS_ROUTE);

const myCar = makeVehicle('car', 0xd63031);    // your own car, parked on the drive
myCar.group.position.set(12.5, CURB, 9);
myCar.group.rotation.y = Math.PI;

const headlight = new THREE.SpotLight(0xfff2cc, 0, 45, 0.55, 0.6, 1.5);
scene.add(headlight, headlight.target);

// Planes circling over the city
const planes = [];
const planeMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.5, fog: false });
const planeTailMat = new THREE.MeshStandardMaterial({ color: 0x0652dd, roughness: 0.5, fog: false });
for (let i = 0; i < 3; i++) {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  add(new THREE.CylinderGeometry(1, 0.8, 16, 12), planeMat, 0, 0, 0).rotation.x = Math.PI / 2;
  add(new THREE.SphereGeometry(1, 12, 8), planeMat, 0, 0, 8).scale.z = 1.8;
  add(new THREE.BoxGeometry(20, 0.3, 3), planeMat, 0, 0, 0.5);
  add(new THREE.BoxGeometry(7, 0.25, 1.8), planeMat, 0, 0, -7);
  add(new THREE.BoxGeometry(0.25, 3.2, 2.4), planeTailMat, 0, 1.8, -7);
  const light = add(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3333, fog: false }), 0, 3.5, -7.5);
  scene.add(g);
  g.position.set(-665-i*26,1,-30);g.rotation.y=Math.PI/2;
  planes.push({ g, light, r: 160 + i * 50, h: 100 + i * 25, a: i * 2.1, spd: (0.05 + i * 0.01) * (i % 2 ? -1 : 1) });
}
// =====================================================================
// HARBOUR: sea to the south, a beach, a pier, ships sailing past, and a boat you can drive
// =====================================================================
const SEA_Z = 187;
const PIER = new THREE.Vector3(20, CURB, 200);
const beach = mesh(new THREE.PlaneGeometry(600, SEA_Z - 165), sandMat);
beach.rotation.x = -Math.PI / 2;
beach.position.set(0, 0.01, (165 + SEA_Z) / 2);
beach.castShadow = false;
const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 900 - SEA_Z), new THREE.MeshStandardMaterial({ color: 0x2a7ab8, roughness: 0.15, metalness: 0.1 }));
sea.rotation.x = -Math.PI / 2;
sea.position.set(0, 0.03, (SEA_Z + 900) / 2);
sea.receiveShadow = true;
scene.add(sea);
box(4, 0.3, 41, PIER.x, 0, 185.5, woodMatPlain, false);
for (let z = 168; z <= 204; z += 4) for (const s of [-1, 1]) box(0.25, 1.2, 0.25, PIER.x + s * 1.9, -0.3, z, 0x5a3d26, false);
// Water can be entered from any beach edge or dock.

// =====================================================================
// BRIDGE + RIVERSIDE: a drivable crossing over the water to a second,
// smaller settlement on the far shore. groundY() already carves out the
// deck's footprint from the "always drown" water zone above.
// =====================================================================
function signboard(text, x, y, z, width = 10, colour = '#15364a') {
  const texture = makeTex(1024, 128, g => {
    g.fillStyle = colour; g.fillRect(0, 0, 1024, 128);
    g.fillStyle = '#ffffff'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 512, 64, 970);
  });
  const mat = new THREE.MeshBasicMaterial({ map: texture });
  const geo = new THREE.PlaneGeometry(width, width / 8);
  const front = new THREE.Mesh(geo, mat); front.position.set(x, y, z); scene.add(front);
  const back = new THREE.Mesh(geo, mat); back.position.set(x, y, z); back.rotation.y = Math.PI; scene.add(back);
}
{
  const midZ = (BRIDGE_Z0 + BRIDGE_Z1) / 2, len = BRIDGE_Z1 - BRIDGE_Z0;
  // The middle stretch is a real bascule lift (two leaves on four posts) that
  // raises for ship traffic — see updateBridgeLift(). Everything outside the
  // gap is a normal fixed deck.
  box(BRIDGE_HALF_W * 2, 0.6, GAP0 - BRIDGE_Z0, BRIDGE_X, BRIDGE_Y - 0.3, (BRIDGE_Z0 + GAP0) / 2, 0x5c5c5c, false);
  box(BRIDGE_HALF_W * 2, 0.6, BRIDGE_Z1 - GAP1, BRIDGE_X, BRIDGE_Y - 0.3, (GAP1 + BRIDGE_Z1) / 2, 0x5c5c5c, false);
  const leafLen = (GAP1 - GAP0) / 2, leafGeo = new THREE.BoxGeometry(BRIDGE_HALF_W * 2, 0.6, leafLen), leafMat = new THREE.MeshStandardMaterial({ color: 0x5c5c5c });
  bridgeLeafNorth = new THREE.Group(); bridgeLeafNorth.position.set(BRIDGE_X, BRIDGE_Y - 0.3, GAP0); scene.add(bridgeLeafNorth);
  const leafNorthMesh = new THREE.Mesh(leafGeo, leafMat); leafNorthMesh.position.z = leafLen / 2; bridgeLeafNorth.add(leafNorthMesh);
  bridgeLeafSouth = new THREE.Group(); bridgeLeafSouth.position.set(BRIDGE_X, BRIDGE_Y - 0.3, GAP1); scene.add(bridgeLeafSouth);
  const leafSouthMesh = new THREE.Mesh(leafGeo, leafMat); leafSouthMesh.position.z = -leafLen / 2; bridgeLeafSouth.add(leafSouthMesh);
  // Four posts, hazard-striped red/white — standing in the way isn't blocked, it's just a warning.
  const postMat = new THREE.MeshStandardMaterial({ color: 0xb8302a, emissive: 0x4a0000, emissiveIntensity: 0.5, roughness: 0.4 });
  for (const pz of [GAP0, GAP1]) for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 9, 10), postMat);
    post.position.set(BRIDGE_X + side * (BRIDGE_HALF_W + 1), BRIDGE_Y + 4, pz); scene.add(post);
    bridgePostLights.push(post.material);
    for (let y = 1; y < 8; y += 1.6) box(0.47, 0.5, 0.47, post.position.x, BRIDGE_Y + y, pz, y % 3.2 < 1.6 ? 0xffffff : 0xb8302a, false);
  }
  // Amber warning strips at both approach edges of the gap — lit up while the bridge isn't flat.
  for (const pz of [GAP0 - 1.5, GAP1 + 1.5]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(BRIDGE_HALF_W * 2 - 1, 0.8), new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0 }));
    strip.rotation.x = -Math.PI / 2; strip.position.set(BRIDGE_X, BRIDGE_Y + 0.05, pz); scene.add(strip);
    bridgeWarnStrips.push(strip);
  }
  for (const side of [-1, 1]) {
    box(0.3, 1.1, len, BRIDGE_X + side * (BRIDGE_HALF_W - 0.2), BRIDGE_Y + 0.55, midZ, 0x3a3f45, false);
    // Thin collider strip along each railing so you can't walk/drive off the edge into the water.
    colliders.push({ minX: BRIDGE_X + side * (BRIDGE_HALF_W - 0.1) - 0.2, maxX: BRIDGE_X + side * (BRIDGE_HALF_W - 0.1) + 0.2, minZ: BRIDGE_Z0, maxZ: BRIDGE_Z1 });
    for (let z = BRIDGE_Z0 + 10; z < BRIDGE_Z1; z += 24) addLampSpot(BRIDGE_X + side * (BRIDGE_HALF_W - 0.7), BRIDGE_Y, z);
  }
  for (let z = BRIDGE_Z0 + 30; z < BRIDGE_Z1; z += 60) for (const side of [-1, 1])
    box(1.4, 15, 1.4, BRIDGE_X + side * 4, BRIDGE_Y - 7.5, z, 0x6d6d6d, false);
  signboard('RIVER BRIDGE — MERGE AHEAD', BRIDGE_X, BRIDGE_Y + 2.2, BRIDGE_Z0 - 3, 10);
}
const BRIDGE_CYCLE = 90, BRIDGE_RAISE_TIME = 4, BRIDGE_STAY_UP = 16, BRIDGE_MAX_ANGLE = Math.PI / 2.15;
function updateBridgeLift(dt) {
  bridgeLiftT += dt;
  if (bridgeLiftState === 'down' && (ships.concat(vehicles.filter(v=>v.kind==='boat').map(v=>({x:v.group.position.x,z:v.group.position.z,length:v.length}))).some(s=>shipNeedsBridge(s,BRIDGE_X,GAP0,GAP1))||navy?.vessels.some(v=>v.depth<5&&shipNeedsBridge({x:v.g.position.x,z:v.g.position.z,length:v.length},BRIDGE_X,GAP0,GAP1)))) { bridgeLiftState = 'raising'; bridgeLiftT = 0; toast('A ship is approaching — the bridge is raising!'); }
  else if (bridgeLiftState === 'raising' && bridgeLiftT > BRIDGE_RAISE_TIME) { bridgeLiftState = 'up'; bridgeLiftT = 0; }
  else if (bridgeLiftState === 'up' && bridgeLiftT > BRIDGE_STAY_UP && !ships.concat(vehicles.filter(v=>v.kind==='boat').map(v=>({x:v.group.position.x,z:v.group.position.z,length:v.length}))).some(s=>shipNeedsBridge(s,BRIDGE_X,GAP0,GAP1))&&!navy?.vessels.some(v=>v.depth<5&&shipNeedsBridge({x:v.g.position.x,z:v.g.position.z,length:v.length},BRIDGE_X,GAP0,GAP1))) { bridgeLiftState = 'lowering'; bridgeLiftT = 0; }
  else if (bridgeLiftState === 'lowering' && bridgeLiftT > BRIDGE_RAISE_TIME) { bridgeLiftState = 'down'; bridgeLiftT = 0; toast('The bridge has lowered — the road is clear.'); }
  bridgeLiftAngle = bridgeLiftState === 'raising' ? (bridgeLiftT / BRIDGE_RAISE_TIME) * BRIDGE_MAX_ANGLE
    : bridgeLiftState === 'up' ? BRIDGE_MAX_ANGLE
    : bridgeLiftState === 'lowering' ? (1 - bridgeLiftT / BRIDGE_RAISE_TIME) * BRIDGE_MAX_ANGLE : 0;
  for(const b of liftPlaneBlocks){b.top=BRIDGE_Y+Math.sin(bridgeLiftAngle)*8+.4;if(b.side===1)b.maxZ=GAP0+Math.cos(bridgeLiftAngle)*8;else b.minZ=GAP1-Math.cos(bridgeLiftAngle)*8;}
  if (bridgeLeafNorth) { bridgeLeafNorth.rotation.x = -bridgeLiftAngle; bridgeLeafSouth.rotation.x = bridgeLiftAngle; }
  const warn = bridgeLiftState !== 'down';
  const pulse = warn ? 0.5 + Math.sin(performance.now() / 150) * 0.5 : 0;
  for (const m of bridgePostLights) m.emissiveIntensity = 0.5 + pulse * 2.5;
  for (const s of bridgeWarnStrips) s.material.opacity = pulse * 0.85;
}
// Ship control office at the bridge's north corner — real ships need the channel
// kept clear, so this is where passage requests would be handled.
{
  const ox = BRIDGE_X + BRIDGE_HALF_W + 7, oz = BRIDGE_Z0 + 6;
  box(6, 4.5, 6, ox, 2.25, oz, 0xdfe6ea);
  box(6.4, 0.3, 6.4, ox, 4.65, oz, 0x3a4652, false);
  signboard('BRIDGE CONTROL OFFICE', ox, 5.2, oz - 3.1, 7);
  interactables.push({ pos: new THREE.Vector3(ox, 0, oz - 3.5), r: 2.5, label: 'Check bridge control office',
    action: () => toast('No ships currently require passage — the channel is clear.') });
}
// Riverside: a smaller, gated settlement across the bridge for the ultra-rich —
// built with the same generators as the main town so it's consistent in style,
// just smaller, fenced off, and with pale stone paving instead of lawn (the
// green read too much like the sea from a distance).
const marbleMat = new THREE.MeshStandardMaterial({ color: 0xe4ddc9, roughness: 0.55 });
for (let cx = -2; cx <= 1; cx++) for (let cz = 16; cz <= 18; cz++) {
  if(cz===18&&[-2,-1,1].includes(cx)||cx===1&&cz===16)continue;
  const x0 = cx * 40 + 20, z0 = cz * 40 + 20;
  pavement(x0, z0, marbleMat);
  for (const [ox, oz] of [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]]) {
    if (rand() < 0.15) { addTree(x0 + ox, z0 + oz, 1.2); continue; }
    addBuilding(x0 + ox, z0 + oz, Math.sign(ox), Math.sign(oz));
  }
}
// Perimeter wall with a single gated entrance lined up with the bridge.
{
  const gateHalf = 6, wallH = 3, wallMatRiver = 0xcfc6ab;
  // north wall, split either side of the gate
  box((RIVERSIDE_X1 - RIVERSIDE_X0) / 2 - gateHalf, wallH, 0.6, (RIVERSIDE_X0 - gateHalf) / 2, wallH / 2, RIVERSIDE_Z0, wallMatRiver);
  box((RIVERSIDE_X1 - RIVERSIDE_X0) / 2 - gateHalf, wallH, 0.6, (RIVERSIDE_X1 + gateHalf) / 2, wallH / 2, RIVERSIDE_Z0, wallMatRiver);
  box(0.6, wallH, RIVERSIDE_Z1 - RIVERSIDE_Z0, RIVERSIDE_X0, wallH / 2, (RIVERSIDE_Z0 + RIVERSIDE_Z1) / 2, wallMatRiver);
  box(0.6, wallH, RIVERSIDE_Z1 - RIVERSIDE_Z0, RIVERSIDE_X1, wallH / 2, (RIVERSIDE_Z0 + RIVERSIDE_Z1) / 2, wallMatRiver);
  box(RIVERSIDE_X1 - RIVERSIDE_X0, wallH, 0.6, (RIVERSIDE_X0 + RIVERSIDE_X1) / 2, wallH / 2, RIVERSIDE_Z1, wallMatRiver);
  for (const s of [-1, 1]) box(0.5, wallH + 1, 0.5, s * gateHalf, (wallH + 1) / 2, RIVERSIDE_Z0, 0x8c8162, false);
}
signboard('RIVERSIDE ESTATES — PRIVATE', BRIDGE_X, BRIDGE_Y + 2.4, RIVERSIDE_Z0 - 1, 13, '#4a3b1d');

// =====================================================================
// ASHFORD CAPITAL: reached via the other (previously unconnected) bridge —
// a full district, bigger than Riverside, built around a central Capitol.
// =====================================================================
const CAPITAL_CX = (CAPITAL_X0 + CAPITAL_X1) / 2, CAPITAL_CZ = (CAPITAL_Z0 + CAPITAL_Z1) / 2;
for (let cx = 3; cx <= 10; cx++) for (let cz = 17; cz <= 22; cz++) {
  if(cz===22&&[3,4,5].includes(cx)||cx===10&&cz===20)continue;
  const x0 = cx * 40 + 20, z0 = cz * 40 + 20;
  if(x0===300&&z0===900)continue;
  if(x0===420&&[700,740].includes(z0))continue;
  if ([340,380].includes(x0) && [740,780,860].includes(z0)) continue;
  if (Math.hypot(x0 - CAPITAL_CX, z0 - CAPITAL_CZ) < 36) continue;   // leave the central plaza for the Capitol itself
  if (Math.abs(x0 - 220) < 55 && z0 < 740) continue;   // keep a real clear plaza at the bridge's mouth, not houses pressed right up against it
  pavement(x0, z0, lawnMat);
  for (const [ox, oz] of [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]]) {
    if (rand() < 0.1) { addTree(x0 + ox, z0 + oz, 1.1); continue; }
    addBuilding(x0 + ox, z0 + oz, Math.sign(ox), Math.sign(oz));
  }
}
// Central Capitol building — taller and grander than anything addBuilding() would
// generate way out here, since its auto-height only scales up near the origin.
{
  pavement(CAPITAL_CX, CAPITAL_CZ, paveMat);
  const domeMat = new THREE.MeshStandardMaterial({ color: 0xe8e2cf, roughness: 0.5 });
  box(26, 16, 20, CAPITAL_CX, 8, CAPITAL_CZ, domeMat);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(7, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  dome.position.set(CAPITAL_CX, 16, CAPITAL_CZ); scene.add(dome); camBlockers.push(dome);
  for (let i = -4; i <= 4; i++) box(1.1, 10, 1.1, CAPITAL_CX + i * 2.4, 5, CAPITAL_CZ - 10.2, 0xf0ead9, false);
  colliders.push({ minX: CAPITAL_CX - 13, maxX: CAPITAL_CX + 13, minZ: CAPITAL_CZ - 10, maxZ: CAPITAL_CZ + 10 });
  planeBlocks.push({ minX: CAPITAL_CX - 13, maxX: CAPITAL_CX + 13, minZ: CAPITAL_CZ - 10, maxZ: CAPITAL_CZ + 10, top: 20.5 });
  signboard('ASHFORD CAPITOL', CAPITAL_CX, 10, CAPITAL_CZ - 10.5, 14, '#2a2516');
}
signboard('ASHFORD CAPITAL', CAPITAL_CX, 3, CAPITAL_Z0 + 3, 16, '#1d2e1f');

// Riverside and the Capital had buildings but no actual road surface (the grass
// ground plane showed through), no street lamps and no traffic lights — the main
// town's road/lamp systems never extended out this far. Give them their own.
function addFlatRoad(x0, x1, z0, z1) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.95 }));
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2); scene.add(m);
}
addFlatRoad(RIVERSIDE_X0, RIVERSIDE_X1, RIVERSIDE_Z0, RIVERSIDE_Z1);
addFlatRoad(CAPITAL_X0, CAPITAL_X1, CAPITAL_Z0, CAPITAL_Z1);
// A few scripted cars looping back and forth across each bridge, so the roads
// between districts don't sit completely empty. Not part of the full traffic
// AI/node graph (that doesn't know about the bridges) -- these just drive a
// fixed back-and-forth route.
function addBridgeCommuter(color, waypoints, speed) {
  const v = makeVehicle('car', color);
  v.group.position.copy(waypoints[0]);
  v.ai = null;
  const st = { i: 1 };
  addTask({ dur: 1e9, update(dt) {
    const target = waypoints[st.i], p = v.group.position;
    const dir = new THREE.Vector3(target.x - p.x, 0, target.z - p.z), d = dir.length();
    if (d < 2) { st.i = (st.i + 1) % waypoints.length; return; }
    dir.normalize(); p.addScaledVector(dir, speed * dt);
    v.group.rotation.y = lerpAngle(v.group.rotation.y, Math.atan2(dir.x, dir.z), 1 - Math.exp(-5 * dt));
    p.y = groundY(p.x, p.z);
  } });
}
addBridgeCommuter(0x2e86de, [new THREE.Vector3(0, 0, 150), new THREE.Vector3(0, 0, 630)], 10);
addBridgeCommuter(0xe17055, [new THREE.Vector3(220, 0, 60), new THREE.Vector3(220, 0, 680)], 10);

// =====================================================================
// MOUNTAINS: a backdrop range west of Riverside/the Capital, close enough to
// actually be visible through the fog. Real climbable terrain — groundY()
// ramps elevation up each cone's slope (see the `mountains` loop in there),
// matching the cone mesh exactly, so there's nothing to collide with on the
// way up; only the hand-built cave massif below gets real wall colliders.
// =====================================================================
{
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6b6659, roughness: 1 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf2f3f0, roughness: 0.85 });
  for (let i = 0; i < 14; i++) {
    const x = -320 - rand() * 160, z = 600 + rand() * 340;   // kept west of x=-300 so it's never over the open water
    const h = 26 + rand() * 30, r = 48 + rand() * 42;        // gentle enough height:radius ratio to actually walk up
    const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), rockMat);
    peak.position.set(x, h / 2, z); peak.rotation.y = rand() * Math.PI; scene.add(peak); camBlockers.push(peak);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.4, h * 0.3, 7), snowMat);
    cap.position.set(x, h - h * 0.15, z); cap.rotation.y = peak.rotation.y; scene.add(cap);
    mountains.push({ x, z, r, h });
  }
  signboard('ASHFORD HIGHLANDS', -310, 5, 660, 14, '#2a2f33');

  // A real cave, dug into its own fixed rock massif rather than one of the
  // random decorative peaks above. A short tunnel (wall colliders either
  // side, open floor) leads back to a lit chamber with glowing crystals.
  const cvX = -400, cvZ = 760, mouthW = 4.4, tunnelLen = 18, chamberR = 9;
  // The massif the entrance is cut into — tall enough to read as a real hillside.
  mountains.push({ x: cvX, z: cvZ + 14, r: 60, h: 46 });
  const massif = new THREE.Mesh(new THREE.ConeGeometry(60, 46, 8), rockMat);
  massif.position.set(cvX, 23, cvZ + 14); scene.add(massif); camBlockers.push(massif);
  // Tunnel walls: two long rock slabs either side of the mouth, colliding so
  // the only way in (or out) is straight through the gap between them.
  for (const s of [-1, 1]) {
    box(1.6, 6, tunnelLen, cvX + s * (mouthW / 2 + 0.8), 3, cvZ + tunnelLen / 2, rockMat, true);
  }
  box(mouthW + 3.2, 0.6, tunnelLen + 1, cvX, 6.1, cvZ + tunnelLen / 2, rockMat, false);   // tunnel roof, visual only
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0x6fc9e8, emissive: 0x2a9fd6, emissiveIntensity: 0.8, roughness: 0.3 });
  const chamberZ = cvZ + tunnelLen + chamberR * 1.3;   // comfortable clearance past the tunnel mouth before any scattered wall can appear
  for (let i = 0; i < 10; i++) {
    const a = rand() * Math.PI * 2, rr = chamberR * (0.5 + rand() * 0.5), wallH = 7 + rand() * 4;
    box(5 + rand() * 4, wallH, 5 + rand() * 4, cvX + Math.cos(a) * rr, wallH / 2, chamberZ + Math.sin(a) * rr, rockMat, true);
  }
  for (let i = 0; i < 6; i++) {
    const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.3 + rand() * 0.3, 1.4 + rand() * 1.2, 5), crystalMat);
    crystal.position.set(cvX + (rand() - 0.5) * chamberR, 0.6, chamberZ + (rand() - 0.5) * chamberR);
    crystal.rotation.z = (rand() - 0.5) * 0.4;
    scene.add(crystal);
  }
  const caveLight = new THREE.PointLight(0x5fc0ff, 2.2, 24, 2); caveLight.position.set(cvX, 3, chamberZ); scene.add(caveLight);
  signboard('ASHFORD CAVE', cvX, 4.5, cvZ - 1.5, 10, '#1a2a33');
  // Forest at the foot of the mountains — a real start on the "forest with
  // bats/insects" request, not just two trees for show.
  for (let i = 0; i < 160; i++) addTree(-320 - rand() * 170, 590 + rand() * 360, 0.55 + rand() * rand() * 2.1);
}
const bats = [];
function addBat(x, z) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.05, 3), new THREE.MeshBasicMaterial({ color: 0x1a1a1a, side: THREE.DoubleSide }));
  scene.add(m);
  bats.push({ m, cx: x, cz: z, r: 6 + rand() * 10, h: 8 + rand() * 6, phase: rand() * 10, speed: 1 + rand() * 0.8 });
}
for (let i = 0; i < 12; i++) addBat(-350 - rand() * 100, 620 + rand() * 300);
function updateBats(dt) {
  for (const b of bats) {
    b.phase += b.speed * dt;
    const x = b.cx + Math.cos(b.phase) * b.r, z = b.cz + Math.sin(b.phase) * b.r;
    b.m.position.set(x, b.h + Math.sin(b.phase * 5) * 0.6, z);
    b.m.rotation.y = -b.phase; b.m.rotation.x = Math.sin(b.phase * 8) * 0.5;
  }
}
const forestInsects = [];
function addForestInsect(x, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), new THREE.MeshBasicMaterial({ color: 0xbfff80 }));
  scene.add(m);
  forestInsects.push({ m, cx: x, cz: z, phase: rand() * 10 });
}
for (let i = 0; i < 25; i++) addForestInsect(-320 - rand() * 170, 590 + rand() * 360);
function updateForestInsects(dt) {
  for (const f of forestInsects) {
    f.phase += dt * 2;
    const x = f.cx + Math.sin(f.phase) * 1.2, z = f.cz + Math.cos(f.phase * 1.4) * 1.2;
    f.m.position.set(x, groundY(x, z) + 0.8 + Math.sin(f.phase * 3) * 0.3, z);
  }
}
for (let cx = -1; cx <= 0; cx++) for (let cz = 16; cz <= 17; cz++) addTrafficLight(cx * 40 - 6.5, cz * 40 - 6.5, Math.PI * 0.75);
for (let cx = 5; cx <= 8; cx += 3) for (let cz = 18; cz <= 21; cz += 3) addTrafficLight(cx * 40 - 6.5, cz * 40 - 6.5, Math.PI * 0.75);

// National Museum, just off the Capitol plaza — guarded relics on display.
{
  const mx = CAPITAL_CX - 26, mz = CAPITAL_CZ + 20, mw = 22, md = 16, mh = 5;
  const wallCol = 0xe6ddc4;
  box(mw, 0.2, md, mx, 0.1, mz, 0xcdc3a0, false);
  camBlockers.push(box(mw, mh, 0.4, mx, mh / 2, mz - md / 2, wallCol));   // back wall only — the +z side stays open as the entrance
  camBlockers.push(box(0.4, mh, md, mx - mw / 2, mh / 2, mz, wallCol));
  camBlockers.push(box(0.4, mh, md, mx + mw / 2, mh / 2, mz, wallCol));
  const roof = box(mw + 1, 0.3, md + 1, mx, mh + 0.15, mz, 0xb0a580, false); camBlockers.push(roof);
  planeBlocks.push({ minX: mx - mw / 2, maxX: mx + mw / 2, minZ: mz - md / 2, maxZ: mz + md / 2, top: mh + 0.3 });
  colliders.push({ minX: mx - mw / 2, maxX: mx - mw / 2 + 0.4, minZ: mz - md / 2, maxZ: mz + md / 2 },
    { minX: mx + mw / 2 - 0.4, maxX: mx + mw / 2, minZ: mz - md / 2, maxZ: mz + md / 2 },
    { minX: mx - mw / 2, maxX: mx + mw / 2, minZ: mz - md / 2, maxZ: mz - md / 2 + 0.4 });
  // leave the +z side open as the entrance — no back wall collider there
  signboard('ASHFORD NATIONAL MUSEUM', mx, mh + 0.9, mz + md / 2 + 0.1, 14, '#2a2516');
  for (const [rx, rz] of [[-6, -3], [0, -3], [6, -3], [-6, 3], [6, 3]]) {
    const px = mx + rx, pz = mz + rz;
    box(1, 1, 1, px, 0.5, pz, 0x6d6456, false);
    const relic = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), new THREE.MeshStandardMaterial({ color: pick([0xffd166, 0xc0a062, 0x8ecae6]), emissive: 0x332200, emissiveIntensity: 0.3, metalness: 0.6, roughness: 0.3 }));
    relic.position.set(px, 1.25, pz); scene.add(relic);
    addTask({ dur: 1e9, update: (dt, t) => { relic.rotation.y = t; } });
    const guard = makeHumanoid({ outfit: 0x2a3a4a, hair: 0x1a1a1a, pants: 0x1c242c });
    guard.rig.scale.setScalar(0.95);
    guard.root.position.set(px, 0, pz - 1.6); guard.root.rotation.y = Math.PI;
    interactables.push({ pos: new THREE.Vector3(px, 0, pz), r: 1.4, label: 'Steal the relic (raises wanted)',
      action: () => { if (relic.parent) { disposeObj(relic); stats.gold += 150; raiseWanted(100); toast('You grabbed the relic. The guard is calling it in.'); reactBystanders(new THREE.Vector3(px, 0, pz), true); } } });
  }
}

// =====================================================================
// REAL-WORLD CITY: Edinburgh, streamed in from pre-tiled OpenStreetMap data.
// Placed far from the procedural town (offset on X) so nothing hand-placed
// there moves. Only tiles near the player are ever built or collidable —
// the full city is 53k buildings / 19k roads, which is why this streams
// instead of loading everything at once (see assets/map/tools/tile-geojson.mjs).
// =====================================================================
const CITY_ENABLED = false; // disabled for now — was causing real slowdown; flip back on once that's addressed
const CITY_OFFSET = new THREE.Vector3(1500, 0, 0);
const cityTiles = new Map(); // "tx_tz" -> { group, colliders: [...] }
let cityManifest = null;
let cityStreamTimer = 0;
const CITY_LOAD_RADIUS = 2;   // tiles within this ring of the player's tile get loaded
const CITY_UNLOAD_RADIUS = 4; // tiles further than this get unloaded (hysteresis avoids load/unload thrashing at the boundary)

if (CITY_ENABLED) fetch('./assets/map/tiles/manifest.json').then(r => r.json()).then(m => {
  cityManifest = m;
  console.log(`Edinburgh manifest loaded: ${m.tiles.length} tiles, ${m.tileSize}m each`);
}).catch(e => console.warn('City manifest failed to load:', e.message));

// civicBuildings itself is declared up near addBuilding() so generic buildings can
// register into it too (see there for why).
// Hand-placed hospital — guaranteed to exist even with the OSM city (which also
// has real hospitals) disabled. Ambulances stage from here and return here.
let HOSPITAL_POS = null;
(function buildHospital() {
  const x = -200, z = -200, w = 20, d = 16, floors = 8, h = floors * 3;
  const f = facades[2]; // clinical off-white facade
  addTower(x, CURB, z, w, h, d, f, true);
  // Red cross, lit up, high on the tower face so it reads from a distance.
  box(2.4, 0.5, 0.15, x, h * 0.82, z - d / 2 - 0.1, 0xe84118, false);
  box(0.5, 2.4, 0.15, x, h * 0.82, z - d / 2 - 0.1, 0xe84118, false);
  colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  civicBuildings.push({ type: 'hospital', name: 'St. Mary General Hospital', x, z, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  HOSPITAL_POS = new THREE.Vector3(x, 0, z - d / 2 - 6);
})();
// Hand-placed fire station, next door to the hospital — firefighters standing by.
const firefighters = [];
(function buildFireStation() {
  const x = -160, z = -200, w = 18, d = 14, h = 8;
  box(w, h, d, x, h / 2, z, 0xc0392b);
  box(w + 0.6, 0.6, d + 0.6, x, h + 0.3, z, 0x8e2a20);
  box(4.5, 5, 0.2, x, 2.5, z - d / 2 - 0.05, 0x2a2a2a, false); // bay door
  colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  civicBuildings.push({ type: 'fire_station', name: 'Ashford Fire Station', x, z, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  const truck = makeVehicle('car', 0xc0392b);
  truck.group.position.set(x, 0, z - d / 2 - 6); truck.group.rotation.y = Math.PI; truck.ai = { from: nearestNode(truck.group.position), to: [0, 0], prev: null, s: 0, cruise: 10, parked: true, stopTimer: 0, stopped: false, chasing: false, blockedT: 0, ignoreT: 0, ramCd: 0 };
  for (const [fx, fz] of [[-2, -8], [2, -8]]) {
    const ff = makeHumanoid({ outfit: 0xcc3b2c, hair: 0x2a1c12, pants: 0x2a2a2a });
    ff.root.position.set(x + fx, 0, z + fz); ff.root.rotation.y = Math.PI;
    firefighters.push({ h: ff, home: new THREE.Vector3(x + fx, 0, z + fz), state: 'idle', fire: null, waitT: 0 });
  }
})();
// Chain-link perimeter fence: posts + rails + a faint mesh "fabric" plane along
// each edge, plus two short angled barbed-wire strands on every post. `gate`
// (optional) leaves a gap in one edge for a vehicle/pedestrian entrance.
const fenceWireMat = new THREE.MeshStandardMaterial({ color: 0x8a949e, transparent: true, opacity: 0.3, side: THREE.DoubleSide, roughness: 0.6 });
function fenceRect(x0,x1,z0,z1,{postSpacing=4,h=2.6,gate=null}={}){
 for(const [side,x1a,z1a,x2a,z2a]of [['z0',x0,z0,x1,z0],['z1',x0,z1,x1,z1],['x0',x0,z0,x0,z1],['x1',x1,z0,x1,z1]])for(const span of fenceSegments(x1a,z1a,x2a,z2a,gate?.side===side?[gate.from,gate.to]:null)){
  const len=Math.hypot(span.x2-span.x1,span.z2-span.z1),alongX=Math.abs(span.x2-span.x1)>.1,mx=(span.x1+span.x2)/2,mz=(span.z1+span.z2)/2;
  for(let d=0;d<=len;d+=len/Math.max(1,Math.ceil(len/postSpacing)))box(.12,h,.12,span.x1+(span.x2-span.x1)*d/len,h/2,span.z1+(span.z2-span.z1)*d/len,0x454c50,false);
  for(const y of [.5,1.4,2.3])box(alongX?len:.04,.04,alongX?.04:len,mx,y,mz,0x596468,false);
  const fabric=mesh(new THREE.PlaneGeometry(len,h),fenceWireMat);fabric.position.set(mx,h/2,mz);if(!alongX)fabric.rotation.y=Math.PI/2;fabric.castShadow=false;
  const collider={minX:Math.min(span.x1,span.x2)-.12,maxX:Math.max(span.x1,span.x2)+.12,minZ:Math.min(span.z1,span.z2)-.12,maxZ:Math.max(span.z1,span.z2)+.12};colliders.push(collider);planeBlocks.push({...collider,bottom:0,top:h});
 }
}

function buildWatchtower(x, z) {
  const legH = 7, topY = legH, platW = 3.2;
  for (const [ox, oz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) box(0.25, legH, 0.25, x + ox, legH / 2, z + oz, 0x4a4a4a, false);
  box(platW, 0.3, platW, x, topY + 0.15, z, 0x55595e);
  for (const [ox, oz] of [[-platW / 2, 0], [platW / 2, 0], [0, -platW / 2], [0, platW / 2]]) box(0.1, 1.1, 0.1, x + ox, topY + 0.85, z + oz, 0x333333, false);
  box(platW + 0.3, 1.6, platW + 0.3, x, topY + 1.9, z, 0x3a3f45, false);
  box(platW - 0.3, 0.12, platW - 0.3, x, topY + 2.75, z, 0x2a2e33, false);
  colliders.push({ minX: x - 1.5, maxX: x + 1.5, minZ: z - 1.5, maxZ: z + 1.5 });
}
// Downtown police posts, right in the city near home/park — now proper 2-storey
// stations with a small fenced-in compound each, like a scaled-down version of
// the main Headquarters below.
function buildDowntownPolice(x, z, name) {
  const w = 18, d = 16, floors = 2, h = floors * 3;
  addTower(x, CURB, z, w, h, d, facades[3], true);
  box(1.6, 0.35, 0.12, x, h - 1.5, z - d / 2 - 0.1, 0x3867d6, false);
  civicBuildings.push({ type: 'police', name, x, z, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  fenceRect(x - w / 2 - 6, x + w / 2 + 6, z - d / 2 - 6, z + d / 2 + 10, { h: 2.4, gate: { side: 'z1', from: x - 3, to: x + 3 } });
  const v = makeVehicle('police', 0xf5f6fa);
  v.group.position.set(x + w / 2 + 6, 0, z); v.group.rotation.y = -Math.PI / 2;
  v.ai = { from: nearestNode(v.group.position), to: [0, 0], prev: null, s: 0, cruise: 12, parked: true, stopTimer: 0, stopped: false, chasing: false, blockedT: 0, ignoreT: 0, ramCd: 0 };
}
buildDowntownPolice(100, 20, 'Ashford Downtown Police Post — Central');
buildDowntownPolice(-140, 60, 'Ashford Downtown Police Post — West');
buildDowntownPolice(100, -140, 'Ashford Downtown Police Post — South');

// =====================================================================
// POLICE HEADQUARTERS: a full 4-storey HQ + attached prison, west of the
// hospital/fire station. Canteen wing, prison reception, a receptionist,
// watchtowers, a gated high fence topped with barbed wire, parked cruisers,
// guards patrolling the perimeter, and prisoners wandering the rec yard.
// =====================================================================
const hqPeople = [];
(function buildPoliceHQ() {
  const hx = -260, hz = -200;
  const x0 = hx - 34, x1 = hx + 34, z0 = hz - 26, z1 = hz + 30;

  // Main HQ tower — 4 storeys.
  const mw = 26, md = 18, floors = 4, mh = floors * 3;
  const mx = hx, mz = hz - 10;
  addTower(mx, CURB, mz, mw, mh, md, facades[3], true);
  box(2, 0.6, 0.15, mx, mh - 2, mz - md / 2 - 0.1, 0x3867d6, false);
  signboard('ASHFORD POLICE HEADQUARTERS', mx, mh + 1.4, mz - md / 2 - 0.1, 22, '#162a4d');
  civicBuildings.push({ type: 'police', name: 'Ashford Police Headquarters', x: mx, z: mz, minX: mx - mw / 2, maxX: mx + mw / 2, minZ: mz - md / 2, maxZ: mz + md / 2 });

  // Canteen wing, attached to the HQ's east side.
  const cw = 11, cd = 9, ch = 4, cx = mx + mw / 2 + cw / 2, cz = mz;
  box(cw, ch, cd, cx, ch / 2, cz, 0xd7c9a8);
  box(cw + 0.4, 0.4, cd + 0.4, cx, ch + 0.2, cz, 0x9a8a68);
  colliders.push({ minX: cx - cw / 2, maxX: cx + cw / 2, minZ: cz - cd / 2, maxZ: cz + cd / 2 });
  signboard('CANTEEN', cx, ch + 0.9, cz + cd / 2 + 0.1, 8, '#4a3b1d');
  civicBuildings.push({ type: 'police', name: 'Police HQ Canteen', x: cx, z: cz, minX: cx - cw / 2, maxX: cx + cw / 2, minZ: cz - cd / 2, maxZ: cz + cd / 2 });
  for (const [bx, bz] of [[-3, 0], [3, 0]]) { addBench(cx + bx, cz + cd / 2 + 3, Math.PI); }

  // Prison reception, near the gate — a receptionist staffs the front desk.
  const rw = 14, rd = 10, rh = 5, rx = hx, rz = hz + 14;
  box(rw, rh, rd, rx, rh / 2, rz, 0xb9c0c8);
  box(rw + 0.4, 0.4, rd + 0.4, rx, rh + 0.2, rz, 0x7c838c);
  colliders.push({ minX: rx - rw / 2, maxX: rx + rw / 2, minZ: rz - rd / 2, maxZ: rz + rd / 2 });
  signboard('PRISON RECEPTION', rx, rh + 0.9, rz - rd / 2 - 0.1, 14, '#162a4d');
  civicBuildings.push({ type: 'police', name: 'Police HQ — Prison Reception', x: rx, z: rz, minX: rx - rw / 2, maxX: rx + rw / 2, minZ: rz - rd / 2, maxZ: rz + rd / 2 });
  box(1.4, 0.8, 0.5, rx, 0.4, rz - rd / 2 - 1.2, 0x5a4530, false); // front desk, just outside the door
  const receptionist = makeHumanoid({ outfit: 0x2a3a4a, hair: 0x3a2a1a, pants: 0x1c242c });
  receptionist.root.position.set(rx, 0, rz - rd / 2 - 1.8); receptionist.root.rotation.y = Math.PI;

  // Outdoor rec yard between reception and the main tower — a basketball hoop for prisoners.
  const yardCX = hx, yardCZ = hz + 2;
  box(14, 0.08, 10, yardCX, 0.04, yardCZ, 0x6b6e73, false);
  box(0.18, 3.2, 0.18, yardCX, 1.6, yardCZ - 5, 0x3a3a3a, false);
  box(1.4, 0.08, 0.9, yardCX, 3.1, yardCZ - 5, 0xe8e8e8, false);
  const hoop = mesh(new THREE.TorusGeometry(0.4, 0.04, 8, 16), 0xff6b35); hoop.position.set(yardCX, 2.75, yardCZ - 4.6); hoop.rotation.x = Math.PI / 2;

  // Watchtowers at the yard's back corners.
  buildWatchtower(x0 + 3, z0 + 3);
  buildWatchtower(x1 - 3, z0 + 3);

  // High perimeter fence with barbed wire, gated at the south (street) side.
  fenceRect(x0, x1, z0, z1, { h: 3.2, postSpacing: 4.5, gate: { side: 'z1', from: hx - 5, to: hx + 5 } });

  // Parked police cruisers just inside the gate.
  for (const [vx, vz, rot] of [[hx - 10, hz + 24, Math.PI], [hx + 2, hz + 24, Math.PI], [hx + 14, hz + 24, Math.PI]]) {
    const v = makeVehicle('police', 0xf5f6fa);
    v.group.position.set(vx, 0, vz); v.group.rotation.y = rot; v.ai = null;
  }

  // Guards patrolling a loop just inside the fence line.
  const patrolLoop = [[x0 + 5, z0 + 5], [x1 - 5, z0 + 5], [x1 - 5, z1 - 5], [x0 + 5, z1 - 5]];
  for (let i = 0; i < 5; i++) {
    const h = makeHumanoid({ outfit: 0x2a3a4a, hair: pick([0x1a1a1a, 0x3a2a1a, 0x222]), pants: 0x1c242c });
    const wp = i % patrolLoop.length;
    h.root.position.set(patrolLoop[wp][0], 0, patrolLoop[wp][1]);
    hqPeople.push({ h, kind: 'guard', wp, speed: 2.1 + Math.random() * 0.4 });
  }

  // Prisoners wandering the rec yard, orange jumpsuits.
  for (let i = 0; i < 8; i++) {
    const h = makeHumanoid({ outfit: 0xff7a1a, hair: pick([0x1a1a1a, 0x5a4a3a, 0x2a2a2a]), pants: 0xff7a1a, shoes: 0x2a2a2a });
    h.root.position.set(yardCX + (Math.random() - 0.5) * 12, 0, yardCZ + (Math.random() - 0.5) * 8);
    hqPeople.push({ h, kind: 'prisoner', target: null, speed: 1.1 + Math.random() * 0.5, waitT: Math.random() * 3,
      bounds: { x0: yardCX - 7, x1: yardCX + 7, z0: yardCZ - 5, z1: yardCZ + 5 } });
  }

  // More guards milling around the yard and gate, keeping order.
  for (let i = 0; i < 4; i++) {
    const h = makeHumanoid({ outfit: 0x2a3a4a, hair: pick([0x1a1a1a, 0x3a2a1a]), pants: 0x1c242c });
    h.root.position.set(yardCX + (Math.random() - 0.5) * 10, 0, yardCZ + (Math.random() - 0.5) * 6);
    hqPeople.push({ h, kind: 'yardGuard', target: null, speed: 1.4, waitT: Math.random() * 3,
      bounds: { x0: yardCX - 8, x1: yardCX + 8, z0: yardCZ - 6, z1: yardCZ + 6 } });
  }

  addTask({ dur: 1e9, update(dt) {
    for (const p of hqPeople) {
      const pos = p.h.root.position;
      if (p.kind === 'guard') {
        const t = patrolLoop[p.wp];
        const dir = new THREE.Vector3(t[0] - pos.x, 0, t[1] - pos.z), dist = dir.length();
        if (dist < 1.2) { p.wp = (p.wp + 1) % patrolLoop.length; }
        else { dir.normalize(); pos.addScaledVector(dir, p.speed * dt); p.h.root.rotation.y = Math.atan2(dir.x, dir.z); animateHumanoid(p.h, null, true, false, true, dt); }
      } else {
        if (!p.target || pos.distanceTo(p.target) < 0.6) {
          if (p.waitT > 0) { p.waitT -= dt; animateHumanoid(p.h, null, false, false, true, dt); pos.y = groundY(pos.x, pos.z); continue; }
          p.target = new THREE.Vector3(p.bounds.x0 + Math.random() * (p.bounds.x1 - p.bounds.x0), 0, p.bounds.z0 + Math.random() * (p.bounds.z1 - p.bounds.z0));
          p.waitT = 1 + Math.random() * 3;
        }
        const dir = new THREE.Vector3(p.target.x - pos.x, 0, p.target.z - pos.z).normalize();
        pos.addScaledVector(dir, p.speed * dt); p.h.root.rotation.y = Math.atan2(dir.x, dir.z); animateHumanoid(p.h, null, true, false, true, dt);
      }
      pos.y = groundY(pos.x, pos.z);
    }
  } });
})();

// Ashford School — the building + playground only; the student population is
// added later, once the pedestrian system (addPedPopulation) exists.
const SCHOOL = new THREE.Vector3(-60, 0, 60);
(function buildSchool() {
  const { x, z } = SCHOOL, w = 24, d = 18, h = 7;
  box(w, h, d, x, h / 2, z, 0xcf8c4a);
  box(w + 0.6, 0.6, d + 0.6, x, h + 0.3, z, 0x8a5c30);
  colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  civicBuildings.push({ type: 'school', name: 'Ashford School', x, z, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  signboard('ASHFORD SCHOOL', x, h + 0.9, z - d / 2 - 0.1, 12, '#1d2e1f');
  // Playground out front.
  box(16, 0.1, 10, x, 0.05, z + d / 2 + 7, sandMat, false);
  for (const [px, pz] of [[-5, -2], [5, -2]]) {
    box(0.15, 2, 0.15, x + px, 1, z + d / 2 + 7 + pz, 0x8a8a8a, false);
    box(3, 0.15, 0.6, x + px, 2, z + d / 2 + 7 + pz, 0x8a8a8a, false);
  }
  addBench(x - 7, z + d / 2 + 2, Math.PI);
  addBench(x + 7, z + d / 2 + 2, Math.PI);
})();

function loadCityTile(tx, tz) {
  const key = `${tx}_${tz}`;
  if (cityTiles.has(key)) return;
  cityTiles.set(key, 'loading'); // placeholder so a slow fetch doesn't get requested twice
  fetch(`./assets/map/tiles/${key}.json`).then(r => r.ok ? r.json() : null).then(geojson => {
    if (!geojson) { cityTiles.delete(key); return; }
    const { group, buildingColliders, civicBuildings: tileCivic } = buildCityFromGeoJSON(geojson, cityManifest.origin);
    group.position.copy(CITY_OFFSET);
    scene.add(group);
    const tileColliders = buildingColliders.map(c => ({ minX: c.minX + CITY_OFFSET.x, maxX: c.maxX + CITY_OFFSET.x, minZ: c.minZ + CITY_OFFSET.z, maxZ: c.maxZ + CITY_OFFSET.z }));
    colliders.push(...tileColliders);
    const buildingMesh = group.getObjectByName('buildings');
    if (buildingMesh) camBlockers.push(buildingMesh);
    const civicEntries = tileCivic.map(c => ({
      ...c, mesh: buildingMesh, group, x: c.x + CITY_OFFSET.x, z: c.z + CITY_OFFSET.z,
      minX: c.minX + CITY_OFFSET.x, maxX: c.maxX + CITY_OFFSET.x, minZ: c.minZ + CITY_OFFSET.z, maxZ: c.maxZ + CITY_OFFSET.z,
    }));
    for (const c of civicEntries) applyBuildingExterior(c, buildingAppearances[c.id]);
    civicBuildings.push(...civicEntries);
    cityTiles.set(key, { group, colliders: tileColliders, buildingMesh, civicEntries });
  }).catch(() => cityTiles.delete(key));
}

function unloadCityTile(key) {
  const tile = cityTiles.get(key);
  if (!tile || tile === 'loading') { cityTiles.delete(key); return; }
  scene.remove(tile.group);
  for (const c of tile.colliders) { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); }
  if (tile.buildingMesh) { const i = camBlockers.indexOf(tile.buildingMesh); if (i >= 0) camBlockers.splice(i, 1); }
  for (const c of tile.civicEntries) { const i = civicBuildings.indexOf(c); if (i >= 0) civicBuildings.splice(i, 1); }
  tile.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  cityTiles.delete(key);
}

function updateCityStreaming(dt) {
  if (!CITY_ENABLED) return;
  // Both the dungeon arena (x=2000) and the civic-interior pocket (x=-5000) sit
  // close enough to the city's ~4.6km radius that city tiles would otherwise
  // start streaming in around them while the player is inside. Skip entirely
  // whenever the player isn't actually out in the open world.
  if (dungeon || inCivicInterior) return;
  cityStreamTimer += dt;
  if (cityStreamTimer < 1) return; // once a second is plenty — the player can't cross a 300m tile in under a second
  cityStreamTimer = 0;
  if (!cityManifest) return;
  const localX = player.position.x - CITY_OFFSET.x, localZ = player.position.z - CITY_OFFSET.z;
  // Player is nowhere near the city patch — don't even scan tiles.
  if (Math.abs(localX) > 6000 || Math.abs(localZ) > 6000) return;
  const ts = cityManifest.tileSize;
  const ptx = Math.floor(localX / ts), ptz = Math.floor(localZ / ts);
  for (let dx = -CITY_LOAD_RADIUS; dx <= CITY_LOAD_RADIUS; dx++)
    for (let dz = -CITY_LOAD_RADIUS; dz <= CITY_LOAD_RADIUS; dz++)
      loadCityTile(ptx + dx, ptz + dz);
  for (const key of [...cityTiles.keys()]) {
    const [tx, tz] = key.split('_').map(Number);
    if (Math.max(Math.abs(tx - ptx), Math.abs(tz - ptz)) > CITY_UNLOAD_RADIUS) unloadCityTile(key);
  }
}

const ships = [];
const SHIP_COLORS = [0x2d3436, 0xb71540, 0x0a3d62];
for (let i = 0; i < 3; i++) {
  const g = new THREE.Group();
  const big = i !== 1;   // two cargo ships and a ferry
  mesh(new THREE.BoxGeometry(big ? 9 : 7, 3, big ? 46 : 30), SHIP_COLORS[i], g).position.y = 1.2;
  mesh(new THREE.BoxGeometry(big ? 7 : 6, 4, 6), 0xf5f6fa, g).position.set(0, 4.5, big ? -17 : -6);
  mesh(new THREE.CylinderGeometry(0.7, 0.9, 3, 10), 0xc0392b, g).position.set(0, 7.5, big ? -18 : -7);
  if (big) for (let c = 0; c < 6; c++) mesh(new THREE.BoxGeometry(7, 2.4, 5), pick(AWNING_COLORS), g).position.set(0, 3.9 + (c % 2) * 2.4, -8 + Math.floor(c / 2) * 7);
  else mesh(new THREE.BoxGeometry(6, 2.5, 18), 0xf5f6fa, g).position.set(0, 3.9, 5);
  scene.add(g);
  g.position.set(-220,0,300+i*42);g.rotation.y=Math.PI/2;
  ships.push({g,length:big?46:30,z:300+i*42,x:-220,spd:5+i*1.5,home:new THREE.Vector2(-220,300+i*42),routeIndex:0});
}
let activeShipIndex=0,shipDockWait=20;
function navigableSea(x,z){if(Math.abs(x-BRIDGE_X)<BRIDGE_HALF_W&&z>=GAP0&&z<=GAP1)return true;return isSeaWater(x,z,-10);}
function updateShips(dt) {
  const t = performance.now() / 1000;
  shipDockWait=Math.max(0,shipDockWait-dt);
  for (const [i,s] of ships.entries()) {
    let heading=s.g.rotation.y;
    if(i===activeShipIndex&&shipDockWait===0){const route=[[-220,408],[180,408],[-220,408],[s.home.x,s.home.y]],target=route[s.routeIndex],dx=target[0]-s.x,dz=target[1]-s.z,d=Math.hypot(dx,dz);heading=Math.atan2(dx,dz);const step=Math.min(d,s.spd*dt),nx=s.x+dx/Math.max(d,.001)*step,nz=s.z+dz/Math.max(d,.001)*step;
      if(shipCanAdvance(s,nx,BRIDGE_X,GAP0,GAP1,bridgeLiftAngle)&&waterFootprint(nx,nz,heading,s.length,9,navigableSea)){s.x=nx;s.z=nz;}if(d<.1){s.routeIndex++;if(s.routeIndex===route.length){s.routeIndex=0;activeShipIndex=(activeShipIndex+1)%ships.length;shipDockWait=45;}}}
    s.g.position.set(s.x, Math.sin(t + s.z) * 0.15, s.z);
    s.g.rotation.set(Math.sin(t * 0.7 + s.x) * 0.01,heading,Math.sin(t * 0.8) * 0.02);
  }
}

// Speedboat (drivable)
function makeBoat() {
  const g = new THREE.Group();
  scene.add(g);
  mesh(new THREE.BoxGeometry(2.2, 0.8, 5), 0xf5f6fa, g).position.y = 0.3;
  const bow = mesh(new THREE.ConeGeometry(1.1, 1.8, 4), 0xf5f6fa, g);
  bow.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  bow.scale.set(1, 1, 0.55);
  bow.position.set(0, 0.3, 3.3);
  mesh(new THREE.BoxGeometry(2.24, 0.15, 5.04), 0x0984e3, g).position.y = 0.55;
  mesh(new THREE.BoxGeometry(1.6, 0.5, 0.08), glassMat, g).position.set(0, 1.0, 0.6);
  mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), 0x2d3436, g).position.set(0, 0.5, -2.6);
  const v = { kind: 'boat', group: g, wheels: [], speed: 0, radius: 2, length: 5, maxSpeed: 26, ai: null, passengers: null };
  vehicles.push(v);
  return v;
}
const boat = makeBoat();
boat.group.position.set(PIER.x + 4, 0, 195);

// =====================================================================
// DRIFTWOOD ISLAND: a small island out in the sea, plus a public ferry
// running between it and the harbour pier (board/leave like a bus).
// =====================================================================
{
  const sand = new THREE.Mesh(new THREE.CircleGeometry(ISLAND_R, 32), sandMat);
  sand.rotation.x = -Math.PI / 2; sand.position.set(ISLAND.x, CURB + 0.02, ISLAND.z); scene.add(sand);
  for (let i = 0; i < 10; i++) {
    const a = rand() * Math.PI * 2, r = rand() * (ISLAND_R - 4);
    const px = ISLAND.x + Math.cos(a) * r, pz = ISLAND.z + Math.sin(a) * r;
    const trunk = mesh(new THREE.CylinderGeometry(0.18, 0.26, 4.5, 6), 0x8a6b45);
    trunk.position.set(px, CURB + 2.25, pz); trunk.rotation.z = (rand() - 0.5) * 0.25;
    for (let f = 0; f < 6; f++) {
      const frond = mesh(new THREE.ConeGeometry(0.35, 2.6, 4), 0x2f8f4a);
      frond.position.set(px, CURB + 4.6, pz);
      frond.rotation.set(Math.PI / 2.3, 0, (f / 6) * Math.PI * 2);
    }
    colliders.push({ minX: px - 0.3, maxX: px + 0.3, minZ: pz - 0.3, maxZ: pz + 0.3 });
  }
  box(3, 0.3, 10, ISLAND.x, CURB + 0.15, ISLAND.z - ISLAND_R - 4, woodMatPlain, false);
  signboard('DRIFTWOOD ISLAND', ISLAND.x, CURB + 3, ISLAND.z - ISLAND_R - 10, 12, '#1d4a3a');
  addBench(ISLAND.x + 4, ISLAND.z, Math.PI / 2);

  const ferry = makeBoat();
  const ferryDockA = new THREE.Vector3(PIER.x + 4, 0, 192), ferryDockB = new THREE.Vector3(ISLAND.x, 0, ISLAND.z - ISLAND_R - 8);
  ferry.group.position.copy(ferryDockA);
  const ferryState = { at: 'A', doors: true, wait: 6, routeIndex:0 };
  const ferryRoute=[ferryDockA,new THREE.Vector3(25,0,220),new THREE.Vector3(25,0,408),new THREE.Vector3(-45,0,408),new THREE.Vector3(-270,0,408),new THREE.Vector3(-270,0,460),ferryDockB];
  const ferryInteract = { pos: ferryDockA.clone(), r: 3, label: 'Board the ferry to Driftwood Island', action: () => {
    if (riding || inCar || sitting) { toast("Finish what you're doing first."); return; }
    if (ferryRider) { ctxLeaveFerry(); return; }
    if (!ferryState.doors) { toast('Wait for the ferry to dock.'); return; }
    boardFerry();
  } };
  interactables.push(ferryInteract);
  let ferryRider = null;
  function boardFerry() {
    ferryRider = player.position.clone();
    player.visible = false;
    ferryInteract.label = 'Leave the ferry';
  }
  function ctxLeaveFerry() {
    const dock = ferryState.at === 'A' ? ferryDockA : ferryDockB;
    player.position.set(dock.x + 3, 0, dock.z);
    player.position.y = groundY(player.position.x, player.position.z);
    player.visible = true;
    ferryRider = null;
    ferryInteract.label = 'Board the ferry to Driftwood Island';
  }
  addTask({ dur: 1e9, update(dt) {
    ferryInteract.pos.copy(ferry.group.position);
    if (ferryRider) player.position.set(ferry.group.position.x, groundY(ferry.group.position.x, ferry.group.position.z), ferry.group.position.z);
    if (ferryState.doors) {
      ferryState.wait -= dt;
      if (ferryState.wait <= 0) { ferryState.doors = false;ferryState.routeIndex=ferryState.at==='A'?1:ferryRoute.length-2; }
      return;
    }
    const target = ferryRoute[ferryState.routeIndex];
    const delta = target.clone().sub(ferry.group.position), dist = delta.length();
    if (dist < 1) {
      ferry.group.position.copy(target);
      const final=ferryState.at==='A'?ferryRoute.length-1:0;
      if(ferryState.routeIndex!==final){ferryState.routeIndex+=ferryState.at==='A'?1:-1;return;}
      ferryState.at = ferryState.at === 'A' ? 'B' : 'A';
      ferryState.doors = true; ferryState.wait = 8;
      if (ferryRider) ctxLeaveFerry();
      return;
    }
    const next=ferry.group.position.clone().addScaledVector(delta.normalize(),Math.min(dist,9*dt));
    if(!shipCanAdvance({x:ferry.group.position.x,z:ferry.group.position.z,length:5},next.x,BRIDGE_X,GAP0,GAP1,bridgeLiftAngle)||!waterFootprint(next.x,next.z,Math.atan2(delta.x,delta.z),5,2.2,navigableSea)){return;}
    ferry.group.position.copy(next);
    ferry.group.rotation.y = Math.atan2(delta.x, delta.z);
  } });
}

// =====================================================================
// AIRFIELD + FLYABLE PLANES (west of the city)
// W/S throttle · A/D turn · Space climb · Shift dive
// =====================================================================
const AIRFIELD_X = -550;

const AIRCRAFT = [
  { name: 'Prop plane', color: 0xf5f6fa, accent: 0xe1b12c, maxSpeed: 45, takeoff: 22, turn: 0.9, jet: false, home: [AIRFIELD_X - 95, -48] },
  { name: 'Jet', color: 0x95a5a6, accent: 0x2c3e50, maxSpeed: 85, takeoff: 35, turn: 0.7, jet: true, home: [AIRFIELD_X - 95, -12] },
  { name: 'Airliner', color: 0xe8edf0, accent: 0x1a5fb4, maxSpeed: 95, takeoff: 40, turn: 0.6, jet: true, home: [AIRFIELD_X - 95, 24] },
  { name: 'Cargo plane', color: 0xb0a080, accent: 0x5a4a30, maxSpeed: 50, takeoff: 26, turn: 0.8, jet: false, home: [AIRFIELD_X - 95, -84] },
  { name: 'Fighter jet', color: 0x4a5560, accent: 0xb8302a, maxSpeed: 120, takeoff: 30, turn: 1.1, jet: true, home: [AIRFIELD_X - 95, 60] },
];
function makeAircraft(a) {
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';   // yaw, then pitch, then roll
  scene.add(g);
  const s = a.jet ? 1.3 : 1;
  const bodyMat = new THREE.MeshStandardMaterial({ color: a.color, roughness: 0.4 });
  const accentMat = new THREE.MeshStandardMaterial({ color: a.accent, roughness: 0.4 });
  mesh(new THREE.CylinderGeometry(0.7 * s, 0.45 * s, 8 * s, 14), bodyMat, g).rotation.x = Math.PI / 2;
  g.children.at(-1).position.y = 1.3;
  const nose = mesh(new THREE.SphereGeometry(0.7 * s, 14, 10), bodyMat, g);
  nose.position.set(0, 1.3, 4 * s); nose.scale.z = 1.6;
  const cockpit = mesh(new THREE.SphereGeometry(0.5 * s, 12, 8), glassMat, g);
  cockpit.position.set(0, 1.75 + 0.1 * s, 1.8 * s); cockpit.scale.set(1, 0.8, 1.7);
  mesh(new THREE.BoxGeometry(a.jet ? 9 : 11, 0.18, a.jet ? 2.6 : 1.8), bodyMat, g).position.set(0, 1.2, a.jet ? -0.4 : 0.4);
  mesh(new THREE.BoxGeometry(3.6 * s, 0.15, 1), bodyMat, g).position.set(0, 1.4, -3.6 * s);
  mesh(new THREE.BoxGeometry(0.15, 1.6 * s, 1.2), accentMat, g).position.set(0, 2.1 + 0.2 * s, -3.6 * s);
  for (const [x, z] of [[0, 2.6 * s], [1.2, -0.2], [-1.2, -0.2]]) {
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), 0x333333, g).position.set(x, 0.7, z);
    const wheel = new THREE.Mesh(tyreGeo, tyreMat);
    wheel.scale.setScalar(0.5); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, 0.2, z);
    g.add(wheel);
  }
  let prop = null, exhaust = null;
  if (a.jet) {
    exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.6, 12), new THREE.MeshBasicMaterial({ color: 0xff8c3a, toneMapped: false }));
    exhaust.rotation.x = Math.PI / 2; exhaust.position.set(0, 1.3, -4 * s - 0.2);
    g.add(exhaust);
  } else {
    prop = mesh(new THREE.BoxGeometry(0.12, 2.2, 0.08), 0x2d3436, g);
    prop.position.set(0, 1.3, 4 * s + 1.15);
  }
  const yaw0 = 0;
  g.position.set(a.home[0], 0, a.home[1]);
  g.rotation.y = yaw0;
  const v = { kind: 'plane', name: a.name, group: g, wheels: [], speed: 0, radius: 3.5, wingSpan:20*s,length: 8 * s, maxSpeed: a.maxSpeed,
    takeoff: a.takeoff, turnRate: a.turn, ai: null, passengers: null, alt: 0, crashed: false, prop, exhaust,
    plane: { throttle: 0, pitch: 0, roll: 0, yaw: yaw0 }, home: { x: a.home[0], z: a.home[1], yaw: yaw0 } };
  vehicles.push(v);
  return v;
}
AIRCRAFT.forEach(makeAircraft);
// Temporary: your own plane parked near home instead of the car, for testing
// fast travel — same "for now, revert later" spirit as CHEAT_NO_NEEDS/SPEED.
makeAircraft({ name: 'Your plane', color: 0xf5f6fa, accent: 0xd63031, maxSpeed: 60, takeoff: 24, turn: 0.95, jet: false, home: [RUNWAY.x, RUNWAY.z - 35] });

function crashPlane(v) {
  const p = v.group.position.clone();
  // Flying into a building at speed brings it down
  const hitBuilding = buildings.find(b => b.alive && v.speed > 15 && p.y < b.top + 2 &&
    Math.abs(p.x - b.x) < b.w / 2 + 3 && Math.abs(p.z - b.z) < b.d / 2 + 3);
  if (hitBuilding) collapseBuilding(hitBuilding);
  impactFrame(1.2);
  fxSphere(at(p, 1), 0xff7a2f, 8, 0.6);
  fxPillar(new THREE.Vector3(p.x, groundY(p.x, p.z), p.z), 0xff5a1f, 2, 14, 0.7);
  fxCrater(p, 4);
  burst(at(p, 1), 80, [0xff5a1f, 0xffb02e, 0x333333, 0x777777], 18, 0.35, 1.2, 12, 6);
  if (v === driving) {
    exitVehicle(true);
    player.position.set(p.x + 3, 0, p.z);
    collide(player.position, 0.4);
    player.position.y = groundY(player.position.x, player.position.z);
    stats.hp -= 40 * defMul();
    toast('You crashed!');
  }
  v.group.visible = false;
  v.speed = 0;
  v.crashed = true;
  addTask({ dur: 6, end: () => {   // a fresh plane appears back at the airfield
    v.crashed = false; v.alt = 0; v.group.visible = true;
    Object.assign(v.plane, { throttle: 0, pitch: 0, roll: 0, yaw: v.home.yaw });
    v.group.position.set(v.home.x, 0, v.home.z);
    v.group.rotation.set(0, v.home.yaw, 0);
  } });
}

function flyPlane(v, dt) {
  if (v.crashed) return;
  const P = v.plane, p = v.group.position, mine = v === driving;
  if (mine) {
    if (keys.KeyW) P.throttle = Math.min(1, P.throttle + 0.5 * dt);
    if (keys.KeyS) P.throttle = Math.max(0, P.throttle - 0.6 * dt);
  } else P.throttle = Math.max(0, P.throttle - dt);
  const ground = groundY(p.x, p.z);
  const airborne = v.alt > ground + 0.5;
  v.speed = lerp(v.speed, P.throttle * v.maxSpeed, 1 - Math.exp(-0.5 * dt));
  if (!airborne && (!mine || (keys.KeyS && P.throttle === 0))) v.speed = Math.max(0, v.speed - 15 * dt);   // brakes

  const turn = mine ? (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0) : 0;
  const pitchIn = mine ? (keys.Space ? 1 : 0) - (keys.ShiftLeft || keys.ShiftRight ? 1 : 0) : 0;
  const lift = clamp((v.speed - v.takeoff) / 10, 0, 1);   // no lift below take-off speed
  P.pitch = lerp(P.pitch, pitchIn * 0.6, 1 - Math.exp(-2 * dt));
  if (!airborne && P.pitch < 0) P.pitch = 0;
  P.yaw += turn * v.turnRate * dt * (airborne ? 1 : 0.5) * Math.min(1, v.speed / 10);
  P.roll = lerp(P.roll, airborne ? -turn * 0.6 : 0, 1 - Math.exp(-3 * dt));
  rollAircraft(P,mine?((keys.KeyQ?1:0)-(keys.KeyR?1:0)):0,airborne,dt);
  if(airborne&&P.stuntRoll)P.yaw+=Math.sin(P.stuntRoll)*.15*dt;
  // Fly back towards the city if you reach the edge of the map
  if (Math.abs(p.x) > 13000 || Math.abs(p.z) > 13000) P.yaw = lerpAngle(P.yaw, Math.atan2(-p.x, -p.z), 1 - Math.exp(-1.5 * dt));

  const climb = Math.sin(P.pitch) * v.speed * lift * 0.6 - (airborne ? (1 - lift) * 8+(1-Math.cos(P.roll+(P.stuntRoll||0)))*3 : 0);
  v.alt = Math.min(300, v.alt + climb * dt);
  p.x += Math.sin(P.yaw) * Math.cos(P.pitch) * v.speed * dt;
  p.z += Math.cos(P.yaw) * Math.cos(P.pitch) * v.speed * dt;
  const g2 = groundY(p.x, p.z);
  if (v.alt <= g2) {   // touching the ground: a hard or tilted landing is a crash
    if (airborne && (climb < -12 || Math.abs(Math.atan2(Math.sin(P.roll+(P.stuntRoll||0)),Math.cos(P.roll+(P.stuntRoll||0)))) > 0.5)) return crashPlane(v);
    v.alt = g2;
    P.pitch = Math.max(0, P.pitch);
  }
  p.y = v.alt;
  const planeRadius=v.wingSpan? v.wingSpan/2:5;
  if ((airborne||Math.abs(v.speed)>2)&&planeBlocks.some(b=>p.x+planeRadius>b.minX&&p.x-planeRadius<b.maxX&&p.z+planeRadius>b.minZ&&p.z-planeRadius<b.maxZ&&v.alt+1.2>(b.bottom??0)&&v.alt-1.2<b.top))return crashPlane(v);
  if (v.alt < 6 && collide(p, 2.5)) {
    if (airborne || v.speed > 20) return crashPlane(v);
    v.speed *= 0.2;
  }
  v.group.rotation.set(-P.pitch, P.yaw, P.roll+(P.stuntRoll||0));
  if (v.prop) v.prop.rotation.z += (5 + v.speed) * dt * 3;
  if (v.exhaust) v.exhaust.scale.setScalar(0.5 + P.throttle);
  if (mine && airborne && Math.random() < 0.6) spawnParticle(at(p, 1.2).addScaledVector(fwdOf(v.group), -v.length * 0.6), randUnit().multiplyScalar(0.5), 0xffffff, 0.25, 0.8);
}

// ---- Flying ad balloon ----
const adBalloon = new THREE.Group();
const adBanner = { canvas: document.createElement('canvas'), tex: null, nextDraw: 0 };
adBanner.canvas.width = 512; adBanner.canvas.height = 128;
adBanner.tex = new THREE.CanvasTexture(adBanner.canvas);
(function buildAdBalloon() {
  adBalloon.add(new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), new THREE.MeshStandardMaterial({ color: 0xff5a5a })));
  const basket = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.2), new THREE.MeshStandardMaterial({ color: 0x4a3a2a }));
  basket.position.y = -5.5;
  adBalloon.add(basket);
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshBasicMaterial({ map: adBanner.tex, side: THREE.DoubleSide }));
  banner.position.y = -8;
  adBalloon.add(banner);
  scene.add(adBalloon);
})();
const AD_MESSAGES = ['VISIT THE CORNER CAFÉ', 'ANOTHERWORLD — YOUR STORY AWAITS', 'FRESH BREAD DAILY', 'JOIN A DUNGEON TODAY', 'NEW ELEMENTS COMING SOON'];
let adBalloonA = 0;
function updateAdBalloon(dt) {
  if(worldAdvertising){worldAdvertising.update(dt);return;}
  adBalloonA += dt * 0.04;
  adBalloon.position.set(Math.cos(adBalloonA) * 150, 36 + Math.sin(adBalloonA * 2) * 3, Math.sin(adBalloonA) * 150);
  adBalloon.rotation.y = adBalloonA + Math.PI / 2;
  if (performance.now() < adBanner.nextDraw) return;
  adBanner.nextDraw = performance.now() + 5000;
  const ctx = adBanner.canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#c0392b'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(AD_MESSAGES[Math.floor(Math.random() * AD_MESSAGES.length)], 256, 64);
  adBanner.tex.needsUpdate = true;
}

function updatePlanes(dt) {
  for (const [i,p] of planes.entries()) {
    p.g.position.set(-665-i*26,1,-30);p.g.rotation.set(0,Math.PI/2,0);p.light.visible=false;
  }
}

// =====================================================================
// ENEMIES (slimes + training dummies share one hit system)
// =====================================================================
const enemies = [];
function makeEnemy(o) {
  const e = Object.assign({
    vel: new THREE.Vector3(), stun: 0, flash: 0, glow: 0, alive: true, onGround: true,
    respawn: 0, guard: 0, blocking: false, lastHit: 99, carCd: 0, label: null,
  }, o);
  e.hp = e.maxHp;
  if(e.kind==='npc'&&!e.home)e.home=e.root.position.clone();
  if (o.labelName) e.label = makeLabel(o.labelName, o.kind === 'defence');
  enemies.push(e);
  return e;
}

// The core of combat: every attack goes through here.
// h = { dmg, from, kb, up, stun, heavy, impact, guardBreak }
function applyHit(e, h) {
  if (!e.alive || e.hidden) return false;
  const p = e.root.position;
  const dir = new THREE.Vector3(p.x - h.from.x, 0, p.z - h.from.z);
  if (dir.lengthSq() < 1e-4) dir.copy(fwdOf(player));
  dir.normalize();
  let dmg = h.dmg * dmgMul()*(h.fromPlayer!==false&&!h.police?(supportSkills?.damageMultiplier||1):1);
  e.lastHit = 0;

  // Blocking: only works against hits from the front
  if (e.blocking && e.stun <= 0 && fwdOf(e.root).dot(dir) < -0.3) {
    if (h.guardBreak) {
      e.guard = 0; e.stun = 1.6; e.blocking = false;
      popText(at(p, 2.4), 'GUARD BREAK', 'break');
      impactFrame(0.7);
    } else {
      dmg *= 0.15;
      e.guard += h.dmg * 2.5;
      e.vel.addScaledVector(dir, (h.kb || 0) * 0.2);
      popText(at(p, 2.2), 'BLOCK', 'block');
      burst(at(p, 1.3).addScaledVector(dir, -0.4), 6, [0x74b9ff, 0xffffff], 6, 0.1, 0.25, 0);
      hitStop = Math.max(hitStop, 0.03);
      e.hp -= dmg;
      if (e.guard >= 100) {
        e.guard = 0; e.stun = 2; e.blocking = false;
        popText(at(p, 2.6), 'GUARD BREAK', 'break');
        impactFrame(0.7);
      }
      if (e.hp <= 0) killEnemy(e);
      return true;
    }
  }

  e.hp -= dmg;
  e.flash = 1;
  e.glow = 0;
  if (e.superArmor) {   // bosses barely flinch
    e.stun = Math.max(e.stun, 0.1);
    e.vel.x += dir.x * (h.kb || 0) * 0.15;
    e.vel.z += dir.z * (h.kb || 0) * 0.15;
  } else {
    e.stun = Math.max(e.stun, h.stun ?? 0.45);
    if (e.ai) e.ai.state = 'idle';
    e.vel.x += dir.x * (h.kb || 0);
    e.vel.z += dir.z * (h.kb || 0);
    if (h.up) { e.vel.y = h.up; e.onGround = false; }
  }
  if (e.kind === 'npc') {   // people run away, everyone nearby reacts, and the police get called
    if (e.hp > 0 && e.hp <= 15) { e.ped.state = 'down'; e.ped.downT = 0; }
    else { e.ped.state = 'panic'; e.ped.panicT = 6; }
    reactBystanders(p, !h.police);
  }

  popText(at(p, e.height + 0.3), Math.round(dmg), h.heavy ? 'heavy' : '');
  burst(at(p, e.height * 0.6), h.heavy ? 18 : 8, [0xffffff, 0xffe08a, characters[charIdx].fx], h.heavy ? 12 : 7, 0.12, 0.3, 8);
  // Only count toward the player's own combo/ultimate-charge when the player
  // actually caused the hit — AI traffic running someone over was bumping the
  // on-screen combo counter for damage the player had nothing to do with.
  if (h.fromPlayer ?? true) {
    stats.ult = Math.min(100, stats.ult + dmg * 0.6 * (1 + prog.men * 0.08));
    registerCombo(dmg);
  }
  // The big screen-flash/shake was firing on every heavy hit regardless of target,
  // which made routine kills feel as disruptive as a boss fight. Kills (any kind)
  // never get the full flash now, even though the kill counter/combo still count.
  const killingBlow = e.hp <= 0;
  if (h.heavy && e.kind !== 'slime' && !killingBlow) impactFrame(h.impact ?? 1);
  else { hitStop = Math.max(hitStop, 0.035); shake = Math.max(shake, 0.08); }

  if (killingBlow) killEnemy(e);
  return true;
}

function killEnemy(e) {
  if(e.npcRaid){e.alive=false;e.hp=0;e.root.visible=false;e.respawn=Infinity;return;}
  if (e.kind === 'standing') {           // the standing dummy never dies
    e.hp = e.maxHp;
    popText(at(e.root.position, 2.6), 'RESET', 'info');
    return;
  }
  e.alive = false;
  e.stun = 0;
  // Counts toward the special-ability training quest (used to be slime-only, but
  // slimes were removed from the world — any real kill counts now).
  if (!specialUnlocked && e.kind !== 'npc') { specialTrainingKills = Math.min(5, specialTrainingKills + 1); localStorage.setItem('specialTrainingKills', String(specialTrainingKills)); }
  if (e.kind === 'slime') {
    e.respawn = 10;
    e.root.visible = false;
    kills++;
    gainXp(25);
  } else if (e.kind === 'wildlife') {
    e.respawn = e.animal === 'lion' ? 45 : 25;
    e.root.visible = false;
    const gold = e.animal === 'lion' ? 20 : 6;
    stats.gold += gold;
    popText(at(e.root.position, e.height + 0.6), `+${gold} gold`, 'info');
    gainXp(e.animal === 'lion' ? 30 : 12);
  } else if (e.kind === 'monster') {
    if(dungeon){heroDungeonKills++;saveAlignment();}
    monsterQuestKills++;persistSupportProgress();
    e.respawn = Infinity;   // dungeon monsters stay dead
    e.root.visible = false;
    const c = at(e.root.position, e.height * 0.5);
    const col = e.mdef.horns ? [0xff4020, 0x2a0606, 0xffb02e] : [0xffe08a, 0xffffff, 0xfff2c0];
    burst(c, 40, col, 10, 0.2, 0.7, 2);
    fxSphere(c, col[0], 2.5 * e.mdef.scale, 0.35);
    if(e.type==='venomSovereign'&&dungeon?.gate.finalBoss){supportCounters.bosses++;persistSupportProgress();}
    const bonus=e.type==='venomSovereign'&&dungeon?.gate.finalBoss?poisonBossMultiplier(dungeon.entryLevel,prog.level):1;
    if(bonus===20){dungeon.secretBonus=true;toast('Secret victory: level 50 Sovereign defeat. Rewards multiplied by 20!');}
    const xp = bonus*Math.round(e.mdef.xp * (1 + e.level * 0.2));
    const gold = bonus*Math.round(e.mdef.xp * 1.5 * (1 + e.level * 0.15));
    stats.gold += gold;
    popText(at(e.root.position, e.height + 0.6), `+${gold} gold`, 'info');
    gainXp(xp);
    if (e.superArmor) impactFrame(1.5);
  } else if (e.kind === 'npc') {
    e.respawn = 20;
    popText(at(e.root.position, 2.2), 'K.O.', 'break');
    dispatchDeathAmbulance(e);
    gainXp(10);
    villainKills++; localStorage.setItem('villainKills', String(villainKills));
    saveAlignment();
    if (!isVillain) { isVillain = true; toast('☠ You\'ve become a Villain. Your name now shows in red.'); }
    const n = randomCorner();   // comes back later somewhere else in town
    e.spot = cornerPos(n);
    Object.assign(e.ped, { state: 'wander', node: n, prev: null, target: cornerPos(n), stop: null, bus: null });
  } else {
    e.respawn = 4;
    popText(at(e.root.position, 2.6), 'K.O.', 'break');
    gainXp(e.kind === 'fighter' ? 60 : 40);
  }
  e.label && (e.label.el.style.display = 'none');
}

function enemyPhysics(e, dt) {
  const p = e.root.position;
  e.vel.y -= 30 * dt;
  p.addScaledVector(e.vel, dt);
  if (collide(p, e.radius) && e.thrown > 0 && Math.hypot(e.vel.x, e.vel.z) > 10) {
    // Thrown by Psychic Grip into a wall
    e.thrown = 0;
    e.vel.x *= -0.2; e.vel.z *= -0.2;
    popText(at(p, 2.4), 'WALL SLAM', 'break');
    applyHit(e, { dmg: psyDmg() * 0.6, from: p.clone().sub(e.vel), kb: 0, stun: 1.5, heavy: true, impact: 0.8, guardBreak: true });
    burst(at(p, 1), 20, [0x8a7d66, 0xb388ff, 0xffffff], 9, 0.2, 0.5, 15, 2);
  }
  const gy = groundY(p.x, p.z) + (e.fly || 0);   // flying monsters hover
  if (p.y <= gy) {
    if (!e.onGround && e.vel.y < -14) burst(at(p, 0.1), 10, [0xb8a88a, 0x8a7d66], 5, 0.15, 0.4, 12, 3);
    p.y = gy; e.vel.y = 0; e.onGround = true;
  } else if (p.y - gy > 0.05) e.onGround = false;
  const fr = e.onGround ? 8 : 0.6;
  e.vel.x *= Math.max(0, 1 - fr * dt);
  e.vel.z *= Math.max(0, 1 - fr * dt);
}
function walkTowards(e, target, speed, dt) {
  const p = e.root.position;
  const d = distXZ(p, target);
  if (d < 0.3) return false;
  p.x += (target.x - p.x) / d * speed * dt;
  p.z += (target.z - p.z) / d * speed * dt;
  e.root.rotation.y = lerpAngle(e.root.rotation.y, Math.atan2(target.x - p.x, target.z - p.z), 1 - Math.exp(-8 * dt));
  collide(p, e.radius);
  return true;
}
function faceTowards(e, target, maxTurn) {
  const p = e.root.position;
  const want = Math.atan2(target.x - p.x, target.z - p.z);
  e.root.rotation.y += clamp(angleDiff(e.root.rotation.y, want), -maxTurn, maxTurn);
}

// ---- Slimes ----
// Removed from the world per feedback (they were cluttering the park). Left
// disabled rather than deleted in case a different low-level enemy wants this
// spot/logic later.
const SLIMES_ENABLED = false;
const slimeGeo = new THREE.SphereGeometry(0.7, 24, 16);
const eyeGeo = new THREE.SphereGeometry(0.09, 8, 6);
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1b1b2f });
for (let i = 0; i < (SLIMES_ENABLED ? 8 : 0); i++) {
  const home = new THREE.Vector3(PARK.x + (rand() - 0.5) * 20, CURB, PARK.z + (rand() - 0.5) * 20);
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x55dd66, transparent: true, opacity: 0.88, roughness: 0.15 });
  const body = new THREE.Mesh(slimeGeo, mat);
  body.castShadow = true;
  body.position.y = 0.5;
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(s * 0.22, 0.15, 0.6);
    body.add(eye);
  }
  root.add(body);
  root.position.copy(home);
  scene.add(root);
  makeEnemy({ kind: 'slime', labelName: 'Slime', root, body, radius: 0.7, height: 1.2, maxHp: 40, home, hop: rand() * 6, touchCd: 0, flashMats: [mat] });
}

// ---- Wildlife: lions and snakes out in the mountains/forest ----
const WILDLIFE_DEFS = {
  lion: { label: 'Lion', radius: 0.7, height: 1.2, maxHp: 90, chase: 22, speed: 4.4, dmg: 12, kb: 9, colors: [0xc9962f, 0xb8841f], maneColor: 0x6b3e1a },
  snake: { label: 'Snake', radius: 0.4, height: 0.5, maxHp: 22, chase: 8, speed: 1.9, dmg: 5, kb: 4, colors: [0x5a7a3a, 0x3f5c2a] },
  skeleton: { label: 'Ancient Skeleton', radius: 0.5, height: 1.8, maxHp: 70, chase: 16, speed: 2.6, dmg: 14, kb: 7, colors: [0xe8e0c8, 0xdcd3b4] },
};
function addWildlife(kind, x, z) {
  const def = WILDLIFE_DEFS[kind];
  const home = new THREE.Vector3(x, CURB, z);
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: pick(def.colors), roughness: 0.85 });
  const flashMats = [mat];
  let body;
  if (kind === 'lion') {
    body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.0, 4, 10), mat);
    body.rotation.z = Math.PI / 2; body.position.y = 0.55;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), mat);
    head.position.set(0.85, 0.65, 0); body.add(head);
    const maneMat = new THREE.MeshStandardMaterial({ color: def.maneColor, roughness: 1 });
    const mane = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 8), maneMat);
    mane.position.set(0.82, 0.62, 0); mane.scale.set(0.8, 1, 1); body.add(mane);
    flashMats.push(maneMat);
    for (const [lx, side] of [[0.5, -1], [0.5, 1], [-0.5, -1], [-0.5, 1]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.55, 6), mat);
      leg.position.set(lx, -0.45, side * 0.3); body.add(leg);
    }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.8, 5), mat);
    tail.position.set(-0.85, 0.2, 0); tail.rotation.z = Math.PI / 2.6; body.add(tail);
    root.add(body);
  } else if (kind === 'skeleton') {
    body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.75, 4, 8), mat);
    body.position.y = 1.0; root.add(body);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat);
    skull.position.y = 1.65; root.add(skull);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 5), mat);
      arm.position.set(side * 0.32, 1.05, 0); root.add(arm);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.85, 5), mat);
      leg.position.set(side * 0.14, 0.42, 0); root.add(leg);
    }
  } else {
    body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 1.4, 4, 8), mat);
    body.rotation.z = Math.PI / 2; body.position.y = 0.18; root.add(body);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.38, 6), mat);
    head.rotation.z = -Math.PI / 2; head.position.set(0.9, 0.18, 0); root.add(head);
  }
  root.position.copy(home);
  scene.add(root);
  makeEnemy({ kind: 'wildlife', animal: kind, labelName: def.label, root, body: body || root, radius: def.radius,
    height: def.height, maxHp: def.maxHp, home, touchCd: 0, phase: rand() * 10, flashMats });
}
function updateWildlife(e, dt) {
  const def = WILDLIFE_DEFS[e.animal], p = e.root.position;
  const dist = distXZ(p, player.position);
  let mx = 0, mz = 0;
  e.phase += dt * (e.animal === 'lion' ? 4 : 3);
  if (e.stun <= 0 && e.onGround) {
    if (!inCar && dist < def.chase && dist > 0.9) { mx = (player.position.x - p.x) / dist * def.speed; mz = (player.position.z - p.z) / dist * def.speed; }
    else { const dh = distXZ(p, e.home); if (dh > 2) { mx = (e.home.x - p.x) / dh * (def.speed * 0.5); mz = (e.home.z - p.z) / dh * (def.speed * 0.5); } }
  }
  if (mx || mz) {
    p.x += mx * dt; p.z += mz * dt;
    collide(p, e.radius);
    e.root.rotation.y = lerpAngle(e.root.rotation.y, Math.atan2(mx, mz), 1 - Math.exp(-8 * dt));
  }
  if (e.animal === 'snake') e.root.rotation.z = (mx || mz) ? Math.sin(e.phase) * 0.35 : 0;   // slither wiggle while moving
  else if (e.animal === 'lion') e.body.position.y = 0.55 + Math.abs(Math.sin(e.phase)) * (mx || mz ? 0.1 : 0);
  p.y = groundY(p.x, p.z);
  e.touchCd -= dt;
  if (!inCar && e.stun <= 0 && dist < (e.animal === 'snake' ? 1.1 : 1.6) && Math.abs(p.y - player.position.y) < 1.5 && e.touchCd <= 0) {
    hurtPlayer(def.dmg, p, def.kb);
    e.touchCd = e.animal === 'snake' ? 1.6 : 1.2;
  }
}
for (let i = 0; i < 6; i++) addWildlife('lion', -320 - rand() * 170, 590 + rand() * 360);
for (let i = 0; i < 10; i++) addWildlife('snake', -320 - rand() * 170, 590 + rand() * 360);

// ---- Training dummies ----
function makeDummy(kind, name, spot, look, maxHp) {
  const h = makeHumanoid(look);
  h.root.position.copy(spot);
  h.root.rotation.y = -Math.PI / 2;    // face the arena entrance (west)
  return makeEnemy({ kind, labelName: name, h, root: h.root, radius: 0.45, height: 2.0, maxHp, spot: spot.clone(),
    flashMats: h.flashMats, ai: kind === 'fighter' ? { state: 'idle', t: 0, combo: 0, cd: 1, dashCd: 2, hitDone: false } : null });
}
// Training dummies removed per feedback — that spot is now Ashford Chapel
// (see buildChapel()) instead of the practice yard.

// ---- Enemy AI ----
function updateSlime(e, dt) {
  const p = e.root.position;
  const dist = distXZ(p, player.position);
  let mx = 0, mz = 0;
  if (e.stun <= 0 && e.onGround) {
    if (!inCar && dist < 16 && dist > 0.9) {
      mx = (player.position.x - p.x) / dist * 2.8;
      mz = (player.position.z - p.z) / dist * 2.8;
    } else {
      const dh = distXZ(p, e.home);
      if (dh > 1) { mx = (e.home.x - p.x) / dh * 1.5; mz = (e.home.z - p.z) / dh * 1.5; }
    }
  }
  if (mx || mz) {
    p.x += mx * dt; p.z += mz * dt;
    collide(p, e.radius);
    e.root.rotation.y = lerpAngle(e.root.rotation.y, Math.atan2(mx, mz), 1 - Math.exp(-8 * dt));
  }
  if (e.onGround && e.stun <= 0) e.hop += dt * 6;
  const h = e.onGround ? Math.abs(Math.sin(e.hop)) : 0.6;
  e.body.position.y = 0.5 + h * 0.5;
  e.body.scale.set(1 + 0.15 * (1 - h), 0.75 + 0.25 * h, 1 + 0.15 * (1 - h));
  e.touchCd -= dt;
  if (!inCar && e.stun <= 0 && dist < 1.3 && Math.abs(p.y - player.position.y) < 1.5 && e.touchCd <= 0) {
    hurtPlayer(6, p, 6);
    e.touchCd = 1;
  }
}

function updateStanding(e, dt) {
  e.lastHit += dt;
  if (e.lastHit > 3 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.5 * dt);
  let moving = false;
  if (e.onGround && e.stun <= 0) moving = walkTowards(e, e.spot, 2, dt);
  if (!moving) e.root.rotation.y = lerpAngle(e.root.rotation.y, -Math.PI / 2, 1 - Math.exp(-3 * dt));
  animateHumanoid(e.h, e.stun > 0 ? 'stunned' : null, moving, false, e.onGround, dt);
}

function updateDefence(e, dt) {
  e.guard = Math.max(0, e.guard - 12 * dt);
  e.blocking = e.stun <= 0;
  let moving = false;
  if (e.onGround && e.stun <= 0) {
    if (distXZ(e.root.position, e.spot) > 0.5) moving = walkTowards(e, e.spot, 2, dt);
    // Turns slowly, so you can dash behind it
    if (!inCar && distXZ(e.root.position, player.position) < 15) faceTowards(e, player.position, 3.2 * dt);
  }
  animateHumanoid(e.h, e.stun > 0 ? 'stunned' : 'block', false, false, e.onGround, dt);
}

function updateFighter(e, dt) {
  const ai = e.ai, p = e.root.position;
  ai.cd -= dt; ai.dashCd -= dt;
  const dist = distXZ(p, player.position);
  const aggro = !inCar && dist < 16 && distXZ(player.position, e.spot) < 22;
  let pose = null, moving = false;

  if (e.stun > 0) {
    ai.state = 'idle'; e.glow = 0; pose = 'stunned';
  } else if (!aggro) {
    ai.state = 'idle'; e.glow = 0;
    if (e.onGround) moving = walkTowards(e, e.spot, 3, dt);
  } else if (e.onGround) {
    faceTowards(e, player.position, 10 * dt);
    ai.t += dt;
    switch (ai.state) {
      case 'idle':
        if (dist > 2.0) {
          if (dist > 6 && ai.dashCd <= 0) { ai.state = 'dash'; ai.t = 0; ai.dashCd = 4; }
          else moving = walkTowards(e, player.position, 3.8, dt);
        } else if (ai.cd <= 0) { ai.state = 'windup'; ai.t = 0; ai.combo = 0; }
        break;
      case 'dash': {
        pose = 'dash';
        const f = fwdOf(e.root);
        p.addScaledVector(f, 15 * dt);
        collide(p, e.radius);
        spawnParticle(at(p, 1), randUnit().multiplyScalar(1.5).addScaledVector(f, -3), 0xffffff, 0.12, 0.3);
        if (ai.t > 0.28 || dist < 1.6) { ai.state = 'idle'; ai.t = 0; }
        break;
      }
      case 'windup':                        // red glow = attack incoming, get ready to block or dash
        pose = 'windup';
        e.glow = ai.t / 0.5;
        if (ai.t >= 0.5) { ai.state = 'punch'; ai.t = 0; ai.hitDone = false; e.glow = 0; }
        break;
      case 'punch': {
        pose = ai.combo % 2 ? 'punchL' : 'punchR';
        const f = fwdOf(e.root);
        if (ai.t < 0.1) { p.addScaledVector(f, 4 * dt); collide(p, e.radius); }
        if (!ai.hitDone && ai.t >= 0.07) {
          ai.hitDone = true;
          const to = new THREE.Vector3(player.position.x - p.x, 0, player.position.z - p.z);
          const last = ai.combo === 2;
          if (to.length() < 2.5 && to.normalize().dot(f) > 0.3 && Math.abs(player.position.y - p.y) < 1.5) {
            hurtPlayer(last ? 12 : 6, p, last ? 16 : 4);
          }
          fxSwoosh(at(p, 1.3).addScaledVector(f, 0.8), f, 0xff7675, ai.combo % 2);
        }
        if (ai.t >= 0.3) {
          ai.combo++;
          if (ai.combo < 3) { ai.t = 0; ai.hitDone = false; }
          else { ai.state = 'recover'; ai.t = 0; }
        }
        break;
      }
      case 'recover':
        if (ai.t > 0.9) { ai.state = 'idle'; ai.t = 0; ai.cd = 0.6 + Math.random() * 0.8; }
        break;
    }
  }
  animateHumanoid(e.h, pose, moving, false, e.onGround, dt);
}

// =====================================================================
// PEDESTRIANS (walk the pavements, cross at junctions, take the bus, panic when attacked)
// =====================================================================
// Pedestrians walk between the four corners of each block. A corner is {bx, bz, sx, sz}.
const PED_OUTFITS = [0x2e86de, 0xe17055, 0x6c5ce7, 0x00b894, 0xfdcb6e, 0xd63031, 0x636e72, 0xfab1a0, 0x0984e3, 0xf5f6fa];
const PED_HAIR = [0x2d1b0e, 0x4a2c17, 0x111111, 0xc8a165, 0x8e3b1f, 0xdddddd];
const PED_SKIN = [0xffdcc0, 0xf1c27d, 0xc68642, 0x8d5524, 0xe0ac69];
const PED_PANTS = [0x2d3142, 0x34495e, 0x1e272e, 0x6d4c41, 0x2f3640];
const SIDE = 11;
const HIDDEN = new THREE.Vector3(9999, -500, 9999);
const cornerPos = n => new THREE.Vector3(n.bx * 40 + 20 + n.sx * (n.bz>=16?11:SIDE), CURB, n.bz * 40 + 20 + n.sz * (n.bz>=16?11:SIDE));
// Block-grid bounds pedestrians are allowed to wander within. Main town is the
// original/default; Riverside and the Capital get their own so their peds don't
// try to wander into the water between districts.
const MAIN_BOUNDS = { bx0: -4, bx1: 3, bz0: -4, bz1: 3 };
const RIVERSIDE_BOUNDS = { bx0: -2, bx1: 1, bz0: 16, bz1: 18 };
const CAPITAL_BOUNDS = { bx0: 3, bx1: 10, bz0: 17, bz1: 22 };
const randomCorner = (b = MAIN_BOUNDS) => ({ bx: b.bx0 + Math.floor(Math.random() * (b.bx1 - b.bx0 + 1)), bz: b.bz0 + Math.floor(Math.random() * (b.bz1 - b.bz0 + 1)), sx: pick([-1, 1]), sz: pick([-1, 1]) });
function nearestCorner(p, b = MAIN_BOUNDS) {
  const bx = clamp(Math.floor(p.x / 40), b.bx0, b.bx1), bz = clamp(Math.floor(p.z / 40), b.bz0, b.bz1);
  return { bx, bz, sx: p.x >= bx * 40 + 20 ? 1 : -1, sz: p.z >= bz * 40 + 20 ? 1 : -1 };
}
function nextCorner(n, prev, b = MAIN_BOUNDS) {
  const opts = [{ ...n, sx: -n.sx }, { ...n, sz: -n.sz }];                                   // walk along the block
  if (n.bx + n.sx >= b.bx0 && n.bx + n.sx <= b.bx1) opts.push({ bx: n.bx + n.sx, bz: n.bz, sx: -n.sx, sz: n.sz }); // cross the road
  if (n.bz + n.sz >= b.bz0 && n.bz + n.sz <= b.bz1) opts.push({ bx: n.bx, bz: n.bz + n.sz, sx: n.sx, sz: -n.sz });
  const same = (a, b2) => b2 && a.bx === b2.bx && a.bz === b2.bz && a.sx === b2.sx && a.sz === b2.sz;
  const f = opts.filter(o => !same(o, prev));
  return pick(f.length ? f : opts);
}

const peds = [];
function addPedPopulation(count, bounds) {
  for (let i = 0; i < count; i++) {
    const h = makeHumanoid({ outfit: pick(PED_OUTFITS), hair: pick(PED_HAIR), skin: pick(PED_SKIN), pants: pick(PED_PANTS) });
    h.rig.scale.setScalar(0.82 + Math.random() * 0.14);
    const start = randomCorner(bounds), next = nextCorner(start, null, bounds);
    h.root.position.lerpVectors(cornerPos(start), cornerPos(next), Math.random());
    peds.push(makeEnemy({ kind: 'npc', h, root: h.root, radius: 0.35, height: 1.9, maxHp: 50, flashMats: h.flashMats,
      ped: { state: 'wander', node: next, prev: start, target: cornerPos(next), speed: 1.2 + Math.random() * 0.6, panicT: 0, waitT: 0, stop: null, bus: null, bounds } }));
  }
}
addPedPopulation(34, MAIN_BOUNDS);
addPedPopulation(10, RIVERSIDE_BOUNDS);
addPedPopulation(18, CAPITAL_BOUNDS);
addPedPopulation(12, { bx0: -2, bx1: -2, bz0: 1, bz1: 1 });   // students attending Ashford School

// Bystanders react to nearby violence/explosions like real people would instead
// of only the directly-hit ped panicking: close by, people flee; a bit further
// out, some pull out a phone to film it and some call it in to the police.
function reactBystanders(center, criminal) {
  for (const o of peds) {
    if (!o.alive || o.hidden) continue;
    if (['boarding', 'riding', 'down', 'cpr'].includes(o.ped.state)) continue;
    const d = distXZ(o.root.position, center);
    if (d < 15) { o.ped.state = 'panic'; o.ped.panicT = 5 + Math.random() * 2; }
    else if (d < 45 && o.ped.state !== 'panic') {
      const r = Math.random();
      if (r < 0.3) { o.ped.state = 'call'; o.ped.reactT = 4 + Math.random() * 3; o.ped.lookAt = center.clone(); }
      else if (r < 0.6) { o.ped.state = 'record'; o.ped.reactT = 5 + Math.random() * 4; o.ped.lookAt = center.clone(); }
    }
  }
  if (criminal) raiseWanted();
}
// A badly hurt NPC goes 'down' instead of just fleeing; a nearby bystander will
// come give CPR, and if nobody's close (or CPR runs long enough) an ambulance
// gets called in from the hospital to pick them up.
function dispatchAmbulance(victim) {
  if (!HOSPITAL_POS || victim.ped.ambulanceDispatched) return;
  victim.ped.ambulanceDispatched = true;
  const dest = victim.root.position.clone();
  const amb = makeVehicle('ambulance', 0xffffff);
  amb.ai = null;
  amb.group.position.copy(HOSPITAL_POS); amb.group.position.y = 0;
  toast('An ambulance has been dispatched to the scene.');
  const st = { phase: 1, exit: HOSPITAL_POS.clone() };
  addTask({ dur: 120, update(dt, t, task) {
    const p = amb.group.position, target = st.phase === 1 ? dest : st.exit;
    const dir = new THREE.Vector3(target.x - p.x, 0, target.z - p.z), d = dir.length();
    if (d > 2) {
      dir.normalize(); p.addScaledVector(dir, 11 * dt);
      amb.group.rotation.y = lerpAngle(amb.group.rotation.y, Math.atan2(dir.x, dir.z), 1 - Math.exp(-5 * dt));
    } else if (st.phase === 1) {
      st.phase = 2;
      victim.hidden = true; victim.root.visible = false; victim.root.position.copy(HIDDEN);
      victim.ped.state = 'rescued'; victim.alive = true; victim.hp = victim.maxHp;
      toast('Patient loaded — ambulance is heading back to the hospital.');
    } else task.t = task.dur;
  }, end() { const i = vehicles.indexOf(amb); if (i >= 0) vehicles.splice(i, 1); disposeObj(amb.group); } });
}
// A killed NPC used to just lie there, then silently teleport to a new spot
// once its respawn timer ran out. Now an ambulance actually comes for the
// body — purely visual, doesn't touch the existing alive/respawn timing.
function dispatchDeathAmbulance(e) {
  if (!HOSPITAL_POS) return;
  const dest = e.root.position.clone();
  const amb = makeVehicle('ambulance', 0xffffff);
  amb.ai = null;
  amb.group.position.copy(HOSPITAL_POS); amb.group.position.y = 0;
  const st = { phase: 1, exit: HOSPITAL_POS.clone() };
  addTask({ dur: 60, update(dt, t, task) {
    const p = amb.group.position, target = st.phase === 1 ? dest : st.exit;
    const dir = new THREE.Vector3(target.x - p.x, 0, target.z - p.z), d = dir.length();
    if (d > 2) {
      dir.normalize(); p.addScaledVector(dir, 11 * dt);
      amb.group.rotation.y = lerpAngle(amb.group.rotation.y, Math.atan2(dir.x, dir.z), 1 - Math.exp(-5 * dt));
    } else if (st.phase === 1) {
      st.phase = 2;
      if (e.h) e.root.visible = false;   // only if still the same body — e.respawn's own reset will re-show it later
    } else task.t = task.dur;
  }, end() { const i = vehicles.indexOf(amb); if (i >= 0) vehicles.splice(i, 1); disposeObj(amb.group); } });
}
function updatePed(e, dt) {
  const s = e.ped, p = e.root.position;
  // Skip full pathing/animation work for ordinary wandering peds far from the
  // player — with 4 separate populated districts, most of them aren't visible
  // at any given moment anyway. Anything mid-reaction (panic, down, boarding,
  // etc.) still updates normally regardless of distance.
  if (s.state === 'wander' && distXZ(p, player.position) > 120) return;
  let moving = false, speed = s.speed;
  if (e.stun > 0 || !e.onGround) { animateHumanoid(e.h, e.stun > 0 ? 'stunned' : null, false, false, e.onGround, dt); return; }
  switch (s.state) {
    case 'down': {
      s.downT = (s.downT || 0) + dt;
      animateHumanoid(e.h, 'stunned', false, false, e.onGround, dt);
      if (s.downT > 1.5 && !s.helperAssigned) {
        s.helperAssigned = true;
        const helper = peds.find(o => o !== e && o.alive && !o.hidden && o.ped.state === 'wander' && distXZ(o.root.position, p) < 25);
        if (helper) { helper.ped.state = 'cpr'; helper.ped.cprTarget = e; helper.ped.cprT = 0; }
        else dispatchAmbulance(e);
      }
      break;
    }
    case 'chat': {animateHumanoid(e.h,null,false,false,e.onGround,dt);break;}
    case 'personalCall': {s.reactT-=dt;animateHumanoid(e.h,'phone',false,false,e.onGround,dt);if(s.reactT<=0)s.state='wander';break;}
    case 'call': case 'record': {
      s.reactT -= dt;
      if (s.lookAt) e.root.rotation.y = lerpAngle(e.root.rotation.y, Math.atan2(s.lookAt.x - p.x, s.lookAt.z - p.z), 1 - Math.exp(-4 * dt));
      animateHumanoid(e.h, 'phone', false, false, e.onGround, dt);
      if (s.reactT <= 0) {
        if (s.state === 'call') raiseWanted(30);
        s.state = 'wander'; s.node = nearestCorner(p, s.bounds); s.prev = null; s.target = cornerPos(s.node);
      }
      break;
    }
    case 'cpr': {
      const victim = s.cprTarget;
      if (!victim || !victim.alive || victim.ped.state !== 'down') { s.state = 'wander'; s.node = nearestCorner(p, s.bounds); s.prev = null; s.target = cornerPos(s.node); break; }
      const vp = victim.root.position;
      if (distXZ(p, vp) > 1.2) { moving = walkTowards(e, vp, 2, dt); animateHumanoid(e.h, null, moving, false, e.onGround, dt); break; }
      s.cprT = (s.cprT || 0) + dt;
      animateHumanoid(e.h, 'cpr', false, false, e.onGround, dt);
      if (s.cprT > 6 && !victim.ped.ambulanceDispatched) dispatchAmbulance(victim);
      if (victim.ped.state === 'rescued') { s.state = 'wander'; s.node = nearestCorner(p, s.bounds); s.prev = null; s.target = cornerPos(s.node); }
      break;
    }
    case 'panic': {
      s.panicT -= dt;
      const away = new THREE.Vector3(p.x - player.position.x, 0, p.z - player.position.z);
      if (away.lengthSq() < 0.01) away.set(1, 0, 0);
      speed = 5.5;
      moving = walkTowards(e, p.clone().addScaledVector(away.normalize(), 3), speed, dt);
      if (s.panicT <= 0) { s.state = 'wander'; s.node = nearestCorner(p, s.bounds); s.prev = null; s.target = cornerPos(s.node); }
      break;
    }
    case 'wander':
    case 'toStop':
      if(p.z>=640&&s.node&&s.prev&&(s.node.bx!==s.prev.bx||s.node.bz!==s.prev.bz)){const centre=p.clone().add(s.target).multiplyScalar(.5),axis=s.node.bx!==s.prev.bx?'z':'x',signal=trafficLights.filter(t=>t.axis===axis).find(t=>Math.hypot(t.x-centre.x,t.z-centre.z)<22);const car=vehicles.find(v=>!v.disabled&&Math.abs(v.speed)>2&&distXZ(v.group.position,centre)<16);const beforeCross=s.node.bx!==s.prev.bx?Math.abs(p.x-Math.round(p.x/40)*40)>=8:Math.abs(p.z-Math.round(p.z/40)*40)>=8;if(beforeCross&&((signal&&signal.phase<4)||car)){animateHumanoid(e.h,null,false,false,true,dt);break;}}
      moving = walkTowards(e, s.target, speed, dt);
      if (distXZ(p, s.target) < 0.5) {
        if (s.state === 'toStop') { s.state = 'waiting'; s.waitT = 0; break; }
        const stop = busStops.find(b => distXZ(b.wait, p) < 25 && b.waiting.length < 4);
        if (stop && Math.random() < 0.35) {   // decide to catch the bus
          s.state = 'toStop'; s.stop = stop;
          stop.waiting.push(e);
          s.target = stop.wait.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5));
        } else {
          const n = nextCorner(s.node, s.prev, s.bounds);
          s.prev = s.node; s.node = n; s.target = cornerPos(n);
        }
      }
      break;
    case 'waiting':
      s.waitT += dt;
      e.root.rotation.y = lerpAngle(e.root.rotation.y, s.stop.face, 1 - Math.exp(-4 * dt));
      if (s.waitT > 70) {   // gave up on the bus
        s.stop.waiting = s.stop.waiting.filter(x => x !== e);
        s.state = 'wander'; s.node = nearestCorner(p, s.bounds); s.prev = null; s.target = cornerPos(s.node);
      }
      break;
    case 'boarding': {
      const door = busDoor(s.bus);
      speed = 2.5;
      moving = walkTowards(e, door, speed, dt);
      if (distXZ(p, door) < 0.9 && s.bus.ai) {
        s.state = 'riding';
        e.hidden = true; e.root.visible = false;
        p.copy(HIDDEN);
        s.bus.passengers.push(e);
      } else if (!s.bus.ai || s.bus.ai.stopTimer <= 0) {   // missed it
        s.state = 'toStop'; s.target = s.stop.wait.clone();
        s.stop.waiting.push(e);
      }
      break;
    }
  }
  animateHumanoid(e.h, null, moving, speed > 3, true, dt);
}

function updateEnemies(dt) {
  for (const e of enemies) {
    e.flash = Math.max(0, e.flash - dt * 5);
    e.stun = Math.max(0, e.stun - dt);
    e.carCd -= dt;
    e.thrown = Math.max(0, (e.thrown || 0) - dt);
    if (e.hidden) continue;                                   // riding a bus
    if (e.held && action?.name !== 'psy') e.held = false;
    if (e.held) { for (const m of e.flashMats) m.emissive.setRGB(0.35, 0.1, 0.6); continue; }   // floating in Psychic Grip

    if (!e.alive) {
      e.respawn -= dt;
      if (e.h) {   // dummy lying on the ground after a K.O.
        e.h.rig.rotation.x = lerp(e.h.rig.rotation.x, -Math.PI / 2, 1 - Math.exp(-8 * dt));
        e.h.rig.position.y = 0.25;
      }
      if (e.respawn <= 0) {
        e.alive = true; e.hp = e.maxHp; e.vel.set(0, 0, 0); e.guard = 0;
        e.root.position.copy(e.spot || e.home);
        e.root.visible = true;
        if (e.h) e.h.rig.rotation.set(0, 0, 0);
        if (e.h && e.kind !== 'npc') { e.root.rotation.y = -Math.PI / 2; popText(at(e.root.position, 2.4), 'RESET', 'info'); }
      }
      continue;
    }

    enemyPhysics(e, dt);
    if (e.kind === 'slime') updateSlime(e, dt);
    else if (e.kind === 'wildlife') updateWildlife(e, dt);
    else if (e.kind === 'standing') updateStanding(e, dt);
    else if (e.kind === 'defence') updateDefence(e, dt);
    else if (e.kind === 'npc') updatePed(e, dt);
    else if (e.kind === 'monster') updateMonster(e, dt);
    else updateFighter(e, dt);

    if (e.h) {   // flinch backwards when hit, wobble while stunned
      e.h.rig.rotation.x = lerp(e.h.rig.rotation.x, -0.35 * e.flash, 1 - Math.exp(-20 * dt));
      e.h.rig.rotation.z = e.stun > 0 ? Math.sin(performance.now() / 50) * 0.08 : 0;
    }
    for (const m of e.flashMats) m.emissive.setRGB(e.flash + e.glow * 0.9, e.flash * 0.9, e.flash * 0.9);


  }
}

function updateLabels() {
  for (const e of enemies) {
    if (!e.label) continue;
    const el = e.label.el;
    const show = e.alive && distXZ(e.root.position, camera.position) < 40 && (e.kind !== 'slime' || e.hp < e.maxHp);
    const s = show && toScreen(at(e.root.position, e.height + 0.35));
    if (!s) { el.style.display = 'none'; continue; }
    el.style.display = 'block';
    el.style.left = s.x + 'px';
    el.style.top = s.y + 'px';
    e.label.hp.style.width = clamp(e.hp / e.maxHp * 100, 0, 100) + '%';
    if (e.label.guard) e.label.guard.style.width = clamp(e.guard, 0, 100) + '%';
  }
}

// =====================================================================
// PLAYER COMBAT
// =====================================================================
function hurtPlayer(dmg, from, kb) {
  if(inCar&&driving){monsterEnvironmentDamage(driving.group.position,dmg,2);return;}
  if (iFrames > 0) return;
  dmg *= defMul()*(supportSkills?.defenseMultiplier||1)*(adventureServices?.armour||1);
  // High defense can knock dmg down near zero; it still rounded to "0" in the
  // taken-damage popup along with a full flash/stun/knockback for nothing.
  if (dmg < 0.5) return;
  const dir = new THREE.Vector3(player.position.x - from.x, 0, player.position.z - from.z).normalize();
  if (playerBlocking && fwdOf(player).dot(dir) < -0.3) {
    dmg *= 0.2; kb *= 0.3;
    popText(at(player.position, 2.2), 'BLOCK', 'block');
    burst(at(player.position, 1.3).addScaledVector(dir, -0.4), 6, [0x74b9ff, 0xffffff], 6, 0.1, 0.25, 0);
  } else {
    playerStun = 0.35;
    if (action && !action.superArmor) action = null;
    $('hurt').style.opacity = 1;
    setTimeout(() => $('hurt').style.opacity = 0, 150);
    popText(at(player.position, 2.2), Math.round(dmg), 'taken');
  }
  stats.hp -= dmg;
  pvel.addScaledVector(dir, kb);
  shake = Math.max(shake, 0.2);
}

function startAction(a) { action = Object.assign({ t: 0, hits: new Set() }, a); }

// Powers and melee share vehicle hit detection with character attacks.
function hitVehicles(center, range, hits, h, maxDy, dir = null, minDot = -1) {
  let count = 0;
  for (const v of vehicles) {
    if (!isRoadVehicle(v) || v.exploded || hits?.has(v)) continue;
    const delta = v.group.position.clone().sub(center).setY(0), distance = delta.length();
    if (distance > range + v.radius || Math.abs(v.group.position.y + 0.8 - center.y) > maxDy) continue;
    if (dir && distance > 0.6 && delta.normalize().dot(dir) < minDot) continue;
    hits?.add(v); damageVehiclePower(v, Number(h.dmg) || 0, center,!h.police&&h.fromPlayer!==false); count++;
  }
  return count;
}
function damageVehiclePower(v, damage, from, criminal = true) {
  if (!isRoadVehicle(v) || v.exploded || !Number.isFinite(damage) || damage <= 0) return;
  if (criminal) raiseWanted(v.kind === 'police' ? 120 : 60);
  v.health = Math.max(0, (v.health ?? 100) - damage);applyVehicleCondition(v);
  burst(at(v.group.position, 0.8), 8, [0xffcc66, 0x777777], 4, 0.1, 0.3, 8, 1);
  if (v.health === 0) explodeVehicle(v, criminal);
}
function explodeVehicle(v, criminal = true) {
  if (v.exploded) return;
  v.exploded = true; v.disabled = true; v.health = 0; v.speed = 0;
  const center = at(v.group.position, 0.8), radius = v.kind === 'bus' ? 8 : 6;
  if (v === driving) { stats.hp = Math.max(0, stats.hp - 35); exitVehicle(true); }
  // Mark the wreck before applying blast damage so chain reactions run once.
  v.group.traverse(obj => {
    if (!obj.isMesh) return;
    const darken = material => { const m = material.clone(); m.color?.set(0x292727); m.emissive?.set(0); return m; };
    obj.material = Array.isArray(obj.material) ? obj.material.map(darken) : darken(obj.material);
  });
  fxSphere(center, 0xff7b24, radius, 0.45);
  burst(center, 45, [0xff8022, 0xffd166, 0x555555], 12, 0.2, 0.8, 9, 3);
  shake = Math.max(shake, 0.65);
  scorchMark(v.group.position, radius * 0.55);
  burnFor(center, 40, 1.4); // the wreck keeps burning for a while, then just sits there charred for good
  for (const e of enemies) {
    if (!e.alive || e.hidden) continue;
    const distance = e.root.position.distanceTo(center);
    if (distance >= radius) continue;
    applyHit(e, { dmg: 65 * (1 - distance / radius), from: center, kb: 15 * (1 - distance / radius), up: 4, stun: 1.5, heavy: true, police: !criminal });
  }
  if (v.passengers?.length) {
    for (const e of v.passengers) { e.hidden = false; e.root.visible = true; e.root.position.copy(v.group.position).add(new THREE.Vector3(v.radius + 1, 0, 0)); collide(e.root.position, e.radius); e.ped.state = 'panic'; e.ped.panicT = 10; applyHit(e, { dmg: 45, from: center, kb: 6, up: 2, stun: 2, police: !criminal }); }
    v.passengers = [];
  }
  if (!inCar && player.position.distanceTo(center) < radius) hurtPlayer(50 * (1 - player.position.distanceTo(center) / radius), center, 10);
  for (const other of vehicles) {
    if (other === v || other.exploded || !isRoadVehicle(other)) continue;
    const distance = other.group.position.distanceTo(center);
    if (distance < radius) damageVehiclePower(other, 75 * (1 - distance / radius), center, criminal);
  }
  reactBystanders(center, false); // panic/record/call radius; raiseWanted(120) below already covers the crime
  if (criminal) raiseWanted(120);
  toast('Vehicle exploded! Keep clear of the blast.');
  setTimeout(() => dispatchTowTruck(v), 20000); // give it time to actually burn before towing it off
}
// A tow truck drives out from off-map, hooks the wreck, and hauls it away for good.
function dispatchTowTruck(v) {
  if (v.towDispatched || !vehicles.includes(v)) return;
  v.towDispatched = true;
  const dest = v.group.position.clone();
  const start = dest.clone().add(new THREE.Vector3((Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 30), 0, (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 30)));
  const tow = makeVehicle('car', 0xffaa00);
  tow.ai = null;
  tow.group.position.copy(start); tow.group.position.y = 0;
  toast('A tow truck is on its way to clear the wreckage.');
  const st = { phase: 1, exit: null };
  addTask({ dur: 150, update(dt, t, task) {
    const p = tow.group.position, target = st.phase === 1 ? dest : st.exit;
    if (!target) return;
    const dir = new THREE.Vector3(target.x - p.x, 0, target.z - p.z), d = dir.length();
    if (d > 2.5) {
      dir.normalize(); p.addScaledVector(dir, 9 * dt);
      tow.group.rotation.y = lerpAngle(tow.group.rotation.y, Math.atan2(dir.x, dir.z), 1 - Math.exp(-5 * dt));
    } else if (st.phase === 1) {
      st.phase = 2;
      st.exit = dest.clone().add(new THREE.Vector3((Math.random() < 0.5 ? -1 : 1) * (70 + Math.random() * 40), 0, (Math.random() < 0.5 ? -1 : 1) * (70 + Math.random() * 40)));
      const i = vehicles.indexOf(v); if (i >= 0) vehicles.splice(i, 1);
      disposeObj(v.group);
      toast('Wreckage hooked up — tow truck heading out.');
    } else task.t = task.dur;
  }, end() { const i = vehicles.indexOf(tow); if (i >= 0) vehicles.splice(i, 1); disposeObj(tow.group); } });
}

// =====================================================================
// TAXI: wait at the rank, board it (you're a passenger, not the driver), then
// "Take me home" drives it to SPAWN on its own and drops you off. A basic,
// honest first version — not a full pick-any-destination service yet.
// =====================================================================
// Taxi service is provided in every city by city-services.js.

// Hit everything within r of center. Returns how many were hit.
function hitAround(center, r, hits, h, maxDy = 3) {
  breakLampsNear(center, r);
  if (charIdx === 2) {   // Water — any attack/skill near a fire puts it out
    for (const fire of activeFires.slice()) {
      if (distXZ(fire.pos, center) < r + 2.5) { fire.task.t = fire.task.dur; toast('You put out the fire.'); }
    }
  }
  let n = hitVehicles(center, r, hits, h, maxDy);
  for (const a of parkPets) {   // dogs/cats/horses weren't attackable at all before — now they are
    if (!a.alive || a.ridden) continue;
    if (distXZ(a.g.position, center) > r + (a.radius ?? 0.4) || Math.abs(a.g.position.y - center.y) > maxDy) continue;
    a.hp -= h.dmg ?? 0;
    burst(at(a.g.position, 0.5), 8, [0xffffff, 0x8a5a3a], 6, 0.1, 0.25, 6);
    if (a.hp <= 0 && a.alive) {
      a.alive = false; a.g.visible = false;
      if (a.mountInteract) { const idx = interactables.indexOf(a.mountInteract); if (idx >= 0) interactables.splice(idx, 1); }
      raiseWanted(40);
    }
  }
  for (const e of enemies) {
    if (!e.alive || hits?.has(e)) continue;
    if (distXZ(e.root.position, center) > r + e.radius || Math.abs(e.root.position.y - center.y) > maxDy) continue;
    applyHit(e, Object.assign({ from: center }, h));
    hits?.add(e);
    n++;
  }
  return n;
}
// Hit everything in front of origin within range.
function hitCone(origin, dir, range, minDot, hits, h, maxDy = 2.5) {
 for(let i=0;i<lampSpots.length;i++){const p=lampSpots[i],d=p.clone().sub(origin).setY(0);if(!lampBroken[i]&&Math.abs(p.y-origin.y)<=maxDy&&d.length()<range+.3&&(d.length()<.6||d.normalize().dot(dir)>=minDot))breakLamp(i);}
  let n = hitVehicles(origin, range, hits, h, maxDy, dir, minDot);
  for (const e of enemies) {
    if (!e.alive || hits?.has(e)) continue;
    const d = new THREE.Vector3(e.root.position.x - origin.x, 0, e.root.position.z - origin.z);
    const len = d.length();
    if (len > range + e.radius || Math.abs(e.root.position.y - origin.y) > maxDy) continue;
    if (len > 0.6 && d.normalize().dot(dir) < minDot) continue;
    applyHit(e, Object.assign({ from: origin }, h));
    hits?.add(e);
    n++;
  }
  return n;
}

// Skills aim where the camera looks, snapping onto an enemy if one is roughly in front.
function aimForward() {
  const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  let best = null, bestScore = 0.8;
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = new THREE.Vector3(e.root.position.x - player.position.x, 0, e.root.position.z - player.position.z);
    const len = d.length();
    if (len > 12 || len < 0.01) continue;
    const dot = d.normalize().dot(f);
    if (dot > bestScore) { bestScore = dot; best = d; }
  }
  if (best) f.copy(best);
  player.rotation.y = Math.atan2(f.x, f.z);
  return f;
}
// M1 locks onto the closest enemy in reach.
function aimMelee() {
  let best = null, bestD = 4.5;
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = distXZ(e.root.position, player.position);
    if (d < bestD && Math.abs(e.root.position.y - player.position.y) < 2) { bestD = d; best = e; }
  }
  if (best) player.rotation.y = Math.atan2(best.root.position.x - player.position.x, best.root.position.z - player.position.z);
  else { const d = inputDir(); if (d.lengthSq()) player.rotation.y = Math.atan2(d.x, d.z); }
  return fwdOf(player);
}

function canAct() { return !navy?.rider && !intercityRail?.rider && !cityServices?.rider && !spaceCentre?.rider && !metro?.rider && !transport?.rider && !swimming && !sitting && !action && !inCar && !riding && playerStun <= 0 && locked; }

// ---- M1: 4-hit combo, the last hit is a heavy knockback with an impact frame ----
function m1() {
  if (!canAct() || m1Cd > 0 || playerBlocking) return;
  if(adventureServices?.equipped){m1Cd=.35;adventureServices.attack();return;}
  const now = performance.now() / 1000;
  comboIdx = now - lastM1 < 0.9 ? (comboIdx + 1) % 4 : 0;
  lastM1 = now;
  const heavy = comboIdx === 3;
  if (heavy) m1Cd = 0.6;
  const f = aimMelee();
  const c = characters[charIdx];
  startAction({ name: 'm1', dur: heavy ? 0.42 : 0.26, pose: comboIdx % 2 ? 'punchL' : 'slash', update(dt, t, a) {
    if (t < 0.12) player.position.addScaledVector(f, 5 * dt);
    if (!a.hitDone && t >= 0.08) {
      a.hitDone = true;
      fxSwoosh(at(player.position, 1.3).addScaledVector(f, 0.9), f, heavy ? c.fx : 0xffffff, comboIdx % 2);
      hitCone(player.position, f, 2.7, 0.2, null, heavy
        ? { dmg: attackDmg() * 1.8, kb: 16, up: 5, stun: 1, heavy: true, impact: 0.6 }
        : { dmg: attackDmg(), kb: 1.5, stun: 0.55 });
    }
  } });
}

// ---- Dash ----
function inputDir() {
  const ix = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const iz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const r = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const d = f.multiplyScalar(iz).add(r.multiplyScalar(ix));
  return d.lengthSq() ? d.normalize() : d;
}
function dash() {
  if (!canAct() || dashCd > 0) return;
  dashCd = 1.5;
  iFrames = 0.25;
  const d = inputDir();
  const dir = d.lengthSq() ? d : fwdOf(player);
  player.rotation.y = Math.atan2(dir.x, dir.z);
  startAction({ name: 'dash', dur: 0.2, pose: 'dash', update(dt) {
    player.position.addScaledVector(dir, 24 * dt);
    spawnParticle(at(player.position, 0.5 + Math.random() * 1.2), randUnit().multiplyScalar(1).addScaledVector(dir, -4), 0xffffff, 0.1, 0.3);
  } });
}

// New characters only have the basic M1/dash/block — the 4 elemental skills and
// the ultimate unlock progressively as you level up, instead of all being available
// from the very first second of a brand-new life.
const SKILL_UNLOCK_LEVEL = [2, 2, 3, 4];
const PSYCHIC_UNLOCK_LEVEL = 2;
const ULT_UNLOCK_LEVEL = 5;
function useSkill(i) {
  const c = characters[charIdx];
  if (!canAct() || c.cds[i] > 0) return;
  if (prog.level < SKILL_UNLOCK_LEVEL[i]) { toast(`${c.skills[i].name} unlocks at level ${SKILL_UNLOCK_LEVEL[i]}`); return; }
  c.cds[i] = c.skills[i].cd;
  callout(c.skills[i].name.toUpperCase(), c.fx);
  c.skills[i].run();
}
function useUlt() {
  const c = characters[charIdx];
  if (!canAct()) return;
  if (prog.level < ULT_UNLOCK_LEVEL) { toast(`${c.ult.name} unlocks at level ${ULT_UNLOCK_LEVEL}`); return; }
  if (stats.ult < 100) { toast(`Ultimate not ready (${Math.floor(stats.ult)}%). Land hits to charge it.`); return; }
  stats.ult = 0;
  c.ult.run();
}

// ---- Projectiles ----
const projectiles = [];
function fireProjectile(o) {
  let m;
  if (o.mesh) m = o.mesh;
  else {
    m = new THREE.Group();
    m.add(new THREE.Mesh(new THREE.SphereGeometry(o.size, 12, 10), fxMat(0xffffff, 1)));
    m.add(new THREE.Mesh(new THREE.SphereGeometry(o.size * 1.8, 12, 10), fxMat(o.color, 0.6)));
  }
  m.position.copy(o.from);
  m.rotation.y = Math.atan2(o.dir.x, o.dir.z);
  scene.add(m);
  projectiles.push(Object.assign({ m, vel: o.dir.clone().multiplyScalar(o.speed), dist: 0, hits: new Set() }, o));
}
function explodeProjectile(pr) {
  const pos = pr.m.position.clone();
  fxSphere(pos, pr.color, pr.explode.r, 0.3);
  burst(pos, 22, [pr.color, 0xffd166, 0xffffff], 10, 0.18, 0.45, 6);
  hitAround(pos, pr.explode.r, null, Object.assign({ from: pos.clone().addScaledVector(pr.vel, -0.05) }, pr.explode), 2.5);
  shake = Math.max(shake, 0.15);
}
function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    const previousPosition = pr.m.position.clone();
    pr.m.position.addScaledVector(pr.vel, dt);
    pr.dist += pr.speed * dt;
    spawnParticle(pr.m.position, randUnit().multiplyScalar(1.2), pick([pr.color, 0xffffff]), (pr.size || 0.25) * 0.6, 0.3);
    let done = pr.dist > pr.range || insideCollider(pr.m.position) || pr.m.position.y < groundY(pr.m.position.x, pr.m.position.z);
    for (const e of enemies) {
      if (!e.alive || pr.hits.has(e)) continue;
      const c = at(e.root.position, e.height * 0.5);
      if (c.distanceTo(pr.m.position) > (pr.size || 0.4) + e.radius + 0.5) continue;
      if (pr.pierce) { pr.hits.add(e); applyHit(e, Object.assign({ from: pr.m.position.clone().addScaledVector(pr.vel, -0.1) }, pr.hit)); }
      else { done = true; break; }
    }
    for (const v of vehicles) {
      if (!isRoadVehicle(v) || v.exploded || pr.hits.has(v)) continue;
      if (segmentDistance(v.group.position, previousPosition, pr.m.position) > v.radius + (pr.size || 0.4) || Math.abs(pr.m.position.y - v.group.position.y - 0.8) > 1.5) continue;
      pr.hits.add(v);
      if (pr.hit) damageVehiclePower(v, Number(pr.hit.dmg) || 0, pr.m.position);
      if (!pr.pierce) { pr.m.position.copy(v.group.position).y += 0.8; done = true; break; }
    }
    if (done) {
      if (pr.explode) explodeProjectile(pr);
      disposeObj(pr.m);
      projectiles.splice(i, 1);
    }
  }
}

// ---- Psychic Grip (R): lift targets with your mind, then hurl them. Scales with Mental. ----
const PSY = [0xb388ff, 0x7c4dff, 0xe1bee7, 0xffffff];
let psyCd = 0;
function psychicGrip(){if(!canAct())return;if(supportSkills?.equipped){supportSkills.use();return;}legacyPsychicGrip();}
function legacyPsychicGrip() {
  if (!canAct() || psyCd > 0) return;
  if (!specialUnlocked) { toast('Special slot is empty. Defeat 5 enemies, then claim your ability at the training-ground board.'); return; }
  const f = aimForward();
  const range = 9 + prog.men * 0.6, maxTargets = 2 + Math.floor(prog.men / 2);
  const grabbed = enemies.filter(e => {
    if (!e.alive || e.hidden) return false;
    const d = new THREE.Vector3(e.root.position.x - player.position.x, 0, e.root.position.z - player.position.z);
    const len = d.length();
    return len < range && (len < 1.5 || d.normalize().dot(f) > 0.35);
  }).sort((a, b) => distXZ(a.root.position, player.position) - distXZ(b.root.position, player.position)).slice(0, maxTargets);
  psyCd = psyCdMax();
  callout('PSYCHIC GRIP', 0xb388ff);
  fxRing(player.position, 0xb388ff, 4, 0.4);
  hitVehicles(player.position, range, new Set(), { dmg: psyDmg() * 2 }, 3, f, 0.35);
  if (!grabbed.length) return;
  grabbed.forEach(e => { e.held = true; e.vel.set(0, 0, 0); e.glow = 0; if (e.ai) e.ai.state = 'idle'; });
  const side = new THREE.Vector3(f.z, 0, -f.x);
  startAction({ name: 'psy', dur: 1.25, pose: 'charge', superArmor: true, update(dt, t, a) {
    if (t < 0.95) {
      grabbed.forEach((e, i) => {
        if (!e.alive) { e.held = false; return; }
        const hold = at(player.position, 2.6 + Math.sin(t * 6 + i) * 0.25).addScaledVector(f, 4)
          .addScaledVector(side, (i - (grabbed.length - 1) / 2) * 1.6);
        e.root.position.lerp(hold, 1 - Math.exp(-6 * dt));
        e.root.rotation.y += dt * 2;
        e.stun = Math.max(e.stun, 0.5);
        if (Math.random() < 0.5) spawnParticle(at(e.root.position, Math.random() * 1.5).add(randUnit().multiplyScalar(0.8)), randUnit(), pick(PSY), 0.1, 0.4);
      });
      a.pose = t < 0.5 ? 'charge' : 'cast';
      return;
    }
    if (a.thrown) return;
    a.thrown = true;
    grabbed.forEach(e => {
      e.held = false;
      if (!e.alive) return;
      e.thrown = 1.2;
      applyHit(e, { dmg: psyDmg(), from: player.position, kb: 0, stun: 1.5, heavy: true, impact: 0.7, guardBreak: true });
      e.vel.copy(f).multiplyScalar(26 + prog.men);
      e.vel.y = 4;
      e.onGround = false;
    });
    burst(at(player.position, 1.4).addScaledVector(f, 1), 25, PSY, 10, 0.12, 0.4, 0);
  }, end() { grabbed.forEach(e => { e.held = false; }); } });
}

// ---- Shared big moves ----
function slamImpact(pos, color, r, dmg) {
  const n = hitAround(pos, r, null, { dmg, from: pos, kb: 14, up: 9, stun: 1.2, heavy: true, impact: 1, guardBreak: true }, 8);
  if (!n) shake = Math.max(shake, 0.5);
  fxRing(pos, color, r, 0.45);
  fxRing(pos, 0xffffff, r * 0.6, 0.3);
  fxPillar(pos, color, r * 0.35, 6, 0.4);
  fxCrater(pos, r * 0.6);
  burst(at(pos, 0.2), 30, [0x8a7d66, 0x6b6157, 0xb8a88a], 12, 0.25, 0.9, 25, 6);
  burst(at(pos, 0.5), 25, [color, 0xffffff], 14, 0.15, 0.4, 2);
}
function spawnTornado(pos, o) {
  const g = new THREE.Group();
  g.position.copy(pos);
  scene.add(g);
  const rings = [];
  for (let i = 0; i < 9; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry((0.5 + i * 0.32) * o.scale, 0.07 * o.scale, 6, 28, Math.PI * 1.6), fxMat(o.color, 0.55));
    r.rotation.x = Math.PI / 2;
    r.position.y = i * 0.75 * o.scale;
    g.add(r);
    rings.push(r);
  }
  let tick = 0;
  addTask({ dur: o.dur, update(dt, t) {
    rings.forEach((r, i) => { r.rotation.z += dt * (5 + i * 0.8); });
    g.scale.setScalar(Math.min(1, t * 4));
    if (Math.random() < 0.6) spawnParticle(at(pos, Math.random() * 6 * o.scale), randUnit().multiplyScalar(3), pick([o.color, 0xffffff]), 0.12, 0.5);
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = distXZ(e.root.position, pos);
      if (d > o.pullR) continue;
      const k = 1 - Math.exp(-5 * dt);
      e.vel.x = lerp(e.vel.x, (pos.x - e.root.position.x) / Math.max(d, 0.1) * 7, k);
      e.vel.z = lerp(e.vel.z, (pos.z - e.root.position.z) / Math.max(d, 0.1) * 7, k);
      if (d < 2 * o.scale) { e.vel.y = Math.max(e.vel.y, 4); e.onGround = false; }
      e.stun = Math.max(e.stun, 0.3);
    }
    tick += dt;
    if (tick >= 0.25) { tick = 0; hitAround(pos, 2.5 * o.scale, null, { dmg: o.tickDmg, from: pos, kb: 0, stun: 0.4 }, 8); }
  }, end() {
    hitAround(pos, o.pullR * 0.6, null, { dmg: o.burstDmg, from: pos, kb: 14, up: 10, stun: 1, heavy: true, impact: o.burstImpact, guardBreak: true }, 10);
    fxRing(pos, o.color, o.pullR, 0.4);
    burst(at(pos, 2), 30, [o.color, 0xffffff], 16, 0.15, 0.5, 2);
    disposeObj(g);
  } });
}

// Cinematic: letterbox + close-up camera + world freeze, used by ultimates
let cine = null;
function startCinematic(dur, title, color) {
  cine = { t: 0, dur };
  letterbox(true);
  callout(title, color, true);
}

// ---- Ember (Pyro) ----
const FIRE = [0xff5a1f, 0xffb02e, 0xff2a00, 0xffe08a];
function emberDash() {
  const f = aimForward();
  iFrames = 0.35;
  startAction({ name: 'Flame Dash', dur: 0.35, pose: 'dash', update(dt, t, a) {
    player.position.addScaledVector(f, 26 * dt);
    for (let i = 0; i < 3; i++) spawnParticle(at(player.position, 0.3 + Math.random() * 1.5), randUnit().multiplyScalar(2).addScaledVector(f, -4), pick(FIRE), 0.25, 0.5, -2);
    hitAround(player.position, 1.8, a.hits, { dmg: S(14), kb: 8, up: 5, stun: 0.8 });
  }, end() { fxRing(player.position, 0xff7a2f, 3, 0.35); } });
}
function emberUppercut() {
  const f = aimForward();
  startAction({ name: 'Rising Blaze', dur: 0.6, pose: 'uppercut', update(dt, t, a) {
    if (t < 0.12) { player.position.addScaledVector(f, 8 * dt); return; }
    if (a.fired) return;
    a.fired = true;
    vy = 10; onGround = false;
    hitCone(player.position, f, 3.2, 0.2, a.hits, { dmg: S(18), kb: 2, up: 16, stun: 1.5, heavy: true, impact: 0.8, guardBreak: true });
    const spot = player.position.clone().addScaledVector(f, 1.5);
    fxPillar(spot, 0xff6a00, 1.1, 9, 0.5);
    burst(at(spot, 0.5), 30, FIRE, 6, 0.25, 0.7, -6, 8);
  } });
}
function emberFireballs() {
  const f = aimForward();
  startAction({ name: 'Fireball Barrage', dur: 0.85, update(dt, t, a) {
    a.pose = Math.floor(t / 0.25) % 2 ? 'punchL' : 'punchR';
    [0.1, 0.35, 0.6].forEach((when, i) => {
      if (t < when || a['f' + i]) return;
      a['f' + i] = true;
      const dir = f.clone().applyAxisAngle(UP, (i - 1) * 0.1);
      fireProjectile({ from: at(player.position, 1.3).addScaledVector(dir, 0.8), dir, speed: 32, range: 30, color: 0xff5a1f, size: 0.35,
        explode: { r: 2.6, dmg: S(11), kb: 7, up: 4, stun: 0.7 } });
    });
  } });
}
function emberMeteor() {
  const f = aimForward();
  vy = 15; onGround = false;
  startAction({ name: 'Meteor Slam', dur: 2.0, pose: 'slam', update(dt, t, a) {
    for (let i = 0; i < (a.diving ? 5 : 2); i++) spawnParticle(at(player.position, Math.random() * 1.8), randUnit().multiplyScalar(1.5), pick(FIRE), 0.3, 0.5, -3);
    if (!a.diving) {
      player.position.addScaledVector(f, 7 * dt);
      if (t > 0.45) { a.diving = true; vy = -42; }
    } else {
      player.position.addScaledVector(f, 10 * dt);
      if (onGround) { a.done = true; slamImpact(player.position.clone(), 0xff5a1f, 6, S(30)); }
    }
  } });
}
function emberUlt() {
  startCinematic(1.1, 'INFERNO AWAKENING', 0xff5a1f);
  startAction({ name: 'ult', dur: 1.5, pose: 'charge', noGravity: true, superArmor: true, update(dt, t, a) {
    if (t < 1.1) {
      vy = 0;
      player.position.y = lerp(player.position.y, groundY(player.position.x, player.position.z) + 1.2, 1 - Math.exp(-3 * dt));
      for (let i = 0; i < 4; i++) {   // fire swirling inwards
        const off = randUnit().multiplyScalar(3);
        spawnParticle(at(player.position, 1).add(off), off.clone().multiplyScalar(-2.5), pick(FIRE), 0.2, 0.4);
      }
      return;
    }
    if (a.boom) return;
    a.boom = true;
    const pos = player.position.clone();
    pos.y = groundY(pos.x, pos.z);
    impactFrame(1.6);
    hitAround(pos, 12, null, { dmg: S(60), from: pos, kb: 22, up: 16, stun: 2, heavy: true, impact: 1.6, guardBreak: true }, 6);
    fxSphere(at(pos, 1), 0xff5a1f, 12, 0.6);
    fxPillar(pos, 0xffa040, 3.5, 40, 0.8);
    fxRing(pos, 0xff5a1f, 14, 0.6); fxRing(pos, 0xffffff, 9, 0.4);
    fxCrater(pos, 6);
    burst(at(pos, 1), 120, FIRE, 22, 0.3, 0.9, 4, 4);
    awaken = 10;
    toast('Awakened: +30% damage for 10 seconds');
  } });
}

// ---- Gale (Anemo) ----
const WIND = [0x9fffe6, 0xffffff, 0xcffff3];
function galeStep() {
  const f = aimForward();
  iFrames = 0.3;
  startAction({ name: 'Gale Step', dur: 0.3, pose: 'dash', update(dt, t, a) {
    player.position.addScaledVector(f, 32 * dt);
    for (let i = 0; i < 3; i++) spawnParticle(at(player.position, 0.3 + Math.random() * 1.5), randUnit().multiplyScalar(0.5).addScaledVector(f, -8), pick(WIND), 0.1, 0.35);
    hitAround(player.position, 1.8, a.hits, { dmg: S(10), kb: 3, up: 10, stun: 1.1 });
  }, end() { fxRing(player.position, 0xcffff3, 3, 0.35); } });
}
function galeCyclone() {
  const f = aimForward();
  const pos = player.position.clone().addScaledVector(f, 6);
  pos.y = groundY(pos.x, pos.z);
  startAction({ name: 'Cyclone', dur: 0.35, pose: 'cast' });
  spawnTornado(pos, { dur: 2.5, pullR: 7, scale: 1, tickDmg: S(4), burstDmg: S(12), burstImpact: 0.6, color: 0x9fffe6 });
}
function galeBlades() {
  const f = aimForward();
  startAction({ name: 'Wind Blades', dur: 0.4, pose: 'cast', update(dt, t, a) {
    if (a.fired || t < 0.1) return;
    a.fired = true;
    for (let i = -2; i <= 2; i++) {
      const dir = f.clone().applyAxisAngle(UP, i * 0.22);
      const g = new THREE.Group();
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.07, 6, 20, Math.PI), fxMat(0xbfffee, 0.9));
      arc.rotation.x = Math.PI / 2;
      g.add(arc);
      fireProjectile({ from: at(player.position, 1.2).addScaledVector(dir, 0.8), dir, speed: 28, range: 22, color: 0xbfffee, size: 0.3,
        pierce: true, mesh: g, hit: { dmg: S(9), kb: 6, up: 2, stun: 0.5 } });
    }
  } });
}
function galeSky() {
  const f = aimForward();
  vy = 18; onGround = false;
  hitAround(player.position, 4.5, null, { dmg: S(10), kb: 0, up: 18, stun: 2.2, guardBreak: true });
  fxRing(player.position, 0x9fffe6, 5, 0.4);
  startAction({ name: 'Sky Breaker', dur: 2.5, pose: 'slam', update(dt, t, a) {
    const ang = t * 20;
    spawnParticle(at(player.position, 1).add(new THREE.Vector3(Math.cos(ang) * 1.2, 0, Math.sin(ang) * 1.2)), new THREE.Vector3(0, -2, 0), pick(WIND), 0.12, 0.4);
    if (!a.diving && t > 0.6) { a.diving = true; vy = -45; }
    if (!a.diving) player.position.addScaledVector(f, 3 * dt);
    if (a.diving && onGround) { a.done = true; slamImpact(player.position.clone(), 0x9fffe6, 5.5, S(28)); }
  } });
}
function galeUlt() {
  startCinematic(1.1, 'TEMPEST SOVEREIGN', 0x9fffe6);
  startAction({ name: 'ult', dur: 1.3, pose: 'charge', noGravity: true, superArmor: true, update(dt, t, a) {
    if (t < 1.1) {
      vy = 0;
      player.position.y = lerp(player.position.y, groundY(player.position.x, player.position.z) + 1.5, 1 - Math.exp(-3 * dt));
      const ang = t * 25;
      for (let i = 0; i < 3; i++) spawnParticle(at(player.position, Math.random() * 2).add(new THREE.Vector3(Math.cos(ang + i * 2) * 2.5, 0, Math.sin(ang + i * 2) * 2.5)), new THREE.Vector3(0, 3, 0), pick(WIND), 0.15, 0.5);
      return;
    }
    if (a.boom) return;
    a.boom = true;
    const pos = player.position.clone();
    pos.y = groundY(pos.x, pos.z);
    impactFrame(1.3);
    fxRing(pos, 0x9fffe6, 16, 0.6);
    spawnTornado(pos, { dur: 3.5, pullR: 16, scale: 2.2, tickDmg: S(6), burstDmg: S(40), burstImpact: 1.5, color: 0x9fffe6 });
  } });
}

// ---- Water (Tide) ----
const WATER = [0x2a7ab8, 0x5fc9f3, 0xaee6ff, 0xffffff];
function tideDash() {
  const f = aimForward();
  iFrames = 0.35;
  startAction({ name: 'Tide Dash', dur: 0.35, pose: 'dash', update(dt, t, a) {
    player.position.addScaledVector(f, 27 * dt);
    for (let i = 0; i < 3; i++) spawnParticle(at(player.position, 0.3 + Math.random() * 1.5), randUnit().multiplyScalar(1.5).addScaledVector(f, -4), pick(WATER), 0.2, 0.5, -1);
    hitAround(player.position, 1.8, a.hits, { dmg: S(14), kb: 7, up: 3, stun: 0.9 });
  }, end() { fxRing(player.position, 0x5fc9f3, 3, 0.35); } });
}
function tideGeyser() {
  const f = aimForward();
  startAction({ name: 'Geyser Burst', dur: 0.6, pose: 'uppercut', update(dt, t, a) {
    if (t < 0.12) { player.position.addScaledVector(f, 8 * dt); return; }
    if (a.fired) return;
    a.fired = true;
    vy = 11; onGround = false;
    hitCone(player.position, f, 3.2, 0.2, a.hits, { dmg: S(18), kb: 2, up: 17, stun: 1.5, heavy: true, impact: 0.8, guardBreak: true });
    const spot = player.position.clone().addScaledVector(f, 1.5);
    fxPillar(spot, 0x2a7ab8, 1.1, 10, 0.5);
    burst(at(spot, 0.5), 30, WATER, 6, 0.25, 0.7, -5, 8);
  } });
}
function tideJets() {
  const f = aimForward();
  startAction({ name: 'Water Jet Barrage', dur: 0.85, update(dt, t, a) {
    a.pose = Math.floor(t / 0.25) % 2 ? 'punchL' : 'punchR';
    [0.1, 0.35, 0.6].forEach((when, i) => {
      if (t < when || a['f' + i]) return;
      a['f' + i] = true;
      const dir = f.clone().applyAxisAngle(UP, (i - 1) * 0.1);
      fireProjectile({ from: at(player.position, 1.3).addScaledVector(dir, 0.8), dir, speed: 34, range: 30, color: 0x5fc9f3, size: 0.3,
        explode: { r: 2.4, dmg: S(11), kb: 7, up: 3, stun: 0.7 } });
    });
  } });
}
function tideTsunami() {
  const f = aimForward();
  vy = 15; onGround = false;
  startAction({ name: 'Tsunami Slam', dur: 2.0, pose: 'slam', update(dt, t, a) {
    for (let i = 0; i < (a.diving ? 5 : 2); i++) spawnParticle(at(player.position, Math.random() * 1.8), randUnit().multiplyScalar(1.5), pick(WATER), 0.3, 0.5, -2);
    if (!a.diving) {
      player.position.addScaledVector(f, 7 * dt);
      if (t > 0.45) { a.diving = true; vy = -42; }
    } else {
      player.position.addScaledVector(f, 10 * dt);
      if (onGround) { a.done = true; slamImpact(player.position.clone(), 0x2a7ab8, 6, S(30)); }
    }
  } });
}
function tideUlt() {
  startCinematic(1.1, 'TIDAL SOVEREIGN', 0x2a7ab8);
  startAction({ name: 'ult', dur: 1.5, pose: 'charge', noGravity: true, superArmor: true, update(dt, t, a) {
    if (t < 1.1) {
      vy = 0;
      player.position.y = lerp(player.position.y, groundY(player.position.x, player.position.z) + 1.2, 1 - Math.exp(-3 * dt));
      for (let i = 0; i < 4; i++) {
        const off = randUnit().multiplyScalar(3);
        spawnParticle(at(player.position, 1).add(off), off.clone().multiplyScalar(-2.5), pick(WATER), 0.2, 0.4);
      }
      return;
    }
    if (a.boom) return;
    a.boom = true;
    const pos = player.position.clone();
    pos.y = groundY(pos.x, pos.z);
    impactFrame(1.6);
    hitAround(pos, 12, null, { dmg: S(60), from: pos, kb: 20, up: 12, stun: 2, heavy: true, impact: 1.6, guardBreak: true }, 6);
    fxSphere(at(pos, 1), 0x2a7ab8, 12, 0.6);
    fxPillar(pos, 0x5fc9f3, 3.5, 40, 0.8);
    fxRing(pos, 0x2a7ab8, 14, 0.6); fxRing(pos, 0xffffff, 9, 0.4);
  } });
}

// ---- Rock (Terra) ----
const ROCKC = [0x8a6a46, 0xb8a88a, 0x6b6157, 0xd8c9a8];
function terraCharge() {
  const f = aimForward();
  iFrames = 0.35;
  startAction({ name: 'Boulder Charge', dur: 0.35, pose: 'dash', update(dt, t, a) {
    player.position.addScaledVector(f, 24 * dt);
    for (let i = 0; i < 3; i++) spawnParticle(at(player.position, 0.3 + Math.random() * 1.5), randUnit().multiplyScalar(1.5).addScaledVector(f, -4), pick(ROCKC), 0.25, 0.5, -3);
    hitAround(player.position, 1.9, a.hits, { dmg: S(15), kb: 9, up: 2, stun: 1.0 });
  }, end() { fxRing(player.position, 0xb8a88a, 3, 0.35); } });
}
function terraFist() {
  const f = aimForward();
  startAction({ name: 'Stone Fist', dur: 0.6, pose: 'uppercut', update(dt, t, a) {
    if (t < 0.12) { player.position.addScaledVector(f, 8 * dt); return; }
    if (a.fired) return;
    a.fired = true;
    vy = 9; onGround = false;
    hitCone(player.position, f, 3.2, 0.2, a.hits, { dmg: S(19), kb: 4, up: 14, stun: 1.6, heavy: true, impact: 0.9, guardBreak: true });
    const spot = player.position.clone().addScaledVector(f, 1.5);
    fxPillar(spot, 0x6b6157, 1.1, 8, 0.5);
    burst(at(spot, 0.5), 30, ROCKC, 6, 0.25, 0.7, -6, 8);
  } });
}
function terraBarrage() {
  const f = aimForward();
  startAction({ name: 'Rock Barrage', dur: 0.85, update(dt, t, a) {
    a.pose = Math.floor(t / 0.25) % 2 ? 'punchL' : 'punchR';
    [0.1, 0.35, 0.6].forEach((when, i) => {
      if (t < when || a['f' + i]) return;
      a['f' + i] = true;
      const dir = f.clone().applyAxisAngle(UP, (i - 1) * 0.1);
      fireProjectile({ from: at(player.position, 1.3).addScaledVector(dir, 0.8), dir, speed: 28, range: 28, color: 0x8a6a46, size: 0.4,
        explode: { r: 2.6, dmg: S(12), kb: 8, up: 2, stun: 0.8 } });
    });
  } });
}
function terraPound() {
  const f = aimForward();
  vy = 14; onGround = false;
  startAction({ name: 'Ground Pound', dur: 2.0, pose: 'slam', update(dt, t, a) {
    for (let i = 0; i < (a.diving ? 5 : 2); i++) spawnParticle(at(player.position, Math.random() * 1.8), randUnit().multiplyScalar(1.5), pick(ROCKC), 0.3, 0.5, -3);
    if (!a.diving) {
      player.position.addScaledVector(f, 7 * dt);
      if (t > 0.45) { a.diving = true; vy = -44; }
    } else {
      player.position.addScaledVector(f, 9 * dt);
      if (onGround) { a.done = true; slamImpact(player.position.clone(), 0x8a6a46, 6.5, S(32)); }
    }
  } });
}
function terraUlt() {
  startCinematic(1.1, 'TERRA SOVEREIGN', 0x8a6a46);
  startAction({ name: 'ult', dur: 1.5, pose: 'charge', noGravity: true, superArmor: true, update(dt, t, a) {
    if (t < 1.1) {
      vy = 0;
      player.position.y = lerp(player.position.y, groundY(player.position.x, player.position.z) + 1.2, 1 - Math.exp(-3 * dt));
      for (let i = 0; i < 4; i++) {
        const off = randUnit().multiplyScalar(3);
        spawnParticle(at(player.position, 1).add(off), off.clone().multiplyScalar(-2.5), pick(ROCKC), 0.2, 0.4);
      }
      return;
    }
    if (a.boom) return;
    a.boom = true;
    const pos = player.position.clone();
    pos.y = groundY(pos.x, pos.z);
    impactFrame(1.6);
    hitAround(pos, 13, null, { dmg: S(62), from: pos, kb: 24, up: 10, stun: 2.2, heavy: true, impact: 1.6, guardBreak: true }, 6);
    fxSphere(at(pos, 1), 0x8a6a46, 12, 0.6);
    fxPillar(pos, 0xb8a88a, 3.5, 40, 0.8);
    fxRing(pos, 0x8a6a46, 14, 0.6); fxRing(pos, 0xffffff, 9, 0.4);
  } });
}

// =====================================================================
// DUNGEON GATES (appear on the roads; colour = danger compared to your level)
// =====================================================================
const RANK_NAMES = ['E', 'D', 'C', 'B', 'A', 'S'];
const RANK_MAX_LEVEL = [3, 6, 10, 15, 22, Infinity];
const rankOf = lvl => RANK_MAX_LEVEL.findIndex(m => lvl <= m);
const TIER = {
  red:   { color: 0xff3b3b, css: '#ff6b6b', label: 'DANGER', note: 'Far above your level. You can enter, but your chance of winning is extremely low.' },
  blue:  { color: 0x3b8bff, css: '#6aa8ff', label: 'RECOMMENDED', note: 'A good match for your level.' },
  green: { color: 0x3bff7a, css: '#5dff95', label: 'LOW TIER', note: 'Below your level. Easy, but small rewards.' },
};
function tierOf(level) { const d = level - prog.level; return d > 2 ? 'red' : d >= -2 ? 'blue' : 'green'; }
const THEMES = {
 poison:{label:"Poison Monsters",floor:0x485332,wall:0x25341c,light:0x98d644,fog:0x233214,skyTop:0x10200b,sigil:0x9bed37},
  demon: { label: 'Demons', floor: 0x6b3a3a, wall: 0x3a1f1f, light: 0xff6040, fog: 0x2a0606, skyTop: 0x0a0000, sigil: 0xff2a00 },
  angel: { label: 'Angels', floor: 0xe8e2d0, wall: 0xcfc6ad, light: 0xfff2c0, fog: 0xd9cfa8, skyTop: 0x8aa7c8, sigil: 0xffd84a },
  mixed: { label: 'Demons & Angels', floor: 0x5a4f6b, wall: 0x2e2838, light: 0xc9a0ff, fog: 0x1a1428, skyTop: 0x05030a, sigil: 0xb388ff },
};
const GATE_NAMES = {
  demon: ['Crimson Hollow', 'Abyssal Maw', 'Hellfire Rift', 'Brimstone Pit', 'Infernal Gate'],
  angel: ['Seraph Spire', 'Halo Sanctum', 'Gilded Heaven', 'Celestial Rift', 'Sanctum of Light'],
  mixed: ['Twilight Breach', 'Fallen Cathedral', 'Eclipse Rift'],
};
const wavesFor = g => g.finalBoss?1:2 + Math.ceil(g.stars / 2);

const swirlTex = makeTex(256, 256, g => {
  const grd = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.35, 'rgba(255,255,255,.8)'); grd.addColorStop(1, 'rgba(255,255,255,.05)');
  g.fillStyle = grd; g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 7;
  for (let a = 0; a < 5; a++) {
    g.beginPath();
    for (let t = 0; t <= 1; t += 0.02) {
      const ang = a * Math.PI * 2 / 5 + t * 5, r = t * 122;
      const x = 128 + Math.cos(ang) * r, y = 128 + Math.sin(ang) * r;
      t === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
});
swirlTex.center.set(0.5, 0.5);

function makeGateMesh(color) {
  const g = new THREE.Group();
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: color, emissiveIntensity: 2.5, roughness: 0.4 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.18, 10, 48), ringMat);
  ring.scale.y = 1.35; ring.position.y = 3.1;
  const discMat = new THREE.MeshBasicMaterial({ map: swirlTex, color, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.1, 40), discMat);
  disc.scale.y = 1.35; disc.position.y = 3.1;
  const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending,
    depthWrite: false, toneMapped: false, side: THREE.DoubleSide, fog: false });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 80, 12, 1, true), beamMat);   // visible from far away
  beam.position.y = 40;
  const base = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.6, 40), fxMat(color, 0.6));
  base.rotation.x = -Math.PI / 2; base.position.y = 0.06;
  g.add(ring, disc, beam, base);
  scene.add(g);
  return { group: g, disc, ringMat, discMat, beamMat, base };
}
function setGateColor(gm, color) {
  gm.ringMat.emissive.set(color); gm.discMat.color.set(color); gm.beamMat.color.set(color); gm.base.material.color.set(color);
}

const gates = [];
let gateTimer = 60, tierCheck = 0, alertTimer, lastTip = '';
function randomRoadSpot() {
  for (let tries = 0; tries < 30; tries++) {
    const from = [-3 + Math.floor(Math.random() * 7), -3 + Math.floor(Math.random() * 7)];
    const to = nextNode(from, null);
    const A = nodePos(...from), B = nodePos(...to);
    const pos = A.clone().lerp(B, 0.5);
    if (gates.some(g => distXZ(g.pos, pos) < 30) || distXZ(pos, SPAWN) < 15) continue;
    return { pos, dir: B.sub(A).normalize() };
  }
  return null;
}
function district(p) {
  const ns = p.z < -50 ? 'north' : p.z > 50 ? 'south' : '', ew = p.x < -50 ? 'west' : p.x > 50 ? 'east' : '';
  return ns || ew ? `${ns}${ns && ew ? '-' : ''}${ew} district` : 'city centre';
}
function spawnGate(announce) {
  const spot = randomRoadSpot();
  if (!spot) return;
  const roll = Math.random(), pl = prog.level;
  const level = roll < 0.3 ? Math.max(1, pl - 3 - Math.floor(Math.random() * 3))
              : roll < 0.75 ? Math.max(1, pl - 1 + Math.floor(Math.random() * 4))
              : pl + 3 + Math.floor(Math.random() * 8);
  const rank = rankOf(level), theme = pick(['demon', 'demon', 'angel', 'angel', 'mixed']), tier = tierOf(level);
  const gm = makeGateMesh(TIER[tier].color);
  gm.group.position.copy(spot.pos);
  gm.group.rotation.y = Math.atan2(spot.dir.x, spot.dir.z);
  const gate = Object.assign(gm, { pos: spot.pos, level, rank, stars: rank + 1, theme, tier, name: pick(GATE_NAMES[theme]) });
  gm.disc.userData.gate = gate;
  gates.push(gate);
  const ordinary=gates.filter(g=>!g.poisonCity&&!g.capitalGate);if(ordinary.length>6)removeGate(ordinary[0]);
  if (announce) worldAlert(gate);
}
function removeGate(g) {
  const index=gates.indexOf(g);if(index<0)return;
  disposeObj(g.group);
  gates.splice(index, 1);
}
function worldAlert(g) {
  const el = $('alert');
  el.innerHTML = `<div class="atitle">⚠ WORLD ALERT</div>A <b style="color:${TIER[g.tier].css}">${RANK_NAMES[g.rank]}-Rank gate</b> ` +
    `"${g.name}" has opened in the ${district(g.pos)}!`;
  el.style.borderColor = TIER[g.tier].css;
  el.classList.add('show');
  clearTimeout(alertTimer);
  alertTimer = setTimeout(() => el.classList.remove('show'), 6000);
}
function gateInfoHtml(g) {
  const T = TIER[g.tier];
  return `<div class="gname" style="color:${T.css}">${g.name}</div>
    <div class="grank">${RANK_NAMES[g.rank]}-Rank <span style="color:#ffd166">${'★'.repeat(g.stars)}${'☆'.repeat(6 - g.stars)}</span></div>
    <div>Level ${g.level} · ${THEMES[g.theme].label} · ${wavesFor(g)} waves (boss at the end)</div>
    <div class="gtier" style="color:${T.css}">${T.label}</div><div class="gnote">${T.note}</div>
    <div class="ghint">Walk up to it and press E to enter</div>`;
}
const nearestGate = () => inCar ? null : gates.find(g => distXZ(g.pos, player.position) < 3.5);

let inspectedGate=null;
const gateRay = new THREE.Raycaster();
const SCREEN_CENTER = new THREE.Vector2(0, 0);
function updateGates(dt) {
  gateTimer -= dt;
  if (gateTimer <= 0) { gateTimer = 60; spawnGate(true); }   // a new gate every minute
  swirlTex.rotation += dt * 1.5;
  tierCheck -= dt;
  const now = performance.now();
  for (const g of gates) {
    if (tierCheck <= 0) { const t = tierOf(g.level); if (t !== g.tier) { g.tier = t; setGateColor(g, TIER[t].color); } }
    g.ringMat.emissiveIntensity = 2 + Math.sin(now / 300) * 0.8;
    if (distXZ(g.pos, player.position) < 70 && Math.random() < 0.5)
      spawnParticle(at(g.pos, 1 + Math.random() * 4).add(randUnit().multiplyScalar(2)), new THREE.Vector3(0, 1.5, 0), TIER[g.tier].color, 0.12, 0.8);
  }
  if (tierCheck <= 0) tierCheck = 1;

  // Look at a gate with the crosshair to see its details
  let shown = null;
  if (!dungeon && gates.length) {
    gateRay.setFromCamera(SCREEN_CENTER, camera);
    gateRay.far = 90;
    shown = gateRay.intersectObjects(gates.map(g => g.disc), false)[0]?.object.userData.gate;
  }
  inspectedGate=shown;
  const html = shown ? gateInfoHtml(shown) : '';
  if (html !== lastTip) { $('gateTip').innerHTML = html; $('gateTip').style.display = html ? 'block' : 'none'; lastTip = html; }
}
for (let i = 0; i < 3; i++) spawnGate(false);

// =====================================================================
// DUNGEON ARENA (built once far away at x = 2000; re-themed per gate)
// =====================================================================
const DUN = new THREE.Vector3(2000, 0, 0);
const stoneTex = makeTex(256, 256, g => {
  g.fillStyle = '#6a6a6a'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 64) {
    const s = 150 + Math.floor(rand() * 50);
    g.fillStyle = `rgb(${s},${s},${s})`; g.fillRect(x + 2, y + 2, 60, 60);
  }
  speckle(g, 256, 256, 3000, ['rgba(0,0,0,.12)', 'rgba(255,255,255,.08)']);
});
stoneTex.repeat.set(12, 12);
const dunFloorMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9 });
const dunWallMat = new THREE.MeshStandardMaterial({ color: 0x3a1f1f, roughness: 0.95 });
const dunFloor = new THREE.Mesh(new THREE.BoxGeometry(72, 0.5, 72), dunFloorMat);
dunFloor.position.set(DUN.x, -0.25, DUN.z);
dunFloor.receiveShadow = true;
scene.add(dunFloor);
for (const [w, d, x, z] of [[72, 2, 0, -36], [72, 2, 0, 36], [2, 72, -36, 0], [2, 72, 36, 0]])
  camBlockers.push(box(w, 9, d, DUN.x + x, 4.5, DUN.z + z, dunWallMat));
const torchSpots = [];
const flameMat = new THREE.MeshBasicMaterial({ color: 0xff7a2f, toneMapped: false });
for (let i = 0; i < 8; i++) {
  const a = i / 8 * Math.PI * 2 + Math.PI / 8;
  const x = DUN.x + Math.cos(a) * 22, z = DUN.z + Math.sin(a) * 22;
  const pillar = mesh(new THREE.CylinderGeometry(1.1, 1.3, 9, 12), dunWallMat);
  pillar.position.set(x, 4.5, z);
  colliders.push({ minX: x - 1.1, maxX: x + 1.1, minZ: z - 1.1, maxZ: z + 1.1 });
  camBlockers.push(pillar);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), flameMat);
  flame.position.set(x - Math.cos(a) * 1.4, 4.4, z - Math.sin(a) * 1.4);
  scene.add(flame);
  torchSpots.push(flame.position.clone());
}
const sigilMats = [fxMat(0xff2a00, 0.7), fxMat(0xff2a00, 0.5)];
[[6, 6.4], [9, 9.25]].forEach(([r1, r2], i) => {
  const s = new THREE.Mesh(new THREE.RingGeometry(r1, r2, 64), sigilMats[i]);
  s.rotation.x = -Math.PI / 2;
  s.position.set(DUN.x, 0.04, DUN.z - 4);
  scene.add(s);
});
const exitGate = makeGateMesh(0xffffff);
exitGate.group.position.set(DUN.x, 0, DUN.z + 31);
const nearExitPortal = () => dungeon && distXZ(player.position, exitGate.group.position) < 3.5;

function applyTheme(theme) {
  const th = THEMES[theme];
  dunFloorMat.color.set(th.floor);
  dunWallMat.color.set(th.wall);
  flameMat.color.set(th.light);
  for (const m of sigilMats) m.color.set(th.sigil);
  for (const l of lampLights) l.color.set(th.light);
}

// =====================================================================
// DUNGEON MONSTERS (demons, angels, and their bosses)
// =====================================================================
const MONSTERS = {
 toxicCrawler:{name:'Toxic Crawler',look:{outfit:0x466620,hair:0x141c0a,skin:0x8fb848,pants:0x293b13,shoes:0x17240d},scale:.8,hp:60,dmg:7,speed:3.5,ai:'melee',xp:20,shot:0x95de27,poison:true},
 venomStalker:{name:'Venom Stalker',look:{outfit:0x11201a,hair:0x050907,skin:0x344d27,pants:0x142019,shoes:0x0b100c},scale:1.4,hp:120,dmg:10,speed:4,ai:'ranged',xp:35,shot:0x92ed2a,poison:true},
 venomSovereign:{name:'Great Venom Sovereign',look:{outfit:0x111d14,hair:0x080d08,skin:0x578437,pants:0x13221a,shoes:0x08120a},scale:3,hp:1200,dmg:18,speed:3.4,ai:'boss',xp:500,shot:0x8fff21,poison:true,horns:true},
  imp:       { name: 'Imp', look: { outfit: 0x7b1010, hair: 0x220000, skin: 0xc0392b, pants: 0x3d0000, shoes: 0x1a0000 }, scale: 0.75, hp: 35, dmg: 5, speed: 5.2, ai: 'melee', horns: true, xp: 8 },
  demon:     { name: 'Demon', look: { outfit: 0x3b0b0b, hair: 0x111111, skin: 0x922b21, pants: 0x1b0a0a, shoes: 0x111111 }, scale: 1.15, hp: 90, dmg: 9, speed: 3.6, ai: 'melee', horns: true, xp: 15 },
  angel:     { name: 'Angel', look: { outfit: 0xf5f6fa, hair: 0xf9e79f, skin: 0xffe0c4, pants: 0xe8e8e8, shoes: 0xd4ac0d }, scale: 1, hp: 65, dmg: 8, speed: 3.2, ai: 'ranged', wings: 'feather', halo: true, fly: 1.4, xp: 15 },
  knight:    { name: 'Seraph Knight', look: { outfit: 0xd4ac0d, hair: 0xf5f6fa, skin: 0xffe0c4, pants: 0xb7950b, shoes: 0x7d6608 }, scale: 1.1, hp: 110, dmg: 10, speed: 3.4, ai: 'melee', wings: 'feather', halo: true, spear: true, xp: 18 },
  demonLord: { name: 'Demon Lord', look: { outfit: 0x1a0505, hair: 0x000000, skin: 0x7b241c, pants: 0x0d0303, shoes: 0x000000 }, scale: 1.9, hp: 650, dmg: 15, speed: 3.2, ai: 'boss', horns: true, wings: 'bat', xp: 120, shot: 0xff4020 },
  archangel: { name: 'Archangel', look: { outfit: 0xfdfefe, hair: 0xf7dc6f, skin: 0xffe0c4, pants: 0xf2f3f4, shoes: 0xd4ac0d }, scale: 1.8, hp: 600, dmg: 14, speed: 3, ai: 'boss', wings: 'feather', halo: true, fly: 1.2, xp: 120, shot: 0xffe08a },
};
const WAVE_TYPES = { poison:['toxicCrawler','venomStalker','toxicCrawler'], demon: ['imp', 'imp', 'demon'], angel: ['angel', 'knight', 'angel'], mixed: ['imp', 'demon', 'angel', 'knight'] };

function makeMonster(type, level, pos) {
  const m = MONSTERS[type];
  const h = makeHumanoid({ ...m.look, handScale: m.ai === 'ranged' ? 1 : 1.5 });
  h.rig.scale.setScalar(0.9 * m.scale);
  const wings = [];
  if (m.horns) for (const s of [-1, 1]) {
    const horn = mesh(new THREE.ConeGeometry(0.06, 0.28, 8), 0xe8dcc0, h.rig);
    horn.position.set(s * 0.13, 2.1, 0.03);
    horn.rotation.z = -s * 0.5;
  }
  if (m.wings) for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.12, 1.5, -0.22);
    pivot.userData.side = s;
    h.rig.add(pivot);
    const w = mesh(new THREE.BoxGeometry(1.2, 0.9, 0.04), m.wings === 'bat' ? 0x2c0b0b : 0xfdfefe, pivot);
    w.position.set(s * 0.6, 0.15, 0);
    w.rotation.z = s * 0.25;
    wings.push(pivot);
  }
  if (m.halo) {
    const halo = mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 24), new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 2 }), h.rig);
    halo.position.set(0, 2.3, -0.02);
    halo.rotation.x = Math.PI / 2;
  }
  if (m.spear) {
    const spear = mesh(new THREE.BoxGeometry(0.05, 0.05, 2.0), 0xd5d8dc, h.armR.pivot);
    spear.position.copy(h.armR.end.position);
    spear.position.z = 0.5;
  }
  h.root.position.copy(pos);
  h.root.position.y = groundY(pos.x, pos.z) + (m.fly || 0);
  h.root.rotation.y = Math.atan2(player.position.x - pos.x, player.position.z - pos.z);
  return makeEnemy({ kind: 'monster', mdef: m, type, level, labelName: `Lv ${level} ${m.name}`, h, root: h.root,
    radius: 0.45 * m.scale, height: 2 * m.scale, maxHp: Math.round(m.hp * (1 + 0.3 * (level - 1))), dmg: m.dmg * (1 + 0.12 * (level - 1)),
    flashMats: h.flashMats, fly: m.fly || 0, wings, superArmor: m.ai === 'boss', seed: Math.random() * 10,
    ai: { state: 'idle', t: 0, cd: 1 + Math.random(), special: 3, strafe: pick([-1, 1]), combo: 0, hitDone: false, fired: false } });
}

// Enemy projectiles (angel light orbs, boss volleys)
const enemyShots = [];
function enemyShoot(from, dir, speed, dmg, color) {
  const m = new THREE.Group();
  m.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), fxMat(0xffffff)));
  m.add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), fxMat(color, 0.6)));
  m.position.copy(from);
  scene.add(m);
  enemyShots.push({ m, vel: dir.clone().normalize().multiplyScalar(speed), dmg, color, life: 3 });
}
function monsterEnvironmentDamage(position,damage,range=3,criminal=false){
 for(const v of vehicles){if(v.disabled||Math.abs(v.group.position.y-position.y)>4||distXZ(v.group.position,position)>range+(v.radius||2))continue;if(isRoadVehicle(v))damageVehiclePower(v,damage,position,criminal);else{v.health=Math.max(0,(v.health??100)-damage);if(v.health===0){if(v.kind==='plane')crashPlane(v);else{v.disabled=true;v.speed=0;v.group.rotation.z=.8;}}}}
 for(const b of buildings){if(!b.alive)continue;const dx=Math.max(0,Math.abs(position.x-b.x)-b.w/2),dz=Math.max(0,Math.abs(position.z-b.z)-b.d/2);if(Math.hypot(dx,dz)>range||position.y>b.top+2)continue;b.integrity=Math.max(0,(b.integrity??250)-damage);if(b.integrity===0)collapseBuilding(b,criminal);}
}
function updateEnemyShots(dt) {
  for (let i = enemyShots.length - 1; i >= 0; i--) {
    const s = enemyShots[i];
    s.life -= dt;
    s.m.position.addScaledVector(s.vel, dt);
    if (Math.random() < 0.5) spawnParticle(s.m.position, randUnit(), s.color, 0.1, 0.3);
    const environmentHit=vehicles.some(v=>!v.disabled&&Math.abs(v.group.position.y-s.m.position.y)<3&&distXZ(v.group.position,s.m.position)<(v.radius||2)+.5)||insideCollider(s.m.position);if(environmentHit)monsterEnvironmentDamage(s.m.position,s.dmg,2);
    const hitPlayer = !inCar && s.m.position.distanceTo(at(player.position, 1.1)) < 0.9;
    if (hitPlayer) hurtPlayer(s.dmg, s.m.position, 5);
    if (environmentHit || hitPlayer || s.life <= 0 || insideCollider(s.m.position) || s.m.position.y < 0) { disposeObj(s.m); enemyShots.splice(i, 1); }
  }
}

// A warning circle on the ground; onDone fires when it fills up
function telegraph(pos, r, dur, color, onDone) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.94, r, 48), fxMat(color, 0.9, false));
  const fill = new THREE.Mesh(new THREE.CircleGeometry(r, 48), fxMat(color, 0.25, false));
  for (const m of [ring, fill]) { m.rotation.x = -Math.PI / 2; m.position.set(pos.x, pos.y + 0.06, pos.z); scene.add(m); }
  addTask({ dur, update: (dt, t) => fill.scale.setScalar(Math.max(0.01, t / dur)), end: () => { disposeObj(ring); disposeObj(fill); onDone(); } });
}

function bossSpecial(e) {
  const ai = e.ai, p = e.root.position;
  ai.state = Math.random() < 0.5 ? 'aoe' : 'volley';
  ai.t = 0; ai.fired = false;
  if (ai.state !== 'aoe') return;
  if(e.mdef.poison){const c=player.position.clone();telegraph(c,6,1.2,0x92ed2a,()=>{if(!e.alive||!dungeon)return;fxRing(c,0x92ed2a,6,.8);monsterEnvironmentDamage(c,e.dmg*1.5,6);if(distXZ(player.position,c)<6)hurtPlayer(e.dmg*1.5,c,5);});return;}
  if (e.type === 'archangel') {   // pillars of light around you
    for (let i = 0; i < 4; i++) {
      const c = player.position.clone().add(i ? new THREE.Vector3((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8) : new THREE.Vector3());
      c.y = groundY(c.x, c.z);
      telegraph(c, 2.4, 1.2, 0xffe08a, () => {
        if (!dungeon || !e.alive) return;
        fxPillar(c, 0xfff2c0, 2.2, 20, 0.5);
        burst(at(c, 0.5), 15, [0xffe08a, 0xffffff], 8, 0.15, 0.5, 2);
        if (distXZ(player.position, c) < 2.4) hurtPlayer(e.dmg * 1.6, c, 8);
      });
    }
  } else {                        // demon lord ground slam
    const c = p.clone();
    c.y = groundY(c.x, c.z);
    telegraph(c, 7, 1.1, 0xff3030, () => {
      if (!dungeon || !e.alive) return;
      monsterEnvironmentDamage(c,e.dmg*2,8);
      fxRing(c, 0xff4020, 8, 0.45);
      fxCrater(c, 4);
      burst(at(c, 0.3), 40, [0xff4020, 0x8a7d66, 0xffb02e], 14, 0.25, 0.8, 20, 6);
      shake = Math.max(shake, 0.6);
      if (distXZ(player.position, c) < 7 && player.position.y - c.y < 2.5) hurtPlayer(e.dmg * 2, c, 20);
    });
  }
}

function updateMonster(e, dt) {
 if(e.caveHome&&distXZ(player.position,e.caveHome)>42){if(distXZ(e.root.position,e.caveHome)>2)walkTowards(e,e.caveHome,2,dt);animateHumanoid(e.h,null,false,false,true,dt);return;}
  if(e.npcRaid)return;
  if(e.controlledByPlayer||supportSkills?.invisible){animateHumanoid(e.h,null,false,false,true,dt);return;}
  const m = e.mdef, ai = e.ai, p = e.root.position, now = performance.now() / 1000;
  for (const w of e.wings) w.rotation.y = w.userData.side * (0.5 + Math.sin(now * 8 + e.seed) * 0.35);
  ai.cd -= dt; ai.special -= dt;
  if (e.stun > 0 && !e.superArmor) { ai.state = 'idle'; e.glow = 0; animateHumanoid(e.h, 'stunned', false, false, e.onGround, dt); return; }
  const dist = distXZ(p, player.position), reach = 1.5 + 0.6 * m.scale;
  let pose = null, moving = false;
  ai.t += dt;

  if (m.ai === 'ranged') {   // angels keep their distance and throw light
    if (ai.state === 'cast') {
      pose = 'cast';
      e.glow = ai.t / 0.6;
      if (ai.t >= 0.6) {
        const from = at(p, 1.5 * m.scale);
        enemyShoot(from, at(player.position, 1.1).sub(from), 18, e.dmg, 0xffe08a);
        ai.state = 'idle'; ai.cd = 2 + Math.random(); e.glow = 0;
      }
    } else {
      const away = new THREE.Vector3(p.x - player.position.x, 0, p.z - player.position.z).normalize();
      if (dist < 7) moving = walkTowards(e, p.clone().addScaledVector(away, 3), m.speed, dt);
      else if (dist > 13) moving = walkTowards(e, player.position, m.speed, dt);
      else {
        if (Math.random() < 0.01) ai.strafe *= -1;
        moving = walkTowards(e, p.clone().add(new THREE.Vector3(away.z, 0, -away.x).multiplyScalar(2 * ai.strafe)), m.speed * 0.7, dt);
      }
      if (ai.cd <= 0 && dist < 24) { ai.state = 'cast'; ai.t = 0; }
    }
    faceTowards(e, player.position, 10 * dt);
  } else {
    switch (ai.state) {
      case 'idle':
        if (m.ai === 'boss' && ai.special <= 0) { ai.special = 5 + Math.random() * 3; bossSpecial(e); break; }
        if (dist > reach) moving = walkTowards(e, player.position, m.speed, dt);
        else if (ai.cd <= 0) { ai.state = 'windup'; ai.t = 0; ai.combo = 0; }
        if (!moving) faceTowards(e, player.position, 8 * dt);
        break;
      case 'windup':   // red/gold glow = punch incoming
        pose = 'windup';
        e.glow = ai.t / 0.45;
        faceTowards(e, player.position, 6 * dt);
        if (ai.t >= 0.45) { ai.state = 'punch'; ai.t = 0; ai.hitDone = false; e.glow = 0; }
        break;
      case 'punch': {
        pose = ai.combo % 2 ? 'punchL' : 'punchR';
        const f = fwdOf(e.root);
        if (ai.t < 0.1) { p.addScaledVector(f, 4 * dt); collide(p, e.radius); }
        if (!ai.hitDone && ai.t >= 0.07) {
          ai.hitDone = true;
          const to = new THREE.Vector3(player.position.x - p.x, 0, player.position.z - p.z);
          if (to.length() < reach + 0.8 && to.normalize().dot(f) > 0.2 && Math.abs(player.position.y - p.y) < 2) hurtPlayer(e.dmg, p, m.ai === 'boss' ? 12 : 5);
          fxSwoosh(at(p, 1.3 * m.scale).addScaledVector(f, 0.8 * m.scale), f, m.horns ? 0xff4020 : 0xffe08a, ai.combo % 2);
        }
        if (ai.t >= 0.3) {
          ai.combo++;
          if (ai.combo < (m.ai === 'boss' ? 3 : 2)) { ai.t = 0; ai.hitDone = false; }
          else { ai.state = 'recover'; ai.t = 0; }
        }
        break;
      }
      case 'recover':
        if (ai.t > 0.6) { ai.state = 'idle'; ai.t = 0; ai.cd = (m.ai === 'boss' ? 0.5 : 0.8) + Math.random() * 0.8; }
        break;
      case 'aoe':
        pose = e.type === 'archangel' ? 'charge' : 'slam';
        if (ai.t > 1.3) { ai.state = 'idle'; ai.t = 0; }
        break;
      case 'volley':
        pose = 'cast';
        faceTowards(e, player.position, 6 * dt);
        if (!ai.fired && ai.t > 0.5) {
          ai.fired = true;
          const from = at(p, 1.6 * m.scale), base = at(player.position, 1.1).sub(from);
          for (let i = -3; i <= 3; i++) enemyShoot(from, base.clone().applyAxisAngle(UP, i * 0.16), 16, e.dmg * 0.8, m.shot);
        }
        if (ai.t > 0.9) { ai.state = 'idle'; ai.t = 0; }
        break;
    }
  }
  animateHumanoid(e.h, pose, moving, false, true, dt);
  if (m.fly) e.h.rig.position.y = Math.sin(now * 2 + e.seed) * 0.15;
}

function removeEnemy(e) {
  disposeObj(e.root);
  e.label?.el.remove();
  const i = enemies.indexOf(e);
  if (i >= 0) enemies.splice(i, 1);
}

// =====================================================================
// DUNGEON RUN (waves -> boss -> rewards -> exit portal)
// =====================================================================
let dungeon = null;
function enterDungeon(gate) {
  if (gate.tier === 'red') toast('Warning: this gate is far above your level. Survival chance is extremely low.');
  action = null;
  $('fade').style.opacity = 1;
  setTimeout(() => {
    dungeon = { gate, wave: 0, waves: wavesFor(gate), mobs: [], cleared: false, nextT: 2, boss: null, returnPos: player.position.clone(),entryLevel:prog.level };
    if(!gate.persistent)removeGate(gate);
    wanted = 0;
    applyTheme(gate.theme);
    setGateColor(exitGate, 0xffffff);
    player.position.set(DUN.x, 0, DUN.z + 27);
    player.rotation.y = Math.PI;
    yaw = 0; vy = 0; pvel.set(0, 0, 0);
    lampTimer = 0;
    $('fade').style.opacity = 0;
    callout(gate.name.toUpperCase(), TIER[gate.tier].color, true);
  }, 650);
}
function spawnWave() {
  const d = dungeon, g = d.gate, th = THEMES[g.theme];
  d.wave++;
  const isBoss = d.wave === d.waves;
  const count = Math.min(9, 2 + Math.floor(g.stars / 2) + d.wave);
  const list = [];
  for (let i = 0; i < (isBoss ? Math.ceil(count / 2) : count); i++) list.push(pick(WAVE_TYPES[g.theme]));
  if(g.finalBoss)list.length=0;
  if (isBoss) list.unshift(g.theme==='poison'?'venomSovereign':g.theme === 'demon' ? 'demonLord' : g.theme === 'angel' ? 'archangel' : pick(['demonLord', 'archangel']));
  list.forEach((type, i) => {
    const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 12;
    const pos = isBoss && i === 0 ? new THREE.Vector3(DUN.x, 0, DUN.z - 12)
      : new THREE.Vector3(DUN.x + Math.cos(a) * r, 0, DUN.z - 4 + Math.sin(a) * r * 0.7);
    const e = makeMonster(type, g.level + (isBoss && i === 0 && !g.finalBoss ? 2 : 0), pos);
    e.stun = 0.8;   // short delay before they attack
    d.mobs.push(e);
    if (isBoss && i === 0) d.boss = e;
    fxPillar(pos, th.sigil, 1.2, 8, 0.6);
    fxRing(pos, th.sigil, 3, 0.5);
  });
  callout(isBoss ? `FINAL WAVE: ${MONSTERS[list[0]].name.toUpperCase()}` : `WAVE ${d.wave} / ${d.waves}`, th.sigil, true);
}
function clearDungeon() {
  const d = dungeon, g = d.gate;
  if(d.cleared)return;
  d.cleared = true;supportCounters.dungeons++;persistSupportProgress();
  const rewardMultiplier=d.secretBonus?20:1;
  const gold = Math.round(40 * g.stars * (1 + g.level * 0.2))*rewardMultiplier;
  const xp = Math.round(60 * g.stars * (1 + g.level * 0.15))*rewardMultiplier;
  stats.gold += gold;
  gainXp(xp);
  callout('DUNGEON CLEARED', 0xffd166, true);
  toast(`+${gold} gold, +${xp} XP. Walk to the portal and press E to leave.`);
  setGateColor(exitGate, 0xffd166);
}
function leaveDungeon() {
  const d = dungeon;
  if (!d) return;
  for (const m of d.mobs) removeEnemy(m);
  for (const s of enemyShots) disposeObj(s.m);
  enemyShots.length = 0;
  dungeon = null;
  $('bossbar').style.display = 'none';
  for (const l of lampLights) l.color.set(0xffc77a);
  player.position.copy(d.returnPos);
  player.position.y = groundY(player.position.x, player.position.z);
  vy = 0;
  lampTimer = 0;
}
function leaveDungeonFade() {
  const won = dungeon.cleared;
  $('fade').style.opacity = 1;
  setTimeout(() => { leaveDungeon(); $('fade').style.opacity = 0; if (!won) toast('You escaped the dungeon.'); }, 600);
}
function updateDungeon(dt) {
  const bb = $('bossbar');
  if (!dungeon) return;
  const d = dungeon;
  exitGate.ringMat.emissiveIntensity = d.cleared ? 3 + Math.sin(performance.now() / 200) : 1.2;
  if (!d.cleared && d.mobs.every(m => !m.alive)) {
    d.nextT -= dt;
    if (d.nextT <= 0) {
      if (d.wave < d.waves) { spawnWave(); d.nextT = 2.5; }
      else clearDungeon();
    }
  }
  if (d.boss && d.boss.alive) {
    bb.style.display = 'block';
    bb.querySelector('.bname').textContent = `Lv ${d.boss.level} ${d.boss.mdef.name}`;
    bb.querySelector('.bfill').style.width = clamp(d.boss.hp / d.boss.maxHp * 100, 0, 100) + '%';
  } else bb.style.display = 'none';
}

// =====================================================================
// HOME ACTIONS
// =====================================================================
function switchChar() {
  if(onlinePlayReady&&hosting.room){toast('Your online class is permanent for this account.');return;}
  if (!canAct()) return;
  const pos = unlockedCharIndices.indexOf(charIdx);
  charIdx = unlockedCharIndices[(pos + 1) % unlockedCharIndices.length];
  const c = characters[charIdx];
  P.mats.outfit.color.set(c.color);
  P.mats.hair.color.set(c.hair);
  fxRing(player.position, c.fx, 2.5, 0.35);
  burst(at(player.position, 1), 20, [c.fx, 0xffffff], 6, 0.12, 0.4, 0);
  buildHotbar();
  toast('Switched to ' + c.name);
}
function sleep() {
  $('fade').style.opacity = 1;
  setTimeout(() => {
    stats.energy = 100;
    stats.hp = Math.min(maxHp(), stats.hp + 30);
    stats.hunger = Math.max(0, stats.hunger - 15);
    dayTime = (dayTime + 0.3) % 1;
    reconstructionDays += 0.3;
    $('fade').style.opacity = 0;
    toast('You slept. Energy restored.');
  }, 700);
}
function eat() {
  stats.hunger = 100;
  toast('You ate a snack. Hunger restored.');
}
const nearestInteractable = () => interactables.find(it => distXZ(player.position, it.pos) < it.r && Math.abs(player.position.y - it.pos.y) < 2);
function nearestVehicle() {
  let best = null, bd = 3.6;
  for (const v of vehicles) {
    if (v.crashed || v.disabled || v.noSteal) continue;
    const d = distXZ(player.position, v.group.position) - (v.kind === 'bus' ? 2.5 : v.kind === 'boat' ? 1.5 : v.kind === 'plane' ? 3 : 0);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}
function raiseWanted(t = 45) {
  if (wanted <= 0) toast('Police alert: stop and surrender to avoid a pursuit.');
  wanted = Math.max(wanted, t);
  policeLastSeen.copy(inCar && driving ? driving.group.position : player.position);
}
function enterVehicle(v) {
  if(adventureServices?.parachuting){toast('Land before entering a vehicle.');return;}
  if(v.noSteal){toast('This is a passenger taxi or a display car. Board at its service point.');return;}
  v.routeTraffic=false;
  if(v.kind==='plane')adventureServices?.giveEmergencyParachute();
  if (v.disabled) { toast('This vehicle is wrecked. Choose another car.'); return; }
  if (v.ai) {   // carjacking: the driver jumps out and runs, passengers flee
    const driver = peds.find(e => e.alive && !e.hidden && e.ped.state === 'wander' && distXZ(e.root.position, player.position) > 60);
    if (driver && v.kind !== 'boat') {
      const h = v.group.rotation.y;
      driver.root.position.copy(v.group.position).add(new THREE.Vector3(Math.cos(h) * 2, 0, -Math.sin(h) * 2));
      driver.root.position.y = groundY(driver.root.position.x, driver.root.position.z);
      driver.ped.state = 'panic'; driver.ped.panicT = 6;
    }
    if (v.passengers?.length) {
      const door = busDoor(v);
      for (const e of v.passengers) { e.hidden = false; e.root.visible = true; e.root.position.copy(door); e.ped.state = 'panic'; e.ped.panicT = 5; }
      v.passengers = [];
    }
    v.ai = null;
    if (v.kind !== 'boat') raiseWanted(v.kind === 'police' ? 120 : 25);
    if (v.kind === 'police') { requestPoliceBackup(); toast('Police car stolen! Backup is pursuing you.'); }
  }
  activeDrivingControls={carMovement:controlPrefs.carMovement,drivingMode:controlPrefs.drivingMode};transmissionAuto=activeDrivingControls.drivingMode==='automatic';gear=1;
  driving = v; inCar = true; action = null;
  if(cameraView==='first'){yaw=v.group.rotation.y+Math.PI;pitch=0;}
  player.visible = false;
  if (v.kind === 'plane') toast('Q/R barrel roll in flight. W/S throttle · A/D turn · Space climb · Shift dive. Take off down the runway!');
  v.group.add(headlight, headlight.target);
  headlight.position.set(0, 0.8, v.length / 2 + 0.1);
  headlight.target.position.set(0, 0, 14);
}
function exitVehicle(force = false) {
  if(driving?.bridgeFlight&&!force){toast('Wait until the vehicle lands before getting out.');return;}
  const v = driving, h = v.group.rotation.y;
  if(v.kind==='plane'&&!force&&v.alt>groundY(v.group.position.x,v.group.position.z,v.alt)+3){const p=v.group.position.clone();p.x+=Math.cos(h)*4;p.z-=Math.sin(h)*4;player.position.copy(p);player.visible=true;driving=null;inCar=false;vy=-4;onGround=false;pvel.set(Math.sin(h)*v.speed*.3,0,Math.cos(h)*v.speed*.3);adventureServices?.giveEmergencyParachute();adventureServices?.deploy();return;}
  if (v.kind === 'boat') {   // step off onto the pier
    const island=regionalEnvironment?.islands.find(i=>Math.hypot(v.group.position.x-i.x,v.group.position.z-i.z)<i.r+14);
    if(island)player.position.set(island.x,.2,island.z-island.r+2);
    else if(Math.hypot(v.group.position.x-ISLAND.x,v.group.position.z-ISLAND.z)<ISLAND_R+14)player.position.set(ISLAND.x,CURB,ISLAND.z-ISLAND_R+2);
    else player.position.copy(v.group.position).add(new THREE.Vector3(2,.2,0));
  } else {
    const side = v.kind === 'bus' ? 2.4 : v.kind === 'plane' ? 4 : 2;
    player.position.set(v.group.position.x + Math.cos(h) * side, 0, v.group.position.z - Math.sin(h) * side);
    collide(player.position, 0.4);
  }
  player.position.y = groundY(player.position.x, player.position.z);
  player.visible = true;
  driving = null; inCar = false;
}
function mountHorse(pet) {
  if (riding || inCar || sitting || dungeon) { toast('Finish what you\'re doing first.'); return; }
  pet.ridden = true;
  riding = pet;
  player.visible = false;
}
function dismountHorse() {
  if (!riding) return;
  const g = riding.g, h = g.rotation.y;
  player.position.set(g.position.x + Math.sin(h) * 1.6, 0, g.position.z + Math.cos(h) * 1.6);
  collide(player.position, 0.4);
  player.position.y = groundY(player.position.x, player.position.z);
  player.visible = true;
  riding.ridden = false;
  riding = null;
}
function updateRiding(dt) {
  const g = riding.g, dir = inputDir();
  const moving = dir.lengthSq() > 0;
  if (moving) {
    const sprint = keys.ShiftLeft ? 1.6 : 1;
    g.position.addScaledVector(dir, 7 * sprint * dt);
    g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(dir.x, dir.z), 1 - Math.exp(-10 * dt));
  }
  collide(g.position, 0.5);
  g.position.y = groundY(g.position.x, g.position.z, g.position.y);
  player.position.copy(g.position);
  player.rotation.y = g.rotation.y;
}
// Single source of truth for "what would pressing E do right now" — used by
// both the HUD prompt text and interact() itself, so the prompt can never say
// one thing while E actually does another (they were two separately
// maintained priority lists before, and had drifted out of sync).
function resolveInteractTarget() {
  if(adventureServices?.parachuting)return {label:'Parachute: steer to land',action:()=>toast('Use movement controls to steer the parachute toward clear ground.')};
  if(navy?.rider)return {label:'Leave naval vessel at dock',action:()=>navy.leave()};
  if(intercityRail?.rider)return {label:'Leave intercity train at station',action:()=>intercityRail.leave()};
  if(wanted>0&&!transitArrestTarget(transport)&&vehicles.some(v=>v.kind==='police'&&distXZ(v.group.position,player.position)<25))return {label:'Surrender to police',action:()=>{if(inCar&&Math.abs(driving.speed)>1){toast('Stop the car before surrendering.');return;}if(inCar)exitVehicle(true);arrestPlayer();}};
  if(cityServices?.rider)return {label:cityServices.rider.bus?'Leave city bus':'Leave taxi',action:()=>cityServices.leave()};
  if(spaceCentre?.rider)return {label:spaceCentre.state==='landed'?'Leave rocket':spaceCentre.state==='boarding'?'Leave rocket cabin':spaceCentre.state==='countdown'?'Abort launch':'Rocket flight in progress',action:()=>spaceCentre.interact()};
  if (metro?.rider) return { label: 'Leave the subway', action: () => metro.leave() };
  if (riding) return { label: 'Dismount', action: dismountHorse };
  if (transport?.rider) return { label: 'Leave', action: () => transport.leave() };
  if (inCar) return { label: driving.kind === 'plane' && driving.alt > 3 ? 'Jump with parachute' : 'Get out', action: () => exitVehicle() };
  if (sitting) return { label: 'Stand up', action: () => toggleSit(null) };
  if (action) return null;
  const seat = nearestSitSpot();
  if (seat) return { label: seat.label || 'Sit', action: () => toggleSit(seat) };
  if (inCivicInterior) return { label: 'Leave', action: leaveCivicBuilding };
  if (dungeon) return nearExitPortal() ? { label: dungeon.cleared ? 'Leave the dungeon' : 'Escape (no reward)', action: leaveDungeonFade } : null;
  const service = nearestInteractable();
  if(service&&/^(Talk to|Use Northhaven|Read strategic|Board .*taxi|Board .*city bus|Visit .*dealership|Visit .*tourist office|Speak to hidden quest master|Speak to Technocrat|Speak to Scientist|Speak to Bureaucrat|Speak to Trader|Speak to Theologian|Speak to Sufi|Speak to Teacher|Speak to Imam|Speak to Christian|Speak to Hindu|Speak to Buddhist|Speak to Rabbi|Speak to Engineer|Speak to Doctor|Speak to Tour guide)/.test(service.label))return {label:service.label,action:service.action};
  if (service && (player.position.x > 350 || player.position.x < -350 || service.label === 'Open town travel board' || service.label.startsWith('Board ') || service.label === 'Adopt companion dog' || service.label === 'Claim special training ability' || service.label.startsWith('Enter sewer manhole') || service.label.startsWith('Enter subway'))) return { label: service.label, action: service.action };
  const cb = nearestCivicBuilding();
  if (cb) return { label: `Enter ${cb.name}`, action: () => enterCivicBuilding(cb) };
  const g = nearestGate();
  if (g) return { label: `Enter gate "${g.name}"`, action: () => enterDungeon(g) };
  const v = nearestVehicle();
  if (v) {
    const names = { car: 'car', police: 'police car', bus: 'bus', boat: 'boat', ambulance: 'ambulance', tank: 'tank' };
    const label = v.kind === 'plane' ? `Fly the ${v.name.toLowerCase()}` : (v.ai && v.kind !== 'boat' ? 'Steal the ' : 'Drive the ') + names[v.kind];
    return { label, action: () => enterVehicle(v) };
  }
  const it = nearestInteractable();
  return it ? { label: it.label, action: it.action } : null;
}
function interact() { resolveInteractTarget()?.action(); }

// =====================================================================
// CIVIC BUILDINGS: real police stations, hospitals, courthouses, libraries,
// etc. from the OSM data are enterable. One shared interior pocket space is
// reused for all of them (like the dungeon arena); the AI generates what's
// actually inside — its purpose, rooms and the people you'd find there —
// per visit, rather than every one having a hand-built unique interior.
// =====================================================================
const CIVIC_OFFSET = new THREE.Vector3(-5000, 0, 0);
let inCivicInterior = false, civicReturnPos = null;
// One shared room, but its colors are retinted per building type on entry (see
// enterCivicBuilding) so a hospital, police station and library don't all look
// identical — a cheap stand-in for genuinely unique interiors per building.
const CIVIC_THEMES = {
  police: { wall: 0xd7dde6, floor: 0x9aa7b8, light: 0xdbe8ff },
  hospital: { wall: 0xf5fbf8, floor: 0xd8ecE4, light: 0xffffff },
  clinic: { wall: 0xf5fbf8, floor: 0xd8ecE4, light: 0xffffff },
  doctors: { wall: 0xf5fbf8, floor: 0xd8ecE4, light: 0xffffff },
  courthouse: { wall: 0xe9e2d0, floor: 0xb9ac8c, light: 0xfff3d6 },
  townhall: { wall: 0xe9e2d0, floor: 0xb9ac8c, light: 0xfff3d6 },
  library: { wall: 0xe3d2b4, floor: 0x8a6a46, light: 0xffecc2 },
  school: { wall: 0xfff3cf, floor: 0xe0c468, light: 0xfff6d9 },
  university: { wall: 0xfff3cf, floor: 0xe0c468, light: 0xfff6d9 },
  fire_station: { wall: 0xf2d3d0, floor: 0x9e3b35, light: 0xffe3df },
  community_centre: { wall: 0xdcefe3, floor: 0x7fbf9a, light: 0xeafff2 },
  job_centre: { wall: 0xdfe4ef, floor: 0x8c97b8, light: 0xeef1ff },
  post_office: { wall: 0xf2e3d0, floor: 0xc98c3b, light: 0xfff0d9 },
  bank: { wall: 0xeef0e4, floor: 0x5c6e4a, light: 0xfaffea },
};
const DEFAULT_CIVIC_THEME = { wall: 0xe8e4d8, floor: 0xcfc9ba, light: 0xfff4d6 };
let civicFloor, civicWalls = [], civicLight;
let civicTvCanvas,civicTvTexture,civicTvScreen,civicTvT=0;
(function buildCivicInterior() {
  civicFloor = box(26, 0.3, 20, CIVIC_OFFSET.x, 0.15, CIVIC_OFFSET.z, 0xcfc9ba);             // floor
  civicWalls.push(box(26, 6, 0.4, CIVIC_OFFSET.x, 3, CIVIC_OFFSET.z - 10, 0xe8e4d8));        // back wall
  civicWalls.push(box(26, 6, 0.4, CIVIC_OFFSET.x, 3, CIVIC_OFFSET.z + 10, 0xe8e4d8));        // front wall
  civicWalls.push(box(0.4, 6, 20, CIVIC_OFFSET.x - 13, 3, CIVIC_OFFSET.z, 0xe8e4d8));
  civicWalls.push(box(0.4, 6, 20, CIVIC_OFFSET.x + 13, 3, CIVIC_OFFSET.z, 0xe8e4d8));
  civicLight = new THREE.PointLight(0xfff4d6, 1.2, 30);
  civicLight.position.set(CIVIC_OFFSET.x, 5, CIVIC_OFFSET.z);
  scene.add(civicLight);
  // A chair facing a TV — sit with E, stand with E again. The TV shows a looping
  // placeholder "channel" (a canvas texture); there's no real video content/streaming
  // infrastructure, so this is an honest stand-in, not an attempt at real shows.
  // Positioned directly on the path from the spawn point (z+8, facing -Z) so you
  // walk straight toward the chair and TV instead of having to go find them.
  box(0.8, 0.9, 0.8, CIVIC_OFFSET.x, 0.45, CIVIC_OFFSET.z + 2, 0x4a3a2a, false);
  box(0.8, 0.9, 0.12, CIVIC_OFFSET.x, 0.95, CIVIC_OFFSET.z + 2.4, 0x4a3a2a, false); // backrest, behind the seat (toward the entrance, away from the TV)
  civicTvCanvas = document.createElement('canvas'); civicTvCanvas.width = 256; civicTvCanvas.height = 160;
  civicTvTexture = new THREE.CanvasTexture(civicTvCanvas);
  const tvScreen = civicTvScreen = mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshBasicMaterial({ map: civicTvTexture }));
  tvScreen.position.set(CIVIC_OFFSET.x, 1.9, CIVIC_OFFSET.z - 9.55);
  box(2.7, 1.8, 0.15, CIVIC_OFFSET.x, 1.9, CIVIC_OFFSET.z - 9.6, 0x1a1a1a, false);
  sitSpots.push({ x: CIVIC_OFFSET.x, z: CIVIC_OFFSET.z + 2, yaw: Math.PI, seatY: 0.9, label: 'Sit and watch TV' }); // face -Z, toward the TV
})();
let sitting = false, sitReturnPosition = null, activeSitSpot = null;
function updateCivicTv(dt) {
  if(movieTv?.playing)return;
  if (!civicTvCanvas) return;
  civicTvT += dt;
  if (civicTvT < 0.4) return; // redraw a few times a second, not every frame
  civicTvT = 0;
  const ctx = civicTvCanvas.getContext('2d');
  const hue = (performance.now() / 40) % 360;
  ctx.fillStyle = `hsl(${hue},55%,30%)`; ctx.fillRect(0, 0, 256, 160);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('ANOTHERWORLD TV', 128, 70);
  ctx.font = '12px sans-serif'; ctx.fillText('Channel 1 — nothing on yet', 128, 92);
  civicTvTexture.needsUpdate = true;
}
function nearestSitSpot(maxD = 3) {
  let best = null, bestD = maxD;
  for (const s of sitSpots) {
    if (s.broken || Math.abs(player.position.y - ((s.seatY ?? .5) - .5)) > 1.8) continue;
    const d = Math.hypot(player.position.x - s.x, player.position.z - s.z);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}
function toggleSit(spot) {
  if (!sitting) {
    if (!spot || spot.broken || inCar || action) return;
    activeSitSpot = spot;
    sitReturnPosition = player.position.clone();
    sitting = true;
    action = null; mouseHeld = false; vy = 0; pvel.set(0, 0, 0);
    player.position.set(spot.x, (spot.seatY ?? groundY(spot.x, spot.z) + 0.45) - 0.98, spot.z);
    player.rotation.y = spot.yaw;
    toast('Sitting. Press E to stand.');
  } else {
    sitting = false; activeSitSpot = null;
    if (sitReturnPosition) player.position.copy(sitReturnPosition);
    player.position.y = groundY(player.position.x, player.position.z);
    sitReturnPosition = null; vy = 0; pvel.set(0, 0, 0);
    toast('Standing up.');
  }
  updateSitPrompt();
}
function updateSitPrompt() {
  if (!locked || inCar || (action && !sitting)) { $('sitPrompt').style.display = 'none'; return; }
  if (sitting) { $('sitPromptText').textContent = 'Stand up'; $('sitPrompt').style.display = 'block'; return; }
  const seat = nearestSitSpot();
  if (seat) { $('sitPromptText').textContent = seat.label || 'Sit'; $('sitPrompt').style.display = 'block'; }
  else $('sitPrompt').style.display = 'none';
}
function applyCivicTheme(type) {
  const t = CIVIC_THEMES[type] || DEFAULT_CIVIC_THEME;
  civicFloor.material.color.set(t.floor);
  for (const w of civicWalls) w.material.color.set(t.wall);
  civicLight.color.set(t.light);
}
// AI appearances survive tile unloading and browser reloads.
let buildingAppearances = {};
try { const saved = JSON.parse(localStorage.getItem('anotherworld-building-exteriors') || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) buildingAppearances = saved; } catch {}
function applyBuildingExterior(b, exterior, persist = false) {
  // Real map buildings keep their recorded appearance, including on reload.
  if (b.realWorld || !exterior || typeof exterior !== 'object' || !b.mesh) return;
  const validColor = c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
  if (!validColor(exterior.facadeColor) || !validColor(exterior.roofColor)) return;
  const appearance = { facadeColor: exterior.facadeColor, roofColor: exterior.roofColor,
    signText: typeof exterior.signText === 'string' ? exterior.signText.replace(/[\x00-\x1f]/g, '').slice(0, 40) : b.name.slice(0, 40) };
  const colors = b.mesh.geometry.getAttribute('color'), normals = b.mesh.geometry.getAttribute('normal');
  const base = b.mesh.material.color;
  const tint = hex => { const c = new THREE.Color(hex); c.r /= base.r; c.g /= base.g; c.b /= base.b; return c; };
  const wall = tint(appearance.facadeColor), roof = tint(appearance.roofColor);
  for (let i = b.colorStart; i < b.colorStart + b.vertexCount; i++) {
    const c = normals.getY(i) > 0.5 ? roof : wall; colors.setXYZ(i, c.r, c.g, c.b);
  }
  colors.needsUpdate = true;
  if (b.sign) { b.sign.material.map.dispose(); b.sign.material.dispose(); b.sign.removeFromParent(); b.sign = null; }
  if (appearance.signText) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#18202c'; ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(appearance.signText, 256, 48, 480);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    b.sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
    b.sign.position.set(b.x - CITY_OFFSET.x, b.height + 1, b.z - CITY_OFFSET.z); b.sign.scale.set(8, 1.5, 1); b.group.add(b.sign);
  }
  if (persist) { buildingAppearances[b.id] = appearance; try { localStorage.setItem('anotherworld-building-exteriors', JSON.stringify(buildingAppearances)); } catch {} }
}
function nearestCivicBuilding() {
  let best = null, bestD = 6;
  for (const b of civicBuildings) {
    // Distance to the footprint's nearest edge, not its centroid — the centroid is
    // well inside solid walls for anything bigger than a small house, which made
    // most of the city effectively unenterable (you could never get "close enough").
    let d;
    if (b.minX != null) {
      const cx = clamp(player.position.x, b.minX, b.maxX), cz = clamp(player.position.z, b.minZ, b.maxZ);
      d = Math.hypot(player.position.x - cx, player.position.z - cz);
    } else {
      d = Math.hypot(b.x - player.position.x, b.z - player.position.z);
    }
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}
async function enterCivicBuilding(b) {
  if(b.structure&&!b.structure.alive){toast('Building closed for reconstruction.');return;}
  action = null;
  civicReturnPos = player.position.clone();
  $('fade').style.opacity = 1;
  let data = null;
  try {
    const res = await fetch('/api/civic-interior', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: b.type, name: b.name }), signal: AbortSignal.timeout(12000) });
    data = await res.json(); if (!res.ok || data.error) data = null;
    if (data?.exterior) applyBuildingExterior(b, data.exterior, true);
  } catch {}
  setTimeout(() => {
    inCivicInterior = true;
    applyCivicTheme(b.type);
    player.position.set(CIVIC_OFFSET.x, 0, CIVIC_OFFSET.z + 8);
    player.rotation.y = Math.PI;
    yaw = 0; vy = 0; pvel.set(0, 0, 0);
    $('fade').style.opacity = 0;
    callout(b.name.toUpperCase(), 0xffd166, true);
    const desc = data?.description || `You step into ${b.name}, but it's hard to make out much more right now.`;
    const staff = data?.staff?.length ? ' Staff here: ' + data.staff.map(s => `${s.name} (${s.role})`).join(', ') + '.' : '';
    toast(desc + staff + ' There’s a chair by a TV straight ahead — walk up and press E to sit.');
  }, 650);
}
function leaveCivicBuilding() {
  $('fade').style.opacity = 1;
  setTimeout(() => {
    inCivicInterior = false;
    sitting = false;
    player.position.copy(civicReturnPos);
    player.position.y = groundY(player.position.x, player.position.z);
    vy = 0;
    $('fade').style.opacity = 0;
  }, 650);
}

// =====================================================================
// BOARD (Stats + Skills tabs) and HOTBAR
// =====================================================================
let boardOpen = false, boardTab = 'stats';
const hex = c => '#' + new THREE.Color(c).getHexString();
function renderBoard() {
  document.querySelectorAll('#board .tab').forEach(b => b.classList.toggle('active', b.dataset.tab === boardTab));
  $('tabStats').style.display = boardTab === 'stats' ? '' : 'none';
  $('tabSkills').style.display = boardTab === 'skills' ? '' : 'none';

  $('lvlText').textContent = `Level ${prog.level}: ${prog.xp} / ${xpToNext()} XP`;
  $('xpBar').style.width = (prog.xp / xpToNext() * 100) + '%';
  $('pointsText').textContent = `Points to spend: ${prog.points} (3 per level; defeat enemies and dummies for XP)`;
  const rows = $('statRows');
  rows.innerHTML = '';
  for (const [key, info] of Object.entries(STAT_INFO)) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<div class="info"><div class="stat-name">${info.name}</div><div class="desc">${info.desc}</div></div>
      <div class="val">${prog[key]}</div><button ${prog.points ? '' : 'disabled'}>+</button>`;
    row.querySelector('button').addEventListener('click', () => spendPoint(key));
    rows.appendChild(row);
  }

  const skillRow = (key, s, extra = '') => `<div class="row"><div class="ico">${s.icon}</div><div class="info">
    <div class="stat-name"><span class="kbd">${key}</span>${s.name}</div><div class="desc">${s.desc}</div>
    <div class="meta">Damage ${s.dmg}${extra}</div></div></div>`;
  let html = '<h2>Skills</h2><div class="sub">Basic moves (all characters)</div>';
  html += skillRow('Click', { icon: '⚔️', name: 'M1 Combo', desc: 'Hold or tap for a 4-hit combo. The 4th hit sends enemies flying.', dmg: `${attackDmg()} ×3 + ${Math.round(attackDmg() * 1.8)}` });
  html += skillRow('Q', { icon: '➤', name: 'Dash', desc: 'Quick dash in the direction you are moving. Brief invincibility.', dmg: '0' }, ' · Cooldown 1.5s');
  html += skillRow('F', { icon: '🛡️', name: 'Block', desc: 'Hold to block hits from the front (80% less damage). Guard-break moves go through.', dmg: '0' });
  html += skillRow('R', { icon: 'SP', name: supportSkills?.equipped?supportSkills.name:specialUnlocked ? 'Psychic Grip' : 'Empty special slot', desc: specialUnlocked ? 'Support skills are separate from your elemental class. Open the support collection below.' : 'Reach level 5, find a hidden quest master, and earn a support skill. Training progress: '+specialTrainingKills+'/5.', dmg: specialUnlocked ? String(psyDmg()) : '0' });
  for (const c of characters) {
    html += `<div class="charHead" style="color:${hex(c.fx)}">${c.name}${c === characters[charIdx] ? ' (active)' : ''}</div>`;
    c.skills.forEach((s, i) => { html += skillRow(i + 1, s, ` · Cooldown ${s.cd}s`); });
    html += skillRow('G', c.ult, ' · Needs a full ultimate bar');
  }
  html+='<button id="openSupportSkills">Support skill collection</button>';
  $('tabSkills').innerHTML = html;
  $('openSupportSkills').onclick=()=>supportSkills?.show();
}
document.querySelectorAll('#board .tab').forEach(b => b.addEventListener('click', () => { boardTab = b.dataset.tab; renderBoard(); }));

let slotEls = [];
function buildHotbar() {
  const c = characters[charIdx];
  const slot = (key, s, cls = '', lvl = 0) => `<div class="slot ${cls}" style="--glow:${hex(c.fx)}"><div class="icon">${s.icon}</div>
    <div class="sname">${s.name}</div><div class="key">${key}</div><div class="cd"></div><div class="cdt"></div>
    <div class="lock">🔒<span class="lvl">Lv ${lvl}</span></div></div>`;
  $('hotbar').innerHTML = slot('Q', { icon: '➤', name: 'Dash' }, 'small')
    + slot('R', { icon: 'SP', name: supportSkills?.name||(specialUnlocked?'Psychic':'Empty special') }, 'small')
    + c.skills.map((s, i) => slot(i + 1, s, '', SKILL_UNLOCK_LEVEL[i])).join('')
    + slot('G', c.ult, 'ult', ULT_UNLOCK_LEVEL);
  slotEls = [...$('hotbar').children].map(el => ({ el, cd: el.querySelector('.cd'), cdt: el.querySelector('.cdt') }));
}
function updateHotbar() {
  const c = characters[charIdx];
  const set = (s, remaining, total) => {
    s.cd.style.height = (total ? clamp(remaining / total, 0, 1) * 100 : 0) + '%';
    s.cdt.textContent = remaining > 0 ? Math.ceil(remaining) : '';
  };
  set(slotEls[0], dashCd, 1.5);
  set(slotEls[1],supportSkills?.equipped?supportSkills.cooldown:psyCd,supportSkills?.equipped?12:psyCdMax());
  slotEls[1].el.classList.toggle('locked', !specialUnlocked);slotEls[1].el.querySelector('.lvl').textContent=specialUnlocked?'':'Quest';
  c.skills.forEach((s, i) => { set(slotEls[i + 2], c.cds[i], s.cd); slotEls[i + 2].el.classList.toggle('locked', prog.level < SKILL_UNLOCK_LEVEL[i]); });
  slotEls[slotEls.length - 1].el.classList.toggle('locked', prog.level < ULT_UNLOCK_LEVEL);
  const u = slotEls[slotEls.length - 1];
  u.cd.style.height = (100 - stats.ult) + '%';
  u.cdt.textContent = stats.ult < 100 ? Math.floor(stats.ult) + '%' : '';
  u.el.classList.toggle('ready', stats.ult >= 100);
}

// =====================================================================
// INPUT
// =====================================================================
const keys = {};
let locked = false, yaw = Math.PI, pitch = 0.3, camDist = 6;
let mobileControls = null;
function requestGameControl() {
  for(const code in keys)keys[code]=false;mouseHeld=false;
  if (mobileControls?.mobile) {
    if (innerHeight >= innerWidth) return;
    locked = true; boardOpen = false; settingsOpen = false; $('board').style.display = 'none'; $('settingsPanel').style.display = 'none'; $('start').style.display = 'none';
    mobileControls.update();applyLayout();
  } else { if(document.pointerLockElement!==renderer.domElement)renderer.domElement.requestPointerLock()?.catch?.(()=>{});applyLayout(); }
}
function pauseMobileGame() { locked = false; mouseHeld = false; $('start').style.display = boardOpen || settingsOpen ? 'none' : 'flex'; }

function toggleBoard(open) {
  if (freeMouse) { freeMouse = false; $('mouseHint').style.display = 'none'; $('crosshair').style.display = ''; }
  if (open && settingsOpen) { settingsOpen = false; $('settingsPanel').style.display = 'none'; }
  if (open && inventoryOpen) { inventoryOpen = false; $('inventoryPanel').style.display = 'none'; }
  boardOpen = open;
  $('board').style.display = open ? 'block' : 'none';
  if (open) {
    renderBoard();
    document.exitPointerLock();
    locked = false;
  } else {
    requestGameControl();
  }
}
$('closeBoard').addEventListener('click', () => toggleBoard(false));

// =====================================================================
// SETTINGS (controls / sound / graphics)
// =====================================================================
let cameraView = localStorage.getItem('cameraView') === 'first' ? 'first' : 'third';
let firstPersonVehicle = null;
function setCameraView(view) { cameraView = view === 'first' ? 'first' : 'third'; if(cameraView==='first'&&driving){yaw=driving.group.rotation.y+Math.PI;pitch=0;}if(cameraView==='third')pitch=clamp(pitch,-.1,1.2); localStorage.setItem('cameraView', cameraView); renderSettings(); updateCamera(0); }
let settingsOpen = false, settingsTab = 'controls';
function renderSettings() {
  document.querySelectorAll('#settingsPanel .tab').forEach(b => b.classList.toggle('active', b.dataset.stab === settingsTab));
  $('stabControls').style.display = settingsTab === 'controls' ? '' : 'none';
  $('stabSound').style.display = settingsTab === 'sound' ? '' : 'none';
  $('stabGraphics').style.display = settingsTab === 'graphics' ? '' : 'none';
  $('stabView').style.display = settingsTab === 'view' ? '' : 'none';
  document.querySelectorAll('[data-view]').forEach(b=>{const selected=b.dataset.view===cameraView;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
  document.querySelectorAll('#settingsPanel .opt[data-gfx]').forEach(b => b.classList.toggle('active', b.dataset.gfx === gfxQuality));
}
function toggleSettings(open) {
  if (freeMouse) { freeMouse = false; $('mouseHint').style.display = 'none'; $('crosshair').style.display = ''; }
  if (open && boardOpen) { boardOpen = false; $('board').style.display = 'none'; }
  settingsOpen = open;hosting.settingsVisible(open);
  $('settingsPanel').style.display = open ? 'block' : 'none';
  if (open) { mobileControls?.reset();for(const code in keys)keys[code]=false;renderSettings(); document.exitPointerLock(); locked = false; }
  // Settings can also be opened straight from the main menu (the "Too much lag?"
  // link) before a game has actually started — closing it there should just
  // reveal the menu again, not grab pointer lock like resuming gameplay would.
  else if (getComputedStyle($('menu')).display === 'none') requestGameControl();
}
document.querySelectorAll('#settingsPanel .tab').forEach(b => b.addEventListener('click', () => { settingsTab = b.dataset.stab; renderSettings(); }));
document.querySelectorAll('#settingsPanel .opt[data-gfx]').forEach(b => b.addEventListener('click', () => { manualGraphics=true;setGraphicsQuality(b.dataset.gfx); renderSettings(); }));
$('settingsBtn').addEventListener('click', () => toggleSettings(true));
$('menuLagSettings').addEventListener('click', () => { settingsTab = 'graphics'; toggleSettings(true); });
$('inventoryBtn').addEventListener('click', () => toggleInventory(true));
$('closeInventory').addEventListener('click', () => toggleInventory(false));
$('dropBagBtn').addEventListener('click', () => {
  if (!hasBag) { toast('You already dropped your bag.'); return; }
  hasBag = false; backpack.visible = false; inventory = [];
  toast('You dropped your bag. Its contents are gone.');
  renderInventory();
});
$('wearBagBtn').addEventListener('click', () => {
  if (hasBag) { toast('Already wearing your bag.'); return; }
  hasBag = true; backpack.visible = true;
  toast('You put the bag back on.');
  renderInventory();
});
$('closeSettings').addEventListener('click', () => toggleSettings(false));
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setCameraView(b.dataset.view)));
const savedVolume = localStorage.getItem('masterVolume');
if (savedVolume != null) { $('volumeSlider').value = savedVolume; $('volumeVal').textContent = savedVolume + '%'; }
$('volumeSlider').addEventListener('input', e => {
  $('volumeVal').textContent = e.target.value + '%';
  localStorage.setItem('masterVolume', e.target.value);
});

// =====================================================================
// CUSTOM LAYOUT: drag the HUD/hotbar (desktop) or joystick/buttons (mobile)
// anywhere on screen; positions persist in localStorage.
// =====================================================================
let layoutEditMode = false;
function dragIds(){return mobileControls?.mobile?['hud',...document.querySelectorAll('[data-mobile-control]')].map(el=>typeof el==='string'?el:el.id):['hud','hotbar','settingsBtn'];}
function layoutKey(){return mobileControls?.mobile?'phoneControlLayout-v2':'desktopControlLayout-v2';}
const loadLayout=()=>{try{return JSON.parse(localStorage.getItem(layoutKey())||'{}');}catch{return {};}};
function saveLayoutPos(id,left,top){const L=loadLayout(),el=document.getElementById(id),width=visualViewport?.width||innerWidth,height=visualViewport?.height||innerHeight;L[id]={left:left/Math.max(1,width-el.offsetWidth),top:top/Math.max(1,height-el.offsetHeight)};localStorage.setItem(layoutKey(),JSON.stringify(L));}
function reserveControlSpace(el){if(!['mobileTop','mobileActions','mobileSkills','mobileDirections','mobileGears'].includes(el.parentElement?.id)||document.querySelector('[data-placeholder="'+el.id+'"]'))return;const r=el.getBoundingClientRect(),css=getComputedStyle(el),space=document.createElement('span');space.dataset.placeholder=el.id;space.style.cssText='display:block;visibility:hidden;pointer-events:none;flex-shrink:0;width:'+r.width+'px;height:'+r.height+'px';space.style.gridArea=css.gridArea;el.before(space);}
function applyLayout(){const L=loadLayout(),width=visualViewport?.width||innerWidth,height=visualViewport?.height||innerHeight;for(const id of dragIds()){const el=document.getElementById(id),pos=L[id];if(el&&pos&&el.getClientRects().length){reserveControlSpace(el);el.style.position='fixed';el.style.left=clamp(pos.left,0,1)*Math.max(0,width-el.offsetWidth)+'px';el.style.top=clamp(pos.top,0,1)*Math.max(0,height-el.offsetHeight)+'px';el.style.right='auto';el.style.bottom='auto';el.style.transform='none';}}}
function makeDraggable(el){if(!el||el.dataset.dragBound)return;el.dataset.dragBound='1';let dragging=false,offX=0,offY=0;
 el.addEventListener('pointerdown',e=>{if(!layoutEditMode)return;e.preventDefault();e.stopImmediatePropagation();dragging=true;el.setPointerCapture(e.pointerId);const r=el.getBoundingClientRect();offX=e.clientX-r.left;offY=e.clientY-r.top;},true);
 el.addEventListener('pointermove',e=>{if(!dragging)return;e.preventDefault();e.stopImmediatePropagation();const width=visualViewport?.width||innerWidth,height=visualViewport?.height||innerHeight;reserveControlSpace(el);el.style.position='fixed';el.style.left=clamp(e.clientX-offX,0,width-el.offsetWidth)+'px';el.style.top=clamp(e.clientY-offY,0,height-el.offsetHeight)+'px';el.style.right='auto';el.style.bottom='auto';el.style.transform='none';},true);
 const end=e=>{if(!dragging)return;dragging=false;e.stopImmediatePropagation();const r=el.getBoundingClientRect();saveLayoutPos(el.id,r.left,r.top);};el.addEventListener('pointerup',end,true);el.addEventListener('pointercancel',end,true);
}
function setLayoutEditMode(on){layoutEditMode=on;mobileControls?.reset();for(const id of dragIds()){const el=document.getElementById(id);if(!el)continue;makeDraggable(el);el.style.pointerEvents=on?'auto':'';el.style.outline=on?'2px dashed #ffd166':'';el.style.cursor=on?'grab':'';}$('layoutEditBar').style.display=on?'flex':'none';mobileControls?.update();}
function resetLayout(){localStorage.removeItem(layoutKey());document.querySelectorAll('[data-placeholder]').forEach(el=>el.remove());for(const id of dragIds()){const el=document.getElementById(id);if(el)for(const prop of ['left','top','right','bottom','transform','position'])el.style[prop]='';}mobileControls?.update();toast('Control positions reset.');}
$('layoutEditBtn').addEventListener('click',()=>{settingsOpen=false;$('settingsPanel').style.display='none';if(mobileControls?.mobile){locked=false;}else{freeMouse=true;locked=false;document.exitPointerLock();}setLayoutEditMode(true);});
$('layoutResetBtn').addEventListener('click',resetLayout);
$('signOutBtn').addEventListener('click',()=>{if(confirm('Sign out?'))signOutAndReload();});
// There was no way to back out of a running game (offline/solo or hosted) to the
// main menu short of signing out entirely. Saves first, then reloads — boot()
// finds the existing session and goes straight to the menu, skipping sign-in.
$('leaveToMenuBtn').addEventListener('click',async()=>{if(soloMode)saveSolo();try{if(onlinePlayReady)await onlineAccount.save();}catch(e){toast(e.message);return;}location.reload();});
$('layoutDoneBtn').addEventListener('click',()=>{setLayoutEditMode(false);freeMouse=false;requestGameControl();});

// =====================================================================
// WAYPOINTS: the travel board sets a waypoint and an on-screen compass arrow
// instead of teleporting outright — you walk/drive there yourself.
// =====================================================================
let waypoint = null;
function setWaypoint(d) { waypoint = { x: d.x, z: d.z, name: d.name }; toast('Waypoint set: ' + d.name + ' — follow the arrow.'); }
function updateWaypoint() {
  const el = $('waypointArrow');
  if (!waypoint) { el.style.display = 'none'; return; }
  // player.position freezes at wherever it was when you got in a vehicle (or
  // mounted a horse) -- the vehicle/horse itself is what actually moves, so use
  // that position for distance/direction while driving/riding, or the waypoint
  // reads as stuck no matter how far you travel.
  const pos = inCar && driving ? driving.group.position : riding ? riding.g.position : player.position;
  const dx = waypoint.x - pos.x, dz = waypoint.z - pos.z, dist = Math.hypot(dx, dz);
  if (dist < 5) { toast("You've arrived at " + waypoint.name + '.'); waypoint = null; el.style.display = 'none'; return; }
  el.style.display = 'flex';
  const rel = angleDiff(yaw, Math.atan2(dx, dz));
  el.querySelector('.arrow').style.transform = `rotate(${rel}rad)`;
  $('waypointLabel').textContent = waypoint.name + ' · ' + Math.round(dist) + 'm';
}

// L toggles the mouse: locked = mouse turns the camera; free = normal cursor, game keeps running
let freeMouse = false;
function setFreeMouse(on) {
  freeMouse = on;
  $('mouseHint').style.display = on ? 'block' : 'none';
  $('crosshair').style.display = on ? 'none' : '';
  if (on) document.exitPointerLock();
  else renderer.domElement.requestPointerLock();
}

addEventListener('keydown', e => {
  if(e.target.closest?.('input,textarea,select,[contenteditable=true]'))return;
  if(e.code==='KeyP'&&!e.ctrlKey&&!e.metaKey){if(!e.repeat&&(locked||settingsOpen||hosting.open||$('start').style.display==='flex'))toggleSettings(!settingsOpen);e.preventDefault();return;}
  if(e.code==='KeyS'&&!e.ctrlKey&&!e.metaKey&&(controlPrefs.desktopMovement==='arrows'||e.shiftKey&&!inCar&&!navy?.rider)){if(!e.repeat&&(locked||settingsOpen||$('start').style.display==='flex'))toggleSettings(!settingsOpen);e.preventDefault();return;}
  const movement=movementKey(e.code,controlPrefs.desktopMovement);if(movement)keys[movement]=true;
  if(e.code.startsWith('Arrow'))e.preventDefault();
  if (locked && ['Space', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'KeyC' && (locked || boardOpen)) { toggleBoard(!boardOpen); return; }
  if (e.code === 'KeyL' && locked && !boardOpen) { setFreeMouse(!freeMouse); return; }
  if(e.code==='KeyM'&&(locked||worldMap?.open)){if(!worldMap?.open)worldMap?.show();e.preventDefault();return;}
  if (!locked) return;
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyQ'&&!(inCar&&driving.kind==='plane')) dash();
  if (e.code === 'KeyR'&&!(inCar&&driving.kind==='plane')) psychicGrip();
  if (e.code === 'KeyT') switchChar();
  if (e.code === 'KeyG') useUlt();
  if (e.code === 'KeyM') { worldMap?.show(); } // temporary test-only fast travel to the real-world map patch
  if (e.code === 'KeyI' && !settingsOpen && !boardOpen) toggleInventory(!inventoryOpen);
  if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) useSkill(Number(e.code.slice(5)) - 1);
  if (e.code === 'KeyN' && inCar && isRoadVehicle(driving)) { toast('Choose transmission in Settings before entering your next vehicle.'); }
  if (!transmissionAuto && inCar && isRoadVehicle(driving)) {
    if (e.code === 'KeyZ') { gear = Math.min(5, gear + 1); toast('Gear ' + gear); }
    if (e.code === 'KeyX') { gear = Math.max(1, gear - 1); toast('Gear ' + gear); }
  }
});
addEventListener('keyup', e => {const code=movementKey(e.code,controlPrefs.desktopMovement);if(code)keys[code]=false;});
// Switching windows/tabs never fires keyup for whatever was held, so a movement
// key can get stuck "down" forever. Clear all held keys the moment focus leaves.
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseHeld = false; });
addEventListener('mousemove', e => {
  if (!locked || cine || freeMouse) return;
  yaw -= e.movementX * 0.0025;
  pitch = clamp(pitch + e.movementY * 0.0025, cameraView === 'first' ? -1.4 : -.1, cameraView === 'first' ? 1.4 : 1.2);
});
addEventListener('mousedown', e => { if (locked && e.button === 0) { mouseHeld = true; m1(); } });
addEventListener('mouseup', e => { if (e.button === 0) mouseHeld = false; });
addEventListener('wheel', e => {
  // Only zoom the game camera while actually playing — scrolling over an open
  // board/panel (the stats board, the travel board, etc.) used to zoom the
  // camera behind it too, making it look like the view was randomly resizing.
  if (!locked || boardOpen || freeMouse || document.getElementById('placesTravel')?.hidden === false) return;
  camDist = clamp(camDist + Math.sign(e.deltaY), 3, 14);
});

const startEl = $('start');
// Was calling renderer.domElement.requestPointerLock() directly — iOS Safari has
// never implemented the Pointer Lock API at all, so that method doesn't exist
// there and calling it threw, leaving the "Click to play"/"Paused" overlay stuck
// on screen forever with no way to actually start or resume. requestGameControl()
// already has the correct mobile-safe branch (used everywhere else this needs
// to happen); the raw overlay just wasn't wired to it.
startEl.addEventListener('click', () => requestGameControl());
document.addEventListener('pointerlockchange', () => {
  if (mobileControls?.mobile) return;
  const pointerOn = document.pointerLockElement === renderer.domElement;
  if (pointerOn && freeMouse) { freeMouse = false; $('mouseHint').style.display = 'none'; $('crosshair').style.display = ''; }
  locked = pointerOn || freeMouse;    // with a free mouse the game keeps running
  if (locked && boardOpen) { boardOpen = false; $('board').style.display = 'none'; }
  if (!locked) mouseHeld = false;
  startEl.style.display = locked || (worldMap?.open||movieTv?.open||npcConversations?.open||adventureServices?.open||supportSkills?.open||cityServices?.open)||roomChat.open || boardOpen || settingsOpen || layoutEditMode || inventoryOpen ? 'none' : 'flex';
  if (!locked) startEl.querySelector('p').textContent = 'Paused. Click to resume';
});
// If pointer lock is blocked, play without it (mouse movement still turns the camera).
document.addEventListener('pointerlockerror', () => {
  locked = true;
  boardOpen = false;
  $('board').style.display = 'none';
  startEl.style.display = 'none';
});

// =====================================================================
// UPDATE
// =====================================================================
const DAY_LEN = 300; // seconds per in-game day
let reconstructionDays = 0;
let dayTime = 0.1;   // 0 = sunrise, 0.25 = noon, 0.5 = sunset
// Weather: cycles clear/rain on its own timer, independent of day/night.
let weatherState = 'clear', weatherT = 90 + rand() * 120;
$('weatherBadge').textContent = '☀️ Clear';
const WEATHER_CYCLE = ['clear', 'rain', 'clear', 'snow'];
const WEATHER_LABEL = { clear: '☀️ Clear', rain: '🌧️ Raining', snow: '❄️ Snowing' };
function updateWeather(dt) {
  weatherT -= dt;
  if (weatherT <= 0) {
    const next = WEATHER_CYCLE[(WEATHER_CYCLE.indexOf(weatherState) + 1) % WEATHER_CYCLE.length];
    weatherState = next;
    weatherT = next === 'clear' ? 90 + rand() * 120 : next === 'snow' ? 50 + rand() * 40 : 45 + rand() * 45;
    toast(next === 'clear' ? 'The weather has cleared up.' : next === 'snow' ? 'Snow is starting to fall.' : 'Rain is moving in.');
    $('weatherBadge').textContent = WEATHER_LABEL[weatherState];
    if (weatherState === 'snow') toast('Roads are icy — cars handle looser, and trams/buses have paused service.');
  }
  // Trams/buses/trains pause during snow rather than sliding around on ice --
  // forcing a perpetual "doors open, waiting" state is the only hook available
  // from here without reaching into transport.js's own update loop.
  if (weatherState === 'snow') for (const s of transport?.services ?? []) { s.doors = true; s.wait = 2; }
  if ((weatherState === 'rain' || weatherState === 'snow') && !spaceCentre?.inSpace && !metro?.underground && !sewers?.underground && Math.random() < 0.9) {
    for (let i = 0; i < (touchDevice ? 2 : 6); i++) {   // fewer weather particles on phones
      const a = rand() * Math.PI * 2, r = rand() * 16;
      const x = player.position.x + Math.cos(a) * r, z = player.position.z + Math.sin(a) * r;
      if (weatherState === 'snow') spawnParticle(new THREE.Vector3(x, player.position.y + 9, z), new THREE.Vector3((Math.random() - 0.5), -2.5, (Math.random() - 0.5)), 0xffffff, 0.07, 1.6, -2.5);
      else spawnParticle(new THREE.Vector3(x, player.position.y + 9, z), new THREE.Vector3(0, -14, 0), 0x9fc3e0, 0.05, 0.7, -14);
    }
  }
}

// Firefighters respond to active fires (buildings/vehicles burning) instead of
// just standing by the station forever — they walk over, work it for a bit,
// then actually put it out early and head back.
// Touching fire burns you unless you're the Fire character (immune to your
// own element, same as real-world logic for everyone else).
let fireBurnWarned = false;
function updateFireDamage(dt) {
  if (charIdx === 0 || inCar) { fireBurnWarned = false; return; }
  const nearFire = activeFires.some(f => distXZ(f.pos, player.position) < 2.2);
  if (nearFire) {
    stats.hp -= 12 * dt * defMul();
    if (!fireBurnWarned) { fireBurnWarned = true; toast("You're burning! Get away from the fire."); }
  } else fireBurnWarned = false;
}
function updateFirefighters(dt) {
  for (const f of firefighters) {
    const p = f.h.root.position;
    if (f.state === 'idle') {
      const target = activeFires.find(fire => !fire.claimed);
      if (target) { target.claimed = true; f.fire = target; f.state = 'responding'; }
    } else if (f.state === 'responding') {
      if (!activeFires.includes(f.fire)) { f.state = 'idle'; f.fire = null; continue; }   // fire burned out on its own
      const dir = new THREE.Vector3(f.fire.pos.x - p.x, 0, f.fire.pos.z - p.z);
      if (dir.length() < 1.5) { f.state = 'working'; f.waitT = 5; }
      else { dir.normalize(); p.addScaledVector(dir, 2.5 * dt); f.h.root.rotation.y = Math.atan2(dir.x, dir.z); animateHumanoid(f.h, null, true, false, true, dt); }
    } else if (f.state === 'working') {
      f.waitT -= dt;
      if (f.waitT <= 0) {
        if (activeFires.includes(f.fire)) f.fire.task.t = f.fire.task.dur;   // force the fire's task to end now
        f.state = 'returning';
      }
    } else if (f.state === 'returning') {
      const dir = new THREE.Vector3(f.home.x - p.x, 0, f.home.z - p.z);
      if (dir.length() < 0.5) { f.state = 'idle'; f.fire = null; f.h.root.rotation.y = Math.PI; }
      else { dir.normalize(); p.addScaledVector(dir, 2.5 * dt); f.h.root.rotation.y = Math.atan2(dir.x, dir.z); animateHumanoid(f.h, null, true, false, true, dt); }
    }
    p.y = groundY(p.x, p.z);
  }
}
let swimming = false, waterExhausted = false;
function isSeaWater(x,z,bodyY = null) {
  if(navy?.groundAt(x,z)!=null)return false;
  if(regionalEnvironment?.groundAt(x,z)!=null)return false;
  if(harbourBridge&&harbourBridge.groundAt(x,z,bodyY ?? (inCar&&driving?driving.group.position.y:player.position.y))!=null)return false;
  if (waterZones.some(w=>Math.hypot(x-w.x,z-w.z)<w.r)) return true;
  if (x > BRIDGE_X - BRIDGE_HALF_W && x < BRIDGE_X + BRIDGE_HALF_W) return z>=GAP0&&z<=GAP1&&liftBridgeSurface(z,bridgeLiftAngle,BRIDGE_Y,GAP0,GAP1).height==null;
  if (x >= RIVERSIDE_X0 && x <= RIVERSIDE_X1 && z >= RIVERSIDE_Z0) return false;
  if (x >= CAPITAL_X0 && x <= CAPITAL_X1 && z >= CAPITAL_Z0) return false;
  if (Math.hypot(x - ISLAND.x, z - ISLAND.z) < ISLAND_R) return false;
  return x>=-300&&x<=300&&z>SEA_Z&&z<900&&!(x>18&&x<22&&z<206)&&harbour?.groundAt(x,z)==null;
}
function updateSwimming(dt) {
  if (!swimming) { swimming=true; action?.end?.(action); action=null; sitting=false; activeSitSpot=null; toast('Swimming: move toward shore to get out. Run uses more stamina.'); }
  playerBlocking=false;mouseHeld=false;onGround=false;
  const dir=inputDir(),moving=dir.lengthSq()>0,sprint=keys.ShiftLeft&&stats.energy>0;
  const waterPower=charIdx===2;
  player.position.addScaledVector(dir,(stats.energy<=0?1: sprint?4:2.3)*(waterPower?1.3:1)*dt);
  player.position.addScaledVector(pvel,dt);pvel.multiplyScalar(Math.max(0,1-4*dt));collide(player.position,.4);
  stats.energy=Math.max(0,stats.energy-dt*(waterPower ? .12 : sprint ? 1.8 : moving ? .65 : .2));
  if(stats.energy===0){stats.hp=Math.max(0,stats.hp-12*dt);if(!waterExhausted){waterExhausted=true;toast('Exhausted in the water! Get to shore or a dock ladder.');}}
  else waterExhausted=false;
  const targetY=stats.energy>0?-1.05:-1.35;player.position.y=lerp(player.position.y,targetY,1-Math.exp(-4*dt));vy=0;
  if(moving)player.rotation.y=lerpAngle(player.rotation.y,Math.atan2(dir.x,dir.z),1-Math.exp(-5*dt));
  animateHumanoid(P,null,moving,false,false,dt);P.rig.rotation.x=-.6;
  if(!isSeaWater(player.position.x,player.position.z)){swimming=false;waterExhausted=false;P.rig.rotation.x=0;player.position.y=groundY(player.position.x,player.position.z);onGround=true;toast('Back on dry ground.');}
}
function updatePlayer(dt) {
 if(adventureServices?.parachuting){const p=player.position;const input=locked?inputDir():new THREE.Vector3();p.addScaledVector(input,5*dt);p.addScaledVector(pvel,dt);pvel.multiplyScalar(Math.max(0,1-dt*2));p.y-=3.8*dt;const floor=groundY(p.x,p.z,p.y);if(p.y-floor<3)collide(p,.4);if(p.y<=floor+.2){p.y=floor;vy=0;onGround=true;adventureServices.land();}animateHumanoid(P,'fall',false,false,false,dt);return;}

  if(navy?.rider||intercityRail?.rider){animateHumanoid(P,'sit',false,false,true,dt);return;}
  if(cityServices?.rider){animateHumanoid(P,'sit',false,false,true,dt);return;}
  if(spaceCentre?.rider){animateHumanoid(P,'sit',false,false,true,dt);return;}
  if(metro?.rider){animateHumanoid(P,'sit',false,false,true,dt);return;}
  if(transport?.rider){animateHumanoid(P,'sit',false,false,true,dt);return;}
  if (isSeaWater(player.position.x,player.position.z) && player.position.y < .2) return updateSwimming(dt);
  if (swimming) { swimming=false; waterExhausted=false; P.rig.rotation.x=0; }
  if (sitting) { animateHumanoid(P, 'sit', false, false, true, dt); return; } // frozen in the chair until E is pressed again, but still visibly seated
  playerStun = Math.max(0, playerStun - dt);
  iFrames = Math.max(0, iFrames - dt);
  m1Cd = Math.max(0, m1Cd - dt);
  if (mouseHeld) m1();

  const dir = inputDir();
  const moving = dir.lengthSq() > 0;
  playerBlocking = !!keys.KeyF && !action && playerStun <= 0;
  const canMove = !action && playerStun <= 0;
  const sprinting = canMove && moving && keys.ShiftLeft && stats.energy > 0 && !playerBlocking;
  if (canMove && moving) {
    player.position.addScaledVector(dir, (sprinting ? 9 : 5) * (sewers?.movementScale(player.position) ?? 1) * (metro?.movementScale(player.position)??1) * speedMul() * (playerBlocking ? 0.35 : 1) * dt);
    if (!playerBlocking) player.rotation.y = lerpAngle(player.rotation.y, Math.atan2(dir.x, dir.z), 1 - Math.exp(-12 * dt));
  }
  if (sprinting) stats.energy -= 3 * drainMul() * dt;
  if (canMove && keys.Space && onGround) { vy = characters[charIdx].jump; onGround = false; }

  if (action) {
    action.t += dt;
    action.update?.(dt, action.t, action);
    if (action && (action.t >= action.dur || action.done)) { const a = action; action = null; a.end?.(a); }
  }

  player.position.x += pvel.x * dt;
  player.position.z += pvel.z * dt;
  pvel.multiplyScalar(Math.max(0, 1 - 6 * dt));
  if (!action?.noGravity) vy -= 25 * dt;
  player.position.y += vy * dt;
  collide(player.position, 0.4);
  const floorY = groundY(player.position.x, player.position.z);
  if (player.position.y <= floorY) {
    // Fall damage: only kicks in past a safe landing speed (roughly a two-storey
    // drop), so normal jumps/stairs/ledges never hurt — just real falls.
    if (!onGround && vy < -14 && iFrames <= 0 && !isSeaWater(player.position.x, player.position.z)) {
      const fallDmg = Math.round((-vy - 14) * 2.2) * defMul();
      if (fallDmg > 0) {
        stats.hp -= fallDmg;
        popText(at(player.position, 2.2), Math.round(fallDmg), 'taken');
        $('hurt').style.opacity = 1; setTimeout(() => $('hurt').style.opacity = 0, 150);
        shake = Math.max(shake, Math.min(0.5, fallDmg / 60));
        playerStun = Math.max(playerStun, 0.3);
      }
    }
    player.position.y = floorY; vy = 0; onGround = true;
  }
  else if (player.position.y - floorY > 0.2) onGround = false;

  const pose = action?.pose ?? (playerBlocking ? 'block' : playerStun > 0 ? 'stunned' : null);
  animateHumanoid(P, pose === 'slash' ? 'punchR' : pose, moving && canMove, sprinting, onGround, dt);
  if (pose === 'slash') P.armR.pivot.rotation.x = lerp(-2.8, -0.4, clamp(action.t / 0.18, 0, 1));
  P.rig.rotation.x = lerp(P.rig.rotation.x, playerStun > 0 ? -0.3 : 0, 1 - Math.exp(-15 * dt));

  if (awaken > 0) {   // flaming aura while awakened
    awaken -= dt;
    spawnParticle(at(player.position, Math.random() * 1.8).add(randUnit().multiplyScalar(0.5)), new THREE.Vector3(0, 2.5, 0), pick(FIRE), 0.12, 0.5);
  }
}

const busDoor = v => v.group.localToWorld(new THREE.Vector3(2.0, 0, v.length / 2 - 1.5)).setY(CURB);

// A vehicle you are driving, or one that is parked
const isRoadVehicle = v => ['car', 'police', 'bus'].includes(v.kind);
function vehicleVelocity(v) { return v.slideVelocity||{ x: Math.sin(v.group.rotation.y) * v.speed, z: Math.cos(v.group.rotation.y) * v.speed }; }
function damageVehicle(v, deltaSpeed, point) {
  if(deltaSpeed>3&&point.distanceTo(player.position)<60)worldAudio?.impact(deltaSpeed);
  if (!isRoadVehicle(v)) return;
  const damage = impactDamage(deltaSpeed);
  if (damage <= 0) return;
  v.health = Math.max(0, (v.health ?? 100) - damage);
  v.crashCooldown = 0.3;applyVehicleCondition(v);
  if (deltaSpeed > 5) burst(at(point, 0.7), Math.min(25, Math.ceil(deltaSpeed)), [0xffc266, 0x777777], 5, 0.08, 0.3, 8, 1);
  if (deltaSpeed > 8) breakLampsNear(point, 1.5);   // ram a lamp post hard enough and it goes down
  if (v === driving) {
    stats.hp = Math.max(0, stats.hp - impactDamage(deltaSpeed, 0.12));
    shake = Math.max(shake, Math.min(0.8, deltaSpeed / 35));
    toast('Crash! Vehicle condition: ' + Math.ceil(v.health) + '%');
  }
  if (v.health === 0) {
    v.disabled = true; v.speed = 0;
    if (v === driving) { exitVehicle(true); toast('Your vehicle is wrecked.'); }
    if (v.passengers?.length) {
      for (const e of v.passengers) { e.hidden = false; e.root.visible = true; e.root.position.copy(v.group.position); collide(e.root.position, e.radius); e.ped.state = 'panic'; e.ped.panicT = 8; }
      v.passengers = [];
    }
    // A wrecked-by-collision car used to just sit there inert forever. Give it
    // the same charred/burning/towed treatment as an explosion, minus the blast.
    if (!v.exploded) {
      v.exploded = true;
      v.group.traverse(obj => {
        if (!obj.isMesh) return;
        const darken = material => { const m = material.clone(); m.color?.set(0x292727); m.emissive?.set(0); return m; };
        obj.material = Array.isArray(obj.material) ? obj.material.map(darken) : darken(obj.material);
      });
      scorchMark(v.group.position, (v.radius ?? 2) * 2);
      burnFor(at(v.group.position, 0.8), 30, 1.2);
      setTimeout(() => dispatchTowTruck(v), 20000);
    }
  }
}
function hitStreetLamps(v,from,to){if(Math.abs(v.speed)<3)return;for(let i=0;i<lampSpots.length;i++){const p=lampSpots[i];if(lampBroken[i]||Math.abs(p.y-v.group.position.y)>2||p.x<Math.min(from.x,to.x)-v.radius-1||p.x>Math.max(from.x,to.x)+v.radius+1||p.z<Math.min(from.z,to.z)-v.radius-1||p.z>Math.max(from.z,to.z)+v.radius+1)continue;if(segmentDistance(p,from,to)<v.radius+.2){breakLamp(i);v.speed*=.8;if(!v.crashCooldown)damageVehicle(v,Math.min(9,Math.abs(v.speed)*.2),p);}}}
function hitStreetSeats(v, from, to) {
  const speed = Math.abs(v.speed);
  if (speed < 1) return;
  for (const seat of streetSeats) {
    if (seat.broken || Math.abs(v.group.position.y - seat.model.position.y) > 2) continue;
    if (segmentDistance(seat.model.position, from, to) > v.radius + .9) continue;
    const now = performance.now();
    if (now - (seat.impactTimes.get(v) ?? -Infinity) < 1000) continue;
    seat.impactTimes.set(v, now);
    seat.health = Math.max(0, seat.health - impactDamage(speed, .6));
    if (seat.health > 0) continue;
    seat.broken = true;
    const i = colliders.indexOf(seat.collider); if (i >= 0) colliders.splice(i, 1);
    if (sitting && activeSitSpot === seat) { toggleSit(null); hurtPlayer(Math.min(80, impactDamage(speed, .4)), v.group.position, Math.min(15, speed)); }
    const parts = [...seat.model.children];
    parts.forEach((part, i) => { part.position.y = .08 + i * .015; part.position.x += (i % 2 ? 1 : -1) * .25; part.position.z += (i - 1.5) * .22; part.rotation.set(i % 2 ? Math.PI / 2 : .12, i * .35, .1); });
    v.speed *= .85;
    damageVehicle(v, speed * .15, seat.model.position);
    burst(at(seat.model.position, .4), 10, [0x8d7254, 0x554532], 5, .1, .5, 10, 1);
    if (v === driving) { raiseWanted(30); toast('Street bench broken by the impact.'); }
  }
}
function resolveRoadMovement(v, start, dt) {
  if (!isRoadVehicle(v)||v.bridgeFlight) return;
  const p = v.group.position, destination = p.clone();
  const steps = Math.max(1, Math.ceil(start.distanceTo(destination) / 0.3));
  const velocity = vehicleVelocity(v);
  p.copy(start);
  for (let i = 1; i <= steps; i++) {
    const previous = p.clone();
    p.lerpVectors(start, destination, i / steps);
    hitStreetSeats(v, previous, p);
    const attempted = p.clone();
    if (collide(p, v.radius)) {
      const normal = p.clone().sub(attempted).setY(0).normalize();
      const normalSpeed = Math.max(0, -(velocity.x * normal.x + velocity.z * normal.z));
      if (normalSpeed > 0) {
        if(v.slideVelocity){v.slideVelocity.x+=normal.x*normalSpeed;v.slideVelocity.z+=normal.z*normalSpeed;}
        if (!v.crashCooldown) damageVehicle(v, normalSpeed * 1.08, p);
        const tangent = { x: velocity.x + normal.x * normalSpeed, z: velocity.z + normal.z * normalSpeed };
        const h = v.group.rotation.y;
        v.speed = (tangent.x * Math.sin(h) + tangent.z * Math.cos(h)) - Math.sign(v.speed) * normalSpeed * 0.08;
      }
      break;
    }
  }
  hitStreetLamps(v,start,p);
  const speed = Math.hypot(velocity.x, velocity.z);
  for (const e of enemies) {
    if (!e.alive || e.hidden || e.carCd > 0 || speed < 2 || Math.abs(e.root.position.y - p.y) > 2) continue;
    if (segmentDistance(e.root.position, start, p) > v.radius * 0.65 + e.radius) continue;
    const relativeSpeed = Math.hypot(velocity.x - e.vel.x, velocity.z - e.vel.z);
    e.carCd = 1.2;
    applyHit(e, { dmg: impactDamage(relativeSpeed, 0.65), from: e.root.position.clone().sub(new THREE.Vector3(velocity.x, 0, velocity.z)), kb: Math.min(22, relativeSpeed * 0.8), up: Math.min(6, relativeSpeed * 0.2), stun: Math.min(3, relativeSpeed * 0.12), heavy: true, impact: 0.4, police: v !== driving, fromPlayer: v === driving });
    v.speed *= 0.92;
    if (v === driving && e.kind === 'npc') raiseWanted(60);
  }
  for (const other of vehicles) {
    if (other === v || !isRoadVehicle(other) || other.bridgeFlight || Math.abs(other.group.position.y-p.y)>2) continue;
    const min = (v.radius + other.radius) * 0.75;
    if (segmentDistance(other.group.position, start, p) >= min) continue;
    let normal = (p.distanceTo(other.group.position) < min ? p : start).clone().sub(other.group.position).setY(0);
    if (normal.lengthSq() < 0.001) normal = start.clone().sub(other.group.position).setY(0);
    if (normal.lengthSq() < 0.001) normal.set(1, 0, 0);
    normal.normalize();
    const av = vehicleVelocity(v), bv = vehicleVelocity(other);
    const hit = collisionImpulse(av, bv, normal, v.kind === 'bus' ? 12000 : 1500, other.kind === 'bus' ? 12000 : 1500);
    p.copy(other.group.position).addScaledVector(normal, min + 0.01);
    if (hit.impulse > 0) {
      v.speed += hit.aDelta * (normal.x * Math.sin(v.group.rotation.y) + normal.z * Math.cos(v.group.rotation.y));
      other.speed -= hit.bDelta * (normal.x * Math.sin(other.group.rotation.y) + normal.z * Math.cos(other.group.rotation.y));
      if(v.slideVelocity){v.slideVelocity.x+=normal.x*hit.aDelta;v.slideVelocity.z+=normal.z*hit.aDelta;}
      if(other.slideVelocity){other.slideVelocity.x-=normal.x*hit.bDelta;other.slideVelocity.z-=normal.z*hit.bDelta;}
      if (!v.crashCooldown) damageVehicle(v, hit.aDelta, p);
      if (!other.crashCooldown) damageVehicle(other, hit.bDelta, other.group.position);
      if (other.ai) other.ai.stopTimer = 2;
    }
  }
}
function resolveRailCollision(v,start){
 if(!isRoadVehicle(v)||v.bridgeFlight||!transport)return;
 for(const rail of transport.services){
 const p=v.group.position,r=rail.g.position,half=rail.name==='Train'?16:9;
 if(Math.abs(p.y-r.y)>2)continue;
 const steps=Math.max(1,Math.ceil(start.distanceTo(p)/.3));
 for(let i=0;i<=steps;i++){
 const q=start.clone().lerp(p,i/steps),dx=q.x-r.x,dz=q.z-r.z;
 if(Math.abs(dx)>half+v.radius||Math.abs(dz)>1.5+v.radius)continue;
 const side=Math.sign(dz)||Math.sign(start.z-r.z)||1;
 const vel=vehicleVelocity(v),relative=Math.hypot(vel.x-(rail.velocityX||0),vel.z);
 p.copy(q);p.z=r.z+side*(1.5+v.radius+.05);
 if(!v.crashCooldown)damageVehicle(v,relative,p);
 v.speed=0;if(v.ai)v.ai.stopTimer=3;if(v.kind!=='police'){rail.collisionStop=3;rail.speed=0;}return;
 }
 }
}
// Manual/automatic transmission: in manual, top speed is capped by the current
// gear until you shift up (Z) or down (X); N toggles between the two.
const GEAR_RATIOS = [0.22, 0.42, 0.62, 0.82, 1.0];
let transmissionAuto = controlPrefs.drivingMode==='automatic', gear = 1;
function shiftGear(direction){if(inCar&&!transmissionAuto&&isRoadVehicle(driving)){gear=clamp(gear+direction,1,5);toast('Gear '+gear);}}
function updateBridgeFlight(v,dt){const f=v.bridgeFlight,previousY=f.y;advanceBridgeJump(f,dt);v.group.position.set(f.x,f.y,f.z);v.group.rotation.x=-Math.atan2(f.vy,Math.hypot(f.vx,f.vz))*Math.sign(v.speed||1);
 const onBridge=Math.abs(f.x-BRIDGE_X)<BRIDGE_HALF_W&&f.z>BRIDGE_Z0&&f.z<BRIDGE_Z1;
 const surface=onBridge?liftBridgeSurface(f.z,bridgeLiftAngle,BRIDGE_Y,GAP0,GAP1):null;
 const floor=surface?.height??(onBridge?-2:groundY(f.x,f.z,f.y));
 if(floor>-.5&&f.y<=floor&&f.vy<=0){const impact=Math.max(0,-(f.vy-f.vz*(surface?.slope||0))/Math.hypot(1,surface?.slope||0));v.group.position.y=floor;v.bridgeFlight=null;v.group.rotation.x=0;damageVehicle(v,impact,v.group.position);if(v===driving)toast('Landed: impact '+impact.toFixed(1)+' m/s.');}
 else if(surface?.height!=null&&f.y<surface.height-.8&&previousY<surface.height&&f.z>=GAP0&&f.z<=GAP1){damageVehicle(v,Math.hypot(f.vx,f.vz),v.group.position);f.vx*=.3;f.vz*=.3;}
 if(f.y<-.4){v.bridgeFlight=null;v.disabled=true;v.health=0;v.speed=0;v.group.rotation.x=0;if(v===driving){exitVehicle(true);toast('The jump did not clear the bridge. Swim to shore.');}}
}
function driveVehicle(v, dt) {
  const roadStartPosition=v.group.position.clone();
  const roadStartZ=v.group.position.z;
  if(v.bridgeFlight){updateBridgeFlight(v,dt);return;}
  if(isRoadVehicle(v)&&isSeaWater(v.group.position.x,v.group.position.z,v.group.position.y)){v.disabled=true;v.health=0;v.speed=0;if(v===driving){exitVehicle(true);toast('Vehicle submerged. Swim to shore.');}return;}
  if (v.kind === 'plane') return flyPlane(v, dt);
  const mine = v === driving;
  const icy = isRoadVehicle(v) && weatherState === 'snow';   // less grip: slower to slow down, looser steering — cars can slide
  if (mine) {
    if (keys.KeyW) v.speed += (v.kind === 'bus' ? 9 : 18)*conditionFactors(v.health).power * dt;
    if (keys.KeyS) v.speed -= 24 * dt;
    const steer = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0);
    v.group.rotation.y += steer * (v.kind === 'bus' ? 1.1 : 1.8) * (icy ? 0.5 : 1) *conditionFactors(v.health).steering* dt * Math.min(1, Math.abs(v.speed) / 8) * Math.sign(v.speed);
  }
  v.speed *= Math.max(0, 1 - (mine && (keys.KeyW || keys.KeyS) ? 0.3 : 1.5) * (icy ? 0.3 : 1) * dt);
  const condition=conditionFactors(v.health);if(mine&&isRoadVehicle(v))v.group.rotation.y+=condition.drift*Math.sin(performance.now()*.002)*dt*Math.min(1,Math.abs(v.speed)/8);
  const topSpeed = mine && !transmissionAuto && isRoadVehicle(v) ? v.maxSpeed * GEAR_RATIOS[gear - 1] : v.maxSpeed;
  v.speed = clamp(v.speed, -8, topSpeed*(isRoadVehicle(v)?condition.topSpeed:1));
  const h = v.group.rotation.y, p = v.group.position;
  const drifting=mine&&!transmissionAuto&&isRoadVehicle(v)&&keys.Space&&Math.abs(v.speed)>8;
  v.slideVelocity=driftVelocity(v.slideVelocity,h,v.speed,drifting,dt);
  p.x+=v.slideVelocity.x*dt;p.z+=v.slideVelocity.z*dt;
  if(drifting){v.speed*=Math.exp(-.45*dt);if(Math.random()<.15)spawnParticle(at(p,.15),new THREE.Vector3(0,.3,0),0xa4a8aa,.3,.5,0);}
  if (v.kind === 'boat') {   // stays on the water and bobs on the waves
    const nx = clamp(p.x, -290, 290), nz = clamp(p.z, SEA_Z + 2, 890);
    if (nx !== p.x || nz !== p.z) v.speed *= -0.3;
    p.x = nx; p.z = nz;
    if(!shipCanAdvance({x:roadStartPosition.x,z:roadStartPosition.z,length:5},p.x,BRIDGE_X,GAP0,GAP1,bridgeLiftAngle)||!waterFootprint(p.x,p.z,h,5,2.2,navigableSea)){p.copy(roadStartPosition);v.speed=0;}
    p.y = 0.05 + Math.sin(performance.now() / 400) * 0.08;
    v.group.rotation.x = -Math.min(0.15, Math.abs(v.speed) * 0.006);
    if (mine && Math.abs(v.speed) > 4) spawnParticle(p.clone().add(new THREE.Vector3(-Math.sin(h) * 2.8, 0.2, -Math.cos(h) * 2.8)), randUnit().multiplyScalar(1.5).setY(1.5), 0xffffff, 0.2, 0.6, 4);
    return;
  }
  const previousZ=roadStartZ;
  if(Math.abs(p.x-BRIDGE_X)<BRIDGE_HALF_W&&bridgeLiftAngle>.08){
    const surface=liftBridgeSurface(previousZ,bridgeLiftAngle,BRIDGE_Y,GAP0,GAP1);
    const forward=Math.cos(h)*v.speed;
    const edge=forward>0?surface.edgeNorth:surface.edgeSouth;
    if(edge!=null&&((forward>0&&previousZ<=edge&&p.z>edge)||(forward<0&&previousZ>=edge&&p.z<edge))){
      const launch=liftBridgeSurface(edge+(forward>0?-.0001:.0001),bridgeLiftAngle,BRIDGE_Y,GAP0,GAP1);
      p.z=edge;p.y=launch.height;v.bridgeFlight=launchBridgeJump(v.speed,bridgeLiftAngle,h,p.x,p.y,p.z);v.previousBridgeZ=p.z;updateBridgeFlight(v,dt);return;
    }
    const current=liftBridgeSurface(p.z,bridgeLiftAngle,BRIDGE_Y,GAP0,GAP1);
    if(current.height!=null&&current.side){v.speed-=Math.sign(v.speed)*VEHICLE_GRAVITY*Math.sin(bridgeLiftAngle)*Math.sign(forward*current.slope)*dt;v.group.rotation.x=-Math.atan(current.slope)*Math.sign(Math.cos(h)||1);}
  }else v.group.rotation.x=0;
  p.y=lerp(p.y,groundY(p.x,p.z,p.y),1-Math.exp(-20*dt));v.previousBridgeZ=p.z;
  for (const w of v.wheels) w.rotation.x += v.speed * dt / 0.4;
}

// Is something in front of this traffic vehicle (another car, you, a pedestrian crossing)?
function trafficBlocked(v, pos, dir, left) {
  const look = 6 + v.length / 2 + v.speed * 0.4;
  const test = o => {
    const rx = o.x - pos.x, rz = o.z - pos.z;
    const ahead = rx * dir.x + rz * dir.z, lat = Math.abs(rx * left.x + rz * left.z);
    return ahead > 0.5 && ahead < look && lat < 1.8;
  };
  for (const o of vehicles) if (o !== v && test(o.group.position)) return true;
  if (!inCar && test(player.position)) return true;
  for (const e of peds) if (e.alive && !e.hidden && test(e.root.position)) return true;
  return false;
}

function trafficDrive(v, dt) {
  const ai = v.ai;
  let f = laneFrame(ai);
  let desired = ai.cruise*conditionFactors(v.health).topSpeed;
  ai.ignoreT -= dt;
  if (ai.stopTimer > 0) { ai.stopTimer -= dt; desired = 0; }
  else if (ai.ignoreT <= 0 && trafficBlocked(v, v.group.position, f.dir, f.left)) {
    desired = 0;
    ai.blockedT += dt;
    if (ai.blockedT > 4) { ai.ignoreT = 1.5; ai.blockedT = 0; }   // avoid gridlock at junctions
  } else ai.blockedT = 0;
  v.speed = lerp(v.speed, desired, 1 - Math.exp(-(desired < v.speed ? 5 : 1.2) * dt));
  ai.s += v.speed * dt;

  if (v.kind === 'bus' && !ai.stopped && BUS_STOP_SEGS.includes(ai.routeIdx) && ai.s >= 20) {
    ai.stopped = true;
    ai.stopTimer = 5;
    busArrive(v, busStops.find(b => b.seg === ai.routeIdx));
  }
  if (ai.s >= 40) {   // reached the junction: pick where to go next
    ai.s -= 40;
    ai.prev = ai.from; ai.from = ai.to; ai.stopped = false;
    if (ai.route) { ai.routeIdx = (ai.routeIdx + 1) % ai.route.length; ai.to = ai.route[(ai.routeIdx + 1) % ai.route.length]; }
    else ai.to = nextNode(ai.from, ai.prev);
    f = laneFrame(ai);
  } else f = laneFrame(ai);

  const p = v.group.position, k = 1 - Math.exp(-6 * dt);   // smoothing makes the turns look natural
  p.x = lerp(p.x, f.pos.x, k);
  p.z = lerp(p.z, f.pos.z, k);
  p.y = groundY(p.x,p.z,p.y);
  v.group.rotation.y = lerpAngle(v.group.rotation.y, Math.atan2(f.dir.x, f.dir.z), 1 - Math.exp(-5 * dt));
  for (const w of v.wheels) w.rotation.x += v.speed * dt / 0.4;
}

function policeCanSee(v, target) {
  if (distXZ(v.group.position, target) > 70) return false;
  const from = v.group.position;
  for (const c of colliders) {
    let enter = 0, exit = 1;
    for (const [axis, low, high] of [['x', c.minX, c.maxX], ['z', c.minZ, c.maxZ]]) {
      const direction = target[axis] - from[axis];
      if (Math.abs(direction) < 1e-8) { if (from[axis] < low || from[axis] > high) { enter = 2; break; } }
      else { const a = (low - from[axis]) / direction, b = (high - from[axis]) / direction; enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b)); }
    }
    if (enter <= exit && exit > 0.001 && enter < 0.999) return false;
  }
  return true;
}
function requestPoliceBackup() {
  if (pursuitBackupCooldown > 0) return;
  const target = inCar && driving ? driving.group.position : player.position;
  const nearby = vehicles.filter(v => v.kind === 'police' && v.ai && !v.disabled && distXZ(v.group.position, target) < 140);
  if (nearby.length >= 3) return;
  // Limit the total fleet instead of spawning endlessly during long pursuits.
  if (vehicles.filter(v => v.kind === 'police').length >= 6) return;
  const unit = spawnTraffic('police', 0xf5f6fa);
  if (target.x > 1000 || distXZ(unit.group.position, target) > 140) {
    unit.group.position.copy(target).add(new THREE.Vector3(60, 0, 35));
    collide(unit.group.position, unit.radius); unit.group.position.y = groundY(unit.group.position.x, unit.group.position.z);
  }
  unit.ai.chasing = true; pursuitBackupCooldown = 15;
}
function updatePursuit(dt) {
  if(wanted>0&&transitArrestTarget(transport))wanted=Math.max(wanted,30);
  pursuitBackupCooldown = Math.max(0, pursuitBackupCooldown - dt);
  if (wanted <= 0) return;
  const target = inCar && driving ? driving.group.position : player.position;
  const seen = !dungeon && !inCivicInterior && !sewers?.underground && !metro?.underground && vehicles.some(v => v.kind === 'police' && v.ai && !v.disabled && policeCanSee(v, target));
  if (seen) { policeLastSeen.copy(target); wanted = Math.max(wanted, 30); }
  else wanted = Math.max(0, wanted - dt);
  if (!dungeon && !inCivicInterior && !sewers?.underground && !metro?.underground) requestPoliceBackup();
}
// Police catching you on foot is an arrest, not a kill: they're after cuffing
// you, not your health bar. Clears the pursuit, costs you a fine (capped at
// whatever gold you actually have), and hauls you to the nearest station.
function arrestPlayer() {
  wanted = 0; pursuitBackupCooldown = 0;
  const fine = Math.min(stats.gold, 50 + Math.floor(rand() * 150));
  stats.gold -= fine;
  const station = civicBuildings.filter(b => b.type === 'police')
    .sort((a, b) => distXZ(a, player.position) - distXZ(b, player.position))[0];
  if (station) player.position.set(station.x, 0, station.maxZ + 4); else player.position.copy(SPAWN);
  player.position.y = groundY(player.position.x, player.position.z);
  vy = 0; pvel.set(0, 0, 0);
  toast(fine > 0 ? `Arrested! Released after paying a $${fine} fine.` : 'Arrested! You had nothing on you to fine — released with a warning.');
}
function policeChase(v, dt) {
  const ai = v.ai, p = v.group.position;
  const transitTarget=transitArrestTarget(transport);
  ai.chasing = true; ai.parked = false;
  ai.ramCd -= dt;
  const actualTarget = inCar ? driving.group.position : player.position;
  const tp = transitTarget?.position||(!inCivicInterior && policeCanSee(v, actualTarget) ? actualTarget : policeLastSeen);
  const want = Math.atan2(tp.x - p.x, tp.z - p.z);
  v.group.rotation.y += clamp(angleDiff(v.group.rotation.y, want), -2.2 * dt, 2.2 * dt);
  const d = distXZ(p, tp);
  const captureSpeed=transitTarget?Math.min(22,Math.sqrt(4*Math.max(0,d-3))):inCar?Math.min(24,Math.max(0,Math.abs(driving.speed)+2)):Math.min(16,Math.sqrt(4*Math.max(0,d-3)));
  v.speed=lerp(v.speed,captureSpeed,1-Math.exp(-3*dt));
  ai.warningTimer=(ai.warningTimer||0)-dt;if(ai.warningTimer<=0&&d<35){toast('Police: stop and surrender. Use Interact near an officer.');ai.warningTimer=10;}
  if(inCar&&d<6&&Math.abs(driving.speed)<1){exitVehicle(true);arrestPlayer();return;}
  const h = v.group.rotation.y;
  p.x += Math.sin(h) * v.speed * dt;
  p.z += Math.cos(h) * v.speed * dt;
  // Road collisions are resolved centrally after movement.
  p.y = groundY(p.x, p.z);
  for (const w of v.wheels) w.rotation.x += v.speed * dt / 0.4;
  if(transitTarget){if(d<6&&transitTarget.doors){v.speed=0;const officer=v.transitOfficer??=makeHumanoid({outfit:0x243c58,hair:0x382d24,pants:0x1c2f43});if(!ai.officerDeployed){officer.root.position.copy(p).add(new THREE.Vector3(1,0,0));officer.root.visible=true;ai.officerDeployed=true;}const door=new THREE.Vector3(transitTarget.position.x,0,transitTarget.service.z+(transitTarget.service.name==='Train'?5:-3)),delta=door.sub(officer.root.position).setY(0),distance=delta.length();if(distance>.6){officer.root.position.addScaledVector(delta.normalize(),Math.min(distance,2.4*dt));officer.root.rotation.y=Math.atan2(delta.x,delta.z);collide(officer.root.position,.3);officer.root.position.y=groundY(officer.root.position.x,officer.root.position.z);animateHumanoid(officer,null,true,false,true,dt);}else{transport.leave();arrestPlayer();addTask({dur:3,end(){officer.root.visible=false;ai.officerDeployed=false;}});}}else if(v.transitOfficer){v.transitOfficer.root.visible=false;ai.officerDeployed=false;}return;}
  if (d < 3 && ai.ramCd <= 0) {
    ai.ramCd = 1.5;
    if (inCar) { /* Central collision response handles vehicle impacts. */ }
    else if(distXZ(p,player.position)<4)arrestPlayer();
  }
}

function busArrive(v, stop) {
  if (!stop) return;
  const door = busDoor(v);
  const off = Math.min(v.passengers.length, 1 + Math.floor(Math.random() * 2));
  for (let i = 0; i < off; i++) {   // people get off
    const e = v.passengers.shift();
    e.hidden = false;
    e.root.visible = true;
    e.root.position.copy(door);
    const n = nearestCorner(door);
    Object.assign(e.ped, { state: 'wander', node: n, prev: null, target: cornerPos(n), stop: null, bus: null });
  }
  stop.waiting = stop.waiting.filter(e => e.alive && !e.hidden && (e.ped.state === 'waiting' || e.ped.state === 'toStop'));
  for (const e of stop.waiting) { e.ped.state = 'boarding'; e.ped.bus = v; }   // people get on
  stop.waiting = [];
}

function updateVehicles(dt) {
  for (const v of vehicles) {
    if(isRoadVehicle(v)&&(v.health??100)<100)applyVehicleCondition(v);
    if(isRoadVehicle(v)&&!v.disabled&&v.health<35){v.conditionSmoke=(v.conditionSmoke||0)-dt;if(v.conditionSmoke<=0){v.conditionSmoke=.6;spawnParticle(at(v.group.position,1.3),new THREE.Vector3(0,1.5,0),0x5d6365,.25,.8,0);}}
    if(v.displayCar){v.speed=0;continue;}
    if(v.bridgeFlight){driveVehicle(v,dt);continue;}
    if(v.routeTraffic&&v!==driving)continue;
    if (v.disabled || (v.ai?.parked && !(v.kind==='police'&&wanted>0) && !(v.kind === 'tank' && militaryAlert > 0))) { v.speed = 0; continue; }
    v.crashCooldown = Math.max(0, (v.crashCooldown || 0) - dt);
    const roadStart = v.group.position.clone();
    if (v === driving || !v.ai) driveVehicle(v, dt);
    else if (v.kind === 'police' && wanted > 0 && !dungeon) policeChase(v, dt);
    else if (v.kind === 'tank' && militaryAlert > 0 && !dungeon) tankChase(v, dt);
    else if(v.kind==='police'&&v.stationHome){const delta=v.stationHome.clone().sub(v.group.position).setY(0),distance=delta.length();if(distance<3){v.ai.parked=true;v.ai.chasing=false;v.speed=0;}else{v.group.rotation.y=Math.atan2(delta.x,delta.z);v.speed=Math.min(10,distance);v.group.position.addScaledVector(delta.normalize(),v.speed*dt);v.group.position.y=groundY(v.group.position.x,v.group.position.z);}}
    else {
      if (v.ai.chasing) {   // chase over: head back onto the roads
        v.ai.chasing = false;
        v.ai.from = nearestNode(v.group.position);
        v.ai.to = nextNode(v.ai.from, null);
        v.ai.prev = null;
        v.ai.s = 0;
      }
      trafficDrive(v, dt);
    }
    resolveRoadMovement(v, roadStart, dt);
    resolveRailCollision(v,roadStart);
  }
}

// Temporary testing toggles — requested as a "for now" state, meant to be
// flipped back off later, not a permanent design change.
const CHEAT_NO_NEEDS = true;    // hunger/energy stop draining
const CHEAT_SPEED_MULT = 2.5;   // extra on-foot speed multiplier, stacks with speedMul()
function updateNeeds(dt) {
  if (!CHEAT_NO_NEEDS) {
    stats.hunger = clamp(stats.hunger - 100 / 180 * drainMul() * dt, 0, 100);   // empty after ~3 minutes
    stats.energy = clamp(stats.energy - 100 / 240 * drainMul() * dt, 0, 100);   // empty after ~4 minutes
  }
  if (!CHEAT_NO_NEEDS && (stats.hunger === 0 || stats.energy === 0)) stats.hp -= 2 * dt;
  else if (stats.hunger > 30) stats.hp += 1 * dt;
  // A frail birth (very low peace) bleeds health passively, roughly 1/sec at the floor,
  // tapering off above peace 25 — this is the one stat with a real, constant downside.
  const peace = origin?.stats.peace ?? 55;
  if (peace < 25) stats.hp -= (25 - peace) / 25 * dt;
  stats.hp = Math.min(maxHp(), stats.hp);
  if (stats.hp <= 0) {
    navy?.reset();intercityRail?.reset();cityServices?.reset();
    metro?.reset();
    sewers?.reset();
    transport?.cancel();
    sitting = false; sitReturnPosition = null;
    stats.hp = maxHp(); stats.hunger = 60; stats.energy = 60;
    wanted = 0; pursuitBackupCooldown = 0;   // fainting shouldn't leave police still chasing you home
    if (inCar) exitVehicle(true);
    if (riding) { riding.ridden = false; riding = null; player.visible = true; }
    if (dungeon) leaveDungeon();
    action = null;
    player.position.copy(SPAWN);
    toast(hosting.room?'You respawned in '+hosting.room.city+'.':'You fainted and woke up at home.');
  }
}

let lampTimer = 0;
const sunColorLow = new THREE.Color(0xffa060), sunColorHigh = new THREE.Color(0xfff4e0);
const hemiDay = new THREE.Color(0xcfe6ff), hemiNight = new THREE.Color(0x5566aa);
function updateWorldLight(dt) {
  const focus = inCar ? driving.group.position : player.position;
  const inSpace=!!spaceCentre?.inSpace;spaceStars.visible=inSpace;spaceStars.position.copy(camera.position);for(const cloud of clouds)cloud.visible=!inSpace&&!(navy?.rider?.depth>2)&&!metro?.underground&&!sewers?.underground&&!dungeon;
  const a = dayTime * Math.PI * 2;
  const elev = Math.sin(a);
  const sunDir = new THREE.Vector3(Math.cos(a), elev, 0.35).normalize();

  sun.position.copy(focus).addScaledVector(sunDir, 120);
  if (elev < 0) sun.position.y = focus.y + 10;
  sun.target.position.copy(focus);
  const day = clamp(elev * 3, 0, 1);
  sun.intensity = 2.4 * day;
  sun.color.copy(sunColorLow).lerp(sunColorHigh, day);
  hemi.intensity = 0.25 + 0.75 * clamp(elev * 2 + 0.2, 0, 1);
  hemi.color.copy(hemiNight).lerp(hemiDay, clamp(elev * 3 + 0.3, 0, 1));

  // Sky colours: dusk at the horizon, blending to day above and night below
  const top = skyUniforms.top.value, horizon = skyUniforms.horizon.value;
  if (elev > 0) {
    const t = clamp(elev * 4, 0, 1);
    top.copy(SKY.duskTop).lerp(SKY.dayTop, t);
    horizon.copy(SKY.duskHorizon).lerp(SKY.dayHorizon, t);
  } else {
    const t = clamp(-elev * 5, 0, 1);
    top.copy(SKY.duskTop).lerp(SKY.nightTop, t);
    horizon.copy(SKY.duskHorizon).lerp(SKY.nightHorizon, t);
  }
  if (weatherState === 'rain') { top.lerp(new THREE.Color(0x5a6168), 0.6); horizon.lerp(new THREE.Color(0x6b7278), 0.6); }
  scene.fog.color.copy(horizon);
  scene.fog.far = weatherState === 'rain' ? 300 : 600;
  sky.position.copy(camera.position);
  sunDisc.position.copy(camera.position).addScaledVector(sunDir, 400);
  moonDisc.position.copy(camera.position).addScaledVector(sunDir, -400);
  sunDisc.visible = elev > -0.1 && weatherState !== 'rain';
  moonDisc.visible = elev < 0.1 && weatherState !== 'rain';

  for (const c of clouds) {
    c.position.x += dt * 2;
    if (c.position.x > 260) c.position.x = -260;
  }

  // Night lighting: windows, street lamps, headlights
  const glow = clamp(0.6 - elev * 3, 0, 1);
  for (const m of glowMats) m.emissiveIntensity = glow * 1.3;
  lanternMat.emissiveIntensity = glow * 3;
  headlight.intensity = glow * 80;
  headMat.emissiveIntensity = 0.3 + glow * 2;
  const flash = wanted > 0 ? Math.floor(performance.now() / 180) % 2 : -1;   // police sirens
  sirenRed.emissiveIntensity = flash === 0 ? 4 : 0;
  sirenBlue.emissiveIntensity = flash === 1 ? 4 : 0;
  const ambFlash = Math.floor(performance.now() / 150) % 2;   // ambulance light bar, always on while responding
  ambRed.emissiveIntensity = ambFlash === 0 ? 4 : 0;
  ambWhite.emissiveIntensity = ambFlash === 1 ? 4 : 0;

  lampTimer -= dt;
  if (lampTimer <= 0) {
    lampTimer = 0.5;
    (dungeon ? torchSpots : lampSpots.filter((_, i) => !lampBroken[i])).map(p => ({ p, d: distXZ(p, focus) })).sort((x, y) => x.d - y.d).slice(0, lampLights.length)
      .forEach((n, i) => lampLights[i].position.set(n.p.x, dungeon ? n.p.y : n.p.y + 4, n.p.z));
  }
  for (const l of lampLights) l.intensity = dungeon ? 40 : glow * 30;

  if(inSpace){top.set(0x000106);horizon.set(0x02030a);scene.fog.color.set(0x000106);scene.fog.near=600;scene.fog.far=950;sunDisc.visible=moonDisc.visible=false;sun.intensity=1.1;sun.color.set(0xffffff);hemi.intensity=.35;hemi.color.set(0xc7d2e5);return;}
  if(navy?.rider?.depth>2){top.set(0x15465c);horizon.set(0x15465c);scene.fog.color.set(0x15465c);scene.fog.near=6;scene.fog.far=75;hemi.intensity=.65;hemi.color.set(0x8fc9dc);sunDisc.visible=moonDisc.visible=false;return;}
  if(metro?.underground){top.set(0x102535);horizon.set(0x102535);scene.fog.color.set(0x102535);scene.fog.near=12;scene.fog.far=90;sun.intensity=.02;hemi.intensity=.35;hemi.color.set(0xa9c9d9);sunDisc.visible=moonDisc.visible=false;return;}
  if(sewers?.underground){top.set(0x111a15);horizon.set(0x111a15);scene.fog.color.set(0x111a15);scene.fog.near=8;scene.fog.far=55;sun.intensity=.03;hemi.intensity=.25;hemi.color.set(0xb5c5aa);sunDisc.visible=moonDisc.visible=false;return;}
  // Inside a dungeon: themed sky, thick fog and torchlight instead of the sun
  if (dungeon) {
    const th = THEMES[dungeon.gate.theme];
    top.set(th.skyTop); horizon.set(th.fog);
    scene.fog.color.copy(horizon);
    scene.fog.near = 15; scene.fog.far = 95;
    sun.intensity = 0.6; sun.color.set(th.light);
    hemi.intensity = 0.45; hemi.color.set(th.light);
    sunDisc.visible = moonDisc.visible = false;
  } else {
    scene.fog.near = 140; scene.fog.far = 600;
  }
}

const raycaster = new THREE.Raycaster();
function updateCamera(dt) {
  if(firstPersonVehicle && (cameraView !== 'first' || firstPersonVehicle !== driving || cine)){firstPersonVehicle.group.visible=!firstPersonVehicle.crashed;firstPersonVehicle=null;}
  if(inCar&&cameraView==='first'&&!cine){firstPersonVehicle=driving;driving.group.visible=false;}
  player.visible = !inCar && (cameraView !== 'first' || !!cine);
  if (cine) {   // ultimate close-up: swing around the front of the player
    cine.t += dt;
    const f = fwdOf(player), side = new THREE.Vector3(f.z, 0, -f.x), k = cine.t / cine.dur;
    const head = at(player.position, 1.6);
    camera.position.copy(head).addScaledVector(f, 3.4 - k * 1.2).addScaledVector(side, 1.6 - k * 3.2).add(new THREE.Vector3(0, 0.2, 0));
    camera.lookAt(head);
    if (cine.t >= cine.dur) { cine = null; letterbox(false); }
  } else if (cameraView === 'first') {
    const focus=inCar?driving.group.position:player.position;
    const forward=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
    if(inCar){const h=driving.group.rotation.y;camera.position.set(focus.x+Math.sin(h)*1.2,focus.y+2,focus.z+Math.cos(h)*1.2);}
    else camera.position.copy(focus).y+=1.65;
    camera.lookAt(camera.position.clone().add(forward));
    camera.near=.03;camera.updateProjectionMatrix();
  } else {
    camera.near=.1;camera.updateProjectionMatrix();
    const focus = inCar ? driving.group.position : player.position;
    if (inCar && Math.abs(driving.speed) > 1) yaw = lerpAngle(yaw, driving.group.rotation.y + Math.PI, 1 - Math.exp(-3 * dt));
    const target = new THREE.Vector3(focus.x, focus.y + (inCar ? 1.8 : 1.5), focus.z);
    const offset = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    let dist = inCar ? camDist + ({ bus: 7, boat: 5, plane: 12 }[driving.kind] ?? 3) : camDist;

    // Stop the camera at walls so it never ends up inside a building
    raycaster.set(target, offset);
    raycaster.far = dist;
    const hit = raycaster.intersectObjects(camBlockers, false)[0];
    if (hit) dist = Math.max(1, hit.distance - 0.3);

    camera.position.copy(target).addScaledVector(offset, dist);
    camera.position.y = Math.max(camera.position.y,navy?.rider?.depth>2?-navy.rider.depth+.4:metro?.entrances.groundAt(player.position.x,player.position.z)!=null?player.position.y+.2:.4);
    camera.lookAt(target);
  }

  if((sewers?.underground||metro?.underground||metro?.entrances.groundAt(player.position.x,player.position.z)!=null)&&cameraView==='third'&&!cine){const eye=player.position.clone().add(new THREE.Vector3(0,1.5,0));const delta=camera.position.clone().sub(eye);if(delta.length()>2.4)camera.position.copy(eye).addScaledVector(delta.normalize(),2.4);camera.position.y=Math.min(player.position.y+3.3,camera.position.y);camera.lookAt(eye);}
  // Screen shake
  if (shake > 0.001) {
    camera.position.add(randUnit().multiplyScalar(shake * 0.5));
    shake *= Math.exp(-9 * dt);
  }

  // Sims-style: hide the roof while the player is inside the house
  const p = player.position;
  for (const hs of houses) hs.roof.visible = hs.structure?.alive===false?false:inCar || !(p.x > hs.minX && p.x < hs.maxX && p.z > hs.minZ && p.z < hs.maxZ);
}

function updateHud(dt) {
  const c = characters[charIdx];
  $('charName').textContent = (playerUsername ? playerUsername + '  ·  ' : '') + (inCar ? 'Driving' : c.name) + `  ·  Lv ${prog.level}` + (prog.points ? ' (C)' : '') + (isVillain ? '  ☠ Villain' : '');
  $('charName').style.color = isVillain ? '#ff4d4d' : heroDungeonKills>0?'#67b3ff':'#fff';
  $('hpBar').style.width = clamp(stats.hp / maxHp() * 100, 0, 100) + '%';
  $('hpText').textContent = `${Math.max(0, Math.round(stats.hp))} / ${maxHp()}`;
  $('hungerBar').style.width = stats.hunger + '%';
  $('energyBar').style.width = stats.energy + '%';
  const hours = (dayTime * 24 + 6) % 24;
  const hh = String(Math.floor(hours)).padStart(2, '0'), mm = String(Math.floor(hours % 1 * 60)).padStart(2, '0');
  $('clock').textContent = `Time ${hh}:${mm}  ·  Gold ${stats.gold}`;
  $('extra').textContent = (inCar ? `Speed ${Math.round(Math.abs(driving.speed) * 3.6)} km/h${isRoadVehicle(driving) ? ' ? Condition ' + Math.ceil(driving.health ?? 100) + '%' : ''}`
      + (driving.kind === 'plane' ? `  ·  Alt ${Math.round(driving.alt)} m  ·  Throttle ${Math.round(driving.plane.throttle * 100)}%` : '')
    : awaken > 0 ? `AWAKENED ${awaken.toFixed(1)}s` : `Slimes defeated: ${kills}`)
    + (wanted > 0 ? `  ·  WANTED ${Math.ceil(wanted)}s` : '');

  const interactTarget = resolveInteractTarget();
  let prompt = interactTarget ? 'E: ' + interactTarget.label : '';
  $('prompt').textContent = mobileControls?.mobile ? prompt.replace(/^E:/, 'Interact:') : prompt;
  $('prompt').style.display = prompt ? 'block' : 'none';

  combo.t -= dt;
  if (combo.t <= 0 && combo.count) { combo.count = 0; combo.dmg = 0; $('combo').style.opacity = 0; }
  updateHotbar();
}

// =====================================================================
// MAIN LOOP
// =====================================================================
const reconstruction = createReconstruction({ scene, colliders, camBlockers, planeBlocks, groundY, makeTex, toast,
  makeOfficer: () => makeHumanoid({ outfit: 0xffa52b, hair: 0x483829, pants: 0x324252 }),
  animateOfficer: (officer, moving, dt) => animateHumanoid(officer, null, moving, false, true, dt),
  dispose(obj) { obj.removeFromParent(); const geometries=new Set(), materials=new Set(), textures=new Set();obj.traverse(child=>{if(!child.isMesh)return;geometries.add(child.geometry);for(const m of Array.isArray(child.material)?child.material:[child.material]){materials.add(m);if(m.map)textures.add(m.map);}});for(const t of textures)t.dispose();for(const m of materials)m.dispose();for(const g of geometries)g.dispose(); }
});
let nextConstructionShift = 0;
function buyFood(price, energy) {
  if (stats.gold < price) { toast('Not enough gold. Visit the construction office for a shift.'); return; }
  stats.gold -= price; stats.hunger = 100; stats.energy = Math.min(100, stats.energy + energy);
  toast('Food purchased. Hunger restored.');
}
townPlaces = buildPlaces({ makePerson: makeHumanoid, animatePerson: (h,moving,dt)=>animateHumanoid(h,null,moving,false,true,dt), playerY:()=>player.position.y, playerPos:()=>player.position, scene, box, colliders, camBlockers, planeBlocks, sitSpots, interactables, makeTex, toast,
  policeReception() { toast(wanted > 0 ? 'An active pursuit is in progress. Lose the pursuing units before returning to reception.' : 'Police reception: no active wanted alert. Public reception and custody viewing are open.'); },
  constructionShift() {
    if (performance.now() < nextConstructionShift) { toast('Next shift available in ' + Math.ceil((nextConstructionShift - performance.now()) / 1000) + ' seconds.'); return; }
    nextConstructionShift = performance.now() + 60000; stats.gold += 75; stats.energy = Math.max(0, stats.energy - 15); gainXp(15); toast('Construction shift completed: +75 gold, +15 XP, ?15 energy.');
  },
  buyGroceries: () => buyFood(15, 10), buyMeal: () => buyFood(10, 20),
  restrictedEntry: () => raiseWanted(90),
  addPoliceCar(x, z) { const v = makeVehicle('police', 0xf5f6fa); v.group.position.set(x, 0, z); v.ai = { from: nearestNode(v.group.position), to: [4, 0], prev: null, s: 0, cruise: 12, parked: true, stopTimer: 0, stopped: false, chasing: false, blockedT: 0, ignoreT: 0, ramCd: 0 }; },
  travelTo(d) { if (wanted > 0) { toast('Town travel is unavailable during a police pursuit.'); return; } setWaypoint(d); },
  pause() { if (mobileControls?.mobile) { locked = false; mouseHeld = false; $('start').style.display = 'none'; } },
  resume() { requestGameControl(); }
});
// The bridge/Riverside were hand-built directly in this file, not through places.js's
// room() helper, so they never auto-registered on the travel map like everything else.
townPlaces.destinations.push({ name: 'Riverside (across the bridge)', x: BRIDGE_X, z: RIVERSIDE_Z0 + 40 });
townPlaces.destinations.push({ name: 'Ashford Capital', x: CAPITAL_CX, z: CAPITAL_Z0 + 10 });
capitalServiceBuildings=buildCapitalServices({scene,box,makeTex,interactables,sitSpots,toast,buyFood,makePerson:makeHumanoid,destinations:townPlaces.destinations});
spaceCentre=buildSpaceCentre({safeFence:fenceRect,makePerson:makeHumanoid,animatePerson:(h,moving,dt)=>animateHumanoid(h,null,moving,false,true,dt),playerPosition:()=>player.position,resume:()=>requestGameControl(),scene,box,makeTex,interactables,toast,destinations:townPlaces.destinations,canTravel:()=>!navy?.rider&&!intercityRail?.rider&&!adventureServices?.parachuting&&!spaceCentre?.rider&&!inCar&&!sitting&&!transport?.rider&&!metro?.rider&&!action&&wanted===0,moveTo(x,y,z){player.position.set(x,y,z);vy=0;pvel.set(0,0,0);swimming=false;}});
buildHotbar();
harbour = buildHarbour({scene,box,colliders,planeBlocks,interactables,makeTex,toast,makePerson:makeHumanoid,animatePerson:(h,moving,dt,pose)=>animateHumanoid(h,pose||null,moving,false,true,dt),playerPosition:()=>player.position,restrictedEntry:()=>raiseWanted(90),canEnter:()=>wanted===0,machineImpact:(from,dt)=>{if(!inCar)hurtPlayer(12,from,5);},
  boardShip(x,z){player.position.set(x,2.8,z);swimming=false;vy=0;pvel.set(0,0,0);toast('Aboard the moored cargo ship. Use Interact to return to the dock.');},
  returnDock(x,z){player.position.set(x,1.2,z);swimming=false;vy=0;pvel.set(0,0,0);}
});
townPlaces.destinations.push({name:'Ashford Port',x:-103,z:170});
interactables.push({pos:new THREE.Vector3(-153,0,231),r:3,label:'Climb dock ladder',action:()=>{player.position.set(-149,1.2,231);swimming=false;vy=0;toast('Climbed onto the dock.');}});
// Visible emergency ladder outside the fenced cargo yard.
for(const x of [-153.5,-152.5])box(.08,3,.08,x,-.2,231,0xd1bc58,false);
for(let y=-1.5;y<1.2;y+=.35)box(1,.06,.06,-153,y,231,0xd1bc58,false);
for(const pet of parkPets.filter(a=>a.kind==='dog').slice(0,2)){
  const h=makeHumanoid({outfit:0x547b83,hair:0x46382d,pants:0x303f50});pet.ownerHuman=h;pet.owner=h.root;h.root.position.copy(pet.home);pet.leash=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x564638}));scene.add(pet.leash);
}
const companion=parkPets.filter(a=>a.kind==='dog')[2];
interactables.push({pos:companion.home.clone(),r:3,label:'Adopt companion dog',action:()=>{if(companion.owner){toast('Your companion dog follows you around town.');return;}companion.owner=player;companion.leash=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xa68752}));scene.add(companion.leash);toast('You adopted a dog. Your companion will follow you.');}});
harbourBridge=buildBridge({scene,box,colliders,planeBlocks,makeTex});
townPlaces.destinations.push({name:'Harbour bridge',x:220,z:85});
transport=buildTransport({scene,box,makeTex,sitSpots,interactables,makePerson:makeHumanoid,animatePerson:(h,moving,dt)=>animateHumanoid(h,null,moving,false,true,dt),toast,
 canBoard:()=>!navy?.rider&&!intercityRail?.rider&&!adventureServices?.parachuting&&!inCar&&!sitting&&!action&&!swimming,firstPerson:()=>cameraView==='first',board(){action=null;vy=0;pvel.set(0,0,0);},
 carry(pos){player.position.copy(pos);},leave(pos){player.position.copy(pos);player.position.y=groundY(pos.x,pos.z);collide(player.position,.4);vy=0;pvel.set(0,0,0);}
});
urban=buildUrban({scene,box,camBlockers,planeBlocks,sitSpots,interactables,makeTex,makePerson:makeHumanoid,animatePerson:(h,moving,dt)=>animateHumanoid(h,null,moving,false,true,dt),toast,buyFood:()=>buyFood(12,15),destinations:townPlaces.destinations,busStops,busRoute:BUS_ROUTE,vehicles,playerPos:()=>player.position,volume:()=>Math.max(0,Math.min(1,Number(localStorage.getItem('masterVolume')||80)/100))});
transport.update(0);urban.update(dayTime,0);
sewers=buildSewersAndOffices({scene,box,colliders,camBlockers,planeBlocks,sitSpots,interactables,makeTex,groundY,makePerson:makeHumanoid,animatePerson:(h,moving,dt)=>animateHumanoid(h,null,moving,false,true,dt),toast,destinations:townPlaces.destinations,playerPos:()=>player.position,
 canEnter:()=>!navy?.rider&&!intercityRail?.rider&&!adventureServices?.parachuting&&!inCar&&!transport?.rider&&!sitting&&!action,
 moveTo(x,y,z){action=null;swimming=false;vy=0;pvel.set(0,0,0);player.position.set(x,y,z);yaw=0;}
});
interactables.push({pos:new THREE.Vector3(TRAIN.x-13.6,CURB,TRAIN.z),r:3,label:'Claim special training ability',action:()=>{if(prog.level<5){toast('Reach level 5 to unlock support-skill quests.');return;}if(specialUnlocked){toast('Special training complete. Your SP ability is equipped.');return;}if(specialTrainingKills<5){toast('Special training: defeat 5 enemies. Progress '+specialTrainingKills+'/5.');return;}specialUnlocked=true;supportSkills?.grantPsychic();localStorage.setItem('specialUnlocked','true');buildHotbar();toast('Special training completed. Psychic Grip is now equipped in SP.');}});
buildControlSettings($('controlChoices'),controlPrefs,matchMedia('(pointer: coarse)').matches&&navigator.maxTouchPoints>0,()=>{for(const key in keys)keys[key]=false;mobileControls?.reset();mobileControls?.update();applyLayout();});
regionalEnvironment=buildRegionalEnvironment({scene,box,makeTex,addTrafficLight,addBird,insideCollider,addLampSpot});
metro=buildMetro({scene,box,colliders,camBlockers,interactables,sitSpots,makeTex,toast,groundY,
 makePerson:makeHumanoid,animatePerson:(h,moving,dt)=>animateHumanoid(h,null,moving,false,true,dt),
 clearEntrance(rect){for(let i=0;i<lampSpots.length;i++){const p=lampSpots[i];if(p.x>rect.minX-.4&&p.x<rect.maxX+.4&&p.z>rect.minZ-.4&&p.z<rect.maxZ+.4){p.z=rect.maxZ+2;placeLampInstance(i,p);}}for(const b of buildings)if(b.alive&&b.x+b.w/2>rect.minX-.5&&b.x-b.w/2<rect.maxX+.5&&b.z+b.d/2>rect.minZ&&b.z-b.d/2<rect.maxZ){b.alive=false;b.redeveloped=true;for(const m of b.meshes||[]){m.visible=false;const i=camBlockers.indexOf(m);if(i>=0)camBlockers.splice(i,1);}for(const c of [b.collider,...(b.extraColliders||[])]){const i=colliders.indexOf(c);if(i>=0)colliders.splice(i,1);}for(const c of b.blocks||[]){const i=planeBlocks.indexOf(c);if(i>=0)planeBlocks.splice(i,1);}}},
 canEnter:()=>!navy?.rider&&!intercityRail?.rider&&!inCar&&!transport?.rider&&!metro?.rider&&!riding&&!sitting&&!action,
 playerPos:()=>player.position,firstPerson:()=>cameraView==='first',
 move(x,y,z){action=null;swimming=false;vy=0;pvel.set(0,0,0);player.position.set(x,y,z);},
 prepareRide(){action=null;vy=0;pvel.set(0,0,0);},carry(pos){player.position.copy(pos);}
});metro.update(0,0);
mobileControls = setupMobileControls({
  playing: () => locked && !roomChat.open && !worldMap?.open && !movieTv?.open && !npcConversations?.open && !adventureServices?.open && !supportSkills?.open && !cityServices?.open && !boardOpen && !settingsOpen && !layoutEditMode && document.getElementById('placesTravel')?.hidden !== false,
  key: (code, down) => { keys[code] = down; },
  look: (dx, dy) => { if (cine) return; yaw -= dx * .005; pitch = clamp(pitch + dy * .005, cameraView === 'first' ? -1.4 : -.1, cameraView === 'first' ? 1.4 : 1.2); },
  interact, dash, psychic: psychicGrip, switchCharacter: switchChar, skill: useSkill, ultimate: useUlt,
  attack: down => { mouseHeld = down; if (down) m1(); },
  board: () => toggleBoard(true), settings: () => toggleSettings(true), pause: pauseMobileGame,
  preferences:()=>controlPrefs,
  state:()=>({driving:inCar||!!navy?.rider||!!intercityRail?.rider||!!cityServices?.rider||!!metro?.rider||!!transport?.rider,passenger:!!intercityRail?.rider||!!cityServices?.rider||!!spaceCentre?.rider||!!metro?.rider||!!transport?.rider,vehicleKind:driving?.kind||(navy?.rider?(navy.rider.sub?'submarine':'boat'):metro?.rider?'subway':transport?.rider?'transit':undefined),carMovement:activeDrivingControls.carMovement,manual:!transmissionAuto,gear,specialUnlocked,ultimate:stats.ult,ultimateUnlocked:prog.level>=ULT_UNLOCK_LEVEL,color:hex(characters[charIdx].fx),gateAvailable:!!(inspectedGate||nearestGate())}),
  shiftGear,gateInfo:()=>{const gate=inspectedGate||nearestGate();return gate?gateInfoHtml(gate):null;},resume:requestGameControl,layoutChanged:applyLayout,
  editingLayout: () => layoutEditMode
});
poisonLand=buildPoisonLand({scene,box,makeTex,interactables,toast,makeMonster,removeEnemy,removeGate,destinations:townPlaces.destinations,playerPosition:()=>player.position,inDungeon:()=>!!dungeon,hurt:hurtPlayer,
createGate(o){const gm=makeGateMesh(0x92ed2a),pos=new THREE.Vector3(o.x,0,o.z),rank=rankOf(o.level),gate=Object.assign(gm,{pos,level:o.level,rank,stars:rank+1,theme:'poison',tier:tierOf(o.level),name:o.name,persistent:o.persistent,finalBoss:o.finalBoss,poisonCity:true});gm.group.position.copy(pos);gm.disc.userData.gate=gate;gates.push(gate);return gate;}});
buildHighlandForest({scene,colliders,insideCollider,groundY,addBird});
volcanicIsland=buildVolcanicIsland({scene,box,interactables,toast,playerPosition:()=>player.position,hurt:hurtPlayer});regionalEnvironment.islands.push(volcanicIsland.island);
ghostIsland=buildGhostIsland({scene,box,interactables,toast,stats,destinations:townPlaces.destinations,signboard,rand});regionalEnvironment.islands.push(ghostIsland.island);
cityLife=buildCityLife({level:()=>prog.level,openSkills:()=>supportSkills?.show(true),scene,interactables,toast,islands:[...regionalEnvironment.islands,{name:'Driftwood Island',x:ISLAND.x,z:ISLAND.z,r:ISLAND_R}],groundY,makePerson:makeHumanoid,animatePerson:(h,moving,dt)=>animateHumanoid(h,null,moving,false,true,dt),killCount:()=>monsterQuestKills,reward(gold,xp){stats.gold+=gold;gainXp(xp);},removeGate,createGate(o){const gm=makeGateMesh(0xa883ff),pos=new THREE.Vector3(o.x,0,o.z),rank=rankOf(o.level),gate=Object.assign(gm,{pos,level:o.level,rank,stars:rank+1,theme:o.theme,tier:tierOf(o.level),name:o.name,persistent:o.persistent,capitalGate:true});gm.group.position.copy(pos);gm.disc.userData.gate=gate;gates.push(gate);return gate;}});
for(let i=0;i<6;i++)addWildlife('skeleton',ghostIsland.chamberCentre.x+(rand()-0.5)*14,ghostIsland.chamberCentre.z+(rand()-0.5)*14);
for(let i=0;i<12;i++)addWildlife('skeleton',-80+Math.sin(i*2)*18,480+Math.cos(i*2)*17);
supportSkills=createSupportSkills({level:()=>prog.level,counters:()=>({kills:monsterQuestKills,dungeons:supportCounters.dungeons,bosses:supportCounters.bosses}),toast,
changed(){specialUnlocked=!!supportSkills?.equipped;buildHotbar();if(alignmentUserId)try{localStorage.setItem('support:'+alignmentUserId,JSON.stringify({skill:supportSkills.snapshot(),counters:supportCounters,kills:monsterQuestKills}));}catch{}},
pause(){locked=false;mouseHeld=false;for(const key in keys)keys[key]=false;document.exitPointerLock();$('start').style.display='none';},resume(){if(!boardOpen&&!settingsOpen)requestGameControl();},
psychic:legacyPsychicGrip,effect(name,color){callout(name.toUpperCase(),color);fxRing(player.position,color,4,.5);},
attack(range,damage,kb,cone){if(cone)hitCone(player.position,aimForward(),range,.25,new Set(),{dmg:damage,kb,up:1,stun:.7,heavy:true,from:player.position.clone()},3);else hitAround(player.position,range,new Set(),{dmg:damage,kb,up:2,stun:.7,heavy:true,from:player.position.clone()},3);},
heal(hp,energy){stats.hp=Math.min(maxHp(),stats.hp+hp);stats.energy=Math.min(100,stats.energy+energy);},
blink(distance){player.position.addScaledVector(aimForward().setY(0).normalize(),distance);collide(player.position,.4);player.position.y=groundY(player.position.x,player.position.z,player.position.y);},
gravity(range,damage){for(const e of enemies)if(e.alive&&e.kind==='monster'&&distXZ(e.root.position,player.position)<range)applyHit(e,{dmg:damage,from:player.position.clone(),kb:1,up:8,stun:2,heavy:true});},
sense(range){for(const e of enemies)if(e.alive&&e.kind==='monster'&&distXZ(e.root.position,player.position)<range){fxPillar(e.root.position,0xffea7b,1,4,1.5);e.glow=1;}},
controlTarget:()=>enemies.find(e=>e.alive&&e.kind==='monster'&&!e.superArmor&&distXZ(e.root.position,player.position)<12),
controlUpdate(e,dt){const target=enemies.filter(t=>t!==e&&t.alive&&t.kind==='monster').sort((a,b)=>distXZ(a.root.position,e.root.position)-distXZ(b.root.position,e.root.position))[0];if(!target)return;walkTowards(e,target.root.position,3,dt);animateHumanoid(e.h,null,true,false,true,dt);e.controlAttackCd=Math.max(0,(e.controlAttackCd||0)-dt);if(distXZ(e.root.position,target.root.position)<3&&!e.controlAttackCd){applyHit(target,{dmg:25,from:e.root.position.clone(),kb:2,up:0,stun:.3});e.controlAttackCd=1;}}
});
specialUnlocked=false;buildHotbar();
cityServices=buildCityServices({upgradeCar:v=>detailVehicle(v,'luxury'),firstPerson:()=>cameraView==='first',scene,box,makeTex,makePerson:makeHumanoid,makeVehicle,groundY,interactables,toast,
canBoard:()=>!navy?.rider&&!intercityRail?.rider&&!adventureServices?.parachuting&&!cityServices?.rider&&!inCar&&!sitting&&!riding&&!dungeon&&!action&&!transport?.rider&&!metro?.rider&&!spaceCentre?.rider,
pay(price){if(stats.gold<price)return false;stats.gold-=price;return true;},
board(){action=null;vy=0;pvel.set(0,0,0);},carry:p=>player.position.copy(p),leave(p){player.position.copy(p);player.position.y=groundY(p.x,p.z,p.y);collide(player.position,.4);vy=0;},
pause(){locked=false;mouseHeld=false;document.exitPointerLock();$('start').style.display='none';},resume:requestGameControl,
waypoint(name,x,z){setWaypoint({name,x,z});},attractions:name=>townPlaces.destinations.filter(d=>name==='Capital'?/capital|capitol|museum|government/i.test(d.name):name==='Poison Land'?/poison/i.test(d.name):name==='Riverside'?/riverside|bridge/i.test(d.name):/market|airport|port|clock|park|school/i.test(d.name)).slice(0,12),
addSeat(x,z){box(3,.15,.7,x,.7,z,0x6b5846,false);box(3,.6,.1,x,1,z+.3,0x6b5846,false);sitSpots.push({x,z,seatY:.8,yaw:Math.PI,label:'Sit at transport hub'});},
resolve:resolveRoadMovement,
redSignal(p,target){if(p.distanceTo(target)<4)return false;const axis=Math.abs(target.x-p.x)>Math.abs(target.z-p.z)?'x':'z';return trafficLights.some(t=>t.axis===axis&&t.phase>=3&&Math.hypot(t.x-p.x,t.z-p.z)<15);},
makeProfession(role,x,z,bounds){const h=makeHumanoid({outfit:/Scientist|Doctor/.test(role)?0xe2e7e9:/Imam|Sufi|priest|monk|Rabbi|minister|Theologian/.test(role)?0x98886b:0x526c81,hair:0x46362a,pants:0x2e3c4a});h.root.position.set(x,groundY(x,z),z);const node=nearestCorner(h.root.position,bounds);h.root.position.copy(cornerPos(node));h.root.position.y=groundY(h.root.position.x,h.root.position.z);const next=nextCorner(node,null,bounds),e=makeEnemy({kind:'npc',labelName:role,h,root:h.root,radius:.35,height:1.9,maxHp:50,flashMats:h.flashMats,profession:role,ped:{state:'wander',node:next,prev:node,target:cornerPos(next),speed:1.2,panicT:0,waitT:0,stop:null,bus:null,bounds}});peds.push(e);return e;}
});
onlinePlayers=createOnlineAvatars({classLook:index=>characters[index]?{outfit:characters[index].color,hair:characters[index].hair}:null,camera,makePerson:makeHumanoid,animatePerson:(h,moving,dt)=>animateHumanoid(h,null,moving,false,true,dt),dispose:disposeObj,position:()=>player.position,active:()=>onlinePlayReady&&!!hosting.room,firstPerson:()=>cameraView==='first',local:()=>({name:playerUsername||'Guest',alignment:playerAlignment()})});
worldAudio=createWorldAudio({volume:()=>Math.max(0,Math.min(1,Number(localStorage.getItem('masterVolume')??80)/100)),state:()=>({playing:locked,position:player.position,birds,weather:weatherState,driving:inCar,speed:driving?.speed||0,swimming,airborne:!onGround,indoor:!!spaceCentre?.inSpace||!!metro?.underground||!!sewers?.underground||!!inCivicInterior,lava:Math.hypot(player.position.x-155,player.position.z-520)<35})});
for(let z=BRIDGE_Z0;z<BRIDGE_Z1;z+=8)if(z<GAP0||z>=GAP1)planeBlocks.push({minX:BRIDGE_X-BRIDGE_HALF_W,maxX:BRIDGE_X+BRIDGE_HALF_W,minZ:z,maxZ:z+8,bottom:BRIDGE_Y-.5,top:BRIDGE_Y+.25});
for(const side of [1,-1]){const b={minX:BRIDGE_X-BRIDGE_HALF_W,maxX:BRIDGE_X+BRIDGE_HALF_W,minZ:side===1?GAP0:(GAP0+GAP1)/2,maxZ:side===1?(GAP0+GAP1)/2:GAP1,bottom:BRIDGE_Y-.5,top:BRIDGE_Y+.4,side};liftPlaneBlocks.push(b);planeBlocks.push(b);}
bridgeTraffic=buildBridgeTraffic({makeVehicle,makePerson:makeHumanoid,animatePerson:(h,moving,dt)=>animateHumanoid(h,null,moving,false,true,dt),groundY,harbourHeight:harbourBridge.heightAt,vehicles,resolve:resolveRoadMovement,liftWarning:()=>bridgeLiftState!=='down'});
const equippedGun=new THREE.Group();P.armR.pivot.add(equippedGun);equippedGun.position.copy(P.armR.end.position);equippedGun.rotation.x=1;mesh(new THREE.BoxGeometry(.12,.12,.65),0x293541,equippedGun).position.z=.25;mesh(new THREE.BoxGeometry(.1,.22,.14),0x394853,equippedGun).position.y=-.08;equippedGun.visible=false;
adventureServices=buildAdventureServices({illegalPurchase:()=>raiseWanted(60),showEquipment(id){swordGrip.visible=id==='sword'||!id&&!!origin?.weapon;equippedGun.visible=id==='pistol'||id==='rifle';equippedGun.scale.setScalar(id==='rifle'?1.5:1);},scene,box,makePerson:makeHumanoid,animatePerson:(h,moving,dt)=>animateHumanoid(h,null,moving,false,true,dt),sign:signboard,destinations:townPlaces.destinations,interactables,playerPosition:()=>player.position,toast,
pause(){locked=false;mouseHeld=false;document.exitPointerLock();$('start').style.display='none';},resume:requestGameControl,counters:()=>({kills:monsterQuestKills,dungeons:supportCounters.dungeons}),pay(price){if(stats.gold<price)return false;stats.gold-=price;return true;},reward(gold,xp){stats.gold+=gold;gainXp(xp);},changed(){saveSolo();},
repair(price){const car=vehicles.find(v=>isRoadVehicle(v)&&!v.disabled&&!v.noSteal&&distXZ(v.group.position,player.position)<12);if(!car){toast('Bring an operational car within 12 metres of the shop.');return;}if(stats.gold<price){toast('Not enough gold.');return;}stats.gold-=price;car.health=100;applyVehicleCondition(car);toast('Vehicle repaired. Full power and steering restored.');},
swordAttack(){callout('SWORD STRIKE',0xe5f2ff);hitCone(player.position,aimForward(),5,.1,new Set(),{dmg:35,kb:5,stun:.5,from:player.position.clone()},3);},
shoot(range,damage){const origin=at(player.position,1.5),dir=aimForward().normalize(),ray=new THREE.Raycaster(origin,dir,.1,range),obstacle=ray.intersectObjects(camBlockers,true)[0],limit=obstacle?.distance??range;
 const objects=[...enemies.filter(e=>e.alive&&!e.hidden).map(e=>({entity:e,position:at(e.root.position,1),radius:(e.radius||.4)+.4})),...vehicles.filter(v=>!v.disabled).map(v=>({vehicle:v,position:at(v.group.position,.8),radius:v.radius||2}))];
 const target=objects.map(o=>{const delta=o.position.clone().sub(origin),along=delta.dot(dir),side=delta.clone().addScaledVector(dir,-along).length();return {...o,along,side};}).filter(o=>o.along>0&&o.along<limit&&o.side<o.radius).sort((a,b)=>a.along-b.along)[0];
 const end=origin.clone().addScaledVector(dir,target?.along??limit),tracer=new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin,end]),new THREE.LineBasicMaterial({color:0xffe29a}));scene.add(tracer);setTimeout(()=>disposeObj(tracer),90);worldAudio?.impact(6);if(target?.entity)applyHit(target.entity,{dmg:damage,kb:2,stun:.2,from:origin});else monsterEnvironmentDamage(end,damage,1,true);
},
walk(h,target,speed,dt){const d=target.clone().sub(h.root.position).setY(0),distance=d.length();if(distance>.5){h.root.position.addScaledVector(d.normalize(),Math.min(distance,speed*dt));h.root.rotation.y=Math.atan2(d.x,d.z);collide(h.root.position,.4);}h.root.position.y=groundY(h.root.position.x,h.root.position.z,h.root.position.y);},
makeRaidMonster(pos){const e=makeMonster('demon',8,pos);e.npcRaid=true;return e;},raidHit(e,damage){applyHit(e,{dmg:damage,kb:1,from:e.root.position.clone().add(new THREE.Vector3(0,0,1)),police:true,fromPlayer:false});},removeEnemy
});
const regionalTransportContext={scene,box,sign:signboard,makePerson:makeHumanoid,animatePerson:(h,moving,dt)=>animateHumanoid(h,null,moving,false,true,dt),destinations:townPlaces.destinations,interactables,planeBlocks,
 canBoard:()=>!navy?.rider&&!intercityRail?.rider&&!cityServices?.rider&&!spaceCentre?.rider&&!metro?.rider&&!transport?.rider&&!inCar&&!sitting&&!action&&!dungeon&&!adventureServices?.parachuting,
 prepare(){action=null;swimming=false;vy=0;pvel.set(0,0,0);},move(p){player.position.copy(p);vy=0;pvel.set(0,0,0);swimming=false;},carry:p=>player.position.copy(p),toast,
 addSeat(x,z,y){box(3,.15,.7,x,y+.65,z,0x69727c,false);box(3,.6,.1,x,y+1,z+.3,0x69727c,false);sitSpots.push({x,z,seatY:y+.75,yaw:Math.PI,label:'Sit at railway station'});}};
navy=buildNavy({...regionalTransportContext,input:()=>locked?{forward:keys.KeyW?1:0,back:keys.KeyS?1:0,left:keys.KeyA?1:0,right:keys.KeyD?1:0,dive:keys.ShiftLeft||keys.ShiftRight?1:0,surface:keys.Space?1:0}:{forward:0,back:0,left:0,right:0,dive:0,surface:0},water:(x,z,h,l,w)=>waterFootprint(x,z,h,l,w,navigableSea),clearPassage:(v,next)=>shipCanAdvance({x:v.g.position.x,z:v.g.position.z,length:v.length},next.x,BRIDGE_X,GAP0,GAP1,bridgeLiftAngle)});
intercityRail=buildIntercityRail(regionalTransportContext);
for(let i=0;i<3;i++){const v=makeVehicle('car',0x526847);detailVehicle(v,'military');v.group.position.set(286+i*7,.2,-238);v.ai={parked:true};}
for(const v of cityServices.traffic)if(v.kind==='car'&&(v.group.position.z>640&&v.group.position.x<500))detailVehicle(v,'luxury');
regionalFacilities=buildRegionalFacilities({...regionalTransportContext,prepareSite(x,z,w,d){for(const b of buildings)if(b.alive&&Math.abs(b.x-x)<(b.w+w)/2&&Math.abs(b.z-z)<(b.d+d)/2){b.alive=false;b.redeveloped=true;for(const m of b.meshes||[])m.visible=false;for(const [list,item]of [[colliders,b.collider],[planeBlocks,b.planeBlock]]){const i=list.indexOf(item);if(i>=0)list.splice(i,1);}for(const block of b.blocks||[]){const i=planeBlocks.indexOf(block);if(i>=0)planeBlocks.splice(i,1);}}},civicBuildings,fence:fenceRect,reception:()=>{if(wanted>0)arrestPlayer();else toast('Police reception: reporting desk, patrol office and custody suite.');},addPolice(x,z){const v=makeVehicle('police',0xf5f6fa);v.group.position.set(x,groundY(x,z),z);v.stationHome=v.group.position.clone();v.ai={parked:true,cruise:12,ramCd:0,stopTimer:0};}});
npcConversations=createNpcConversations({people:()=>peds,scene,interactables,playerPosition:()=>player.position,animatePerson:(h,moving,dt)=>animateHumanoid(h,null,moving,false,true,dt),volume:()=>Math.max(0,Math.min(1,Number(localStorage.getItem('masterVolume')??80)/100)),pause(){locked=false;mouseHeld=false;for(const code in keys)keys[code]=false;document.exitPointerLock();$('start').style.display='none';},resume:requestGameControl});
worldExpansion=buildWorldExpansion({...regionalTransportContext,civicBuildings,fence:fenceRect,talk:(name,text)=>npcConversations.show(name,text),playerPosition:()=>player.position,makeMonster,light:addTrafficLight,tree:addTree,seat:(x,z)=>addBench(x,z,Math.PI),heal(){stats.hp=maxHp();toast('Medical treatment complete.');},food:()=>buyFood(15,20),killPlayer(){stats.hp=-1;toast('Strategic security: lethal exclusion zone breached.');},civilians:()=>peds,killCivilian(e){e.alive=false;e.hp=0;e.respawn=30;e.ped.state='down';}});
townPlaces.destinations.push({name:'Highlands cave entrance',x:-400,z:756});
registerAdditionalStructures({scene,buildings,colliders,planeBlocks,civicBuildings,houses,interactables,toast});
metro.cutSurfaces();
const visualAssetsReady=upgradeWorldMaterials({scene,grass:grassTex,lawn:lawnTex,ground:groundTex,paving:paveTex,wood:woodTex,roof:roofTex,roadMaterial:roads.material,facades:facades.map(f=>f.color),anisotropy:Math.min(maxAniso,8),detailed:gfxQuality!=='low'});
worldMap=createWorldMap({buildings:()=>buildings,landmarks:()=>[...civicBuildings.filter(b=>/school|hospital|museum|police|bank/i.test(b.name||'')).map(b=>({x:b.x,z:b.z,w:b.maxX-b.minX,d:b.maxZ-b.minZ,h:b.type==='school'?7:9,color:b.type==='school'?0xd8b880:0xb4bdc8})),...townPlaces.rooms.map(r=>({x:r.x,z:r.z,w:r.w,d:r.d,h:6})),...(capitalServiceBuildings?.services||[]).map(([name,x,z,color])=>({x,z,w:22,d:18,h:6,color})),...cityServices.dealers.map(d=>({x:d.x,z:d.z,w:22,d:20,h:5,color:0x789bb1}))],destinations:()=>[...townPlaces.destinations,...civicBuildings.filter(b=>/school|hospital|museum|police|bank/i.test(b.name||'')).map(b=>({name:b.name,x:b.x,z:b.z})),...(capitalServiceBuildings?.services||[]).map(([name,x,z])=>({name,x,z})),...regionalEnvironment.islands.map(i=>({name:i.name,x:i.x,z:i.z-i.r+3})),...cityServices.dealers.map((d,i)=>({name:d.city+' car dealership '+(i%3+1),x:d.x,z:d.z-12})),...cityServices.offices.map(d=>({name:d.city+' tourist office',x:d.x,z:d.z-12})),...metro.stations.map(s=>({name:s.name+' subway station',x:s.x,z:s.z}))],islands:()=>[...regionalEnvironment.islands,{name:'Driftwood Island',x:ISLAND.x,z:ISLAND.z,r:ISLAND_R}],position:()=>inCivicInterior?civicReturnPos:metro.underground?metro.stations.reduce((a,b)=>Math.abs(player.position.x-a.tx)<Math.abs(player.position.x-b.tx)?a:b):spaceCentre.inSpace?{x:420,z:684}:player.position,waypoint:d=>setWaypoint(d),pause(){locked=false;mouseHeld=false;document.exitPointerLock();$('start').style.display='none';},resume:requestGameControl});
worldAdvertising=buildWorldAdvertising({scene,groundY,insideCollider,playerPosition:()=>player.position});worldAdvertising.update(0);adBalloon.visible=false;
const mapButton=document.createElement('button');mapButton.id='worldMapButton';mapButton.textContent='Map (M)';mapButton.type='button';mapButton.onclick=()=>worldMap.show();document.body.append(mapButton);
for(const it of interactables)if(it.label==='Open town travel board')it.action=()=>worldMap.show();
movieTv=createMovieTv({interactables,position:()=>player.position,volume:()=>Math.max(0,Math.min(1,Number(localStorage.getItem('masterVolume')??80)/100)),pause(){locked=false;mouseHeld=false;document.exitPointerLock();$('start').style.display='none';},resume:requestGameControl});movieTv.register(civicTvScreen,new THREE.Vector3(CIVIC_OFFSET.x,.3,CIVIC_OFFSET.z-7));
const homeTv=mesh(new THREE.PlaneGeometry(2.8,1.6),new THREE.MeshBasicMaterial({map:civicTvTexture}));homeTv.position.set(HOME.x,1.85,HOME.maxZ-.25);homeTv.rotation.y=Math.PI;box(3.1,1.9,.15,HOME.x,1.85,HOME.maxZ-.16,0x172432,false);movieTv.register(homeTv,new THREE.Vector3(HOME.x,CURB,HOME.maxZ-2));
onlineAccount=createOnlineAccount({client:supabase,active:()=>onlinePlayReady&&!!hosting.room,snapshot:()=>({prog:{...prog},stats:{...stats},inventory,hasBag,adventure:adventureServices.snapshot(),support:supportSkills.snapshot(),supportCounters,monsterQuestKills,heroDungeonKills,villainKills,ownedCars:cityServices.snapshot().owned,quests:cityLife.quests.map(q=>({name:q.name,active:q.active,claimed:q.claimed,target:q.target}))})});
applyLayout();
// Open index.html#test to run the simulation without clicking (used for automated checks)
if (location.hash === '#test') { locked = true; startEl.style.display = 'none'; }
if (location.hash === '#test-systems') {   // exercises building collapse, plane crash and a dungeon run
  locked = true; startEl.style.display = 'none';
  setTimeout(() => { collapseBuilding(buildings[5]); crashPlane(vehicles.find(v => v.kind === 'plane')); enterDungeon(gates[0]); }, 1000);
  setTimeout(() => {
    const plane = vehicles.find(v => v.kind === 'plane' && !v.crashed);
    for (let i = 0; i < 400; i++) {   // step the simulation by hand (headless browsers render very few frames)
      updateDungeon(0.05); updateEnemies(0.05); updateEnemyShots(0.05); updateTasks(0.05); updateParticles(0.05);
      updatePlayer(0.05); updateVehicles(0.05); updateGates(0.05); flyPlane(plane, 0.05);
      if (i === 200) psychicGrip();
    }
    document.title = `ok dungeon=${!!dungeon} wave=${dungeon?.wave} mobs=${dungeon?.mobs.length} alive=${dungeon?.mobs.filter(m => m.alive).length} hp=${Math.round(stats.hp)}`;
  }, 3000);
}
const clock = new THREE.Clock();
let slowFrameTime=0,lastFrameAt=performance.now(),perfWarmup=0;
function frame() {
  const nowFrame=performance.now(),frameMs=nowFrame-lastFrameAt;lastFrameAt=nowFrame;perfWarmup+=frameMs;
  if(locked&&!document.hidden&&!manualGraphics&&perfWarmup>5000){slowFrameTime=frameMs>45?slowFrameTime+Math.min(frameMs,250):Math.max(0,slowFrameTime-100);if(slowFrameTime>4000&&gfxQuality!=='low'){setGraphicsQuality('low');slowFrameTime=0;toast('Graphics adjusted for smoother play. Change quality in Settings.');}}
  if(document.hidden&&!(onlinePlayReady&&hosting.room)){clock.getDelta();requestAnimationFrame(frame);return;}
  const running=locked||(onlinePlayReady&&!!hosting.room);
  const rawDt = Math.min(clock.getDelta(), 0.05);
  let dt = rawDt;
  if (hitStop > 0) { hitStop -= rawDt; dt = 0; }   // freeze the world for a split second on big hits
  if (running) {
    dayTime = (dayTime + dt / DAY_LEN) % 1;
    reconstructionDays += dt / DAY_LEN;
    reconstruction.update(reconstructionDays, dt);
    for (const c of characters) c.cds = c.cds.map(v => Math.max(0, v - dt));
    dashCd = Math.max(0, dashCd - dt);
    psyCd = Math.max(0, psyCd - dt);
    updatePursuit(dt);
    updateNeeds(dt);
    if (riding) updateRiding(dt);
    else if (!inCar) updatePlayer(dt);
    soloSaveTimer += dt;
    if (soloSaveTimer > 8) { soloSaveTimer = 0; saveSolo(); }
    updateCityStreaming(dt);
    if (inCivicInterior) updateCivicTv(dt);
    updateSitPrompt();
    updateWaypoint();
    updateVehicles(dt);
    updateParkLife(dt);
    updateBridgeLift(dt);
    updateTrafficLights(dt);
    updateWeather(dt);
    updateFirefighters(dt);
    updateFireDamage(dt);
    updateBats(dt);
    updateForestInsects(dt);
    updatePlanes(dt);
    updateAdBalloon(dt);
    updateShips(dt);
    spaceCentre?.update(dt);
    transport.update(dt);
    for(const v of vehicles)resolveRailCollision(v,v.group.position.clone());
    metro.update(dt,reconstructionDays*DAY_LEN);regionalEnvironment.update(reconstructionDays*DAY_LEN);volcanicIsland?.update(reconstructionDays*DAY_LEN,dt);ghostIsland?.update(reconstructionDays*DAY_LEN,dt);poisonLand?.update(dt);cityLife?.update(dt);supportSkills?.update(dt);cityServices?.update(dt);bridgeTraffic?.update(dt);adventureServices?.update(dt);navy?.update(dt);intercityRail?.update(dt);regionalFacilities?.update(dt);worldExpansion?.update(dt);npcConversations?.update(dt);
    urban.update(dayTime,dt);
    updateGates(dt);
    updateDungeon(dt);
    updateEnemyShots(dt);
    if (!cine) updateEnemies(dt);        // enemies freeze during ultimate cinematics
    updateProjectiles(dt);
    updateTasks(dt);
    updateParticles(dt);
  }
  worldAudio?.update(running?rawDt:0);
  mobileControls?.update();
  townPlaces.update(inCar && driving ? { position: driving.group.position } : player, inCar, reconstructionDays * DAY_LEN, running ? rawDt : 0);
  if(running) harbour.update(reconstructionDays * DAY_LEN, rawDt);
  movieTv?.update();
  onlineAccount?.update(rawDt);
  roomChat.update(rawDt);
  updateCamera(running ? rawDt : 0);
  updateWorldLight(running ? dt : 0);
  updatePops(running ? rawDt : 0);
  updateLabels();
  onlinePlayers?.update(rawDt);
  drawSpeedLines(rawDt);
  updateHud(running ? rawDt : 0);
  if($('auth').style.display!=='flex')renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
