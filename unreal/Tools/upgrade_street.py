"""Create a reviewed street art pass from the imported layout, preserving its map."""
import json
import math
import os
import unreal

project = unreal.Paths.project_dir()
repo = os.path.abspath(os.path.join(project, '../..'))
assets = unreal.EditorAssetLibrary
levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
factory = unreal.AssetToolsHelpers.get_asset_tools()
assert levels.load_level('/Game/Maps/HidrokWebsite')
assert unreal.EditorLoadingAndSavingUtils.save_map(
    unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world(), '/Game/Maps/HidrokStreet')
assert levels.load_level('/Game/Maps/HidrokStreet')
with open(os.path.join(repo, 'unreal/SourceData/website-world.json'), encoding='utf-8') as f:
    data = json.load(f)

def load_texture(filename, normal=False, linear=False):
    name = os.path.splitext(filename)[0].replace('-', '_')
    path = '/Game/Realism/Textures/' + name
    if not assets.does_asset_exist(path):
        task = unreal.AssetImportTask()
        task.set_editor_property('filename', os.path.join(repo, 'assets', filename))
        task.set_editor_property('destination_path', '/Game/Realism/Textures')
        task.set_editor_property('destination_name', name)
        task.set_editor_property('automated', True)
        task.set_editor_property('save', True)
        factory.import_asset_tasks([task])
    texture = assets.load_asset(path)
    assert texture, filename
    texture.set_editor_property('max_texture_size', 1024)
    if normal:
        texture.set_editor_property('compression_settings', unreal.TextureCompressionSettings.TC_NORMALMAP)
        texture.set_editor_property('flip_green_channel', True)
    if normal or linear:
        texture.set_editor_property('srgb', False)
    return texture

def constant(material, value, prop):
    node = unreal.MaterialEditingLibrary.create_material_expression(material, unreal.MaterialExpressionConstant)
    node.set_editor_property('r', value)
    unreal.MaterialEditingLibrary.connect_material_property(node, '', prop)

