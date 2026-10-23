# Unity editor commands

Run these from the repository root in PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./unity/Tools/verify-editor.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./unity/Tools/build-web.ps1 -SkipBurst
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./unity/Tools/open-project.ps1
```

The tools prefer `./.unity-editor/Editor/Unity.exe`. They validate that the Package Manager executable and WebGL support exist before launching. The Hub path `C:/Program Files/Unity/Hub/Editor/6000.5.1f1/Editor/` is currently incomplete on this machine; do not hardcode that path in verification commands. The complete project-local editor has its own Package Manager server.

`verify-editor.ps1` defaults to the villa integration review. Pass `-Method AnotherWorld.Editor.AirReview.Run` to run the Air review instead. A play-mode review must exit itself; do not add `-quit` because that can stop verification before it completes. Editor logs are in `unity/Logs`.

An explicitly supplied `-EditorPath` is validated and never silently replaced. Repair an incomplete Hub install through Unity Hub if you want to use it; these scripts do not modify that installation.
