import * as THREE from 'three';
import {arrivalBoard,formatWait} from './arrival-boards.js';
export function buildUrban(ctx){
 const {scene,box,sitSpots,interactables,makePerson,animatePerson,makeTex}=ctx;const vendors=[],hands=[],busBoards=[];
 // A dedicated centre avoids placing the tower in a traffic intersection.
 box(90,.16,90,310,.08,65,0xaab0ab,false);box(8,.16,35,310,.08,8,0xaab0ab,false);
 function label(text,x,y,z,width=8){const map=makeTex(768,96,g=>{g.fillStyle='#2a4954';g.fillRect(0,0,768,96);g.fillStyle='white';g.font='bold 36px sans-serif';g.textAlign='center';g.fillText(text,384,60);});const m=new THREE.Mesh(new THREE.PlaneGeometry(width,1.2),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));m.position.set(x,y,z);scene.add(m);return m;}
 for(const x of [253,367])for(const z of [38,68,98]){
  const facade=box(16,11,24,x,5.5,z,0xc8bcaa);ctx.camBlockers.push(facade);ctx.planeBlocks.push({minX:x-8,maxX:x+8,minZ:z-12,maxZ:z+12,top:11});
  for(const y of [2,5,8])for(const dz of [-7,0,7])box(.1,1.6,2,x+(x<310?8.05:-8.05),y,z+dz,0x7194a8,false);
  box(17,.3,25,x,11.15,z,0x53616c,false);
  const sign=label(z===38?'CAFES AND BAKERY':z===68?'SHOPS AND HOMES':'CITY OFFICES',x+(x<310?8.1:-8.1),3.5,z,10);sign.rotation.y=x<310?Math.PI/2:-Math.PI/2;
 }
 const names=['FRUIT AND VEG','BAKERY','FLOWERS','STREET FOOD','LOCAL CRAFTS','BOOKS','FRESH PRODUCE','COFFEE'];
 for(let i=0;i<8;i++){
  const x=i<4?282:338,z=49+(i%4)*15,color=[0xa9584e,0x547b69,0xba974b,0x577e96][i%4];
  box(6,.9,2,x,.61,z,0x796149);box(7,.15,4.6,x,3.1,z,color,false);for(const dx of [-3,3])for(const dz of [-2,2])box(.1,3,.1,x+dx,1.6,z+dz,0x4b5456,false);
  label(names[i],x,2.4,z-1.1,6).rotation.y=Math.PI;
  for(let j=0;j<4;j++)box(.8,.3,.7,x-1.5+j,1.2,z,0xb68a4e,false);
  const h=makePerson({outfit:color,hair:0x43332c,pants:0x344555});h.root.position.set(x,.16,z+1.4);h.root.rotation.y=Math.PI;vendors.push(h);
  interactables.push({pos:new THREE.Vector3(x,.16,z-2),r:2,label:'Visit '+names[i].toLowerCase(),action:()=>[0,1,3,6,7].includes(i)?ctx.buyFood():ctx.toast(names[i]+': browse the local market stall.')});
 }
 // Four working clock faces and a visible brass bell above the tower.
 const tower=box(9,29,9,310,14.5,29,0xb8aa8d);ctx.camBlockers.push(tower);ctx.planeBlocks.push({minX:304,maxX:316,minZ:23,maxZ:35,top:43});box(12,.6,12,310,29.3,29,0x877c65,false);box(10,8,10,310,33.6,29,0xb8aa8d,false);
 const faceMap=makeTex(512,512,g=>{g.fillStyle='#eee5cc';g.beginPath();g.arc(256,256,248,0,Math.PI*2);g.fill();g.fillStyle='#25353c';g.textAlign='center';g.textBaseline='middle';g.font='bold 42px serif';for(let n=1;n<=12;n++){const a=n*Math.PI/6;g.fillText(String(n),256+Math.sin(a)*196,256-Math.cos(a)*196);}});
 for(let i=0;i<4;i++){
  const g=new THREE.Group();g.position.set(310+Math.sin(i*Math.PI/2)*5.05,33.8,29+Math.cos(i*Math.PI/2)*5.05);g.rotation.y=i*Math.PI/2;scene.add(g);
  const face=new THREE.Mesh(new THREE.CircleGeometry(3.3,48),new THREE.MeshBasicMaterial({map:faceMap}));g.add(face);
  const hp=new THREE.Group(),mp=new THREE.Group();g.add(hp,mp);
  for(const [pivot,len,w]of [[hp,1.6,.18],[mp,2.4,.12]]){const arm=new THREE.Mesh(new THREE.BoxGeometry(w,len,.08),new THREE.MeshStandardMaterial({color:0x27373d}));arm.position.set(0,len/2,.12);pivot.add(arm);}hands.push({hp,mp});
 }
 for(const dx of [-4,4])for(const dz of [-4,4])box(.3,5,.3,310+dx,40,29+dz,0x7e7867,false);
 box(11,.5,11,310,42.7,29,0x53636d,false);
 const bell=new THREE.Mesh(new THREE.ConeGeometry(1.7,2.5,24,1,true),new THREE.MeshStandardMaterial({color:0xbf9841,metalness:.65,roughness:.3,side:THREE.DoubleSide}));bell.position.set(310,40.3,29);scene.add(bell);
 label('ASHFORD CENTRAL MARKET',310,3,112,20);ctx.destinations.push({name:'City centre and market',x:310,z:114});
 // Open gutters run beside the existing city road grid.
 for(let line=-160;line<=160;line+=40)for(const side of [-1,1]){box(320,.035,.35,0,.035,line+side*5.3,0x414a4d,false);box(.35,.035,320,line+side*5.3,.035,0,0x414a4d,false);}
 const grateMap=makeTex(64,64,g=>{g.fillStyle='#222c33';g.fillRect(0,0,64,64);g.fillStyle='#86949e';for(let x=6;x<64;x+=10)g.fillRect(x,3,4,58);});
 const drain=new THREE.InstancedMesh(new THREE.BoxGeometry(.65,.025,.55),new THREE.MeshStandardMaterial({color:0xffffff,map:grateMap}),81);const dummy=new THREE.Object3D();let k=0;for(let x=-160;x<=160;x+=40)for(let z=-160;z<=160;z+=40){dummy.position.set(x+5.1,.065,z+7);dummy.updateMatrix();drain.setMatrixAt(k++,dummy.matrix);}scene.add(drain);
 for(const stop of ctx.busStops){const board=arrivalBoard(ctx,'BUS STOP '+(ctx.busStops.indexOf(stop)+1),stop.wait.x,2.7,stop.wait.z,stop.face);busBoards.push({stop,board});}
 let boardTimer=0,previousHour=null,ring=0,audio=null;
 document.addEventListener('pointerdown',()=>{try{audio=new (window.AudioContext||window.webkitAudioContext)();}catch{}},{once:true});
 function chime(){if(!audio)return;const volume=ctx.volume();for(const [freq,strength]of [[440,.1],[887,.04],[1320,.02]]){const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.frequency.value=freq;gain.gain.setValueAtTime(strength*volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+2);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+2.1);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};}}
 function busArrival(stop){let best=Infinity,boarding=false;for(const v of ctx.vehicles){if(v.kind!=='bus'||v.disabled||v.ai?.route!==ctx.busRoute)continue;const ai=v.ai,n=ctx.busRoute.length;if(ai.routeIdx===stop.seg&&ai.stopped&&ai.stopTimer>0){boarding=true;best=0;break;}let distance=((stop.seg-ai.routeIdx+n)%n)*40+20-ai.s;if(distance<0)distance+=n*40;let waits=0;for(const s of ctx.busStops){let d=((s.seg-ai.routeIdx+n)%n)*40+20-ai.s;if(d<0)d+=n*40;if(d>0&&d<distance)waits+=5;}best=Math.min(best,distance/(ai.cruise||8)+waits+Math.max(0,ai.stopTimer));}return {boarding,seconds:best};}
 function update(dayTime,dt){const hours=(dayTime*24+6)%24;for(const h of hands){h.hp.rotation.z=-hours*Math.PI/6;h.mp.rotation.z=-(hours%1)*Math.PI*2;}const hour=Math.floor(hours);if(previousHour!==null&&previousHour!==hour){ring=2;if(ctx.playerPos().distanceTo(bell.position)<130)chime();}previousHour=hour;ring=Math.max(0,ring-dt);bell.rotation.z=ring>0?Math.sin(ring*10)*.2:0;for(const h of vendors)animatePerson(h,false,dt);boardTimer-=dt;if(boardTimer<=0){boardTimer=1;for(const {stop,board}of busBoards){const eta=busArrival(stop);board.update(eta.boarding?'BOARDING NOW':Number.isFinite(eta.seconds)?'ARRIVAL ~'+formatWait(eta.seconds):'NO SERVICE','Estimated from bus route progress');}}}
 return {hands,bell,vendors,busBoards,busArrival,update,groundAt(x,z){if(x>=265&&x<=355&&z>=20&&z<=110)return .16;if(x>306&&x<314&&z>=-4&&z<20)return .16;return null;}};
}
