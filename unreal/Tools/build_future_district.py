"""Unity-inspired future architecture, derived from the working walking map."""
import collections
import json
import math
import os
import random
import unreal

root = os.path.abspath(os.path.join(unreal.Paths.project_dir(), '..'))
levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
assets = unreal.EditorAssetLibrary
factory = unreal.AssetToolsHelpers.get_asset_tools()
edit = unreal.MaterialEditingLibrary
with open(os.path.join(root,'Tools/prepare_aurora_glass.py'),encoding='utf-8-sig') as glass_script:
    exec(compile(glass_script.read(),'prepare_aurora_glass.py','exec'))
assert levels.load_level('/Game/Maps/HidrokPlayable')
world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
assert unreal.EditorLoadingAndSavingUtils.save_map(world, '/Game/Maps/HidrokFuture')
assert levels.load_level('/Game/Maps/HidrokFuture')
with open(os.path.join(root, 'SourceData/website-world.json'), encoding='utf-8') as stream:
    source = json.load(stream)

# Replace the period architecture and street dressing, preserving the road grid,
# tested ground, player start, and all footprint collision actors.
for actor in list(actors.get_all_level_actors()):
    if actor.get_components_by_class(unreal.InstancedStaticMeshComponent):
        actors.destroy_actor(actor)
    elif isinstance(actor, unreal.TextRenderActor) and 'Authored' in str(actor.get_folder_path()):
        actors.destroy_actor(actor)

def constant(material, value, prop):
    node = edit.create_material_expression(material, unreal.MaterialExpressionConstant)
    node.set_editor_property('r', value)
    edit.connect_material_property(node, '', prop)

def material(name, colour, metal=0, rough=.5, glow=False, transparent=False):
    path = '/Game/Future/Materials/' + name
    mat = assets.load_asset(path) if assets.does_asset_exist(path) else factory.create_asset(
        name, '/Game/Future/Materials', unreal.Material, unreal.MaterialFactoryNew())
    edit.delete_all_material_expressions(mat)
    tint = edit.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector)
    tint.set_editor_property('constant', unreal.LinearColor(*colour))
    edit.connect_material_property(tint, '', unreal.MaterialProperty.MP_EMISSIVE_COLOR if glow else unreal.MaterialProperty.MP_BASE_COLOR)
    if glow:
        mat.set_editor_property('shading_model', unreal.MaterialShadingModel.MSM_UNLIT)
    else:
        constant(mat, metal, unreal.MaterialProperty.MP_METALLIC)
        constant(mat, rough, unreal.MaterialProperty.MP_ROUGHNESS)
    if transparent:
        mat.set_editor_property('blend_mode', unreal.BlendMode.BLEND_TRANSLUCENT)
        mat.set_editor_property('two_sided', True)
        constant(mat, .17, unreal.MaterialProperty.MP_OPACITY)
    edit.set_base_material_usage(mat, unreal.MaterialUsage.MATUSAGE_INSTANCED_STATIC_MESHES, True)
    edit.recompile_material(mat)
    return mat

pearl = material('PearlCeramic', (.66, .70, .72), .18, .38)
graphite = material('GraphiteTitanium', (.035, .05, .065), .65, .34)
glass = material('MidnightGlazing', (.035, .105, .145), .6, .14)
clear = material('PavilionGlass', (.13, .25, .28), .15, .12, transparent=True)
cyan = material('CyanServiceLight', (.06, .68, .78), glow=True)
soil = material('PlanterSoil', (.055, .038, .025), rough=.95)
green = material('PlantFoliage', (.07, .19, .075), rough=.83)
sage = material('PlantHighlights', (.17, .29, .09), rough=.8)
wood = material('WarmTimber', (.23, .12, .055), rough=.53)
water = material('ReflectingWater', (.025, .14, .18), .45, .09)
stone = assets.load_asset('/Game/Realism/Materials/PhotographedPaving')
cube = assets.load_asset('/Engine/BasicShapes/Cube')
sphere = assets.load_asset('/Engine/BasicShapes/Sphere')
cylinder = assets.load_asset('/Engine/BasicShapes/Cylinder')
records = []

