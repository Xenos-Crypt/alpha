import * as THREE from 'three';
export function buildRegionalFacilities(ctx){
 const stations=[],guards=[];
 function building(name,x,z,w=26,d=22,h=9,type='police'){ctx.prepareSite?.(x,z,w,d);
  ctx.box(w,.3,d,x,.15,z,0xa9b0ad,false);ctx.box(w,.3,d,x,h,z,0x495b6b,false);
  for(const side of [-1,1]){ctx.box(.3,h,d,x+side*w/2,h/2,z,0xc2c9c9,true);ctx.box(w/2-2,h,.3,x+side*(w/4+1),h/2,z-d/2,0xc2c9c9,true);}
  ctx.box(w,h,.3,x,h/2,z+d/2,0xc2c9c9,true);ctx.sign(name,x,h+1,z-d/2-.2,w);
  for(let i=-1;i<=1;i++)ctx.box(4,2,.08,x+i*7,5,z-d/2-.2,0x577e95,false);
  const b={name,type,x,z,minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2};ctx.civicBuildings.push(b);ctx.destinations.push({name,x,z:z-d/2-2});
  for(let i=0;i<3;i++){const g=ctx.makePerson({outfit:0x273e59,hair:0x3e3024,pants:0x213246});g.root.position.set(x-7+i*7,.3,z-4);guards.push(g);}
  return b;
 }
 for(const [name,x,z]of [['Riverside',-60,700],['Capital',380,900],['Poison Land',620,300]]){
  const b=building(name+' POLICE STATION',x,z);stations.push(b);ctx.interactables.push({pos:new THREE.Vector3(x,.3,z-9),r:3,label:'Visit '+name+' police reception',action:()=>ctx.reception()});ctx.addPolice(x+6,z-16);
 }
 const residence=building('PRESIDENTIAL RESIDENCE',500,880,40,32,13,'government');ctx.box(64,.2,60,500,.05,880,0x728a65,false);ctx.fence(468,532,850,910,{h:2.8,gate:{side:'z0',from:496,to:504}});
 ctx.box(8,.2,22,500,.2,846,0xc3bca9,false);ctx.interactables.push({pos:new THREE.Vector3(500,.3,835),r:3,label:'Presidential residence security',action:()=>ctx.toast('Presidential residence: public tours use the escorted entrance. Private wings are guarded.')});
 return {stations,residence,groundAt(x,z){return x>=468&&x<=532&&z>=835&&z<=910?.3:null;},update(dt){for(const g of guards)ctx.animatePerson(g,false,dt);}};
}
