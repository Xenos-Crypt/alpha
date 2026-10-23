// Original low-poly transport meshes shaped from the user's concept board.
// Units are metres; authoring axes are X right, Y forward, Z up.
import * as T from 'three';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../SourceAssets/transport');
fs.mkdirSync(root,{recursive:true});
const palette=[
 {name:'Pearl ceramic',pbrMetallicRoughness:{baseColorFactor:[.77,.82,.87,1],metallicFactor:.4,roughnessFactor:.27}},
 {name:'Graphite structure',pbrMetallicRoughness:{baseColorFactor:[.025,.035,.05,1],metallicFactor:.6,roughnessFactor:.34}},
 {name:'Swept reflective glazing',pbrMetallicRoughness:{baseColorFactor:[.018,.055,.085,1],metallicFactor:.7,roughnessFactor:.11}},
 {name:'Induction and running lights',pbrMetallicRoughness:{baseColorFactor:[.02,.65,.9,1],metallicFactor:0,roughnessFactor:.4},emissiveFactor:[.01,.6,.95],extensions:{KHR_materials_unlit:{}}},
 {name:'Rear marker lights',pbrMetallicRoughness:{baseColorFactor:[.65,.025,.012,1],metallicFactor:0,roughnessFactor:.4},emissiveFactor:[.65,.02,.01],extensions:{KHR_materials_unlit:{}}},
 {name:'Titanium alloy joints',pbrMetallicRoughness:{baseColorFactor:[.34,.39,.46,1],metallicFactor:.85,roughnessFactor:.26}},
 {name:'Carbon composite panels',pbrMetallicRoughness:{baseColorFactor:[.028,.038,.048,1],metallicFactor:.25,roughnessFactor:.31}},
 // Opaque reflective exterior remains reliable in the DX11 compatibility path;
 // backface culling keeps the cockpit camera's interior view unobstructed.
 {name:'Smart cockpit glass',pbrMetallicRoughness:{baseColorFactor:[.025,.065,.1,1],metallicFactor:.5,roughnessFactor:.12},doubleSided:false},
 {name:'Seat upholstery',pbrMetallicRoughness:{baseColorFactor:[.25,.29,.32,1],metallicFactor:0,roughnessFactor:.76}},
 {name:'Tyre rubber',pbrMetallicRoughness:{baseColorFactor:[.012,.015,.018,1],metallicFactor:0,roughnessFactor:.88}}
];
const models=[];
class Model{
 constructor(name){this.name=name;this.parts=[];}
 add(geometry,mat=0,at=[0,0,0],rot=[0,0,0]){
  const g=geometry.clone();g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...rot)));
  g.translate(...at);this.parts.push({g,mat});return this;
 }
 box(size,at,mat=0,r=.035,rot=[0,0,0]){
  const [w,l,h]=size,hw=w/2,hl=l/2,q=Math.min(r,w/3,l/3,h/3),s=new T.Shape();
  s.moveTo(-hw+q,-hl);s.lineTo(hw-q,-hl);s.quadraticCurveTo(hw,-hl,hw,-hl+q);s.lineTo(hw,hl-q);s.quadraticCurveTo(hw,hl,hw-q,hl);s.lineTo(-hw+q,hl);s.quadraticCurveTo(-hw,hl,-hw,hl-q);s.lineTo(-hw,-hl+q);s.quadraticCurveTo(-hw,-hl,-hw+q,-hl);
  const g=new T.ExtrudeGeometry(s,{depth:Math.max(.001,h-2*q),bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:q,bevelThickness:q,curveSegments:3});
  g.translate(0,0,-h/2+q);return this.add(g,mat,at,rot);
 }
 line(points,r=.012,mat=1){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  return this.add(new T.TubeGeometry(curve,Math.max(4,points.length*4),r,6,false),mat);
 }
 ring(at,r=.23,t=.018,mat=3,rot=[0,0,0]){return this.add(new T.TorusGeometry(r,t,6,28),mat,at,rot);}
 loft(sections,mat=0,at=[0,0,0],round=.6){
  const verts=[],indices=[],rings=sections.length*4,segments=24;
  const cubic=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
  for(let i=0;i<=rings;i++){
   const u=i/rings*(sections.length-1),j=Math.min(sections.length-2,Math.floor(u)),t=u-j;
   const s=Array.from({length:4},(_,k)=>cubic(sections[Math.max(0,j-1)][k],sections[j][k],sections[j+1][k],sections[Math.min(sections.length-1,j+2)][k],t));
   const [y,w,lo,hi]=s;
   for(let n=0;n<segments;n++){
    const a=n/segments*Math.PI*2,c=Math.cos(a),sn=Math.sin(a);
    verts.push(Math.sign(c)*Math.pow(Math.abs(c),round)*Math.max(.005,w/2),y,(lo+hi)/2+Math.sign(sn)*Math.pow(Math.abs(sn),round)*(hi-lo)/2);
   }
  }
  const emit=(a,b,c)=>{
   if(this.deckOpenings){
    const x=(verts[a*3]+verts[b*3]+verts[c*3])/3,y=(verts[a*3+1]+verts[b*3+1]+verts[c*3+1])/3,z=(verts[a*3+2]+verts[b*3+2]+verts[c*3+2])/3;
    if(this.deckOpenings.some(o=>Math.abs(x)<o.width/2&&y>o.minY&&y<o.maxY&&z>o.z))return;
   }
   indices.push(a,b,c);
  };
  for(let i=0;i<rings;i++)for(let n=0;n<segments;n++){let a=i*segments+n,b=i*segments+(n+1)%segments;emit(a,a+segments,b);emit(b,a+segments,b+segments);}
  for(let n=1;n<segments-1;n++){indices.push(0,n,n+1);let a=rings*segments;indices.push(a,a+n+1,a+n);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();return this.add(g,mat,at);
 }
 wing(points,z,thickness=.07,mat=0){
  const shape=new T.Shape(points.map(([x,y])=>new T.Vector2(x,y)));
  const g=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2,steps:1});return this.add(g,mat,[0,0,z]);
 }
 save(){
  const chunks=[],views=[],accessors=[],primitives=[];let offset=0,triangles=0;
  const append=(array,type,count,componentType,target)=>{
   const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength);const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}
   const view=views.length;views.push({buffer:0,byteOffset:offset,byteLength:bytes.length,target});chunks.push(bytes);offset+=bytes.length;
   const entry={bufferView:view,componentType,count,type};if(type==='VEC3'){
    entry.min=[Infinity,Infinity,Infinity];entry.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<array.length;i++) {const k=i%3;entry.min[k]=Math.min(entry.min[k],array[i]);entry.max[k]=Math.max(entry.max[k],array[i]);}
   }accessors.push(entry);return accessors.length-1;
  };
  for(let mat=0;mat<palette.length;mat++){
   const positions=[],normals=[],uvs=[],indices=[];
   for(const {g,mat:slot} of this.parts){if(slot!==mat)continue;const p=g.getAttribute('position'),n=g.getAttribute('normal'),start=positions.length/3;
    const uv=g.getAttribute('uv');
    for(let i=0;i<p.count;i++){
     positions.push(p.getX(i),p.getZ(i),-p.getY(i));normals.push(n.getX(i),n.getZ(i),-n.getY(i));
     if(uv)uvs.push(uv.getX(i),uv.getY(i));
     else if(Math.abs(n.getZ(i))>.5)uvs.push(p.getX(i),p.getY(i));
     else if(Math.abs(n.getX(i))>.5)uvs.push(p.getY(i),p.getZ(i));
     else uvs.push(p.getX(i),p.getZ(i));
    }
    if(g.index)for(const i of g.index.array)indices.push(start+i);else for(let i=0;i<p.count;i++)indices.push(start+i);
   }
   if(!indices.length)continue;triangles+=indices.length/3;
   const POSITION=append(new Float32Array(positions),'VEC3',positions.length/3,5126,34962);
   const NORMAL=append(new Float32Array(normals),'VEC3',normals.length/3,5126,34962);
   const TEXCOORD_0=append(new Float32Array(uvs),'VEC2',uvs.length/2,5126,34962);
   const ix=append(new Uint32Array(indices),'SCALAR',indices.length,5125,34963);
   primitives.push({attributes:{POSITION,NORMAL,TEXCOORD_0},indices:ix,material:mat});
  }
  const binary=Buffer.concat(chunks),uri=this.name+'.bin';fs.writeFileSync(path.join(root,uri),binary);
  const doc={asset:{version:'2.0',generator:'Another World original transport authoring'},extensionsUsed:['KHR_materials_unlit'],scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:this.name}],meshes:[{name:this.name,primitives}],materials:palette,buffers:[{byteLength:binary.length,uri}],bufferViews:views,accessors};
  fs.writeFileSync(path.join(root,this.name+'.gltf'),JSON.stringify(doc));models.push({name:this.name,triangles,bytes:binary.length,license:'Original project-authored geometry; design reference supplied by user.'});
 }
}
function car(name='induction_car',flying=false){
 const m=new Model(name);
 m.loft([[-2.3,.3,.62,.8],[-2.05,1.65,.42,.96],[-1.2,1.98,.4,.94],[.6,1.9,.43,.99],[1.7,1.64,.6,.88],[2.3,.65,.7,.81]],0);
 m.loft([[-1.6,.3,.93,.98],[-1.15,1.32,.91,1.43],[-.35,1.48,.94,1.57],[.5,1.22,.96,1.35],[1.08,.45,.93,1.01]],2, [0,0,0],.8);
 m.loft([[-1.02,.8,1.43,1.46],[-.6,1.13,1.54,1.57],[-.15,1.12,1.52,1.55],[.05,.8,1.48,1.5]],0);
 m.loft([[-2,1.35,.37,.48],[-1.2,1.65,.32,.46],[1.2,1.55,.4,.52],[2,.65,.58,.66]],1);
 for(const side of [-1,1]){
  m.line([[side*.15,2.23,.81],[side*.55,2.07,.83],[side*.84,1.77,.8]],.018,3);
  m.line([[side*.65,-2.05,.77],[side*.85,-1.7,.8]],.016,4);
  m.line([[side*.7,-1.45,1.01],[side*.96,-.85,.91],[side*.96,.75,.89],[side*.85,1.1,.66],[side*.9,-1.1,.6],[side*.7,-1.45,1.01]],.008,1);
  m.line([[side*.83,-1.6,.55],[side*1.0,-.7,.49],[side*.98,.65,.53],[side*.8,1.4,.65]],.012,3);
  m.box([.12,.25,.09],[side*.83,.25,1.04],0,.025);
  for(const y of [-1.2,1.05]){
   const x=side*(flying?1.35:.79);
   m.loft([[-.5,.18,.43,.51],[-.3,.62,.34,.57],[.3,.61,.35,.57],[.5,.17,.46,.51]],0,[x,y,0]);
   m.ring([x,y,.335],.22,.016,3);
  }
  if(flying)m.wing([[side*.7,-1.6],[side*1.8,-1.45],[side*1.75,.95],[side*.8,1.2]],.64,.07,0);
 }
 m.box([.85,.045,.065],[0,2.16,.70],1,.01);m.save();
}
car();car('flying_car',true);

