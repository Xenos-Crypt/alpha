import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export function buildRoadVehicle({scene,makeTex,kind,color,headMat,tailMat,sirenRed,sirenBlue,ambRed,ambWhite}){
 const group=new THREE.Group();scene.add(group);
 const paint=new THREE.MeshStandardMaterial({color,metalness:.35,roughness:.3});
 const dark=new THREE.MeshStandardMaterial({color:0x20272c,roughness:.72});
 const chrome=new THREE.MeshStandardMaterial({color:0xb8c1c5,metalness:.85,roughness:.22});
 const glass=new THREE.MeshStandardMaterial({color:0x385462,metalness:.3,roughness:.18});
 const wheels=[];
 const part=(w,h,d,x,y,z,mat=paint,rounded=true)=>{const m=new THREE.Mesh(rounded?new RoundedBoxGeometry(w,h,d,2,Math.min(.075,w/4,h/4,d/4)):new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;group.add(m);return m;};
 const wheel=(x,z,r=.38,width=.24)=>{
  const pivot=new THREE.Group();pivot.position.set(x,r,z);group.add(pivot);
  const tyre=new THREE.Mesh(new THREE.CylinderGeometry(r,r,width,20),dark);tyre.rotation.z=Math.PI/2;pivot.add(tyre);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(r*.62,r*.62,width+.015,12),chrome);rim.rotation.z=Math.PI/2;pivot.add(rim);
  for(const side of [-1,1]){const cap=new THREE.Mesh(new THREE.CylinderGeometry(r*.19,r*.19,.025,10),dark);cap.rotation.z=Math.PI/2;cap.position.x=side*(width/2+.02);pivot.add(cap);}
  wheels.push(pivot);
 };
 const text=(label,width,height,x,y,z,rot=0,bg='#e4efb4',fg='#173f36')=>{
  const map=makeTex(512,128,c=>{c.fillStyle=bg;c.fillRect(0,0,512,128);c.fillStyle=fg;c.textAlign='center';c.font='bold 68px sans-serif';c.fillText(label,256,88);});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshStandardMaterial({map,roughness:.8}));m.position.set(x,y,z);m.rotation.y=rot;group.add(m);
 };
 if(kind==='motorcycle'||kind==='bicycle'){
  const motor=kind==='motorcycle';for(const z of [-.88,.88])wheel(0,z,.36,.16);
  part(.22,.2,1.55,0,.48,0,dark);part(.48,.22,.6,0,.96,-.35,dark);
  if(motor){part(.5,.38,.7,0,.62,0,chrome);part(.52,.42,.65,0,1.04,.3);part(.56,.4,.38,0,1.1,.75);part(.13,.12,1.05,.34,.42,-.35,chrome);}
  else{part(.08,.62,.08,0,.73,0,paint).rotation.x=.65;part(.08,.08,1.45,0,.65,0,paint);part(.08,.62,.08,0,.73,-.55,paint).rotation.x=-.65;}
  for(const side of [-1,1])part(.055,.65,.06,side*.13,.75,.85,chrome).rotation.x=-.18;
  part(.8,.06,.06,0,1.31,.72,chrome);for(const side of [-1,1])part(.2,.08,.09,side*.38,1.31,.72,dark);
  part(.28,.16,.05,0,1.12,1.0,headMat);part(.24,.09,.06,0,.85,-1.02,tailMat);
  for(const side of [-1,1]){part(.03,.25,.03,side*.38,1.46,.69,chrome);part(.2,.12,.035,side*.38,1.61,.69,dark);}
  return {kind,group,wheels,length:2.1,width:.8,radius:.7,speed:0,maxSpeed:motor?65:12,health:100,ai:null,modelType:motor?'motorcycle':'bicycle'};
 }
 if(kind==='ambulance'){
  const white=new THREE.MeshStandardMaterial({color:0xf0eee0,roughness:.4});
  const yellow=new THREE.MeshStandardMaterial({color:0xd4e332,roughness:.55}),green=new THREE.MeshStandardMaterial({color:0x268c65,roughness:.65});
  part(2.25,.75,5.5,0,.75,0,white);part(2.22,1.7,3.65,0,1.7,-.75,white);
  part(2.12,.9,1.7,0,1.42,1.55,white);part(1.95,.1,1.6,0,2.07,1.51,white);
  const wind=part(1.92,.65,.05,0,1.64,2.33,glass,false);wind.rotation.x=-.13;
  for(const s of [-1,1]){
   part(.045,.59,1.1,s*1.08,1.65,1.58,glass,false);part(.12,.25,.3,s*1.26,1.6,2, dark);
   for(let i=0;i<9;i++)for(let row=0;row<2;row++)part(.035,.25,.43,s*1.13,1.04+row*.26,-2.35+i*.46,(i+row)%2?yellow:green,false);
   text('AMBULANCE',2.75,.35,s*1.14,2.03,-.65,s*Math.PI/2);
   part(.07,.08,.24,s*1.13,1.29,-1.95,chrome);part(.07,.08,.22,s*1.1,1.24,1.1,chrome);
   wheel(s*1.15,-1.72,.43,.29);wheel(s*1.15,1.72,.43,.29);
  }
  part(2.3,.21,.16,0,.48,2.81,dark);part(1.3,.3,.06,0,.86,2.8,dark);
  for(const s of [-1,1])part(.45,.24,.06,s*.8,1.07,2.79,headMat);
  for(const s of [-1,1]){part(.04,1.42,.05,s*.04,1.56,-2.59,dark);part(.07,.3,.045,s*.25,1.37,-2.64,chrome);part(.17,.47,.05,s*.96,1.11,-2.65,tailMat);}
  text('AMBULANCE',1.9,.29,0,2.2,-2.66,Math.PI);
  for(let i=0;i<8;i++){const chevron=part(.29,.75,.04,-.98+i*.28,1.45,-2.64,i%2?yellow:new THREE.MeshStandardMaterial({color:0xcf342c}),false);chevron.rotation.z=(i<4?-1:1)*.3;}
  for(const s of [-1,1])part(.58,.13,.26,s*.65,2.65,-.2,s<0?ambRed:ambWhite);
  text('999',.48,.25,1.14,2.34,-1.87,Math.PI/2);
  return {kind,group,wheels,length:5.65,width:2.3,radius:2.05,speed:0,maxSpeed:65,health:100,ai:null,modelType:'ambulance-van'};
 }
 // A shaped saloon body with separate glass, pillars, mirrors and door seams.
 part(1.98,.55,4.25,0,.64,0);part(1.85,.16,1.1,0,.96,1.42);part(1.8,.14,.65,0,1,-1.68);
 part(1.67,.1,1.95,0,1.65,-.18);
 const wind=part(1.52,.63,.045,0,1.32,.84,glass,false);wind.rotation.x=-.35;
 const rear=part(1.48,.52,.045,0,1.34,-1.2,glass,false);rear.rotation.x=.4;
 for(const side of [-1,1]){
  for(const pz of [.32,-.64])part(.035,.52,.77,side*.85,1.31,pz,glass,false);
  for(const pz of [.79,-.17,-1.12])part(.07,.63,.07,side*.87,1.32,pz);
  part(.03,.035,1.9,side*.92,1.03,-.15,chrome,false);
  for(const pz of [.1,-.86])part(.045,.045,.18,side*1.003,.96,pz,chrome);
  part(.04,.43,.025,side*1.005,.69,-.22,dark,false);
  part(.2,.16,.32,side*1.09,1.24,.64,dark);
  for(const pz of [-1.34,1.34])wheel(side*1.01,pz);
 }
 for(const pz of [-2.18,2.18])part(1.94,.16,.14,0,.44,pz,dark);
 part(1.04,.22,.065,0,.75,2.14,dark);for(let i=-3;i<=3;i++)part(.024,.18,.02,i*.135,.75,2.18,chrome,false);
 for(const side of [-1,1]){part(.48,.17,.065,side*.68,.88,2.13,headMat);part(.52,.16,.065,side*.67,.85,-2.13,tailMat);}
 text('AW 20',.6,.13,0,.48,-2.265,Math.PI,'#f0d85b','#162326');
 if(kind==='police'){
  for(const side of [-1,1])for(let i=0;i<7;i++)part(.025,.22,.55,side*1.005,.7,-1.68+i*.56,new THREE.MeshStandardMaterial({color:i%2?0xd6e938:0x3769b8}),false);
  part(.55,.14,.3,-.35,1.82,-.15,sirenBlue);part(.55,.14,.3,.35,1.82,-.15,sirenRed);
 }
 return {kind,group,wheels,length:4.4,width:2.1,radius:1.8,speed:0,maxSpeed:kind==='police'?85:75,health:100,ai:null,modelType:'saloon'};
}
