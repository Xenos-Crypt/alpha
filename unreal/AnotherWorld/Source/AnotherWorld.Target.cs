using UnrealBuildTool;
using System.Collections.Generic;

public class AnotherWorldTarget : TargetRules
{
    public AnotherWorldTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        ExtraModuleNames.Add("AnotherWorld");
    }
}
