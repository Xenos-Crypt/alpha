const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/WINDOWS11/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
 try{
  const page=await browser.newPage();
  await page.goto(process.argv[2]||'https://chatgpt.com/s/m_6ada4b2b0a6c8191b1bbd8adcfe8c8b9',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(12000);
  console.log('TITLE',await page.title());
  const reference=await page.locator('img').evaluateAll(images=>images.map(img=>({alt:img.alt,src:img.currentSrc||img.src,width:img.naturalWidth,height:img.naturalHeight})).filter(img=>img.width>=256&&img.height>=256).sort((a,b)=>b.width*b.height-a.width*a.height)[0]);
  if(!reference){
   console.log('PAGE', (await page.locator('body').innerText()).slice(0,700));
   throw new Error('Reference image missing from shared page');
  }
  const response=await page.request.get(reference.src);if(!response.ok())throw new Error('Image download failed: '+response.status());
  fs.mkdirSync('unreal/References',{recursive:true});fs.writeFileSync('unreal/References/'+(process.argv[3]||'Aurora-X9')+'.png',await response.body());
  console.log('SAVED',reference.alt,reference.width,reference.height);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
