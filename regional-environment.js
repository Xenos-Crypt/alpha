import * as THREE from 'three';
export function buildRegionalEnvironment(ctx){
 const {scene,box,makeTex}=ctx,regions=[{name:'Riverside',minX:-80,maxX:80,minZ:640,maxZ:780},{name:'Ashford Capital',minX:120,maxX:440,minZ:680,maxZ:920}];
 const islands=[{name:'Palm Cove',x:-70,z:545,r:19,style:'sand'},{name:'Pine Rock',x:-165,z:820,r:26,style:'forest'},{name:'Gull Rest',x:95,z:300,r:17,style:'rock'}],squirrels=[],roadMeshes=[];
 function tree(x,z,palm=false){box(.35,5,.35,x,2.65,z,0x73553a,false);if(palm){for(let i=0;i<5;i++){const leaf=box(5,.15,1.2,x+Math.cos(i*1.25)*1.6,5.2,z+Math.sin(i*1.25)*1.6,0x3f7e49,false);leaf.rotation.y=-i*1.25;leaf.rotation.z=.15;}}else{const m=new THREE.Mesh(new THREE.ConeGeometry(2,5,9),new THREE.MeshStandardMaterial({color:0x477250}));m.position.set(x,5,z);scene.add(m);}}
 function squirrel(x,z){const g=new THREE.Group(),brown=new THREE.MeshStandardMaterial({color:0x9a7456});for(const [r,px,py,pz,sx,sy,sz]of [[.18,0,.22,0,1,1,1.5],[.12,0,.4,.2,1,1,1],[.14,0,.45,-.25,1,2.2,1]]){const m=new THREE.Mesh(new THREE.SphereGeometry(r,8,6),brown);m.position.set(px,py,pz);m.scale.set(sx,sy,sz);g.add(m);}scene.add(g);g.position.set(x,.15,z);squirrels.push({g,x,z,phase:squirrels.length});}
 function label(text,x,z){const map=makeTex(768,96,g=>{g.fillStyle='#284e44';g.fillRect(0,0,768,96);g.fillStyle='white';g.font='bold 38px sans-serif';g.textAlign='center';g.fillText(text,384,60);});const m=new THREE.Mesh(new THREE.PlaneGeometry(10,1.3),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));m.position.set(x,2.8,z);scene.add(m);}
 for(const r of regions){box(r.maxX-r.minX,.08,r.maxZ-r.minZ,(r.minX+r.maxX)/2,0,(r.minZ+r.maxZ)/2,0x7e9075,false);
  for(let x=Math.ceil(r.minX/40)*40;x<=r.maxX;x+=40){roadMeshes.push(box(12,.04,r.maxZ-r.minZ,x,.06,(r.minZ+r.maxZ)/2,0x444b50,false));for(let z=r.minZ+8;z<r.maxZ;z+=12)box(.16,.015,6,x,.09,z,0xf1e9cb,false);for(const dx of [-5.8,5.8])box(.12,.015,r.maxZ-r.minZ,x+dx,.09,(r.minZ+r.maxZ)/2,0xd9dacf,false);}
  for(let z=Math.ceil(r.minZ/40)*40;z<=r.maxZ;z+=40){roadMeshes.push(box(r.maxX-r.minX,.04,12,(r.minX+r.maxX)/2,.061,z,0x444b50,false));for(let x=r.minX+8;x<r.maxX;x+=12)box(6,.015,.16,x,.09,z,0xf1e9cb,false);for(let x=Math.ceil(r.minX/40)*40;x<=r.maxX;x+=40){for(let stripe=-3;stripe<=3;stripe++)box(.5,.015,3,x+stripe*.9,.1,z+8,0xeeeecc,false);if(!ctx.insideCollider(new THREE.Vector3(x+6.2,0,z+6.2)))ctx.addTrafficLight(x+6.2,z+6.2,Math.PI);}}
  for(let i=0;i<6;i++){const x=i%2?r.maxX-2:r.minX+2,z=r.minZ+20+i*(r.maxZ-r.minZ-40)/6;tree(x,z);squirrel(x+2,z+2);ctx.addBird(x,z,18);}
 }
 for(const island of islands){const land=new THREE.Mesh(new THREE.CylinderGeometry(island.r,island.r*1.08,1.8,40),new THREE.MeshStandardMaterial({color:island.style==='sand'?0xd7c699:island.style==='rock'?0x858d91:0x718769}));land.position.set(island.x,-.7,island.z);scene.add(land);
  for(let i=0;i<5;i++){const x=island.x+Math.sin(i*1.4)*island.r*.6,z=island.z+Math.cos(i*1.4)*island.r*.6;if(island.style==='rock')box(3,1.5,2,x,.95,z,0x78828a,false);else tree(x,z,island.style==='sand');squirrel(x+1,z);ctx.addBird(x,z,10);}
  box(3,.25,12,island.x,.08,island.z-island.r-4,0x85745b,false);label(island.name,island.x,island.z-island.r+2);
 }
 return {regions,islands,squirrels,roadMeshes,
  groundAt(x,z){for(const i of islands)if(Math.hypot(x-i.x,z-i.z)<=i.r||(Math.abs(x-i.x)<=1.5&&z>=i.z-i.r-10&&z<=i.z-i.r))return .2;for(const r of regions)if(x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ){const dx=Math.abs(x-Math.round(x/40)*40),dz=Math.abs(z-Math.round(z/40)*40);return dx<=6||dz<=6?.08:.15;}return null;},
  update(time){for(const a of squirrels){const candidate=new THREE.Vector3(a.x+Math.sin(time*.4+a.phase)*1.4,.2,a.z+Math.cos(time*.35+a.phase)*1.4);if(!ctx.insideCollider(candidate)){a.g.position.copy(candidate);a.g.rotation.y=time*.4+a.phase;}}}
 };
}
