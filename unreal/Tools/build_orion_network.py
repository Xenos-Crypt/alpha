"""Executed by build_future_district.py with its shared materials/instance records."""

orion_y=8100
orion_depth=-1800
orion_colliders=[]
def orion_solid(name,pos,size,visible=False,mat=graphite):
    actor=actors.spawn_actor_from_class(unreal.StaticMeshActor,unreal.Vector(*pos))
    actor.set_actor_label('Orion collision / '+name)
    actor.set_folder_path('Orion/Structure')
    actor.static_mesh_component.set_static_mesh(cube)
    actor.set_actor_scale3d(unreal.Vector(*(v/100 for v in size)))
    actor.static_mesh_component.set_material(0,mat)
    actor.static_mesh_component.set_collision_profile_name('BlockAll')
    actor.set_actor_hidden_in_game(not visible)
    actor.static_mesh_component.set_editor_property('cast_shadow',visible)
    actor.set_editor_property('tags',['AWOrionStructure'])
    orion_colliders.append(actor)
    return actor

def orion_sign(text,pos,size=40,yaw=180):
    actor=actors.spawn_actor_from_class(unreal.TextRenderActor,unreal.Vector(*pos),rotation(yaw))
    actor.set_actor_label('Orion sign / '+text)
    actor.set_folder_path('Orion/Wayfinding')
    actor.text_render.set_text(text)
    actor.text_render.set_world_size(size)
    actor.text_render.set_text_render_color(unreal.Color(120,225,255,255))
    actor.set_actor_enable_collision(False)
    return actor

def orion_lamp(pos,intensity=12000,radius=1100):
    lamp=actors.spawn_actor_from_class(unreal.PointLight,unreal.Vector(*pos))
    lamp.set_actor_label('Orion / station lighting')
    lamp.set_folder_path('Orion/Lighting')
    lamp.point_light_component.set_mobility(unreal.ComponentMobility.MOVABLE)
    # Compatibility exposure needs modest local fill, not stadium-strength lamps.
    lamp.point_light_component.set_editor_property('intensity',intensity*0.02)
    lamp.point_light_component.set_editor_property('attenuation_radius',radius)
    lamp.point_light_component.set_editor_property('cast_shadows',False)
    lamp.point_light_component.set_light_color(unreal.LinearColor(.72,.86,1,1))

# Regional train: an atmospheric, physically enclosed tunnel below the existing
# surface collision slab. No vacuum tube and no arbitrary free-flight motion.
part((0,orion_y,orion_depth-35),(130000,680,70),graphite)
orion_solid('tunnel floor',(0,orion_y,orion_depth-70),(130000,760,100))
for side in (-1,1):
    part((0,orion_y+side*109,orion_depth+3.5),(130000,25,7),graphite)
    part((0,orion_y+side*290,orion_depth+65),(130000,95,50),pearl)
    part((0,orion_y+side*326,orion_depth+115),(130000,4,5),cyan)
    for x in range(-64000,64001,2000):
        if abs(x)<13000:continue
        part((x,orion_y+side*375,orion_depth+240),(2000,50,620),graphite)
        orion_solid('tunnel side',(x,orion_y+side*375,orion_depth+240),(2000,50,620))
        part((x,orion_y+side*347,orion_depth+300),(30,8,480),pearl)
        part((x,orion_y+side*344,orion_depth+440),(1200,4,6),cyan)
for x in range(-64000,64001,2000):
    if abs(x)<13000:continue
    part((x,orion_y,orion_depth+560),(2000,800,40),graphite)
    orion_solid('tunnel roof',(x,orion_y,orion_depth+560),(2000,800,40))
    orion_lamp((x,orion_y,orion_depth+470),6500,1100)

# Central underground station: 240 m platforms for the 8-section regional set.
part((0,orion_y,orion_depth+580),(26000,2280,40),pearl)
orion_solid('station roof',(0,orion_y,orion_depth+580),(26000,2280,40))
for side in (-1,1):
    part((0,orion_y+side*1120,orion_depth+260),(26000,40,640),pearl)
    orion_solid('station wall',(0,orion_y+side*1120,orion_depth+260),(26000,40,640))
    part((0,orion_y+side*535,orion_depth+40),(24000,710,100),stone)
    orion_solid('regional platform',(0,orion_y+side*535,orion_depth+40),(24000,710,100))
    part((0,orion_y+side*185,orion_depth+94),(24000,12,4),cyan)
    part((0,orion_y+side*1085,orion_depth+310),(25000,10,95),glass)
    part((0,orion_y+side*1065,orion_depth+475),(25000,5,7),cyan)
    for x in range(-11200,11201,1600):
        part((x,orion_y+side*900,orion_depth+270),(35,35,360),graphite)
        part((x,orion_y+side*650,orion_depth+555),(1200,40,7),cyan)
        orion_lamp((x,orion_y+side*620,orion_depth+480),14000,1100)
    for x in (-9000,-5000,-1000,3000,7000,11000):
        part((x,orion_y+side*820,orion_depth+140),(240,75,20),wood)
        for dx in (-85,85):part((x+dx,orion_y+side*820,orion_depth+115),(12,60,50),graphite)
    # A platform-edge guard, with a marked boarding zone rather than an open pit.
    for x,length in ((-5812.5,12375),(6312.5,11375)):
        part((x,orion_y+side*180,orion_depth+195),(length,8,8),graphite)
        orion_solid('platform edge guard',(x,orion_y+side*180,orion_depth+145),(length,8,110))