def rotation(yaw=0, pitch=0, roll=0):
    result = unreal.Rotator()
    for key, value in (('yaw', yaw), ('pitch', pitch), ('roll', roll)):
        result.set_editor_property(key, float(value))
    return result

def part(pos, size, mat, mesh=cube, yaw=0, pitch=0, roll=0):
    records.append((tuple(pos), tuple(size), mat, mesh, rotation(yaw, pitch, roll)))

nearest = sorted(source['buildings'], key=lambda b: (b['x']*100-160)**2+(b['z']*100-4400)**2)
hero = {(b['x'], b['z']) for b in nearest[:12]}
pavilions = {(25.5, 54.5), (-25.5, 54.5)}
for index, building in enumerate(source['buildings']):
    x, y = building['x']*100, building['z']*100
    width, depth = building['w']*100, building['d']*100
    detailed = (building['x'], building['z']) in hero
    if (building['x'], building['z']) in pavilions:
        part((x,y,36), (width,depth,40), stone)
        part((x,y,62), (width-30,depth-30,12), wood)
        part((x,y,390), (width+70,depth+70,35), pearl)
        part((x,y,365), (width+40,depth+40,12), graphite)
        part((x,y-depth/2-20,373), (width+55,5,5), cyan)
        for side in (-1,1):
            part((x+side*(width/2-10),y,215), (8,depth-40,290), clear)
            part((x,y+side*(depth/2-10),215), (width-40,8,290), clear)
            for n in (-1,0,1):
                part((x+n*(width/2-20),y+side*(depth/2-10),215),(7,12,305),graphite)
        # Visible furnishings; interior interaction/traversal is not yet migrated.
        part((x-140,y+80,112),(220,85,80),graphite)
        part((x-140,y+50,152),(200,65,20),pearl)
        part((x+30,y-30,103),(110,70,14),wood)
        part((x+30,y-30,80),(12,45,38),graphite)
        part((x+width/2+155,y,19),(190,depth*.72,8),stone)
        part((x+width/2+155,y,25),(170,depth*.72-20,5),water)
        continue
    floors = max(3, round(building['top']/3))
    part((x,y,15+floors*150),(width*.87,depth*.87,floors*300),graphite)
    for floor in range(floors):
        z = 15+floor*300
        part((x,y,z+19),(width+30,depth+30,28),pearl)
        for face in range(4):
            angle = face*90
            along = width if face%2==0 else depth
            setback = (depth if face%2==0 else width)/2
            dx, dy = math.sin(math.radians(angle)), math.cos(math.radians(angle))
            px, py = x+dx*setback, y+dy*setback
            part((px,py,z+125),(along-45,10,160),glass,yaw=-angle)
            part((px+dx*10,py+dy*10,z+253),(along+10,30,81),pearl,yaw=-angle)
            part((px+dx*27,py+dy*27,z+56),(along-10,4,4),cyan,yaw=-angle)
            if detailed:
                part((px+dx*26,py+dy*26,z+243),(along-30,3,4),graphite,yaw=-angle)
                for offset in (-along*.28,0,along*.28):
                    tx,ty=math.cos(math.radians(angle))*offset,-math.sin(math.radians(angle))*offset
                    part((px+tx,py+ty,z+130),(6,17,165),graphite,yaw=-angle)
        if detailed:
            for sx in (-1,1):
                for sy in (-1,1):
                    part((x+sx*(width/2-10),y+sy*(depth/2-10),z+160),(32,32,260),pearl)
    roof = 15+floors*300
    part((x,y,roof+20),(width+55,depth+55,38),pearl)
    part((x,y,roof+80),(width*.65,depth*.65,90),graphite)
    if detailed:
        for n in (-1,0,1):
            part((x+n*width*.2,y,roof+133),(width*.17,depth*.55,8),glass,pitch=8)
        if index%2==0:
            part((x,y,roof+200),(width*.28,depth*.28,180),glass,mesh=cylinder)
            for dz in (130,190,250):
                part((x,y,roof+dz),(width*.30,depth*.30,5),cyan,mesh=cylinder)
        # Deep, human-scale entrance portal on the road-facing side.
        side = -1 if x>0 else 1
        px=x+side*(width/2+20)
        part((px,y,145),(18,180,260),glass)
        part((px+side*12,y,282),(95,220,24),pearl)
        for sign in (-1,1):
            part((px+side*12,y+sign*98,145),(14,8,260),cyan)

