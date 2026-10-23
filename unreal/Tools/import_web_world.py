"""Import a static migration snapshot of the website. No gameplay is inferred."""
import collections
import json
import os
import unreal

root = os.path.abspath(os.path.join(unreal.Paths.project_dir(), '..'))
with open(os.path.join(root, 'SourceData', 'website-world.json'), encoding='utf-8') as stream:
    data = json.load(stream)
assets = unreal.EditorAssetLibrary
levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
map_path = '/Game/Maps/HidrokWebsite'
if assets.does_asset_exist(map_path):
    assert levels.load_level(map_path)
    for actor in actors.get_all_level_actors():
        actors.destroy_actor(actor)
else:
    assert levels.new_level(map_path)

factory = unreal.AssetToolsHelpers.get_asset_tools()
texture_assets = {}
for filename in sorted(os.listdir(os.path.join(root, 'SourceData', 'Textures'))):
    name = os.path.splitext(filename)[0]
    task = unreal.AssetImportTask()
    task.set_editor_property('filename', os.path.join(root, 'SourceData', 'Textures', filename))
    task.set_editor_property('destination_path', '/Game/Website/Textures')
    task.set_editor_property('automated', True)
    task.set_editor_property('replace_existing', True)
    task.set_editor_property('save', True)
    factory.import_asset_tasks([task])
    texture_assets[name] = assets.load_asset('/Game/Website/Textures/' + name)
surfaces = {}
material_cache = {}
for key, source in data['surfaces'].items():
    signature = tuple(round(v, 3) for v in source['colour']) + (round(source['roughness'], 2), round(source['metalness'], 2),
        source.get('texture'), tuple(source.get('repeat', [1, 1])), tuple(source.get('offset', [0, 0])))
    if signature not in material_cache:
        name = 'WebSurface_%04d' % len(material_cache)
        path = '/Game/Website/Materials/' + name
        material = assets.load_asset(path) if assets.does_asset_exist(path) else factory.create_asset(
            name, '/Game/Website/Materials', unreal.Material, unreal.MaterialFactoryNew())
        unreal.MaterialEditingLibrary.delete_all_material_expressions(material)
        colour = unreal.MaterialEditingLibrary.create_material_expression(material, unreal.MaterialExpressionConstant3Vector)
        colour.set_editor_property('constant', unreal.LinearColor(*source['colour']))
        unreal.MaterialEditingLibrary.connect_material_property(colour, '', unreal.MaterialProperty.MP_BASE_COLOR)
        if source.get('texture') in texture_assets:
            sample = unreal.MaterialEditingLibrary.create_material_expression(material, unreal.MaterialExpressionTextureSample)
            sample.set_editor_property('texture', texture_assets[source['texture']])
            uv = unreal.MaterialEditingLibrary.create_material_expression(material, unreal.MaterialExpressionTextureCoordinate)
            uv.set_editor_property('u_tiling', source['repeat'][0])
            uv.set_editor_property('v_tiling', source['repeat'][1])
            offset = unreal.MaterialEditingLibrary.create_material_expression(material, unreal.MaterialExpressionConstant2Vector)
            offset.set_editor_property('r', source['offset'][0])
            offset.set_editor_property('g', source['offset'][1])
            add = unreal.MaterialEditingLibrary.create_material_expression(material, unreal.MaterialExpressionAdd)
            unreal.MaterialEditingLibrary.connect_material_expressions(uv, '', add, 'A')
            unreal.MaterialEditingLibrary.connect_material_expressions(offset, '', add, 'B')
            unreal.MaterialEditingLibrary.connect_material_expressions(add, '', sample, 'UVs')
            multiply = unreal.MaterialEditingLibrary.create_material_expression(material, unreal.MaterialExpressionMultiply)
            unreal.MaterialEditingLibrary.connect_material_expressions(sample, 'RGB', multiply, 'A')
            unreal.MaterialEditingLibrary.connect_material_expressions(colour, '', multiply, 'B')
            unreal.MaterialEditingLibrary.connect_material_property(multiply, '', unreal.MaterialProperty.MP_BASE_COLOR)
        for prop, value in [(unreal.MaterialProperty.MP_ROUGHNESS, source['roughness']),
                            (unreal.MaterialProperty.MP_METALLIC, source['metalness'])]:
            node = unreal.MaterialEditingLibrary.create_material_expression(material, unreal.MaterialExpressionConstant)
            node.set_editor_property('r', value)
            unreal.MaterialEditingLibrary.connect_material_property(node, '', prop)
        unreal.MaterialEditingLibrary.recompile_material(material)
        material_cache[signature] = material
    surfaces[key] = material_cache[signature]

