const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../Builds/Web'),logs=path.resolve(__dirname,'../Logs');
(async()=>{
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const file=path.resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.stat(file,(error,stat)=>{
   if(error||!stat.isFile()){res.writeHead(404);res.end();return;}
   const headers={'Content-Length':stat.size,'Content-Type':file.includes('.wasm.')?'application/wasm':/\.js(?:\.unityweb)?$/.test(file)?'application/javascript':file.endsWith('.html')?'text/html':'application/octet-stream'};
   if(file.endsWith('.unityweb'))headers['Content-Encoding']='gzip';res.writeHead(200,headers);fs.createReadStream(file).pipe(res);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;const errors=[],reports=[];
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Users/WINDOWS11/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1100,height:700}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{const match=m.text().match(/HIDROK_BRIDGE:(\{[^\n]+\})/);if(match)reports.push(JSON.parse(match[1]));if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.unityInstance&&!document.getElementById('loading'),null,{timeout:240000});
  await page.evaluate(()=>window.unityInstance.SendMessage('GameSettings','SetQuality','Low'));
  await page.waitForTimeout(2000);
  await page.evaluate(()=>window.unityInstance.SendMessage('City services','TravelTo','Ashford lift bridge'));
  const deadline=Date.now()+300000;let report;
  do{
   const before=reports.length;await page.evaluate(()=>window.unityInstance.SendMessage('Ashford shipping lift bridge','ReportClearance'));
   const replyDeadline=Date.now()+15000;while(reports.length===before&&Date.now()<replyDeadline)await page.waitForTimeout(250);
   assert(reports.length>before,'Bridge did not report clearance');report=reports.at(-1);
   if(report.Height<.01&&!report.RoadClosed)break;await page.waitForTimeout(1000);
  }while(Date.now()<deadline);
  assert(report.Height<.01&&!report.RoadClosed,'Bridge did not lower for visual review');
  assert(report.DeckTop>report.WaterTop+.04,'Water still covers the lowered deck');
  await page.waitForTimeout(1500);await page.screenshot({path:path.join(logs,'web-bridge-lowered.png')});
  assert.deepEqual(errors,[],'Web bridge scene emitted errors');
  fs.writeFileSync(path.join(logs,'web-bridge-check.json'),JSON.stringify({passed:true,report,errors},null,2));
  console.log('PASS: lowered bridge road sits above water, public bridge viewpoint loaded, no browser errors');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