function serviceCavities(m){
 // Luggage is aft; the forward service bay is physically separate.
 for(const [y,w,l] of [[-2.14,1.30,.86],[1.93,.54,.84]]){
  m.box([w,l,.06],[0,y,.42],1,.015);
  for(const side of [-1,1])m.box([.055,l,.50],[side*w/2,y,.67],1,.012);
  for(const side of [-1,1])m.box([w,.045,.50],[0,y+side*l/2,.67],1,.012);
 }
 m.box([.20,.44,.15],[-.13,1.93,.55],5,.02);
 m.box([.20,.44,.15],[.13,1.93,.55],1,.02);
 m.line([[-.13,1.8,.65],[0,1.66,.65],[.13,1.8,.65]],.018,3);
}
const deckOpenings=[{width:1.36,minY:-2.62,maxY:-1.63,z:.70},{width:.60,minY:1.46,maxY:2.43,z:.73}];

// Aurora X9: separate motor/wing components are articulated in native gameplay.
// Overall flight width is 2 * (2.55 + .55) = 6.2m; body length is 5.8m.
{
 const m=new Model('aurora_x9_body');
 m.deckOpenings=deckOpenings;
 m.loft([[-2.9,.24,.51,.66],[-2.55,1.5,.36,.89],[-1.7,2.18,.30,1.0],[.4,2.12,.35,1.03],[1.8,1.8,.44,.91],[2.65,.85,.51,.75],[2.9,.18,.58,.65]],6);
 m.deckOpenings=null;
 m.loft([[-2.55,1.2,.27,.4],[-1.5,1.9,.24,.4],[1.2,1.8,.3,.5],[2.55,.5,.48,.56]],1);
 m.loft([[-1.9,.5,.98,1.08],[-1.35,1.65,.91,1.43],[-.35,1.8,.94,1.6],[.7,1.5,.95,1.39],[1.7,.6,.91,.99]],7,[0,0,0],.82);
 m.line([[-.86,-1.4,1.1],[-.82,-.5,1.55],[-.65,.5,1.37],[-.27,1.6,.97]],.025,5);
 m.line([[.86,-1.4,1.1],[.82,-.5,1.55],[.65,.5,1.37],[.27,1.6,.97]],.025,5);
 m.box([.95,.48,.045],[0,-.5,1.61],6,.018);
 for(const side of [-1,1]){
  m.loft([[-1.9,.22,.65,.86],[-1.25,.38,.48,.91],[.8,.32,.53,.9],[1.6,.13,.68,.8]],5,[side*1.0,0,0]);
  m.line([[side*.25,2.59,.7],[side*.59,2.35,.78],[side*.78,1.9,.84]],.02,3);
  m.line([[side*.9,-1.8,.7],[side*1.12,-1.05,.62],[side*1.07,.75,.7],[side*.77,1.6,.8]],.015,3);
  m.line([[side*.78,-1.48,1.1],[side*1.07,-.9,.94],[side*1.07,.75,.93],[side*.88,1.08,.61],[side*.9,-1.6,.55]],.009,1);
  m.box([.12,.25,.03],[side*1.075,-.5,.92],5,.012);
  for(const y of [-1.65,-1.25,-.85])m.box([.04,.2,.12],[side*1.07,y,.63],1,.008,[0,.3,0]);
  // Integrated front lift duct, separate from the four outer main motors.
  m.ring([side*.69,1.85,1.01],.29,.065,6);
  m.ring([side*.69,1.85,1.05],.275,.013,3);
  // Four visible seats within the smart-glass cockpit.
  for(const y of [-.95,.1]){
   m.box([.55,.62,.13],[side*.43,y,.61],8,.055);
   m.box([.53,.14,.62],[side*.43,y-.25,.93],8,.045,[.12,0,0]);
   m.box([.32,.15,.18],[side*.43,y-.3,1.3],8,.04);
   m.line([[side*.64,y-.29,1.15],[side*.22,y-.2,.68]],.012,1);
  }
  m.box([.38,.15,.17],[side*.62,-2.55,.6],1,.025);
  m.line([[side*.43,-2.67,.78],[side*.83,-2.4,.83]],.018,4);
 }
 m.box([1.55,.32,.22],[0,.9,.95],6,.04);
 m.box([.5,.035,.21],[-.42,.71,1.12],2,.012,[.15,0,0]);
 m.line([[-.7,.75,1.0],[-.69,.71,1.17],[-.45,.71,1.25],[-.22,.71,1.17],[-.22,.75,1]],.025,1);
 m.box([.16,.32,.12],[0,.18,.79],1,.025);
 m.box([1.2,.9,.14],[0,-1.75,.33],5,.035);
 m.box([.25,.3,.08],[0,.8,1.55],2,.02);
 serviceCavities(m);m.save();
}
// Separate six-seat body shells, drawn from the X7 and X12 reference boards.
for(const aero of [false,true]){
 const m=new Model(aero?'aerodynex_x12_body':'skyline_x7_body'),shell=aero?0:6;
 m.deckOpenings=deckOpenings;
 m.loft([[-2.9,.45,.48,.75],[-2.5,1.9,.3,.95],[-1.4,2.24,.27,1.1],[.8,2.18,.34,1.0],[2.1,1.7,.48,.92],[2.9,.28,.58,.74]],shell,[0,0,0],aero?.4:.55);
 m.deckOpenings=null;
 m.loft([[-2.6,1.25,.2,.48],[-1.8,1.92,.16,.43],[1.45,1.75,.32,.55],[2.7,.5,.48,.61]],1);
 m.loft([[-2.05,.6,1.02,1.12],[-1.35,1.8,.93,aero?1.5:1.65],[-.3,1.9,1, aero?1.6:1.7],[.9,1.6,.98,1.5],[2.0,.35,.95,1.02]],7,[0,0,0],.8);
 for(const side of [-1,1]){
  m.line([[side*.29,2.7,.8],[side*.7,2.35,.87],[side*.96,1.7,.91]],.026,3);
  m.line([[side*.34,2.72,.76],[0,2.86,.74],[-side*.34,2.72,.76]],.018,3);
  m.line([[side*.97,-1.7,1.0],[side*1.12,-.9,1.04],[side*1.1,.9,.98],[side*.84,1.55,.91]],.032,aero?0:5);
  m.wing([[side*.88,-1.9],[side*1.48,-2.7],[side*1.35,-2.88],[side*.55,-2.4]],1.13,.065,shell);
  m.line([[side*.4,-2.75,.79],[side*.88,-2.5,.85]],.025,4);
  m.wing([[side*.8,-1.5],[side*1.28,-1.12],[side*1.2,.7],[side*.91,1.15]],.69,.09,aero?6:5);
  for(const y of [-1.65,-1.35,-1.05])m.box([.035,.17,.15],[side*1.1,y,.66],1,.005);
  for(const y of [-1.35,-.4,.55]){
   m.box([.55,.57,.13],[side*.43,y,.64],8,.05);
   m.box([.53,.15,.55],[side*.43,y-.23,.95],8,.05,[.12,0,0]);
   m.box([.32,.16,.17],[side*.43,y-.27,1.28],8,.035);
   m.line([[side*.65,y-.26,1.16],[side*.23,y-.18,.72]],.012,1);
  }
  if(!aero){m.ring([side*.67,1.87,1.02],.28,.065,6);m.ring([side*.67,1.87,1.06],.27,.015,3);}
 }
 m.line([[-.9,-1.7,1.13],[-.87,-.9,aero?1.55:1.66],[-.7,.7,1.48],[-.2,1.92,1.01]],.025,aero?0:5);
 m.line([[.9,-1.7,1.13],[.87,-.9,aero?1.55:1.66],[.7,.7,1.48],[.2,1.92,1.01]],.025,aero?0:5);
 m.box([1.6,.32,.2],[0,1.2,.98],1,.035);
 m.box([1.2,.045,.24],[0,.99,1.14],2,.015);
 m.line([[-.7,1.0,1.05],[-.68,.97,1.23],[-.42,.97,1.29],[-.18,.97,1.2]],.023,5);
 m.box([.7,.6,.055],[0,-.4,aero?1.62:1.72],shell,.02);
 serviceCavities(m);m.save();
}
{
 const m=new Model('luggage_boot_lid');
 m.box([1.42,.98,.065],[0,-.49,-.03],6,.025);
 m.line([[-.68,-.94,-.065],[.68,-.94,-.065],[.68,-.05,-.065],[-.68,-.05,-.065],[-.68,-.94,-.065]],.013,1);
 m.box([.12,.09,.04],[0,-.88,-.09],5,.008);m.save();
}
{
 const m=new Model('forward_service_lid');
 m.box([.64,.97,.055],[0,.485,-.035],6,.025);
 for(const side of [-1,1])m.line([[side*.27,.05,-.075],[side*.27,.9,-.075]],.012,1);
 m.save();
}
{
 const m=new Model('cabin_door');
 m.box([.065,1.33,.40],[0,-.665,-.15],6,.025);
 m.line([[0,-.1,.03],[0,-1.26,.03]],.016,3);
 m.box([.1,.18,.035],[.025,-1.05,-.04],5,.01);m.save();
}
{
 const m=new Model('retractable_road_gear');
 // Axle-centred upright. Tyre is a separate part so steering and rolling do
 // not rotate the shock absorber or brake caliper.
 m.box([.11,.13,.36],[0,0,.22],5,.02);
 m.box([.15,.16,.18],[0,0,.35],1,.025);
 m.line([[0,0,.05],[0,.14,.3],[0,.13,.44]],.035,5);
 for(const side of [-1,1])m.line([[side*.02,0,0],[side*.12,.24,.13],[side*.18,.25,.13]],.027,6);
 m.ring([0,0,0],.225,.023,5,[0,Math.PI/2,0]);
 m.box([.14,.10,.23],[0,.19,.04],4,.018);
 m.line([[0,.15,.14],[.04,.18,.32],[0,.1,.44]],.009,1);
 m.save();
}
{
 const m=new Model('road_wheel');
 // 840 mm overall diameter, 320 mm section width; separate 560 mm rim.
 const geometry=new T.LatheGeometry([
  new T.Vector2(.28,-.16),new T.Vector2(.365,-.16),new T.Vector2(.405,-.13),
  new T.Vector2(.42,-.09),new T.Vector2(.42,.09),new T.Vector2(.405,.13),
  new T.Vector2(.365,.16),new T.Vector2(.28,.16),new T.Vector2(.28,-.16)
 ],48);
 m.add(geometry,9,[0,0,0],[0,0,Math.PI/2]);
 for(const side of [-1,1]){
  m.ring([side*.13,0,0],.274,.016,5,[0,Math.PI/2,0]);
  m.ring([side*.13,0,0],.09,.024,5,[0,Math.PI/2,0]);
  for(let n=0;n<7;n++){
   const a=n*Math.PI*2/7,c=Math.cos(a),s=Math.sin(a);
   m.line([[side*.13,c*.085,s*.085],[side*.13,c*.255,s*.255]],.02,5);
  }
 }
 for(let n=0;n<44;n++){
  const a=n*Math.PI*2/44,c=Math.cos(a),s=Math.sin(a);
  m.line([[-.105,c*.414,s*.414],[0,Math.cos(a+.025)*.415,Math.sin(a+.025)*.415],[.105,c*.414,s*.414]],.0045,9);
 }
 m.save();
}
for(const aero of [false,true]){
 const m=new Model(aero?'aerodynex_x12_motor':'skyline_x7_motor');
 m.ring([0,0,0],.46,.10,aero?0:6);m.ring([0,0,-.08],.42,.07,1);
 m.ring([0,0,.08],.46,.018,3);
 for(let n=0;n<4;n++){
  const a=n*Math.PI/2,c=Math.cos(a),s=Math.sin(a);
  m.line([[c*.1,s*.1,-.035],[c*.43,s*.43,-.035]],.017,5);
  m.box([.065,.12,.09],[c*.51,s*.51,-.03],3,.012,[0,0,a]);
 }
 m.box([.13,.13,.12],[0,0,-.05],1,.025);m.save();
}
{
 const m=new Model('aurora_x9_motor');
 m.ring([0,0,0],.48,.07,6);m.ring([0,0,.025],.515,.025,5);m.ring([0,0,.07],.46,.014,3);
 for(const side of [-1,1])m.loft([[-.5,.13,-.1,.02],[-.35,.28,-.12,.06],[.35,.28,-.12,.06],[.5,.13,-.06,.02]],6,[side*.43,0,0]);
 for(let n=0;n<4;n++){
  let a=n*Math.PI/2;m.line([[Math.cos(a)*.1,Math.sin(a)*.1,-.04],[Math.cos(a)*.44,Math.sin(a)*.44,-.04]],.018,5);
 }
 m.box([.13,.13,.12],[0,0,-.05],1,.03);m.save();
}
{
 const m=new Model('aurora_x9_rotor');
 for(let n=0;n<6;n++){
  const a=n*Math.PI/3,c=Math.cos(a),s=Math.sin(a);
  m.wing([[.07*c,.07*s],[.44*c-.05*s,.44*s+.05*c],[.4*c-.13*s,.4*s+.13*c],[.12*c-.07*s,.12*s+.07*c]],0,.009,5);
 }m.save();
}
{
 const m=new Model('aurora_x9_wing');
 m.wing([[0,-.25],[.9,-.32],[1.03,-.16],[.9,.25],[0,.2]],-.04,.09,6);
 m.line([[.15,-.18,-.06],[.88,-.28,-.06]],.018,3);
 m.box([.18,.32,.18],[.08,0,0],5,.035);m.save();
}
{
 const m=new Model('aurora_x9_gear');
 // Parking stabiliser, independent of the four road wheels.
 m.box([.12,.13,.43],[0,0,.26],5,.018);
 m.box([.16,.17,.2],[0,0,.39],1,.022);
 m.box([.34,.44,.06],[0,0,.03],1,.022);
 for(const side of [-1,1])m.line([[side*.12,0,.07],[0,0,.2]],.025,5);
 m.save();
}

