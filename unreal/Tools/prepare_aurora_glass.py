import unreal
assets=unreal.EditorAssetLibrary
mesh=assets.load_asset('/Game/FutureTransport/aurora_x9_body/aurora_x9_body/StaticMeshes/aurora_x9_body')
for index in range(mesh.get_num_sections(0)):
    unreal.log('AURORA_SLOT %s %s'%(index,mesh.get_material(index).get_path_name()))
factory=unreal.AssetToolsHelpers.get_asset_tools()
mat=assets.load_asset('/Game/FutureTransport/M_AuroraCockpitCamera') if assets.does_asset_exist('/Game/FutureTransport/M_AuroraCockpitCamera') else None
created=not bool(mat)
if not mat:
    mat=factory.create_asset('M_AuroraCockpitCamera','/Game/FutureTransport',unreal.Material,unreal.MaterialFactoryNew())
if created:
    edit=unreal.MaterialEditingLibrary
    mat.set_editor_property('two_sided',True)
    mat.set_editor_property('blend_mode',unreal.BlendMode.BLEND_MASKED)
    # Fade only the canopy around the cockpit camera; retain the visible seats/body.
    position=edit.create_material_expression(mat,unreal.MaterialExpressionWorldPosition)
    camera=edit.create_material_expression(mat,unreal.MaterialExpressionCameraPositionWS)
    mask=edit.create_material_expression(mat,unreal.MaterialExpressionCustom)
    mask.set_editor_property('output_type',unreal.CustomMaterialOutputType.CMOT_FLOAT1)
    inputs=[]
    for name in ('P','C'):
        entry=unreal.CustomInput();entry.set_editor_property('input_name',name);inputs.append(entry)
    mask.set_editor_property('inputs',inputs)
    mask.set_editor_property('code','return distance(P,C)>240 ? 1 : 0;')
    edit.connect_material_expressions(position,'',mask,'P')
    edit.connect_material_expressions(camera,'',mask,'C')
    edit.connect_material_property(mask,'',unreal.MaterialProperty.MP_OPACITY_MASK)
    colour=edit.create_material_expression(mat,unreal.MaterialExpressionConstant3Vector)
    colour.set_editor_property('constant',unreal.LinearColor(.018,.045,.065,1))
    edit.connect_material_property(colour,'',unreal.MaterialProperty.MP_BASE_COLOR)
    for prop,value in ((unreal.MaterialProperty.MP_METALLIC,.5),(unreal.MaterialProperty.MP_ROUGHNESS,.16)):
        node=edit.create_material_expression(mat,unreal.MaterialExpressionConstant)
        node.set_editor_property('r',value)
        edit.connect_material_property(node,'',prop)
    edit.recompile_material(mat)
for body_name in ('aurora_x9_body','skyline_x7_body','aerodynex_x12_body','orion_regional_cab','orion_regional_coach','orion_tram_cab','orion_tram_coach'):
    path='/Game/FutureTransport/%s/%s/StaticMeshes/%s'%(body_name,body_name,body_name)
    if not assets.does_asset_exist(path):
        continue
    mesh=assets.load_asset(path)
    found=False
    for index in range(mesh.get_num_sections(0)):
        if 'cockpit' in mesh.get_material(index).get_name().lower():
            mesh.set_material(index,mat);found=True
    assert found,body_name
assert assets.save_directory('/Game/FutureTransport',only_if_is_dirty=True,recursive=True)
