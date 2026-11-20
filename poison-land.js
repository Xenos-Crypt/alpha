import * as THREE from 'three';
export function poisonBossMultiplier(entryLevel,killLevel){return entryLevel===50&&killLevel===50?20:1;}

// POISON LAND: an industrial exclusion zone on its own island in the bay, west of the harbour bridge and north
// of Riverside. One road bridge reaches it, branching off the harbour bridge. The island (160 x 160 m) has a
// ring road round the shore, a cross of roads through the middle, and four yards between them. Each yard has two
// poison factories (with chimneys pouring gas) and toxic pools or dungeon gates in the other two corners. A
// parapet runs round the shore (solid), open only where the bridge comes in.
// Every spot below was checked clear before placing: Driftwood Island (z 476-524), Palm Cove (z 526-564),
// Riverside (x -80 and east, z 640 and south), Pine Rock (z 794 and south), the mountains on the west shore
// (x -287 and west) and the ferry's route (z 408-468).
//
// The old Poison Land site on the mainland (x 600-840, z 200-440) keeps its streets as ordinary roads that
// Cinder Row's lanes join; everything poisonous left with the island.
export const ISLAND = { x0: -265, z0: 565, size: 160, top: 0.2 };
export const SPUR = { z: 590, half: 5 };   // the bridge from the harbour bridge (x -7) to the island's east shore