def material(name, colour, surface=None, metallic=0, roughness=.8):
    path = '/Game/Realism/Materials/' + name
    result = assets.load_asset(path) if assets.does_asset_exist(path) else factory.create_asset(
        name, '/Game/Realism/Materials', unreal.Material, unreal.MaterialFactoryNew())
    unreal.MaterialEditingLibrary.delete_all_material_expressions(result)
    tint = unreal.MaterialEditingLibrary.create_material_expression(result, unreal.MaterialExpressionConstant3Vector)
    tint.set_editor_property('constant', unreal.LinearColor(*colour))
    unreal.MaterialEditingLibrary.connect_material_property(tint, '', unreal.MaterialProperty.MP_BASE_COLOR)
    constant(result, metallic, unreal.MaterialProperty.MP_METALLIC)
    constant(result, roughness, unreal.MaterialProperty.MP_ROUGHNESS)
    if surface:
        # World-position triplanar projection: metre-sized texels on scaled cubes.
        pos = unreal.MaterialEditingLibrary.create_material_expression(result, unreal.MaterialExpressionWorldPosition)
        norm = unreal.MaterialEditingLibrary.create_material_expression(result, unreal.MaterialExpressionVertexNormalWS)
        diffuse = load_texture(surface + '-diff.jpg')
        rough = load_texture(surface + '-rough.jpg', linear=True)
        normal = load_texture(surface + '-normal.jpg', normal=True)
        for texture, prop, mode in [(diffuse, unreal.MaterialProperty.MP_BASE_COLOR, 0),
                                    (rough, unreal.MaterialProperty.MP_ROUGHNESS, 1)]:
            node = unreal.MaterialEditingLibrary.create_material_expression(result, unreal.MaterialExpressionCustom)
            node.set_editor_property('output_type', unreal.CustomMaterialOutputType.CMOT_FLOAT3 if mode == 0 else unreal.CustomMaterialOutputType.CMOT_FLOAT1)
            inputs = []
            for input_name in ['P', 'N', 'T']:
                entry = unreal.CustomInput()
                entry.set_editor_property('input_name', input_name)
                inputs.append(entry)
            node.set_editor_property('inputs', inputs)
            node.set_editor_property('code', 'float3 w=pow(abs(N),8); w/=max(w.x+w.y+w.z,0.001); float3 p=P/200; float3 c=Texture2DSample(T,TSampler,p.yz).rgb*w.x+Texture2DSample(T,TSampler,p.xz).rgb*w.y+Texture2DSample(T,TSampler,p.xy).rgb*w.z; return ' + ('c;' if mode == 0 else 'c.r;'))
            tex = unreal.MaterialEditingLibrary.create_material_expression(result, unreal.MaterialExpressionTextureObject)
            tex.set_editor_property('texture', texture)
            unreal.MaterialEditingLibrary.connect_material_expressions(pos, '', node, 'P')
            unreal.MaterialEditingLibrary.connect_material_expressions(norm, '', node, 'N')
            unreal.MaterialEditingLibrary.connect_material_expressions(tex, '', node, 'T')
            if mode == 0:
                multiply = unreal.MaterialEditingLibrary.create_material_expression(result, unreal.MaterialExpressionMultiply)
                unreal.MaterialEditingLibrary.connect_material_expressions(node, '', multiply, 'A')
                unreal.MaterialEditingLibrary.connect_material_expressions(tint, '', multiply, 'B')
                unreal.MaterialEditingLibrary.connect_material_property(multiply, '', prop)
            else:
                unreal.MaterialEditingLibrary.connect_material_property(node, '', prop)
        # Use the same metre-scale projection for normals. Local cube UVs stretch
        # a single normal tile over an entire road and create false lighting bands.
        result.set_editor_property('tangent_space_normal', False)
        node = unreal.MaterialEditingLibrary.create_material_expression(result, unreal.MaterialExpressionCustom)
        node.set_editor_property('output_type', unreal.CustomMaterialOutputType.CMOT_FLOAT3)
        inputs = []
        for input_name in ['P', 'N', 'T']:
            entry = unreal.CustomInput()
            entry.set_editor_property('input_name', input_name)
            inputs.append(entry)
        node.set_editor_property('inputs', inputs)
        node.set_editor_property('code', 'float3 w=pow(abs(N),8); w/=max(w.x+w.y+w.z,0.001); float3 p=P/200; float2 a=(Texture2DSample(T,TSampler,p.yz).rg*2-1)*0.25; float2 b=(Texture2DSample(T,TSampler,p.xz).rg*2-1)*0.25; float2 c=(Texture2DSample(T,TSampler,p.xy).rg*2-1)*0.25; float3 x=float3(sqrt(saturate(1-dot(a,a)))*sign(N.x),a.x,a.y); float3 y=float3(b.x,sqrt(saturate(1-dot(b,b)))*sign(N.y),b.y); float3 z=float3(c.x,c.y,sqrt(saturate(1-dot(c,c)))*sign(N.z)); return normalize(x*w.x+y*w.y+z*w.z);')
        tex = unreal.MaterialEditingLibrary.create_material_expression(result, unreal.MaterialExpressionTextureObject)
        tex.set_editor_property('texture', normal)
        tex.set_editor_property('sampler_type', unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL)
        unreal.MaterialEditingLibrary.connect_material_expressions(pos, '', node, 'P')
        unreal.MaterialEditingLibrary.connect_material_expressions(norm, '', node, 'N')
        unreal.MaterialEditingLibrary.connect_material_expressions(tex, '', node, 'T')
        unreal.MaterialEditingLibrary.connect_material_property(node, '', unreal.MaterialProperty.MP_NORMAL)
    unreal.MaterialEditingLibrary.recompile_material(result)
    return result

