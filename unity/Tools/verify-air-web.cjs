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
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Users/WINDOWS11/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true,args:['--use-angle=d3d11','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  for(const mobile of [false,true]){
   const width=mobile?500:900,height=mobile?800:600,prefix=mobile?'touch':'desktop';const reports=[];
   const page=await browser.newPage({viewport:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});
   page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});page.on('console',message=>{const match=message.text().match(/HIDROK_POWERS:(\{[^\n]+\})/);if(match)reports.push(JSON.parse(match[1]));if(message.type()==='error'&&!message.text().includes('favicon')){errors.push(message.text());console.error(message.text().slice(0,1200));}});
   await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.unityInstance&&!document.getElementById('loading'),null,{timeout:240000});
   await page.evaluate(()=>window.unityInstance.SendMessage('GameSettings','SetQuality','Low'));await page.locator('canvas').click();await page.waitForTimeout(1500);
   const state=async()=>{const before=reports.length;const deadline=Date.now()+60000;let retry=0;while(reports.length===before&&Date.now()<deadline){if(Date.now()>=retry){await page.evaluate(()=>window.unityInstance.SendMessage('Player','ReportPresentation'));retry=Date.now()+2000;}await page.waitForTimeout(100);}if(reports.length===before)await shot('missing-diagnostic');assert(reports.length>before,'Power diagnostics missing: '+errors.join('; '));return reports.at(-1);};
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


   await travel('Elemental practice field');await select(1);
   const press=async(slot)=>{await ready(slot);if(mobile){const size=Math.min(220,(width-28)/4);await page.touchscreen.tap(14+(slot+.5)*size-2,height-96);}else{await page.keyboard.down(String(slot+1));await page.waitForTimeout(500);await page.keyboard.up(String(slot+1));}};
   await press(0);await until(r=>r.Flying);await shot('air-flight-trails');
   if(!mobile){const y=(await state()).Position.y;await page.keyboard.down('Space');try{await until(r=>r.Position.y>y+3,30000);}finally{await page.keyboard.up('Space');}}
   await until(r=>!r.Flying);await shot('air-landing');await until(r=>!r.AirLanding&&r.Position.y<.6);checks.push(prefix+': finite flight and controlled landing');
   await travel('Elemental practice field');
   if(!mobile){await page.keyboard.down('w');try{await until(r=>r.Position.z>=139,60000);}finally{await page.keyboard.up('w');}await page.keyboard.down('a');try{await until(r=>r.Position.x<=-824,30000);}finally{await page.keyboard.up('a');}}
   await press(1);await until(r=>r.CycloneVisible&&(mobile||r.LiftedTargets>0),30000);await shot('air-cyclone');await until(r=>!r.Active&&!r.CycloneVisible);await until(r=>r.LiftedTargets===0);checks.push(prefix+': cyclone formation and release');
   await travel('Elemental practice field');await press(2);await until(r=>r.AirBladesVisible,20000);await shot('air-ranged-blades');await until(r=>!r.Active&&!r.AirBladesVisible);checks.push(prefix+': ranged wind crescents');
   await press(3);await until(r=>r.Active&&r.Position.y>3,20000);await shot('air-aerial-slam');await until(r=>r.SlamImpact&&!r.Active);await shot('air-slam-impact');checks.push(prefix+': aerial ground slam');
   await until(r=>r.Ultimate>=100,240000);console.log(prefix+': ultimate charged');
   if(mobile)await page.touchscreen.tap(150,height-153);else{await page.keyboard.down('r');await page.waitForTimeout(500);await page.keyboard.up('r');}
   await until(r=>r.SkyDominion,20000);await shot('sky-dominion');await press(0);await until(r=>r.Flying&&r.SkyDominion);await shot('sky-dominion-flight');await until(r=>!r.SkyDominion,60000);checks.push(prefix+': Sky Dominion awakening and expiry');
   await page.close();
  }
  assert.deepEqual(errors,[],'Air rework emitted browser errors');fs.writeFileSync(path.join(logs,'web-air-check.json'),JSON.stringify({passed:true,checks,errors},null,2));console.log('PASS: desktop and touch Air flight/landing, cyclone, ranged blades, aerial slam and Sky Dominion');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
