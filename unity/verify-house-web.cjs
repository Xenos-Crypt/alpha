const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'Builds/Web'),logs=path.resolve(__dirname,'Logs');
(async()=>{
 const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.stat(file,(err,stat)=>{
   if(err||!stat.isFile()){res.writeHead(404);res.end();return;}
   const type=file.endsWith('.framework.js.unityweb')||file.endsWith('.js')?'application/javascript':file.endsWith('.wasm.unityweb')?'application/wasm':file.endsWith('.html')?'text/html':'application/octet-stream';
   const headers={'Content-Type':type,'Content-Length':stat.size};if(file.endsWith('.unityweb'))headers['Content-Encoding']='gzip';
   res.writeHead(200,headers);fs.createReadStream(file).pipe(res);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Users/WINDOWS11/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>(window.unityInstance&&!document.getElementById('loading'))||document.getElementById('error')?.textContent,null,{timeout:240000});
  const startupError=await page.evaluate(()=>document.getElementById('error')?.textContent||'');
  if(startupError){console.error('Startup error: '+startupError);process.exitCode=1;return;}
  await page.locator('canvas').click();await page.waitForTimeout(4000);
  await page.evaluate(()=>window.unityInstance.SendMessage('City services','TravelTo','Ashford city centre'));
  await page.waitForTimeout(3000);
  fs.mkdirSync(logs,{recursive:true});
  await page.screenshot({path:path.join(logs,'house-web-check.png')});
  console.log('Screenshot saved: Logs/house-web-check.png');
 } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(e=>{console.error(e);process.exitCode=1;});