export function buildPoisonLand(ctx){
 const O={x:ISLAND.x0,z:ISLAND.z0},S=ISLAND.size,T=ISLAND.top,P=(lx,lz)=>[O.x+lx,O.z+lz];
 const bounds={minX:O.x,maxX:O.x+S,minZ:O.z,maxZ:O.z+S},hazards=[],smoke=[],permanent=[],roamers=[];let hazardTimer=0,timer=90,temporary=null,elapsed=0;

 // ---- the old mainland site: just its streets now
 ctx.box(260,.4,260,720,-.2,320,0x51534a,false);
 for(let x=600;x<=840;x+=40)ctx.box(14,.04,240,x,.02,320,0x333b3a,false);
 for(let z=200;z<=440;z+=40){ctx.box(240,.04,14,720,.025,z,0x333b3a,false);for(let x=605;x<840;x+=12)ctx.box(5,.02,.16,x,.05,z,0xcaca8d,false);}
 ctx.box(180,.08,14,510,0,240,0x333b3a,false);

 // ---- the island: ground, roads, parapet
 ctx.box(S,2.4,S,O.x+S/2,T-1.2,O.z+S/2,0x51534a,false);
 const road=(lx0,lx1,lz0,lz1)=>ctx.box(lx1-lx0,.04,lz1-lz0,O.x+(lx0+lx1)/2,T+.02,O.z+(lz0+lz1)/2,0x333b3a,false);
 for(const l of [10,80,150]){road(l-5,l+5,5,155);road(5,155,l-5,l+5);}
 for(const l of [10,80,150])for(let k=8;k<152;k+=12){ctx.box(.16,.02,5,O.x+l,T+.05,O.z+k,0xcaca8d,false);ctx.box(5,.02,.16,O.x+k,T+.05,O.z+l,0xcaca8d,false);}
 const ez=SPUR.z-O.z;   // where the bridge lands on the east shore (local z)
 const wall=(lx0,lx1,lz0,lz1)=>ctx.box(Math.max(.4,lx1-lx0),1.1,Math.max(.4,lz1-lz0),O.x+(lx0+lx1)/2,T+.55,O.z+(lz0+lz1)/2,0x6b6f66,true);
 wall(0,S,0,0);wall(0,S,S,S);wall(0,0,0,S);wall(S,S,0,ez-SPUR.half);wall(S,S,ez+SPUR.half,S);
 road(155,S,ez-SPUR.half,ez+SPUR.half);   // the bridge's road joins the ring road

 // ---- the bridge: from the harbour bridge's west railing, level, then down a ramp onto the island
 const bx0=O.x+S,bx1=-7,rampLen=20,deck=ctx.bridgeY,deckAt=x=>x>=bx0+rampLen?deck:T+(deck-T)*Math.max(0,(x-bx0)/rampLen);
 const len=bx1-bx0,mid=(bx0+bx1)/2;
 ctx.box(len-rampLen,.6,SPUR.half*2,bx0+rampLen+(len-rampLen)/2,deck-.3,SPUR.z,0x5c5c5c,false);
 { const g=new THREE.BoxGeometry(rampLen,.6,SPUR.half*2),m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x5c5c5c}));
   m.position.set(bx0+rampLen/2,(deck+T)/2-.3,SPUR.z);m.rotation.z=Math.atan2(deck-T,rampLen);m.castShadow=m.receiveShadow=true;ctx.scene.add(m); }
 for(const s of [-1,1]){ctx.box(len,1.1,.3,mid,deck+.55,SPUR.z+s*(SPUR.half-.15),0x3a3f45,false);ctx.colliders?.push({minX:bx0,maxX:bx1,minZ:SPUR.z+s*(SPUR.half-.1)-.2,maxZ:SPUR.z+s*(SPUR.half-.1)+.2});}
 for(let x=bx0+rampLen+10;x<bx1-4;x+=30)ctx.box(1.4,12,1.4,x,deck-6.6,SPUR.z,0x6d6d6d,false);   // piers in the water

 // ---- the gantry sign over the way in, facing the bridge
 function sign(text,x,z,yaw){const texture=ctx.makeTex(768,96,g=>{g.fillStyle='#223c2a';g.fillRect(0,0,768,96);g.fillStyle='#c7f884';g.font='bold 32px sans-serif';g.textAlign='center';g.fillText(text,384,60);});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(9,1.15),new THREE.MeshBasicMaterial({map:texture}));mesh.position.set(x,5.4,z);mesh.rotation.y=yaw;ctx.scene.add(mesh);}
 { const [gx,gz]=P(S+1.2,ez);for(const s of [-1,1])ctx.box(.35,6,.35,gx,T+3,gz+s*(SPUR.half+.4),0x3a3f45,true);ctx.box(.3,.3,SPUR.half*2+1.2,gx,T+5.9,gz,0x3a3f45,false);sign('POISON LAND / INDUSTRIAL EXCLUSION ZONE',gx+.2,gz,Math.PI/2); }

 // ---- four yards: two factories each, and pools or gates in the other corners
 const yards=[[15,15],[85,15],[15,85],[85,85]];
 function factory(lx,lz){const [x,z]=P(lx,lz);
  ctx.box(24,10,24,x,T+5,z,0x626959,true);ctx.box(25,.4,25,x,T+10.2,z,0x40483e,false);ctx.box(4,10,4,x+7,T+15.2,z+7,0x4b5148,false);   // the chimney stands on the roof
  const h={x:x+7,z:z+7,r:12};hazards.push(h);
  for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(2.7,7,5),new THREE.MeshBasicMaterial({color:0x8eac51,transparent:true,opacity:.2,depthWrite:false}));m.position.set(h.x,22+i*4,h.z);ctx.scene.add(m);smoke.push({m,h,i});}}
 function pool(lx,lz){const [x,z]=P(lx,lz);const m=new THREE.Mesh(new THREE.CircleGeometry(4,18),new THREE.MeshStandardMaterial({color:0x729d22,emissive:0x467517,emissiveIntensity:.7}));m.rotation.x=-Math.PI/2;m.position.set(x,T+.07,z);ctx.scene.add(m);hazards.push({x,z,r:4,pool:true});}
 function gate(name,lx,lz,level,persistent=true,finalBoss=false){const [x,z]=P(lx,lz);const g=ctx.createGate({name,x,z,y:T,level,persistent,finalBoss});if(persistent)permanent.push(g);return g;}
 for(const [x0,z0] of yards){factory(x0+17,z0+17);factory(x0+43,z0+43);}
 // the other corners of each yard (yard-relative 48,12 and 12,48): pools, gates, and the spot where breaches open
 pool(15+48,15+12);pool(15+12,15+48);
 gate('Venom Refinery',85+48,15+12,35);pool(85+12,15+48);
 pool(15+48,85+12);gate('Toxic Waste Vault',15+12,85+48,60);
 gate('Great Venom Sovereign / Recommended level 100',85+48,85+12,100,true,true);
 const breach=[85+12,85+48];

 for(let i=0;i<8;i++){const [x,z]=P(i<4?10+i*40+20:80,i<4?80:10+(i-4)*40+20);const e=ctx.makeMonster(i%2?'venomStalker':'toxicCrawler',25+i*3,new THREE.Vector3(x,T,z));roamers.push({e,home:e.root.position.clone(),timer:0});}
 const [ex,ez2]=P(150,ez);
 ctx.destinations.push({name:'Poison Land',x:ex,z:ez2});
 ctx.interactables.push({pos:new THREE.Vector3(ex,T,ez2),r:4,label:'Poison Land safety notice',action:()=>ctx.toast('Industrial gas and waste damage health. Permanent gates remain; unstable poison portals open periodically. The Sovereign is level 100, but anyone may challenge it.')});

 const onIsland=(x,z)=>x>=bounds.minX&&x<=bounds.maxX&&z>=bounds.minZ&&z<=bounds.maxZ;
 const onBridge=(x,z)=>x>=bx0&&x<=bx1&&Math.abs(z-SPUR.z)<=SPUR.half;
 return {bounds,island:ISLAND,spur:{x0:bx0,x1:bx1,z:SPUR.z,half:SPUR.half},hazards,permanent,roamers,onIsland,get temporary(){return temporary;},
  groundAt(x,z){if(onIsland(x,z))return T;if(onBridge(x,z))return deckAt(x);return x>=590&&x<=850&&z>=190&&z<=450||x>=420&&x<=600&&Math.abs(z-240)<=7?0:null;},
  update(dt){elapsed+=dt;timer-=dt;for(const s of smoke){s.m.position.y=20+(elapsed*2+s.i*5)%18;s.m.scale.setScalar(1+(s.m.position.y-20)*.06);}
 hazardTimer-=dt;const p=ctx.playerPosition();if(hazardTimer<=0&&!ctx.inDungeon()&&onIsland(p.x,p.z)&&p.y<18){const hazard=hazards.find(h=>Math.hypot(p.x-h.x,p.z-h.z)<h.r);if(hazard){ctx.hurt(hazard.pool?8:2.5,p,0);hazardTimer=.5;}}
 if(temporary&&elapsed>=temporary.expires){ctx.removeGate(temporary);temporary=null;}
 if(timer<=0){timer=150;if(!temporary){temporary=gate('Unstable Venom Breach',breach[0],breach[1],45,false);temporary.expires=elapsed+60;ctx.toast('A temporary poison portal has opened in Poison Land for 60 seconds.');}}
 for(const r of roamers){if(!r.e.alive){r.timer+=dt;if(r.timer>90){ctx.removeEnemy(r.e);r.e=ctx.makeMonster('venomStalker',35,r.home.clone());r.timer=0;}}else if(!ctx.inDungeon()&&r.e.root.position.distanceTo(r.home)>70)r.e.root.position.copy(r.home);}
 }};
}
