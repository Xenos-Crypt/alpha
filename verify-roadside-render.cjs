const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const esbuild=require('esbuild');
(async()=>{
 const source=fs.readFileSync('main.js','utf8')+`
 window.roadsideCheck=()=>{
 const distance=v=>Math.abs(v-Math.round(v/40)*40);
 const lamps=lampSpots.filter(p=>Math.abs(p.x)<160&&Math.abs(p.z)<160);
 const trees=scene.children.filter(m=>m.geometry===trunkGeo&&Math.abs(m.position.x)<160&&Math.abs(m.position.z)<160);
 const streetTrees=trees.filter(m=>!(distance(m.position.x)<.01&&distance(m.position.z)<.01));
 const savedPosition=player.position.clone();player.position.set(20,CURB,22);updateCamera(0);
 const roofHidesInside=!houseRoof.visible;player.position.copy(savedPosition);updateCamera(0);
 const entryPosition=new THREE.Vector3(20,CURB,10);
 let doorwayWalkable=true;for(let pz=10;pz<=22;pz+=.25){entryPosition.z=pz;collide(entryPosition,.35);if(Math.abs(entryPosition.x-20)>.01||Math.abs(entryPosition.z-pz)>.01)doorwayWalkable=false;}
 const result={lamps:lamps.length,trees:streetTrees.length,
 roofHidesInside,doorwayWalkable,
 homeWindows:homeDesign.windows.length,roofDetails:houseRoof.children.length,
 entranceClear:!insideCollider(new THREE.Vector3(20,CURB,17))&&!insideCollider(new THREE.Vector3(20,CURB,11)),
 pathBounds:[doorPath.position.z-doorPath.geometry.parameters.height/2,doorPath.position.z+doorPath.geometry.parameters.height/2],
 windowPanes:homeDesign.windows.every(w=>w.children.filter(c=>c.material.emissive.getHex()===0xffd58a).length===4),
 badLamps:lamps.filter(p=>distance(p.x)<10.8||distance(p.z)<10.8).map(p=>p.toArray()),
 badTrees:streetTrees.filter(m=>distance(m.position.x)<12.8||distance(m.position.z)<12.8).map(m=>m.position.toArray())};
 camera.position.set(3,9,-5);camera.lookAt(17,1,16);renderer.render(scene,camera);
 for(const el of document.body.children)if(el!==renderer.domElement)el.style.display='none';
 return result;
 };
 window.homeCloseup=()=>{camera.position.set(10.5,4.2,7);camera.lookAt(20,2.1,20);renderer.render(scene,camera);};`;
 const build=await esbuild.build({stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'main.js'},bundle:true,write:false,format:'esm',platform:'browser',external:['node:fs/promises','node:url'],loader:{'.wasm':'dataurl'},plugins:[{name:'addons',setup(b){b.onResolve({filter:/^three\/addons\//},a=>({path:path.join(process.cwd(),'node_modules/three/examples/jsm',a.path.slice('three/addons/'.length))}));}}]});
 const browser=await chromium.launch({executablePath:'C:/Users/WINDOWS11/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1000,height:650},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/dist/bundle.js',r=>r.fulfill({contentType:'text/javascript',body:build.outputFiles[0].text}));
 await page.goto('http://localhost:8080/',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>Boolean(window.roadsideCheck),{timeout:120000});
 await page.evaluate(()=>{window.requestAnimationFrame=()=>0;});
 await page.waitForTimeout(150);
 const result=await page.evaluate(()=>window.roadsideCheck());
 assert(result.lamps>200);assert(result.trees>10);
 assert.equal(result.homeWindows,6);assert(result.roofDetails>=8);assert(result.entranceClear);assert(result.windowPanes);assert.deepEqual(result.pathBounds,[8,17]);
 assert(result.roofHidesInside);assert(result.doorwayWalkable);
 assert.deepEqual(result.badLamps,[]);assert.deepEqual(result.badTrees,[]);assert.deepEqual(errors,[]);
 fs.mkdirSync('test-results',{recursive:true});
 await page.screenshot({path:'test-results/roadside-home.png'});
 await page.evaluate(()=>window.homeCloseup());
 await page.screenshot({path:'test-results/home-architecture.png'});
 fs.writeFileSync('test-results/roadside-render.json',JSON.stringify({result,errors},null,2));
 console.log('PASS',JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
