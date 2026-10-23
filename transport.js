import * as THREE from 'three';
import {arrivalBoard,formatWait,railArrival} from './arrival-boards.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {ROAD_LAYOUT} from './junction-control.js';
export function buildTransport(ctx){
 const {scene,box,interactables,makePerson,animatePerson,toast}=ctx;const services=[],stopBoards=[];let boardTimer=0;
 function vehicle(name,x,z,length,color){const g=new THREE.Group();scene.add(g);const add=(w,h,d,px,py,pz,c)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c}));m.position.set(px,py,pz);g.add(m);return m;};add(length,2.2,2.7,0,1.5,0,color);for(let px=-length/2+1;px<length/2;px+=2)for(const side of [-1,1])add(1.3,1,.05,px,2,side*1.37,0x698c9f);for(const px of [-length/2+2,length/2-2])for(const side of [-1,1])add(.7,.7,.25,px,.5,side*1.45,0x232b31);g.position.set(x,0,z);return {name,g,add};}
 const tram=vehicle('Tram',20,ROAD_LAYOUT.tramZ,18,0x448b88),train=vehicle('Train',-220,155,32,0x334f86);
 // Replace the tram's solid box with a rounded carriage and separate windows.
 for(const m of [...tram.g.children]){tram.g.remove(m);m.geometry.dispose();m.material.dispose();}
 const tramPaint=new THREE.MeshStandardMaterial({color:0x2f7c83,metalness:.3,roughness:.4});
 const shell=new THREE.Mesh(new RoundedBoxGeometry(18,2.65,2.7,3,.22),tramPaint);shell.position.y=1.65;tram.g.add(shell);
 tram.add(17.8,.38,2.69,0,2.77,0,0xe6e4d8);
 for(const side of [-1,1]){
  for(let px=-7.7;px<8;px+=1.8){tram.add(1.46,1.05,.035,px,2.02,side*1.36,0x29434e);tram.add(1.58,.055,.08,px,1.44,side*1.4,0xb1bab9);}
  for(const px of [-4.8,4.5]){tram.add(1.1,2,.05,px,1.52,side*1.39,0x6e9da0);tram.add(.035,1.9,.035,px,1.55,side*1.44,0x203b44);tram.add(.9,.8,.025,px,2.0,side*1.43,0x29434e);}
  tram.add(17.8,.18,.07,0,.66,side*1.39,0xe6e4d8);
  for(const px of [-6,6]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.2,16),new THREE.MeshStandardMaterial({color:0x24292c}));wheel.rotation.x=Math.PI/2;wheel.position.set(px,.4,side*1.2);tram.g.add(wheel);}
 }
 for(const end of [-1,1]){tram.add(.04,1.25,2.15,end*9.01,2,0,0x29434e);for(const side of [-1,1])tram.add(.05,.18,.3,end*9.04,.91,side*.86,end>0?0xffedc3:0xdb4d44);}
 tram.add(.15,2,.15,0,3.4,0,0x434b52);tram.add(6,.1,.1,0,4.4,0,0x434b52);
 for(const [min,max,z]of [[20,590,ROAD_LAYOUT.tramZ],[-220,100,155]]){box(max-min,.04,3.1,(min+max)/2,.075,z,0x667371,false);for(const offset of [-.8,.8])box(max-min,.045,.09,(min+max)/2,.12,z+offset,new THREE.MeshStandardMaterial({color:0xc1ced7,metalness:.8,roughness:.25}),false);for(let x=min;x<=max;x+=2)box(.18,.035,2.1,x,.105,z,0x4e5755,false);}
 services.push({...tram,length:18,stops:[20,300,420,580],z:ROAD_LAYOUT.tramZ,index:0,direction:1,speed:0,wait:10,doors:true});services.push({...train,length:32,stops:[-220,-100,100],z:155,index:0,direction:1,speed:0,wait:12,doors:true});
 for(const s of services)for(const x of s.stops){
 const platformZ=s.z+(s.name==='Train'?6:-10);
 const seat={x:x+6,z:platformZ,yaw:Math.PI,seatY:.75,label:'Sit at '+s.name.toLowerCase()+' stop'};ctx.sitSpots?.push(seat);box(3,.15,.7,seat.x,.675,seat.z,0x6e6051,false);box(3,.65,.1,seat.x,1,seat.z+.3,0x6e6051,false);for(const dx of [-1,1])box(.12,.6,.5,seat.x+dx,.3,seat.z,0x3a454f,false);
 const board=arrivalBoard(ctx,s.name.toUpperCase()+' STOP '+(s.stops.indexOf(x)+1),x-5,2.2,platformZ-1.2);stopBoards.push({s,x,board});
 if(ctx.makeTex){const map=ctx.makeTex(512,96,g=>{g.fillStyle='#243949';g.fillRect(0,0,512,96);g.fillStyle='white';g.font='bold 30px sans-serif';g.textAlign='center';g.fillText(s.name.toUpperCase()+' STOP',256,60);});const sign=new THREE.Mesh(new THREE.PlaneGeometry(6,1.1),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));sign.position.set(x,2.7,platformZ-1.5);scene.add(sign);}box(22,.25,4,x,.125,platformZ,0x9b9d94,false);box(20,.2,4,x,3.4,platformZ,0x4b636b,false);for(const dx of [-8,8])box(.15,3.4,.15,x+dx,1.7,platformZ-1.4,0x4b636b,false);}
 const plane=vehicle('Scheduled regional flight',-550,-400,20,0xd8e3e8);plane.g.rotation.y=Math.PI/2;plane.add(3,.2,23,0,1.4,0,0xcedbe1);plane.add(.2,4,3,-8,3,0,0x456b93);plane.g.position.y=60;
 plane.g.position.set(-617,0,24);const airport={...plane,state:'parked',timer:0,doors:false,pathIndex:0,passengerPhase:0};
 const people=[];for(let i=0;i<8;i++){const h=makePerson({outfit:[0x8b6353,0x517f6c,0x6e6892][i%3],hair:0x44362b,pants:0x344455});h.root.visible=false;people.push({h,phase:i});}
 const transit={services,airport,people,rider:null};
 for(const s of [...services,airport]){const interaction={pos:new THREE.Vector3(),r:4,label:'Board '+s.name,action:()=>{if(transit.rider===s){if(!s.doors){toast('Wait until the vehicle stops and its doors open.');return;}ctx.leave(s.g.position.clone().add(new THREE.Vector3(0,0,s.name==='Train'?5:-10)));transit.rider=null;return;}if(!s.doors){toast('Wait for arrival and boarding.');return;}if(transit.rider||!ctx.canBoard()){toast('Finish your current action before boarding.');return;}transit.rider=s;ctx.board();toast('Aboard '+s.name+'. Use Interact at a stop to leave.');}};s.interaction=interaction;interactables.push(interaction);}
 function moveTo(s,target,speed,dt){const delta=target.clone().sub(s.g.position),distance=delta.length();if(distance<speed*dt){s.g.position.copy(target);return true;}s.g.position.addScaledVector(delta.normalize(),speed*dt);s.g.rotation.y=Math.atan2(delta.x,delta.z)-Math.PI/2;return false;}
 const taxi=[new THREE.Vector3(-550,0,-160),new THREE.Vector3(-598,0,-160),new THREE.Vector3(-598,0,24),new THREE.Vector3(-617,0,24)];
 function update(dt){


  for(const s of services){const previousX=s.g.position.x;if(s.collisionStop>0){s.collisionStop=Math.max(0,s.collisionStop-dt);s.velocityX=0;continue;}if(s.doors){s.wait-=dt;if(s.wait<=0){s.doors=false;s.direction=s.index===s.stops.length-1?-1:s.index===0?1:s.direction;s.index+=s.direction;}}else{const target=s.stops[s.index],distance=Math.abs(target-s.g.position.x);s.speed=Math.min(s.name==='Train'?18:8,Math.sqrt(2*3*distance));const direction=Math.sign(target-s.g.position.x),requested=Math.min(distance,Math.max(.2,s.speed)*dt),travel=s.name==='Tram'&&ctx.tramTravelLimit?ctx.tramTravelLimit(s.g.position,{x:direction,z:0},requested,s):requested;s.g.position.x+=direction*travel;if(travel<requested-.0001)s.speed=0;if(distance<.1){s.g.position.x=target;s.doors=true;s.wait=10;s.speed=0;}}s.velocityX=dt>0?(s.g.position.x-previousX)/dt:0;}
  const a=airport;a.timer+=dt;
  if(a.state==='parked'&&a.timer>45){a.state='boarding';a.doors=true;a.timer=0;}
  else if(a.state==='approach'){if(moveTo(a,new THREE.Vector3(-550,0,-220),18,dt)){a.state='taxi-in';a.pathIndex=0;a.timer=0;}}
  else if(a.state==='taxi-in'){if(moveTo(a,taxi[a.pathIndex],7,dt)){a.pathIndex++;if(a.pathIndex===taxi.length){a.state='unloading';a.doors=true;a.timer=0;}}}
  else if(a.state==='unloading'&&a.timer>=14){a.state='parked';a.doors=false;a.timer=0;}
  else if(a.state==='boarding'&&a.timer>=20){a.state='taxi-out';a.pathIndex=taxi.length-2;a.doors=false;a.timer=0;}
  else if(a.state==='taxi-out'){if(moveTo(a,taxi[a.pathIndex],7,dt)){a.pathIndex--;if(a.pathIndex<0){a.state='takeoff';a.timer=0;}}}
  else if(a.state==='takeoff'){if(moveTo(a,new THREE.Vector3(-550,70,390),28,dt)){a.state='cruise';a.timer=0;}}
  else if(a.state==='cruise'){if(moveTo(a,new THREE.Vector3(-550,60,-400),30,dt)){a.state='approach';a.timer=0;}}
  for(const p of people){const unloading=a.state==='unloading',boarding=a.state==='boarding',progress=Math.min(1,a.timer/10);p.h.root.visible=unloading||boarding;if(p.h.root.visible){const t=boarding?1-progress:progress;p.h.root.position.set(-623-t*25,0,24+t*30+p.phase*.6);p.h.root.rotation.y=boarding?Math.PI/2:-Math.PI/2;animatePerson(p.h,true,dt);}}
  for(const s of [...services,a]){s.interaction.pos.copy(s.g.position).add(new THREE.Vector3(0,0,s.name==='Train'?3:-9));s.interaction.label=transit.rider===s?'Leave '+s.name:'Board '+s.name;s.g.visible=!(transit.rider===s&&ctx.firstPerson());}
 boardTimer-=dt;if(boardTimer<=0){boardTimer=1;for(const {s,x,board}of stopBoards){const eta=railArrival(s,x);board.update(eta?.boarding?'BOARDING NOW':eta?'ARRIVAL ~'+formatWait(eta.seconds):'NO SERVICE',eta?.boarding?'Doors close in '+Math.ceil(eta.seconds)+' seconds':'Estimated from vehicle location');}}
  if(transit.rider)ctx.carry(transit.rider.g.position.clone().add(new THREE.Vector3(0,.7,0)));
 }
 return {...transit,stopBoards,snapshot(){return {rider:transit.rider?.name,vehicles:[...services,airport].map(s=>({name:s.name,position:s.g.position.toArray(),index:s.index,direction:s.direction,speed:s.speed,wait:s.wait,doors:s.doors,state:s.state,timer:s.timer,pathIndex:s.pathIndex}))};},restore(save){if(!save)return;for(const record of save.vehicles||[]){const s=[...services,airport].find(v=>v.name===record.name);if(s){s.g.position.fromArray(record.position);for(const key of ['index','direction','speed','wait','doors','state','timer','pathIndex'])if(record[key]!=null)s[key]=record[key];}}transit.rider=[...services,airport].find(s=>s.name===save.rider)||null;},groundAt(x,z){for(const s of services)for(const stop of s.stops){if(Math.abs(x-stop)<=11&&Math.abs(z-(s.z+(s.name==='Train'?6:-4)))<=2)return .25;}return null;},cancel(){if(transit.rider){ctx.leave(transit.rider===airport?new THREE.Vector3(-645,0,54):new THREE.Vector3(transit.rider.g.position.x,0,transit.rider.z-10));transit.rider=null;}},get rider(){return transit.rider;},update,leave(){if(transit.rider)transit.rider.interaction.action();}};
}
