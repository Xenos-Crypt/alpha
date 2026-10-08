import * as T from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

const bodycamShader={
  uniforms:{tDiffuse:{value:null},time:{value:0},aberration:{value:.0022},grain:{value:.05},vignette:{value:1.25},exposureFlicker:{value:.02}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`
    uniform sampler2D tDiffuse;uniform float time,aberration,grain,vignette,exposureFlicker;
    varying vec2 vUv;
    float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){
      vec2 uv=vUv;
      vec2 centered=uv-.5;
      float dist=length(centered);
      vec2 dir=normalize(centered+1e-6);
      float shift=aberration*dist;
      float r=texture2D(tDiffuse,uv-dir*shift).r;
      float g=texture2D(tDiffuse,uv).g;
      float b=texture2D(tDiffuse,uv+dir*shift).b;
      vec3 color=vec3(r,g,b);
      float vig=1.0-smoothstep(.35,.85,dist)*vignette*.55;
      color*=vig;
      float flicker=1.0+(noise(vec2(time*4.0,1.0))-.5)*exposureFlicker;
      color*=flicker;
      float n=(noise(uv*vec2(800.0,800.0)+time*60.0)-.5)*grain;
      color+=n;
      gl_FragColor=vec4(color,1.0);
    }`
};

// Geometry is authored here; all downloaded surface maps are CC0 (assets/manifest.json).
let seed=4381;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
export class Town {
  constructor(canvas){
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.9;
    this.scene=new T.Scene();this.scene.fog=new T.FogExp2('#b8c3cb',.008);
    this.camera=new T.PerspectiveCamera(76,innerWidth/innerHeight,.045,300);
    this.camera.rotation.order='YXZ';this.colliders=[];this.people=[];this.particles=[];this.cars=[];
    this.boxGeo=new T.BoxGeometry(1,1,1);this.sphereGeo=new T.SphereGeometry(1,14,10);
    this.cylinderGeo=new T.CylinderGeometry(1,1,1,12);this.materials=new Map();
    this.scene.add(new T.HemisphereLight('#cee2ff','#7a715c',.65));
    this.sun=new T.DirectionalLight('#fff1d6',2.5);this.sun.position.set(-25,36,24);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-50,right:50,top:50,bottom:-50,near:1,far:110});this.sun.shadow.normalBias=.035;this.sun.shadow.bias=-.00015;this.scene.add(this.sun);
    this.selfieRenderer=new T.WebGLRenderer({canvas:document.getElementById('selfie'),antialias:true});this.selfieRenderer.setSize(260,330,false);this.selfieRenderer.toneMapping=T.ACESFilmicToneMapping;this.selfieRenderer.toneMappingExposure=.9;
    this.selfieCamera=new T.PerspectiveCamera(55,260/330,.04,200);
    this.composer=new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.bloomPass=new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.28,.6,.85);this.composer.addPass(this.bloomPass);
    this.bodycamPass=new ShaderPass(bodycamShader);this.composer.addPass(this.bodycamPass);
    this.composer.addPass(new OutputPass());
    this.shake={x:0,z:0,rollVel:0,roll:0};
    this.metal=this.mat('#3c4340',.48,.7);this.trim=this.mat('#d6d1c2',.72);this.glass=new T.MeshPhysicalMaterial({color:'#5b777d',metalness:.18,roughness:.12,clearcoat:1});
    this.loaded=false;
  }
  mat(color,roughness=.8,metalness=0){const key=color+roughness+metalness;if(!this.materials.has(key))this.materials.set(key,new T.MeshStandardMaterial({color,roughness,metalness}));return this.materials.get(key);}
  mesh(geo,mat,x,y,z,sx,sy,sz,parent=this.scene){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  box(x,y,z,w,h,d,mat,solid=false,parent=this.scene){let m=this.mesh(this.boxGeo,mat,x,y,z,w,h,d,parent);if(solid)this.colliders.push({x,z,w,d});return m;}
  sphere(x,y,z,w,h,d,mat,parent=this.scene){return this.mesh(this.sphereGeo,mat,x,y,z,w,h,d,parent);}
  cylinder(x,y,z,r,h,mat,parent=this.scene){return this.mesh(this.cylinderGeo,mat,x,y,z,r,h,r,parent);}
  async load(){
    const manifest=await fetch('assets/manifest.json').then(r=>{if(!r.ok)throw Error('Texture manifest missing');return r.json();});
    const loader=new T.TextureLoader();this.surfaces={};
    for(const entry of manifest){if(entry.name==='sky')continue;const maps={};await Promise.all(Object.entries(entry.files).map(async([key,url])=>{const t=await loader.loadAsync(url);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());if(key==='diff')t.colorSpace=T.SRGBColorSpace;maps[key]=t;}));this.surfaces[entry.name]=maps;}
    const sky=await new RGBELoader().loadAsync('assets/sky.hdr');sky.mapping=T.EquirectangularReflectionMapping;this.scene.background=sky;const pmrem=new T.PMREMGenerator(this.renderer);this.environment=pmrem.fromEquirectangular(sky);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.65;pmrem.dispose();
    this.humanAsset=await new GLTFLoader().loadAsync('assets/characters/Soldier.glb');
    this.civilianAsset=await new GLTFLoader().loadAsync('assets/characters/Michelle.glb');
    // Transfer rotation deltas between the matching Mixamo rigs while preserving each rest pose.
    this.civilianClips=this.humanAsset.animations.filter(c=>['Idle','Walk','Run'].includes(c.name)).map(clip=>{
      const tracks=[];for(const track of clip.tracks){if(!track.name.endsWith('.quaternion'))continue;const name=track.name.slice(0,-11),source=this.humanAsset.scene.getObjectByName(name),target=this.civilianAsset.scene.getObjectByName(name);if(!source||!target)continue;const inverse=source.quaternion.clone().invert(),values=new Float32Array(track.values.length),q=new T.Quaternion();for(let i=0;i<track.values.length;i+=4){q.fromArray(track.values,i);q.premultiply(inverse).premultiply(target.quaternion);q.toArray(values,i);}tracks.push(new T.QuaternionKeyframeTrack(track.name,track.times,values));}if(!tracks.length)throw Error('Human animation mapping failed');return new T.AnimationClip(clip.name,clip.duration,tracks);
    });
    this.asphalt=this.surface('asphalt',32,30,'#aaaaaa');this.paving=this.surface('paving',30,3,'#c5c3b9');this.brick=this.surface('brick',3.5,2,'#f1e2d0');this.wood=this.surface('wood',2,1,'#9d8266');this.build();this.batchStatic();this.loaded=true;
  }
  surface(name,rx,ry,color='#ffffff'){const source=this.surfaces[name];let maps={};for(const [k,v]of Object.entries(source)){maps[k]=v.clone();maps[k].repeat.set(rx,ry);maps[k].needsUpdate=true;}return new T.MeshStandardMaterial({color,map:maps.diff,normalMap:maps.normal,roughnessMap:maps.rough,normalScale:new T.Vector2(.65,.65),roughness:.9});}
  label(text,w,h,bg='#203830',fg='#e3decc'){const c=document.createElement('canvas');c.width=1024;c.height=Math.max(64,Math.round(1024*h/w));const g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,c.width,c.height);g.strokeStyle=fg;g.lineWidth=2;g.strokeRect(6,6,1012,c.height-12);g.fillStyle=fg;g.font=`500 ${Math.round(c.height*.52)}px Georgia`;g.textAlign='center';g.textBaseline='middle';g.fillText(text,512,c.height/2,930);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:texture,roughness:.7}));}
  batchStatic(){const groups=new Map();this.scene.updateMatrixWorld(true);const animated=new Set(this.particles.map(p=>p.mesh));for(const m of [...this.scene.children]){if(!m.isMesh||m.isInstancedMesh||m===this.pulseMesh||animated.has(m))continue;const k=m.material.uuid;let entry=groups.get(k);if(!entry){entry={material:m.material,geometries:[]};groups.set(k,entry);}let g=m.geometry.clone();g.applyMatrix4(m.matrixWorld);entry.geometries.push(g);this.scene.remove(m);}for(const {material,geometries}of groups.values()){const geometry=mergeGeometries(geometries);if(!geometry)throw Error('Static geometry merge failed');const m=new T.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);for(const g of geometries)g.dispose();}}
  build(){
    this.box(0,-.23,-2,180,.4,180,this.surface('grass',65,65,'#a1a593'));
    this.box(0,-.011,0,96,.07,11,this.asphalt);
    for(let z of [-7.2,7.2]){this.box(0,.04,z,96,.14,3.4,this.paving);this.box(0,.12,Math.sign(z)*5.58,96,.26,.2,this.mat('#b7b7ab'));}
    // An irregular secondary road, with parking lines and repaired asphalt patches.
    this.box(0,-.01,-29,8,.065,46,this.surface('asphalt',3,17,'#999999'));
    for(let x=-44;x<46;x+=6)this.box(x,.031,0,2.4,.012,.10,this.mat('#d0c9ae'));
    for(let i=0;i<10;i++){let x=-42+i*9;this.box(x,.031,4.5,4.5,.015,.055,this.trim);this.box(x-2.3,.031,3.9,.05,.015,1.2,this.trim);}
    for(let i=0;i<8;i++){const patch=this.box(-40+rnd()*80,.032,-3+rnd()*6,1+rnd()*2,.008,.5+rnd(),this.mat('#4b5150'));patch.rotation.y=rnd()*.3;}
    for(let i=0;i<5;i++){let x=-37+i*17;this.building(x,-15,14,11,8.1+i%2*2.8,i);this.building(x,16,14,12,7.9+i%2*3,5+i);}
    for(let i=0;i<4;i++){this.building(-13,-33-i*15,12,10,8,i+10);this.building(13,-33-i*15,12,10,9,i+14);}
    for(let x of[-33,-8,20,39])this.car(x,4.3,x===20?'#a7a9a0':x===-8?'#364e55':'#747b74');
    for(let x=-41;x<44;x+=14){this.lamp(x,-7.1);this.lamp(x+4,7.4);this.drain(x,5.3);}
    this.cafe();this.square();
    for(let i=0;i<24;i++){let x=-53+rnd()*105,z=(i%2?1:-1)*(27+rnd()*20);this.tree(x,z,4+rnd()*2);}
    for(let x of [-43,-23,24,43])this.tree(x,9,4.8);
    // Small weeds along the building edges rather than uniform green blocks.
    const weeds=this.mat('#626f43');for(let i=0;i<140;i++){let x=-46+rnd()*92,z=10+rnd()*1;const blade=this.mesh(new T.ConeGeometry(.035,.22,3),weeds,x,.15,z,1,.6+rnd(),1);blade.rotation.z=(rnd()-.5)*.8;blade.castShadow=false;}
    for(let x of [-28,18,36]){this.box(x,.47,-8.1,.55,.95,.55,this.mat('#32453e'),true);this.box(x,.99,-8.1,.6,.1,.6,this.metal);}
    this.pulseMesh=new T.Mesh(new T.TorusGeometry(1,.025,6,80),new T.MeshBasicMaterial({color:'#9de5de',transparent:true,opacity:.7}));this.pulseMesh.rotation.x=-Math.PI/2;this.pulseMesh.visible=false;this.scene.add(this.pulseMesh);
  }
  building(x,z,w,d,h,index){
    const face=z<0?1:-1,front=z+face*d/2;
    let wall=index%3===0?this.surface('brick',w/3,h/3,index%2?'#c3b2a0':'#d0c2ad'):this.surface('plaster',w/4,h/4,['#b9b1a0','#c4c1b4','#abaea8','#b9aa95'][index%4]);
    if(index===1){ // Café shell has an actual opening into the interior.
      this.box(x-w/2+.18,h/2,z,.36,h,d,wall,true);this.box(x+w/2-.18,h/2,z,.36,h,d,wall,true);this.box(x,h/2,z-face*d/2,w,h,.35,wall,true);this.box(x,h/2+1.4,front,w,h-2.8,.35,wall);
      for(let sx of[-4.5,4.5])this.box(x+sx,1.4,front,5,2.8,.3,wall,true);
    }else this.box(x,h/2,z,w,h,d,wall,true);
    this.box(x,.22,front+face*.08,w,.44,.25,this.mat('#8a8b81'));
    this.box(x,h+.12,z,w+.4,.25,d+.4,this.mat('#575c56'));
    for(let e of[-1,1])this.box(x+e*(w/2-.15),h/2,front+face*.12,.28,h,.3,this.trim);
    for(let y=3.9;y<h;y+=2.65)this.box(x,y,front+face*.13,w,.13,.25,this.trim);
    for(let xx=-w/2+1.5;xx<w/2;xx+=2.65)for(let yy=4.95;yy<h-.4;yy+=2.65){
      const wx=x+xx,wz=front+face*.23;this.box(wx,yy,wz,1.25,1.8,.16,this.trim);this.box(wx,yy,wz+face*.10,1.08,1.62,.04,this.glass);
      this.box(wx,yy,wz+face*.14,.055,1.65,.045,this.trim);this.box(wx,yy-.1,wz+face*.14,1.1,.055,.045,this.trim);this.box(wx,yy-.95,wz,1.5,.14,.45,this.trim);
      if(index%2===0){this.box(wx,yy-.5,wz+face*.16,1,.6,.025,this.mat('#bcb4a4'));}
    }
    // Street-level shops include recessed-looking panes, frames, and separate signage.
    for(let xx of[-4.1,4.1]){this.box(x+xx,1.65,front+face*.19,3.25,2.3,.14,this.metal);this.box(x+xx,1.65,front+face*.29,3.05,2.12,.025,this.glass);this.box(x+xx,1.65,front+face*.34,.07,2.2,.05,this.trim);}
    if(index!==1){this.box(x,1.24,front+face*.22,1.2,2.5,.12,this.mat('#3b5147'));this.box(x,1.62,front+face*.3,.86,1.3,.04,this.glass);this.box(x+.36,1.1,front+face*.38,.05,.23,.05,this.metal);}
    const texts=['ASHFORD BOOKS','THE CORNER CAFÉ','HART & SONS','FLOWERS & CO.','GENERAL STORE','ASHFORD HOUSE','STUDIO 06'];let sign=this.label(texts[index%texts.length],w-1.1,.7);sign.position.set(x,3.12,front+face*.3);if(face<0)sign.rotation.y=Math.PI;this.scene.add(sign);
    this.box(x,2.75,front+face*.65,w-.8,.10,1.3,this.mat(index%2?'#616f5e':'#a49b85'));
    // Gutters, drainage pipes, chimneys and roof ridges interrupt a box silhouette.
    this.cylinder(x+w/2-.6,h/2,front+face*.3,.065,h,this.metal);
    this.box(x,h+.43,z,w+.8,.16,d+.8,this.mat('#5f655e'));
    if(index%2===0){let rise=1.9,angle=Math.atan2(rise,w/2),slope=Math.hypot(w/2,rise);const tiles=this.surface('roof',w/3,d/3,'#b7b0a2');for(let side of[-1,1]){let roof=this.box(x+side*w/4,h+rise/2+.5,z,slope+.3,.17,d+.6,tiles);roof.rotation.z=-side*angle;}this.cylinder(x,h+rise+.5,z,.13,d+.6,this.mat('#706252')).rotation.x=Math.PI/2;}
    this.box(x-w/3,h+1,z-2,.8,1.8,.8,wall);
    for(let j=0;j<3;j++)this.box(x-3+j*2.6,h+.5,z+1,1.8,.08,2.4,this.mat('#324b55',.3,.4)).rotation.x=-.14;
  }
  cafe(){
    // Building 1 is centered at x=-20, z=-15; front opening at z=-9.5.
    let x=-20,z=-15;this.box(x,.075,z,13.5,.1,10.5,this.surface('wood',6,5,'#b9a38b'));
    this.box(x,2.5,-19.95,12.8,5,.05,this.mat('#b6ad95'));
    this.box(x,.5,-18.4,10,1,1.1,this.wood,true);this.box(x,1.04,-18.4,10,.12,1.2,this.mat('#d2c6b0'));
    let label=this.label('COFFEE · GOOD COMPANY',6,.65,'#b6ad95','#3f4d42');label.position.set(x,2.45,-19.87);this.scene.add(label);
    for(let i=0;i<7;i++){this.cylinder(x-4+i*1.2,1.2,-18.4,.08,.22,this.mat('#e2ddd0'));}
    for(let tx of[-24,-16])for(let tz of[-13,-16]){this.cylinder(tx,.79,tz,.65,.10,this.wood);this.cylinder(tx,.39,tz,.055,.75,this.metal);for(let side of[-1,1])this.chair(tx+side*.95,tz,side);}
    const light=new T.PointLight('#ffd5a0',20,13,2);light.position.set(x,3,-15);this.scene.add(light);
    // Outdoor tables with cups and chairs.
    for(let tx of[-25,-16]){this.cylinder(tx,.79,-7.8,.65,.08,this.wood);this.cylinder(tx,.4,-7.8,.055,.8,this.metal);this.chair(tx-.95,-7.8,-1);this.chair(tx+.95,-7.8,1);this.cylinder(tx,.93,-7.8,.06,.16,this.trim);}
  }
  chair(x,z,side){this.box(x,.45,z,.43,.08,.43,this.wood);this.box(x+side*.2,.72,z,.07,.56,.48,this.wood);for(let dx of[-.17,.17])for(let dz of[-.17,.17])this.cylinder(x+dx,.22,z+dz,.022,.44,this.metal);}
  square(){
    this.box(4,.04,17,14,.12,12,this.surface('paving',7,6,'#c5c3b7'));
    this.cylinder(4,.25,17,1.85,.45,this.mat('#b1b0a1'));this.cylinder(4,.49,17,1.62,.07,new T.MeshPhysicalMaterial({color:'#648d8c',roughness:.09,metalness:.18,clearcoat:1}));this.colliders.push({x:4,z:17,w:3.7,d:3.7});
    this.cylinder(4,.85,17,.18,1.4,this.trim);this.cylinder(4,1.5,17,.65,.12,this.trim);
    for(let i=0;i<32;i++){let a=rnd()*Math.PI*2;let s=this.sphere(4+Math.sin(a)*.5,1+rnd()*.7,17+Math.cos(a)*.5,.012,.06,.012,this.mat('#b6d5d1',.05,.2));s.castShadow=false;this.particles.push({mesh:s,offset:rnd()*2});}
    for(let x of[-.5,8.5]){for(let y of[.48,.83,1.0])this.box(x,y,21.5,2,.1,.15,this.wood);for(let sx of[-.8,.8]){this.box(x+sx,.32,21.5,.09,.64,.45,this.metal);}this.colliders.push({x,z:21.5,w:2,d:.6});}
    this.tree(-2,17,5);this.tree(11,17,5);
  }
  car(x,z,color){
    // Built into its own Group (not direct scene children) so batchStatic() leaves it alone and it can be driven later.
    const body=this.mat(color,.3,.55),rubber=this.mat('#242725',.93),group=new T.Group();group.position.set(x,0,z);this.scene.add(group);
    this.box(0,.62,0,4.1,.63,1.75,body,false,group);this.colliders.push({x,z,w:4.1,d:1.75});
    this.box(-.15,1.1,0,2.25,.65,1.55,body,false,group);this.box(-.1,1.21,.785,1.8,.4,.025,this.glass,false,group);this.box(-.1,1.21,-.785,1.8,.4,.025,this.glass,false,group);this.box(.98,1.18,0,.035,.45,1.47,this.glass,false,group).rotation.z=.23;this.box(-1.3,1.16,0,.035,.4,1.47,this.glass,false,group).rotation.z=-.22;
    for(let dx of[-1.28,1.28])for(let dz of[-.88,.88]){let wheel=this.cylinder(dx,.36,dz,.36,.18,rubber,group);wheel.rotation.x=Math.PI/2;let hub=this.cylinder(dx,.36,dz*1.08,.21,.025,this.metal,group);hub.rotation.x=Math.PI/2;}
    for(let dz of[-.57,.57]){this.box(2.06,.72,dz,.035,.17,.35,this.mat('#d8d6b9',.15),false,group);this.box(-2.06,.74,dz,.04,.18,.32,this.mat('#853d30',.3),false,group);}this.box(2.085,.45,0,.025,.15,.45,this.trim,false,group);
    this.cars.push({group,x,z,yaw:0});
  }
  updateCar(car,x,z,yaw){car.group.position.set(x,0,z);car.group.rotation.y=yaw;car.x=x;car.z=z;car.yaw=yaw;}
  lamp(x,z){this.cylinder(x,2.4,z,.055,4.8,this.metal);this.cylinder(x,.2,z,.14,.4,this.metal);this.box(x+.3,4.8,z,.7,.08,.12,this.metal);this.box(x+.6,4.76,z,.6,.09,.32,this.trim);}
  drain(x,z){this.box(x,.034,z,.8,.014,.4,this.mat('#343a37'));for(let i=0;i<9;i++)this.box(x-.35+i*.085,.045,z,.025,.015,.38,this.metal);}
  tree(x,z,height){
    const bark=this.mat('#665e4c');this.cylinder(x,height*.34,z,.13,height*.68,bark);this.colliders.push({x,z,w:.45,d:.45});
    for(let j=0;j<5;j++){let a=j*2.4;let branch=this.cylinder(x+Math.cos(a)*.4,height*.63,z+Math.sin(a)*.4,.055,height*.35,bark);branch.rotation.z=Math.cos(a)*.65;branch.rotation.x=Math.sin(a)*.65;}
    // Instanced leaf cards keep the canopy airy and let sunlight pass between leaves.
    const leafGeo=new T.PlaneGeometry(.32,.16);const leafMat=new T.MeshStandardMaterial({color:new T.Color().setHSL(.22+rnd()*.035,.22,.26),side:T.DoubleSide,roughness:1});
    let leaves=new T.InstancedMesh(leafGeo,leafMat,900),dummy=new T.Object3D();for(let i=0;i<900;i++){let a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*2.1;dummy.position.set(x+Math.cos(a)*r,height*.76+(rnd()-.5)*2,z+Math.sin(a)*r);dummy.rotation.set(rnd()*3,rnd()*6,rnd()*3);dummy.scale.setScalar(.7+rnd());dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);}leaves.castShadow=true;leaves.receiveShadow=true;this.scene.add(leaves);
  }
  human(color='#ffffff',player=false,civilian=true){
    const asset=civilian?this.civilianAsset:this.humanAsset,clips=civilian?this.civilianClips:this.humanAsset.animations;
    const model=new T.Group(),content=cloneSkeleton(asset.scene);model.add(content);content.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(content),height=bounds.max.y-bounds.min.y,scale=1.82/height;content.scale.multiplyScalar(scale);content.position.y-=bounds.min.y*scale;
    const hideHead={value:player?1:0};
    content.traverse(mesh=>{if(!mesh.isMesh)return;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.material=mesh.material.clone();mesh.material.roughness=.85;
      // Keep the original skin texture; tint clothing subtly instead of painting the whole face.
      mesh.material.color.set(color).lerp(new T.Color('#ffffff'),.8);
      if(player&&mesh.isSkinnedMesh){const headBones=new Set();for(let i=0;i<mesh.skeleton.bones.length;i++){let b=mesh.skeleton.bones[i];while(b){if(/Head|Neck/.test(b.name)){headBones.add(i);break;}b=b.parent;}}
        const indices=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight'),mask=new Float32Array(indices.count);for(let v=0;v<indices.count;v++)for(let j=0;j<4;j++)if(headBones.has(indices.getComponent(v,j)))mask[v]+=weights.getComponent(v,j);
        mesh.geometry=mesh.geometry.clone();mesh.geometry.setAttribute('headMask',new T.BufferAttribute(mask,1));
        mesh.material.onBeforeCompile=shader=>{shader.uniforms.hideHead=hideHead;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float headMask;varying float vHeadMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvHeadMask=headMask;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float hideHead;varying float vHeadMask;').replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(hideHead>.5&&vHeadMask>.15)discard;');};mesh.material.customProgramCacheKey=()=> 'another-world-player-head';
      }
    });
    const mixer=new T.AnimationMixer(content),actions={};for(const clip of clips){if(!['Idle','Walk','Run'].includes(clip.name))continue;actions[clip.name]=mixer.clipAction(clip);}
    actions.Idle.play();mixer.update(0);model.userData={mixer,actions,current:'Idle',lastTime:null,hideHead,isHuman:true};this.scene.add(model);return model;
  }
  character(color='#596d67',skin='#b78969'){
    let group=new T.Group(),cloth=this.mat(color,.94),skinmat=this.mat(skin,.62),pants=this.mat('#3b4345'),hair=this.mat('#3b332d'),shoe=this.mat('#343630');
    const capsule=(r,length,mat,x,y,z,parent=group)=>this.mesh(new T.CapsuleGeometry(r,length,5,10),mat,x,y,z,1,1,1,parent);
    let torso=this.sphere(0,1.23,0,.25,.32,.15,cloth,group);this.box(0,1.28,.145,.018,.42,.018,this.metal,false,group);this.box(-.12,1.34,.15,.10,.09,.017,cloth,false,group);
    capsule(.09,.13,skinmat,0,1.57,0);let head=this.sphere(0,1.78,0,.13,.19,.135,skinmat,group);this.sphere(0,1.91,-.015,.139,.078,.139,hair,group);this.sphere(0,1.77,.135,.025,.034,.034,skinmat,group);
    for(let side of[-1,1]){this.sphere(side*.052,1.82,.125,.018,.009,.008,this.mat('#30312b'),group);this.sphere(side*.136,1.79,0,.019,.04,.025,skinmat,group);}this.box(0,1.71,.123,.044,.008,.014,this.mat('#845944'),false,group);
    const limbs={};for(let side of[-1,1]){let leg=new T.Group();leg.position.set(side*.115,.96,0);group.add(leg);capsule(.09,.33,pants,0,-.25,0,leg);capsule(.07,.32,pants,0,-.68,0,leg);this.sphere(0,-.89,.07,.095,.065,.16,shoe,leg);limbs[side===-1?'leftLeg':'rightLeg']=leg;
      let arm=new T.Group();arm.position.set(side*.28,1.45,0);group.add(arm);capsule(.065,.25,cloth,side*.02,-.19,0,arm);capsule(.05,.23,cloth,side*.03,-.49,0,arm);this.sphere(side*.03,-.66,.02,.052,.077,.035,skinmat,arm);limbs[side===-1?'leftArm':'rightArm']=arm;}
    group.userData={head,limbs};this.scene.add(group);return group;
  }
  updateCharacter(model,x,z,yaw,moving,t){model.position.set(x,0,z);model.rotation.y=yaw;if(model.userData.isHuman){const data=model.userData,next=moving?(data.owner?.fear>.3?'Run':'Walk'):'Idle';if(next!==data.current){data.actions[next].reset().play();data.actions[data.current].crossFadeTo(data.actions[next],.25,false);data.current=next;}const dt=data.lastTime===null?0:Math.min(.1,Math.max(0,t-data.lastTime));data.mixer.update(dt);data.lastTime=t;return;}let s=moving?Math.sin(t*7)*.35:0;model.userData.limbs.leftLeg.rotation.x=s;model.userData.limbs.rightLeg.rotation.x=-s;model.userData.limbs.leftArm.rotation.x=-s*.65;model.userData.limbs.rightArm.rotation.x=s*.65;}
  blocked(x,z){return this.colliders.some(o=>Math.abs(x-o.x)<o.w/2+.27&&Math.abs(z-o.z)<o.d/2+.27);}
  resize(){this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.composer.setSize(innerWidth,innerHeight);}
  render(player,playing,moving,t,phone,pulse,driving){
    this.bodycamPass.uniforms.time.value=t;
    if(driving){
      // Chase camera while driving — our car model has no modeled interior, so a cockpit view would clip into its own shell.
      let behind=4.6+Math.min(2.5,Math.abs(player.carSpeed||0)*.12);
      this.camera.position.set(player.x-Math.sin(player.yaw)*behind,2.6,player.z+Math.cos(player.yaw)*behind);
      this.camera.lookAt(player.x,1,player.z);
    }else if(playing){
      // Handheld bodycam sway: a fast walking bob plus slower low-frequency drift, tied to movement.
      let walk=moving?1:0,bobY=Math.sin(t*8.4)*.03*walk+Math.sin(t*1.7)*.006,bobX=Math.sin(t*4.2)*.018*walk,drift=Math.sin(t*.9)*.01+Math.sin(t*1.37)*.007;
      this.shake.rollVel+=((rnd()-.5)*.6-this.shake.roll*2.2)*.016;this.shake.roll+=this.shake.rollVel*.016;
      let swayYaw=Math.sin(t*2.1)*.004*walk+drift*.4,swayPitch=Math.sin(t*3.3)*.005*walk+bobY*.12;
      this.camera.position.set(player.x+Math.sin(player.yaw)*.10+bobX,1.72+bobY,player.z-Math.cos(player.yaw)*.10);
      this.camera.rotation.set(player.pitch+swayPitch,-player.yaw+swayYaw,this.shake.roll*.5+bobX*.15,'YXZ');
    }
    else{this.camera.position.set(-9,2.3,6);this.camera.lookAt(-21,2,-11);}
    this.playerModel.visible=playing&&!driving;this.updateCharacter(this.playerModel,player.x,player.z,-player.yaw+Math.PI,moving,t);
    // Camera sits just in front of the neck; the face is hidden only in the main view.
    const headMeshes=[];this.playerModel.traverse(m=>{if(m.isMesh&&m.position.y>1.55&&m.parent===this.playerModel){headMeshes.push(m);m.visible=false;}});
    if(this.playerModel.userData.isHuman)this.playerModel.userData.hideHead.value=1;
    else{this.playerModel.userData.limbs.leftArm.rotation.z=.07;this.playerModel.userData.limbs.rightArm.rotation.z=-.07;}
    this.pulseMesh.visible=pulse>0;if(pulse>0){this.pulseMesh.position.set(player.x,.15,player.z);this.pulseMesh.scale.setScalar(Math.max(.1,(1-pulse)*12));this.pulseMesh.material.opacity=pulse*.7;}
    for(let {mesh,offset}of this.particles)mesh.position.y=.6+((t+offset)%1.2)*.85;
    this.composer.render();
    if(phone){for(let m of headMeshes)m.visible=true;if(this.playerModel.userData.isHuman)this.playerModel.userData.hideHead.value=0;const f=new T.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw));this.selfieCamera.position.set(player.x+f.x*1.08,1.79,player.z+f.z*1.08);this.selfieCamera.lookAt(player.x,1.58,player.z);this.selfieRenderer.render(this.scene,this.selfieCamera);for(let m of headMeshes)m.visible=false;if(this.playerModel.userData.isHuman)this.playerModel.userData.hideHead.value=1;}
  }
}
