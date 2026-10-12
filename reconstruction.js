import * as THREE from 'three';

export function createReconstruction(ctx) {
  const sites = new Map();
  function begin(building, currentDay) {
    if (sites.has(building)) return sites.get(building);
    const state = {
      building, deadline: currentDay + 3, ready: false, lastDays: null, debris: [], objects: [], barriers: [],
      meshes: building.meshes.map(mesh => ({ mesh, position: mesh.position.clone(), rotation: mesh.rotation.clone(), scale: mesh.scale.clone(), visible: mesh.visible })),
      cameraMeshes: building.meshes.filter(mesh => ctx.camBlockers.includes(mesh)),
    };
    sites.set(building, state);
    return state;
  }
  function secure(building) {
    const state = sites.get(building);
    if (!state || state.ready) return;
    state.ready = true;
    const margin = 1.2, w = building.w + margin * 2, d = building.d + margin * 2;
    const group = new THREE.Group(); ctx.scene.add(group); state.objects.push(group);
    const texture = ctx.makeTex(512, 64, g => {
      g.fillStyle = '#ffda24'; g.fillRect(0, 0, 512, 64);
      g.fillStyle = '#181818'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.fillText('CAUTION  �  CONSTRUCTION  �  KEEP OUT', 256, 40);
    });
    texture.wrapS = THREE.RepeatWrapping; texture.repeat.x = 2;
    const tapeMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    for (const [width, x, z, yaw] of [[w, building.x, building.z+d/2,0],[w,building.x,building.z-d/2,0],[d,building.x-w/2,building.z,Math.PI/2],[d,building.x+w/2,building.z,Math.PI/2]]) {
      const tape = new THREE.Mesh(new THREE.PlaneGeometry(width,.25),tapeMaterial); tape.position.set(x,ctx.groundY(x,z)+1.1,z); tape.rotation.y=yaw; group.add(tape);
      const barrier = yaw === 0 ? { minX:x-width/2,maxX:x+width/2,minZ:z-.15,maxZ:z+.15 } : { minX:x-.15,maxX:x+.15,minZ:z-width/2,maxZ:z+width/2 };
      ctx.colliders.push(barrier); state.barriers.push(barrier);
    }
    for (const dx of [-w/2,w/2]) for (const dz of [-d/2,d/2]) {
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,1.4,6),new THREE.MeshStandardMaterial({color:0x42454a}));pole.position.set(building.x+dx,ctx.groundY(building.x+dx,building.z+dz)+.7,building.z+dz);group.add(pole);
    }
    const officer=ctx.makeOfficer(); state.officer=officer;
    officer.root.position.set(building.x,ctx.groundY(building.x,building.z+d/2+8),building.z+d/2+8);
    state.objects.push(officer.root); state.officerTarget=new THREE.Vector3(building.x,officer.root.position.y,building.z+d/2+2);
    const helmet=new THREE.Mesh(new THREE.SphereGeometry(.29,12,8),new THREE.MeshStandardMaterial({color:0xffd42a}));helmet.scale.y=.55;helmet.position.set(0,2.05,0);officer.rig.add(helmet);
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;
    state.canvas=canvas;state.texture=new THREE.CanvasTexture(canvas);state.texture.colorSpace=THREE.SRGBColorSpace;
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(5,1.25),new THREE.MeshBasicMaterial({map:state.texture,side:THREE.DoubleSide}));
    sign.position.set(building.x,ctx.groundY(building.x,building.z+d/2)+2.7,building.z+d/2+.3);group.add(sign);
    ctx.toast('Construction officer dispatched. Site sealed: rebuilding in 3 in-game days.');
  }
  function finish(state) {
    const b=state.building;
    for (const barrier of state.barriers) { const i=ctx.colliders.indexOf(barrier);if(i>=0)ctx.colliders.splice(i,1); }
    for (const obj of [...state.debris,...state.objects]) ctx.dispose(obj);
    for (const snapshot of state.meshes) {
      snapshot.mesh.position.copy(snapshot.position);snapshot.mesh.rotation.copy(snapshot.rotation);snapshot.mesh.scale.copy(snapshot.scale);snapshot.mesh.visible=snapshot.visible;
    }
    if(b.collider&&!ctx.colliders.includes(b.collider))ctx.colliders.push(b.collider);
    for(const block of b.blocks||[])if(!ctx.planeBlocks.includes(block))ctx.planeBlocks.push(block);
    for(const mesh of state.cameraMeshes)if(!ctx.camBlockers.includes(mesh))ctx.camBlockers.push(mesh);
    for(const c of b.extraColliders||[])if(!ctx.colliders.includes(c))ctx.colliders.push(c);
    b.integrity=250;b.alive=true;sites.delete(b);ctx.toast('Construction complete. The building has been rebuilt.');
  }
  function update(currentDay, dt) {
    for(const state of sites.values()) {
      if(!state.ready)continue;
      const days=Math.max(0,Math.ceil(state.deadline-currentDay));
      if(days!==state.lastDays){
        const g=state.canvas.getContext('2d');g.fillStyle='#21252b';g.fillRect(0,0,768,192);g.fillStyle='#ffda24';g.textAlign='center';g.font='bold 34px sans-serif';g.fillText('BUILDING CLOSED � RECONSTRUCTION',384,62);g.fillStyle='#ffffff';g.font='bold 42px sans-serif';g.fillText(days+' IN-GAME DAY'+(days===1?'':'S')+' UNTIL REBUILT',384,128);state.texture.needsUpdate=true;state.lastDays=days;
      }
      const p=state.officer.root.position,distance=p.distanceTo(state.officerTarget);
      const moving=distance>.1;
      if(moving)p.lerp(state.officerTarget,Math.min(1,dt*1.6/distance));
      state.officer.root.rotation.y=Math.PI;ctx.animateOfficer(state.officer,moving,dt);
      if(currentDay>=state.deadline)finish(state);
    }
  }
  return { begin, secure, update, sites };
}