{
 const m=new Model('hover_bike');
 m.loft([[-1.08,.18,.4,.54],[-.6,.48,.4,.76],[.25,.6,.38,.78],[.95,.25,.47,.7]],0);
 m.loft([[-.65,.22,.78,.85],[-.15,.4,.8,.88],[.2,.25,.8,.86]],1);
 m.loft([[.15,.23,.74,.78],[.52,.45,.7,1.18],[.82,.26,.65,1.03],[1,.12,.65,.72]],0);
 m.loft([[.45,.25,1.02,1.1],[.58,.32,1.15,1.22],[.78,.22,1.03,1.1]],2);
 for(const side of [-1,1]){
  m.line([[side*.16,-.65,.36],[side*.12,-.15,.77],[side*.18,.67,.39]],.035,1);
  m.line([[0,.3,1.02],[side*.34,.36,1.05],[side*.4,.3,1.04]],.025,1);
  m.line([[side*.23,.68,.8],[side*.13,.9,.76]],.012,3);
 }
 for(const y of [-.78,.76]){
  m.ring([0,y,.34],.29,.065,1,[0,Math.PI/2,0]);
  for(const side of [-1,1])m.ring([side*.065,y,.34],.26,.018,3,[0,Math.PI/2,0]);
 }
 m.save();
}

