"""Verify editor-created ISM components survive a real map save/reload."""
import unreal
actors=unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
levels=unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
subobjects=unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)
library=unreal.SubobjectDataBlueprintFunctionLibrary
path='/Game/Maps/StreetInstancingCheck'
if unreal.EditorAssetLibrary.does_asset_exist(path):
    assert levels.load_level(path)
    for actor in actors.get_all_level_actors():
        actors.destroy_actor(actor)
else:
    assert levels.new_level(path)
actor=actors.spawn_actor_from_class(unreal.Actor,unreal.Vector(0,0,0))
actor.set_actor_label('Persisted street instances')
handles=subobjects.k2_gather_subobject_data_for_instance(actor)
params=unreal.AddNewSubobjectParams()
params.set_editor_property('parent_handle',handles[0])
params.set_editor_property('new_class',unreal.InstancedStaticMeshComponent)
handle,reason=subobjects.add_new_subobject(params)
component=library.get_associated_object(library.get_data(handle))
assert isinstance(component,unreal.InstancedStaticMeshComponent),str(reason)
component.set_static_mesh(unreal.EditorAssetLibrary.load_asset('/Engine/BasicShapes/Cube'))
for x in range(4):
    transform=unreal.Transform()
    transform.translation=unreal.Vector(x*200,0,50)
    component.add_instance(transform,True)
assert levels.save_current_level()
assert levels.load_level('/Game/Maps/HidrokStreet')
assert levels.load_level(path)
actor=next(a for a in actors.get_all_level_actors() if a.get_actor_label()=='Persisted street instances')
component=actor.get_component_by_class(unreal.InstancedStaticMeshComponent)
assert component and component.get_instance_count()==4,'Instance serialization failed'
unreal.log('PERSISTED_STREET_INSTANCING_OK')
