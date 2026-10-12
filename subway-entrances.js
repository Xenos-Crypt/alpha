import * as THREE from 'three';
export function buildSubwayEntrances(ctx,stations){
 const holes=stations.map(s=>({minX:s.x-2,maxX:s.x+2,minZ:s.z-6,maxZ:s.z+6}));
 const parts=[];
 function block(w,h,d,x,y,z,c){const m=ctx.box(w,h,d,x,y,z,c,false);if(m){m.userData.subwayEntrance=true;parts.push(m);}return m;}
 for(const [index,s]of stations.entries()){
  const h=holes[index];ctx.clearEntrance?.(h);s.entrance=h;
  // The surface opening is genuinely cut out; these treads descend below street level.
  for(let i=0;i<18;i++){const y=s.y-i*.3,z=h.minZ+(i+.5)*12/18;block(4,.2,12/18,s.x,y-.1,z,0xa3aaa4);}
  for(const side of [-1,1]){block(.25,6,12,s.x+side*2.12,s.y-3,s.z,0x7e8989);block(.08,1.1,12,s.x+side*2.2,s.y+.6,s.z,0x243c39);for(let z=h.minZ;z<=h.maxZ;z+=1.5)block(.08,1.1,.08,s.x+side*2.2,s.y+.55,z,0x243c39);const g=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),new THREE.MeshStandardMaterial({color:0x73be86,emissive:0x285739,emissiveIntensity:.5}));g.position.set(s.x+side*2.2,s.y+1.4,h.minZ);ctx.scene.add(g);}
  block(4,.2,3,s.x,s.y-5.5,h.maxZ+.5,0x949d97);block(4.5,.2,1,s.x,s.y+.1,h.minZ-.5,0xa3aaa4);
  ctx.sign('SUBWAY / '+s.name,s.x,s.y+2.5,h.minZ-.3,7);
 }
 function cutSurfaces(){for(const m of ctx.scene.children){if(!m.isMesh||m.isInstancedMesh||m.userData.subwayEntrance||m.visible===false||m.position.y>.6||m.position.y<-.3)continue;const g=m.geometry;if(g.type!=='PlaneGeometry'&&!(g.type==='BoxGeometry'&&g.parameters.height<=.5))continue;const original=Array.isArray(m.material)?m.material:[m.material];const materials=original.map(mat=>{const clone=mat.clone();clone.onBeforeCompile=shader=>{shader.uniforms.subwayHoles={value:holes.map(h=>new THREE.Vector4(h.minX,h.maxX,h.minZ,h.maxZ))};shader.vertexShader='varying vec3 subwayWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','subwayWorld=(modelMatrix*vec4(transformed,1.0)).xyz;\n#include <project_vertex>');shader.fragmentShader='varying vec3 subwayWorld;\nuniform vec4 subwayHoles['+holes.length+'];\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfor(int i=0;i<'+holes.length+';i++){vec4 h=subwayHoles[i];if(subwayWorld.x>h.x&&subwayWorld.x<h.y&&subwayWorld.z>h.z&&subwayWorld.z<h.w)discard;}');};clone.customProgramCacheKey=()=> 'subway-surface-openings-v1';return clone;});m.material=Array.isArray(m.material)?materials:materials[0];}}
 return {holes,parts,cutSurfaces,groundAt(x,z){for(const [i,h]of holes.entries())if(x>=h.minX&&x<=h.maxX&&z>=h.minZ&&z<=h.maxZ+1)return stations[i].y-Math.min(18,Math.floor((z-h.minZ)/(12/18)))*.3;return null;}};
}
