"""Assemble licensed authored architecture on the original website footprints."""
import json
import math
import os
import unreal

project=unreal.Paths.project_dir()
root=os.path.abspath(os.path.join(project,'..'))
assets=unreal.EditorAssetLibrary
levels=unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
actors=unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
factory=unreal.AssetToolsHelpers.get_asset_tools()
assert levels.load_level('/Game/Maps/HidrokStreet')
assert unreal.EditorLoadingAndSavingUtils.save_map(
    unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world(), '/Game/Maps/HidrokAuthoredStreet')
assert levels.load_level('/Game/Maps/HidrokAuthoredStreet')
with open(os.path.join(root,'SourceAssets/unreal-import.json'),encoding='utf-8') as f:
    catalogue=json.load(f)
with open(os.path.join(root,'SourceData/website-world.json'),encoding='utf-8') as f:
    source=json.load(f)

def rotation(yaw=0,pitch=0,roll=0):
    value=unreal.Rotator()
    value.set_editor_property('pitch',float(pitch))
    value.set_editor_property('yaw',float(yaw))
    value.set_editor_property('roll',float(roll))
    return value

def mesh(asset_id,name=None):
    entries=catalogue[asset_id]
    entry=next(e for e in entries if e['name']==name) if name else entries[0]
    return assets.load_asset(entry['path'])

counts={'modules':0,'props':0,'detail_parts':0}
records=[]

class InstanceRecord:
    def __init__(self,label,model,pos,yaw,scale,group):
        self.label,self.model,self.pos,self.yaw,self.scale,self.group=label,model,pos,yaw,scale,group
        self.materials={}
        self.static_mesh_component=self
    def set_material(self,slot,material):
        self.materials[slot]=material

def spawn(label,model,pos,yaw=0,scale=(1,1,1),group='Architecture'):
    counts['modules' if group=='Architecture' else 'props' if group=='Props' else 'detail_parts']+=1
    if group!='Sky':
        record=InstanceRecord(label,model,pos,yaw,scale,group)
        records.append(record)
        return record
    actor=actors.spawn_actor_from_class(unreal.StaticMeshActor,unreal.Vector(*pos),rotation(yaw))
    actor.set_actor_label('Authored / '+label)
    actor.set_folder_path('Authored street/'+group)
    actor.static_mesh_component.set_static_mesh(model)
    actor.set_actor_scale3d(unreal.Vector(*scale))
    return actor

cube=assets.load_asset('/Engine/BasicShapes/Cube')
cylinder=assets.load_asset('/Engine/BasicShapes/Cylinder')
metal=assets.load_asset('/Game/Realism/Materials/PaintedWindowFrames')
interior=assets.load_asset('/Game/Realism/Materials/InteriorShadow')
stone=assets.load_asset('/Game/Realism/Materials/PhotographedPlaster')

def box(label,pos,size,mat=metal,yaw=0,group='Details'):
    actor=spawn(label,cube,pos,yaw,tuple(v/100 for v in size),group)
    actor.static_mesh_component.set_material(0,mat)
    return actor

selected=sorted(source['buildings'],key=lambda b:math.hypot(b['x'],b['z']-60))
existing=list(actors.get_all_level_actors())
for actor in existing:
    if not isinstance(actor,unreal.StaticMeshActor):
        continue
    label=actor.get_actor_label()
    if not label.startswith(('Website geometry ','Street art / ')):
        continue
    pos=actor.get_actor_location()
    if pos.z>20 and any(abs(pos.x-b['x']*100)<b['w']*50+150 and
        abs(pos.y-b['z']*100)<b['d']*50+150 for b in selected):
        actors.destroy_actor(actor)