function rail(name,length,width,height){
 const m=new Model(name),L=length/2;
 m.loft([[-L,width*.65,.45,.95],[-L*.82,width,.38,height*.57],[L*.55,width,.38,height*.57],[L*.87,width*.83,.52,height*.48],[L,width*.25,.75,height*.42]],0);
 m.loft([[-L*.96,width*.6,height*.57,height*.89],[-L*.82,width*.96,height*.57,height*.97],[L*.55,width*.96,height*.57,height*.97],[L*.84,width*.8,height*.48,height*.85],[L*.98,width*.25,height*.42,height*.60]],2);
 m.loft([[-L*.96,width*.6,height*.89,height*.95],[-L*.82,width,height*.97,height*1.035],[L*.55,width,height*.97,height*1.035],[L*.84,width*.8,height*.85,height*.90],[L*.98,width*.22,height*.6,height*.65]],0);
 for(const side of [-1,1]){
  m.line([[side*width*.42,-L*.82,height*.35],[side*width*.51,0,height*.35],[side*width*.4,L*.82,height*.36]],.025,3);
  for(let y=-L*.6;y<L*.6;y+=1.05)m.box([.04,.045,height*.36],[side*width*.49,y,height*.78],0,.007);
  for(const y of [-L*.45,L*.32])m.line([[side*width*.505,y,.65],[side*width*.505,y,height*.9],[side*width*.505,y+.62,height*.9],[side*width*.505,y+.62,.65]],.012,1);
 }
 m.box([width*.35,.04,.07],[0,L*.95,height*.4],3,.008);m.save();
}
rail('maglev_carriage',9,2.65,2.7);rail('hover_tram',7.4,2.55,2.65);rail('hover_bus',6.8,2.5,2.55);

