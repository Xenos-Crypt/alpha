const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../Builds/Web'),logs=path.resolve(__dirname,'../Logs');
(async()=>{
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const file=path.resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404);res.end();return;}const headers={'Content-Length':stat.size,'Content-Type':file.includes('.wasm.')?'application/wasm':/\.js(?:\.unityweb)?$/.test(file)?'application/javascript':file.endsWith('.html')?'text/html':'application/octet-stream'};if(file.endsWith('.unityweb'))headers['Content-Encoding']='gzip';res.writeHead(200,headers);fs.createReadStream(file).pipe(res);});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;const checks=[],errors=[];
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Users/WINDOWS11/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const mobile of [false,true]){
   const width=mobile?740:1100,height=mobile?900:700,prefix=mobile?'touch':'desktop';const reports=[];
   const page=await browser.newPage({viewport:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});
   page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{const match=message.text().match(/HIDROK_POWERS:(\{[^\n]+\})/);if(match)reports.push(JSON.parse(match[1]));if(message.type()==='error'&&!message.text().includes('favicon'))errors.push(message.text());});
   await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.unityInstance&&!document.getElementById('loading'),null,{timeout:240000});
   await page.evaluate(()=>window.unityInstance.SendMessage('GameSettings','SetQuality','Low'));await page.locator('canvas').click();await page.waitForTimeout(1500);
   const state=async()=>{const before=reports.length;await page.evaluate(()=>window.unityInstance.SendMessage('Player','ReportPresentation'));const deadline=Date.now()+15000;while(reports.length===before&&Date.now()<deadline)await page.waitForTimeout(100);assert(reports.length>before,'Power diagnostics missing');return reports.at(-1);};
   const until=async(test,timeout=180000)=>{const deadline=Date.now()+timeout;let report;do{report=await state();if(test(report))return report;await page.waitForTimeout(100);}while(Date.now()<deadline);assert.fail(prefix+' power state timed out: '+JSON.stringify(report));};
   const shot=async name=>page.screenshot({path:path.join(logs,`web-${prefix}-${name}.png`)});
   const travel=async name=>{await until(r=>!r.Active&&!r.Phasing);await page.evaluate(name=>window.unityInstance.SendMessage('City services','TravelTo',name),name);await page.waitForTimeout(1500);};
   const select=async element=>{await until(r=>!r.Active);for(let i=0;i<4&&(await state()).Element!==element;i++){const old=(await state()).Element;if(mobile)await page.touchscreen.tap(55,height-153);else await page.keyboard.down('t');try{await until(r=>r.Element!==old,20000);}finally{if(!mobile)await page.keyboard.up('t');}}assert.equal((await state()).Element,element);};
   const ready=slot=>until(r=>!r.Active&&r.Cooldowns[slot]===0&&r.Energy>=15);
   const cast=async(slot,effect,name,visible)=>{
    await ready(slot);if(mobile){const size=Math.min(220,(width-28)/4);await page.touchscreen.tap(14+(slot+.5)*size-2,height-96);}else await page.keyboard.down(String(slot+1));
    try{await until(r=>r.Effect===effect&&(!visible||r[visible]),20000);await shot(name);}finally{if(!mobile)await page.keyboard.up(String(slot+1));}
    await until(r=>!r.Active);checks.push(prefix+': '+effect);
   };
   if(!mobile){
    const population=await state();assert(population.Residents>350&&population.Children>50&&population.Flowers>1000&&population.Ducks===10&&population.Butterflies>=30);
    for(const [place,name] of [['Ashford city centre','residents'],['West duck pond','duck-pond'],['Ashford Beach','busy-beach']]){await travel(place);await shot(name);}checks.push('living neighbourhoods');
   }
   await travel('Elemental practice field');await select(0);await ready(3);
   if(mobile){const size=Math.min(220,(width-28)/4);await page.touchscreen.tap(14+3.5*size-2,height-96);}else await page.keyboard.press('4',{delay:500});
   await until(r=>r.Targeting,20000);
   const target={x:width*.55,y:height*.59};if(!mobile){await page.mouse.move(target.x,target.y);await page.waitForTimeout(300);await shot('meteor-target');await page.mouse.click(target.x,target.y,{delay:200});}else await page.touchscreen.tap(target.x,target.y);
   await until(r=>r.MeteorVisible,30000);await shot('falling-meteor');await until(r=>r.Craters>0&&!r.Active);await shot('meteor-crater');checks.push(prefix+': pointer/touch meteor and crater');
   if(!mobile){await travel('Elemental practice field');await cast(0,'Flame Dash','ankle-flames','AnkleFlames');await travel('Elemental practice field');await cast(1,'Rising Blaze','sword-uppercut','SwordVisible');}
   await select(2);await travel('Elemental practice field');await cast(0,'Water Dash','water-puddle','Phasing');assert(!(await state()).Phasing,'Water Dash did not expire');checks.push(prefix+': finite water phase');
   if(!mobile){
    await cast(1,'Geyser Burst','geyser');await cast(2,'Water Barrage','water-barrage');await cast(3,'Tsunami Slam','tsunami','WaveVisible');
    await select(3);await travel('Elemental practice field');await cast(0,'Bull Charge','bull-charge');await travel('Elemental practice field');await cast(1,'Stone Fist','stone-fists','StoneFists');
    await page.mouse.click(width*.5,height*.5,{delay:150});await cast(2,'Rock Barrage','rock-barrage');await cast(3,'Ground Pound','ground-pound');
    await select(1);await travel('Elemental practice field');await cast(0,'Gale Flight','gale-flight','Flying');await page.keyboard.down('Space');await page.waitForTimeout(600);await page.keyboard.up('Space');
    await cast(1,'Cyclone','cyclones','CycloneVisible');await cast(2,'Wind Blades','wind-blades','AirBladesVisible');await cast(3,'Sky Breaker','sky-breaker');assert((await state()).SlamImpact);
    await page.mouse.move(width*.5,height*.7);await page.mouse.down({button:'right'});await page.mouse.move(width*.5,height*.2,{steps:12});await page.waitForTimeout(500);await page.mouse.up({button:'right'});await shot('sky-breaker-impact');
   }
   await page.close();
  }
  assert.deepEqual(errors,[],'Power rework emitted browser errors');fs.writeFileSync(path.join(logs,'web-powers-check.json'),JSON.stringify({passed:true,checks,errors},null,2));console.log('PASS: desktop elemental effects, population and touch-targeted meteor / timed Water Dash');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
