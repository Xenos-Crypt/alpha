"""Run inside Unreal Editor with -ExecutePythonScript to create the starter map."""
import unreal

MAP = '/Game/Maps/CityBlock'
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
assets = unreal.EditorAssetLibrary
if assets.does_asset_exist(MAP):
    assert levels.load_level(MAP), 'Could not load starter map'
    for existing in actors.get_all_level_actors():
        actors.destroy_actor(existing)
else:
    assert levels.new_level(MAP), 'Could not create starter map'

def material(name, colour, metallic=0.0, roughness=0.65):
    path = '/Game/Materials/' + name
    result = assets.load_asset(path) if assets.does_asset_exist(path) else None
    if result:
        return result
    result = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
        name, '/Game/Materials', unreal.Material, unreal.MaterialFactoryNew())
    colour_node = unreal.MaterialEditingLibrary.create_material_expression(
        result, unreal.MaterialExpressionConstant3Vector)
    colour_node.set_editor_property('constant', unreal.LinearColor(*colour))
    unreal.MaterialEditingLibrary.connect_material_property(colour_node, '', unreal.MaterialProperty.MP_BASE_COLOR)
    for prop, value in [(unreal.MaterialProperty.MP_METALLIC, metallic),
                        (unreal.MaterialProperty.MP_ROUGHNESS, roughness)]:
        node = unreal.MaterialEditingLibrary.create_material_expression(result, unreal.MaterialExpressionConstant)
        node.set_editor_property('r', value)
        unreal.MaterialEditingLibrary.connect_material_property(node, '', prop)
    unreal.MaterialEditingLibrary.recompile_material(result)
    assets.save_asset(path)
    return result

road = material('Road', (0.045, 0.055, 0.065))
paving = material('Paving', (0.52, 0.57, 0.59))
grass = material('Grass', (0.08, 0.23, 0.12))
frame = material('VillaFrame', (0.035, 0.05, 0.065), 0.7)
glass = material('VillaGlazing', (0.09, 0.28, 0.34), 0.65, 0.12)
white = material('RoadPaint', (0.85, 0.88, 0.84))
wood = material('WarmFloor', (0.34, 0.18, 0.085))
cube = assets.load_asset('/Engine/BasicShapes/Cube')
sphere = assets.load_asset('/Engine/BasicShapes/Sphere')

def shape(name, position, size, surface, mesh=cube):
    actor = actors.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(*position))
    actor.set_actor_label(name)
    component = actor.static_mesh_component
    component.set_static_mesh(mesh)
    component.set_material(0, surface)
    actor.set_actor_scale3d(unreal.Vector(*(v / 100 for v in size)))
    return actor

# Dimensions are centimetres. A compact block establishes the scale for later ports.
shape('Hidrok terrain', (0, 0, -60), (28000, 28000, 100), grass)
for axis in range(2):
    size = (28000, 1800, 25) if axis == 0 else (1800, 28000, 25)
    shape('Main road', (0, 0, 0), size, road)
    for side in (-1, 1):
        position = (0, side * 1150, 25) if axis == 0 else (side * 1150, 0, 25)
        size = (28000, 500, 60) if axis == 0 else (500, 28000, 60)
        shape('Raised pavement', position, size, paving)
    for distance in range(-13000, 13001, 800):
        if abs(distance) < 1800:
            continue
        position = (distance, 0, 16) if axis == 0 else (0, distance, 16)
        size = (350, 15, 3) if axis == 0 else (15, 350, 3)
        shape('Centre marking', position, size, white)

for x in (-7000, -3500, 3500, 7000):
    for side in (-1, 1):
        y = side * 3800
        shape('Villa terrace', (x, y, 60), (2700, 2400, 100), paving)
        shape('Villa oak floor', (x, y, 130), (2200, 1700, 40), wood)
        shape('Villa floating roof', (x, y, 500), (2450, 1950, 70), frame)
        for dx in (-1050, 1050):
            shape('Side glazing', (x + dx, y, 320), (15, 1650, 340), glass)
            for dy in (-800, 800):
                shape('Structural post', (x + dx, y + dy, 320), (35, 35, 360), frame)
        shape('Rear glazing', (x, y + side * 800, 320), (2100, 15, 340), glass)
        # Two front panels leave a central, walkable doorway.
        for dx in (-700, 700):
            shape('Front glazing', (x + dx, y - side * 800, 320), (700, 15, 340), glass)
        for step in range(3):
            shape('Entrance step', (x, y - side * (950 + step * 110), 100 - step * 30),
                  (500, 130, 30), paving)
        for dx in (-1300, 1300):
            shape('Planting canopy', (x + dx, y - side * 1250, 270), (450, 450, 500), grass, sphere)

sun = actors.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 8000), unreal.Rotator(-38, -28, 0))
sun.light_component.set_editor_property('intensity', 3.0)
actors.spawn_actor_from_class(unreal.SkyAtmosphere, unreal.Vector(0, 0, 0))
sky = actors.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 3000))
sky.light_component.set_editor_property('real_time_capture', True)
actors.spawn_actor_from_class(unreal.PlayerStart, unreal.Vector(-2400, -1100, 250))
assert len(actors.get_all_level_actors()) > 150, 'Starter geometry is missing'
assert levels.save_current_level(), 'Could not save starter map'
assets.save_directory('/Game', only_if_is_dirty=True, recursive=True)
unreal.log('ANOTHER_WORLD_BUILD_OK ' + MAP)
