import * as THREE from 'three';
export function buildSubwayPassengers(ctx,stations,train){
 const people=[];if(!ctx.makePerson)return {people,update(){}};
 for(const [index,s]of stations.entries())for(let i=0;i<10;i++){const h=ctx.makePerson({outfit:[0x396b8d,0x937259,0x668868,0x86729a][i%4],hair:0x3b2b20,pants:0x293747});h.root.position.set(s.tx-10+(i%5)*4,.3,-4.8-(i>=5?1.5:0));people.push({h,station:index,state:'waiting',timer:3+i*1.7,seat:i%8,travelled:false});}
 let lastStop=-1;
 return {people,update(dt){const current=train.doors?train.index:-1;
  if(current>=0&&current!==lastStop){for(const p of people.filter(p=>p.state==='aboard'&&p.station!==current)){ctx.scene.add(p.h.root);p.h.root.position.set(train.g.position.x+4+p.seat*.2,.3,-4);p.station=current;p.state='waiting';p.timer=20;p.travelled=true;}lastStop=current;}else if(current<0)lastStop=-1;
  for(const p of people){if(p.state==='aboard'){ctx.animatePerson?.(p.h,false,dt);continue;}p.timer-=dt;let moving=false;
   if(current===p.station&&p.timer<=0&&people.filter(q=>q.state==='aboard').length<8){p.state='boarding';const target=new THREE.Vector3(train.g.position.x-4+p.seat,.3,-2.7),delta=target.sub(p.h.root.position),distance=delta.length();if(distance>.2){p.h.root.position.addScaledVector(delta.normalize(),Math.min(distance,1.3*dt));p.h.root.rotation.y=Math.atan2(delta.x,delta.z);moving=true;}else{train.g.add(p.h.root);p.h.root.position.set(-4+p.seat,.45,p.seat%2?.8:-.8);p.h.root.rotation.y=p.seat%2?Math.PI:0;p.state='aboard';}}
   else if(p.state==='boarding'&&!train.doors){p.state='waiting';p.h.root.position.z=-4.8;}
   ctx.animatePerson?.(p.h,moving,dt);
  }
 }};
}
