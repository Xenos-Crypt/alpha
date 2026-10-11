import * as THREE from 'three';
export function buildCapitalServices(ctx){
 const services=[['CAPITAL SUPERMARKET',340,740,0x729b70,()=>ctx.buyFood(15,10)],['CAPITAL CLINIC',380,740,0xe4e9e6,()=>ctx.toast('Clinic reception: emergency care and appointments.')],['CAPITAL SCHOOL',340,780,0xb79a79,()=>ctx.toast('School reception: lessons and community learning.')],['POLICE RECEPTION',380,780,0x718ba4,()=>ctx.toast('Capital police: report incidents at reception.')],['COMMUNITY MARKET',340,860,0xd3ae69,()=>ctx.buyFood(10,20)],['COMMUNITY CENTRE',380,860,0x9a87ac,()=>ctx.toast('Community centre: public seating and local services.')]];
 for(const [name,x,z,color,action] of services){
 ctx.box(28,.2,28,x,.3,z,0xa6a79e,false);
 // An open entrance and interior, rather than an unenterable solid box.
 ctx.box(22,6,.4,x,3.4,z+9,color,true);for(const side of [-1,1]){ctx.box(.4,6,18,x+side*11,3.4,z,color,true);ctx.box(8,6,.4,x+side*7,3.4,z-9,color,true);}ctx.box(22,.4,18,x,6.6,z,color,false);
 ctx.box(10,1,2,x,.9,z+5,0x52606a,true);
 const map=ctx.makeTex(512,96,g=>{g.fillStyle='#172c3b';g.fillRect(0,0,512,96);g.fillStyle='white';g.textAlign='center';g.font='bold 27px sans-serif';g.fillText(name,256,60);});const sign=new THREE.Mesh(new THREE.PlaneGeometry(16,2),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));sign.position.set(x,4.7,z-9.25);ctx.scene.add(sign);
 ctx.interactables.push({pos:new THREE.Vector3(x,.4,z+3),r:3,label:name+' service',action});ctx.destinations.push({name,x,z:z-12});
 const h=ctx.makePerson({outfit:color,hair:0x403127,pants:0x293947});h.root.position.set(x,.4,z+6);
 for(const side of [-1,1]){const sx=x+side*8,sz=z-12;ctx.box(3,.15,.7,sx,.8,sz,0x6b5444,false);ctx.box(3,.65,.1,sx,1.1,sz+.3,0x6b5444,false);ctx.sitSpots.push({x:sx,z:sz,seatY:.9,yaw:Math.PI,label:'Sit outside '+name});}
 }
 return {services};
}
