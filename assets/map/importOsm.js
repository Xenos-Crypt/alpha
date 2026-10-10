// Turns an OpenStreetMap GeoJSON export (buildings + roads, as produced by
// Overpass Turbo) into real Three.js geometry: building footprints become
// extruded 3D blocks, roads become flat ribbons following their real path.
//
// Projection: OSM coordinates are lon/lat (degrees). We convert to local
// flat meters using an equirectangular projection centered on the data's
// own bounding-box center. That's accurate enough at city-block scale
// (errors are centimeters per km at this latitude) without pulling in a
// full map-projection library.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const METERS_PER_DEG_LAT = 111320;

// origin is {centerLon, centerLat} — pass a fixed one (from the tile manifest) when
// building one tile of a larger city, so every tile projects into the same world
// space instead of each one re-centering on its own small bounding box.
function makeProjector(features, origin) {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const f of features) {
    for (const ring of coordRings(f.geometry)) {
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
      }
    }
  }
  const centerLat = origin?.centerLat ?? (minLat + maxLat) / 2;
  const centerLon = origin?.centerLon ?? (minLon + maxLon) / 2;
  const metersPerDegLon = METERS_PER_DEG_LAT * Math.cos(centerLat * Math.PI / 180);
  return {
    project(lon, lat) {
      return [(lon - centerLon) * metersPerDegLon, (lat - centerLat) * METERS_PER_DEG_LAT];
    },
    bounds: { minLon, maxLon, minLat, maxLat, centerLon, centerLat },
  };
}

function coordRings(geometry) {
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'LineString') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  return [];
}

function positiveMeasure(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!/^\d+(?:\.\d+)?\s*(?:m|metres|meters|ft|feet|')?$/i.test(text)) return null;
  const n = parseFloat(text) * (/ft|feet|'$/i.test(text) ? 0.3048 : 1);
  return n > 0 && n <= 500 ? n : null;
}
function estimateHeight(props) {
  const measured = positiveMeasure(props.height);
  if (measured) return measured;
  const levels = positiveMeasure(props['building:levels']);
  if (levels) return Math.min(500, levels * 3.2 + (positiveMeasure(props['roof:height']) || 0));
  // Missing survey data: stable approximations, never random on tile reload.
  if (['garage', 'garages', 'shed', 'hut', 'carport'].includes(props.building)) return 3.2;
  if (props.building === 'bungalow') return 4.5;
  if (['apartments', 'commercial', 'office', 'hotel'].includes(props.building)) return 16;
  return 9.6;
}
const MATERIAL_COLOURS = { brick: '#9c6653', stone: '#b8ad97', sandstone: '#b8ad97', limestone: '#d1c9b5', concrete: '#a8a7a1', plaster: '#ddd6c8', wood: '#89705a', timber: '#89705a', glass: '#819ba4', metal: '#879298', slate: '#50565e', tiles: '#92644e', roof_tiles: '#92644e', asphalt: '#55565a' };
function recordedColour(colour, material, fallback) {
  const value = typeof colour === 'string' ? colour.trim().toLowerCase() : '';
  if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value) || Object.hasOwn(THREE.Color.NAMES, value)) return new THREE.Color(value);
  return new THREE.Color(MATERIAL_COLOURS[String(material || '').toLowerCase()] || fallback);
}

const ROAD_WIDTH = { motorway: 10, trunk: 9, primary: 8, secondary: 7, tertiary: 6, residential: 5.5, service: 3.5, footway: 1.8, path: 1.2 };

// Real-world amenity tags (from the same OSM data) worth making enterable and
// visually distinct — civic/public buildings a player would actually look for.
const CIVIC_AMENITIES = {
  police: 'Police station', courthouse: 'Courthouse', hospital: 'Hospital', clinic: 'Clinic', doctors: "Doctor's surgery",
  townhall: 'Town hall', library: 'Library', school: 'School', university: 'University', fire_station: 'Fire station',
  community_centre: 'Community centre', job_centre: 'Job centre', post_office: 'Post office', bank: 'Bank',
};
const CIVIC_COLOR = 0xffd166;
const BUILDING_TYPE_LABEL = {
  house: 'House', detached: 'House', semidetached_house: 'House', terrace: 'Terraced house', bungalow: 'Bungalow',
  residential: 'House', apartments: 'Apartment block', dormitory: 'Dormitory', student_accommodation: 'Student flat',
  retail: 'Shop', commercial: 'Office', office: 'Office', hotel: 'Hotel', industrial: 'Industrial unit', warehouse: 'Warehouse',
  garage: 'Garage', garages: 'Garages', shed: 'Shed', hut: 'Hut', carport: 'Carport', greenhouse: 'Greenhouse',
  church: 'Church', yes: 'Building',
};

