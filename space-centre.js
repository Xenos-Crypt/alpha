import * as THREE from 'three';
import {createLift} from './lifts.js';
export const SPACE_CENTRE={x:985,z:-470};   // where the complex stands (the 9-storey centre's front door); its pad is 150 m north
// The complex was built round (420, 720) in Capital; it now stands on open land in the north-east, well away from
// any other building. Everything below is still written in the old coordinates and shifted as a whole: meshes sit in
// `root` (moved), and colliders, interactables, people, the player and teleports go through the helpers below.
export function buildSpaceCentre(ctx0){
 const OX=SPACE_CENTRE.x-420,OZ=SPACE_CENTRE.z-720;
 const root=new THREE.Group();ctx0.scene.add(root);root.position.set(OX,0,OZ);
 const shiftRect=c=>{for(const k of ['minX','maxX'])if(c[k]!=null)c[k]+=OX;for(const k of ['minZ','maxZ'])if(c[k]!=null)c[k]+=OZ;if(c.circleX!=null){c.circleX+=OX;c.circleZ+=OZ;}return c;};
 const P0=ctx0.playerPosition;
 const local={get x(){return P0().x-OX;},set x(v){P0().x=v+OX;},get y(){return P0().y;},set y(v){P0().y=v;},get z(){return P0().z-OZ;},set z(v){P0().z=v+OZ;}};
 const ctx={...ctx0,
  colliders:{push:(...cs)=>(ctx0.colliders||[]).push(...cs.map(shiftRect))},
  interactables:{push:(...its)=>ctx0.interactables.push(...its.map(it=>{if(it.pos){it.pos=it.pos.clone();it.pos.x+=OX;it.pos.z+=OZ;}return it;}))},
  makePerson:look=>{const h=ctx0.makePerson(look);root.add(h.root);return h;},
  moveTo:(x,y,z)=>ctx0.moveTo(x+OX,y,z+OZ),
  safeFence:(x0,x1,z0,z1,o={})=>ctx0.safeFence?.(x0+OX,x1+OX,z0+OZ,z1+OZ,{...o,gate:o.gate&&{...o.gate,from:o.gate.from+(o.gate.side[0]==='z'?OX:OZ),to:o.gate.to+(o.gate.side[0]==='z'?OX:OZ)}}),
  destinations:{push:(...ds)=>ctx0.destinations.push(...ds.map(d=>({...d,x:d.x+OX,z:d.z+OZ})))},
  playerPosition:()=>local};
 const add=(geometry,color,x,y,z,parent=root)=>{const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.65}));m.position.set(x,y,z);parent.add(m);return m;};
 const cube=(w,h,d,x,y,z,c)=>add(new THREE.BoxGeometry(w,h,d),c,x,y,z);
 const home=new THREE.Vector3(420,.55,534),staff=[],floors=['Reception and security','Mission control','Engineering design','Robotics laboratory','Propulsion laboratory','Crew training','Life support research','Administration','Observatory'];
 let interior=false,floor=0,badge=false,state='idle',destination=0,elapsed=0,away=false;
 const destinations=[['Moon',0xb3b2a7,true],['Mars',0xb36745,true],['Earth orbit',0x397bb9,false],['Jupiter orbit',0xb99c79,false],['Saturn orbit',0xcbb885,false],['Sun observatory',0xffb32f,false]];
 function label(text,x,y,z,w=15){const map=ctx.makeTex(512,96,g=>{g.fillStyle='#122c42';g.fillRect(0,0,512,96);g.fillStyle='white';g.font='bold 24px sans-serif';g.textAlign='center';g.fillText(text,256,60);});const m=new THREE.Mesh(new THREE.PlaneGeometry(w,2),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));m.position.set(x,y,z);root.add(m);}
 // Nine distinct floors, windows, workstations and a real lift (call it, step in, choose a floor: lifts.js).
 // The lift shaft runs up the east wall (x 431.5-434, z 732.5-735.5), so every slab above the ground has a hole there.
 const SHAFT={minX:431.5,maxX:434,minZ:732.5,maxZ:735.5},cols=ctx.colliders;
 const slab=(h,y,c)=>{cube(25.5,h,28,418.75,y,740,c);cube(2.5,h,6.5,432.75,y,729.25,c);cube(2.5,h,18.5,432.75,y,744.75,c);};
 const wall=(minX,maxX,minZ,maxZ,y)=>cols.push({minX,maxX,minZ,maxZ,baseYAt:()=>y});
 for(let level=0;level<9;level++){const y=.4+level*4;
 if(level)slab(.3,y-.15,0x8b939d);else cube(28,.3,28,420,y-.15,740,0x8b939d);
 if(level<8)slab(.25,y+3.8,0xa9b0b7);else cube(28,.25,28,420,y+3.8,740,0xa9b0b7);
 for(const side of [-1,1]){cube(.3,3.8,28,420+side*14,y+1.9,740,0x526a81);cube(10,3.8,.3,420+side*9,y+1.9,726,0x526a81);wall(420+side*14-.2,420+side*14+.2,726,754,y);wall(Math.min(420+side*4,420+side*14),Math.max(420+side*4,420+side*14),725.8,726.2,y);}
 cube(28,3.8,.3,420,y+1.9,754,0x526a81);wall(406,434,753.8,754.2,y);
 if(level){cube(8,3.8,.06,420,y+1.9,726,new THREE.MeshStandardMaterial({color:0x9fd3ff,transparent:true,opacity:.25}));wall(416,424,725.8,726.2,y);}   // upstairs the front gap is a glass wall
 for(let x=410;x<=430;x+=5){cube(3,1.8,.08,x,y+2,725.8,0x8bc3d9);cube(3,1.8,.08,x,y+2,754.2,0x8bc3d9);}
 label((level+1)+' / '+floors[level],420,y+2.8,726-0.25,18);
 for(const side of [-1,1]){cube(5,.2,2,420+side*8,y+.9,746,0x5f6875);cube(1.4,.9,.15,420+side*8,y+1.45,746.5,0x183b55);
 const h=ctx.makePerson({outfit:level===7?0x293445:level===0?0x243b50:0xe0dfd7,hair:0x3b2c23,pants:0x344352});h.root.position.set(420+side*8,y,748);staff.push({h,x:420+side*8,y,z:748,level,phase:side});}
 }
 const lift=createLift({scene:root,colliders:ctx.colliders,x:433.8,z:734,rot:-Math.PI/2,floorH:4,floors:floors.map((name,i)=>({y:.4+i*4,name})),first:1,name:'Lift',toast:ctx.toast,resume:ctx.resume});
 for(const sp of [...lift.spots,...lift.cabSpots])ctx.interactables.push(sp);
 label('ASHFORD SPACE CENTRE',420,37,725.5,24);
 const guard=ctx.makePerson({outfit:0x23384b,hair:0x322a26,pants:0x162637});guard.root.position.set(423,.4,728);staff.push({h:guard,x:423,y:.4,z:728,level:0,phase:0,guard:true});
 ctx.interactables.push({pos:new THREE.Vector3(423,.4,729),r:2.5,label:'Register visitor with security',action:()=>{badge=true;ctx.toast('Visitor badge issued. Assembly viewing and crew training are open.');}});
 const door=new THREE.Vector3(420,.4,723);ctx.interactables.push({pos:door,r:3,label:'Enter nine-storey space centre',action:()=>{if(!ctx.canTravel())return;interior=true;floor=0;ctx.moveTo(420,.4,731);}});
 for(let level=0;level<9;level++)ctx.interactables.push({pos:new THREE.Vector3(420,.4+level*4,729),r:2,label:'Leave space centre',action:()=>{interior=false;ctx.moveTo(420,.4,722);}});
 function rocketAt(x,y,z,complete=true){const g=new THREE.Group();g.position.set(x,y,z);root.add(g);add(new THREE.CylinderGeometry(1.8,2.3,15,16),0xe6e9eb,0,9,0,g);if(complete)add(new THREE.ConeGeometry(1.8,5,16),0xb74b3f,0,19,0,g);for(const side of [-1,1])add(new THREE.BoxGeometry(.35,4,4),0xb74b3f,side*2.3,3,0,g);return g;}
 const rocket=rocketAt(420,.55,550);cube(20,.3,20,420,.4,550,0x485664);
 const flame=add(new THREE.ConeGeometry(1.5,8,12),0xff9e32,0,-3,0,rocket);flame.rotation.z=Math.PI;flame.visible=false;
 // Assembly hangar at the outer edge of Capital, with unfinished rocket sections.
 cube(28,.3,26,460,.4,740,0x6b737c);cube(28,.4,26,460,24,740,0x657c90);for(const side of [-1,1])cube(.4,24,26,460+side*14,12,740,0x657c90);cube(28,24,.4,460,12,753,0x657c90);
 rocketAt(454,.55,743,false);rocketAt(467,.55,743,false);cube(20,.4,2,460,21,742,0xe9bc43);cube(.6,8,.6,457,17,742,0xe9bc43);
 for(let i=0;i<5;i++){const h=ctx.makePerson({outfit:0xeab94f,hair:0x382b24,pants:0x3c4853});h.root.position.set(450+i*4,.55,735);staff.push({h,x:450+i*4,y:.55,z:735,phase:i,engineer:true});}
 label('ROCKET ASSEMBLY / VISITOR VIEWING',460,6,726,23);
 ctx.interactables.push({pos:new THREE.Vector3(443,.4,728),r:3,label:'Enter assembly viewing area',action:()=>{if(!ctx.canTravel())return;if(!badge){ctx.toast('Register with reception security for a visitor badge.');return;}ctx.moveTo(460,.55,729);}});
 ctx.interactables.push({pos:new THREE.Vector3(460,.55,729),r:3,label:'Leave assembly viewing area',action:()=>ctx.moveTo(441,.4,728)});
 const panel=document.createElement('div');panel.id='spaceMissionPanel';panel.style.cssText='position:fixed;inset:10%;z-index:25;display:none;overflow:auto;background:#0b1429f5;color:white;padding:24px;border-radius:16px;font:16px system-ui';document.body.append(panel);
 function close(){panel.style.display='none';if(state==='boarding'){state='idle';ctx.moveTo(home.x,home.y,home.z);}ctx.resume?.();}
 function show(title,choices){document.exitPointerLock();panel.replaceChildren();const heading=document.createElement('h2');heading.textContent=title;panel.append(heading);for(const [name,action]of choices){const b=document.createElement('button');b.textContent=name;b.style.cssText='padding:12px;margin:6px;border:0;border-radius:8px;background:#315583;color:white';b.onclick=()=>{close();action();};panel.append(b);}const b=document.createElement('button');b.textContent='Close';b.onclick=close;panel.append(b);panel.style.display='block';}
 function launch(index,returning=false){interior=false;destination=index;elapsed=0;state=returning?'returning':'countdown';rocket.visible=true;rocket.position.copy(returning?new THREE.Vector3(420+index*70,1200,710):new THREE.Vector3(420,.55,550));ctx.toast(returning?'Return flight started.':'Launch countdown. Interact to abort before liftoff.');}
 ctx.interactables.push({pos:home,r:4,label:'Board rocket and select mission',action:()=>{if(!ctx.canTravel())return;show('Choose a rocket mission',destinations.map(([name],i)=>[name,()=>launch(i)]));}});
 ctx.safeFence?.(410,430,540,560,{h:2.6,gate:{side:'z1',from:417,to:423}});
 cube(3,.2,12,420,.5,564,0xaeb7bd);
 const cabin=new THREE.Group();rocket.add(cabin);cabin.position.y=10;add(new THREE.CylinderGeometry(1.6,1.6,.12,16),0x727f8b,0,-.15,0,cabin);add(new THREE.BoxGeometry(1.8,.8,.4),0x274759,0,.5,1.2,cabin);add(new THREE.BoxGeometry(1.4,.5,.03),0x87b9d3,0,1,1.4,cabin);
 const launchGuard=ctx.makePerson({outfit:0x293f56,hair:0x31291d,pants:0x1d2e3c});launchGuard.root.position.set(426,.55,563);
 ctx.interactables.push({pos:new THREE.Vector3(420,.55,555),r:4,label:'Enter rocket cabin',action:()=>{if(!ctx.canTravel())return;interior=false;state='boarding';rocket.position.set(420,.55,550);ctx.moveTo(420,10.55,550);show('Rocket cabin / mission console',destinations.map(([name],i)=>[name,()=>launch(i)]));}});
 const status=document.createElement('div');status.id='rocketFlightStatus';status.style.cssText='position:fixed;left:50%;top:90px;transform:translateX(-50%);background:#102235e8;color:white;padding:10px 16px;border-radius:10px;pointer-events:none;display:none;z-index:12';document.body.append(status);
 destinations.forEach(([name,color,walkable],i)=>{const x=420+i*70;cube(54,.5,54,x,1199.75,710,walkable?color:0x546675);label(name,x,1204,736,20);if(walkable){for(let j=0;j<12;j++){const a=j*2.4;add(new THREE.SphereGeometry(.8+j%3*.3,6,4),color,x+Math.sin(a)*20,1200.3,710+Math.cos(a)*20);}cube(7,3,5,x+16,1201.5,724,0xbfcad1);}else{add(new THREE.SphereGeometry(i===5?18:11,24,16),color,x,1225,758);if(i===4){const ring=add(new THREE.TorusGeometry(16,1,8,48),0xcbb786,x,1225,758);ring.rotation.x=1.2;}}
 ctx.interactables.push({pos:new THREE.Vector3(x,1200,710),r:5,label:'Board return rocket to Earth',action:()=>{if(away&&state==='idle'&&ctx.canTravel())launch(i,true);}});});
 function update(dt=0){
 for(const s of staff){if(!s.guard){s.h.root.position.x=s.x+Math.sin(elapsed*.4+s.phase)*.7;ctx.animatePerson?.(s.h,true,dt);}else ctx.animatePerson?.(s.h,false,dt);}
 elapsed+=dt;const p=ctx.playerPosition();lift.update(dt,p);
 if(state!=='idle'){
 status.style.display='block';flame.visible=state!=='countdown';
 if(state==='boarding'){status.textContent='Rocket cabin: choose a mission on the console.';}
 else if(state==='countdown'){status.textContent='Launch in '+Math.max(0,Math.ceil(5-elapsed))+'s | Interact: abort';if(elapsed>=5){state='ascent';elapsed=0;}}
 else if(state==='ascent'){rocket.position.y=.55+Math.min(1200,elapsed*elapsed*3);status.textContent='ASCENT | altitude '+Math.round(rocket.position.y)+'m';if(elapsed>=20){state='transfer';elapsed=0;}}
 else if(state==='transfer'){rocket.position.lerp(new THREE.Vector3(420+destination*70,1240,710),Math.min(1,dt*.7));status.textContent='Transfer to '+destinations[destination][0]+' | '+Math.max(0,Math.ceil(12-elapsed))+'s';if(elapsed>=12){state='landing';elapsed=0;}}
 else if(state==='landing'){rocket.position.y=1240-Math.min(40,elapsed*5);status.textContent='LANDING | Interact after touchdown to explore';if(elapsed>=8){state='landed';away=true;flame.visible=false;}}
 else if(state==='returning'){rocket.position.lerp(new THREE.Vector3(420,.55,550),Math.min(1,dt*.25));status.textContent='RETURN TO EARTH | '+Math.max(0,Math.ceil(25-elapsed))+'s';if(elapsed>=25){rocket.position.set(420,.55,550);state='idle';away=false;flame.visible=false;ctx.moveTo(home.x,home.y,home.z);status.style.display='none';}}
 if(state!=='idle')ctx.moveTo(rocket.position.x,rocket.position.y+10,rocket.position.z);
 }else{status.style.display='none';if(away&&p.y>1100){p.x=THREE.MathUtils.clamp(p.x,420+destination*70-25,420+destination*70+25);p.z=THREE.MathUtils.clamp(p.z,685,735);}if(interior){p.x=THREE.MathUtils.clamp(p.x,407,433.6);p.z=THREE.MathUtils.clamp(p.z,727,753);}}
 }
 // ---------------- the launch complex (built here when the centre moved out of the city) ----------------
 // A heavy-lift rocket on its own pad with an 85 m launch tower and four lightning masts, a lattice tower and swing
 // arm at the passenger pad, the Vehicle Assembly Building, a fuel farm, the crawlerway, and a fence round it all.
 const lattice=(x,z,h,w,c=0xd0d4d8)=>{for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]])cube(.5,h,.5,x+dx*w/2,h/2,z+dz*w/2,c);for(let y=4;y<h;y+=5){cube(w,.35,.35,x,y,z-w/2,c);cube(w,.35,.35,x,y,z+w/2,c);cube(.35,.35,w,x-w/2,y,z,c);cube(.35,.35,w,x+w/2,y,z,c);}cube(w+1,.5,w+1,x,h,z,0xb74b3f);cols.push({minX:x-w/2-.3,maxX:x+w/2+.3,minZ:z-w/2-.3,maxZ:z+w/2+.3});};
 lattice(433,550,40,5);cube(9,.6,1.4,428,10.6,550,0xd0d4d8);   // the passenger pad's tower and its swing arm to the cabin
 // pad 2: the heavy rocket
 const P2={x:500,z:545};
 cube(44,1.2,44,P2.x,.6,P2.z,0x9a9fa5);cols.push({minX:P2.x-22,maxX:P2.x+22,minZ:P2.z-22,maxZ:P2.z+22});
 cube(10,.2,60,P2.x,1.25,P2.z+10,0x2b2b2b);   // the flame trench's mouth
 {const g=new THREE.Group();g.position.set(P2.x,1.2,P2.z);root.add(g);const white=0xeef0f2;
  add(new THREE.CylinderGeometry(3.2,3.2,72,24),white,0,36,0,g);add(new THREE.ConeGeometry(3.2,10,24),0xd9dde0,0,77,0,g);add(new THREE.CylinderGeometry(3.25,3.25,4,24),0x1d1f22,0,46,0,g);
  for(const sx of [-1,1]){add(new THREE.CylinderGeometry(2.3,2.3,56,20),white,sx*5.6,28,0,g);add(new THREE.ConeGeometry(2.3,6,20),0xd9dde0,sx*5.6,59,0,g);add(new THREE.CylinderGeometry(1.6,2.4,3,16),0x3a3d42,sx*5.6,-.5,0,g);}
  add(new THREE.CylinderGeometry(2.2,3,3.5,16),0x3a3d42,0,-.6,0,g);
  const flagTex=ctx.makeTex(256,512,g2=>{g2.fillStyle='#eef0f2';g2.fillRect(0,0,256,512);g2.fillStyle='#163a5c';g2.font='bold 64px sans-serif';g2.textAlign='center';g2.save();g2.translate(128,256);g2.rotate(-Math.PI/2);g2.fillText('ANTHOS',0,24);g2.restore();});
  const decal=new THREE.Mesh(new THREE.PlaneGeometry(3.2,22),new THREE.MeshBasicMaterial({map:flagTex,transparent:true}));decal.position.set(0,30,3.22);g.add(decal);}
 lattice(P2.x+14,P2.z,85,8);for(const y of [30,50,68])cube(8,.8,1.6,P2.x+7,y,P2.z,0xd0d4d8);   // the launch tower and its arms
 for(const [dx,dz] of [[-30,-30],[30,-30],[-30,30],[30,30]]){add(new THREE.CylinderGeometry(.5,.9,100,8),0xbfc5ca,P2.x+dx,50,P2.z+dz);cols.push({minX:P2.x+dx-1,maxX:P2.x+dx+1,minZ:P2.z+dz-1,maxZ:P2.z+dz+1});}
 ctx.safeFence?.(P2.x-36,P2.x+36,P2.z-36,P2.z+36,{h:3,gate:{side:'z1',from:P2.x-8,to:P2.x+8}});
 label('PAD 2 · HEAVY LIFT',P2.x,6,P2.z+36.5,16);
 // the Vehicle Assembly Building: 70 m tall, with its tall door facing the pads
 {const vx=540,vz=690,vw=60,vh=70,vd=50;const doorTex=ctx.makeTex(128,256,g2=>{g2.fillStyle='#9aa3ab';g2.fillRect(0,0,128,256);g2.fillStyle='#7d868e';for(let y=0;y<256;y+=16)g2.fillRect(0,y,128,3);});
  cube(vw,vh,vd,vx,vh/2,vz,0xe3e6e8);cube(vw+1,1.5,vd+1,vx,vh,vz,0xb9bec2);cols.push({minX:vx-vw/2,maxX:vx+vw/2,minZ:vz-vd/2,maxZ:vz+vd/2});
  const door=new THREE.Mesh(new THREE.PlaneGeometry(22,60),new THREE.MeshStandardMaterial({map:doorTex}));door.position.set(vx,30,vz-vd/2-.05);door.rotation.y=Math.PI;root.add(door);
  label('VEHICLE ASSEMBLY BUILDING',vx,vh-6,vz-vd/2-.3,40);
  // the crawlerway from its door to pad 2 (packed gravel)
  cube(24,.08,vz-vd/2-(P2.z+40),vx,.05,(vz-vd/2+P2.z+40)/2,0xb8b0a2);cube(vx-P2.x+12,.08,24,(vx+P2.x)/2,.05,P2.z+40,0xb8b0a2);}
 // the fuel farm: four spherical tanks on legs
 for(const [fx,fz] of [[455,600],[470,600],[455,615],[470,615]]){add(new THREE.SphereGeometry(5,20,14),0xf2f2f2,fx,8,fz);for(const [lx,lz] of [[-3,-3],[3,-3],[-3,3],[3,3]])cube(.4,6,.4,fx+lx,3,fz+lz,0x8a9096);cols.push({minX:fx-5,maxX:fx+5,minZ:fz-5,maxZ:fz+5});}
 label('LOX · LH2 FUEL FARM',462,1.6,623,12);
 // flags at the front of the centre
 for(let i=0;i<5;i++){add(new THREE.CylinderGeometry(.08,.08,12,6),0xdddddd,410+i*5,6,718);const f=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.6),new THREE.MeshStandardMaterial({color:[0x163a5c,0xffffff,0xb74b3f,0x163a5c,0xe9bc43][i],side:THREE.DoubleSide}));f.position.set(411.4+i*5,11,718);root.add(f);}
 // a fence round the whole complex; its gate is on the west side, by the road
 ctx.safeFence?.(380,610,505,775,{h:3,gate:{side:'x0',from:700,to:716}});
 const gate={x:372+OX,z:708+OZ};
 ctx.destinations.push({name:'Nine-storey Space Centre',x:420,z:722},{name:'Rocket launch pad',x:420,z:566});
 return {root,rocket,panel,staff,floors,destinations,lift,gate,snapshot(){return {interior,floor,badge,state,destination,elapsed,away,position:rocket.position.toArray()};},restore(save){if(!save)return;interior=!!save.interior;floor=Math.max(0,Math.min(8,save.floor||0));badge=!!save.badge;state=['idle','boarding','countdown','ascent','transfer','landing','landed','returning'].includes(save.state)?save.state:'idle';destination=Math.max(0,Math.min(5,save.destination||0));elapsed=save.elapsed||0;away=!!save.away;if(save.position)rocket.position.fromArray(save.position);},get inSpace(){return ctx.playerPosition().y>250;},get rider(){return state!=='idle';},get state(){return state;},launch,update,interact(){if(state==='boarding'||state==='countdown'){state='idle';flame.visible=false;ctx.moveTo(home.x,home.y,home.z);ctx.toast('Launch aborted.');}else if(state==='landed'){state='idle';ctx.moveTo(420+destination*70,1200,716);ctx.toast('Explore '+destinations[destination][0]+'. Return to the rocket when ready.');}else ctx.toast('Remain aboard until touchdown.');},groundAt(x,z,y){x-=OX;z-=OZ;if(x>406&&x<434&&z>725.8&&z<754){const g=lift.groundAt(x,z,y);if(g!=null)return g;if(y>36)return 36.33;const hole=x>SHAFT.minX&&x<SHAFT.maxX&&z>SHAFT.minZ&&z<SHAFT.maxZ;for(let i=8;i>=0;i--){if(i&&hole)continue;const f=.4+i*4;if(y>=f-1.2)return f;}return interior?.4:null;}if(y>1100)for(let i=0;i<destinations.length;i++)if(Math.abs(x-(420+i*70))<=27&&Math.abs(z-710)<=27)return 1200;return null;}};
}
