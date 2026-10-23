import * as THREE from 'three';
import {ROAD_LAYOUT} from './junction-control.js';
export function buildActiveRoadUsers({makeVehicle,makePerson,controller,travelLimit,groundY}){
 const riders=[],cycles=[];
 for(const kind of ['bicycle','motorcycle'])for(let i=0;i<6;i++){
  const v=makeVehicle(kind,[0x466b72,0x9f3e33,0xcac6b0][i%3]);v.routeTraffic=true;v.noSteal=true;v.ai={cruise:kind==='bicycle'?4.5:10,stopTimer:0};
  const direction=i%2?-1:1,lane=kind==='bicycle'?ROAD_LAYOUT.cycleLane:ROAD_LAYOUT.carLane;
  v.group.position.set(20+i*80,0,-direction*lane);v.group.rotation.y=direction*Math.PI/2;
  const h=makePerson({outfit:kind==='motorcycle'?0x26343d:0x527b6c,hair:0x292c2e,pants:0x293741});v.group.add(h.root);
  h.root.position.set(0,.13,-.27);h.rig.scale.setScalar(.82);
  h.armL.pivot.rotation.x=h.armR.pivot.rotation.x=-1.03;h.armL.pivot.rotation.z=-.18;h.armR.pivot.rotation.z=.18;
  h.legL.pivot.rotation.x=h.legR.pivot.rotation.x=-.76;
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.205,16,12),new THREE.MeshStandardMaterial({color:kind==='motorcycle'?0x30373b:0xd6dbca,roughness:.55}));helmet.position.set(0,1.86,-.02);h.rig.add(helmet);
  const visor=new THREE.Mesh(new THREE.BoxGeometry(.3,.1,.08),new THREE.MeshStandardMaterial({color:0x435c68,metalness:.45,roughness:.2}));visor.position.set(0,1.86,.16);h.rig.add(visor);
  const rider={v,h,direction,lane,position:v.group.position,target:new THREE.Vector3(direction>0?580:20,0,-direction*lane)};riders.push(rider);if(kind==='bicycle')cycles.push(rider);
 }
 return {riders,cycles,update(dt){
  for(const r of riders){const {v}=r;if(v.disabled||!v.routeTraffic)continue;
   const p=v.group.position,dir={x:r.direction,z:0};
   let desired=v.ai.cruise;const requested=desired*dt;
   const allowed=v.kind==='bicycle'?controller.limitTravel(p,dir,requested,{kind:'bicycle',length:v.length}):travelLimit(p,dir,requested,v);
   v.speed=dt>0?allowed/dt:0;p.x+=r.direction*allowed;p.y=groundY(p.x,p.z,p.y);
   for(const wheel of v.wheels)wheel.rotation.x+=v.speed*dt/.36;
   if(v.kind==='bicycle'){const phase=p.x*.7;for(const [h,offset]of [[r.h.legL,0],[r.h.legR,Math.PI]])h.pivot.rotation.x=-.75+Math.sin(phase+offset)*.17;}
   if(p.x>579||p.x<21){r.direction*=-1;p.x=THREE.MathUtils.clamp(p.x,21,579);p.z=-r.direction*r.lane;v.group.rotation.y=r.direction*Math.PI/2;r.target.set(r.direction>0?580:20,0,p.z);}
  }
 }};
}
