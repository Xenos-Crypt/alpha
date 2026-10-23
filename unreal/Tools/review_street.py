"""Render the real street in the DX11 editor and save a review screenshot."""
import os
import time
import unreal

levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
assert levels.load_level(os.environ.get('ANOTHER_WORLD_REVIEW_MAP','/Game/Maps/HidrokStreet'))
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
camera = next(a for a in actors if a.get_actor_label() == 'Street review camera')
unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).set_level_viewport_camera_info(
    camera.get_actor_location(), camera.get_actor_rotation())
assert levels.save_current_level()
levels.editor_set_game_view(True)
unreal.EditorPythonScripting.set_keep_python_script_alive(True)
output = os.path.abspath(os.path.join(unreal.Paths.project_dir(), 'Saved/Screenshots',
    os.environ.get('ANOTHER_WORLD_REVIEW_OUTPUT','StreetReviewFinal.png')))
if os.path.isfile(output):
    os.replace(output, output + '.' + str(time.time_ns()) + '.previous.png')
os.makedirs(os.path.dirname(output), exist_ok=True)
started = time.time()
captured = False

def tick(delta):
    global captured
    elapsed = time.time() - started
    if not captured and elapsed > float(os.environ.get('ANOTHER_WORLD_REVIEW_DELAY','15')):
        captured = True
        # Use the viewport screenshot path. AutomationLibrary forces every loaded
        # material/debug permutation to compile, including offscreen city assets.
        unreal.SystemLibrary.execute_console_command(
            unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world(),
            'HighResShot 1280x720 filename="' + output.replace('\\', '/') + '"')
    if (captured and os.path.isfile(output)) or elapsed > 240:
        unreal.unregister_slate_post_tick_callback(handle)
        unreal.EditorPythonScripting.set_keep_python_script_alive(False)

handle = unreal.register_slate_post_tick_callback(tick)
