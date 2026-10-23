import json
import os
import unreal

unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).load_level('/Game/Maps/HidrokPlayable')
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
rows = []
for actor in actors:
    if not isinstance(actor, unreal.StaticMeshActor):
        continue
    component = actor.static_mesh_component
    center, extent = actor.get_actor_bounds(False)
    if actor.get_name() != 'StaticMeshActor_21' and not (
        abs(center.x - 160) < extent.x + 50 and abs(center.y - 4400) < extent.y + 50):
        continue
    rows.append({'name': actor.get_name(), 'label': actor.get_actor_label(),
        'mesh': str(component.static_mesh.get_path_name()) if component.static_mesh else None,
        'center': [center.x, center.y, center.z], 'extent': [extent.x, extent.y, extent.z],
        'scale': str(actor.get_actor_scale3d()), 'rotation': str(actor.get_actor_rotation()),
        'collision': str(component.get_collision_enabled()),
        'profile': str(component.get_collision_profile_name())})
root = os.path.abspath(os.path.join(unreal.Paths.project_dir(), '..'))
with open(os.path.join(root, 'SourceData/walking-collision-diagnostic.json'), 'w') as stream:
    json.dump(rows, stream, indent=2)
