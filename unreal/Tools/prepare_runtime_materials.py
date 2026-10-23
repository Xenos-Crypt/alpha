"""Persist the instance usage required by the real game, not just the editor."""
import json
import os
import unreal

assets = unreal.EditorAssetLibrary
library = unreal.MaterialEditingLibrary
usage = unreal.MaterialUsage.MATUSAGE_INSTANCED_STATIC_MESHES
changed = []
for directory in ('/Game/AuthoredStreet', '/Game/Realism', '/Game/Website', '/Game/Materials'):
    for path in assets.list_assets(directory, recursive=True):
        data = assets.find_asset_data(path)
        if str(data.asset_class_path.asset_name) not in ('Material', 'MaterialInstanceConstant'):
            continue
        material = assets.load_asset(path)
        if library.has_material_usage(material, usage):
            continue
        if isinstance(material, unreal.MaterialInstanceConstant):
            library.set_material_usage_override(material, usage, True, True)
            library.update_material_instance(material)
        elif isinstance(material, unreal.Material):
            library.set_base_material_usage(material, usage, True)
            library.recompile_material(material)
        assert library.has_material_usage(material, usage), path
        assert assets.save_loaded_asset(material, only_if_is_dirty=False), path
        changed.append(path)
root = os.path.abspath(os.path.join(unreal.Paths.project_dir(), '..'))
with open(os.path.join(root, 'SourceData/runtime-materials-report.json'), 'w', encoding='utf-8') as stream:
    json.dump({'instance_usage_persisted': changed}, stream, indent=2)