buildings=[]
for index,b in enumerate(selected):
    x,y=b['x']*100,b['z']*100
    width,depth=b['w']*100,b['d']*100
    floors=max(2,round((b['top']*100-30)/300))
    kit='modular_urban_apartments_facade' if index%3!=1 else 'modular_factory_facade'
    apartment='apartments' in kit
    small=apartment and index%2==0
    # Dark room cores and real floor plates give openings a physical interior depth.
    box('interior core',(x,y,15+floors*150),(width-170,depth-170,floors*300),interior,group='Architecture')
    for floor in range(floors+1):
        box('floor plate',(x,y,15+floor*300),(width-10,depth-10,12),stone,group='Architecture')
    # Local modules span X=-300..0, height Z=0..300, with outward face +Y.
    faces=[(0,(x,y+depth/2),width),(180,(x,y-depth/2),width),
           (90,(x-width/2,y),depth),(-90,(x+width/2,y),depth)]
    for yaw,centre,span in faces:
        radians=math.radians(yaw)
        tx,ty=math.cos(radians),math.sin(radians)
        bay_width=span/3
        factor=bay_width/300
        for bay in range(3):
            along=(bay-1)*bay_width+150*factor
            px,py=centre[0]+tx*along,centre[1]+ty*along
            for floor in range(floors):
                z=15+floor*300
                door=floor==0 and bay==1 and yaw in (90,180)
                suffix='door_centered_small_01' if door else 'window_centered_small_01' if small else 'window_centered_large_01'
                wall_name='wall_'+suffix
                spawn(kit+'/'+wall_name,mesh(kit,wall_name),(px,py,z),yaw,(factor,1,1))
                spawn(kit+'/'+suffix,mesh(kit,suffix),(px,py,z),yaw,(factor,1,1))
                cornice='cornice_standard_standard_01' if apartment else 'cornice02_standard_standard_01'
                spawn('floor moulding',mesh(kit,cornice),(px,py,z+280),yaw,(factor,1,1))
                if floor==0 and not door:
                    base='dado_standard_standard_01' if apartment else 'base_standard_standard_01'
                    spawn('weathered plinth',mesh(kit,base),(px,py,z),yaw,(factor,1,1))
            spawn('roof crown',mesh(kit,'crown_standard_standard_01'),
                (px,py,15+floors*300),yaw,(factor,1,1))
    # Round downpipes with short lateral connections, rather than square poles.
    side=-1 if x>0 else 1
    nx=side
    for offset in (-depth/2+30,depth/2-30):
        actor=spawn('cast-iron downpipe',cylinder,(x+side*(width/2+9),y+offset,15+floors*150),
            scale=(.075,.075,floors*3),group='Details')
        actor.static_mesh_component.set_material(0,metal)
    # Actual wall-mounted authored lamp brackets, positioned above the pavement.
    for offset in (-220,220):
        spawn('weathered wall lantern',mesh('street_lamp_02'),
            (x+side*(width/2+4),y+offset,330),90 if side<0 else -90,group='Props')
    # Street-facing shop sign: painted metal plate and world-space lettering.
    titles=['ASHFORD HOUSE','MASON & CO.','CORNER STORES','HARTWELL REPAIRS',
        'GROVE HOUSE','POST & PARCEL','NORTH STREET BOOKS','CITY WORKSHOP']
    shop=titles[index%len(titles)]
    sign_pos=(x+side*(width/2+8),y,274)
    box('enamel shop sign',sign_pos,(12,235,43),metal)
    text=actors.spawn_actor_from_class(unreal.TextRenderActor,
        unreal.Vector(sign_pos[0]+side*7,sign_pos[1],sign_pos[2]),rotation(180 if side<0 else 0))
    text.set_actor_label('Authored / '+shop)
    text.set_folder_path('Authored street/Signage')
    component=text.get_component_by_class(unreal.TextRenderComponent)
    component.set_text(unreal.Text(shop))
    component.set_world_size(23)
    component.set_horizontal_alignment(unreal.HorizTextAligment.EHTA_CENTER)
    component.set_editor_property('vertical_alignment',unreal.VerticalTextAligment.EVRTA_TEXT_CENTER)
    component.set_text_render_color(unreal.Color(216,208,181))
    buildings.append({'x':b['x'],'z':b['z'],'floors':floors,'kit':kit})

# Keep at least 1.7 m of the curbside walking strip clear beside benches/bins.
for b in [b for i,b in enumerate(selected) if i%5==0 or i==2]:
    road=round(b['x']/40)*4000
    side=1 if b['x']*100>road else -1
    # Offset to a window bay, leaving the central entrance approach open.
    y=b['z']*100+270
    spawn('worn timber bench',mesh('painted_wooden_bench'),(road+side*985,y,15),90 if side>0 else -90,group='Props')
    spawn('rusted refuse bin',mesh('metal_trash_can'),(road+side*990,y+180,15),group='Props')
    spawn('refuse bag',mesh('trashbag'),(road+side*1020,y+245,15),yaw=side*27,scale=(.85,.85,.85),group='Props')

for x,y in [(gx*4000+180,gy*4000+1400) for gx in range(-4,4) for gy in range(-4,4)]:
    for name in ('water_manhole_cover_frame','water_manhole_cover'):
        spawn('flush cast-iron cover',mesh('water_manhole_cover',name),(x,y,3.3),group='Props')

for b in selected[::5]:
    road=round(b['x']/40)*4000
    side=1 if b['x']*100>road else -1
    y=b['z']*100-350
    # Flush gutter grilles sit on the road side of the kerb, not in the footway.
    box('drain frame',(road+side*748,y,7.4),(28,65,2),metal)
    for step in range(7):
        box('drain slot',(road+side*748,y-26+step*8.5,8.6),(23,3,1),interior)

# The editor subsystem creates owned instance components that serialize correctly.
# Keep spatial bounds local so distant modules and street props can be culled.
subobjects=unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)
library=unreal.SubobjectDataBlueprintFunctionLibrary
batches={}
for record in records:
    material_key=tuple((slot,material.get_path_name()) for slot,material in sorted(record.materials.items()))
    key=(record.model.get_path_name(),material_key,math.floor(record.pos[0]/20000),
        math.floor(record.pos[1]/20000),record.group)
    batches.setdefault(key,[]).append(record)
