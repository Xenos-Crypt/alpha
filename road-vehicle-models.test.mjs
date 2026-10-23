import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildRoadVehicle} from './road-vehicle-models.js';
const scene=new THREE.Scene(),light=new THREE.MeshStandardMaterial({color:0xffffff});
for(const kind of ['car','police','ambulance','motorcycle','bicycle']){
 const v=buildRoadVehicle({scene,kind,color:0x607c89,makeTex:()=>new THREE.Texture(),headMat:light,tailMat:light,sirenRed:light,sirenBlue:light,ambRed:light,ambWhite:light});
 assert.equal(v.wheels.length,['motorcycle','bicycle'].includes(kind)?2:4);
 v.group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(v.group),size=bounds.getSize(new THREE.Vector3());
 assert(size.x<v.width+.5);assert(size.z<v.length+.5);
 if(kind==='ambulance'){assert(size.y>2.5);assert(v.length>5.5);assert.equal(v.modelType,'ambulance-van');}
 assert(v.group.children.length>15);
}
console.log('PASS: saloon, police, ambulance van, motorcycle and bicycle geometry and collision dimensions');