// Orion fleet. Regional units are 25 m sections (8 = approximately 200 m);
// urban trams are 10 m sections (4 = approximately 40 m).
function orion(name,length,width,height,cab){
 const m=new Model(name),L=length/2;
 const sections=cab?[[-L,width*.92,.5,1.8],[-L*.8,width,.46,1.8],[L*.4,width,.46,1.8],[L*.75,width*.8,.65,1.5],[L,.28,.9,1.15]]:
  [[-L,width*.92,.5,1.8],[-L*.9,width,.46,1.8],[L*.9,width,.46,1.8],[L,width*.92,.5,1.8]];
 m.loft(sections,0);
 const canopy=sections.map(([y,w,lo,hi])=>[y,w*.97,hi-.05,cab&&y>L*.4?height-(y/L)*1.7:height-.22]);
 m.loft(canopy,7,[0,0,0],.72);
 m.loft(canopy.map(([y,w,lo,hi])=>[y,w*1.015,hi,hi+.18]),0);
 m.box([width*.72,length*.83,.16],[0,-(cab?length*.04:0),.9],1,.025);
 m.box([width*.5,length*.80,.36],[0,-(cab?length*.04:0),.26],1,.025);
 for(const side of [-1,1]){
  m.line([[side*width*.42,-L*.94,.57],[side*width*.505,0,.56],[side*width*(cab?.30:.42),L*.90,.65]],.024,3);
  for(let y=-L*.80;y<L*(cab?.42:.82);y+=1.13){
   m.box([.045,.065,height-1.85],[side*width*.493,y,(height-.22+1.8)/2],5,.01);
   for(const seatX of [width*.17,width*.34]){
    m.box([.45,.48,.12],[side*seatX,y,1.25],8,.04);
    m.box([.44,.12,.60],[side*seatX,y-.19,1.56],8,.04,[.08,0,0]);
   }
  }
  for(const y of [-L*.55,L*.20]){
   m.line([[side*width*.505,y,.95],[side*width*.505,y,height-.32],[side*width*.505,y+.9,height-.32],[side*width*.505,y+.9,.95]],.018,1);
   m.line([[side*width*.51,y+.1,1.13],[side*width*.51,y+.8,1.13]],.012,3);
  }
  for(const y of [-L*.65,L*.55])m.box([.18,1.0,.28],[side*width*.32,y,.22],5,.025);
 }
 m.line([[-width*.38,-L*.83,height-.28],[width*.38,-L*.83,height-.28]],.025,3);
 if(cab){
  m.line([[-width*.2,L*.88,1.3],[0,L*.98,1.18],[width*.2,L*.88,1.3]],.035,3);
  m.box([width*.6,.6,.20],[0,L*.38,1.4],1,.03);
  m.box([width*.35,.04,.3],[0,L*.34,1.7],2,.015);
 }
 for(const side of [-1,1])m.box([.16,.2,.12],[side*width*.26,-L,.7],4,.015);
 m.save();
}
orion('orion_regional_cab',25,3.4,4.2,true);
orion('orion_regional_coach',25,3.4,4.2,false);
orion('orion_tram_cab',10,2.8,3.2,true);
orion('orion_tram_coach',10,2.8,3.2,false);