brick = material('PhotographedBrick', (.5,.3,.2), 'brick')
stone = material('PhotographedPlaster', (.6,.6,.55), 'plaster')
paving = material('PhotographedPaving', (.4,.4,.4), 'paving')
asphalt = material('PhotographedAsphalt', (.3,.3,.3), 'asphalt')
grass = material('PhotographedGround', (.1,.2,.1), 'grass')
metal = material('PaintedWindowFrames', (.035,.04,.045), metallic=.45, roughness=.34)
glass = material('WindowReflection', (.11,.16,.19), metallic=.65, roughness=.16)
dark = material('InteriorShadow', (.045,.04,.032), roughness=.95)
paint = material('RoadPaint', (.66,.64,.53), roughness=.9)
cube = assets.load_asset('/Engine/BasicShapes/Cube')

def box(label, pos, size, mat):
    actor = actors.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(*pos))
    actor.set_actor_label('Street art / ' + label)
    actor.set_folder_path('Realism street / Architecture')
    actor.set_actor_scale3d(unreal.Vector(*(v / 100 for v in size)))
    actor.static_mesh_component.set_static_mesh(cube)
    actor.static_mesh_component.set_material(0, mat)
    return actor

# Fix every light instead of hiding the unbuilt-lighting warning.
for actor in actors.get_all_level_actors():
    if isinstance(actor, unreal.DirectionalLight):
        actor.light_component.set_mobility(unreal.ComponentMobility.MOVABLE)
        actor.light_component.set_editor_property('intensity', 5.0)
        actor.light_component.set_editor_property('atmosphere_sun_light', True)
        actor.set_actor_rotation(unreal.Rotator(-42, -35, 0), False)
    if isinstance(actor, unreal.SkyLight):
        actor.light_component.set_mobility(unreal.ComponentMobility.MOVABLE)
        actor.light_component.set_editor_property('intensity', 1.2)
        actor.light_component.set_editor_property('real_time_capture', False)
        actor.light_component.set_editor_property('source_type', unreal.SkyLightSourceType.SLS_SPECIFIED_CUBEMAP)
        actor.light_component.set_editor_property('cubemap', load_texture('sky.hdr'))

# The imported road/ground planes became thin boxes: replace their surface maps.
for actor in actors.get_all_level_actors():
    if not isinstance(actor, unreal.StaticMeshActor):
        continue
    scale = actor.get_actor_scale3d()
    location = actor.get_actor_location()
    if max(abs(scale.x), abs(scale.y), abs(scale.z)) > 300:
        actor.static_mesh_component.set_material(0, grass if max(abs(scale.x), abs(scale.y), abs(scale.z)) > 1000 else asphalt)
    elif abs(location.z) < 20 and max(abs(scale.x), abs(scale.y)) > 15:
        actor.static_mesh_component.set_material(0, paving)

