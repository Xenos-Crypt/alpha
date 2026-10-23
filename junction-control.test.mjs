import assert from 'node:assert/strict';
import {createJunctionControl,ROAD_LAYOUT} from './junction-control.js';
let walkers=[],bikes=[],cars=[],trams=[];
const control=createJunctionControl({pedestrians:()=>walkers,cycles:()=>bikes,vehicles:()=>cars,trams:()=>trams});
const j=control.register(0,0,{tram:true});
const east={x:1,z:0},north={x:0,z:1};
assert.equal(control.limitTravel({x:-30,z:-4.6},east,50),15.9);
control.update(1.5);
assert.equal(control.state(j,'car','x'),'green');assert.equal(control.state(j,'car','z'),'red');
assert.equal(control.limitTravel({x:4.6,z:-30},north,100),15.9);
// Long frames cannot move a car beyond the red-light stop line.
assert.equal(control.limitTravel({x:4.6,z:-14.1},north,100),0);
walkers=[{position:{x:-12,z:10},target:{x:12,z:10}}];
bikes=[{position:{x:-14,z:-6.85},target:{x:40,z:-6.85}}];
trams=[{position:{x:-30,z:0},length:18,direction:1,doors:false}];
control.update(.1);assert.equal(j.mode,'clear');
cars=[{position:{x:0,z:4.6,y:0},length:4.4,speed:4}];
control.update(2);assert.equal(j.mode,'clear'); // Clear existing traffic before opening a crossing.
cars=[];control.update(.1);assert.equal(j.mode,'pedestrians');
for(const kind of ['car','bicycle','tram'])assert.equal(control.state(j,kind,'x'),'red');
assert(control.pedestrianMayCross({x:-10,z:10},{x:10,z:10}));
walkers=[];control.update(.1);assert.equal(j.mode,'clear');control.update(1.5);assert.equal(j.mode,'bicycles');
bikes=[];control.update(.1);control.update(1.5);assert.equal(j.mode,'tram');
assert.equal(control.state(j,'tram','x'),'green');assert.equal(control.state(j,'car','z'),'red');
assert.equal(control.limitTravel({x:4.6,z:-20},north,100),5.9);
walkers=[{position:{x:-12,z:10},target:{x:12,z:10}}];trams[0].position.x=0;
control.update(.1);control.update(3);assert.equal(j.mode,'clear'); // A tram body holds crossing clearance.
trams=[];control.update(.1);assert.equal(j.mode,'pedestrians');
walkers=[];control.update(10);control.update(1.5);
assert.equal(control.state(j,'car','x'),'red');
assert.equal(ROAD_LAYOUT.tramZ,0);assert(ROAD_LAYOUT.carLane-1.05>ROAD_LAYOUT.tramHalfWidth);
for(let i=0;i<200;i++){control.update(.2);assert(!(control.state(j,'car','x')==='green'&&control.state(j,'car','z')==='green'));}
console.log('PASS: coordinated phases, hard stop lines, pedestrian > bicycle > tram priority, occupied-junction clearance and separated lanes');
