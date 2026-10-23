import * as THREE from 'three';

// A small, reusable architecture kit. All detail uses local geometry and textures.
export function detailHome({scene,box,makeTex,home,curb,wallMat,roof,glowMats}){
 const {x,z,minX,maxX,minZ,maxZ}=home;
 const trim=new THREE.MeshStandardMaterial({color:0xd8d0be,roughness:.83});
 const metal=new THREE.MeshStandardMaterial({color:0x283533,roughness:.6,metalness:.35});
 const stone=new THREE.MeshStandardMaterial({color:0x81766a,roughness:.95});
 const brick=makeTex(512,512,g=>{
  g.fillStyle='#978d80';g.fillRect(0,0,512,512);
  const colors=['#a9785f','#96644e','#b18065','#926750','#ad7c60'];
  for(let row=0;row<16;row++)for(let col=-1;col<9;col++){
   const bx=col*64+(row%2)*32,by=row*32;
   g.fillStyle=colors[(row*7+col*col+9)%colors.length];g.fillRect(bx+2,by+2,60,28);
   g.fillStyle='rgba(255,232,197,.12)';g.fillRect(bx+3,by+3,58,2);
   g.fillStyle='rgba(37,26,20,.15)';g.fillRect(bx+3,by+27,58,2);
  }
 });
 // Match brick scale to each wall instead of stretching one image across it.
 for(const m of scene.children.filter(o=>o.isMesh&&o.material===wallMat)){
  const p=m.geometry.parameters;if(!p.width)continue;
  const texture=brick.clone();texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(Math.max(p.width,p.depth)/2,p.height/2);texture.needsUpdate=true;
  m.material=new THREE.MeshStandardMaterial({map:texture,roughness:.94});
 }
 const parts=[];
 function piece(w,h,d,px,py,pz,mat=trim,parent){
  const m=box(w,h,d,px,py,pz,mat,false);parts.push(m);
  if(parent)parent.attach(m);return m;
 }
 function window(px,pz,rotation){
  const group=new THREE.Group();group.position.set(px,curb+1.7,pz);group.rotation.y=rotation;scene.add(group);
  const add=(w,h,d,a,b,c,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(a,b,c);m.castShadow=m.receiveShadow=true;group.add(m);return m;};
  // Dark recess, projecting frame, four separate panes and a stone sill.
  add(1.88,1.42,.08,0,0,0,metal);
  const glass=new THREE.MeshStandardMaterial({color:0x597784,metalness:.35,roughness:.22,emissive:0xffd58a,emissiveIntensity:0});glowMats.push(glass);
  for(const a of [-.41,.41])for(const b of [-.28,.28])add(.74,.48,.04,a,b,.075,glass);
  for(const a of [-.87,.87])add(.12,1.42,.19,a,0,.12,trim);
  for(const b of [-.65,.65])add(1.88,.12,.19,0,b,.12,trim);
  add(.075,1.2,.13,0,0,.17,trim);add(1.62,.065,.13,0,0,.17,trim);
  add(2.06,.12,.42,0,-.78,.17,stone);
  add(2.05,.17,.28,0,.83,.06,trim);
  return group;
 }
 const windows=[window(16.5,minZ-.2,Math.PI),window(23.5,minZ-.2,Math.PI)];
 for(const pz of [20,24.5]){windows.push(window(minX-.2,pz,-Math.PI/2),window(maxX+.2,pz,Math.PI/2));}
 // Low brick plinths and pale corner stones give the walls physical depth.
 for(const px of [minX,maxX]){
  piece(.42,.26,maxZ-minZ+.3,px,curb+.13,z,stone);
  for(const pz of [minZ,maxZ])for(let i=0;i<7;i++)piece(.45,.3,.45,px,curb+.35+i*.39,pz);
 }
 for(const [px,width]of [[16.5,5],[23.5,5]])piece(width,.26,.38,px,curb+.13,minZ,stone);
 piece(12,.26,.38,x,curb+.13,maxZ,stone);
 // An open, framed entrance retains the existing two-metre doorway.
 for(const px of [18.94,21.06])piece(.16,2.25,.3,px,curb+1.125,minZ-.13);
 piece(2.3,.18,.34,x,curb+2.32,minZ-.16);
 piece(2,.045,.45,x,curb+.023,minZ-.1,stone);
 const canopy=piece(2.8,.14,1.05,x,curb+2.65,minZ-.45,metal);canopy.rotation.x=.07;
 for(const px of [18.72,21.28])piece(.08,.4,.7,px,curb+2.43,minZ-.36,metal);
 const plaque=makeTex(256,128,g=>{g.fillStyle='#283533';g.fillRect(0,0,256,128);g.strokeStyle='#b8aa8d';g.lineWidth=5;g.strokeRect(6,6,244,116);g.fillStyle='#f0e6cc';g.textAlign='center';g.font='bold 72px serif';g.fillText('20',128,90);});
 const number=new THREE.Mesh(new THREE.PlaneGeometry(.48,.24),new THREE.MeshStandardMaterial({map:plaque,roughness:.8}));
 number.position.set(21.65,curb+1.6,minZ-.175);number.rotation.y=Math.PI;scene.add(number);
 for(const px of [18.65,21.35]){
  piece(.12,.4,.18,px,curb+2,minZ-.25,metal);
  piece(.1,.2,.17,px,curb+2,minZ-.36,new THREE.MeshStandardMaterial({color:0xffe7bf,emissive:0xffbf64,emissiveIntensity:.45}));
 }
 // Roof accessories belong to the roof so they disappear when walking inside.
 const roofTile=makeTex(512,512,g=>{
  g.fillStyle='#493d36';g.fillRect(0,0,512,512);
  for(let row=0;row<16;row++)for(let col=-1;col<9;col++){
   const a=col*64+(row%2)*32,b=row*32;
   g.fillStyle=['#69564a','#705b4c','#625247'][(row+col+9)%3];g.fillRect(a+2,b+2,61,29);
   g.fillStyle='#887061';g.fillRect(a+3,b+3,58,2);
  }
 });roofTile.wrapS=roofTile.wrapT=THREE.RepeatWrapping;roofTile.repeat.set(.12,.12);
 roof.material=[new THREE.MeshStandardMaterial({color:0xc9c0aa,roughness:.95}),new THREE.MeshStandardMaterial({map:roofTile,roughness:.96})];
 scene.updateMatrixWorld(true);
 for(const pz of [z-5.6,z+5.6]){
  piece(12.85,.24,.2,x,curb+3,pz,trim,roof);
  piece(12.9,.1,.12,x,curb+2.89,pz,metal,roof);
 }
 piece(12.85,.16,.26,x,curb+5.18,z,stone,roof);
 piece(.72,1.4,.78,23.5,curb+4.82,23.1,stone,roof);
 piece(.91,.14,.97,23.5,curb+5.59,23.1,trim,roof);
 piece(.48,.08,.54,23.5,curb+5.68,23.1,metal,roof);
 for(const px of [minX+.35,maxX-.35])piece(.09,2.9,.09,px,curb+1.45,maxZ+.21,metal);
 // Property borders remain inside the garden, with an open entrance from the pavement.
 const fence=(a,b,pz)=>{
  for(const py of [.42,.83])piece(b-a,.055,.055,(a+b)/2,curb+py,pz,metal);
  for(let px=a;px<=b+.01;px+=.42)piece(.045,.82,.045,px,curb+.43,pz,metal);
  for(const px of [a,b])piece(.15,1,.15,px,curb+.5,pz,stone);
 };
 fence(11,18.7,11);fence(21.3,29,11);
 const turf=makeTex(256,256,g=>{
  g.fillStyle='#647644';g.fillRect(0,0,256,256);
  for(let i=0;i<4200;i++){const px=(i*73)%256,py=(i*97+Math.floor(i/256)*19)%256;g.fillStyle=['#6e8050','#5b6f3e','#738354'][i%3];g.fillRect(px,py,1,3);}
 });turf.wrapS=turf.wrapT=THREE.RepeatWrapping;turf.repeat.set(5,5);
 const lawn=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial({map:turf,roughness:1}));
 lawn.rotation.x=-Math.PI/2;lawn.position.set(20,curb+.014,20);lawn.receiveShadow=true;scene.add(lawn);
 // Rectangular flagstones keep the path flush with the existing walkable ground.
 const pathMap=makeTex(256,256,g=>{g.fillStyle='#a49b87';g.fillRect(0,0,256,256);for(let row=0;row<4;row++)for(let col=0;col<2;col++){g.fillStyle=(row+col)%2?'#c1b7a2':'#b5ab96';g.fillRect(col*128+2,row*64+2,124,60);}});
 pathMap.wrapS=pathMap.wrapT=THREE.RepeatWrapping;pathMap.repeat.set(1,3);
 return {windows,parts,pathMaterial:new THREE.MeshStandardMaterial({map:pathMap,roughness:.94}),entranceWidth:2};
}

