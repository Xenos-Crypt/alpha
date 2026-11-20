import * as THREE from 'three';
export function buildBridge(ctx){
 const {scene,box,colliders,planeBlocks,makeTex}=ctx,camBlockers=ctx.camBlockers||[];
 const centerX=220,startZ=90,endZ=730,width=20;
 function heightAt(z){if(z<=310)return .2+22*Math.max(0,(z-startZ)/220);if(z<=500)return 22.2;return .2+22*Math.max(0,(endZ-z)/230);}
 function surface(w,x,color,yOffset=0){const geometry=new THREE.PlaneGeometry(w,endZ-startZ,1,64);geometry.rotateX(-Math.PI/2);const p=geometry.attributes.position;for(let i=0;i<p.count;i++){const z=p.getZ(i)+(startZ+endZ)/2;p.setXYZ(i,p.getX(i)+x,heightAt(z)+yOffset,z);}geometry.computeVertexNormals();const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.85,side:THREE.DoubleSide}));scene.add(m);return m;}
 surface(14,centerX,0x43494f);surface(3,centerX-8.5,0xb6b5ad,.08);surface(3,centerX+8.5,0xb6b5ad,.08);
 for(let z=startZ;z<endZ;z+=12){const line=box(.2,.025,6,centerX,heightAt(z)+.04,z,0xf1eac9,false);line.rotation.x=-Math.atan((heightAt(z+3)-heightAt(z-3))/6);}
 for(const dx of [-10,10]){
  for(let z=startZ;z<=endZ;z+=5)box(.12,1.3,.12,centerX+dx,heightAt(z)+.65,z,0x536675,false);
  for(let z=startZ;z<endZ;z+=5){const slope=(heightAt(z+5)-heightAt(z))/5;const rail=box(.1,.12,Math.hypot(5,heightAt(z+5)-heightAt(z)),centerX+dx,(heightAt(z)+heightAt(z+5))/2+1.1,z+2.5,0x667d8b,false);rail.rotation.x=-Math.atan(slope);}
  colliders.push({minX:centerX+dx-.15,maxX:centerX+dx+.15,minZ:startZ,maxZ:endZ,baseYAt:(_,z)=>heightAt(z)});
 }
 for(const z of [330,490])for(const dx of [-11,11]){
  box(2,48,2,centerX+dx,24,z,0x8e999f);
  planeBlocks.push({minX:centerX+dx-1,maxX:centerX+dx+1,minZ:z-1,maxZ:z+1,top:48});
 }
 for(const dx of [-11,11]){
  const pts=[];for(let i=0;i<=64;i++){const z=310+i*200/64;pts.push(new THREE.Vector3(centerX+dx,28+20*Math.abs((z-410)/100)**2,z));}
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),64,.13,6,false),new THREE.MeshStandardMaterial({color:0x536675})));
  for(let z=330;z<=490;z+=10){const top=28+20*Math.abs((z-410)/100)**2;box(.07,top-heightAt(z),.07,centerX+dx,(top+heightAt(z))/2,z,0x6d8290,false);}
 }
 // What holds it up. The deck is a real slab (a girder box under it, which also keeps the camera underneath when
 // you're below), standing on concrete piers every 20 m; where the ramps are too low to walk under, a solid
 // abutment of concrete fills the space, so nobody can wander under it (or pop up through it onto the road).
 const concrete=new THREE.MeshStandardMaterial({color:0x9a9890,roughness:.9}),steel=new THREE.MeshStandardMaterial({color:0x56626b,roughness:.6,metalness:.4});
 for(let z=startZ;z<endZ;z+=5){const y0=heightAt(z),y1=heightAt(Math.min(endZ,z+5)),len=Math.hypot(5,y1-y0),g=new THREE.Mesh(new THREE.BoxGeometry(width,.7,len),steel);g.position.set(centerX,(y0+y1)/2-.4,z+2.5);g.rotation.x=-Math.atan2(y1-y0,5);g.name='bridge deck girder';scene.add(g);camBlockers.push(g);}
 const LOW=3.65;   // under this the deck is too low to walk beneath
 for(let z=startZ+1;z<endZ;z+=1){const h=heightAt(z+.5);if(h>LOW||h<.5)continue;const m=new THREE.Mesh(new THREE.BoxGeometry(width-.4,h-.75,1.02),concrete);m.position.set(centerX,(h-.75)/2,z+.5);m.name='bridge abutment';scene.add(m);}
 for(const [z0,z1] of [[startZ,startZ+(LOW-.2)/22*220],[endZ-(LOW-.2)/22*230,endZ]])colliders.push({minX:centerX-width/2,maxX:centerX+width/2,minZ:z0,maxZ:z1,baseYAt:(x,z)=>heightAt(Math.min(z1,Math.max(z0,z)))-2.85});   // solid below the deck, never on it
 const piers=[];
 // (the piers go in once the roads exist: addPiers(isRoad) from main, so none lands in the middle of a road)
 function addPiers(onRoad){for(let z=startZ+40;z<endZ-30;z+=20){const h=heightAt(z);if(h<=LOW||Math.abs(z-330)<12||Math.abs(z-490)<12)continue;
  const xs=[centerX-7,centerX+7];if(xs.some(x=>onRoad(x,z)))continue;   // never in the middle of a road
  for(const x of xs){const c=new THREE.Mesh(new THREE.BoxGeometry(1.4,h-.75,1.4),concrete);c.position.set(x,(h-.75)/2,z);c.name='bridge pier';scene.add(c);colliders.push({minX:x-.7,maxX:x+.7,minZ:z-.7,maxZ:z+.7,baseYAt:()=>0});planeBlocks.push({minX:x-.7,maxX:x+.7,minZ:z-.7,maxZ:z+.7,bottom:0,top:h-.75});}
  const cap=new THREE.Mesh(new THREE.BoxGeometry(17,.9,1.8),concrete);cap.position.set(centerX,h-1.2,z);scene.add(cap);piers.push(z);}
  // anything on the ground under the high deck (a beach hut, a kiosk...) is solid down there, not up on the road
  for(const c of colliders){if(c.baseYAt||c.circleRadius!=null)continue;if(c.maxX<centerX-width/2||c.minX>centerX+width/2)continue;const zc=Math.max(startZ,Math.min(endZ,(c.minZ+c.maxZ)/2));if(c.maxZ<startZ||c.minZ>endZ||heightAt(zc)<LOW)continue;c.baseYAt=()=>0;}
  return piers.length;}
 // Far-bank landing: a real destination rather than a bridge ending in water.
 box(120,.4,100,220,0,745,0x7d906c,false);
 box(24,.08,80,220,.24,760,0x626b70,false);
 const map=makeTex(768,96,g=>{g.fillStyle='#214656';g.fillRect(0,0,768,96);g.fillStyle='#ffffff';g.font='bold 34px sans-serif';g.textAlign='center';g.fillText('ASHFORD HARBOUR BRIDGE',384,60);});
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(6,.75),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));sign.position.set(220,5.2,90);sign.rotation.y=Math.PI;scene.add(sign);for(const x of [208,232])box(.2,6,.2,x,3,90,0x536675,false);box(24,.15,.2,220,6,90,0x536675,false);
 for(let z=startZ;z<endZ;z+=8){const y=heightAt(z+4);ctx.planeBlocks?.push({minX:centerX-10,maxX:centerX+10,minZ:z,maxZ:z+8,bottom:y-.7,top:y+.5});}
 for(const z of [330,490])for(const dx of [-11,11])ctx.planeBlocks?.push({minX:centerX+dx-1,maxX:centerX+dx+1,minZ:z-1,maxZ:z+1,bottom:0,top:48});
 return {centerX,startZ,endZ,heightAt,piers,addPiers,groundAt(x,z,y){if(Math.abs(x-centerX)<=width/2&&z>=startZ&&z<=endZ){const floor=heightAt(z);if(floor<=1.2||y>=floor-1)return Math.max(floor+(Math.abs(x-centerX)>7?.08:0),z>=720?.28:floor);}if(x>=160&&x<=280&&z>=695&&z<=795)return Math.abs(x-centerX)<=12&&z>=720?.28:.2;return null;}};
}
