using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using System.Runtime.InteropServices;

namespace AnotherWorld.Rendering
{
    public enum QualityPreset { Low, Medium, High }

    public sealed class ScalableQuality : MonoBehaviour
    {
        public QualityPreset Preset { get; private set; }
        public bool MenuOpen { get; private set; }
        public int FrameCap { get; private set; }
        UniversalRenderPipelineAsset[] pipelines;
        Camera view;
        Volume volume;
        Light sun;
        GUIStyle title, copy;
        public static ScalableQuality Instance { get; private set; }
        [DllImport("__Internal")] static extern int AW_IsMobileBrowser();

        public void Initialize(Camera camera, Light mainLight)
        {
            Instance = this; view = camera; sun = mainLight;
            pipelines = new UniversalRenderPipelineAsset[3];
            for (int i=0;i<3;i++)
            {
                var source = Resources.Load<UniversalRenderPipelineAsset>("Quality/" + (QualityPreset)i);
                if (source == null) throw new System.InvalidOperationException("Missing URP quality assets. Run Another World > Set up URP project in the Editor.");
                pipelines[i] = Instantiate(source);
            }
            var go = new GameObject("Global post processing");
            volume = go.AddComponent<Volume>();volume.isGlobal=true;volume.priority=10;
            volume.profile=ScriptableObject.CreateInstance<VolumeProfile>();
            var grade=volume.profile.Add<ColorAdjustments>();grade.contrast.Override(6);grade.saturation.Override(4);
            var tonemap=volume.profile.Add<Tonemapping>();tonemap.mode.Override(TonemappingMode.ACES);
            volume.profile.Add<Bloom>();volume.profile.Add<MotionBlur>();
            bool mobile=Application.isMobilePlatform;
            #if UNITY_WEBGL && !UNITY_EDITOR
            mobile=AW_IsMobileBrowser()!=0;
            #endif
            FrameCap=PlayerPrefs.GetInt("frameCap",mobile?30:60);if(FrameCap!=30&&FrameCap!=60)FrameCap=60;
            int selected=PlayerPrefs.GetInt("quality",mobile?0:1);
            SetQuality(((QualityPreset)Mathf.Clamp(selected,0,2)).ToString());
            Application.runInBackground=false;
        }

        // Public string entry point is also available to the Web template's SendMessage.
        public void SetQuality(string name)
        {
            if(!System.Enum.TryParse(name,true,out QualityPreset next))return;
            Preset=next;var pipeline=pipelines[(int)Preset];
            view.farClipPlane=Preset==QualityPreset.Low?330:Preset==QualityPreset.Medium?480:650;
            RenderSettings.fogStartDistance=Preset==QualityPreset.Low?140:220;
            RenderSettings.fogEndDistance=view.farClipPlane-30;
            QualitySettings.renderPipeline=pipeline;GraphicsSettings.defaultRenderPipeline=pipeline;
            QualitySettings.globalTextureMipmapLimit=Preset==QualityPreset.Low?1:0;
            QualitySettings.anisotropicFiltering=Preset==QualityPreset.Low?AnisotropicFiltering.Disable:AnisotropicFiltering.ForceEnable;
            QualitySettings.vSyncCount=0;Application.targetFrameRate=FrameCap;
            sun.shadows=Preset==QualityPreset.Low?LightShadows.None:Preset==QualityPreset.Medium?LightShadows.Hard:LightShadows.Soft;
            var data=view.GetUniversalAdditionalCameraData();
            data.renderPostProcessing=Preset!=QualityPreset.Low;
            data.antialiasing=Preset==QualityPreset.Low?AntialiasingMode.None:AntialiasingMode.SubpixelMorphologicalAntiAliasing;
            data.antialiasingQuality=Preset==QualityPreset.High?AntialiasingQuality.High:AntialiasingQuality.Medium;
            volume.enabled=Preset!=QualityPreset.Low;
            volume.profile.TryGet<Bloom>(out var bloom);bloom.active=Preset==QualityPreset.High;bloom.intensity.Override(.23f);bloom.threshold.Override(1.1f);
            volume.profile.TryGet<MotionBlur>(out var motion);motion.active=Preset==QualityPreset.High;motion.intensity.Override(.12f);motion.clamp.Override(.025f);
            PlayerPrefs.SetInt("quality",(int)Preset);PlayerPrefs.Save();
        }

        public void SetFrameCap(int cap) { FrameCap=cap==30?30:60;Application.targetFrameRate=FrameCap;PlayerPrefs.SetInt("frameCap",FrameCap);PlayerPrefs.Save(); }
        void Update(){if(Input.GetKeyDown(KeyCode.Escape))MenuOpen=!MenuOpen;}
        void OnGUI()
        {
            if(pipelines==null)return;
            if(title==null){title=new GUIStyle(GUI.skin.label){fontSize=22,fontStyle=FontStyle.Bold};copy=new GUIStyle(GUI.skin.label){fontSize=14,wordWrap=true};}
            float width=Mathf.Min(430,Screen.width-24);
            if(GUI.Button(new Rect(Screen.width-126,12,114,36),"Settings / Esc"))MenuOpen=!MenuOpen;
            if(!MenuOpen)return;
            GUILayout.BeginArea(new Rect(Screen.width-width-12,58,width,330),GUI.skin.box);
            GUILayout.Label("Scalable quality",title);GUILayout.Space(12);
            GUILayout.BeginHorizontal();foreach(QualityPreset preset in System.Enum.GetValues(typeof(QualityPreset)))
            {GUI.backgroundColor=Preset==preset?new Color(.35f,.7f,.65f):Color.white;if(GUILayout.Button(preset.ToString(),GUILayout.Height(42)))SetQuality(preset.ToString());}
            GUI.backgroundColor=Color.white;GUILayout.EndHorizontal();GUILayout.Space(12);
            string[] descriptions={"Mobile: no dynamic shadows or post-processing. Half-resolution textures; reduced render scale.","Laptop: hard shadows, sharp textures and color grading.","Desktop: soft shadows, sharp textures, anti-aliasing, bloom and camera motion blur."};
            GUILayout.Label(descriptions[(int)Preset],copy);GUILayout.Space(14);
            GUILayout.Label("Frame limit: "+FrameCap+" FPS",copy);GUILayout.BeginHorizontal();
            if(GUILayout.Button((FrameCap==30?"✓ ":"")+"30 FPS",GUILayout.Height(38)))SetFrameCap(30);
            if(GUILayout.Button((FrameCap==60?"✓ ":"")+"60 FPS",GUILayout.Height(38)))SetFrameCap(60);
            GUILayout.EndHorizontal();GUILayout.Space(12);GUILayout.Label("Choose lower quality for smoother play. Press Esc to return.",copy);
            GUILayout.EndArea();
        }
        void OnDestroy(){if(pipelines!=null)foreach(var p in pipelines)if(p)Destroy(p);if(volume&&volume.profile)Destroy(volume.profile);if(Instance==this)Instance=null;}
    }
}
