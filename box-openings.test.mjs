import test from 'node:test';import assert from 'node:assert/strict';
import {subtractBoxHoles} from './box-openings.js';
test('door openings remove the wall volume while preserving the remaining facade',()=>{
 const b={min:[-5,0,-4],max:[5,3,4]},hole={min:[-1,0,-4.1],max:[1,2.1,-2.8]};
 const parts=subtractBoxHoles(b,[hole]);
 const volume=parts.reduce((s,p)=>s+p.max.reduce((v,n,i)=>v*(n-p.min[i]),1),0);
 assert.ok(Math.abs(volume-(240-2*2.1*1.2))<1e-9);
 for(const p of parts)assert.ok(p.min.some((n,i)=>n>=hole.max[i]||p.max[i]<=hole.min[i]));
 assert.deepEqual(subtractBoxHoles(b,[]),[b]);
});
