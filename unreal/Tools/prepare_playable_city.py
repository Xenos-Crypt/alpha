"""Keep the authored environment intact; derive a walking map with simple collision."""
import json
import os
import unreal

root = os.path.abspath(os.path.join(unreal.Paths.project_dir(), '..'))
levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
assets = unreal.EditorAssetLibrary
assert levels.load_level('/Game/Maps/HidrokAuthoredStreet')
world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
assert unreal.EditorLoadingAndSavingUtils.save_map(world, '/Game/Maps/HidrokPlayable')
assert levels.load_level('/Game/Maps/HidrokPlayable')
world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
with open(os.path.join(root, 'SourceData/website-world.json'), encoding='utf-8') as stream:
    source = json.load(stream)

# HISM clusters provide CPU-side spatial culling on the DX11 compatibility GPU.
# Retain every source instance, but avoid rendering whole 200m ISM batches.
subobjects = unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)
library = unreal.SubobjectDataBlueprintFunctionLibrary
instance_total = 0
cluster_total = 0
for original in list(actors.get_all_level_actors()):
    components = original.get_components_by_class(unreal.InstancedStaticMeshComponent)
    if not components:
        continue
    for component in components:
        owner = actors.spawn_actor_from_class(unreal.Actor, unreal.Vector(0, 0, 0))
        owner.set_actor_label('Walking clusters / ' + original.get_actor_label())
        owner.set_folder_path('Traversal/Spatial clusters')
        owner.get_editor_property('root_component').set_mobility(unreal.ComponentMobility.STATIC)
        params = unreal.AddNewSubobjectParams()
        params.set_editor_property('parent_handle', subobjects.k2_gather_subobject_data_for_instance(owner)[0])
        params.set_editor_property('new_class', unreal.HierarchicalInstancedStaticMeshComponent)
        handle, reason = subobjects.add_new_subobject(params)
        cluster = library.get_associated_object(library.get_data(handle))
        assert isinstance(cluster, unreal.HierarchicalInstancedStaticMeshComponent), str(reason)
        cluster.set_mobility(unreal.ComponentMobility.STATIC)
        cluster.set_static_mesh(component.static_mesh)
        for slot in range(component.get_num_materials()):
            cluster.set_material(slot, component.get_material(slot))
        cluster.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
        cluster.set_collision_profile_name('NoCollision')
        owner.set_actor_enable_collision(False)
        end = min(component.get_editor_property('instance_end_cull_distance'), 18000)
        cluster.set_cull_distances(max(0, end - 3000), end)
        transforms = [component.get_instance_transform(i, world_space=True)
                      for i in range(component.get_instance_count())]
        cluster.add_instances(transforms, False, True)
        instance_total += len(transforms)
        cluster_total += 1
    actors.destroy_actor(original)
assert instance_total == 39700
cube = assets.load_asset('/Engine/BasicShapes/Cube')
support = actors.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(0, 0, -50))
support.set_actor_label('Traversal / Ashford ground support')
support.set_folder_path('Traversal/Collision')
support.static_mesh_component.set_static_mesh(cube)
support.set_actor_scale3d(unreal.Vector(400, 400, 1))
support.static_mesh_component.set_collision_profile_name('BlockAll')
support.static_mesh_component.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
support.set_actor_hidden_in_game(True)
support.static_mesh_component.set_editor_property('cast_shadow', False)

# StaticMeshActor defaults are not a traversal contract. Explicitly enable
# query collision on the visible roads/pavements inherited from the art pass.
for actor in actors.get_all_level_actors():
    if not isinstance(actor, unreal.StaticMeshActor):
        continue
    component = actor.static_mesh_component
    if component.static_mesh != cube:
        continue
    _, extent = actor.get_actor_bounds(False)
    if extent.z < 30 and extent.x > 50 and extent.y > 50:
        component.set_collision_profile_name('BlockAll')
        component.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
for building in source['buildings']:
    height = building['top'] * 100
    blocker = actors.spawn_actor_from_class(unreal.StaticMeshActor,
        unreal.Vector(building['x'] * 100, building['z'] * 100, height / 2))
    blocker.set_actor_label('Traversal / building footprint')
    blocker.set_folder_path('Traversal/Collision')
    blocker.set_editor_property('tags', [unreal.Name('AWBuildingBlocker')])
    blocker.static_mesh_component.set_static_mesh(cube)
    blocker.set_actor_scale3d(unreal.Vector(building['w'], building['d'], height / 100))
    blocker.static_mesh_component.set_collision_profile_name('BlockAll')
    blocker.static_mesh_component.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
    blocker.static_mesh_component.set_mobility(unreal.ComponentMobility.STATIC)
    blocker.set_actor_hidden_in_game(True)
    blocker.set_is_temporarily_hidden_in_editor(True)
    blocker.static_mesh_component.set_editor_property('cast_shadow', False)

# Imported spheres included decorative sky/sun geometry: these must never trap a pawn.
for actor in actors.get_all_level_actors():
    if isinstance(actor, unreal.PlayerStart):
        actors.destroy_actor(actor)
    elif isinstance(actor, unreal.StaticMeshActor):
        mesh = actor.static_mesh_component.static_mesh
        if mesh and mesh.get_path_name() == '/Engine/BasicShapes/Sphere.Sphere':
            actor.static_mesh_component.set_collision_profile_name('NoCollision')
            actor.static_mesh_component.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
            actor.set_actor_enable_collision(False)

rotation = unreal.Rotator()
rotation.set_editor_property('yaw', 90)
start = actors.spawn_actor_from_class(unreal.PlayerStart, unreal.Vector(160, 4400, 120), rotation)
start.set_actor_label('Ashford walking start')
world.get_world_settings().set_editor_property('default_game_mode',
    unreal.load_class(None, '/Script/AnotherWorld.AWGameMode'))
assert levels.save_current_level()
assert levels.load_level('/Game/Maps/HidrokPlayable')
saved = actors.get_all_level_actors()
assert len([a for a in saved if a.get_actor_label() == 'Traversal / building footprint']) == 177
assert len([a for a in saved if isinstance(a, unreal.PlayerStart)]) == 1
saved_clusters = [c for a in saved for c in a.get_components_by_class(unreal.HierarchicalInstancedStaticMeshComponent)]
assert sum(c.get_instance_count() for c in saved_clusters) == instance_total
with open(os.path.join(root, 'SourceData/playable-city-report.json'), 'w', encoding='utf-8') as stream:
    json.dump({'map': '/Game/Maps/HidrokPlayable', 'building_blockers': 177,
        'spawn': [160, 4400, 120], 'saved_map_reload': True,
        'persisted_hierarchical_instances': instance_total, 'spatial_clusters': cluster_total,
        'limitations': ['Building interiors are blocked pending interior migration.',
            'Traffic, vehicles, powers and NPC interactions are not yet ported.',
            'Street props are decorative; detailed prop collision is pending.',
            'Playable preview architecture culls beyond 180 metres.']}, stream, indent=2)
