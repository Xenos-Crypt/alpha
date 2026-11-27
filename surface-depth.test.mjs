import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {separateSurfaceDepth} from './surface-depth.js';
test('ground stabilization preserves geometry and shared materials across repeated scans',()=>{
 const shared=new THREE.MeshStandardMaterial(),m=new THREE.Mesh(new THREE.BoxGeometry(2,.04,4),shared);
 m.position.set(10,.08,20);const before=m.position.clone(),vertices=m.geometry.attributes.position.array.slice();
 assert.equal(separateSurfaceDepth(m,8),true);assert.equal(separateSurfaceDepth(m,8),false);
 assert.deepEqual(m.position,before);assert.deepEqual(m.geometry.attributes.position.array,vertices);
 assert.equal(shared.polygonOffset,false);assert.equal(m.material.polygonOffset,true);assert.ok(m.material.polygonOffsetUnits<0);
});
