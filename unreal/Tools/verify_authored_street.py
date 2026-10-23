"""Check the persisted city batches, source footprints and dynamic light setup."""
import json
import os
import unreal

root=os.path.abspath(os.path.join(unreal.Paths.project_dir(),'..'))
with open(os.path.join(root,'SourceData/authored-street-report.json'),encoding='utf-8-sig') as f:
    report=json.load(f)
with open(os.path.join(root,'SourceData/website-world.json'),encoding='utf-8') as f:
    source=json.load(f)
assert unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).load_level(report['map'])
actors=unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
components=[component for actor in actors for component in
    actor.get_components_by_class(unreal.InstancedStaticMeshComponent)]
count=sum(component.get_instance_count() for component in components)
assert count==report['instances'],(count,report['instances'])
assert len(components)==report['instance_batches']
assert len(report['buildings'])==len(source['buildings'])==177
assert sorted((b['x'],b['z']) for b in report['buildings'])==sorted((b['x'],b['z']) for b in source['buildings'])
for component in components:
    assert component.get_owner().get_editor_property('root_component').get_editor_property('mobility')==unreal.ComponentMobility.STATIC
    assert component.static_mesh,'Missing mesh in saved batch'
    for slot in range(component.get_num_materials()):
        assert component.get_material(slot),'Missing authored material'
for actor in actors:
    if isinstance(actor,(unreal.DirectionalLight,unreal.SkyLight)):
        assert actor.light_component.get_editor_property('mobility')==unreal.ComponentMobility.MOVABLE
with open(os.path.join(root,'SourceData/authored-street-verification.json'),'w',encoding='utf-8') as f:
    json.dump({'saved_map_reload':True,'source_footprints_preserved':177,
        'persisted_instances':count,'persisted_batches':len(components),
        'render_verified':False,'performance_benchmarked':False},f,indent=2)
