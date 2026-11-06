// Intercity overhead railway: a maglev line on its own viaduct, 6 m up (18 m where it
// climbs over the river crossing). Every station sits on a straight, level stretch, with:
//   * a platform level with the train floor, alongside the track
//   * stairs from the street up to the platform (walkable), and a lift for one-tap access
//   * railings, a canopy, benches, a live arrival board and name signs
// The train is three cars that follow the track separately, so it bends round corners.
// It stops at each station for 15 s with its doors open: press E on the platform to board,
// and press E when it stops to get off at that station.
import * as THREE from 'three';
import {makeHover} from './hover.js';
import {arrivalBoard,formatWait} from './arrival-boards.js';

const Y = 6;                 // track height at stations
const DECK = Y + 0.6;        // platform top = train floor height
const PLAT_LEN = 42, PLAT_IN = 3.3, PLAT_OUT = 8.4;   // platform: |u| <= 21, v from 3.3 to 8.4 off the track centre
const STAIR_V0 = PLAT_OUT, STAIR_V1 = PLAT_OUT + 3, STAIR_TOP = -6, STAIR_RUN = 12, STAIR_BOT = STAIR_TOP - STAIR_RUN;
const LIFT_U0 = 11, LIFT_U1 = 14;
const CAR_GAP = 13, CARS = [CAR_GAP, 0, -CAR_GAP];
const WAIT = 15, TOP_SPEED = 26;

export const ROUTE = [[100,110,6],[100,170,6],[100,230,18],[100,590,18],[100,650,6],[100,950,6],[460,950,6],[460,700,6],[580,700,6],[580,300,6],[900,300,6],[900,-200,6]];
// Stations: track centre (x, z) on a north-south stretch; side = which side (+1 east, -1 west) the platform is on.
export const STATIONS = [
  {name:'Ashford Outskirts',x:100,z:140,side:1},
  {name:'Riverside Central',x:100,z:925,side:1},   // north of the river channel that runs under the line
  {name:'Capital Central',x:460,z:810,side:1},
  {name:'Poison Land Terminal',x:580,z:440,side:1},
  {name:'Northhaven Central',x:900,z:-120,side:-1},
];

