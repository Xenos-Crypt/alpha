"""Import authored CC0 modules and record actual engine bounds/material slots."""
import json
import os
import unreal

root=os.path.abspath(os.path.join(unreal.Paths.project_dir(),'..','SourceAssets'))
with open(os.path.join(root,'selected-modules.json'),encoding='utf-8') as f:
    selection=json.load(f)
factory=unreal.AssetToolsHelpers.get_asset_tools()
assets=unreal.EditorAssetLibrary
report={}
for asset_id in selection:
    destination='/Game/AuthoredStreet/'+asset_id
    task=unreal.AssetImportTask()
    task.set_editor_property('filename',os.path.join(root,asset_id,'street-kit.gltf'))
    task.set_editor_property('destination_path',destination)
    task.set_editor_property('automated',True)
    task.set_editor_property('replace_existing',True)
    task.set_editor_property('save',True)
    factory.import_asset_tasks([task])
    report[asset_id]=[]
    for path in assets.list_assets(destination,recursive=True,include_folder=False):
        asset=assets.load_asset(path)
        if isinstance(asset,unreal.Texture):
            asset.set_editor_property('max_texture_size',1024)
        if isinstance(asset,unreal.StaticMesh):
            bounds=asset.get_bounds()
            report[asset_id].append({'path':path,'name':asset.get_name(),
                'centre':[bounds.origin.x,bounds.origin.y,bounds.origin.z],
                'extent':[bounds.box_extent.x,bounds.box_extent.y,bounds.box_extent.z],
                'materials':[str(slot.material_slot_name) for slot in asset.static_materials]})
    assert len(report[asset_id])>=len(selection[asset_id]),'Missing imported meshes: '+asset_id
assert assets.save_directory('/Game/AuthoredStreet',only_if_is_dirty=True,recursive=True)
with open(os.path.join(root,'unreal-import.json'),'w',encoding='utf-8') as f:
    json.dump(report,f,indent=2)
