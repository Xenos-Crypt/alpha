using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using AnotherWorld.World;

namespace AnotherWorld.Editor
{
    [InitializeOnLoad]
    public static class ProjectSetup
    {
        const string ScenePath="Assets/Scenes/Neighbourhood.unity";
        static ProjectSetup()
        {
            EditorApplication.delayCall+=()=>{if(!EditorApplication.isCompiling&&!EditorApplication.isPlayingOrWillChangePlaymode&&!File.Exists(ScenePath))Setup();};
        }
        [MenuItem("Another World/Set up URP project")]
        public static void Setup()
        {
            Directory.CreateDirectory("Assets/Scenes");Directory.CreateDirectory("Assets/Resources/Quality");Directory.CreateDirectory("Assets/Resources/Materials");AssetDatabase.Refresh();
            string rendererPath="Assets/Resources/Quality/WebRenderer.asset";
            var renderer=AssetDatabase.LoadAssetAtPath<UniversalRendererData>(rendererPath);
            if(!renderer)
            {
                renderer=ScriptableObject.CreateInstance<UniversalRendererData>();
                renderer.postProcessData=AssetDatabase.LoadAssetAtPath<PostProcessData>("Packages/com.unity.render-pipelines.universal/Runtime/Data/PostProcessData.asset");
                AssetDatabase.CreateAsset(renderer,rendererPath);
            }
            var pipelines=new UniversalRenderPipelineAsset[3];
            string[] names={"Low","Medium","High"};
            for(int level=0;level<3;level++)
            {
                string path="Assets/Resources/Quality/"+names[level]+".asset";
                var pipeline=AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(path);
                if(!pipeline){pipeline=UniversalRenderPipelineAsset.Create(renderer);AssetDatabase.CreateAsset(pipeline,path);}
                var serialized=new SerializedObject(pipeline);
                SetBool(serialized,"m_MainLightShadowsSupported",level>0);
                SetBool(serialized,"m_AdditionalLightShadowsSupported",false);
                SetBool(serialized,"m_SoftShadowsSupported",level==2);
                SetBool(serialized,"m_UseSRPBatcher",true);
                serialized.ApplyModifiedPropertiesWithoutUndo();
                pipeline.renderScale=level==0?.75f:1f;pipeline.msaaSampleCount=1;
                pipeline.upscalingFilter=UpscalingFilterSelection.Linear;
                pipeline.shadowDistance=level==0?0:level==1?38:60;
                pipeline.mainLightShadowmapResolution=level==0?512:1024;
                pipeline.supportsHDR=level>0;pipeline.supportsCameraDepthTexture=level==2;
                pipeline.supportsCameraOpaqueTexture=false;
                pipeline.volumeProfile=CreateVolume(names[level],level);
                pipelines[level]=pipeline;EditorUtility.SetDirty(pipeline);
            }
            // Keep all three quality assets in build settings so required shadow/effect variants survive stripping.
            for(int i=0;i<QualitySettings.names.Length;i++){QualitySettings.SetQualityLevel(i,false);QualitySettings.renderPipeline=pipelines[Mathf.Min(2,i/2)];}
            QualitySettings.SetQualityLevel(Mathf.Min(2,QualitySettings.names.Length-1),false);QualitySettings.renderPipeline=pipelines[1];GraphicsSettings.defaultRenderPipeline=pipelines[1];
            string referencePath="Assets/Resources/Materials/URPReference.mat";
            var material=AssetDatabase.LoadAssetAtPath<Material>(referencePath);
            if(!material){material=new Material(Shader.Find("Universal Render Pipeline/Lit")){enableInstancing=true};material.EnableKeyword("_EMISSION");material.EnableKeyword("_NORMALMAP");AssetDatabase.CreateAsset(material,referencePath);}
            for(int variant=0;variant<4;variant++)
            {
                string variantPath="Assets/Resources/Materials/LitVariant"+variant+".mat";
                var reference=AssetDatabase.LoadAssetAtPath<Material>(variantPath);
                if(!reference){reference=new Material(material);AssetDatabase.CreateAsset(reference,variantPath);}
                if((variant&1)!=0)reference.EnableKeyword("_NORMALMAP");else reference.DisableKeyword("_NORMALMAP");
                if((variant&2)!=0)reference.EnableKeyword("_EMISSION");else reference.DisableKeyword("_EMISSION");
                EditorUtility.SetDirty(reference);
            }
            string skyPath="Assets/Resources/Materials/SkyReference.mat";
            string windPath="Assets/Resources/Materials/WindAir.mat";
            if(!AssetDatabase.LoadAssetAtPath<Material>(windPath))
                AssetDatabase.CreateAsset(new Material(Shader.Find("AnotherWorld/WindAir")),windPath);
            if(!AssetDatabase.LoadAssetAtPath<Material>(skyPath))
                AssetDatabase.CreateAsset(new Material(Shader.Find("Skybox/Procedural")),skyPath);
            // Runtime-created renderers are absent from the authored scene during build stripping.
            var graphicsAssets=AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/GraphicsSettings.asset");
            if(graphicsAssets.Length==0)throw new InvalidOperationException("Graphics settings asset unavailable.");
            var graphics=new SerializedObject(graphicsAssets[0]);
            var instancing=graphics.FindProperty("m_InstancingStripping");
            if(instancing==null)throw new InvalidOperationException("Instancing stripping setting unavailable.");
            instancing.intValue=2;graphics.ApplyModifiedPropertiesWithoutUndo();
            PlayerSettings.companyName="Another World";PlayerSettings.productName="Another World";PlayerSettings.colorSpace=ColorSpace.Linear;
            PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Gzip;PlayerSettings.WebGL.decompressionFallback=true;
            PlayerSettings.WebGL.dataCaching=true;PlayerSettings.WebGL.nameFilesAsHashes=true;PlayerSettings.WebGL.template="PROJECT:AnotherWorld";
            PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.WebGL,ManagedStrippingLevel.Low);
            PlayerSettings.SetStaticBatchingForPlatform(BuildTarget.WebGL,true);
            if(!File.Exists(ScenePath))
            {
                var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
                new GameObject("Unity neighbourhood").AddComponent<UnityNeighbourhood>();
                EditorSceneManager.SaveScene(scene,ScenePath);
            }
            EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(ScenePath,true)};
            AssetDatabase.SaveAssets();Debug.Log("Another World: URP presets, Web asset policies and neighbourhood scene are ready.");
        }
        static void SetBool(SerializedObject target,string name,bool value)
        {var property=target.FindProperty(name);if(property==null)throw new InvalidOperationException("URP field unavailable in this package version: "+name);property.boolValue=value;}
        static VolumeProfile CreateVolume(string name,int level)
        {
            string path="Assets/Resources/Quality/"+name+"Volume.asset";var profile=AssetDatabase.LoadAssetAtPath<VolumeProfile>(path);
            if(profile)return profile;profile=ScriptableObject.CreateInstance<VolumeProfile>();AssetDatabase.CreateAsset(profile,path);
            if(level>0)
            {
                var color=profile.Add<ColorAdjustments>();color.contrast.Override(6);color.saturation.Override(4);
                var tone=profile.Add<Tonemapping>();tone.mode.Override(TonemappingMode.ACES);
                if(level==2){var bloom=profile.Add<Bloom>();bloom.intensity.Override(.23f);bloom.threshold.Override(1.1f);var motion=profile.Add<MotionBlur>();motion.intensity.Override(.12f);}
                foreach(var component in profile.components)AssetDatabase.AddObjectToAsset(component,profile);
            }
            EditorUtility.SetDirty(profile);return profile;
        }
        [MenuItem("Another World/Build Web preview")]
        public static void BuildWeb()
        {
            Setup();Directory.CreateDirectory("Builds/Web");
            var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{ScenePath},target=BuildTarget.WebGL,locationPathName="Builds/Web",options=BuildOptions.None});
            if(report.summary.result!=BuildResult.Succeeded)throw new BuildFailedException("Unity Web build failed. See the Editor log.");
            Debug.Log("Web build ready: "+Path.GetFullPath("Builds/Web/index.html"));
        }
    }
}
