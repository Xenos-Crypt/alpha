const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../Builds/Web'),logs=path.resolve(__dirname,'../Logs');
const types={'.html':'text/html','.js':'application/javascript','.wasm':'application/wasm','.data':'application/octet-stream','.unityweb':'application/octet-stream'};
(async()=>{
 assert(fs.existsSync(path.join(root,'index.html')),'Build the Web player first');
 for(const preset of ['Low','Medium','High'])assert.match(fs.readFileSync(path.resolve(__dirname,`../Assets/Resources/Quality/${preset}.asset`),'utf8'),/m_UpscalingFilter:\s*1\b/,'Web presets must use linear upscaling');
 const server=http.createServer((req,res)=>{
  if(new URL(req.url,'http://localhost').pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.stat(file,(err,stat)=>{
   if(err||!stat.isFile()){res.writeHead(404);res.end();return;}
   const contentType=file.endsWith('.framework.js.unityweb')?'application/javascript':file.endsWith('.wasm.unityweb')?'application/wasm':types[path.extname(file)]||'application/octet-stream';
   const headers={'Content-Type':contentType,'Content-Length':stat.size};if(file.endsWith('.unityweb'))headers['Content-Encoding']='gzip';
   res.writeHead(200,headers);fs.createReadStream(file).pipe(res);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser,page,loaded=false,productionVerified=false,portalVerified=false,swimmingVerified=false,powersVerified=false;const errors=[],messages=[],warnings=[],regions=[],industryReports=[],movementReports=[];
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Users/WINDOWS11/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  page=await browser.newPage({viewport:{width:1100,height:700}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{
   const movementMatch=m.text().match(/HIDROK_MOVEMENT:(\{[^\n]+\})/);if(movementMatch)movementReports.push(JSON.parse(movementMatch[1]));
   const value=m.text();const industryMatch=value.match(/HIDROK_INDUSTRY:(\{[^\n]+\})/);if(industryMatch)industryReports.push(JSON.parse(industryMatch[1]));if(value.startsWith("HIDROK_REGION:"))regions.push(value.trim());if(messages.length<200)messages.push(value);
   // URP eagerly constructs its optional FSR pass even with linear scaling selected above.
   if(m.type()!=='error'&&/^Shader 'Hidden\/Universal Render Pipeline\/Edge Adaptive Spatial Upsampling' is not supported/.test(value)){warnings.push(value);return;}
   if((m.type()==='error'||/ERROR: Shader|not supported on this GPU|Shader error|PostProcessing render passes will not execute/.test(value))&&!value.includes('favicon'))errors.push(value);
  });
  const clickGame=async(x,y)=>{await page.mouse.click(x,y,{delay:800});await page.waitForTimeout(800);};
  const industryState=async()=>{
   const before=industryReports.length;
   await page.evaluate(()=>window.unityInstance.SendMessage('City services','ReportIndustry'));
   const deadline=Date.now()+10000;while(industryReports.length===before&&Date.now()<deadline)await page.waitForTimeout(150);
   assert(industryReports.length>before,'Industry status was not reported');return industryReports.at(-1);
  };
  const waitIndustry=async(test)=>{const deadline=Date.now()+600000;let state;do{state=await industryState();if(test(state))return state;await page.waitForTimeout(1000);}while(Date.now()<deadline);assert.fail('Industry state did not reach expected result: '+JSON.stringify(state));};
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>(window.unityInstance&&!document.getElementById('loading'))||document.getElementById('error')?.textContent,null,{timeout:240000});
  const startupError=await page.evaluate(()=>document.getElementById('error')?.textContent||'');assert.equal(startupError,'');loaded=true;
  await page.locator('canvas').click();await page.waitForTimeout(8000);
  fs.mkdirSync(logs,{recursive:true});await page.screenshot({path:path.join(logs,'web-scene.png')});
  for(const preset of ['Low','Medium','High']){
   await page.evaluate(name=>window.unityInstance.SendMessage('GameSettings','SetQuality',name),preset);
   await page.waitForTimeout(2500);await page.screenshot({path:path.join(logs,`web-${preset.toLowerCase()}.png`)});
  }
  await page.evaluate(()=>window.unityInstance.SendMessage('GameSettings','SetQuality','Low'));
  for(const [name,file] of [['Riverside city centre','riverside'],['Ashford Capital city centre','capital'],['Northhaven city centre','northhaven'],['Poison Land city centre','poison-land'],['Driftwood Island','driftwood'],['Ashford Regional Airport','airport'],['Hidrok Climate Control','hidrok-climate'],['Hidrok Hoverworks','hoverworks'],['Saucer Engineering and Hangar','hangar'],['Hidrok Wildlife Park','wildlife'],['Ashford Beach','beach'],['Ashford Maglev Station','maglev'],['Helicopter pad 1','helicopter-pad'],['VTOL plane pad 1','plane-pad']]){
   await page.evaluate(place=>window.unityInstance.SendMessage('City services','TravelTo',place),name);
   await page.waitForTimeout(2000);await page.screenshot({path:path.join(logs,`web-${file}.png`)});
   if(file==='hoverworks'){
    await page.keyboard.press('e',{delay:500});await page.waitForTimeout(1800);
    await clickGame(350,372);
    let state=await industryState();
    if(state.RunningJobs===0&&state.Stock[3]===0){await clickGame(350,372);state=await industryState();}
    assert(state.RunningJobs>0||state.Stock[3]>0,'Production button failed to start a job');
    assert.equal(state.Stock[1],56,'Production did not reserve energy');assert.equal(state.Stock[2],6,'Production did not reserve components');
    await page.screenshot({path:path.join(logs,'web-production-running.png')});
    await waitIndustry(state=>state.Stock[3]===1);await page.screenshot({path:path.join(logs,'web-production-output.png')});
    await clickGame(350,462);await waitIndustry(state=>state.Stock[3]===0&&state.OwnedVehicles>=1);
    productionVerified=true;await page.screenshot({path:path.join(logs,'web-production-delivery.png')});
    await clickGame(825,106);await page.waitForTimeout(400);
   }
  }
  await page.evaluate(()=>window.unityInstance.SendMessage('City services','TravelTo','Government teleport circle'));
  await page.waitForTimeout(1500);await page.screenshot({path:path.join(logs,'web-government-circle.png')});
  await page.keyboard.press('e',{delay:500});await page.waitForTimeout(1600);await clickGame(410,257);
  await page.waitForTimeout(2500);await page.screenshot({path:path.join(logs,'web-usa-arrival.png')});
  await page.evaluate(()=>window.unityInstance.SendMessage('City services','ReportRegion'));await page.waitForTimeout(500);assert.equal(regions.at(-1),'HIDROK_REGION:USA','Government portal did not reach USA in browser');
  await page.keyboard.press('m');await page.waitForTimeout(500);await page.screenshot({path:path.join(logs,'web-usa-map.png')});await page.keyboard.press('m');
  await page.keyboard.press('e',{delay:500});await page.waitForTimeout(1600);await clickGame(410,257);await page.waitForTimeout(1800);
  await page.screenshot({path:path.join(logs,'web-portal-return.png')});
  await page.evaluate(()=>window.unityInstance.SendMessage('City services','ReportRegion'));await page.waitForTimeout(500);assert.equal(regions.at(-1),'HIDROK_REGION:HIDROK','USA return portal failed in browser');portalVerified=true;
  await page.evaluate(()=>window.unityInstance.SendMessage('City services','TravelTo','Ashford Beach'));await page.waitForTimeout(1500);
  const movementState=async()=>{
   const before=movementReports.length;await page.evaluate(()=>window.unityInstance.SendMessage('Player','ReportMovement'));
   const deadline=Date.now()+15000;while(movementReports.length===before&&Date.now()<deadline)await page.waitForTimeout(200);
   assert(movementReports.length>before,'Movement status missing');return movementReports.at(-1);
  };
  await page.keyboard.down('w');let wet;const swimDeadline=Date.now()+240000;
  do{await page.waitForTimeout(1000);wet=await movementState();}while(!wet.Swimming&&Date.now()<swimDeadline);
  await page.keyboard.up('w');assert(wet.Swimming,'Could not walk from beach into water');const settleDeadline=Date.now()+60000;
  do{await page.waitForTimeout(1000);wet=await movementState();}while(wet.Position.y>=-.5&&Date.now()<settleDeadline);
  assert(wet.Position.y<-.5&&wet.Stamina<100,'Swimming waterline or stamina failed');swimmingVerified=true;await page.screenshot({path:path.join(logs,'web-swimming.png')});
  const oldElement=wet.Element;await page.keyboard.press('t',{delay:500});await page.waitForTimeout(1500);const changed=await movementState();
  assert.equal(changed.Element,(oldElement+1)%4,'Element switch failed');await page.keyboard.press('1',{delay:500});await page.waitForTimeout(1500);const cast=await movementState();
  assert(cast.Energy<changed.Energy,'Power did not spend energy');powersVerified=true;await page.screenshot({path:path.join(logs,'web-powers.png')});
  await page.evaluate(()=>window.unityInstance.SendMessage('City services','TravelTo','Ashford city centre'));await page.waitForTimeout(1500);
  await page.keyboard.press('m');await page.waitForTimeout(1800);await page.screenshot({path:path.join(logs,'web-city-map.png')});
  await page.keyboard.press('m');await page.waitForTimeout(500);
  await page.keyboard.down('w');await page.waitForTimeout(900);await page.keyboard.up('w');
  await page.waitForTimeout(1800);await page.screenshot({path:path.join(logs,'web-street-close.png')});
  await page.evaluate(()=>window.unityInstance.SendMessage('GameSettings','SetFrameCap',30));
  await page.keyboard.press('Escape');await page.waitForTimeout(1500);await page.screenshot({path:path.join(logs,'web-settings.png')});
  fs.writeFileSync(path.join(logs,'web-browser-check.json'),JSON.stringify({loaded:true,productionVerified,portalVerified,swimmingVerified,powersVerified,errors},null,2));
  assert.deepEqual([...new Set(errors)],[],'Web player emitted errors');console.log('PASS: Unity Web player loaded; scene and settings screenshots captured; no browser errors');
 }finally{fs.mkdirSync(logs,{recursive:true});fs.writeFileSync(path.join(logs,'web-browser-check.json'),JSON.stringify({loaded,productionVerified,portalVerified,swimmingVerified,powersVerified,errors,warnings,messages},null,2));if(page&&!loaded)await page.screenshot({path:path.join(logs,'web-failure.png')}).catch(()=>{});if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
