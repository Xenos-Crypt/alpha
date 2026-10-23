using System;
using System.IO;
using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using AnotherWorld.World;
namespace AnotherWorld.Editor
{
    [InitializeOnLoad] public static class VillaVisualReview
    {
        const string Key="Hidrok.VillaVisualReview";static Camera camera;static RenderTexture target;static float started;static int stage;
        static VillaVisualReview(){if(SessionState.GetBool(Key,false))Hook();}
        static void Hook(){EditorApplication.update-=Tick;EditorApplication.update+=Tick;}
        public static void Run(){ShaderUtil.allowAsyncCompilation=false;ProjectSetup.Setup();EditorSceneManager.OpenScene("Assets/Scenes/Neighbourhood.unity");SessionState.SetBool(Key,true);Hook();EditorApplication.EnterPlaymode();}
        public static void RunCity(){SessionState.SetBool(Key+"city",true);Run();}
        static void Tick()
        {
            EditorApplication.QueuePlayerLoopUpdate();if(!EditorApplication.isPlaying||Time.time<2||!Traffic.RoadNetwork.Instance)return;
            try
            {
                if(stage==0)
                {
                    var villa=CityServices.Instance.Places.Find(p=>p.Name=="Hidrok Glass Villa").transform;camera=Camera.main;Rendering.ScalableQuality.Instance.SetQuality("High");target=new RenderTexture(1100,760,24);target.Create();var rig=camera.gameObject.AddComponent<VillaPreviewCamera>();rig.Camera=camera;rig.Target=target;rig.Position=villa.position+new Vector3(-11,6,-17);rig.LookAt=villa.position+Vector3.up*1.8f;
                    if(SessionState.GetBool(Key+"city",false)){rig.Position=new Vector3(-48,32,5);rig.LookAt=new Vector3(50,28,110);}
                    camera.fieldOfView=50;started=Time.time;stage=1;return;
                }
                if(Time.time-started<2)return;
                var preview=camera.GetComponent<VillaPreviewCamera>();preview.Apply();camera.aspect=1100f/760;
                var baseCamera=GameObject.Find("Distant shield camera").GetComponent<Camera>();baseCamera.transform.SetPositionAndRotation(camera.transform.position,camera.transform.rotation);baseCamera.fieldOfView=camera.fieldOfView;baseCamera.aspect=camera.aspect;camera.targetTexture=null;
                UnityEngine.Rendering.RenderPipeline.SubmitRenderRequest(baseCamera,new UnityEngine.Rendering.RenderPipeline.StandardRequest{destination=target});
                if(stage<4){stage++;return;}
                var previous=RenderTexture.active;RenderTexture.active=target;var image=new Texture2D(target.width,target.height,TextureFormat.RGB24,false);image.ReadPixels(new Rect(0,0,target.width,target.height),0,0);image.Apply();Directory.CreateDirectory("Logs");File.WriteAllBytes(SessionState.GetBool(Key+"city",false)?"Logs/shield-city-reference.png":"Logs/villa-native-exterior.png",image.EncodeToPNG());if(image.GetPixel(550,380).maxColorComponent<.01f&&image.GetPixel(200,150).maxColorComponent<.01f)throw new Exception("Preview render is black");UnityEngine.Object.Destroy(image);RenderTexture.active=previous;Debug.Log("PASS: rendered architectural reference view");SessionState.SetBool(Key,false);SessionState.SetBool(Key+"city",false);EditorApplication.Exit(0);
            }
            catch(Exception error){Debug.LogException(error);SessionState.SetBool(Key,false);EditorApplication.Exit(1);}
        }
    }
    [DefaultExecutionOrder(1000)] public sealed class VillaPreviewCamera : MonoBehaviour
    {
        public Camera Camera;public RenderTexture Target;public Vector3 Position,LookAt;
        public void Apply(){Camera.targetTexture=Target;transform.position=Position;transform.rotation=Quaternion.LookRotation(LookAt-Position);}
        void LateUpdate(){Apply();}
    }
}
