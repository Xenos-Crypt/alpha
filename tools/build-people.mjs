// Builds the game's people from Quaternius's CC0 packs (Universal Base Characters + Universal Animation
// Library 1 and 2): geometry and skeletons only (materials are made in people.js so skin, clothes and hair
// can be coloured per person), small WebP skin textures, and the animation clips the residents use.
//
// Run once, from the repo root, after downloading and unzipping the packs:
//   npm i --no-save @gltf-transform/core @gltf-transform/functions @gltf-transform/extensions meshoptimizer sharp
//   node tools/build-people.mjs <folder with the .gltf/.png files> <UAL1_Standard.glb> <UAL2_Standard.glb>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, resample, quantize, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const [src, ual1, ual2] = process.argv.slice(2);
const out = 'assets/people';
await fs.mkdir(out, { recursive: true });
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const squeeze = meshopt({ encoder: MeshoptEncoder, level: 'medium' });

// geometry only: the shader in people.js adds skin, clothes and hair colour
async function shape(file, name) {
  const doc = await io.read(path.join(src, file));
  for (const t of doc.getRoot().listTextures()) t.dispose();
  for (const a of doc.getRoot().listAnimations()) a.dispose();
  for (const m of doc.getRoot().listMaterials()) { m.setBaseColorTexture(null); m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); }
  await doc.transform(weld(), dedup(), prune(), squeeze);
  await io.write(path.join(out, name + '.glb'), doc);
}
await shape('Superhero_Male_FullBody.gltf', 'body-m');
await shape('Superhero_Female_FullBody.gltf', 'body-f');
for (const h of ['Hair_Long', 'Hair_Buns', 'Hair_Buzzed', 'Hair_BuzzedFemale', 'Hair_SimpleParted', 'Hair_Beard']) await shape(h + '.gltf', h.toLowerCase().replace('_', '-'));

// skin: light and dark versions of each body (people.js blends between them for every shade in between)
const tex = async (file, name, size) => sharp(path.join(src, file)).resize(size, size).webp({ quality: 82 }).toFile(path.join(out, name + '.webp'));
await tex('T_Superhero_Male_Ligh.png', 'skin-m-light', 1024);
await tex('T_Superhero_Male_Dark.png', 'skin-m-dark', 1024);
await tex('T_Superhero_Female_Light_BaseColor.png', 'skin-f-light', 1024);
await tex('T_Superhero_Female_Dark_BaseColor.png', 'skin-f-dark', 1024);
await tex('T_Superhero_Male_Normal.png', 'normal-m', 512);
await tex('T_Superhero_Female_Normal.png', 'normal-f', 512);
await tex('T_Hair_1_BaseColor.png', 'hair-1', 256);
await tex('T_Hair_2_BaseColor.png', 'hair-2', 256);
await tex('T_Eye_Brown.png', 'eye', 128);

// animations: only the clips the city uses, no meshes
async function clips(file, name, keep) {
  const doc = await io.read(file);
  const root = doc.getRoot();
  for (const a of root.listAnimations()) if (!keep.includes(a.getName())) { for (const c of a.listChannels()) c.dispose(); for (const x of a.listSamplers()) { x.dispose(); } a.dispose(); }
  for (const n of root.listNodes()) if (n.getMesh()) n.setMesh(null).setSkin(null);
  for (const m of root.listMeshes()) m.dispose();
  for (const t of root.listTextures()) t.dispose();
  // bones only rotate, except the pelvis (which carries the body's height); drop the rest
  for (const a of root.listAnimations()) for (const c of a.listChannels()) if (c.getTargetPath() === 'scale' || /_leaf/.test(c.getTargetNode()?.getName()) || (c.getTargetPath() === 'translation' && !['pelvis', 'root'].includes(c.getTargetNode()?.getName()))) { const x = c.getSampler(); c.dispose(); x?.dispose(); }
  await doc.transform(resample({ tolerance: 2e-4 }), prune({ keepLeaves: true }), quantize(), squeeze);
  await io.write(path.join(out, name + '.glb'), doc);
}
await clips(ual1, 'moves-1', ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Sitting_Idle_Loop', 'Sitting_Talking_Loop', 'Idle_Talking_Loop', 'Interact', 'Driving_Loop', 'Swim_Fwd_Loop']);
await clips(ual2, 'moves-2', ['Consume', 'Idle_FoldArms_Loop', 'Idle_TalkingPhone_Loop', 'Walk_Carry_Loop']);
for (const f of await fs.readdir(out)) console.log(f, (await fs.stat(path.join(out, f))).size);