/**
 * @param {object} geojson - parsed Overpass Turbo export (buildings tagged `building`, roads tagged `highway`)
 * @returns {{group: THREE.Group, bounds: object, buildingCount: number, roadCount: number, buildingColliders: Array}}
 *
 * Performance: everything is merged into exactly ONE mesh for buildings and ONE
 * for roads, instead of one mesh per feature. A real city area is thousands of
 * features — one draw call (and one shadow-caster) per feature was enough to
 * choke a browser on a sample of under 1,500 buildings. Per-building AABBs for
 * collision are computed before merging, since the merged mesh itself can't be
 * split back into per-building boxes afterward.
 */
export function buildCityFromGeoJSON(geojson, origin) {
  const features = geojson.features.flatMap(f => f.properties?.building && f.geometry?.type === 'MultiPolygon'
    ? f.geometry.coordinates.map((coordinates, i) => ({ ...f, id: String(f.id || f.properties['@id'] || 'building') + ':' + i, geometry: { type: 'Polygon', coordinates } })) : [f]);
  const { project, bounds } = makeProjector(features, origin);
  const group = new THREE.Group();
  group.name = 'osm-city';

  const buildingMat = new THREE.MeshStandardMaterial({ color: 0xb9b2a3, roughness: 0.9, metalness: 0.02, vertexColors: true });
  // DoubleSide because the ribbon triangle winding faces downward (normals point -Y);
  // this renders correctly from above instead of being backface-culled.
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 1, side: THREE.DoubleSide });

  const buildingGeos = [], roadGeos = [], buildingColliders = [], civicBuildings = [];
  const box3 = new THREE.Box3();
  const civicMarkerGeo = new THREE.ConeGeometry(1.5, 4, 6);
  const civicMarkerMat = new THREE.MeshStandardMaterial({ color: CIVIC_COLOR, emissive: CIVIC_COLOR, emissiveIntensity: 0.6 });

  let vertexOffset = 0;
  for (const f of features) {
    const props = f.properties || {};
    if (props.building && f.geometry.type === 'Polygon') {
      const ring = f.geometry.coordinates[0];
      if (ring.length < 4) continue; // not a real closed polygon
      const pts = ring.slice(0, -1).map(([lon, lat]) => project(lon, lat));
      // Shape.y is negated here because rotateX(-90deg) below maps local Y to world -Z;
      // negating up front cancels that out so building footprints land exactly where
      // the (unrotated) road ribbons expect them, instead of mirrored across Z.
      const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
      for (const hole of f.geometry.coordinates.slice(1)) {
        if (hole.length >= 4) shape.holes.push(new THREE.Path(hole.slice(0, -1).map(([lon, lat]) => { const [x, z] = project(lon, lat); return new THREE.Vector2(x, -z); })));
      }
      const height = estimateHeight(props);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2); // extrude along Y (up), shape was authored in XZ
      // Tagged pitched roofs: raise the roof surface within the actual footprint.
      const roofShape = props['roof:shape'];
      if (roofShape === 'skillion') {
        const positions = geo.getAttribute('position');
        box3.setFromBufferAttribute(positions);
        const w = box3.max.x - box3.min.x, d = box3.max.z - box3.min.z;
        const roofHeight = Math.min(height * 0.45, positiveMeasure(props['roof:height']) || Math.min(w, d) * 0.25);
        const eaves = height - roofHeight;
        const alongX = props['roof:orientation'] === 'across' ? w >= d : w < d;
        for (let i = 0; i < positions.count; i++) {
          if (positions.getY(i) < height - 0.001) continue;
          const u = (positions.getX(i) - box3.min.x) / (w || 1), v = (positions.getZ(i) - box3.min.z) / (d || 1);
          // Skillion is exactly representable on the footprint; pitched profiles
          // require ridge vertices, so only apply to topologically suitable roofs.
          if (roofShape === 'skillion') positions.setY(i, eaves + roofHeight * (alongX ? u : v));
        }
        geo.computeVertexNormals();
      }
      geo.deleteAttribute('uv');
      box3.setFromBufferAttribute(geo.getAttribute('position'));
      buildingColliders.push({ minX: box3.min.x, maxX: box3.max.x, minZ: box3.min.z, maxZ: box3.max.z });
      const vertexCount = geo.getAttribute('position').count;
      const wall = recordedColour(props['building:colour'], props['building:material'], '#b9b2a3');
      const roof = recordedColour(props['roof:colour'], props['roof:material'], '#62666b');
      const normals = geo.getAttribute('normal');
      const colorAttr = new Float32Array(vertexCount * 3);
      for (let vi = 0; vi < vertexCount; vi++) { const c = normals.getY(vi) > 0.5 ? roof : wall; colorAttr[vi * 3] = c.r / buildingMat.color.r; colorAttr[vi * 3 + 1] = c.g / buildingMat.color.g; colorAttr[vi * 3 + 2] = c.b / buildingMat.color.b; }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colorAttr, 3));
      const colorStart = vertexOffset; vertexOffset += vertexCount;
      buildingGeos.push(geo);

      // Every building is enterable now, not just the curated civic ones — "doors to
      // every building." Only genuinely civic buildings get the glowing marker, so
      // the city of 50k+ buildings doesn't end up covered in cones.
      const civicLabel = CIVIC_AMENITIES[props.amenity];
      const genericLabel = BUILDING_TYPE_LABEL[props.building] || 'Building';
      const cx = (box3.min.x + box3.max.x) / 2, cz = (box3.min.z + box3.max.z) / 2;
      if (civicLabel) {
        const marker = new THREE.Mesh(civicMarkerGeo, civicMarkerMat);
        marker.position.set(cx, box3.max.y + 2.5, cz);
        group.add(marker);
      }
      civicBuildings.push({
        type: props.amenity || props.building || 'building', label: civicLabel || genericLabel,
        name: props.name || civicLabel || genericLabel, civic: !!civicLabel,
        x: cx, z: cz, id: String(f.id || props['@id'] || (props.amenity || props.building || 'b') + ':' + cx.toFixed(2) + ':' + cz.toFixed(2)),
        colorStart, vertexCount, height, realWorld: true,
        // The centroid can be well inside the building's own solid walls for
        // anything bigger than a small house — storing the footprint bounds lets
        // the "press E to enter" check measure distance to the nearest *edge*
        // instead, which is actually reachable from outside.
        minX: box3.min.x, maxX: box3.max.x, minZ: box3.min.z, maxZ: box3.max.z,
      });
    } else if (props.highway && f.geometry.type === 'LineString') {
      const pts = f.geometry.coordinates.map(([lon, lat]) => project(lon, lat));
      if (pts.length < 2) continue;
      const width = ROAD_WIDTH[props.highway] ?? 4;
      const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0.02, z)));
      const divisions = Math.max(2, pts.length * 2);
      const samples = curve.getPoints(divisions);
      const positions = [];
      for (let i = 0; i < samples.length - 1; i++) {
        const a = samples[i], b = samples[i + 1];
        const dir = new THREE.Vector3().subVectors(b, a).normalize();
        const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width / 2);
        const a1 = a.clone().add(perp), a2 = a.clone().sub(perp);
        const b1 = b.clone().add(perp), b2 = b.clone().sub(perp);
        positions.push(a1.x, a1.y, a1.z, a2.x, a2.y, a2.z, b1.x, b1.y, b1.z);
        positions.push(a2.x, a2.y, a2.z, b2.x, b2.y, b2.z, b1.x, b1.y, b1.z);
      }
      const ribbon = new THREE.BufferGeometry();
      ribbon.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      roadGeos.push(ribbon);
    }
  }

  if (roadGeos.length) {
    const merged = mergeGeometries(roadGeos, false);
    merged.computeVertexNormals();
    const roadMesh = new THREE.Mesh(merged, roadMat);
    roadMesh.receiveShadow = true;
    roadMesh.name = 'roads';
    group.add(roadMesh);
  }
  if (buildingGeos.length) {
    const merged = mergeGeometries(buildingGeos, false);
    merged.computeVertexNormals();
    const buildingMesh = new THREE.Mesh(merged, buildingMat);
    buildingMesh.castShadow = true; buildingMesh.receiveShadow = true;
    buildingMesh.name = 'buildings';
    group.add(buildingMesh);
  }

  return { group, bounds, buildingCount: buildingGeos.length, roadCount: roadGeos.length, buildingColliders, civicBuildings };
}