{
 const m=new Model('rotorless_shuttle');
 m.loft([[-4,.3,.8,1.05],[-3,2.2,.5,1.7],[-1.5,3,.4,2.5],[1.2,2.9,.5,2.5],[3,1.85,.75,1.9],[4,.35,1.1,1.3]],0);
 m.loft([[-.5,2.6,1.5,2.52],[1.25,2.65,1.4,2.54],[2.8,1.8,1.3,1.94],[3.6,.3,1.3,1.4]],2);
 for(const side of [-1,1]){
  m.loft([[-3,.25,.45,.6],[-2,1.1,.3,.75],[1.9,1.1,.35,.76],[3,.2,.5,.65]],0,[side*1.9,0,0]);
  m.line([[side*1.9,-2,.31],[side*2.25,-1,.30],[side*2.25,1,.34],[side*1.9,2,.36]],.03,3);
  m.line([[side*1.45,-2,1.18],[side*1.5,.5,1.18],[side*.9,3,1.35]],.018,3);
  for(const y of [-1.6,1.6])m.ring([side*1.9,y,.29],.37,.025,3);
 }
 m.save();
}
{
 const m=new Model('airliner');
 m.loft([[-10,.15,1.1,1.3],[-8,1.3,.65,2.4],[-5,2.6,.4,3.0],[5,2.6,.4,3],[8,2.15,.6,2.8],[10,.8,1,2.05],[10.6,.1,1.4,1.55]],0);
 m.loft([[6.4,1.9,2.4,2.95],[7.5,1.7,2.15,2.85],[8.7,.95,1.9,2.4]],2);
 for(const side of [-1,1]){
  m.wing([[side*.8,3],[side*9.8,-3],[side*10.2,-4.8],[side*2,-2.1]],1,.13);
  m.wing([[side*.5,-7],[side*3.9,-8.7],[side*4.1,-9.6],[side*.4,-8.7]],1.7,.08);
  for(let y=-5.5;y<5.6;y+=.6)m.box([.035,.24,.32],[side*1.3,y,2.25],2,.012);
  m.loft([[-1,.5,.1,.6],[-.8,1.15,0,1.1],[.8,1.15,0,1.1],[1,.9,.15,1]],0,[side*4,-.7,-.25]);
  m.ring([side*4,.29,.31],.44,.04,1,[Math.PI/2,0,0]);
 }
 m.box([.12,2.8,2.2],[0,-8,3.4],0,.03,[.3,0,0]);m.save();
}
{
 const m=new Model('catamaran_ferry');
 for(const side of [-1,1]){
  m.loft([[-5,.35,-.25,.65],[-4,1.15,-.5,.85],[3.4,1.1,-.4,.9],[5,.1,.15,.8]],0,[side*1.45,0,0]);
  m.line([[side*1.95,-3,.2],[side*2,1,.2],[side*1.7,4,.4]],.035,3);
  for(const y of [-3.5,-2.5,-1.5,1.5,2.5])m.line([[side*2,y,.9],[side*2,y,1.55]],.018,1);
  m.line([[side*2,-4,1.55],[side*2,0,1.55],[side*1.75,3.6,1.55]],.02,0);
 }
 m.box([4,8,.18],[0,0,.88],0,.05);
 m.loft([[-2.5,2.7,1,2.8],[-1.8,3.1,1,3.05],[1.8,3.1,1,3.05],[3.3,2.1,1.1,2.3]],0);
 m.loft([[-2.3,2.72,1.65,2.8],[-1.8,3.13,1.65,2.98],[1.8,3.13,1.65,2.98],[3.3,2.13,1.65,2.28]],2);
 m.loft([[-2.6,2.9,2.8,2.96],[-1.8,3.5,3.02,3.18],[1.8,3.5,3.02,3.18],[3.5,2.2,2.3,2.48]],0);
 for(const side of [-1,1])m.line([[side*1.6,-1.8,1.44],[side*1.6,1.8,1.44],[side*1,3.3,1.46]],.018,3);
 m.save();
}
fs.writeFileSync(path.join(root,'catalogue.json'),JSON.stringify({reference:'unity/References/Transport-concept.png',models},null,2));
console.log(JSON.stringify(models.map(({name,triangles,bytes})=>({name,triangles,KiB:Math.round(bytes/1024)}))));