# Low planting and pedestrian edges, clear of the road and building footprints.
rng = random.Random(42)
for side in (-1,1):
    for y in (4800,6200,7100,9200,10600,11800):
        x=side*950
        part((x,y,35),(160,320,50),pearl)
        part((x,y,62),(140,300,8),soil)
        part((side*791,y,16),(4,650,3),cyan)
        for n in range(36):
            px,py=x+rng.uniform(-60,60),y+rng.uniform(-135,135)
            height=rng.uniform(30,70)
            part((px,py,68+height/2),(rng.uniform(6,13),2,height),
                 green if n%3 else sage,yaw=rng.uniform(0,180),pitch=rng.uniform(-18,18))
    for y in (5300,10100):
        x=side*920
        part((x,y,48),(85,220,14),wood)
        part((x+side*35,y,78),(10,220,55),pearl)
        for offset in (-85,85):
            part((x,y+offset,29),(60,12,38),graphite)

with open(os.path.join(root,'SourceData/transport-models-import.json'),encoding='utf-8') as stream:
    transport=json.load(stream)
def vehicle(name,position,yaw=0):
    actor=actors.spawn_actor_from_class(unreal.StaticMeshActor,unreal.Vector(*position),rotation(yaw))
    actor.set_actor_label('Future transport / '+name)
    actor.set_folder_path('Future district/Transport')
    actor.static_mesh_component.set_static_mesh(unreal.load_asset(transport[name]['path']))
    actor.static_mesh_component.set_collision_profile_name('NoCollision')
    actor.set_actor_enable_collision(False)
vehicle('hover_bike',(650,4600,7),180)
vehicle('hover_bus',(-440,12400,7),180)
car_class=unreal.load_class(None,'/Script/AnotherWorld.AWAuroraVehicle')
assert car_class
for variant,location,yaw in ((0,(-420,5100,97),180),(1,(450,5900,97),0),(2,(-420,6900,97),180)):
    car=actors.spawn_actor_from_class(car_class,unreal.Vector(*location),rotation(yaw))
    car.set_vehicle_variant(variant)
    car.set_actor_label(('Aurora X9','Skyline X7','Aerodynex X12')[variant]+' / playable everyday car')
    car.set_folder_path('Future district/Transport')

with open(os.path.join(root,'Tools/build_orion_network.py'),encoding='utf-8') as orion_script:
    exec(compile(orion_script.read(),'build_orion_network.py','exec'))

