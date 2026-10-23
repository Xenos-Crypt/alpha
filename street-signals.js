import * as THREE from 'three';
export function makeStreetSignal({scene,makeTex,x,z,y=0,rotation=0,junction,axis,controller}){
 const root=new THREE.Group();root.position.set(x,y,z);root.rotation.y=rotation;scene.add(root);
 const dark=new THREE.MeshStandardMaterial({color:0x263137,roughness:.75});
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.055,.09,4.5,8),dark);pole.position.y=2.25;root.add(pole);
 const heads=[];
 for(const [kind,label,py,px]of [['car','CAR',4.25,0],['bicycle','CYCLE',3.1,-.43],['pedestrian','WALK',3.1,.43],['tram','TRAM',2.1,0]]){
  const g=new THREE.Group();g.position.set(px,py,0);root.add(g);
  const h=kind==='car'?1.05:.63,w=.38;
  const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,.25),dark);g.add(body);
  const lamps={};const states=kind==='car'?['red','amber','green']:['red','green'];
  states.forEach((state,i)=>{
   const color=state==='red'?0xff453a:state==='amber'?0xffc743:0x64ed92;
   const mat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0,roughness:.4});
   const lamp=new THREE.Mesh(new THREE.CircleGeometry(.105,10),mat);lamp.position.set(0,h/2-.18-i*.29,.132);g.add(lamp);lamps[state]=mat;
   const hood=new THREE.Mesh(new THREE.BoxGeometry(.29,.035,.18),dark);hood.position.set(0,lamp.position.y+.125,.19);g.add(hood);
  });
  const map=makeTex(128,48,c=>{c.fillStyle='#192429';c.fillRect(0,0,128,48);c.fillStyle='#edf2df';c.font='bold 26px sans-serif';c.textAlign='center';c.fillText(label,64,34);});
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(.55,.19),new THREE.MeshBasicMaterial({map}));plate.position.set(0,-h/2-.13,.13);g.add(plate);
  heads.push({kind,lamps});
 }
 return {root,heads,junction,axis,x,z,phase:0,lamps:heads[0].lamps,update(){
  for(const h of heads){const state=controller.state(junction,h.kind,axis);for(const [name,m]of Object.entries(h.lamps)){m.emissiveIntensity=name===state?2.8:0;m.color.setHex(name===state?(name==='red'?0xff453a:name==='amber'?0xffc743:0x64ed92):0x172326);}}
  const state=controller.state(junction,'car',axis);this.phase=state==='green'?0:state==='amber'?3:4;
 }};
}
