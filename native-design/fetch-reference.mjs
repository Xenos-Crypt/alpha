import fs from 'node:fs/promises';
const dir='native-design/reference';await fs.mkdir(dir,{recursive:true});
const r=await fetch('https://store.steampowered.com/api/appdetails?appids=2406770');if(!r.ok)throw Error(r.status);const json=await r.json();const data=json['2406770'].data;if(!data?.screenshots)throw Error('No official screenshots');
await fs.writeFile(dir+'/sources.json',JSON.stringify(data.screenshots,null,2));
for(const [i,item]of data.screenshots.slice(0,6).entries()){const image=await fetch(item.path_full);if(!image.ok)throw Error(image.status);await fs.writeFile(`${dir}/bodycam-${i}.jpg`,Buffer.from(await image.arrayBuffer()));console.log(i,item.path_full);}
