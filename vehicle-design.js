import * as THREE from 'three';
export function detailVehicle(v,profile='standard'){
 if(v.design===profile)return;v.designParts?.removeFromParent();const g=new THREE.Group();v.group.add(g);v.designParts=g;v.design=profile;
 const chrome=new THREE.MeshStandardMaterial({color:0xb5c4d0,metalness:.85,roughness:.2}),dark=new THREE.MeshStandardMaterial({color:0x24313c,roughness:.55});
 function part(w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);g.add(m);return m;}
 part(1.1,.25,.08,0,.6,2.27,dark);for(let i=-3;i<=3;i++)part(.035,.23,.08,i*.13,.6,2.32,chrome);
 for(const side of [-1,1]){part(.24,.16,.25,side*1.1,1.1,.55,dark);part(.09,.035,.25,side*.91,1.02,-.4,chrome);part(.08,.18,2.8,side*1.02,.34,0,dark);}
 if(profile==='luxury'){part(1.6,.06,1.3,0,1.55,-.25,dark);part(1.8,.1,.4,0,1,-1.95,chrome);for(const m of v.group.children)if(m.material?.color&&['BoxGeometry','RoundedBoxGeometry'].includes(m.geometry?.type)&&[.55,.6].includes(m.geometry.parameters.height)){m.material=m.material.clone();m.material.roughness=.18;m.material.metalness=.6;}v.maxSpeed=95;v.health=100;}
 if(profile==='police'){part(2,.25,.18,0,.55,2.45,dark);for(const x of [-.7,.7])part(.13,.65,.13,x,.7,2.45,dark);for(const side of [-1,1])part(.04,.4,1.6,side*1.04,.8,-.2,new THREE.MeshStandardMaterial({color:0xe5e9ea}));}
 if(profile==='military'){part(2,.5,4.3,0,.85,0,new THREE.MeshStandardMaterial({color:0x536948}));part(1.7,.18,1.9,0,1.65,-.25,dark);part(2.2,.35,.3,0,.5,2.4,dark);v.health=150;v.maxSpeed=60;}
 return v;
}
