import fs from 'node:fs/promises';
let gen=await fs.readFile('native-design/make-town.mjs','utf8');gen="import {buildArchitecture} from './architecture.mjs';\n"+gen;
let start=gen.indexOf('for(const [i,x]of[-36');let end=gen.indexOf('// Furniture, tables',start);if(start<0||end<0)throw Error('Town anchors missing');gen=gen.slice(0,start)+'buildArchitecture({box,shape,lines,num,col});\n'+gen.slice(end);
start=gen.indexOf('for(let x of[-43,-27');end=gen.indexOf('// Human models',start);gen=gen.slice(0,start)+`for(let x of[-43,-27,-3,17,34,48])for(let z of[8.4,-24]){shape('cylinder',x,1.7,z,.13,1.7,.13,'6c654d','wood');shape('foliage',x,0,z,1,1,1,'ffffff','leaf');}\n`+gen.slice(end);
gen=gen.replace('plane = scene3dLoadMesh("assets/plane.obj")','plane = scene3dLoadMesh("assets/plane.obj")\nfoliage = scene3dLoadMesh("assets/foliage.obj")\nstairRail = scene3dLoadMesh("assets/stair-rail.obj")');
await fs.writeFile('native-design/make-town.mjs',gen);
