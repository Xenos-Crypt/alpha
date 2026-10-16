import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from '../../node_modules/three/build/three.module.js';
import {buildRoadVehicle} from '../../road-vehicle-models.js';
import {mergeGeometries,mergeVertices} from '../../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
const destination=fileURLToPath(new URL('../Assets/Resources/VehicleModels/',import.meta.url));
await fs.mkdir(destination,{recursive:true});
const light=new THREE.MeshStandardMaterial({color:0xf7e9c2,emissive:0xffd79a,emissiveIntensity:.4});
const tail=new THREE.MeshStandardMaterial({color:0x8b2520,emissive:0xc83320,emissiveIntensity:.3});
const red=new THREE.MeshStandardMaterial({color:0x9d2634,emissive:0xe53446,emissiveIntensity:1.5});
const blue=new THREE.MeshStandardMaterial({color:0x244ba4,emissive:0x4389ff,emissiveIntensity:1.5});
const summaries=[];
for(const kind of ['car','police','ambulance','motorcycle','bicycle']){
 const v=buildRoadVehicle({scene:new THREE.Scene(),kind,color:0x506f7a,makeTex:()=>new THREE.Texture(),headMat:light,tailMat:tail,sirenRed:red,sirenBlue:blue,ambRed:blue,ambWhite:blue});
 v.group.updateMatrixWorld(true);const materials=[],materialIndices=new Map(),groups=new Map();
 v.group.traverse(m=>{
  if(!m.isMesh)return;const material=m.material;const signature=[material.color.getHex(),material.emissive.getHex(),material.emissiveIntensity,material.roughness,material.metalness].join(':');let index=materialIndices.get(signature);
  if(index===undefined){index=materials.length;materialIndices.set(signature,index);materials.push({color:'#'+material.color.getHexString(),emission:'#'+material.emissive.getHexString(),emissionIntensity:material.emissiveIntensity,roughness:material.roughness,metallic:material.metalness,paint:material.color.getHex()===0x506f7a});}
  let owner=m;while(owner.parent&&owner.parent!==v.group&&!v.wheels.includes(owner))owner=owner.parent;
  const wheelIndex=v.wheels.indexOf(owner);const k=`${wheelIndex}:${index}`;
  let geometry=m.geometry.clone();if(geometry.index){const g=geometry.toNonIndexed();geometry.dispose();geometry=g;}
  const matrix=wheelIndex>=0?new THREE.Matrix4().copy(owner.matrixWorld).invert().multiply(m.matrixWorld):m.matrixWorld;
  geometry.applyMatrix4(matrix);if(!groups.has(k))groups.set(k,{wheel:wheelIndex,material:index,geometries:[]});groups.get(k).geometries.push(geometry);
 });
 const meshes=[];for(const group of groups.values()){
  const combined=mergeGeometries(group.geometries,false),g=mergeVertices(combined,1e-5),count=g.index.count;
  // Winding must stay aligned with exported outward normals; reversal rendered shells and tyres inside-out.
  const triangles=[];for(let i=0;i<count;i+=3)triangles.push(g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2));
  const compact=a=>Array.from(a,n=>Number(n.toFixed(5)));
  meshes.push({wheel:group.wheel,material:group.material,positions:compact(g.attributes.position.array),normals:compact(g.attributes.normal.array),uv:compact(g.attributes.uv.array),triangles});
 }
 const data={kind,length:v.length,width:v.width,wheels:v.wheels.map(w=>({x:w.position.x,y:w.position.y,z:w.position.z})),materials,meshes};
 await fs.writeFile(path.join(destination,kind+'.json'),JSON.stringify(data));summaries.push({kind,meshes:meshes.length,vertices:meshes.reduce((n,m)=>n+m.positions.length/3,0)});
}
console.log(JSON.stringify(summaries,null,2));
