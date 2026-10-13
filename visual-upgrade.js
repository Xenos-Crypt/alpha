import * as THREE from 'three';
export function upgradeWorldMaterials(ctx){
 const materials=new Set();ctx.scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});const loader=new THREE.TextureLoader();
 const groups=[['grass',[ctx.grass,ctx.lawn,ctx.ground]],['paving',[ctx.paving]],['wood',[ctx.wood]],['roof',[ctx.roof]]];
 const pending=[];for(const [name,maps]of groups){const targets=[...materials].filter(m=>maps.includes(m.map));if(!targets.length)continue;pending.push(new Promise(resolve=>loader.load('./assets/'+name+'-diff.jpg',base=>{base.colorSpace=THREE.SRGBColorSpace;for(const m of targets){const texture=base.clone();texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.copy(m.map.repeat);texture.anisotropy=ctx.anisotropy;texture.needsUpdate=true;m.map=texture;m.roughness=.88;m.needsUpdate=true;}resolve();},undefined,()=>resolve())));}
 if(ctx.detailed){for(const [name,targets,repeat]of [['asphalt',[ctx.roadMaterial],40],['brick',[...materials].filter(m=>ctx.facades.includes(m.map)),3]])pending.push(new Promise(resolve=>loader.load('./assets/'+name+'-normal.jpg',t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=ctx.anisotropy;for(const m of targets){m.normalMap=t;m.normalScale.set(.35,.35);m.roughness=.83;m.needsUpdate=true;}resolve();},undefined,()=>resolve())));}
 return Promise.all(pending);
}
