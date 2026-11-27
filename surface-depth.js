// Separate coplanar ground overlays in the depth buffer, never by moving the
// world geometry during play. Clone shared materials so nearby walls stay intact.
export function separateSurfaceDepth(mesh, area) {
  if (mesh.userData.depthSeparated) return false;
  const clone = material => {
    const result = material.clone();result.polygonOffset = true;
    result.polygonOffsetFactor = -1;
    result.polygonOffsetUnits = -2 - Math.min(12, 64 / Math.sqrt(Math.max(.1, area)));
    return result;
  };
  mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clone) : clone(mesh.material);
  mesh.userData.depthSeparated = true;return true;
}
