using UnrealBuildTool;

public class AnotherWorldEditorTarget : TargetRules
{
    public AnotherWorldEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        ExtraModuleNames.Add("AnotherWorld");
    }
}
