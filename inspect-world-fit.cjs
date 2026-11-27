const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{
 const {ROUTE}=await import('./intercity-rail.js');
 const {ROAD_LAYOUT}=await import('./junction-control.js');
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({serviceWorkers:'block'});
  page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.goto('http://localhost:8080/?debug',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>!!window.__aw?.diagnostics,null,{timeout:120000});
  const result=await page.evaluate(({route,tramZ})=>{
   const {buildings,civicBuildings,doors,planeBlocks}=__aw.diagnostics;
   const routes=[...route.slice(1).map((b,i)=>[route[i],b]),[[-236,155,0],[116,155,0]],[[11,tramZ,0],[599,tramZ,0]]];
   const hits=[];
   for(const b of civicBuildings){if(b.noDoor&&b.alive===false)continue;for(const [a,c] of routes){
    const width=a[2]>0?3.6:1.7;
    const dx=Math.min(b.maxX,Math.max(a[0],c[0])+(a[0]===c[0]?width:0))-Math.max(b.minX,Math.min(a[0],c[0])-(a[0]===c[0]?width:0));
    const dz=Math.min(b.maxZ,Math.max(a[1],c[1])+(a[1]===c[1]?width:0))-Math.max(b.minZ,Math.min(a[1],c[1])-(a[1]===c[1]?width:0));
    if(dx>.1&&dz>.1)hits.push({name:b.name,x:b.x,z:b.z,bounds:[b.minX,b.maxX,b.minZ,b.maxZ],route:[a,c]});
   }}
   return {railFootprintCandidates:hits,buildingSample:Object.keys(buildings[0]||{}),blockSample:planeBlocks.slice(0,2),doors:doors.doors.map(d=>({name:d.b.name,style:d.style,x:d.g.position.x,z:d.g.position.z}))};
  },{route:process.env.CANDIDATE_ROUTE?ROUTE.map(([x,z,y])=>[x===100?120:x,z===300?270:z,y]):ROUTE,tramZ:ROAD_LAYOUT.tramZ});
  fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/world-fit.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify({railCandidates:result.railFootprintCandidates,doorCount:result.doors.length}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
