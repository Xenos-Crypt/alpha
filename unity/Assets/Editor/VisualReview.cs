using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using AnotherWorld.World;
using AnotherWorld.Traffic;

namespace AnotherWorld.Editor
{
    public static class VisualReview
    {
        static Camera reviewCamera;static RenderTexture reviewTarget;static int warmup;
        public static void Capture()
        {
            ProjectSetup.Setup();EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            var root=new GameObject("Visual review").transform;
            WorldShapes.Box(root,"Paving",new Vector3(16,.15f,16),new Vector3(0,-.075f,0),WorldShapes.Material("Review paving",Color.white,"paving"));
            var human=HumanModels.Create(root,new Color(.18f,.34f,.46f),false);human.localPosition=new Vector3(1.25f,0,.25f);
            var other=HumanModels.Create(root,new Color(.46f,.34f,.21f),false);other.localPosition=new Vector3(2.05f,0,.15f);
            var junction=new Junction{Position=new Vector3(-20.5f,0,-15.5f)};StreetSignalModels.Create(root,junction);
            var bicycle=BicycleModel.Create(root,new Color(.18f,.44f,.36f),out var wheels);bicycle.transform.position=new Vector3(3.5f,0,1);bicycle.transform.rotation=Quaternion.Euler(0,-65,0);
            var rider=HumanModels.Create(bicycle.transform,new Color(.24f,.29f,.33f),true);rider.localScale=Vector3.one*.8f;rider.localPosition=new Vector3(0,.3f,-.15f);
            foreach(var lamp in junction.Lamps)lamp.View.SetActive(lamp.State==(lamp.User==RoadUser.Car?SignalState.Green:SignalState.Red));
            var sun=new GameObject("Sun").AddComponent<Light>();sun.type=LightType.Directional;sun.intensity=1.4f;sun.shadows=LightShadows.Soft;sun.transform.rotation=Quaternion.Euler(45,-25,0);
            var ambient=new SphericalHarmonicsL2();ambient.AddAmbientLight(new Color(.32f,.35f,.38f));RenderSettings.ambientProbe=ambient;
            var camera=new GameObject("Review camera").AddComponent<Camera>();camera.transform.position=new Vector3(5.3f,2.75f,6.8f);camera.transform.LookAt(new Vector3(1.2f,1.8f,0));camera.fieldOfView=40;camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.36f,.43f,.49f);
            camera.GetUniversalAdditionalCameraData().antialiasing=AntialiasingMode.SubpixelMorphologicalAntiAliasing;
            var target=new RenderTexture(1440,1000,24);target.Create();
            reviewCamera=camera;reviewTarget=target;warmup=0;EditorApplication.update+=Complete;
        }
        static void Complete()
        {
            EditorApplication.QueuePlayerLoopUpdate();if(++warmup<12)return;EditorApplication.update-=Complete;
            var camera=reviewCamera;var target=reviewTarget;
            RenderPipeline.SubmitRenderRequest(camera,new UniversalRenderPipeline.SingleCameraRequest{destination=target});
            RenderPipeline.SubmitRenderRequest(camera,new UniversalRenderPipeline.SingleCameraRequest{destination=target});
            var previous=RenderTexture.active;RenderTexture.active=target;var image=new Texture2D(target.width,target.height,TextureFormat.RGB24,false);image.ReadPixels(new Rect(0,0,target.width,target.height),0,0);image.Apply();RenderTexture.active=previous;
            Directory.CreateDirectory("Logs");File.WriteAllBytes("Logs/humans-signals-review.png",image.EncodeToPNG());Object.DestroyImmediate(image);target.Release();Object.DestroyImmediate(target);
            Debug.Log("Visual review rendered: Logs/humans-signals-review.png");
            EditorApplication.Exit(0);
        }
    }
}
