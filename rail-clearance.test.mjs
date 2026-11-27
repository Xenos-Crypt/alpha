import test from 'node:test';import assert from 'node:assert/strict';
import {ROUTE,STATIONS} from './intercity-rail.js';
test('rail viaduct clears the confirmed Ashford and Poison Land building blocks',()=>{
 const blocks=[{minX:90.5,maxX:98.5,minZ:130.5,maxZ:138.5},{minX:101.5,maxX:109.5,minZ:141.5,maxZ:149.5},{minX:607,maxX:633,minZ:289,maxZ:311}];
 for(let i=1;i<ROUTE.length;i++)for(const b of blocks){const a=ROUTE[i-1],c=ROUTE[i],vertical=a[0]===c[0];
  const ox=Math.min(b.maxX,Math.max(a[0],c[0])+(vertical?3.6:0))-Math.max(b.minX,Math.min(a[0],c[0])-(vertical?3.6:0));
  const oz=Math.min(b.maxZ,Math.max(a[1],c[1])+(vertical?0:3.6))-Math.max(b.minZ,Math.min(a[1],c[1])-(vertical?0:3.6));
  assert.ok(ox<=0||oz<=0,`segment ${i} crosses a building`);
 }
 for(const s of STATIONS)assert.ok(ROUTE.slice(1).some((b,i)=>{const a=ROUTE[i];return a[0]===s.x&&b[0]===s.x&&s.z>=Math.min(a[1],b[1])&&s.z<=Math.max(a[1],b[1]);}),`${s.name} is off the route`);
});