meshes = {name: assets.load_asset('/Engine/BasicShapes/' + asset) for name, asset in
          [('cube', 'Cube'), ('sphere', 'Sphere'), ('cylinder', 'Cylinder'), ('cone', 'Cone')]}
batches = collections.defaultdict(list)
for instance in data['instances']:
    # Spatial cells avoid a single country-sized bounds for every material batch.
    x, y, z = instance['position']
    key = (instance['shape'], surfaces[instance['material']].get_path_name(), int(x // 20000), int(y // 20000))
    batches[key].append(instance)

count = 0
for index, (key, instances) in enumerate(batches.items()):
    for instance in instances:
        actor = actors.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(*instance['position']),
            unreal.Quat(*instance['quaternion']).rotator())
        actor.set_actor_label('Website geometry %04d %s' % (count, key[0]))
        actor.set_folder_path('Website migration/Geometry')
        actor.set_actor_scale3d(unreal.Vector(*instance['scale']))
        component = actor.static_mesh_component
        component.set_static_mesh(meshes[key[0]])
        component.set_material(0, surfaces[instance['material']])
        component.set_collision_profile_name('BlockAll')
        count += 1

for destination in data['destinations']:
    marker = actors.spawn_actor_from_class(unreal.TargetPoint,
        unreal.Vector(destination['x'] * 100, destination['z'] * 100, 100))
    marker.set_actor_label(destination['name'])
    marker.set_folder_path('Website migration/Destinations')

sun = actors.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 8000), unreal.Rotator(-35, -25, 0))
sun.light_component.set_mobility(unreal.ComponentMobility.MOVABLE)
sun.light_component.set_editor_property('intensity', 3.0)
actors.spawn_actor_from_class(unreal.SkyAtmosphere, unreal.Vector(0, 0, 0))
sky = actors.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 5000))
sky.light_component.set_mobility(unreal.ComponentMobility.MOVABLE)
sky.light_component.set_editor_property('real_time_capture', True)
actors.spawn_actor_from_class(unreal.PlayerStart, unreal.Vector(*data['spawn']))
assert count == len(data['instances'])
assert levels.save_current_level(), 'Map save failed'
assert assets.save_directory('/Game/Website', only_if_is_dirty=True, recursive=True)
report = {'instances': count, 'material_spatial_groups': len(batches), 'materials': len(material_cache),
          'source_buildings': len(data['buildings']), 'destinations': len(data['destinations']),
          'map': map_path, 'render_verified': False, 'gameplay_ported': False,
          'scope': data['scope'], 'textures': len(texture_assets),
          'limits': ['Ashford base construction only. Other cities and later landmarks pending.',
                     'Primitive shapes only; custom meshes omitted, partial spheres approximated.',
                     'Canvas diffuse textures imported; normal maps, transparency and per-face material splits pending.',
                     'Ordinary static mesh actors; instancing optimization pending.',
                     'Collisions use primitive meshes, not the website collision rules.']}
with open(os.path.join(root, 'SourceData', 'import-report.json'), 'w', encoding='utf-8') as stream:
    json.dump(report, stream, indent=2)
unreal.log('WEBSITE_WORLD_IMPORT_OK ' + json.dumps(report))
