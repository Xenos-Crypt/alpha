const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../Builds/Web'),url=process.argv[2];
assert(url&&/^https:\/\//.test(url),'Pass the HTTPS deployment URL');
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
(async()=>{
 const home=await fetch(url,{signal:AbortSignal.timeout(60000)});assert.equal(home.status,200,'Deployment is unavailable or requires login');
 const html=await home.text();assert(html.includes('createUnityInstance')&&html.includes('City services'),'Deployment did not serve the current Unity player');
 const localHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const report={url,html:true,files:[]};
 for(const name of fs.readdirSync(path.join(root,'Build'))){
  if(!localHtml.includes(name))continue;
  assert(html.includes(name),'Published page references different build: '+name);
  const response=await fetch(new URL('Build/'+name,url.endsWith('/')?url:url+'/'),{signal:AbortSignal.timeout(120000)});
  assert.equal(response.status,200,'Missing build file: '+name);
  const bytes=Buffer.from(await response.arrayBuffer());let expected=fs.readFileSync(path.join(root,'Build',name));
  if(name.endsWith('.unityweb')){
   assert.match(response.headers.get('content-encoding')||'',/gzip|br/,'Missing compression header: '+name);expected=zlib.gunzipSync(expected);
   if(name.includes('.wasm.'))assert.match(response.headers.get('content-type')||'',/application\/wasm/);
   if(name.includes('.framework.js.'))assert.match(response.headers.get('content-type')||'',/javascript/);
  }
  assert.equal(hash(bytes),hash(expected),'Published asset differs from tested build: '+name);
  report.files.push({name,bytes:bytes.length,sha256:hash(bytes)});
 }
 assert(report.files.length>=4,'Deployment is missing hashed Web build files');
 fs.writeFileSync(path.resolve(__dirname,'../Logs/hosting-check.json'),JSON.stringify({...report,passed:true},null,2));
 console.log('PASS: public deployment serves the tested Unity build, correct compression and matching asset hashes');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
