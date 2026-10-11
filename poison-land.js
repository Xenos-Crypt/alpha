import * as THREE from 'three';
export function poisonBossMultiplier(entryLevel,killLevel){return entryLevel===50&&killLevel===50?20:1;}
export function buildPoisonLand(ctx){
 const bounds={minX:600,maxX:840,minZ:200,maxZ:440},hazards=[],smoke=[],permanent=[],roamers=[];let hazardTimer=0,timer=90,temporary=null,elapsed=0;
 ctx.box(260,.4,260,720,-.2,320,0x51534a,false);
 for(let x=600;x<=840;x+=40)ctx.box(14,.04,240,x,.02,320,0x333b3a,false);
 for(let z=200;z<=440;z+=40){ctx.box(240,.04,14,720,.025,z,0x333b3a,false);for(let x=605;x<840;x+=12)ctx.box(5,.02,.16,x,.05,z,0xcaca8d,false);}
 ctx.box(180,.08,14,510,0,240,0x333b3a,false);
 function sign(text,x,z){const texture=ctx.makeTex(768,96,g=>{g.fillStyle='#223c2a';g.fillRect(0,0,768,96);g.fillStyle='#c7f884';g.font='bold 32px sans-serif';g.textAlign='center';g.fillText(text,384,60);});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(24,3),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));mesh.position.set(x,5,z);ctx.scene.add(mesh);}
 sign('POISON LAND / INDUSTRIAL EXCLUSION ZONE',600,232);
 for(const [x,z]of [[620,220],[660,220],[740,220],[820,220],[620,300],[700,300],[780,300],[820,380],[620,420],[700,420]]){
 ctx.box(24,10,24,x,5,z,0x626959,true);ctx.box(25,.4,25,x,10.2,z,0x40483e,false);ctx.box(4,20,4,x+7,10,z+7,0x4b5148,true);
 const h={x:x+7,z:z+7,r:12};hazards.push(h);
 for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(2.7,7,5),new THREE.MeshBasicMaterial({color:0x8eac51,transparent:true,opacity:.2,depthWrite:false}));m.position.set(h.x,22+i*4,h.z);ctx.scene.add(m);smoke.push({m,h,i});}
 const pool=new THREE.Mesh(new THREE.CircleGeometry(4,18),new THREE.MeshStandardMaterial({color:0x729d22,emissive:0x467517,emissiveIntensity:.7}));pool.rotation.x=-Math.PI/2;pool.position.set(x-8,.07,z+15);ctx.scene.add(pool);hazards.push({x:x-8,z:z+15,r:4,pool:true});
 }
 function gate(name,x,z,level,persistent=true,finalBoss=false){const g=ctx.createGate({name,x,z,level,persistent,finalBoss});if(persistent)permanent.push(g);return g;}
 gate('Venom Refinery',640,260,35);gate('Toxic Waste Vault',760,340,60);gate('Great Venom Sovereign / Recommended level 100',720,380,100,true,true);
 for(let i=0;i<8;i++){const e=ctx.makeMonster(i%2?'venomStalker':'toxicCrawler',25+i*3,new THREE.Vector3(640+i%4*40,0,280+Math.floor(i/4)*80));roamers.push({e,home:e.root.position.clone(),timer:0});}
 ctx.destinations.push({name:'Poison Land',x:600,z:240});
 ctx.interactables.push({pos:new THREE.Vector3(600,0,240),r:4,label:'Poison Land safety notice',action:()=>ctx.toast('Industrial gas and waste damage health. Permanent gates remain; unstable poison portals open periodically. The Sovereign is level 100, but anyone may challenge it.')});
 return {bounds,hazards,permanent,roamers,get temporary(){return temporary;},groundAt(x,z){return x>=590&&x<=850&&z>=190&&z<=450||x>=420&&x<=600&&Math.abs(z-240)<=7?0:null;},update(dt){elapsed+=dt;timer-=dt;for(const s of smoke){s.m.position.y=20+(elapsed*2+s.i*5)%18;s.m.scale.setScalar(1+(s.m.position.y-20)*.06);}
 hazardTimer-=dt;const p=ctx.playerPosition();if(hazardTimer<=0&&!ctx.inDungeon()&&p.x>=600&&p.x<=840&&p.z>=200&&p.z<=440&&p.y<18){const hazard=hazards.find(h=>Math.hypot(p.x-h.x,p.z-h.z)<h.r);if(hazard){ctx.hurt(hazard.pool?8:2.5,p,0);hazardTimer=.5;}}
 if(temporary&&elapsed>=temporary.expires){ctx.removeGate(temporary);temporary=null;}
 if(timer<=0){timer=150;if(!temporary){temporary=gate('Unstable Venom Breach',680,360,45,false);temporary.expires=elapsed+60;ctx.toast('A temporary poison portal has opened in Poison Land for 60 seconds.');}}
 for(const r of roamers){if(!r.e.alive){r.timer+=dt;if(r.timer>90){ctx.removeEnemy(r.e);r.e=ctx.makeMonster('venomStalker',35,r.home.clone());r.timer=0;}}else if(!ctx.inDungeon()&&r.e.root.position.distanceTo(r.home)>70)r.e.root.position.copy(r.home);}
 }};
}
