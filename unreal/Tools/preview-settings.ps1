function Get-AWPreviewCommands {
    param([switch]$FullQuality)
    if ($FullQuality) { return 't.IdleWhenNotForeground 0' }
    # Launch-only compatibility profile for the Intel HD 530 workstation.
    # Asset detail and the project's high-end rendering settings are retained.
    # TSR alone measured ~150 ms/frame on this GPU. Explicitly choose FXAA;
    # lowering sg.AntiAliasingQuality leaves TSR selected and does not fix it.
    return 'sg.ViewDistanceQuality 1,sg.AntiAliasingQuality 1,r.AntiAliasingMethod 1,r.TemporalAA.Upsampling 0,sg.ShadowQuality 1,sg.GlobalIlluminationQuality 0,sg.ReflectionQuality 0,sg.PostProcessQuality 0,sg.TextureQuality 1,sg.EffectsQuality 0,sg.FoliageQuality 0,r.ScreenPercentage 85,r.Shadow.DistanceScale 0.5,t.IdleWhenNotForeground 0'
}
