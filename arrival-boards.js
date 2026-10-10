import * as THREE from 'three';
export function arrivalBoard(ctx,title,x,y,z,yaw=0){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(4.8,1.6),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));mesh.position.set(x,y,z);mesh.rotation.y=yaw;ctx.scene.add(mesh);
 let last='';return {mesh,canvas,update(message,detail='Live arrival estimate'){const value=message+detail;if(value===last)return;last=value;const g=canvas.getContext('2d');g.fillStyle='#10252e';g.fillRect(0,0,768,256);g.textAlign='left';g.fillStyle='#7cdac4';g.font='bold 34px sans-serif';g.fillText(title,28,55,712);g.fillStyle='#ffffff';g.font='bold 48px monospace';g.fillText(message,28,132,712);g.fillStyle='#a7bcc6';g.font='26px sans-serif';g.fillText(detail,28,208,712);texture.needsUpdate=true;},get text(){return last;}};
}
export function formatWait(seconds){const rounded=Math.ceil(seconds);return Math.floor(rounded/60).toString().padStart(2,'0')+':'+(rounded%60).toString().padStart(2,'0');}
export function railArrival(service,stop){
 if(service.doors&&service.stops[service.index]===stop)return {boarding:true,seconds:service.wait};
 let time=service.doors?service.wait:0,x=service.g.position.x,index=service.index,direction=service.direction;const maxSpeed=service.name==='Train'?18:8;
 if(service.doors){direction=index===service.stops.length-1?-1:index===0?1:direction;index+=direction;}
 for(let step=0;step<service.stops.length*2+2;step++){
  const d=Math.abs(service.stops[index]-x),braking=maxSpeed*maxSpeed/6;
  time+=d>braking?(d-braking)/maxSpeed+maxSpeed/3:Math.sqrt(2*d/3);
  if(service.stops[index]===stop)return {boarding:false,seconds:Math.ceil(time)};
  x=service.stops[index];time+=10;direction=index===service.stops.length-1?-1:index===0?1:direction;index+=direction;
 }
 return null;
}
