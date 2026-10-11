import * as THREE from 'three';
export function buildSewersAndOffices(ctx){
 const {scene,box,colliders,camBlockers,interactables,sitSpots,makeTex,makePerson,animatePerson,toast}=ctx;
 const origin=-8000,staff=[];let underground=false;
 const exits=[{x:8,z:8,tx:origin,tz:-58,name:'Old Town'},{x:310,z:14,tx:origin+58,tz:0,name:'Market district'},{x:-150,z:160,tx:origin,tz:58,name:'Port waterfront'}];
 function sign(text,x,y,z,w=6){const map=makeTex(768,96,g=>{g.fillStyle='#253d36';g.fillRect(0,0,768,96);g.fillStyle='#e9e1b5';g.font='bold 32px sans-serif';g.textAlign='center';g.fillText(text,384,60);});const m=new THREE.Mesh(new THREE.PlaneGeometry(w,1),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));m.position.set(x,y,z);scene.add(m);return m;}
 function wall(w,d,x,z){const m=box(w,4,d,x,2,z,0x4c574a);camBlockers.push(m);}
 box(124,.25,124,origin,-.23,0,0x4b5146,false);
 // A chamber with four genuine corridor openings, not sealed rooms.
 for(const side of [-1,1])for(const offset of [-7.5,7.5]){wall(9,.35,origin+offset,side*12);wall(.35,9,origin+side*12,offset);}
 for(const side of [-1,1]){wall(.35,50,origin+side*3,-37);wall(.35,50,origin+side*3,37);wall(50,.35,origin-37,side*3);wall(50,.35,origin+37,side*3);}
 wall(6,.35,origin,-62);wall(6,.35,origin,62);wall(.35,6,origin-62,0);wall(.35,6,origin+62,0);
 for(const [w,d,x,z]of [[24,24,origin,0],[6,50,origin,-37],[6,50,origin,37],[50,6,origin-37,0],[50,6,origin+37,0]]){const roof=box(w,.2,d,x,4.2,z,0x3c453c,false);camBlockers.push(roof);}
 box(2,.06,122,origin,.04,0,new THREE.MeshStandardMaterial({color:0x405d38,transparent:true,opacity:.85,roughness:.2}),false);
 for(const dx of [-2,2])box(1.8,.2,122,origin+dx,0,0,0x6b7064,false);
 for(const z of [-50,-25,0,25,50]){const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,5.5,12),new THREE.MeshStandardMaterial({color:0x786c51}));pipe.rotation.z=Math.PI/2;pipe.position.set(origin,3.3,z);scene.add(pipe);const light=new THREE.PointLight(0xc3d4a4,12,22,2);light.position.set(origin+1.7,3,z);scene.add(light);box(.4,.15,.4,origin+1.7,3.3,z,0xd0d7a2,false);}
 for(const x of [-48,-25,25,48]){const light=new THREE.PointLight(0xc3d4a4,10,22,2);light.position.set(origin+x,3,0);scene.add(light);}
 sign('ASHFORD SEWER JUNCTION',origin,2.6,-11.8,10);sign('MAINTENANCE OFFICE',origin-53,2.6,2.9,8);
 for(const e of exits){const lid=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,.06,24),new THREE.MeshStandardMaterial({color:0x3d484f,metalness:.5,roughness:.65}));lid.position.set(e.x,ctx.groundY(e.x,e.z)+.04,e.z);scene.add(lid);for(let dx=-.5;dx<=.5;dx+=.2)box(.06,.03,1,e.x+dx,lid.position.y+.05,e.z,0x89949b,false);
  interactables.push({pos:new THREE.Vector3(e.x,lid.position.y,e.z),r:2,label:'Enter sewer manhole - '+e.name,action:()=>{if(!ctx.canEnter()){toast('Leave your vehicle or finish your current action first.');return;}underground=true;ctx.moveTo(e.tx,0,e.tz);toast('Underground sewer network. Follow the lit walkways and use a ladder to return to the street.');}});
  for(const dx of [-.5,.5])box(.07,3.7,.07,e.tx+dx,1.85,e.tz,0x9b9377,false);for(let y=.3;y<3.7;y+=.35)box(1,.07,.07,e.tx,y,e.tz,0x9b9377,false);
  sign('EXIT TO '+e.name.toUpperCase(),e.tx,2.8,e.tz+1.1,6);
  interactables.push({pos:new THREE.Vector3(e.tx,0,e.tz),r:2,label:'Climb ladder to '+e.name,action:()=>{underground=false;ctx.moveTo(e.x,ctx.groundY(e.x,e.z),e.z);toast('Back in '+e.name+'.');}});
 }
 // Public office block: reception, furnished workrooms and meeting space.
 const ox=310,oz=-82,w=52,d=34;box(w,.16,d,ox,.08,oz,0xb7b3a5,false);
 for(const x of [ox-w/2,ox+w/2]){const m=box(.4,5,d,x,2.5,oz,0xc8c2b2);camBlockers.push(m);}const back=box(w,5,.4,ox,2.5,oz-d/2,0xc8c2b2);camBlockers.push(back);
 for(const side of [-1,1])box(23,5,.4,ox+side*14.5,2.5,oz+d/2,0xc8c2b2);
 const roof=box(w+1,.3,d+1,ox,5.2,oz,0x435460,false);camBlockers.push(roof);ctx.planeBlocks.push({minX:ox-w/2,maxX:ox+w/2,minZ:oz-d/2,maxZ:oz+d/2,top:5.4});
 sign('ASHFORD BUSINESS OFFICES',ox,3.8,oz+d/2+.25,19);
 for(const x of [294,305,317,328])for(const z of [-92,-82]){box(4,.85,1.8,x,.55,z,0x776752);box(1,.65,.1,x,1.25,z,0x263b47,false);box(.6,.55,.6,x,.35,z+1.6,0x476277,false);sitSpots.push({x,z:z+1.6,yaw:Math.PI,seatY:.625,label:'Sit at office desk'});}
 box(9,.9,1.8,310,.55,-69,0x776752);sign('RECEPTION',310,2.4,-68.8,8);
 interactables.push({pos:new THREE.Vector3(310,.16,-66.8),r:2.5,label:'Office reception',action:()=>toast('Welcome to Ashford Business Offices. Reception, shared desks and the meeting room are open.')} );
 const receptionist=makePerson({outfit:0x42647c,hair:0x48362c,pants:0x303c4b});receptionist.root.position.set(310,.16,-72);staff.push(receptionist);
 for(const x of [294,328]){const h=makePerson({outfit:0x697561,hair:0x42332b,pants:0x303c4b});h.root.position.set(x,.16,-84);staff.push(h);}
 const maintenance=makePerson({outfit:0xd4a54b,hair:0x41352b,pants:0x354649});maintenance.root.position.set(origin-50,.1,0);staff.push(maintenance);box(4,.85,1.8,origin-53,.5,0,0x6c6657);
 ctx.destinations.push({name:'Business offices',x:310,z:-62});
 return {exits,roof,staff,get underground(){return underground;},reset(){underground=false;},groundAt(x,z){if(x>origin-63&&x<origin+63&&Math.abs(z)<63)return Math.abs(x-origin)<1&&Math.abs(z)<61?-.2:.1;if(x>284&&x<336&&z>-99&&z<-65)return .16;return null;},movementScale(pos){return underground?.35:1;},update(){roof.visible=!(ctx.playerPos().x>284&&ctx.playerPos().x<336&&ctx.playerPos().z>-99&&ctx.playerPos().z<-65);for(const h of staff)animatePerson(h,false,0);}};
}
