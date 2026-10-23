const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../SourceAssets');
const selections={
  modular_urban_apartments_facade:['wall_window_centered_large_01','window_centered_large_01',
    'wall_window_centered_small_01','window_centered_small_01','wall_door_centered_small_01',
    'door_centered_small_01','wall_standard_standard_01','cornice_standard_standard_01',
    'crown_standard_standard_01','base_standard_01','dado_standard_standard_01'],
  modular_factory_facade:['wall_window_centered_large_01','window_centered_large_01',
    'wall_door_centered_small_01','door_centered_small_01','wall_standard_standard_01',
    'cornice02_standard_standard_01','crown_standard_standard_01','base_standard_standard_01'],
  painted_wooden_bench:['painted_wooden_bench'],street_lamp_02:['street_lamp_02'],
  metal_trash_can:['metal_trash_can_rust'],water_manhole_cover:['water_manhole_cover_frame','water_manhole_cover'],trashbag:null
};
const report={};
for(const [id,names]of Object.entries(selections)){
  const g=JSON.parse(fs.readFileSync(path.join(root,id,id+'_1k.gltf')));
  const original=g.meshes,nodes=[],meshes=[];
  for(const node of g.nodes){
    if(node.mesh==null || names && !names.includes(node.name))continue;
    const mesh=structuredClone(original[node.mesh]);mesh.name=node.name;
    const i=meshes.length;meshes.push(mesh);
    // Strip the asset browser's presentation grid; retain each module's local mesh.
    nodes.push({name:node.name,mesh:i});
  }
  if(names && nodes.length!==names.length)throw Error('Missing selected module '+id);
  g.nodes=nodes;g.meshes=meshes;g.scenes=[{name:id,nodes:nodes.map((_,i)=>i)}];g.scene=0;
  fs.writeFileSync(path.join(root,id,'street-kit.gltf'),JSON.stringify(g));
  report[id]=nodes.map((node,i)=>({name:node.name,bounds:meshes[i].primitives.map(p=>({min:g.accessors[p.attributes.POSITION].min,max:g.accessors[p.attributes.POSITION].max}))}));
}
fs.writeFileSync(path.join(root,'selected-modules.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
