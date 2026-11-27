const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
  const page=await browser.newPage({serviceWorkers:'block',reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.goto('http://localhost:8080/?debug',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>!!window.__aw?.diagnostics?.society,null,{timeout:120000});
  const result=await page.evaluate(()=>{
   const {reputation:r,society,peds}=__aw.diagnostics;
   let believer,ordinary;
   for(const e of peds){const c=society.converse(e);if(!c)continue;if(c.title.includes('Yatan believer'))believer??=e;else ordinary??=e;if(believer&&ordinary)break;}
   if(!believer||!ordinary)throw Error('Missing ordinary citizen or Yatan believer');
   const reactions={};
   for(const score of [-1000,-1,0,1,1000]){r.restore(score);reactions[score]={citizen:society.converse(ordinary).text,yatan:society.converse(believer).text};}
   r.restore(0);__aw.game.stats.gold=0;
   const coffee=society.converse(ordinary).choices.find(([label])=>label.startsWith('Buy them a coffee'))[1];
   coffee();const insufficient=r.score;
   __aw.game.stats.gold=10;coffee();const paid={score:r.score,gold:__aw.game.stats.gold};
   coffee();const repeated={score:r.score,gold:__aw.game.stats.gold};
   return {reactions,insufficient,paid,repeated};
  });
  assert.deepEqual(errors,[]);
  assert.match(result.reactions[-1].citizen,/reputation worries/);
  assert.match(result.reactions[-1].yatan,/Yatan sees you as a friend/);
  assert.match(result.reactions[-1000].yatan,/Demon/);
  assert.match(result.reactions[1000].citizen,/Saint/);
  assert.match(result.reactions[1].citizen,/good things/);
  assert.doesNotMatch(result.reactions[0].citizen,/reputation worries|good things|Saint/);
  assert.equal(result.insufficient,0);
  assert.deepEqual(result.paid,{score:1,gold:5});
  assert.deepEqual(result.repeated,result.paid);
  console.log('PASS: actual citizen/Yatan dialogue at all alignment boundaries; paid kindness, insufficient funds, and repeat cooldown');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
