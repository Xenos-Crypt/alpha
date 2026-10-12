import assert from 'node:assert/strict';import {roadsidePosition} from './roadside-placement.js';
for(const [x,z]of [[8,9],[32,32],[-7,-60],[127,807],[0,680],[640,240]]){const p=roadsidePosition(x,z);assert(Math.abs(p.x-Math.round(p.x/40)*40)>=9.5);assert(Math.abs(p.z-Math.round(p.z/40)*40)>=9.5);}
assert.deepEqual(roadsidePosition(-420,740),{x:-420,z:740});assert.deepEqual(roadsidePosition(-70,545),{x:-70,z:545});assert.deepEqual(roadsidePosition(14.5,25.5),{x:14.5,z:25.5});console.log('PASS: poles and trees clear city roads; gardens, forest and islands retain their positions');
