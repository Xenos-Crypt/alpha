import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import * as THREE from 'three';
const source=fs.readFileSync('main.js','utf8');const rail={name:'Tram',g:new THREE.Group(),velocityX:8};let damage=0;
const ctx={THREE,transport:{services:[rail]},isRoadVehicle:v=>v.kind==='car',vehicleVelocity:v=>({x:0,z:v.speed}),damageVehicle(v,speed){damage+=speed;v.health-=speed;}};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function resolveRailCollision('),source.indexOf('// Manual/automatic transmission:')),ctx);
const car={kind:'car',group:new THREE.Group(),radius:1.8,speed:20,health:100,ai:{}};car.group.position.set(0,0,8);ctx.resolveRailCollision(car,new THREE.Vector3(0,0,-8));assert(car.health<100);assert.equal(car.speed,0);assert.equal(rail.collisionStop,3);assert.equal(car.ai.stopTimer,3);
const before=damage;car.group.position.set(0,10,0);ctx.resolveRailCollision(car,car.group.position.clone());assert.equal(damage,before);
car.group.position.set(0,0,0);car.bridgeFlight={};ctx.resolveRailCollision(car,car.group.position.clone());assert.equal(damage,before);
console.log('PASS: AI car swept tram collision, impact damage, rail emergency stop, height separation and airborne clearance');
