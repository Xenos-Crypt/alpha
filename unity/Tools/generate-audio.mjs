import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const directory=fileURLToPath(new URL('../TempAudio/',import.meta.url));await fs.mkdir(directory,{recursive:true});
let seed=31337;const noise=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2147483648-1;};
for(const [name,seconds,sample]of [
 ['engine',2,t=>.12*Math.sin(t*Math.PI*2*66)+.05*Math.sin(t*Math.PI*2*132)+.025*Math.sin(t*Math.PI*2*198)],
 ['ambience',3,()=>noise()*.07],
 ['footstep',.16,t=>noise()*.2*Math.exp(-t*25)+.07*Math.sin(t*2*Math.PI*90)*Math.exp(-t*30)],
 ['siren',2,t=>.12*Math.sin(t*Math.PI*2*(Math.floor(t*2)%2?1080:720))]
]){
 const rate=22050,count=Math.floor(rate*seconds),buffer=Buffer.alloc(44+count*2);
 buffer.write('RIFF',0);buffer.writeUInt32LE(36+count*2,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(count*2,40);
 for(let i=0;i<count;i++)buffer.writeInt16LE(Math.round(Math.max(-1,Math.min(1,sample(i/rate)))*32767),44+i*2);
 await fs.writeFile(directory+name+'.wav',buffer);
}
console.log('Generated original audio sources in unity/TempAudio');
