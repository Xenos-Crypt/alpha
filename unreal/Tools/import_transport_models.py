import json
import os
import unreal

root=os.path.abspath(os.path.join(unreal.Paths.project_dir(),'..'))
folder=os.path.join(root,'SourceAssets/transport')
with open(os.path.join(folder,'catalogue.json'),encoding='utf-8') as stream:
    catalogue=json.load(stream)
assets=unreal.EditorAssetLibrary
factory=unreal.AssetToolsHelpers.get_asset_tools()
report={}
for model in catalogue['models']:
    destination='/Game/FutureTransport/'+model['name']
    task=unreal.AssetImportTask()
    task.set_editor_property('filename',os.path.join(folder,model['name']+'.gltf'))
    task.set_editor_property('destination_path',destination)
    task.set_editor_property('automated',True)
    task.set_editor_property('replace_existing',True)
    task.set_editor_property('save',True)
    factory.import_asset_tasks([task])
    meshes=[]
    for path in assets.list_assets(destination,recursive=True):
        data=assets.find_asset_data(path)
        if str(data.asset_class_path.asset_name)!='StaticMesh':
            continue
        mesh=assets.load_asset(path)
        bounds=mesh.get_bounds()
        meshes.append({'path':mesh.get_path_name(),
            'extent':[bounds.box_extent.x,bounds.box_extent.y,bounds.box_extent.z],
            'origin':[bounds.origin.x,bounds.origin.y,bounds.origin.z],
            'materials':mesh.get_num_sections(0)})
    assert len(meshes)==1,(model['name'],meshes)
    report[model['name']]={**meshes[0],'triangles':model['triangles']}
assert assets.save_directory('/Game/FutureTransport',only_if_is_dirty=True,recursive=True)
with open(os.path.join(root,'Tools/prepare_aurora_glass.py'),encoding='utf-8-sig') as glass_script:
    exec(compile(glass_script.read(),'prepare_aurora_glass.py','exec'))
with open(os.path.join(root,'SourceData/transport-models-import.json'),'w',encoding='utf-8') as stream:
    json.dump(report,stream,indent=2)
