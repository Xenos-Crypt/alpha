import * as THREE from 'three';
export function buildSpaceCentre(ctx){
 const root=new THREE.Group();ctx.scene.add(root);
 const add=(geometry,color,x,y,z,parent=root)=>{const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.65}));m.position.set(x,y,z);parent.add(m);return m;};
 const cube=(w,h,d,x,y,z,c)=>add(new THREE.BoxGeometry(w,h,d),c,x,y,z);
 const home=new THREE.Vector3(420,.55,684),staff=[],floors=['Reception and security','Mission control','Engineering design','Robotics laboratory','Propulsion laboratory','Crew training','Life support research','Administration','Observatory'];
 let interior=false,floor=0,badge=false,state='idle',destination=0,elapsed=0,away=false;
 const destinations=[['Moon',0xb3b2a7,true],['Mars',0xb36745,true],['Earth orbit',0x397bb9,false],['Jupiter orbit',0xb99c79,false],['Saturn orbit',0xcbb885,false],['Sun observatory',0xffb32f,false]];
 function label(text,x,y,z,w=15){const map=ctx.makeTex(512,96,g=>{g.fillStyle='#122c42';g.fillRect(0,0,512,96);g.fillStyle='white';g.font='bold 24px sans-serif';g.textAlign='center';g.fillText(text,256,60);});const m=new THREE.Mesh(new THREE.PlaneGeometry(w,2),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));m.position.set(x,y,z);root.add(m);}
 // Nine distinct floors, windows, workstations and a public lift.
 for(let level=0;level<9;level++){const y=.4+level*4;
 cube(28,.3,28,420,y-.15,740,0x8b939d);cube(28,.25,28,420,y+3.8,740,0xa9b0b7);
 for(const side of [-1,1]){cube(.3,3.8,28,420+side*14,y+1.9,740,0x526a81);cube(10,3.8,.3,420+side*9,y+1.9,726,0x526a81);}
 cube(28,3.8,.3,420,y+1.9,754,0x526a81);
 for(let x=410;x<=430;x+=5){cube(3,1.8,.08,x,y+2,725.8,0x8bc3d9);cube(3,1.8,.08,x,y+2,754.2,0x8bc3d9);}
 label((level+1)+' / '+floors[level],420,y+2.8,726-0.25,18);
 for(const side of [-1,1]){cube(5,.2,2,420+side*8,y+.9,746,0x5f6875);cube(1.4,.9,.15,420+side*8,y+1.45,746.5,0x183b55);
 const h=ctx.makePerson({outfit:level===7?0x293445:level===0?0x243b50:0xe0dfd7,hair:0x3b2c23,pants:0x344352});h.root.position.set(420+side*8,y,748);staff.push({h,x:420+side*8,y,z:748,level,phase:side});}
 ctx.interactables.push({pos:new THREE.Vector3(420,y,734),r:3,label:'Space centre lift: floor '+(level+1),action:()=>lift()});
 }
 label('ASHFORD SPACE CENTRE',420,37,725.5,24);
 const guard=ctx.makePerson({outfit:0x23384b,hair:0x322a26,pants:0x162637});guard.root.position.set(423,.4,728);staff.push({h:guard,x:423,y:.4,z:728,level:0,phase:0,guard:true});
 ctx.interactables.push({pos:new THREE.Vector3(423,.4,729),r:2.5,label:'Register visitor with security',action:()=>{badge=true;ctx.toast('Visitor badge issued. Assembly viewing and crew training are open.');}});
 const door=new THREE.Vector3(420,.4,723);ctx.interactables.push({pos:door,r:3,label:'Enter nine-storey space centre',action:()=>{if(!ctx.canTravel())return;interior=true;floor=0;ctx.moveTo(420,.4,731);}});
 for(let level=0;level<9;level++)ctx.interactables.push({pos:new THREE.Vector3(420,.4+level*4,729),r:2,label:'Leave space centre',action:()=>{interior=false;ctx.moveTo(420,.4,722);}});
 function rocketAt(x,y,z,complete=true){const g=new THREE.Group();g.position.set(x,y,z);root.add(g);add(new THREE.CylinderGeometry(1.8,2.3,15,16),0xe6e9eb,0,9,0,g);if(complete)add(new THREE.ConeGeometry(1.8,5,16),0xb74b3f,0,19,0,g);for(const side of [-1,1])add(new THREE.BoxGeometry(.35,4,4),0xb74b3f,side*2.3,3,0,g);return g;}
 const rocket=rocketAt(420,.55,700);cube(20,.3,20,420,.4,700,0x485664);
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
 function lift(){if(!ctx.canTravel())return;show('Space centre lift',floors.map((name,i)=>[(i+1)+' / '+name,()=>{interior=true;floor=i;ctx.moveTo(420,.4+i*4,736);} ]));}
 function launch(index,returning=false){interior=false;destination=index;elapsed=0;state=returning?'returning':'countdown';rocket.visible=true;rocket.position.copy(returning?new THREE.Vector3(420+index*70,1200,710):new THREE.Vector3(420,.55,700));ctx.toast(returning?'Return flight started.':'Launch countdown. Interact to abort before liftoff.');}
 ctx.interactables.push({pos:home,r:4,label:'Board rocket and select mission',action:()=>{if(!ctx.canTravel())return;show('Choose a rocket mission',destinations.map(([name],i)=>[name,()=>launch(i)]));}});
 ctx.safeFence?.(410,430,690,710,{h:2.6,gate:{side:'z0',from:417,to:423}});
 cube(3,.2,12,420,.5,692,0xaeb7bd);
 const cabin=new THREE.Group();rocket.add(cabin);cabin.position.y=10;add(new THREE.CylinderGeometry(1.6,1.6,.12,16),0x727f8b,0,-.15,0,cabin);add(new THREE.BoxGeometry(1.8,.8,.4),0x274759,0,.5,1.2,cabin);add(new THREE.BoxGeometry(1.4,.5,.03),0x87b9d3,0,1,1.4,cabin);
 const launchGuard=ctx.makePerson({outfit:0x293f56,hair:0x31291d,pants:0x1d2e3c});launchGuard.root.position.set(426,.55,690);
 ctx.interactables.push({pos:new THREE.Vector3(420,.55,695),r:4,label:'Enter rocket cabin',action:()=>{if(!ctx.canTravel())return;interior=false;state='boarding';rocket.position.set(420,.55,700);ctx.moveTo(420,10.55,700);show('Rocket cabin / mission console',destinations.map(([name],i)=>[name,()=>launch(i)]));}});
 const status=document.createElement('div');status.id='rocketFlightStatus';status.style.cssText='position:fixed;left:50%;top:90px;transform:translateX(-50%);background:#102235e8;color:white;padding:10px 16px;border-radius:10px;pointer-events:none;display:none;z-index:12';document.body.append(status);
 destinations.forEach(([name,color,walkable],i)=>{const x=420+i*70;cube(54,.5,54,x,1199.75,710,walkable?color:0x546675);label(name,x,1204,736,20);if(walkable){for(let j=0;j<12;j++){const a=j*2.4;add(new THREE.SphereGeometry(.8+j%3*.3,6,4),color,x+Math.sin(a)*20,1200.3,710+Math.cos(a)*20);}cube(7,3,5,x+16,1201.5,724,0xbfcad1);}else{add(new THREE.SphereGeometry(i===5?18:11,24,16),color,x,1225,758);if(i===4){const ring=add(new THREE.TorusGeometry(16,1,8,48),0xcbb786,x,1225,758);ring.rotation.x=1.2;}}
 ctx.interactables.push({pos:new THREE.Vector3(x,1200,710),r:5,label:'Board return rocket to Earth',action:()=>{if(away&&state==='idle'&&ctx.canTravel())launch(i,true);}});});
 function update(dt=0){
 for(const s of staff){if(!s.guard){s.h.root.position.x=s.x+Math.sin(elapsed*.4+s.phase)*.7;ctx.animatePerson?.(s.h,true,dt);}else ctx.animatePerson?.(s.h,false,dt);}
 elapsed+=dt;const p=ctx.playerPosition();
 if(state!=='idle'){
 status.style.display='block';flame.visible=state!=='countdown';
 if(state==='boarding'){status.textContent='Rocket cabin: choose a mission on the console.';}
 else if(state==='countdown'){status.textContent='Launch in '+Math.max(0,Math.ceil(5-elapsed))+'s | Interact: abort';if(elapsed>=5){state='ascent';elapsed=0;}}
 else if(state==='ascent'){rocket.position.y=.55+Math.min(1200,elapsed*elapsed*3);status.textContent='ASCENT | altitude '+Math.round(rocket.position.y)+'m';if(elapsed>=20){state='transfer';elapsed=0;}}
 else if(state==='transfer'){rocket.position.lerp(new THREE.Vector3(420+destination*70,1240,710),Math.min(1,dt*.7));status.textContent='Transfer to '+destinations[destination][0]+' | '+Math.max(0,Math.ceil(12-elapsed))+'s';if(elapsed>=12){state='landing';elapsed=0;}}
 else if(state==='landing'){rocket.position.y=1240-Math.min(40,elapsed*5);status.textContent='LANDING | Interact after touchdown to explore';if(elapsed>=8){state='landed';away=true;flame.visible=false;}}
 else if(state==='returning'){rocket.position.lerp(new THREE.Vector3(420,.55,700),Math.min(1,dt*.25));status.textContent='RETURN TO EARTH | '+Math.max(0,Math.ceil(25-elapsed))+'s';if(elapsed>=25){rocket.position.set(420,.55,700);state='idle';away=false;flame.visible=false;ctx.moveTo(home.x,home.y,home.z);status.style.display='none';}}
 if(state!=='idle')ctx.moveTo(rocket.position.x,rocket.position.y+10,rocket.position.z);
 }else{status.style.display='none';if(away&&p.y>1100){p.x=THREE.MathUtils.clamp(p.x,420+destination*70-25,420+destination*70+25);p.z=THREE.MathUtils.clamp(p.z,685,735);}if(interior){p.x=THREE.MathUtils.clamp(p.x,407,433);p.z=THREE.MathUtils.clamp(p.z,727,753);}}
 }
 ctx.destinations.push({name:'Nine-storey Space Centre',x:420,z:722},{name:'Rocket launch pad',x:420,z:684});
 return {root,rocket,panel,staff,floors,destinations,snapshot(){return {interior,floor,badge,state,destination,elapsed,away,position:rocket.position.toArray()};},restore(save){if(!save)return;interior=!!save.interior;floor=Math.max(0,Math.min(8,save.floor||0));badge=!!save.badge;state=['idle','boarding','countdown','ascent','transfer','landing','landed','returning'].includes(save.state)?save.state:'idle';destination=Math.max(0,Math.min(5,save.destination||0));elapsed=save.elapsed||0;away=!!save.away;if(save.position)rocket.position.fromArray(save.position);},get inSpace(){return ctx.playerPosition().y>250;},get rider(){return state!=='idle';},get state(){return state;},launch,update,interact(){if(state==='boarding'||state==='countdown'){state='idle';flame.visible=false;ctx.moveTo(home.x,home.y,home.z);ctx.toast('Launch aborted.');}else if(state==='landed'){state='idle';ctx.moveTo(420+destination*70,1200,716);ctx.toast('Explore '+destinations[destination][0]+'. Return to the rocket when ready.');}else ctx.toast('Remain aboard until touchdown.');},groundAt(x,z,y){if(interior&&Math.abs(x-420)<14&&z>726&&z<754)return .4+floor*4;if(y>1100)for(let i=0;i<destinations.length;i++)if(Math.abs(x-(420+i*70))<=27&&Math.abs(z-710)<=27)return 1200;return null;}};
}
