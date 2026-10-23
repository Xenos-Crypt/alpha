// Fetch only selected CC0 assets and their published 1K glTF dependencies.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../SourceAssets');
const ids = ['modular_urban_apartments_facade', 'modular_factory_facade',
  'painted_wooden_bench', 'street_lamp_02', 'metal_trash_can',
  'water_manhole_cover', 'trashbag'];
async function request(url) {
  for (let retry=0;retry<3;retry++) {
    try {const response=await fetch(url);if(!response.ok)throw Error(`${response.status} ${url}`);return Buffer.from(await response.arrayBuffer());}
    catch(error){if(retry===2)throw error;}
  }
}
async function save(relative, file) {
  const target=path.resolve(root,relative);
  if(!target.startsWith(root+path.sep))throw Error('Invalid asset destination');
  let existing;try{existing=await fs.readFile(target);}catch{}
  const hash=bytes=>crypto.createHash('md5').update(bytes).digest('hex');
  if(existing && hash(existing)===file.md5)return;
  const bytes=await request(file.url);
  if(bytes.length!==file.size || hash(bytes)!==file.md5)throw Error('Asset integrity failure: '+relative);
  await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);
}
(async()=>{
  const credits=[];
  for(const id of ids){
    const files=JSON.parse(await request('https://api.polyhaven.com/files/'+id));
    const model=files.gltf['1k'].gltf;
    const entries=[[id+'/'+id+'_1k.gltf',model],...Object.entries(model.include).map(([name,file])=>[id+'/'+name,file])];
    for(let offset=0;offset<entries.length;offset+=4)await Promise.all(entries.slice(offset,offset+4).map(([name,file])=>save(name,file)));
    const credit={id,source:'https://polyhaven.com/a/'+id,license:'CC0',license_url:'https://polyhaven.com/license',
      resolution:'1k',files:entries.map(([name,file])=>({path:name,bytes:file.size,md5:file.md5,url:file.url}))};
    await fs.writeFile(path.join(root,id,'source.json'),JSON.stringify(credit,null,2));credits.push(credit);
    console.log(id+': '+entries.length+' files, '+(entries.reduce((s,[,f])=>s+f.size,0)/1048576).toFixed(1)+' MB');
  }
  await fs.writeFile(path.join(root,'CREDITS.json'),JSON.stringify(credits,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
