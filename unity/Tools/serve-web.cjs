const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'../Builds/Web');
if(!fs.existsSync(path.join(root,'index.html')))throw new Error('Build the Unity Web player first');
const server=http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
 if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)||pathname.split('/').some(p=>p.startsWith('.'))){res.writeHead(403);res.end();return;}
 fs.stat(file,(err,stat)=>{
  if(err||!stat.isFile()){res.writeHead(404);res.end();return;}
  const type=file.endsWith('.framework.js.unityweb')||file.endsWith('.js')?'application/javascript':file.endsWith('.wasm.unityweb')?'application/wasm':file.endsWith('.html')?'text/html':'application/octet-stream';
  const headers={'Content-Type':type,'Content-Length':stat.size};if(file.endsWith('.unityweb'))headers['Content-Encoding']='gzip';
  res.writeHead(200,headers);fs.createReadStream(file).pipe(res);
 });
});
server.listen(0,'127.0.0.1',()=>console.log(`Unity preview: http://127.0.0.1:${server.address().port}/`));