selected = sorted(data['buildings'], key=lambda b: math.hypot(b['x'], b['z'] - 20))[:6]
for index, building in enumerate(selected):
    x, y = building['x']*100, building['z']*100
    width, depth, height = building['w']*100, building['d']*100, building['top']*100
    for actor in list(actors.get_all_level_actors()):
        if not isinstance(actor, unreal.StaticMeshActor) or not actor.get_actor_label().startswith('Website geometry '):
            continue
        pos = actor.get_actor_location()
        if abs(pos.x-x) < width/2+65 and abs(pos.y-y) < depth/2+65 and pos.z > 20:
            actors.destroy_actor(actor)
    wall = brick if index % 2 == 0 else stone
    floors = max(2, round((height-30)/300))
    for floor in range(floors):
        z = 15 + floor*300
        box('floor slab', (x,y,z+8), (width,depth,16), stone)
        for axis, span, offset in [(0,width,depth/2),(1,depth,width/2)]:
            for side in (-1,1):
                def facade(label, along, zz, a, h, thickness, mat, inset=0):
                    pos = (x+along,y+side*(offset-inset),zz) if axis == 0 else (x+side*(offset-inset),y+along,zz)
                    size = (a,thickness,h) if axis == 0 else (thickness,a,h)
                    return box(label,pos,size,mat)
                facade('masonry lower band',0,z+47,span,80,25,wall)
                facade('masonry lintel band',0,z+273,span,54,25,wall)
                for bay in range(3):
                    centre = -span/2 + (bay+.5)*span/3
                    facade('recessed interior',centre,z+165,span/3-50,160,8,dark,80)
                    facade('window glass',centre,z+166,span/3-58,151,4,glass,15)
                    facade('window sill',centre,z+86,span/3-27,10,45,stone,-12)
                    for dx in (-1,1):
                        facade('window jamb',centre+dx*(span/6-24),z+166,12,165,18,metal,6)
                    facade('window mullion',centre,z+166,7,155,12,metal,6)
                    facade('window transom',centre,z+190,span/3-45,7,12,metal,6)
                for pier in range(4):
                    facade('masonry pier',-span/2+pier*span/3,z+166,50,165,30,wall)
    roof_z = 15+floors*300
    box('roof slab',(x,y,roof_z),(width+20,depth+20,24),stone)
    for side in (-1,1):
        box('parapet',(x,y+side*depth/2,roof_z+35),(width+35,30,70),wall)
        box('parapet',(x+side*width/2,y,roof_z+35),(30,depth+35,70),wall)
        box('drain pipe',(x+side*(width/2+12),y-depth/2+12,roof_z/2),(9,9,roof_z),metal)
    # Separate street-facing door assembly at ground level.
    side = -1 if y > 0 else 1
    box('entrance',(x,y+side*(depth/2+3),135),(110,12,240),metal)
    box('entrance glazing',(x,y+side*(depth/2+11),160),(82,4,155),glass)
    box('door handle',(x+34,y+side*(depth/2+18),125),(5,8,30),metal)
    box('entrance canopy',(x,y+side*(depth/2+55),280),(180,120,14),metal)

# Give the original road grid physical surfaces and separate worn-colour markings.
for road in range(-4,5):
    for axis in range(2):
        pos = (road*4000,0,3) if axis == 0 else (0,road*4000,3)
        size = (1550,33000,8) if axis == 0 else (33000,1550,8)
        box('asphalt road',pos,size,asphalt)
for y in range(-14000,15000,800):
    if abs(y % 4000) < 900 or abs(y % 4000) > 3100:
        continue
    box('centre dash',(0,y,8),(10,280,1),paint)

# A known street-height viewpoint avoids starting underneath the imported ground.
view_rotation = unreal.Rotator()
view_rotation.set_editor_property('pitch', 1.0)
view_rotation.set_editor_property('yaw', 68.0)
view_rotation.set_editor_property('roll', 0.0)
camera = actors.spawn_actor_from_class(unreal.CameraActor, unreal.Vector(160, 4200, 170), view_rotation)
camera.set_actor_label('Street review camera')
camera.camera_component.set_editor_property('field_of_view', 72)
unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).set_level_viewport_camera_info(
    unreal.Vector(160,4200,170), view_rotation)
assert levels.save_current_level()
assets.save_directory('/Game/Realism', only_if_is_dirty=True, recursive=True)
with open(os.path.join(repo,'unreal/SourceData/street-art-report.json'),'w',encoding='utf-8') as f:
    json.dump({'map':'/Game/Maps/HidrokStreet','upgraded_buildings':len(selected),
        'source_positions':[{'x':b['x'],'z':b['z']} for b in selected],
        'lighting':'Movable daylight and HDR environment', 'render_verified':False,
        'limits':['Procedural masonry modules, not scanned architecture.',
                  'Six buildings only; citywide visual replacement pending.',
                  'Opaque reflective glazing; no live interior reflections.',
                  'No Lumen on the DirectX 11 compatibility preview.']},f,indent=2)
