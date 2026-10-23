// Skip rebuilding an object's local matrix when its position, rotation and scale have not
// changed since the last rebuild.
//
// three.js rebuilds the matrix of every object on every frame (matrixAutoUpdate), then
// multiplies it into the world matrix. The world has ~50,000 objects and almost all of them
// (buildings, props, street furniture) never move, so most of that work is wasted.
//
// When nothing changed, the matrix it would compute is exactly the one it already has, so
// skipping is invisible: moving objects still update on the same frame, and the world matrix
// is still recomputed whenever a parent moves (three.js forces children in that case).
export function installMatrixCache(THREE) {
  const proto = THREE.Object3D.prototype;
  if (proto.updateMatrix.matrixCache) return;
  const rebuild = proto.updateMatrix;
  function updateMatrix() {
    const p = this.position, q = this.quaternion, s = this.scale, c = this._matrixCache;
    if (c !== undefined && c.px === p.x && c.py === p.y && c.pz === p.z
      && c.qx === q._x && c.qy === q._y && c.qz === q._z && c.qw === q._w
      && c.sx === s.x && c.sy === s.y && c.sz === s.z) return;
    rebuild.call(this);
    if (c === undefined) {
      this._matrixCache = { px: p.x, py: p.y, pz: p.z, qx: q._x, qy: q._y, qz: q._z, qw: q._w, sx: s.x, sy: s.y, sz: s.z };
    } else {
      c.px = p.x; c.py = p.y; c.pz = p.z;
      c.qx = q._x; c.qy = q._y; c.qz = q._z; c.qw = q._w;
      c.sx = s.x; c.sy = s.y; c.sz = s.z;
    }
  }
  updateMatrix.matrixCache = true;
  proto.updateMatrix = updateMatrix;
}

// Code that writes straight into `object.matrix` and then calls updateMatrix() would expect
// a rebuild; call this to force one.
export function invalidateMatrixCache(object) { object._matrixCache = undefined; }
