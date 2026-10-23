import * as THREE from 'three';
import {ROAD_LAYOUT} from './junction-control.js';
export function buildStreetDesign({scene,box,makeTex,addTrafficLight}){
 const asphalt=makeTex(512,512,c=>{c.fillStyle='#454b4d';c.fillRect(0,0,512,512);for(let i=0;i<18000;i++){c.fillStyle=i%2?'rgba(225,225,220,.035)':'rgba(8,14,19,.045)';c.fillRect((i*137)%512,(i*223+Math.floor(i/512)*17)%512,1,1);}});
 asphalt.wrapS=asphalt.wrapT=THREE.RepeatWrapping;asphalt.repeat.set(30,1);
 const surface=new THREE.Mesh(new THREE.PlaneGeometry(750,16),new THREE.MeshStandardMaterial({map:asphalt,roughness:.92}));surface.rotation.x=-Math.PI/2;surface.position.set(215,.035,0);surface.receiveShadow=true;scene.add(surface);
 const curb=new THREE.MeshStandardMaterial({color:0xb7b8ac,roughness:.94});
 const paint=new THREE.MeshStandardMaterial({color:0xe1e1d5,roughness:.94});
 const cyclePaint=new THREE.MeshStandardMaterial({color:0x806653,roughness:.97});
 const median=new THREE.MeshStandardMaterial({color:0x788479,roughness:.96});
 const add=(w,h,d,x,y,z,mat)=>box(w,h,d,x,y,z,mat,false);
 for(let cx=-4;cx<=14;cx++){
  const ix=cx*40;
  if(cx>4)for(const [dx,dz,r]of [[9.5,9.5,Math.PI],[-9.5,-9.5,0],[-9.5,9.5,Math.PI/2],[9.5,-9.5,-Math.PI/2]])addTrafficLight(ix+dx,dz,r);
  // Crossings stop at the reserved track; vehicles cross only under junction control.
  for(const side of [-1,1]){
   for(let z=-7.2;z<=7.2;z+=1.1)if(Math.abs(z)>1.7)add(2.6,.015,.5,ix+side*10.5,.057,z,paint);
   for(let x=-7.2;x<=7.2;x+=1.1)add(.5,.015,2.6,ix+x,.057,side*10.5,paint);
   add(.15,.018,5.6,ix+side*12,.06,side*4.65,paint);
   add(18,.028,1.45,ix+20,.058,side*ROAD_LAYOUT.cycleLane,cyclePaint);
   add(18,.018,.09,ix+20,.07,side*6.08,paint);
   add(18,.12,.16,ix+20,.08,side*1.74,curb);
   add(18,.2,.18,ix+20,.12,side*8.03,curb);
   // Slim garden-side railings, leaving crossing entrances unobstructed.
   for(const px of [ix+14,ix+26])add(.085,.85,.085,px,.58,side*10.8,new THREE.MeshStandardMaterial({color:0x38443e}));
   add(12,.045,.045,ix+20,.95,side*10.8,new THREE.MeshStandardMaterial({color:0x38443e}));
  }
  add(18,.025,3.3,ix+20,.055,0,median);
 }
 // Tram contact wires and slender support arms follow the central corridor.
 const wirePoints=[new THREE.Vector3(20,5.3,0),new THREE.Vector3(590,5.3,0)];
 const wire=new THREE.Line(new THREE.BufferGeometry().setFromPoints(wirePoints),new THREE.LineBasicMaterial({color:0x4e5659}));scene.add(wire);
 for(let x=20;x<=590;x+=40){add(.1,5.5,.1,x,2.75,-10.8,new THREE.MeshStandardMaterial({color:0x596668}));add(.06,.06,11,x,5.3,-5.3,new THREE.MeshStandardMaterial({color:0x596668}));}
 return {surface,wire,tramZ:ROAD_LAYOUT.tramZ,carLane:ROAD_LAYOUT.carLane,cycleLane:ROAD_LAYOUT.cycleLane};
}