for side in (-1,1):
    for sy in (-1,1):
        part((side*13000,orion_y+sy*735,orion_depth+260),(40,730,640),pearl)
        orion_solid('station end wall',(side*13000,orion_y+sy*735,orion_depth+260),(40,730,640))
orion_sign('ORION CENTRAL / REGIONAL',(1600,orion_y-1080,orion_depth+375),60,90)
orion_sign('BOARD HERE / E',(500,orion_y-810,orion_depth+260),35,90)

# Retain the elevated system for urban TRAMS. A dedicated 400 m guideway has
# distinct reaction surfaces below its four-section tram, not a floating train.
for x in range(-18000,18001,4000):
    part((x,9000,430),(70,100,860),pearl)
    part((x,8550,850),(140,1020,70),graphite)
    part((x,8550,690),(70,970,45),pearl,roll=-21)
part((0,orion_y,880),(40000,320,40),pearl)
for side in (-1,1):
    part((0,orion_y+side*90,903.5),(40000,25,7),graphite)
    part((0,orion_y+side*162,920),(40000,12,40),graphite)
    part((0,orion_y+side*165,943),(40000,5,5),cyan)
# Central elevated platform and canopy, with structural clearance over the road.
part((0,orion_y-330,940),(5000,360,100),pearl)
orion_solid('elevated tram platform',(0,orion_y-330,940),(5000,360,100))
part((0,orion_y-506,1100),(5000,8,10),graphite)
orion_solid('elevated outside guard',(0,orion_y-506,1045),(5000,10,110))
part((0,orion_y-150,995),(5000,10,4),cyan)
for x,length in ((-1062.5,2875),(1562.5,1875)):
    part((x,orion_y-150,1100),(length,8,8),graphite)
    orion_solid('tram platform edge guard',(x,orion_y-150,1045),(length,8,110))
for x in (-2100,2100):
    part((x,orion_y-330,470),(90,90,940),pearl)
    part((x,orion_y-460,1180),(35,35,390),graphite)
part((0,orion_y-250,1370),(5400,700,40),pearl)
part((0,orion_y-360,1345),(4900,20,8),cyan)
orion_sign('ORION CENTRAL / ELEVATED TRAM',(-1700,orion_y-495,1180),36,90)

orion_class=unreal.load_class(None,'/Script/AnotherWorld.AWOrionLine')
lift_class=unreal.load_class(None,'/Script/AnotherWorld.AWTransitLift')
assert orion_class and lift_class
orion_lines=[]
for elevated,z in ((False,orion_depth),(True,900)):
    line=actors.spawn_actor_from_class(orion_class,unreal.Vector(0,orion_y,z))
    line.configure_route(elevated)
    line.set_actor_label('Orion / elevated urban tram' if elevated else 'Orion / underground regional train')
    line.set_folder_path('Orion/Services');orion_lines.append(line)

def orion_access(name,position,destination,elevated):
    lift=actors.spawn_actor_from_class(lift_class,unreal.Vector(*position))
    lift.set_actor_label('Orion lift / '+name);lift.set_folder_path('Orion/Access')
    lift.set_editor_property('destination',unreal.Vector(*destination))
    lift.set_editor_property('bTramAccess',elevated)
    x,y,z=position
    part((x+80,y,z+70),(20,150,230),pearl)
    part((x+66,y,z+70),(5,120,200),glass)
    part((x+60,y,z+70),(4,8,200),cyan)
    orion_sign(name+' / T',(x+55,y-70,z+170),23,180)
    return lift

orion_access('UNDERGROUND TRAINS',(1000,3800,100),(500,orion_y-540,orion_depth+180),False)
orion_access('ELEVATED TRAMS',(1000,4200,100),(500,orion_y-340,1080),True)
orion_access('STREET EXIT',(500,orion_y-800,orion_depth+180),(1000,3800,107),False)
orion_access('STREET EXIT',(500,orion_y-500,1080),(1000,4200,107),True)

with open(os.path.join(root,'SourceData/orion-network-report.json'),'w',encoding='utf-8') as stream:
    json.dump({'regional':{'route':'underground','sections':8,'nominal_length_m':200,'running_surface_z_cm':orion_depth,'tunnel_length_m':1300,'platform_length_m':240},
        'tram':{'route':'elevated','sections':4,'nominal_length_m':40,'running_surface_z_cm':900,'guideway_length_m':400,'platform_length_m':50},
        'access_lifts':4,'structural_colliders':len(orion_colliders),'reference':'References/Orion-transit.png',
        'limits':['One Central passenger station per line; terminal positions are turnbacks.',
            'Lift interaction transfers the player between landings; a moving lift cabin is not simulated.',
            'Guideway-constrained kinematics and braking are game controllers, not certified maglev engineering.',
            'Full city-to-city networks, evacuation simulation and signalling interlocking remain pending.']},stream,indent=2)
