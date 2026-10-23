# User visual targets

The supplied concept boards are preserved here for repeatable visual comparisons. They are outside `Assets` and are not included in the Unity player.

- `Landscaping-concept.png`: https://chatgpt.com/s/m_6ad24c4812f48191b5dad52a8132b1ce
- `Transport-concept.png`: https://chatgpt.com/s/m_6ad24f6f81a88191871d4f0090e587e6

After a relevant visual change, run `AnotherWorld.Editor.LandscapeTransportReview.Run` with a graphics-capable Unity editor. Inspect the actual `Logs/reference-*.png` frames against these boards. Generate a contact sheet with:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File unity/Tools/make-reference-board.ps1
```

Check proportions, attachment of trim and lights, planting visibility, materials, roads/boarding clearance, and actual browser rendering. The reference-render review uses editor-only ordinary renderers to capture normally instanced meshes; browser checks must exercise the actual GPU-instanced build. Passing asset checks alone does not establish a visual match. Report remaining differences honestly.
