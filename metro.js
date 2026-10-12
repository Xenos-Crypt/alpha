import * as THREE from 'three';
import {arrivalBoard,railArrival,formatWait} from './arrival-boards.js';
export function buildMetro(ctx){
 const {scene,box,colliders,camBlockers,interactables,sitSpots,makeTex,toast}=ctx,origin=-12000;
 const stations=[{name:'Old Town',x:46,z:4,y:.18,tx:origin},{name:'Riverside',x:-34,z:680,y:.18,tx:origin+210},{name:'Ashford Capital',x:240,z:806,y:.32,tx:origin+420},{name:'Poison Land',x:680,z:240,y:.2,tx:origin+630},{name:'Northhaven',x:1150,z:-160,y:.08,tx:origin+840}],boards=[],fish=[],lights=[];
 let underground=false,rider=false;
 function riverFish(){const g=new THREE.Group(),material=new THREE.MeshStandardMaterial({color:0x91bcba});const body=new THREE.Mesh(new THREE.SphereGeometry(.28,10,7),material);body.scale.set(1.8,.7,.7);g.add(body);const tail=new THREE.Mesh(new THREE.ConeGeometry(.23,.4,3),material);tail.rotation.z=-Math.PI/2;tail.position.x=-.55;g.add(tail);const fin=new THREE.Mesh(new THREE.ConeGeometry(.14,.3,3),material);fin.position.set(-.08,.2,0);g.add(fin);for(const side of [-1,1]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.045,6,4),new THREE.MeshBasicMaterial({color:0x142e37}));eye.position.set(.3,.08,side*.17);g.add(eye);}return g;}

 function sign(text,x,y,z,w=8){const map=makeTex(768,96,g=>{g.fillStyle='#183e63';g.fillRect(0,0,768,96);g.fillStyle='white';g.font='bold 36px sans-serif';g.textAlign='center';g.fillText(text,384,60);});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,1.2),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));mesh.position.set(x,y,z);scene.add(mesh);return mesh;}
 box(870,.3,16,origin+420,-.05,0,0x777e81,false);
 for(const z of [-7.8,7.8]){for(const [a,b]of [[-15,90],[180,300],[390,510],[600,855]]){const wall=box(b-a,5.5,.3,origin+(a+b)/2,2.7,z,0x46545d);camBlockers.push(wall);}colliders.push({minX:origin+90,maxX:origin+180,minZ:z-.15,maxZ:z+.15});}
 for(const x of [origin-15,origin+855])box(.3,5.5,16,x,2.7,0,0x46545d);
 const concrete=new THREE.MeshStandardMaterial({color:0x515e65,side:THREE.DoubleSide}),glass=new THREE.MeshStandardMaterial({color:0x70a8c3,transparent:true,opacity:.12,depthWrite:false,roughness:.12,side:THREE.DoubleSide});
 for(const [a,b,material]of [[-15,90,concrete],[90,180,glass],[180,300,concrete],[300,390,glass],[390,510,concrete],[510,600,glass],[600,855,concrete]]){const tube=new THREE.Mesh(new THREE.CylinderGeometry(8,8,b-a,20,1,true),material);tube.rotation.z=Math.PI/2;tube.position.set(origin+(a+b)/2,-2,0);scene.add(tube);camBlockers.push(tube);}
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
  box(5,.18,5,s.x,s.y-.09,s.z,0x6b7781,false);sign('SUBWAY - '+s.name,s.x,2.6,s.z-2,9);for(const dx of [-2,2])box(.12,2.5,.12,s.x+dx,1.25,s.z-2,0x405565,false);
  for(const side of [-1,1]){box(.1,1,5,s.x+side*2.4,.8,s.z,0x243b39,false);for(let z=-2;z<=2;z+=1)box(.07,1,.07,s.x+side*2.4,.6,s.z+z,0x243b39,false);const globe=new THREE.Mesh(new THREE.SphereGeometry(.3,12,8),new THREE.MeshStandardMaterial({color:0x75bc86,emissive:0x235b32,emissiveIntensity:.4}));globe.position.set(s.x+side*2.4,1.8,s.z+2);scene.add(globe);}
  interactables.push({pos:new THREE.Vector3(s.x,s.y,s.z),r:2.5,label:'Enter subway - '+s.name,action:()=>{if(!ctx.canEnter()){toast('Leave your vehicle or finish your current action first.');return;}underground=true;ctx.move(s.tx-12,5.6,-5);toast('Subway station: '+s.name+'. Walk the tunnel or board the train while its doors are open.');}});
  for(let i=0;i<18;i++){const x=s.tx-12+i*.8,h=(18-i)*.3;box(.8,h,2.4,x,h/2,-5,0x9ba6ad,false);for(const side of [-1,1])box(.06,1.1,.06,x,h+.55,-5+side*1.3,0x47616f,false);}
  for(let x=s.tx-10;x<s.tx+12;x+=6){box(.4,4,.4,x,2,-6.8,0x5c737e,false);box(3,.7,.04,x,2.1,-7.1,0xc79860,false);}
  box(28,.15,4,s.tx,.23,-5,0xb5b7b0,false);sign(s.name.toUpperCase(),s.tx,3.5,-7.3,10);
  const seat={x:s.tx+9,z:-5,yaw:Math.PI,seatY:.75,label:'Sit at subway station'};sitSpots.push(seat);box(3,.15,.7,seat.x,.675,seat.z,0x747967,false);box(3,.6,.1,seat.x,1,seat.z-.3,0x747967,false);
  boards.push({s,board:arrivalBoard(ctx,'SUBWAY - '+s.name,s.tx-8,3,-6)});
  box(27,.025,.35,s.tx,.325,-3.15,0xe1c447,false);box(2.5,2,.15,s.tx+9,1.3,-7,0x385e7c,false);sign('TICKETS / EXIT',s.tx+8,2.5,-7.15,6);for(let i=0;i<3;i++){box(.4,.95,1,s.tx+5+i*1.3,.65,-5.6,0x6e8189,false);box(1,.05,.08,s.tx+5+i*1.3,1.05,-5.6,0xa2b7bc,false);}for(let i=0;i<14;i++)box(1.8,.05,.035,s.tx-12+i*2,1.5,-7.62,0x879b9e,false);
  interactables.push({pos:new THREE.Vector3(s.tx-12,5.6,-5),r:2.5,label:'Exit subway to '+s.name,action:()=>{rider=false;underground=false;ctx.move(s.x,ctx.groundY(s.x,s.z),s.z);toast('Arrived in '+s.name+'.');}});
 }
 const rideAction={pos:new THREE.Vector3(),r:4,label:'Board subway train',action:()=>{if(!train.doors){toast('Wait for the train to stop and open its doors.');return;}if(rider){rider=false;ctx.move(group.position.x,.3,-4);toast('Left the subway train.');}else{if(!underground||!ctx.canEnter()){toast('Enter a subway station first.');return;}rider=true;ctx.prepareRide();toast('On the subway. Use Interact at a stop to leave.');}}};interactables.push(rideAction);
 let timer=0;
 function update(dt,time){
  for(const light of lights)light.visible=underground;
  if(train.doors){train.wait-=dt;if(train.wait<=0){train.doors=false;train.direction=train.index===train.stops.length-1?-1:train.index===0?1:train.direction;train.index+=train.direction;}}
  else{const target=train.stops[train.index],distance=Math.abs(target-group.position.x);train.speed=Math.min(18,Math.sqrt(6*distance));group.position.x+=Math.sign(target-group.position.x)*Math.min(distance,Math.max(.2,train.speed)*dt);if(distance<.1){group.position.x=target;train.doors=true;train.wait=10;train.speed=0;}}
  rideAction.pos.copy(group.position).z=-3;rideAction.label=rider?'Leave subway train':'Board subway train';group.visible=true;
  if(rider)ctx.carry(group.position.clone().add(new THREE.Vector3(0,.4,0)));
  for(const f of fish)f.f.position.set(f.x+Math.sin(time*.3+f.phase)*3,2+Math.cos(time*.4+f.phase),f.z);
  timer-=dt;if(timer<=0){timer=1;for(const {s,board}of boards){const eta=railArrival(train,s.tx);board.update(eta?.boarding?'BOARDING NOW':'ARRIVAL ~'+formatWait(eta?.seconds||0),'Old Town - Riverside - Capital - Poison Land - Northhaven');}}
 }
 return {stations,train,boards,fish,snapshot(){return {underground,rider,index:train.index,direction:train.direction,wait:train.wait,doors:train.doors,position:train.g?.position?.toArray?.()||group.position.toArray()};},restore(save){if(!save)return;underground=!!save.underground;rider=!!save.rider;Object.assign(train,{index:save.index,direction:save.direction,wait:save.wait,doors:save.doors});if(save.position)group.position.fromArray(save.position);},get underground(){return underground;},get rider(){return rider;},leave:()=>rideAction.action(),reset(){rider=false;underground=false;},groundAt(x,z){for(const s of stations)if(x>=s.tx-12.4&&x<=s.tx+2.4&&Math.abs(z+5)<=1.25)return Math.max(.2,(18-Math.floor((x-s.tx+12.4)/.8))*.3);for(const s of stations)if(Math.abs(x-s.x)<=2.5&&Math.abs(z-s.z)<=2.5)return s.y;return x>origin-16&&x<origin+856&&Math.abs(z)<8?.2:null;},update};
}
