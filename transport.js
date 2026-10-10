import * as THREE from 'three';
import {arrivalBoard,formatWait,railArrival} from './arrival-boards.js';
export function buildTransport(ctx){
 const {scene,box,interactables,makePerson,animatePerson,toast}=ctx;const services=[],stopBoards=[];let boardTimer=0;
 function vehicle(name,x,z,length,color){const g=new THREE.Group();scene.add(g);const add=(w,h,d,px,py,pz,c)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c}));m.position.set(px,py,pz);g.add(m);return m;};add(length,2.2,2.7,0,1.5,0,color);for(let px=-length/2+1;px<length/2;px+=2)for(const side of [-1,1])add(1.3,1,.05,px,2,side*1.37,0x698c9f);for(const px of [-length/2+2,length/2-2])for(const side of [-1,1])add(.7,.7,.25,px,.5,side*1.45,0x232b31);g.position.set(x,0,z);return {name,g,add};}
 const tram=vehicle('Tram',20,-4,18,0x448b88),train=vehicle('Train',-220,155,32,0x334f86);
 tram.add(.15,2,.15,0,3.4,0,0x434b52);tram.add(6,.1,.1,0,4.4,0,0x434b52);
 for(const [min,max,z]of [[20,590,-4],[-220,100,155]]){box(max-min,.08,2.8,(min+max)/2,.16,z,0x555b60,false);for(const offset of [-.8,.8])box(max-min,.12,.16,(min+max)/2,.24,z+offset,new THREE.MeshStandardMaterial({color:0xc1ced7,metalness:.8,roughness:.25}),false);for(let x=min;x<=max;x+=2)box(.22,.05,2.4,x,.225,z,0x75614e,false);}
 services.push({...tram,stops:[20,310,410,590],z:-4,index:0,direction:1,speed:0,wait:10,doors:true});services.push({...train,stops:[-220,-100,100],z:155,index:0,direction:1,speed:0,wait:12,doors:true});
 for(const s of services)for(const x of s.stops){
 const platformZ=s.z+(s.name==='Train'?6:-4);
 const seat={x:x+6,z:platformZ,yaw:Math.PI,seatY:.75,label:'Sit at '+s.name.toLowerCase()+' stop'};ctx.sitSpots?.push(seat);box(3,.15,.7,seat.x,.675,seat.z,0x6e6051,false);box(3,.65,.1,seat.x,1,seat.z+.3,0x6e6051,false);for(const dx of [-1,1])box(.12,.6,.5,seat.x+dx,.3,seat.z,0x3a454f,false);
 const board=arrivalBoard(ctx,s.name.toUpperCase()+' STOP '+(s.stops.indexOf(x)+1),x-5,2.2,platformZ-1.2);stopBoards.push({s,x,board});
 if(ctx.makeTex){const map=ctx.makeTex(512,96,g=>{g.fillStyle='#243949';g.fillRect(0,0,512,96);g.fillStyle='white';g.font='bold 30px sans-serif';g.textAlign='center';g.fillText(s.name.toUpperCase()+' STOP',256,60);});const sign=new THREE.Mesh(new THREE.PlaneGeometry(6,1.1),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));sign.position.set(x,2.7,platformZ-1.5);scene.add(sign);}box(22,.25,4,x,.125,platformZ,0x9b9d94,false);box(20,.2,4,x,3.4,platformZ,0x4b636b,false);for(const dx of [-8,8])box(.15,3.4,.15,x+dx,1.7,platformZ-1.4,0x4b636b,false);}
 const plane=vehicle('Scheduled regional flight',-550,-400,20,0xd8e3e8);plane.g.rotation.y=Math.PI/2;plane.add(3,.2,23,0,1.4,0,0xcedbe1);plane.add(.2,4,3,-8,3,0,0x456b93);plane.g.position.y=60;
 const airport={...plane,state:'approach',timer:0,doors:false,pathIndex:0,passengerPhase:0};
 const people=[];for(let i=0;i<8;i++){const h=makePerson({outfit:[0x8b6353,0x517f6c,0x6e6892][i%3],hair:0x44362b,pants:0x344455});h.root.visible=false;people.push({h,phase:i});}
 const transit={services,airport,people,rider:null};
 for(const s of [...services,airport]){const interaction={pos:new THREE.Vector3(),r:4,label:'Board '+s.name,action:()=>{if(transit.rider===s){if(!s.doors){toast('Wait until the vehicle stops and its doors open.');return;}ctx.leave(s.g.position.clone().add(new THREE.Vector3(0,0,s.name==='Train'?5:-5)));transit.rider=null;return;}if(!s.doors){toast('Wait for arrival and boarding.');return;}if(transit.rider||!ctx.canBoard()){toast('Finish your current action before boarding.');return;}transit.rider=s;ctx.board();toast('Aboard '+s.name+'. Use Interact at a stop to leave.');}};s.interaction=interaction;interactables.push(interaction);}
 function moveTo(s,target,speed,dt){const delta=target.clone().sub(s.g.position),distance=delta.length();if(distance<speed*dt){s.g.position.copy(target);return true;}s.g.position.addScaledVector(delta.normalize(),speed*dt);s.g.rotation.y=Math.atan2(delta.x,delta.z)-Math.PI/2;return false;}
 const taxi=[new THREE.Vector3(-550,0,-160),new THREE.Vector3(-598,0,-160),new THREE.Vector3(-598,0,24),new THREE.Vector3(-617,0,24)];
 function update(dt){


  for(const s of services){if(s.doors){s.wait-=dt;if(s.wait<=0){s.doors=false;s.direction=s.index===s.stops.length-1?-1:s.index===0?1:s.direction;s.index+=s.direction;}}else{const target=s.stops[s.index],distance=Math.abs(target-s.g.position.x);s.speed=Math.min(s.name==='Train'?18:8,Math.sqrt(2*3*distance));s.g.position.x+=Math.sign(target-s.g.position.x)*Math.min(distance,Math.max(.2,s.speed)*dt);if(distance<.1){s.g.position.x=target;s.doors=true;s.wait=10;s.speed=0;}}}
  const a=airport;a.timer+=dt;
  if(a.state==='approach'){if(moveTo(a,new THREE.Vector3(-550,0,-220),18,dt)){a.state='taxi-in';a.pathIndex=0;a.timer=0;}}
  else if(a.state==='taxi-in'){if(moveTo(a,taxi[a.pathIndex],7,dt)){a.pathIndex++;if(a.pathIndex===taxi.length){a.state='unloading';a.doors=true;a.timer=0;}}}
  else if(a.state==='unloading'&&a.timer>=14){a.state='boarding';a.timer=0;}
  else if(a.state==='boarding'&&a.timer>=20){a.state='taxi-out';a.pathIndex=taxi.length-2;a.doors=false;a.timer=0;}
  else if(a.state==='taxi-out'){if(moveTo(a,taxi[a.pathIndex],7,dt)){a.pathIndex--;if(a.pathIndex<0){a.state='takeoff';a.timer=0;}}}
  else if(a.state==='takeoff'){if(moveTo(a,new THREE.Vector3(-550,70,390),28,dt)){a.state='cruise';a.timer=0;}}
  else if(a.state==='cruise'&&a.timer>30){a.g.position.set(-550,60,-400);a.state='approach';a.timer=0;}
  for(const p of people){const unloading=a.state==='unloading',boarding=a.state==='boarding',progress=Math.min(1,a.timer/10);p.h.root.visible=unloading||boarding;if(p.h.root.visible){const t=boarding?1-progress:progress;p.h.root.position.set(-623-t*25,0,24+t*30+p.phase*.6);p.h.root.rotation.y=boarding?Math.PI/2:-Math.PI/2;animatePerson(p.h,true,dt);}}
  for(const s of [...services,a]){s.interaction.pos.copy(s.g.position).add(new THREE.Vector3(0,0,s.name==='Train'?3:-3));s.interaction.label=transit.rider===s?'Leave '+s.name:'Board '+s.name;s.g.visible=!(transit.rider===s&&ctx.firstPerson());}
 boardTimer-=dt;if(boardTimer<=0){boardTimer=1;for(const {s,x,board}of stopBoards){const eta=railArrival(s,x);board.update(eta?.boarding?'BOARDING NOW':eta?'ARRIVAL ~'+formatWait(eta.seconds):'NO SERVICE',eta?.boarding?'Doors close in '+Math.ceil(eta.seconds)+' seconds':'Estimated from vehicle location');}}
  if(transit.rider)ctx.carry(transit.rider.g.position.clone().add(new THREE.Vector3(0,.7,0)));
 }
 return {...transit,stopBoards,groundAt(x,z){for(const s of services)for(const stop of s.stops){if(Math.abs(x-stop)<=11&&Math.abs(z-(s.z+(s.name==='Train'?6:-4)))<=2)return .25;}return null;},cancel(){if(transit.rider){ctx.leave(transit.rider===airport?new THREE.Vector3(-645,0,54):new THREE.Vector3(transit.rider.g.position.x,0,transit.rider.z-5));transit.rider=null;}},get rider(){return transit.rider;},update,leave(){if(transit.rider)transit.rider.interaction.action();}};
}