for index,items in enumerate(batches.values()):
    first=items[0]
    actor=actors.spawn_actor_from_class(unreal.Actor,unreal.Vector(0,0,0))
    actor.set_actor_label('Authored instances %04d / %s'%(index,first.label))
    actor.set_folder_path('Authored street/'+first.group)
    params=unreal.AddNewSubobjectParams()
    params.set_editor_property('parent_handle',subobjects.k2_gather_subobject_data_for_instance(actor)[0])
    params.set_editor_property('new_class',unreal.InstancedStaticMeshComponent)
    handle,reason=subobjects.add_new_subobject(params)
    component=library.get_associated_object(library.get_data(handle))
    assert isinstance(component,unreal.InstancedStaticMeshComponent),str(reason)
    actor.get_editor_property('root_component').set_mobility(unreal.ComponentMobility.STATIC)
    component.set_mobility(unreal.ComponentMobility.STATIC)
    component.set_static_mesh(first.model)
    for slot,material in first.materials.items():
        component.set_material(slot,material)
    component.set_cull_distances(25000,30000) if first.group=='Architecture' else component.set_cull_distances(10000,15000)
    transforms=[]
    for record in items:
        transform=unreal.Transform()
        transform.translation=unreal.Vector(*record.pos)
        transform.rotation=rotation(record.yaw).quaternion()
        transform.scale3d=unreal.Vector(*record.scale)
        transforms.append(transform)
    component.add_instances(transforms,False,True)

# Match the visible sky to the HDR environment already lighting the street.
sky_path='/Game/AuthoredStreet/StreetSky'
sky_material=assets.load_asset(sky_path) if assets.does_asset_exist(sky_path) else factory.create_asset(
    'StreetSky','/Game/AuthoredStreet',unreal.Material,unreal.MaterialFactoryNew())
unreal.MaterialEditingLibrary.delete_all_material_expressions(sky_material)
sky_material.set_editor_property('shading_model',unreal.MaterialShadingModel.MSM_UNLIT)
sky_material.set_editor_property('two_sided',True)
sky_material.set_editor_property('is_sky',True)
pos=unreal.MaterialEditingLibrary.create_material_expression(sky_material,unreal.MaterialExpressionWorldPosition)
cam=unreal.MaterialEditingLibrary.create_material_expression(sky_material,unreal.MaterialExpressionCameraPositionWS)
direction=unreal.MaterialEditingLibrary.create_material_expression(sky_material,unreal.MaterialExpressionSubtract)
sample=unreal.MaterialEditingLibrary.create_material_expression(sky_material,unreal.MaterialExpressionTextureSample)
sample.set_editor_property('texture',assets.load_asset('/Game/Realism/Textures/sky'))
sample.set_editor_property('sampler_type',unreal.MaterialSamplerType.SAMPLERTYPE_LINEAR_COLOR)
unreal.MaterialEditingLibrary.connect_material_expressions(pos,'',direction,'A')
unreal.MaterialEditingLibrary.connect_material_expressions(cam,'',direction,'B')
unreal.MaterialEditingLibrary.connect_material_expressions(direction,'',sample,'UVs')
unreal.MaterialEditingLibrary.connect_material_property(sample,'RGB',unreal.MaterialProperty.MP_EMISSIVE_COLOR)
unreal.MaterialEditingLibrary.recompile_material(sky_material)
sky=spawn('photographic HDR sky',assets.load_asset('/Engine/BasicShapes/Sphere'),(0,0,0),scale=(4000,4000,4000),group='Sky')
sky.static_mesh_component.set_material(0,sky_material)
sky.static_mesh_component.set_editor_property('cast_shadow',False)
sky.static_mesh_component.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
for actor in actors.get_all_level_actors():
    if isinstance(actor,unreal.DirectionalLight):
        actor.set_actor_rotation(rotation(-35,-38),False)
        actor.light_component.set_editor_property('intensity',3.0)

camera=next(a for a in actors.get_all_level_actors() if a.get_actor_label()=='Street review camera')
camera.set_actor_location(unreal.Vector(160,4400,170),False,False)
camera.set_actor_rotation(rotation(68,1),False)
unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).set_level_viewport_camera_info(
    camera.get_actor_location(),camera.get_actor_rotation())
assert levels.save_current_level()
assert assets.save_directory('/Game/AuthoredStreet',only_if_is_dirty=True,recursive=True)
report={'map':'/Game/Maps/HidrokAuthoredStreet','buildings':buildings,'counts':counts,
    'instances':len(records),'instance_batches':len(batches),
    'render_verified':False,'asset_credits':'SourceAssets/CREDITS.json',
    'limits':['All 177 imported Ashford buildings are treated; the other website cities still need porting.',
        'Props are static; their interactions and destruction are not ported.',
        'DX11 preview does not use Lumen. No Bodycam-equivalent fidelity or frame rate is claimed.']}
with open(os.path.join(root,'SourceData/authored-street-report.json'),'w',encoding='utf-8') as f:
    json.dump(report,f,indent=2)
