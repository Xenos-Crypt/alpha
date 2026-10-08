import {buildArchitecture} from './architecture.mjs';
import fs from 'node:fs/promises';let lines=[`// Another World: visual town build, with no NPC thinking or AI.
uiLoad("ashford.cr")
cube = scene3dLoadMesh("assets/cube.obj")
roof = scene3dLoadMesh("assets/roof.obj")
sphere = scene3dLoadMesh("assets/sphere.obj")
cylinder = scene3dLoadMesh("assets/cylinder.obj")
plane = scene3dLoadMesh("assets/plane.obj")
foliage = scene3dLoadMesh("assets/foliage.obj")
stairRail = scene3dLoadMesh("assets/stair-rail.obj")
woman = scene3dLoadMesh("assets/woman.obj")
man = scene3dLoadMesh("assets/man.obj")
asphalt = scene3dLoadTexture("assets/asphalt.bmp")
paving = scene3dLoadTexture("assets/paving.bmp")
brick = scene3dLoadTexture("assets/brick.bmp")
plaster = scene3dLoadTexture("assets/plaster.bmp")
wood = scene3dLoadTexture("assets/wood.bmp")
grass = scene3dLoadTexture("assets/grass.bmp")
roofTiles = scene3dLoadTexture("assets/roof.bmp")
womanSkin = scene3dLoadTexture("assets/woman.bmp")
manSkin = scene3dLoadTexture("assets/man.bmp")
cafeSign = scene3dLoadTexture("assets/cafe.bmp")
bookSign = scene3dLoadTexture("assets/books.bmp")
marketSign = scene3dLoadTexture("assets/market.bmp")
leaf = scene3dLoadTexture("assets/leaf.bmp")

box x, y, z, w, h, d, r, g, b, texture
    obj = scene3dSpawn(cube, x, y, z, w / 2, h / 2, d / 2, r, g, b)
    if texture >= 0
        scene3dSetTexture(obj, texture)
    [.return] obj

shape mesh, x, y, z, sx, sy, sz, r, g, b, texture
    obj = scene3dSpawn(mesh, x, y, z, sx, sy, sz, r, g, b)
    if texture >= 0
        scene3dSetTexture(obj, texture)
    [.return] obj

[.task] resetView
    scene3dSetCamera(-9, 1.72, 2, -0.38, -0.03)
    uiSetText("dialogueText", "Take a moment. Look around.")

[.task] overlook
    scene3dSetCamera(29, 16, 25, -0.73, -0.42)
    uiSetText("dialogueText", "Ashford, in the morning light.")

panelVisible = 1
[.task] togglePanel
    if panelVisible == 1
        panelVisible = 0
        uiSetVisible("sidepanel", 0)
        uiSetText("panelBtn", "Show panel")
    else
        panelVisible = 1
        uiSetVisible("sidepanel", 1)
        uiSetText("panelBtn", "Hide panel")

viewHeld = 0
[.task] holdView
    if viewHeld == 0
        viewHeld = 1
        scene3dSetInput(0)
        uiSetText("holdViewBtn", "Explore again")
    else
        viewHeld = 0
        scene3dSetInput(1)
        uiSetText("holdViewBtn", "Hold view")

// Scene placement. Dimensions below are metres; cube helper converts unit-radius mesh scale.
`];
const num=n=>Number(n.toFixed(4)),col=s=>s.match(/../g).map(h=>num(parseInt(h,16)/255));
const box=(x,y,z,w,h,d,c,tex='-1')=>lines.push(`box(${[x,y,z,w,h,d].map(num).join(', ')}, ${col(c).join(', ')}, ${tex})`);
const shape=(m,x,y,z,sx,sy,sz,c,tex='-1')=>lines.push(`shape(${m}, ${[x,y,z,sx,sy,sz].map(num).join(', ')}, ${col(c).join(', ')}, ${tex})`);
box(0,-.16,0,180,.2,160,'9fa585','grass');box(0,-.04,0,110,.1,10,'ffffff','asphalt');
for(let side of[-1,1]){box(0,.015,side*6.6,110,.1,3.2,'ffffff','paving');box(0,.09,side*5.02,110,.19,.18,'aaa99d');}
for(let x=-48;x<=49;x+=7)box(x,.015,0,3,.012,.08,'d4ceb6');
buildArchitecture({box,shape,lines,num,col});
// Furniture, tables and coffee cups.
for(let x of[-24,-13]){shape('cylinder',x,.8,-7.1,.7,.055,.7,'b19c7c','wood');shape('cylinder',x,.4,-7.1,.055,.4,.055,'475449');shape('cylinder',x,.92,-7.1,.065,.08,.065,'ded8bf');for(let side of[-1,1]){box(x+side*.95,.48,-7.1,.48,.075,.48,'b5a07c','wood');box(x+side*1.15,.77,-7.1,.065,.60,.48,'b5a07c','wood');for(let dz of[-.16,.16])shape('cylinder',x+side*.95,.22,-7.1+dz,.02,.22,.02,'3e4e43');}}
box(-18,.53,-18.5,11,1,1.2,'ab9573','wood');box(-18,1.07,-18.5,11,.12,1.3,'d9cbb1');
for(let x=-45;x<=45;x+=15){shape('cylinder',x,2.35,-6.5,.055,2.35,.055,'35463b');box(x+.3,4.7,-6.5,.75,.08,.13,'465345');box(x+.62,4.66,-6.5,.58,.08,.29,'c9cdb1');}
// Public garden and fountain.
box(7,.06,7,10,.15,3.2,'d0c9b3','paving');shape('cylinder',7,.22,7,1.25,.18,1.25,'a5ad9a');shape('cylinder',7,.41,7,1.03,.04,1.03,'69969c');shape('cylinder',7,.78,7,.12,.40,.12,'bbc4b0');shape('cylinder',7,1.2,7,.48,.06,.48,'bbc4b0');
for(let x of[2,12]){for(let y of[.48,.87,1.03])box(x,y,7.6,2.2,.1,.17,'ad9170','wood');for(let dx of[-.85,.85])box(x+dx,.28,7.6,.09,.55,.48,'4b5748');}
// Parked vehicles; cylinders give tyres a curved silhouette.
for(let [i,x]of[-34,22,42].entries()){let z=3.7;box(x,.62,z,4.1,.64,1.7,['738078','4b6770','9b9e90'][i]);box(x-.2,1.12,z,2.12,.65,1.52,'53696d');box(x-.2,1.17,z+.77,1.75,.40,.025,'345762');box(x+.86,1.18,z,.04,.4,1.4,'385c68');for(let dx of[-1.3,1.3])for(let dz of[-.89,.89]){let name='wheel'+i+'_'+num(dx+2)+'_'+num(dz+1);name=name.replaceAll('.','x');lines.push(`${name} = shape(sphere, ${num(x+dx)}, 0.34, ${num(z+dz)}, 0.34, 0.34, 0.13, 0.12, 0.14, 0.12, -1)`);}for(let dz of[-.55,.55])box(x+2.07,.7,z+dz,.025,.17,.32,'d8d5b7');}
let seed=241;function rnd(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
// Airy foliage cards, reused geometry and a cutout BMP instead of solid cube crowns.
for(let x of[-43,-27,-3,17,34,48])for(let z of[8.4,-24]){shape('cylinder',x,1.7,z,.13,1.7,.13,'6c654d','wood');shape('foliage',x,0,z,1,1,1,'ffffff','leaf');}
// Human models are posed art assets in this design pass; no behavior simulation.
for(let [i,[x,z]]of[[-11,-7],[-27,-6.6],[3,-7],[16,6.8],[-5,7.4],[29,-6.5]].entries()){let name='resident'+i;lines.push(`${name} = shape(${i%2?'man':'woman'}, ${x}, 0.12, ${z}, 1, 1, 1, 1, 1, 1, ${i%2?'manSkin':'womanSkin'})`);lines.push(`scene3dSetTransform(${name}, ${x}, 0.12, ${z}, 1, 1, 1, ${num(i*.7)})`);}
lines.push(`
scene3dSetLightDir(-0.55, -0.8, -0.35)
uiOnClick("resetViewBtn", "resetView")
uiOnClick("overlookBtn", "overlook")
uiOnClick("panelBtn", "togglePanel")
uiOnClick("holdViewBtn", "holdView")
resetView()
display "Another World: native design preview ready"
uiRun()
`);
// Each VM chunk has an 8-bit constant pool. Keep authored placement groups small,
// rather than changing the bytecode format for a presentation-only pass.
const head=lines.shift(),footer=lines.pop(),bodies=[],calls=[],groups=[];let group=[];
for(let i=0;i<lines.length;i++){let unit=[lines[i]];const match=lines[i].match(/^(\w+) = (?:shape|box)/);if(match&&(lines[i+1]?.startsWith('scene3dSetTransform('+match[1]+',')||lines[i+1]?.startsWith('scene3dSetMaterial('+match[1]+',')))unit.push(lines[++i]);if(group.length+unit.length>12){groups.push(group);group=[];}group.push(...unit);}if(group.length)groups.push(group);
for(const [i,group]of groups.entries()){const name='place'+String(i).padStart(4,'0');bodies.push('[.task] '+name+'\n'+group.map(line=>'    '+line).join('\n'));calls.push(name+'()');}
if(calls.length+6>255)throw Error('Placement exceeds VM function-index limit');
await fs.writeFile('native-design/coral-lang/coral-bytecode/ashford.co',head+'\n'+bodies.join('\n\n')+'\n\n'+calls.join('\n')+'\n'+footer);console.log('Town design emitted:',lines.length,'placement lines in',calls.length,'small VM chunks');
