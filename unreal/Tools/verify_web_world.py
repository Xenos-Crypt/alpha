"""Reload the saved migration map and compare transforms against source data."""
import json
import os
import unreal

root = os.path.abspath(os.path.join(unreal.Paths.project_dir(), '..'))
with open(os.path.join(root, 'SourceData', 'website-world.json'), encoding='utf-8') as stream:
    source = json.load(stream)
assert unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).load_level('/Game/Maps/HidrokWebsite')
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
geometry = [a for a in actors if a.get_actor_label().startswith('Website geometry ')]
assert len(geometry) == len(source['instances']), (len(geometry), len(source['instances']))
markers = [a for a in actors if isinstance(a, unreal.TargetPoint)]
assert len(markers) == len(source['destinations'])
expected = sorted(tuple(round(v, 1) for v in i['position']) for i in source['instances'])
actual = sorted(tuple(round(v, 1) for v in (a.get_actor_location().x, a.get_actor_location().y,
    a.get_actor_location().z)) for a in geometry)
assert actual == expected, 'Saved world transforms differ from website'
for actor in geometry:
    assert actor.static_mesh_component.static_mesh
    assert actor.static_mesh_component.get_material(0)
with open(os.path.join(root, 'SourceData', 'verification-report.json'), 'w', encoding='utf-8') as stream:
    json.dump({'saved_map_reload': True, 'geometry': len(geometry), 'destinations': len(markers),
        'positions_match_source': True, 'render_verified': False}, stream, indent=2)
unreal.log('SAVED_WEBSITE_WORLD_VERIFIED')
