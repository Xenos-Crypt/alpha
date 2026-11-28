import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {buildDoors} from './doors.js';
test('civic swing and revolving doors stay outside the facade through their opening sweep',()=>{
 for(const type of ['house','office','hospital'])for(const face of [-1,1]){
  const b={x:0,z:0,minX:-5,maxX:5,minZ:-5,maxZ:5,type,doorFace:face};
  const scene=new THREE.Scene(),p=new THREE.Vector3(0,0,face*6);
  const system=buildDoors({scene,buildings:[b],colliders:[],playerPos:()=>p,hourNow:()=>12,groundY:()=>0});
  for(let i=0;i<80;i++){
   system.update(.05);scene.updateMatrixWorld(true);
   const d=system.doors[0],moving=d.parts.hinge||d.parts.wings;
   if(moving){const bounds=new THREE.Box3().setFromObject(moving);assert.ok(face===1?bounds.min.z>5:bounds.max.z< -5,`${type} clips facade at frame ${i}`);}
  }
 }
});
test('a building is entered at its door, not through its back or side walls',async()=>{
 const {doorReach}=await import('./doors.js');
 for(const type of ['shop','house','office'])for(const face of [-1,1]){
  const b={x:0,z:0,minX:-5,maxX:5,minZ:-5,maxZ:5,type,doorFace:face};
  buildDoors({scene:new THREE.Scene(),buildings:[b],colliders:[],playerPos:()=>new THREE.Vector3(),hourNow:()=>12,groundY:()=>0});
  const at=(x,z)=>doorReach(b,{x,z});
  assert.ok(at(0,face*6.5)!=null,`${type}: the door works from the street in front of it`);
  assert.equal(at(0,-face*6),null,`${type}: no way in from behind the back wall`);
  assert.equal(at(6,0),null,`${type}: no way in from the east wall`);
  assert.equal(at(-6,0),null,`${type}: no way in from the west wall`);
  assert.equal(at(0,face*14),null,`${type}: not from across the street`);
 }
});
