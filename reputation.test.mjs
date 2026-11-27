import test from 'node:test';
import assert from 'node:assert/strict';
import {createReputation,reputationStanding,citizenFaction} from './reputation.js';
test('neutral migration and exact reputation boundaries',()=>{
 const r=createReputation();assert.equal(r.score,0);
 for(const invalid of [undefined,null,NaN,Infinity,'1000',{}]){r.restore(invalid);assert.equal(r.score,0);}
 for(const [score,title] of [[-1000,'Demon'],[-999,'Unfavorable'],[-1,'Unfavorable'],[0,'Neutral'],[1,'Favorable'],[999,'Favorable'],[1000,'Saint']])assert.equal(reputationStanding(score).title,title);
 assert.equal(reputationStanding(-1,'yatan').relationship,'Friend');
 for(const n of [-1000,-500,-1,0,1,500,1000])assert.equal(reputationStanding(n).favor+reputationStanding(n,'yatan').favor,0);
});
test('actions clamp, reverse alignment and survive save roundtrip',()=>{
 const events=[],r=createReputation({onChange:e=>events.push(e)});
 r.restore(999);r.record('monster');assert.equal(r.score,1000);assert.equal(events[0].delta,1);
 r.record('theft');assert.equal(r.score,985);
 r.restore(-999);r.record('knockout');assert.equal(r.score,-1000);
 r.record('kindness');assert.equal(r.standing().title,'Unfavorable');
 const other=createReputation();other.restore(JSON.parse(JSON.stringify({reputation:r.snapshot()})).reputation);assert.equal(other.score,-999);
 other.restore(undefined);assert.equal(other.score,0);assert.equal(r.score,-999);
});
test('assault cooldown is per target; rewards require valid action amounts',()=>{
 let t=0;const r=createReputation({now:()=>t}),a={},b={};
 r.record('assault',a);r.record('assault',a);assert.equal(r.score,-10);
 r.record('assault',b);assert.equal(r.score,-20);t=30000;r.record('assault',a);assert.equal(r.score,-30);
 for(const n of [-20,NaN,Infinity,undefined])r.record('donation',null,n);
 r.record('unknown');r.record('toString');r.record('constructor');assert.equal(r.score,-30);r.record('donation',null,100);assert.equal(r.score,-25);
 assert.equal(citizenFaction({id:17}),'yatan');assert.equal(citizenFaction({id:17,faith:'other'}),'citizens');
});
