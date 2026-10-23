import fs from 'node:fs';
const file=process.argv[2],lines=fs.readFileSync(file,'utf8').trim().split(/\r?\n/),headers=lines[0].split(',');
const rows=lines.slice(1).map(line=>line.split(',')).filter(row=>row.length===headers.length&&Number.isFinite(Number(row[1]))).slice(30);
const columns=headers.map((name,i)=>{
 const values=rows.map(row=>Number(row[i])).filter(Number.isFinite).sort((a,b)=>a-b);
 return {name,mean:values.reduce((a,b)=>a+b,0)/values.length,median:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)]};
});
const summary={samples:rows.length,timing:columns.filter(c=>/^(FrameTime|GPUTime|GameThreadTime|RenderThreadTime|RHIThreadTime|GameThreadTime_CriticalPath|RenderThreadTime_CriticalPath)$/.test(c.name)),gpu:columns.filter(c=>/^GPU\//.test(c.name)).sort((a,b)=>b.mean-a.mean).slice(0,18),cpu:columns.filter(c=>/^Exclusive\/.*(GameThread|RenderThread|RHIThread)/.test(c.name)).sort((a,b)=>b.mean-a.mean).slice(0,18)};
fs.writeFileSync(file.replace(/\.csv$/,'.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
