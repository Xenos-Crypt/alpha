import * as THREE from 'three';
export function buildHighlandForest(ctx){
 let seed=71821;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},points=[];
 for(let i=0;i<1050;i++){const x=-530+rand()*230,z=580+rand()*350;if(Math.abs(x+400)<22&&z>740&&z<830||Math.abs(x+310)<6||ctx.insideCollider(new THREE.Vector3(x,0,z)))continue;const y=ctx.groundY(x,z);if(y>43)continue;points.push({x,y,z,s: .8+rand()*.8});}
 const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.18,.28,5,6),new THREE.MeshStandardMaterial({color:0x674b32}),points.length),leaves=new THREE.InstancedMesh(new THREE.ConeGeometry(2.6,7,7),new THREE.MeshStandardMaterial({color:0x285c39}),points.length),dummy=new THREE.Object3D();
 points.forEach((p,i)=>{dummy.scale.setScalar(p.s);dummy.position.set(p.x,p.y+2.5*p.s,p.z);dummy.updateMatrix();trunk.setMatrixAt(i,dummy.matrix);dummy.position.y=p.y+6*p.s;dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leaves.setColorAt(i,new THREE.Color().setHSL(.29+rand()*.08,.35,.18+rand()*.11));ctx.colliders.push({minX:p.x-.25*p.s,maxX:p.x+.25*p.s,minZ:p.z-.25*p.s,maxZ:p.z+.25*p.s});});trunk.castShadow=true;leaves.castShadow=true;ctx.scene.add(trunk,leaves);for(let i=0;i<18;i++){const p=points[i*30];if(p)ctx.addBird(p.x,p.z,p.y+12);}return {points,trunk,leaves};
}
export function buildVolcanicIsland(ctx){
 const island={name:'Ember Island',x:155,z:520,r:29,style:'lava'},lavaMaterial=new THREE.MeshStandardMaterial({color:0xf56713,emissive:0xff3c00,emissiveIntensity:1.7}),lava=[];
 const land=new THREE.Mesh(new THREE.CylinderGeometry(29,32,3,40),new THREE.MeshStandardMaterial({color:0x393a37}));land.position.set(155,-1.3,520);ctx.scene.add(land);
 const volcano=new THREE.Mesh(new THREE.CylinderGeometry(6,17,18,24,1,true),new THREE.MeshStandardMaterial({color:0x443b37,side:THREE.DoubleSide}));volcano.position.set(155,9.2,526);ctx.scene.add(volcano);
 const crater=new THREE.Mesh(new THREE.CircleGeometry(5.8,24),lavaMaterial);crater.rotation.x=-Math.PI/2;crater.position.set(155,18.25,526);ctx.scene.add(crater);
 for(const [x,z,r]of [[146,510,4],[164,520,3],[153,539,4]]){const pool=new THREE.Mesh(new THREE.CircleGeometry(r,24),lavaMaterial);pool.rotation.x=-Math.PI/2;pool.position.set(x,.24,z);ctx.scene.add(pool);lava.push({x,z,r});}
 ctx.box(3,.25,12,155,.08,484,0x85847b,false);ctx.interactables.push({pos:new THREE.Vector3(155,.2,493),r:3,label:'Ember Island information',action:()=>ctx.toast('Ember Island: stay on dark rock. Lava and the crater are dangerous.')});
 return {island,lava,groundAt(x,z){const d=Math.hypot(x-155,z-526);if(d<17)return .2+Math.min(18,18*(17-d)/11);return null;},update(time,dt){lavaMaterial.emissiveIntensity=1.5+Math.sin(time*3)*.3;const p=ctx.playerPosition();if(p.y<2&&lava.some(a=>Math.hypot(p.x-a.x,p.z-a.z)<a.r)||Math.hypot(p.x-155,p.z-526)<6&&p.y<22)ctx.hurt(35*dt,p,0);}};
}