export function detailNearbyTower({box,x,z,w,h,d,baseY,parent}){
 const trim=new THREE.MeshStandardMaterial({color:0xb5ad9c,roughness:.9});
 const metal=new THREE.MeshStandardMaterial({color:0x303b3e,metalness:.3,roughness:.6});
 const add=(ww,hh,dd,px,py,pz,mat)=>{const m=box(ww,hh,dd,px,py,pz,mat,false);parent.attach(m);};
 parent.updateMatrixWorld(true);
 for(const py of [baseY+.25,baseY+3,baseY+h-.1]){
  add(w+.18,.16,d+.18,x,py,z,trim);
 }
 for(const px of [x-w/2-.05,x+w/2+.05])for(const pz of [z-d/2-.05,z+d/2+.05])add(.19,h,.19,px,baseY+h/2,pz,trim);
 // Roof coping and equipment silhouettes replace perfectly empty rooflines.
 for(const pz of [z-d/2,z+d/2])add(w+.3,.35,.18,x,baseY+h+.55,pz,trim);
 for(const px of [x-w/2,x+w/2])add(.18,.35,d,px,baseY+h+.55,z,trim);
 add(1.4,.6,1.1,x+1,baseY+h+.7,z,metal);
 for(let i=0;i<5;i++)add(1.2,.035,.025,x+1,baseY+h+.5+i*.09,z-.56,trim);
}
