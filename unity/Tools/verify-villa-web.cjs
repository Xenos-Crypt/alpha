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
  browser=await chromium.launch({executablePath:'C:/Users/WINDOWS11/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true,args:['--use-angle=d3d11','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  for(const mobile of [false,true]){
   const width=mobile?500:1100,height=mobile?800:760,prefix=mobile?'touch':'desktop';const reports=[],movementReports=[];
   const page=await browser.newPage({viewport:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});
   const touch=mobile?await page.context().newCDPSession(page):null;const tap=async(x,y)=>{await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,radiusX:3,radiusY:3,force:1}]});await page.waitForTimeout(350);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
   page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});page.on('console',message=>{const match=message.text().match(/HIDROK_POWERS:(\{[^\n]+\})/);if(match)reports.push(JSON.parse(match[1]));const movement=message.text().match(/HIDROK_MOVEMENT:(\{[^\n]+\})/);if(movement)movementReports.push(JSON.parse(movement[1]));if(message.type()==='error'&&!message.text().includes('favicon')){errors.push(message.text());console.error(message.text().slice(0,1200));}});
   await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.unityInstance&&!document.getElementById('loading'),null,{timeout:240000});
   await page.evaluate(()=>window.unityInstance.SendMessage('GameSettings','SetQuality','Low'));await page.locator('canvas').click();await page.waitForTimeout(1500);
   const state=async()=>{const before=reports.length;const deadline=Date.now()+60000;let retry=0;while(reports.length===before&&Date.now()<deadline){if(Date.now()>=retry){await page.evaluate(()=>window.unityInstance.SendMessage('Player','ReportPresentation'));retry=Date.now()+2000;}await page.waitForTimeout(100);}if(reports.length===before)await shot('missing-diagnostic');assert(reports.length>before,'Power diagnostics missing: '+errors.join('; '));return reports.at(-1);};
   const until=async(test,timeout=180000)=>{const deadline=Date.now()+timeout;let report;do{report=await state();if(test(report))return report;await page.waitForTimeout(100);}while(Date.now()<deadline);assert.fail(prefix+' power state timed out: '+JSON.stringify(report));};
   const shot=async name=>page.screenshot({path:path.join(logs,`web-${prefix}-${name}.png`),timeout:90000});
   const travel=async name=>{await until(r=>!r.Active&&!r.Phasing);await page.evaluate(name=>window.unityInstance.SendMessage('City services','TravelTo',name),name);await page.waitForTimeout(1500);};
   const select=async element=>{await until(r=>!r.Active);for(let i=0;i<4&&(await state()).Element!==element;i++){const old=(await state()).Element;if(mobile)await tap(55,height-153);else await page.keyboard.down('t');try{await until(r=>r.Element!==old,20000);}finally{if(!mobile)await page.keyboard.up('t');}}assert.equal((await state()).Element,element);};
   const ready=slot=>until(r=>!r.Active&&r.Cooldowns[slot]===0&&r.Energy>=15);
   const cast=async(slot,effect,name,visible)=>{
    await ready(slot);if(mobile){const size=Math.min(220,(width-28)/4);await tap(14+(slot+.5)*size-2,height-96);}else await page.keyboard.down(String(slot+1));
    try{await until(r=>r.Effect===effect&&(!visible||r[visible]),20000);await shot(name);}finally{if(!mobile)await page.keyboard.up(String(slot+1));}
    await until(r=>!r.Active);checks.push(prefix+': '+effect);
   };



   await travel('Hidrok Glass Villa');await until(r=>Math.abs(r.Position.x-25)<1&&Math.abs(r.Position.z-19.5)<1);await page.waitForTimeout(1200);await shot('villa-exterior-low');checks.push(prefix+': villa map destination and low-quality exterior');
   if(!mobile){
    await page.evaluate(()=>window.unityInstance.SendMessage('GameSettings','SetQuality','High'));await page.waitForTimeout(1800);await shot('villa-exterior-high');
    await travel('Ashford city centre');await page.keyboard.down('w');try{await until(r=>r.Position.z>=28.4,90000);}finally{await page.keyboard.up('w');}
    assert((await state()).Position.y>.7,'Villa floor was not reached via stairs');await page.keyboard.press('f',{delay:300});await page.waitForTimeout(800);await shot('villa-interior');await page.keyboard.press('f',{delay:300});checks.push('desktop: walked up steps into furnished villa');
    if(process.env.VERIFY_TRANSPORT==='1'){
     await travel('Ashford city centre');await page.keyboard.down('s');try{await until(r=>r.Position.z<=11,40000);}finally{await page.keyboard.up('s');}
     const movementState=async()=>{const before=movementReports.length;await page.evaluate(()=>window.unityInstance.SendMessage('Player','ReportMovement'));const deadline=Date.now()+20000;while(movementReports.length===before&&Date.now()<deadline)await page.waitForTimeout(100);assert(movementReports.length>before,'Movement diagnostics missing');return movementReports.at(-1);};
     await page.keyboard.down('g');try{const deadline=Date.now()+20000;while(!(await movementState()).Driving&&Date.now()<deadline)await page.waitForTimeout(100);}finally{await page.keyboard.up('g');}assert((await movementState()).Driving,'Cannot take the home hover vehicle');
     const start=(await movementState()).Position;await page.keyboard.down('w');try{await until(r=>Math.hypot(r.Position.x-start.x,r.Position.z-start.z)>2.5,30000);}finally{await page.keyboard.up('w');}assert((await movementState()).Driving,'Left the vehicle during the driving check');await page.keyboard.down('Space');try{await until(r=>r.Position.y>2,20000);}finally{await page.keyboard.up('Space');}await shot('hover-car-boarded');checks.push('desktop: boarded, drove and lifted the redesigned hover car');
    }
   }
   await page.close();
  }
  assert.deepEqual(errors,[],'Villa emitted browser errors');fs.writeFileSync(path.join(logs,'web-villa-check.json'),JSON.stringify({passed:true,checks,errors},null,2));console.log('PASS: desktop and touch glass villa rendering, map arrival and interior traversal');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
