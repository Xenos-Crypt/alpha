import * as THREE from 'three';
import {arrivalBoard,railArrival,formatWait} from './arrival-boards.js';
export function buildMetro(ctx){
 const {scene,box,colliders,camBlockers,interactables,sitSpots,makeTex,toast}=ctx,origin=-12000;
 const stations=[{name:'Old Town',x:46,z:4,y:.18,tx:origin},{name:'Riverside',x:-34,z:680,y:.18,tx:origin+210},{name:'Ashford Capital',x:240,z:806,y:.32,tx:origin+420}],boards=[],fish=[],lights=[];
 let underground=false,rider=false;
 function sign(text,x,y,z,w=8){const map=makeTex(768,96,g=>{g.fillStyle='#183e63';g.fillRect(0,0,768,96);g.fillStyle='white';g.font='bold 36px sans-serif';g.textAlign='center';g.fillText(text,384,60);});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,1.2),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));mesh.position.set(x,y,z);scene.add(mesh);return mesh;}
 box(450,.3,16,origin+210,-.05,0,0x777e81,false);
 for(const z of [-7.8,7.8]){for(const [a,b]of [[-15,90],[180,435]]){const wall=box(b-a,5.5,.3,origin+(a+b)/2,2.7,z,0x46545d);camBlockers.push(wall);}colliders.push({minX:origin+90,maxX:origin+180,minZ:z-.15,maxZ:z+.15});}
 for(const x of [origin-15,origin+435])box(.3,5.5,16,x,2.7,0,0x46545d);
 const concrete=new THREE.MeshStandardMaterial({color:0x515e65,side:THREE.DoubleSide}),glass=new THREE.MeshStandardMaterial({color:0x70a8c3,transparent:true,opacity:.28,roughness:.12,side:THREE.DoubleSide});
 for(const [a,b,material]of [[-15,90,concrete],[90,180,glass],[180,435,concrete]]){const tube=new THREE.Mesh(new THREE.CylinderGeometry(8,8,b-a,20,1,true),material);tube.rotation.z=Math.PI/2;tube.position.set(origin+(a+b)/2,-2,0);scene.add(tube);camBlockers.push(tube);}
 for(const side of [-1,1]){box(90,.08,.12,origin+135,1.2,side*6.5,0x9aadb6);for(let x=origin+90;x<=origin+180;x+=10)box(.08,1.1,.08,x,.75,side*6.5,0x7d939f,false);}
 // The underwater window section is sealed; water and fish remain outside.
 for(const side of [-1,1]){const water=box(90,12,.2,origin+135,3,side*12,new THREE.MeshBasicMaterial({color:0x1e7189,transparent:true,opacity:.6}),false);for(let i=0;i<7;i++){const f=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),new THREE.MeshStandardMaterial({color:0xacc4b2}));f.scale.set(1.8,.7,.7);scene.add(f);fish.push({f,x:origin+100+i*10,z:side*10,phase:i});}}
 for(const z of [-.8,.8])box(445,.12,.15,origin+210,.18,z,0xa2b4c0,false);for(let x=origin-10;x<origin+431;x+=3)box(.3,.08,2.5,x,.12,0,0x675f56,false);
 for(let x=origin-10;x<=origin+430;x+=25){const light=new THREE.PointLight(0xc4e2e9,16,34,2);light.position.set(x,4,-4);light.visible=false;lights.push(light);scene.add(light);box(.7,.1,.3,x,4.1,-4,0xd5e9df,false);}
 const group=new THREE.Group();scene.add(group);group.position.set(origin,.2,0);
 function trainPart(w,h,d,x,y,z,c){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c}));m.position.set(x,y,z);group.add(m);}
 trainPart(12,2.7,2.7,0,1.5,0,0x477997);for(let x=-5;x<=5;x+=2)for(const side of [-1,1])trainPart(1.3,1,.05,x,1.9,side*1.4,0xabc5cf);
 const train={name:'Train',g:group,stops:stations.map(s=>s.tx),index:0,direction:1,doors:true,wait:10,speed:0};
 for(const s of stations){
  box(5,.18,5,s.x,s.y-.09,s.z,0x6b7781,false);sign('SUBWAY - '+s.name,s.x,2.6,s.z-2,9);for(const dx of [-2,2])box(.12,2.5,.12,s.x+dx,1.25,s.z-2,0x405565,false);
  interactables.push({pos:new THREE.Vector3(s.x,s.y,s.z),r:2.5,label:'Enter subway - '+s.name,action:()=>{if(!ctx.canEnter()){toast('Leave your vehicle or finish your current action first.');return;}underground=true;ctx.move(s.tx-7,.2,-4);toast('Subway station: '+s.name+'. Walk the tunnel or board the train while its doors are open.');}});
  box(28,.15,4,s.tx,.23,-5,0xb5b7b0,false);sign(s.name.toUpperCase(),s.tx,3.5,-7.3,10);
  const seat={x:s.tx+9,z:-5,yaw:Math.PI,seatY:.75,label:'Sit at subway station'};sitSpots.push(seat);box(3,.15,.7,seat.x,.675,seat.z,0x747967,false);box(3,.6,.1,seat.x,1,seat.z-.3,0x747967,false);
  boards.push({s,board:arrivalBoard(ctx,'SUBWAY - '+s.name,s.tx-8,3,-6)});
  interactables.push({pos:new THREE.Vector3(s.tx-7,.2,-5),r:2.5,label:'Exit subway to '+s.name,action:()=>{rider=false;underground=false;ctx.move(s.x,ctx.groundY(s.x,s.z),s.z);toast('Arrived in '+s.name+'.');}});
 }
 const rideAction={pos:new THREE.Vector3(),r:4,label:'Board subway train',action:()=>{if(!train.doors){toast('Wait for the train to stop and open its doors.');return;}if(rider){rider=false;ctx.move(group.position.x,.3,-4);toast('Left the subway train.');}else{if(!underground||!ctx.canEnter()){toast('Enter a subway station first.');return;}rider=true;ctx.prepareRide();toast('On the subway. Use Interact at a stop to leave.');}}};interactables.push(rideAction);
 let timer=0;
 function update(dt,time){
  for(const light of lights)light.visible=underground;
  if(train.doors){train.wait-=dt;if(train.wait<=0){train.doors=false;train.direction=train.index===2?-1:train.index===0?1:train.direction;train.index+=train.direction;}}
  else{const target=train.stops[train.index],distance=Math.abs(target-group.position.x);train.speed=Math.min(18,Math.sqrt(6*distance));group.position.x+=Math.sign(target-group.position.x)*Math.min(distance,Math.max(.2,train.speed)*dt);if(distance<.1){group.position.x=target;train.doors=true;train.wait=10;train.speed=0;}}
  rideAction.pos.copy(group.position).z=-3;rideAction.label=rider?'Leave subway train':'Board subway train';group.visible=!(rider&&ctx.firstPerson());
  if(rider)ctx.carry(group.position.clone().add(new THREE.Vector3(0,.4,0)));
  for(const f of fish)f.f.position.set(f.x+Math.sin(time*.3+f.phase)*3,2+Math.cos(time*.4+f.phase),f.z);
  timer-=dt;if(timer<=0){timer=1;for(const {s,board}of boards){const eta=railArrival(train,s.tx);board.update(eta?.boarding?'BOARDING NOW':'ARRIVAL ~'+formatWait(eta?.seconds||0),'Old Town - Riverside - Capital');}}
 }
 return {stations,train,boards,fish,snapshot(){return {underground,rider,index:train.index,direction:train.direction,wait:train.wait,doors:train.doors,position:train.g?.position?.toArray?.()||group.position.toArray()};},restore(save){if(!save)return;underground=!!save.underground;rider=!!save.rider;Object.assign(train,{index:save.index,direction:save.direction,wait:save.wait,doors:save.doors});if(save.position)group.position.fromArray(save.position);},get underground(){return underground;},get rider(){return rider;},leave:()=>rideAction.action(),reset(){rider=false;underground=false;},groundAt(x,z){for(const s of stations)if(Math.abs(x-s.x)<=2.5&&Math.abs(z-s.z)<=2.5)return s.y;return x>origin-16&&x<origin+436&&Math.abs(z)<8?.2:null;},update};
}
