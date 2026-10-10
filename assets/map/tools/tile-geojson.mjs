// One-time preprocessing: splits a big Overpass Turbo GeoJSON export into a
// grid of small per-tile files, so the game can stream in only the tiles near
// the player instead of parsing/building the entire city on every page load.
//
// Usage: node assets/map/tools/tile-geojson.mjs <input.geojson> <outputDir> [tileSizeMeters]
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const [, , inputPath, outDir, tileSizeArg] = process.argv;
if (!inputPath || !outDir) {
  console.error('Usage: node tile-geojson.mjs <input.geojson> <outputDir> [tileSizeMeters]');
  process.exit(1);
}
const TILE_SIZE = Number(tileSizeArg) || 300;
const METERS_PER_DEG_LAT = 111320;

function coordRings(geometry) {
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'LineString') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  return [];
}

console.log('Reading', inputPath, '…');
const data = JSON.parse(readFileSync(inputPath, 'utf8'));
const features = data.features.filter(f => f.properties?.building || f.properties?.highway);

let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
for (const f of features) for (const ring of coordRings(f.geometry)) for (const [lon, lat] of ring) {
  if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon;
  if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
}
const centerLat = (minLat + maxLat) / 2, centerLon = (minLon + maxLon) / 2;
const metersPerDegLon = METERS_PER_DEG_LAT * Math.cos(centerLat * Math.PI / 180);
const project = (lon, lat) => [(lon - centerLon) * metersPerDegLon, (lat - centerLat) * METERS_PER_DEG_LAT];

const tiles = new Map(); // "tx_tz" -> features[]
for (const f of features) {
  const ring = coordRings(f.geometry)[0];
  if (!ring || !ring.length) continue;
  const [lon, lat] = ring[0]; // representative point: first coordinate is enough to bucket a feature
  const [x, z] = project(lon, lat);
  const tx = Math.floor(x / TILE_SIZE), tz = Math.floor(z / TILE_SIZE);
  const key = `${tx}_${tz}`;
  if (!tiles.has(key)) tiles.set(key, []);
  tiles.get(key).push(f);
}

mkdirSync(outDir, { recursive: true });
const manifest = { origin: { centerLon, centerLat }, tileSize: TILE_SIZE, tiles: [] };
for (const [key, feats] of tiles) {
  writeFileSync(join(outDir, `${key}.json`), JSON.stringify({ type: 'FeatureCollection', features: feats }));
  const [tx, tz] = key.split('_').map(Number);
  manifest.tiles.push({ tx, tz, buildings: feats.filter(f => f.properties.building).length, roads: feats.filter(f => f.properties.highway).length });
}
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest));

console.log(`Wrote ${tiles.size} tiles (${TILE_SIZE}m each) to ${outDir}`);
console.log(`Total: ${features.filter(f => f.properties.building).length} buildings, ${features.filter(f => f.properties.highway).length} roads`);
