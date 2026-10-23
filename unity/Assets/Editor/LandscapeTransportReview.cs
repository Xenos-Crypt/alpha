using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using AnotherWorld.World;
namespace AnotherWorld.Editor
{
    [InitializeOnLoad] public static class LandscapeTransportReview
    {
        const string Key="Hidrok.LandscapeTransportReview";
        static Camera view;static RenderTexture target;static VillaPreviewCamera rig;static GameObject exhibit;
        static int index=-1,warmup;static float started;static readonly string[] kinds={"car","motorcycle","bicycle","police","ambulance","bus","tram","train","helicopter","plane","ferry","landscape","city"};
        static LandscapeTransportReview(){if(SessionState.GetBool(Key,false))Hook();}
        static void Hook(){EditorApplication.update-=Tick;EditorApplication.update+=Tick;}
        public static void Run(){ShaderUtil.allowAsyncCompilation=false;ProjectSetup.Setup();EditorSceneManager.OpenScene("Assets/Scenes/Neighbourhood.unity");SessionState.SetBool(Key,true);Hook();EditorApplication.EnterPlaymode();}
        static void Check(bool ok,string text){if(!ok)throw new Exception(text);}
        static void Tick()
        {
            EditorApplication.QueuePlayerLoopUpdate();if(!EditorApplication.isPlaying||Time.time<2||!AnotherWorld.Traffic.RoadNetwork.Instance)return;
            try
            {
                if(index<0)
                {
                    foreach(string name in new[]{"Grass","Light paving","Dark asphalt","Soil","Decorative gravel"})
                    {
                        var m=LandscapeDesign.Surface(name);Check(m&&m.enableInstancing&&m.GetTexture("_BaseMap")&&m.GetTexture("_BumpMap"),"Missing tiled/normal mapped shared surface: "+name);Check(m.GetTexture("_BaseMap").width<=1024,"Texture budget exceeded");
                    }
                    foreach(string name in new[]{"Tree","Small tree","Shrub","Purple flowers","Gold flowers"}){var plant=Resources.Load<GameObject>("Landscaping/"+name);Check(plant&&plant.GetComponent<VegetationAsset>(),"Missing reusable planting prefab or serialized distance marker: "+name);}
                    view=Camera.main;Rendering.ScalableQuality.Instance.SetQuality("High");target=new RenderTexture(1100,760,24);target.Create();rig=view.gameObject.AddComponent<VillaPreviewCamera>();rig.Camera=view;rig.Target=target;view.fieldOfView=48;index=0;Prepare();return;
                }
                if(Time.time-started<1.2f)return;
                AnotherWorld.Rendering.GpuMeshBatch.PreviewRenderers();
                rig.Apply();view.aspect=1100f/760;view.targetTexture=null;
                var background=GameObject.Find("Distant shield camera").GetComponent<Camera>();background.transform.SetPositionAndRotation(view.transform.position,view.transform.rotation);background.fieldOfView=view.fieldOfView;background.aspect=view.aspect;
                UnityEngine.Rendering.RenderPipeline.SubmitRenderRequest(background,new UnityEngine.Rendering.RenderPipeline.StandardRequest{destination=target});if(warmup++<3)return;
                var previous=RenderTexture.active;RenderTexture.active=target;var image=new Texture2D(target.width,target.height,TextureFormat.RGB24,false);image.ReadPixels(new Rect(0,0,target.width,target.height),0,0);image.Apply();Directory.CreateDirectory("Logs");File.WriteAllBytes("Logs/reference-"+kinds[index]+".png",image.EncodeToPNG());RenderTexture.active=previous;UnityEngine.Object.Destroy(image);
                if(++index<kinds.Length){Prepare();return;}
                File.WriteAllText("Logs/landscape-transport-check.json","{\"passed\":true,\"sharedTiledNormalMaterials\":5,\"plantPrefabs\":5,\"vehicleFamiliesRendered\":11,\"landscapeAndCityRendered\":true}");Debug.Log("PASS: five shared tiled normal materials, five plant prefabs and eleven vehicle-family reference renders");SessionState.SetBool(Key,false);EditorApplication.Exit(0);
            }
            catch(Exception error){Debug.LogException(error);SessionState.SetBool(Key,false);EditorApplication.Exit(1);}
        }
        static void Prepare()
        {
            if(exhibit)UnityEngine.Object.Destroy(exhibit);started=Time.time;warmup=0;string kind=kinds[index];
            if(kind=="landscape"){rig.Position=new Vector3(22,5,12);rig.LookAt=new Vector3(32,1.5f,32);return;}
            if(kind=="city"){rig.Position=new Vector3(-48,32,5);rig.LookAt=new Vector3(50,28,110);return;}
            exhibit=new GameObject("Transport reference exhibit");exhibit.transform.position=new Vector3(0,80,0);
            WorldShapes.Box(exhibit.transform,"Exhibit deck",new Vector3(50,.1f,50),Vector3.down*.12f,LandscapeDesign.Surface("Light paving"));
            var model=new GameObject(kind+" reference").transform;model.SetParent(exhibit.transform,false);
            float distance=kind=="train"?32:kind=="tram"?23:kind=="plane"||kind=="ferry"?20:kind=="bus"?14:kind=="helicopter"?13:kind=="motorcycle"||kind=="bicycle"?4:kind=="ambulance"?8:5.8f;
            if(kind=="train")
            {
                for(int n=-1;n<=1;n++){var carriage=new GameObject("Reference train carriage").transform;carriage.SetParent(model,false);carriage.localPosition=new Vector3(0,0,n*9.4f);TransportDesign.Rail(carriage,9,2.7f,2.1f,true);}
                foreach(int side in new[]{-1,1})WorldShapes.Box(model,"Inter-car gangway",new Vector3(1.45f,1.7f,.55f),new Vector3(0,1.38f,side*4.7f),TransportDesign.Graphite,false,false);
            }
            else if(kind=="tram")TransportDesign.Rail(model,18,2.7f,2.1f);
            else if(kind=="helicopter"||kind=="plane")TransportDesign.Aircraft(model,kind=="helicopter");
            else if(kind=="ferry")
            {
                var ferry=model.gameObject.AddComponent<FerryService>();ferry.enabled=false;ferry.Build(model,TransportDesign.Pearl);ferry.Vessel.localPosition=Vector3.zero;
            }
            else
            {
                var vehicle=HoverVehicleModel.Create(kind,model,new Color(.64f,.75f,.87f),out var wheels);Check(wheels.Length==0,"Wheeled vehicle in levitation reference");
                var bounds=vehicle.GetComponent<BoxCollider>();Check(bounds&&bounds.size.z>1,"Vehicle collision hull missing");
            }
            rig.Position=exhibit.transform.position+new Vector3(distance*.68f,distance*.38f,distance);rig.LookAt=exhibit.transform.position+Vector3.up*1.1f;
        }
    }
}
