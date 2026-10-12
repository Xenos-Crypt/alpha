import {buildSubwayEntrances} from './subway-entrances.js';
import {buildSubwayPassengers} from './subway-passengers.js';
import * as THREE from 'three';
import {arrivalBoard,railArrival,formatWait} from './arrival-boards.js';
export function buildMetro(ctx){
 const {scene,box,colliders,camBlockers,interactables,sitSpots,makeTex,toast}=ctx,origin=-12000;
 const stations=[{name:'Old Town',x:11,z:60,y:.18,tx:origin},{name:'Riverside',x:-29,z:700,y:.18,tx:origin+210},{name:'Ashford Capital',x:251,z:820,y:.32,tx:origin+420},{name:'Poison Land',x:850,z:260,y:.2,tx:origin+630},{name:'Northhaven',x:1211,z:-200,y:.08,tx:origin+840}],boards=[],fish=[],lights=[];
 let underground=false,rider=false,entranceCooldown=0;
 function riverFish(){const g=new THREE.Group(),material=new THREE.MeshStandardMaterial({color:0x91bcba});const body=new THREE.Mesh(new THREE.SphereGeometry(.28,10,7),material);body.scale.set(1.8,.7,.7);g.add(body);const tail=new THREE.Mesh(new THREE.ConeGeometry(.23,.4,3),material);tail.rotation.z=-Math.PI/2;tail.position.x=-.55;g.add(tail);const fin=new THREE.Mesh(new THREE.ConeGeometry(.14,.3,3),material);fin.position.set(-.08,.2,0);g.add(fin);for(const side of [-1,1]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.045,6,4),new THREE.MeshBasicMaterial({color:0x142e37}));eye.position.set(.3,.08,side*.17);g.add(eye);}return g;}

 function sign(text,x,y,z,w=8){const map=makeTex(768,96,g=>{g.fillStyle='#183e63';g.fillRect(0,0,768,96);g.fillStyle='white';g.font='bold 36px sans-serif';g.textAlign='center';g.fillText(text,384,60);});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,1.2),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));mesh.position.set(x,y,z);scene.add(mesh);return mesh;}
 box(870,.3,16,origin+420,-.05,0,0x777e81,false);
 for(const z of [-7.8,7.8]){for(const [a,b]of [[-15,90],[180,300],[390,510],[600,855]]){let spans=[[a,b]];if(z<0)for(const s of stations){const c=s.tx-origin;spans=spans.flatMap(([lo,hi])=>c+3<=lo||c-3>=hi?[[lo,hi]]:[[lo,Math.max(lo,c-3)],[Math.min(hi,c+3),hi]].filter(([u,v])=>v-u>.1));}for(const [lo,hi]of spans){const wall=box(hi-lo,5.5,.3,origin+(lo+hi)/2,2.7,z,0x46545d);camBlockers.push(wall);}}colliders.push({minX:origin+90,maxX:origin+180,minZ:z-.15,maxZ:z+.15});}
 for(const x of [origin-15,origin+855])box(.3,5.5,16,x,2.7,0,0x46545d);
 const concrete=new THREE.MeshStandardMaterial({color:0x515e65,side:THREE.DoubleSide}),glass=new THREE.MeshStandardMaterial({color:0x70a8c3,transparent:true,opacity:.12,depthWrite:false,roughness:.12,side:THREE.DoubleSide});
 for(const [a,b,material]of [[-15,90,concrete],[90,180,glass],[180,300,concrete],[300,390,glass],[390,510,concrete],[510,600,glass],[600,855,concrete]]){let spans=[[a,b]];if(material===concrete)for(const s of stations){const c=s.tx-origin;spans=spans.flatMap(([lo,hi])=>c+18<=lo||c-18>=hi?[[lo,hi]]:[[lo,Math.max(lo,c-18)],[Math.min(hi,c+18),hi]].filter(([u,v])=>v-u>.1));}for(const [lo,hi]of spans){const tube=new THREE.Mesh(new THREE.CylinderGeometry(8,8,hi-lo,20,1,true),material);tube.rotation.z=Math.PI/2;tube.position.set(origin+(lo+hi)/2,-2,0);scene.add(tube);camBlockers.push(tube);}}
 for(const side of [-1,1]){box(90,.08,.12,origin+135,1.2,side*6.5,0x9aadb6);for(let x=origin+90;x<=origin+180;x+=10)box(.08,1.1,.08,x,.75,side*6.5,0x7d939f,false);}
 for(const centre of [345,555]){for(const side of [-1,1]){colliders.push({minX:origin+centre-45,maxX:origin+centre+45,minZ:side*7.8-.15,maxZ:side*7.8+.15});for(let i=0;i<7;i++){const f=riverFish();scene.add(f);fish.push({f,x:origin+centre-35+i*10,z:side*10,phase:i});}}}
 // The underwater window section is sealed; water and fish remain outside.
 for(const centre of [135,345,555])for(const side of [-1,1]){const water=box(90,12,.2,origin+centre,3,side*18,new THREE.MeshBasicMaterial({color:0x1e7189,transparent:true,opacity:.22,depthWrite:false}),false);for(let i=0;i<7;i++){const f=riverFish();scene.add(f);fish.push({f,x:origin+centre-35+i*10,z:side*10,phase:i});}}
 for(const z of [-.8,.8])box(865,.12,.15,origin+420,.18,z,0xa2b4c0,false);for(let x=origin-10;x<origin+851;x+=3)box(.3,.08,2.5,x,.12,0,0x675f56,false);
 for(let x=origin-10;x<=origin+850;x+=25){const light=new THREE.PointLight(0xc4e2e9,16,34,2);light.position.set(x,4,-4);light.visible=false;lights.push(light);scene.add(light);box(.7,.1,.3,x,4.1,-4,0xd5e9df,false);}
 for(const centre of [135,345,555]){box(94,.4,50,origin+centre,-4,0,0x637b6a,false);for(let i=0;i<12;i++)box(1+i%3,2.5+(i%3),2,origin+centre-40+i*7,-2.3,(i%2?1:-1)*11,0x527455,false);for(const side of [-1,1])box(2,18,2,origin+centre+25,5,side*16,0x5c6b67,false);}
 const group=new THREE.Group();scene.add(group);group.position.set(origin,.2,0);
 function trainPart(w,h,d,x,y,z,c){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c}));m.position.set(x,y,z);group.add(m);}
 trainPart(12,.2,2.7,0,.3,0,0x477997);trainPart(12,.18,2.7,0,3.15,0,0x547989);
 for(const side of [-1,1]){trainPart(12,.65,.12,0,.75,side*1.38,0x477997);trainPart(12,.45,.12,0,2.85,side*1.38,0x477997);for(let x=-5.8;x<=5.8;x+=1.95)trainPart(.15,1.6,.12,x,1.9,side*1.38,0x526c7a);const window=new THREE.Mesh(new THREE.PlaneGeometry(11.6,1.65),new THREE.MeshStandardMaterial({color:0xa9d4e5,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide}));window.position.set(0,1.95,side*1.4);group.add(window);trainPart(.2,2.8,2.7,side*6,1.7,0,0x477997);}

 const train={name:'Train',g:group,stops:stations.map(s=>s.tx),index:0,direction:1,doors:true,wait:10,speed:0};
 for(const s of stations){
  interactables.push({pos:new THREE.Vector3(s.x,s.y,s.z-6),r:2.5,label:'Enter subway - '+s.name,action:()=>{if(!ctx.canEnter())return;ctx.move(s.x,s.y,s.z-5);toast('Walk down the staircase to the platform.');}});
  for(let i=0;i<18;i++){const h=5.6-i*.3,z=-20+(i+.5)*12/18;box(5,.2,12/18,s.tx,h-.1,z,0xa2aba7,false);for(const side of [-1,1])box(.08,1,.08,s.tx+side*2.6,h+.5,z,0x364f5b,false);}
  box(30,.25,7,s.tx,5.45,-23,0xa2aba7,false);box(36,.3,40,s.tx,9.2,-8,0x53636c,false);for(const dx of [-8,8]){const light=new THREE.PointLight(0xe2eee0,120,38,2);light.position.set(s.tx+dx,5,-5);light.visible=false;scene.add(light);lights.push(light);box(4,.12,.4,s.tx+dx,5.5,-5,new THREE.MeshStandardMaterial({color:0xe8f1e4,emissive:0xc7e7db,emissiveIntensity:.6}),false);}
  for(const dx of [-7,7]){box(2,2,.6,s.tx+dx,6.6,-23,0x355e75,false);sign('TICKETS',s.tx+dx,8,-23.4,5);}
  for(let x=s.tx-10;x<s.tx+12;x+=6){box(.4,4,.4,x,2,-6.8,0x5c737e,false);box(3,.7,.04,x,2.1,-7.1,0xc79860,false);}
  box(28,.15,4,s.tx,.23,-5,0xb5b7b0,false);sign(s.name.toUpperCase(),s.tx,3.5,-7.3,10);
  const seat={x:s.tx+9,z:-5,yaw:Math.PI,seatY:.75,label:'Sit at subway station'};sitSpots.push(seat);box(3,.15,.7,seat.x,.675,seat.z,0x747967,false);box(3,.6,.1,seat.x,1,seat.z-.3,0x747967,false);
  boards.push({s,board:arrivalBoard(ctx,'SUBWAY - '+s.name,s.tx-8,3,-6)});
  box(27,.025,.35,s.tx,.325,-3.15,0xe1c447,false);box(2.5,2,.15,s.tx+9,1.3,-7,0x385e7c,false);sign('TICKETS / EXIT',s.tx+8,2.5,-7.15,6);for(let i=0;i<3;i++){box(.4,.95,1,s.tx+5+i*1.3,.65,-5.6,0x6e8189,false);box(1,.05,.08,s.tx+5+i*1.3,1.05,-5.6,0xa2b7bc,false);}for(let i=0;i<14;i++)box(1.8,.05,.035,s.tx-12+i*2,1.5,-7.62,0x879b9e,false);
  interactables.push({pos:new THREE.Vector3(s.tx,5.6,-23),r:2.5,label:'Exit subway to '+s.name,action:()=>{rider=false;underground=false;entranceCooldown=3;ctx.move(s.x,s.y-5.4,s.z+5);toast('Arrived in '+s.name+'.');}});
 }
 const rideAction={pos:new THREE.Vector3(),r:4,label:'Board subway train',action:()=>{if(!train.doors){toast('Wait for the train to stop and open its doors.');return;}if(rider){rider=false;ctx.move(group.position.x,.3,-4);toast('Left the subway train.');}else{if(!underground||!ctx.canEnter()){toast('Enter a subway station first.');return;}rider=true;ctx.prepareRide();toast('On the subway. Use Interact at a stop to leave.');}}};interactables.push(rideAction);
 const entrances=buildSubwayEntrances({...ctx,sign},stations),passengers=buildSubwayPassengers(ctx,stations,train);
 let timer=0;
 function update(dt,time){
  entranceCooldown=Math.max(0,entranceCooldown-dt);const p=ctx.playerPos?.();if(p&&!underground&&entranceCooldown===0&&ctx.canEnter())for(const s of stations)if(Math.abs(p.x-s.x)<1.9&&p.z>s.z+5&&p.z<s.z+7&&p.y<s.y-4.5){underground=true;ctx.move(s.tx+5,.3,-5);toast(s.name+' platform: trains and passengers below.');break;}
  passengers.update(dt);

  for(const light of lights)light.visible=underground&&(!p||Math.hypot(light.position.x-p.x,light.position.z-p.z)<70);
  if(train.doors){train.wait-=dt;if(train.wait<=0){train.doors=false;train.direction=train.index===train.stops.length-1?-1:train.index===0?1:train.direction;train.index+=train.direction;}}
  else{const target=train.stops[train.index],distance=Math.abs(target-group.position.x);train.speed=Math.min(18,Math.sqrt(6*distance));group.position.x+=Math.sign(target-group.position.x)*Math.min(distance,Math.max(.2,train.speed)*dt);if(distance<.1){group.position.x=target;train.doors=true;train.wait=10;train.speed=0;}}
  rideAction.pos.copy(group.position).z=-3;rideAction.label=rider?'Leave subway train':'Board subway train';group.visible=true;
  if(rider)ctx.carry(group.position.clone().add(new THREE.Vector3(0,.4,0)));
  for(const f of fish)f.f.position.set(f.x+Math.sin(time*.3+f.phase)*3,2+Math.cos(time*.4+f.phase),f.z);
  timer-=dt;if(timer<=0){timer=1;for(const {s,board}of boards){const eta=railArrival(train,s.tx);board.update(eta?.boarding?'BOARDING NOW':'ARRIVAL ~'+formatWait(eta?.seconds||0),'Old Town - Riverside - Capital - Poison Land - Northhaven');}}
 }
 return {stations,train,boards,fish,entrances,passengers:passengers.people,cutSurfaces:entrances.cutSurfaces,snapshot(){return {underground,rider,index:train.index,direction:train.direction,wait:train.wait,doors:train.doors,position:train.g?.position?.toArray?.()||group.position.toArray()};},restore(save){if(!save)return;underground=!!save.underground;rider=!!save.rider;Object.assign(train,{index:save.index,direction:save.direction,wait:save.wait,doors:save.doors});if(save.position)group.position.fromArray(save.position);},movementScale(p){if(entrances.groundAt(p.x,p.z)!=null)return .4;return stations.some(s=>Math.abs(p.x-s.tx)<2.5&&p.z>=-20&&p.z<=-8)?.4:1;},get underground(){return underground;},get rider(){return rider;},leave:()=>rideAction.action(),reset(){rider=false;underground=false;},groundAt(x,z){const entryFloor=entrances.groundAt(x,z);if(entryFloor!=null)return entryFloor;for(const s of stations){if(Math.abs(x-s.tx)<2.5&&z>=-20&&z<=-8)return Math.max(.2,5.6-Math.floor((z+20)/(12/18))*.3);if(Math.abs(x-s.tx)<15&&z>=-26.5&&z<=-20)return 5.6;}return x>origin-16&&x<origin+856&&Math.abs(z)<8?.2:null;},update};
}