export function buildIntercityRail(ctx){
 const {scene}=ctx;
 const points=ROUTE.map(([x,z,y])=>new THREE.Vector3(x,y,z));
 const cumulative=[0];for(let i=1;i<points.length;i++)cumulative.push(cumulative.at(-1)+points[i].distanceTo(points[i-1]));
 const total=cumulative.at(-1);
 // distance along the line to a point that lies on it
 function distanceTo(x,z){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];const minX=Math.min(a.x,b.x)-.01,maxX=Math.max(a.x,b.x)+.01,minZ=Math.min(a.z,b.z)-.01,maxZ=Math.max(a.z,b.z)+.01;if(x>=minX&&x<=maxX&&z>=minZ&&z<=maxZ)return cumulative[i-1]+Math.hypot(x-a.x,z-a.z);}return 0;}
 const stops=STATIONS.map(s=>({...s,distance:distanceTo(s.x,s.z)}));
 const distances=stops.map(s=>s.distance);
 let distance=distances[0],index=0,direction=1,wait=WAIT,speed=0,rider=false,announced=-1;
 function positionAt(d){d=THREE.MathUtils.clamp(d,0,total);let i=1;while(i<cumulative.length-1&&cumulative[i]<d)i++;return points[i-1].clone().lerp(points[i],(d-cumulative[i-1])/(cumulative[i]-cumulative[i-1]));}

 const mats=new Map();
 const mat=(c,o={})=>{const k=c+JSON.stringify(o);if(!mats.has(k))mats.set(k,new THREE.MeshStandardMaterial({color:c,roughness:o.rough??.7,metalness:o.metal??0,emissive:o.emissive??0,emissiveIntensity:o.ei??1,transparent:o.opacity!=null,opacity:o.opacity??1,depthWrite:o.opacity==null,side:o.double?THREE.DoubleSide:THREE.FrontSide}));return mats.get(k);};
 const geo=new THREE.BoxGeometry(1,1,1);
 function part(w,h,d,x,y,z,c,parent=scene){const m=new THREE.Mesh(geo,c instanceof THREE.Material?c:mat(c));m.scale.set(w,h,d);m.position.set(x,y,z);parent.add(m);return m;}
 const concrete=0x8b949a, darkSteel=mat(0x344c58,{metal:.5,rough:.4}), railMat=mat(0xb4c0c8,{metal:.8,rough:.3});

 // ---------------------------------------------------------------- viaduct
 // Where a station is, the parapet on the platform side is left open so the train meets the platform.
 const openings=stops.map(s=>({x:s.x,z0:s.z-PLAT_LEN/2,z1:s.z+PLAT_LEN/2,side:s.side}));
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],length=a.distanceTo(b),mid=a.clone().lerp(b,.5),g=new THREE.Group();
  g.position.copy(mid);g.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),b.clone().sub(a).normalize());scene.add(g);
  part(7,.6,length,0,-.5,0,0x63727b,g);
  for(const x of [-.8,.8])part(.15,.12,length,x,.1,0,railMat,g);
  for(const x of [-1.05,1.05])part(.22,.05,length,x,.04,0,mat(0x1b2a33,{emissive:0x56c8ff,ei:1.6}),g);   // maglev guide strips
  for(let z=-length/2;z<length/2;z+=3)part(2.4,.1,.3,0,0,z,0x645a50,g);
  // parapets (skip the open platform edge at stations)
  const alongZ=Math.abs(a.x-b.x)<.01;
  for(const sx of [-3.3,3.3]){
   let spans=[[-length/2,length/2]];
   if(alongZ){const sign=Math.sign(b.z-a.z)||1;const worldSide=sign>0?-Math.sign(sx):Math.sign(sx);   // local +x points to world -x when heading +z
    for(const o of openings)if(Math.abs(o.x-a.x)<.01&&o.side===worldSide){const lo=(o.z0-mid.z)*sign,hi=(o.z1-mid.z)*sign;const l0=Math.min(lo,hi),l1=Math.max(lo,hi);spans=spans.flatMap(([p,q])=>l1<=p||l0>=q?[[p,q]]:[[p,l0],[l1,q]].filter(([m,n])=>n-m>.2));}}
   for(const [p,q] of spans)part(.15,1.3,q-p,sx,.65,(p+q)/2,darkSteel,g);
  }
  for(let d=15;d<length;d+=40){const p=a.clone().lerp(b,d/length);part(2,p.y,2,p.x,p.y/2-.8,p.z,concrete);}
  ctx.planeBlocks?.push({minX:Math.min(a.x,b.x)-3.5,maxX:Math.max(a.x,b.x)+3.5,minZ:Math.min(a.z,b.z)-3.5,maxZ:Math.max(a.z,b.z)+3.5,bottom:Math.min(a.y,b.y)-.8,top:Math.max(a.y,b.y)+.2});
 }

 // ---------------------------------------------------------------- the train: three cars
 const cars=CARS.map((off,k)=>{
  const g=new THREE.Group();scene.add(g);
  const paint=mat(0x2b5b8f,{metal:.35,rough:.35}),white=mat(0xe8ebe6,{rough:.4}),glass=mat(0x1d2f3a,{metal:.6,rough:.1}),seatMat=mat(0x715655);
  part(2.9,.25,12,0,.35,0,paint,g);                       // floor
  part(2.9,.2,12,0,2.95,0,white,g);                       // roof
  for(const s of [-1,1]){
   part(.12,.75,12,s*1.42,.85,0,paint,g);                 // lower body
   part(.12,.35,12,s*1.42,2.75,0,paint,g);                // above the windows
   part(.04,1.25,11.6,s*1.45,1.85,0,glass,g);             // window band
   for(let z=-4;z<=4;z+=2)part(.7,.35,1.1,s*.8,.7,z,seatMat,g);
   part(.06,.12,12,s*1.47,1.15,0,mat(0xffc04d,{emissive:0xffc04d,ei:.8}),g);   // stripe
  }
  // sliding doors, two per side, which open at stations
  const doors=[];
  for(const s of [-1,1])for(const dz of [-3,3]){const d=part(1.2,2.2,.08,s*1.48,1.45,dz,mat(0x9fb9c9,{metal:.4,rough:.3}),g);d.userData.home=dz;d.userData.side=s;doors.push(d);}
  // ends: rounded noses on the first and last car, gangway between cars
  for(const end of [-1,1]){
   const isNose=(k===0&&end>0)||(k===CARS.length-1&&end<0);
   if(isNose){const nose=new THREE.Mesh(new THREE.SphereGeometry(1.5,16,10,0,Math.PI*2,0,Math.PI/2),paint);nose.rotation.x=end*Math.PI/2;nose.scale.set(.97,1.6,1.1);nose.position.set(0,1.6,end*6);g.add(nose);
    part(1.9,.7,.05,0,2.1,end*7.05,glass,g);for(const s of [-1,1])part(.35,.18,.05,s*.85,1.0,end*7.1,mat(end>0?0xfff1c4:0xff4a3a,{emissive:end>0?0xfff1c4:0xff4a3a,ei:1.5}),g);}
   else part(2.4,2.4,.15,0,1.6,end*6,paint,g);
  }
  const lamp=part(2.2,.05,10,0,2.82,0,mat(0xfff6e0,{emissive:0xfff6e0,ei:1.2}),g);
  makeHover(g,{lift:.3,bob:.012,width:2.9,length:12,strips:[-1,1].map(x=>({x:x*1.05,z:0,w:.22,d:11}))});
  return {g,off,doors};
 });
 const train=cars[1].g;

 // ---------------------------------------------------------------- stations
 const railMats=mat(0xc9d1d6,{metal:.7,rough:.3}),glassWall=mat(0x9fd3ff,{opacity:.22,double:true,rough:.1});
 const stationColliders=[];
 const ground=ctx.groundY||(()=>0);
 for(const s of stops){
  const v=s.side;   // world x direction of the platform side
  const P=(vv)=>s.x+v*vv;   // u runs along +z, v runs along world x * side
  const cx=P((PLAT_IN+PLAT_OUT)/2), pw=PLAT_OUT-PLAT_IN;
  // platform deck, edge line, tactile strip
  part(pw,.45,PLAT_LEN,cx,DECK-.225,s.z,0xb9beb9);
  part(.35,.02,PLAT_LEN,P(PLAT_IN+.25),DECK+.01,s.z,mat(0xffd23f,{rough:.9}));
  // platform support columns
  for(const dz of [-16,-5,6,17])part(1,DECK-.45,1,cx,(DECK-.45)/2,s.z+dz,concrete);
  // canopy with posts
  part(pw+1,.18,PLAT_LEN-6,cx-v*.3,DECK+3.6,s.z,0x2f4a5a);
  for(const dz of [-16,-8,0,8,16])part(.16,3.6,.16,P(PLAT_OUT-.6),DECK+1.8,s.z+dz,darkSteel);
  // lights under the canopy
  for(const dz of [-12,0,12])part(1.6,.06,.4,cx,DECK+3.48,s.z+dz,mat(0xfff6e0,{emissive:0xfff6e0,ei:1.4}));
  // railings (each one is only solid at its own height, so the street below stays open)
  const rail=(x0,x1,z0,z1,base)=>{const w=Math.max(.08,x1-x0),d=Math.max(.08,z1-z0),y=base===DECK?DECK:0;
   if(base===DECK){part(w,.06,d,(x0+x1)/2,DECK+1.05,(z0+z1)/2,railMats);const n=Math.max(1,Math.round(Math.max(w,d)/2));for(let t=0;t<=n;t++)part(.06,1.05,.06,x0+(x1-x0)*t/n,DECK+.52,z0+(z1-z0)*t/n,railMats);}
   stationColliders.push({minX:x0-.12,maxX:x1+.12,minZ:z0-.12,maxZ:z1+.12,base:typeof base==='function'?base:()=>base});};
  const X=vv=>P(vv),lo=(a,b)=>Math.min(X(a),X(b)),hi=(a,b)=>Math.max(X(a),X(b));
  rail(X(PLAT_OUT),X(PLAT_OUT),s.z-PLAT_LEN/2,s.z+STAIR_TOP,DECK);                 // outer edge, before the stair landing
  rail(X(PLAT_OUT),X(PLAT_OUT),s.z+LIFT_U0,s.z+PLAT_LEN/2,DECK);                   // outer edge, after the lift walkway
  for(const end of [-1,1])rail(lo(PLAT_IN,PLAT_OUT),hi(PLAT_IN,PLAT_OUT),s.z+end*PLAT_LEN/2,s.z+end*PLAT_LEN/2,DECK);
  rail(X(STAIR_V1),X(STAIR_V1),s.z+STAIR_TOP,s.z+LIFT_U0,DECK);                    // landing + walkway outer edge
  rail(lo(STAIR_V0,STAIR_V1),hi(STAIR_V0,STAIR_V1),s.z+LIFT_U0,s.z+LIFT_U0,DECK);  // end of the walkway (lift door)
  // stair landing (level with the platform), the stairs, and the walkway to the lift
  const sx=P((STAIR_V0+STAIR_V1)/2),sxLo=lo(STAIR_V0,STAIR_V1),sxHi=hi(STAIR_V0,STAIR_V1);
  part(3,.45,LIFT_U0-STAIR_TOP,sx,DECK-.225,s.z+(STAIR_TOP+LIFT_U0)/2,0xb9beb9);
  const steps=Math.round(DECK/.2);
  for(let i=0;i<steps;i++){const h=(i+1)*DECK/steps,z=s.z+STAIR_BOT+(i+.5)*STAIR_RUN/steps;part(3,h,STAIR_RUN/steps+.02,sx,h/2,z,i%2?0xa7aca8:0xb3b8b4);}
  for(const vv of [STAIR_V0,STAIR_V1]){const x=P(vv);const r=new THREE.Mesh(geo,railMats);const len=Math.hypot(STAIR_RUN,DECK);r.scale.set(.07,.07,len);r.position.set(x,DECK/2+1,s.z+STAIR_BOT+STAIR_RUN/2);r.rotation.x=-Math.atan2(DECK,STAIR_RUN);scene.add(r);}
  const stairH=(x,z)=>THREE.MathUtils.clamp((z-(s.z+STAIR_BOT))/STAIR_RUN,0,1)*DECK;
  for(const vv of [STAIR_V0,STAIR_V1])rail(X(vv),X(vv),s.z+STAIR_BOT,s.z+STAIR_TOP,stairH);
  // street level: the high part of the stairs and the platform columns are solid
  rail(sxLo,sxHi,s.z+STAIR_BOT+STAIR_RUN*.45,s.z+STAIR_TOP,0);
  for(const dz of [-16,-5,6,17])rail(cx-.5,cx+.5,s.z+dz-.5,s.z+dz+.5,0);
  // lift shaft at the other end, with call points top and bottom
  const lx=P((STAIR_V0+STAIR_V1)/2),lz=s.z+(LIFT_U0+LIFT_U1)/2;
  part(3,DECK+3,3,lx,(DECK+3)/2,lz,glassWall);
  for(const [dx,dz] of [[-1.5,-1.5],[1.5,-1.5],[-1.5,1.5],[1.5,1.5]])part(.12,DECK+3,.12,lx+dx,(DECK+3)/2,lz+dz,darkSteel);
  const cab=part(2.6,2.4,2.6,lx,1.25,lz,mat(0xd9dde0,{metal:.5,rough:.35}));
  rail(lx-1.5,lx+1.5,lz-1.5,lz+1.5,0);
  // street-level entrance: sign, ticket machine
  ctx.sign?.(s.name.toUpperCase()+' STATION',sx,4.2,s.z+STAIR_BOT-1.6,10);
  part(.7,1.6,.5,P(STAIR_V1+1.4),.8,s.z+STAIR_BOT-.8,mat(0x2f6f8f));part(.5,.35,.02,P(STAIR_V1+1.4),1.2,s.z+STAIR_BOT-.54,mat(0x9fe8ff,{emissive:0x9fe8ff,ei:.8}));
  // name signs on the platform and a live arrival board
  ctx.sign?.(s.name.toUpperCase(),cx,DECK+2.9,s.z-10,6);
  ctx.sign?.(s.name.toUpperCase(),cx,DECK+2.9,s.z+10,6);
  s.board=arrivalBoard(ctx,s.name.toUpperCase()+' · INTERCITY',cx,DECK+2.2,s.z,v>0?-Math.PI/2:Math.PI/2);
  s.board.mesh.position.x=P(PLAT_OUT-.4);
  // benches
  for(const dz of [-14,-2,12]){part(.6,.12,2.4,P(PLAT_OUT-1.1),DECK+.5,s.z+dz,0x6e6051);part(.1,.5,2.4,P(PLAT_OUT-.8),DECK+.8,s.z+dz,0x6e6051);ctx.sitSpots?.push({x:P(PLAT_OUT-1.1),z:s.z+dz,yaw:v>0?-Math.PI/2:Math.PI/2,seatY:DECK+.85,label:'Sit and wait for the train'});}
  ctx.destinations?.push({name:s.name+' railway station',x:sx,z:s.z+STAIR_BOT-3});
  // interactions
  const liftBottom=new THREE.Vector3(P(STAIR_V1+1.6),.3,lz),liftTop=new THREE.Vector3(lx,DECK,s.z+LIFT_U0-1.2);
  ctx.interactables.push({pos:liftBottom,r:2.6,label:'Take the lift up to the '+s.name+' platform',action:()=>{ctx.move(new THREE.Vector3(lx,DECK,s.z+LIFT_U0-1.6));ctx.toast(s.name+': platform level. The arrival board shows when the next train comes.');}});
  ctx.interactables.push({pos:liftTop,r:2.2,label:'Take the lift down to the street',action:()=>ctx.move(new THREE.Vector3(P(STAIR_V1+2),.3,lz))});
  const boardSpot={pos:new THREE.Vector3(P(PLAT_IN+1.2),DECK,s.z),r:PLAT_LEN/2+1,label:'Board the intercity train',action:()=>boardAt(s)};
  // the boarding spot covers the whole platform edge: it only reaches when you stand near the edge
  s.boardSpot=boardSpot;ctx.interactables.push(boardSpot);
  s.cab=cab;s.liftX=lx;s.liftZ=lz;
 }
 // Station railings and solid stair bases: only active at the right height.
 for(const c of stationColliders){const base=c.base;ctx.colliders?.push({minX:c.minX,maxX:c.maxX,minZ:c.minZ,maxZ:c.maxZ,baseYAt:base});}

 function boardAt(s){
  if(rider){leave();return;}
  if(!ctx.canBoard())return;
  const i=stops.indexOf(s);
  if(wait<=0||index!==i){ctx.toast(`The train isn't here yet. Next train: ${etaText(i)}.`);return;}
  rider=true;ctx.prepare();announced=index;
  ctx.toast('You board the intercity train. It stops at every station — press E (or the action button) when it stops to get off.');
 }
 function leave(){
  if(!rider)return;
  if(wait<=0){ctx.toast('Wait until the train stops at a station.');return;}
  const s=stops[index];rider=false;
  ctx.move(new THREE.Vector3(s.x+s.side*(PLAT_IN+1.6),DECK,s.z));
  ctx.toast('You step off at '+s.name+'. Stairs and the lift lead down to the street.');
 }
 // seconds until the train next stops (doors open) at station i
 function eta(i){
  if(wait>0&&index===i)return 0;
  let t=wait>0?wait:0,d=distance,idx=index,dir=direction;
  if(wait>0){dir=idx===stops.length-1?-1:idx===0?1:dir;idx+=dir;}
  for(let n=0;n<stops.length*2;n++){t+=Math.abs(distances[idx]-d)/(TOP_SPEED*.8)+4;d=distances[idx];if(idx===i)return t;t+=WAIT;dir=idx===stops.length-1?-1:idx===0?1:dir;idx+=dir;}
  return t;
 }
 const etaText=i=>{const e=eta(i);return e<=0?'boarding now':formatWait(e);};
 let boardT=0;
 const setCar=(c,d)=>{const p=positionAt(d),a=positionAt(d+1),b=positionAt(d-1);c.g.position.copy(p);if(a.distanceTo(b)>.01){c.g.rotation.y=Math.atan2(a.x-b.x,a.z-b.z);c.g.rotation.x=-Math.atan2(a.y-b.y,Math.hypot(a.x-b.x,a.z-b.z));}};
 function update(dt){
  if(wait>0){
   wait-=dt;speed=0;
   if(wait<=0){direction=index===stops.length-1?-1:index===0?1:direction;index+=direction;if(rider)ctx.toast('Doors closing. Next stop: '+stops[index].name+'.');}
  }else{
   const delta=distances[index]-distance;speed=Math.min(TOP_SPEED,Math.sqrt(5*Math.abs(delta)));
   distance+=Math.sign(delta)*Math.min(Math.abs(delta),Math.max(.2,speed)*dt);
   if(Math.abs(delta)<.1){distance=distances[index];wait=WAIT;speed=0;if(rider&&announced!==index){announced=index;ctx.toast('Now at '+stops[index].name+'. Press E (or the action button) to get off.');}}
  }
  for(const c of cars)setCar(c,distance+c.off);
  // doors slide open while stopped
  const open=wait>0?Math.min(1,(WAIT-wait)*2,wait*2):0;
  for(const c of cars)for(const d of c.doors)d.position.z=d.userData.home+open*1.1;
  if(rider)ctx.carry(cars[1].g.position.clone().add(new THREE.Vector3(0,.7,0)));
  // boarding prompts only show when standing near the platform edge
  for(let i=0;i<stops.length;i++){const s=stops[i];s.boardSpot.label=wait>0&&index===i?'Board the intercity train':'Next intercity train: '+etaText(i);}
  boardT-=dt;if(boardT<=0){boardT=1;for(let i=0;i<stops.length;i++){const s=stops[i],e=eta(i);const next=stops[(wait>0&&index===i)?THREE.MathUtils.clamp(index+(index===stops.length-1?-1:index===0?1:direction),0,stops.length-1):index];s.board.update(e<=0?'BOARDING NOW':'NEXT TRAIN '+formatWait(e),e<=0?'Doors close in '+Math.ceil(wait)+' s · next stop '+next.name:'Towards '+(direction>0?stops.at(-1).name:stops[0].name));}}
 }
 // Floors: platforms, landings and stairs count only when you're at (or just below) their height,
 // so the street underneath stays walkable.
 function groundAt(x,z,bodyY=0){
  for(const s of stops){
   const v=(x-s.x)*s.side,u=z-s.z;
   if(u<STAIR_BOT-.5||u>PLAT_LEN/2+.5||v<-3.6||v>STAIR_V1+.4)continue;
   if(v>=-3.6&&v<PLAT_IN&&Math.abs(u)<=PLAT_LEN/2&&bodyY>Y-1)return Y+.12;                     // track deck beside the platform
   if(v>=PLAT_IN&&v<=PLAT_OUT+.05&&Math.abs(u)<=PLAT_LEN/2&&bodyY>DECK-1.3)return DECK;          // platform
   if(v>PLAT_OUT-.05&&v<=STAIR_V1+.2){
    if(u>=STAIR_TOP&&u<=LIFT_U0&&bodyY>DECK-1.3)return DECK;                                     // landing and walkway to the lift
    if(u>=STAIR_BOT&&u<STAIR_TOP){const h=Math.ceil((u-STAIR_BOT)/STAIR_RUN*Math.round(DECK/.2))*DECK/Math.round(DECK/.2);if(bodyY>h-1)return h;}
   }
  }
  return null;
 }
 return {stops,train,cars,get rider(){return rider;},get state(){return {distance,index,direction,wait,speed};},leave,eta,
  reset(){rider=false;},
  snapshot(){return {distance,index,direction,wait,rider};},
  restore(s){if(!s)return;distance=THREE.MathUtils.clamp(s.distance||0,0,total);index=THREE.MathUtils.clamp(s.index||0,0,stops.length-1);direction=s.direction===-1?-1:1;wait=Math.max(0,s.wait||0);rider=!!s.rider;},
  groundAt,update};
}