# Create persistent native HISM components, one per mesh/material/spatial cell.
batches=collections.defaultdict(list)
for record in records:
    pos,size,mat,mesh,rot=record
    batches[(mesh.get_path_name(),mat.get_path_name(),int(pos[0]//10000),int(pos[1]//10000))].append(record)
subobjects=unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)
library=unreal.SubobjectDataBlueprintFunctionLibrary
for index,items in enumerate(batches.values()):
    owner=actors.spawn_actor_from_class(unreal.Actor,unreal.Vector(0,0,0))
    owner.set_actor_label('Future district / batch %03d'%index)
    owner.set_folder_path('Future district/Instances')
    owner.get_editor_property('root_component').set_mobility(unreal.ComponentMobility.STATIC)
    params=unreal.AddNewSubobjectParams()
    params.set_editor_property('parent_handle',subobjects.k2_gather_subobject_data_for_instance(owner)[0])
    params.set_editor_property('new_class',unreal.HierarchicalInstancedStaticMeshComponent)
    handle,reason=subobjects.add_new_subobject(params)
    component=library.get_associated_object(library.get_data(handle))
    component.set_mobility(unreal.ComponentMobility.STATIC)
    component.set_static_mesh(items[0][3])
    component.set_material(0,items[0][2])
    component.set_collision_profile_name('NoCollision')
    owner.set_actor_enable_collision(False)
    component.set_cull_distances(23000,30000)
    transforms=[]
    for pos,size,mat,mesh,rot in items:
        transform=unreal.Transform()
        transform.translation=unreal.Vector(*pos)
        transform.rotation=rot.quaternion()
        transform.scale3d=unreal.Vector(*(v/100 for v in size))
        transforms.append(transform)
    component.add_instances(transforms,False,True)

shield=material('HoneycombCanopy',(.15,.75,.9),glow=True,transparent=True)
position=edit.create_material_expression(shield,unreal.MaterialExpressionWorldPosition)
mask=edit.create_material_expression(shield,unreal.MaterialExpressionCustom)
mask.set_editor_property('output_type',unreal.CustomMaterialOutputType.CMOT_FLOAT1)
entry=unreal.CustomInput();entry.set_editor_property('input_name','P')
mask.set_editor_property('inputs',[entry])
mask.set_editor_property('code','float2 p=(P.xy-float2(20000,25000))/7200; float2 s=float2(1,1.7320508); float2 a=p-s*round(p/s); float2 b=p-s*(round(p/s-.5)+.5); float2 h=abs(dot(a,a)<dot(b,b)?a:b); float e=abs(max(dot(h,float2(.5,.8660254)),h.x)-.5); float aa=max(fwidth(e),.001); float edge=1-smoothstep(.006,.006+aa,e); return edge*.18*smoothstep(1000,6000,P.z)*(1-.45*smoothstep(40000,48000,P.z));')
edit.connect_material_expressions(position,'',mask,'P')
edit.connect_material_property(mask,'',unreal.MaterialProperty.MP_OPACITY)
edit.recompile_material(shield)
dome=actors.spawn_actor_from_class(unreal.StaticMeshActor,unreal.Vector(20000,25000,0))
dome.set_actor_label('Future district / visual climate canopy')
dome.static_mesh_component.set_static_mesh(sphere)
dome.static_mesh_component.set_material(0,shield)
dome.set_actor_scale3d(unreal.Vector(3400,3400,960))
dome.static_mesh_component.set_collision_profile_name('NoCollision')
dome.set_actor_enable_collision(False)
dome.static_mesh_component.set_editor_property('cast_shadow',False)

for actor in actors.get_all_level_actors():
    if actor.get_actor_label()=='Authored / photographic HDR sky':
        actor.set_actor_scale3d(unreal.Vector(30000,30000,30000))
    if actor.get_actor_label()=='Street review camera':
        actor.set_actor_location(unreal.Vector(160,4400,150),False,False)
        actor.set_actor_rotation(rotation(90),False)
assert assets.save_directory('/Game/Future',only_if_is_dirty=True,recursive=True)
assert levels.save_current_level()
assert levels.load_level('/Game/Maps/HidrokFuture')
saved=actors.get_all_level_actors()
assert len([a for a in saved if a.actor_has_tag('AWBuildingBlocker')])==177
saved_cars=[a for a in saved if a.get_class()==car_class]
assert len(saved_cars)==3
assert {a.get_editor_property('vehicle_variant') for a in saved_cars}=={0,1,2}
assert len([a for a in saved if a.get_class()==orion_class])==2
assert len([a for a in saved if a.get_class()==lift_class])==4
count=sum(c.get_instance_count() for a in saved for c in a.get_components_by_class(unreal.HierarchicalInstancedStaticMeshComponent))
assert count==len(records)
with open(os.path.join(root,'SourceData/future-district-report.json'),'w',encoding='utf-8') as stream:
    json.dump({'map':'/Game/Maps/HidrokFuture','buildings':177,'detailed_plots':12,
        'playable_cars':['Aurora X9','Skyline X7','Aerodynex X12'],
        'road_hardware':{'wheels_per_car':4,'nominal_wheel_diameter_cm':84,'tyre_width_cm':32,'wheelbase_cm':360,'track_cm':250,'separate_parking_pads_per_car':4},
        'static_transport':2,'orion_services':2,'orion_lifts':4,'glass_pavilions':2,'instances':count,'batches':len(batches),'saved_reload':True,
        'references':['unity/References/Landscaping-concept.png','unity/References/Transport-concept.png','unity/Assets/Scripts/World/FutureArchitecture.cs','unreal/References/Aurora-X9.png','unreal/References/Variant-A.png','unreal/References/Variant-B.png'],
        'limits':['Procedural architecture is a first design pass, not photographic fidelity.',
            'Shield remains a visual prototype. Orion has two operating routes and one station per route; full networks and signalling remain pending.',
            'Pavilion interiors and detailed prop collision remain pending.']},stream,indent=2)
