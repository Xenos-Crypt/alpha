const {chromium}=require('playwright');
const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
  fs.mkdirSync('test-results',{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader']});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.setDefaultTimeout(60000);
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(r.status()+' '+r.url())});
    page.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));
    page.on('console',m=>{if(m.type()==='error'&&/shader|webgl|THREE/i.test(m.text()))errors.push(m.text())});
    console.log('Loading town in Chrome…');
    await page.goto('http://localhost:8080/?test=1');
    await page.waitForFunction(()=>window.__world?.ready,{},{timeout:60000});
    await page.waitForTimeout(300);await page.screenshot({path:'test-results/town-intro.png'});
    await page.evaluate(()=>window.__world.setPlaying());await page.waitForTimeout(200);await page.screenshot({path:'test-results/town-street.png'});
    await page.evaluate(()=>{__world.player.x=-16;__world.player.z=-4.5;__world.player.yaw=0;__world.player.pitch=-.08});await page.waitForTimeout(200);await page.screenshot({path:'test-results/human-closeup.png'});await page.evaluate(()=>{__world.player.x=-11;__world.player.z=-3;__world.player.yaw=-.72;__world.player.pitch=-.035});
    console.log('Rendered street. Checking simulation and controls…');
    const initial=await page.evaluate(()=>({energy:__world.player.energy,frames:__world.stats.frames}));
    await page.evaluate(()=>__world.impulse());const effects=await page.evaluate(()=>({energy:__world.player.energy,afraid:__world.residents.filter(n=>n.fear>.3).length}));assert(effects.energy<initial.energy);assert(effects.afraid>0);
    await page.evaluate(()=>{__world.setTarget(__world.residents[2]);__world.talk()});assert(await page.locator('#dialog').isVisible());const before=await page.evaluate(()=>__world.residents[2].trust);await page.locator('[data-chat="kind"]').click();assert.equal(await page.evaluate(()=>__world.residents[2].trust),before+1);
    await page.evaluate(()=>__world.phone());assert(await page.locator('#phone').isVisible());await page.waitForTimeout(200);await page.screenshot({path:'test-results/selfie.png'});await page.evaluate(()=>__world.phone());
    await page.evaluate(()=>{document.exitPointerLock();__world.player.pitch=-1.3});await page.waitForTimeout(200);await page.screenshot({path:'test-results/player-body.png'});
    await page.locator('#pause').click();const time=await page.evaluate(()=>__world.elapsed);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>__world.elapsed),time);await page.locator('#pause').click();await page.evaluate(()=>document.exitPointerLock());
    await page.evaluate(()=>{__world.player.x=-20;__world.player.z=-12;__world.player.pitch=0;__world.player.yaw=0});await page.waitForTimeout(200);await page.screenshot({path:'test-results/cafe.png'});assert.equal(await page.evaluate(()=>__world.town.blocked(-20,-12)),false);assert.equal(await page.evaluate(()=>__world.town.blocked(-20,-9.5)),false);
    // Test the actual keyboard movement through the opening, with pointer capture.
    await page.evaluate(()=>{__world.player.x=-20;__world.player.z=-8;__world.player.yaw=0});await page.locator('#world').click({position:{x:640,y:650}});await page.waitForFunction(()=>document.pointerLockElement?.id==='world');await page.waitForTimeout(100);await page.keyboard.down('w');try{await page.waitForFunction(()=>__world.player.z < -8.25,{},{timeout:15000});}finally{await page.keyboard.up('w');}await page.keyboard.press('Escape');
    // Verify the same character supplies body and selfie; its head remains hidden in main view.
    assert.equal(await page.evaluate(()=>__world.town.playerModel.userData.hideHead.value),1);
    assert(await page.evaluate(()=>__world.residents.every(n=>n.model.userData.isHuman&&n.model.userData.actions.Walk&&n.model.userData.actions.Idle)));
    const stats=await page.evaluate(()=>({frames:__world.stats.frames,residents:__world.residents.length,drawCalls:__world.town.renderer.info.render.calls,triangles:__world.town.renderer.info.render.triangles,shadowMap:__world.town.renderer.shadowMap.enabled}));assert(stats.frames>initial.frames);assert.equal(stats.residents,12);assert(stats.shadowMap);assert.deepEqual(errors,[]);
    await page.setViewportSize({width:800,height:600});await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>__world.town.renderer.domElement.width),800);console.log(JSON.stringify({passed:true,checks:['WebGL render and asset loading','12 residents','power consequences','relationship update','3D selfie','hidden player head','pause','café entrance','keyboard movement','resize'],stats},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
