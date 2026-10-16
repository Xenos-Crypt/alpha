const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../Builds/Web');
if(!fs.existsSync(path.join(root,'index.html')))throw new Error('Build the Unity Web player first');
const link=path.resolve(__dirname,'../.vercel/project.json');
if(!fs.existsSync(link))throw new Error('Link unity to the dedicated hidrok-unity Vercel project first; do not use the original web game project');
fs.writeFileSync(path.join(root,'.vercelignore'),'*_BurstDebugInformation_DoNotShip\n*_BackUpThisFolder_ButDontShipItWithYourGame\n');
fs.mkdirSync(path.join(root,'.vercel'),{recursive:true});
fs.copyFileSync(link,path.join(root,'.vercel/project.json'));
const gzipHeaders=type=>[{key:'Content-Encoding',value:'gzip'},{key:'Content-Type',value:type},{key:'Cache-Control',value:'public, max-age=31536000, immutable'}];
fs.writeFileSync(path.join(root,'vercel.json'),JSON.stringify({framework:null,buildCommand:null,outputDirectory:'.',headers:[
 {source:'/Build/(.*).framework.js.unityweb',headers:gzipHeaders('application/javascript')},
 {source:'/Build/(.*).wasm.unityweb',headers:gzipHeaders('application/wasm')},
 {source:'/Build/(.*).data.unityweb',headers:gzipHeaders('application/octet-stream')}
]},null,2)+'\n');
console.log('Unity preview deployment files prepared:',root);
