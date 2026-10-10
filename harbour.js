import * as THREE from 'three';
export function buildHarbour(ctx) {
  const {scene,box,colliders,interactables,makeTex,makePerson,animatePerson}=ctx;
  const actors=[], cranes=[], forklifts=[];
  let accessRemaining=0,intrusionWarned=false;
  const dock={minX:-210,maxX:-50,minZ:178,maxZ:236,height:1.2};
  box(100,1.2,58,-100,.6,207,0x92948e,false);
  box(100,.1,24,-100,.05,165,0x66696b,false);
  for(let step=0;step<6;step++)box(14,.2,1,-103,.1+step*.2,172.5+step,0x969a96,false);
  function piece(w,h,d,x,y,z,c,parent){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:.7}));mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
  function sign(text,x,y,z){const map=makeTex(768,96,g=>{g.fillStyle='#173e51';g.fillRect(0,0,768,96);g.fillStyle='white';g.font='bold 34px sans-serif';g.textAlign='center';g.fillText(text,384,60);});const m=new THREE.Mesh(new THREE.PlaneGeometry(16,2),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=Math.PI;scene.add(m);}
  box(60,1.2,72,-180,.6,201,0x92948e,false);
  const office=new THREE.Group();scene.add(office);
  const addWall=(w,h,d,x,y,z)=>{const m=box(w,h,d,x,y,z,0x82949f);office.attach(m);ctx.planeBlocks?.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,top:y+h/2});return m;};
  addWall(.4,12,64,-207,7.2,201);addWall(.4,12,64,-157,7.2,201);addWall(50,12,.4,-182,7.2,233);
  addWall(22,12,.4,-196,7.2,169);addWall(22,12,.4,-168,7.2,169);box(6,3,.4,-182,11.7,169,0x82949f,false);
  const officeRoof=box(51,.4,65,-182,13.4,201,0x344654,false);
  for(let x=-202;x<=-162;x+=8)for(const y of [4,8,11])box(4,2,.1,x,y,168.7,0x719fb6,false);
  for(let i=0;i<6;i++)box(6,.2,1,-182,.1+i*.2,163.5+i,0x8b9498,false);
  sign('PORT OPERATIONS AND VISITOR RECEPTION',-182,5,168.6);
  box(12,1,2,-182,1.7,180,0x665849);
  sign('VISITORS - REQUEST ACCESS HERE',-182,3.4,179);
  const receptionist=makePerson({outfit:0x223d55,hair:0x43362c,pants:0x293848});receptionist.root.position.set(-183,1.2,183);actors.push({h:receptionist,x:-183,z:183,phase:0,supervisor:true});
  for(const x of [-199,-169])for(const z of [197,217]){box(10,4,9,x,3.2,z,0x526679);}
  const gate=box(14,2.8,.25,-103,2.6,179,0x42535c,true),gateCollider=colliders[colliders.length-1];
  function setAccess(open){const i=colliders.indexOf(gateCollider);if(open&&i>=0)colliders.splice(i,1);if(!open&&i<0)colliders.push(gateCollider);gate.visible=!open;}
  interactables.push({pos:new THREE.Vector3(-182,1.2,177),r:3,label:'Request supervised port access',action:()=>{if(ctx.canEnter&&!ctx.canEnter()){ctx.toast('Port security: access denied during an active police alert.');return;}accessRemaining=120;setAccess(true);ctx.toast('Visitor access approved for two minutes. Stay clear of cargo machinery.');}});
  sign('ASHFORD PORT - CARGO AND FERRY',-100,4,178);
  // Steel palisade: vehicle opening on the landside, clear berthing edge.
  function fence(x1,z1,x2,z2){const along=Math.abs(x2-x1)>Math.abs(z2-z1),length=Math.hypot(x2-x1,z2-z1);const g=new THREE.Group();scene.add(g);for(let i=0;i<=Math.ceil(length/.6);i++){const t=i/Math.ceil(length/.6);piece(.06,2.5,.06,x1+(x2-x1)*t,2.45,z1+(z2-z1)*t,0x58656b,g);}for(const y of [1.8,3])piece(along?length:.08,.07,along?.08:length,(x1+x2)/2,y,(z1+z2)/2,0x58656b,g);colliders.push({minX:Math.min(x1,x2)-.1,maxX:Math.max(x1,x2)+.1,minZ:Math.min(z1,z2)-.1,maxZ:Math.max(z1,z2)+.1});}
  fence(-147,179,-110,179);fence(-96,179,-53,179);fence(-147,179,-147,233);fence(-53,179,-53,233);
  interactables.push({pos:new THREE.Vector3(-103,1.2,176),r:3,label:'Port security gate',action:()=>ctx.toast(accessRemaining>0?'Your temporary port access is active.':'Cargo yard closed. Request access at the large port operations building to the west.')});
  sign('SECURE CARGO YARD - STAFF ACCESS',-103,4,179);
  for(const x of [-137,-123,-78,-64])for(const z of [190,205]){
    box(10,2.6,5,x,2.5,z,x<-100?0x387b93:0xa85840);for(let dx=-4;dx<=4;dx+=1)box(.09,2.4,5.08,x+dx,2.5,z,0x4b626b,false);
  }
  // Two gantry cranes with moving hoist/trolley cycles.
  for(const x of [-130,-75]){
    const g=new THREE.Group();scene.add(g);for(const sx of [-5,5])piece(.7,16,.7,x+sx,9.2,225,0xd2a331,g);piece(12,.8,1,x,17,225,0xd2a331,g);piece(.8,.8,28,x,17,231,0xd2a331,g);
    for(const sx of [-5,5]){const block={minX:x+sx-.4,maxX:x+sx+.4,minZ:224.6,maxZ:225.4};colliders.push(block);ctx.planeBlocks?.push({...block,top:17});}
    const hoist=new THREE.Group();g.add(hoist);piece(.1,8,.1,0,-4,0,0x32383c,hoist);piece(8,.3,4,0,-8,0,0xd2a331,hoist);cranes.push({hoist,x,phase:x});
    for(let s=-1;s<=1;s+=2)box(.5,.5,.5,x+s*6,1.5,233,0x292f33,false);
  }
  for(const x of [-111,-92]){
    const g=new THREE.Group();scene.add(g);piece(1.7,.8,2.4,0,.8,0,0xd6ad32,g);piece(1.4,1.7,.1,0,1.2,1.2,0x30393f,g);for(const sx of [-.5,.5])piece(.14,.08,1.6,sx,.25,1.9,0x353b42,g);for(const sx of [-.9,.9])for(const z of [-.8,.8])piece(.3,.5,.5,sx,.3,z,0x20252a,g);const driver=makePerson({outfit:0xffaa2a,hair:0x43362c,pants:0x334957});g.add(driver.root);driver.root.position.set(0,.75,-.3);driver.rig.scale.setScalar(.7);forklifts.push({g,x,driver});
  }
  const ship=new THREE.Group();scene.add(ship);ship.position.set(-112,.03,256);piece(52,4,11,0,1,0,0x244855,ship);piece(8,6,9,-19,5,0,0xe0e6e8,ship);for(let x=-10;x<=16;x+=9)for(const z of [-2.8,2.8])piece(8,3,4.8,x,4,z,0xa36243,ship);
  for(const x of [-140,-125,-95,-65]){box(.5,.6,.5,x,1.5,234.5,0x343e43,false);const rope=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,1.6,235),new THREE.Vector3(x,2.5,250.5)]),new THREE.LineBasicMaterial({color:0xb6a47a}));scene.add(rope);}
  // Gangway slopes to the vessel; boarding is an explicit interaction.
  const gangway=box(4,.2,19,-112,2,243,0x78828a,false);gangway.rotation.x=-Math.atan(1.6/19);
  for(const x of [-114,-110]){const rail=box(.08,.08,19,x,2.75,243,0xe2ca6b,false);rail.rotation.x=-Math.atan(1.6/19);}
  interactables.push({pos:new THREE.Vector3(-112,1.2,231),r:3,label:'Board cargo ship',action:()=>ctx.boardShip(-112,256)});
  interactables.push({pos:new THREE.Vector3(-112,2.5,256),r:6,label:'Return to cargo dock',action:()=>ctx.returnDock(-112,231)});
  for(let i=0;i<6;i++){const h=makePerson({outfit:0xffb32c,hair:0x49362b,pants:0x334957});const helmet=new THREE.Mesh(new THREE.SphereGeometry(.28,10,6),new THREE.MeshStandardMaterial({color:0xffdc43}));helmet.position.y=2.02;helmet.scale.y=.55;h.rig.add(helmet);actors.push({h,x:-140+i*15,z:217,phase:i});}
  const supervisor=makePerson({outfit:0xe7c748,hair:0x42332b,pants:0x334957});actors.push({h:supervisor,x:-103,z:184,phase:0,supervisor:true});
  interactables.push({pos:new THREE.Vector3(-103,1.2,182),r:3,label:'Speak to port supervisor',action:()=>ctx.toast('Container loading is underway. Stay outside the crane and forklift operating lanes. Cargo ship access is at the gangway.')} );
  return {dock,actors,cranes,forklifts,ship,gate,gateCollider,
    groundAt(x,z){if(x>-185&&x<-179&&z>=163&&z<169)return (z-163)*.2;if(x>-207&&x<-157&&z>169&&z<233)return 1.2;if(x>-114&&x<-110&&z>236&&z<250)return 1.2+(z-236)*1.6/14;if(x>-110&&x<-96&&z>=172&&z<178)return (z-172)*.2;if(x>=dock.minX&&x<=dock.maxX&&z>=dock.minZ&&z<=dock.maxZ)return dock.height;if(x>-138&&x<-86&&z>250&&z<261)return 2.8;return null;},
    update(time,dt){
      accessRemaining=Math.max(0,accessRemaining-dt);if(accessRemaining===0)setAccess(false);
      const p=ctx.playerPosition?.();officeRoof.visible=!(p&&p.x>-207&&p.x<-157&&p.z>169&&p.z<233);
      const inside=p&&p.x>-147&&p.x<-53&&p.z>180&&p.z<236;
      if(inside&&accessRemaining===0&&!intrusionWarned){ctx.toast('Restricted cargo area: port security has been alerted.');ctx.restrictedEntry?.();}intrusionWarned=inside&&accessRemaining===0;
      for(const c of cranes){c.hoist.position.set(c.x,17,226+Math.sin(time*.22+c.phase)*7);c.hoist.scale.y=.6+Math.sin(time*.3+c.phase)*.2;}for(const f of forklifts){f.g.position.set(f.x,1.2,198+Math.sin(time*.25+f.x)*15);f.g.rotation.y=Math.cos(time*.25+f.x)>0?0:Math.PI;animatePerson(f.driver,false,dt,'sit');if(ctx.playerPosition&&ctx.playerPosition().distanceTo(f.g.position)<1.5)ctx.machineImpact?.(f.g.position,dt);}for(const a of actors){a.h.root.position.set(a.x+(a.supervisor?0:Math.sin(time*.18+a.phase)*3),1.2,a.z);a.h.root.rotation.y=Math.cos(time*.18+a.phase)>0?Math.PI/2:-Math.PI/2;animatePerson(a.h,!a.supervisor,dt);}ship.position.y=.03+Math.sin(time*.7)*.06;}
  };
}
