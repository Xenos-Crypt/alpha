using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering.Universal;
namespace AnotherWorld.World
{
    [DefaultExecutionOrder(100)]
    public sealed class HidrokClimate : MonoBehaviour
    {
        public static HidrokClimate Instance { get; private set; }
        public static readonly Vector3 Centre=new Vector3(200,0,250);
        public const float Radius=1700;
        public NeighbourhoodPlayer Player;
        public Camera View;
        Camera shieldView;
        Transform warmScenery,warmTraffic;
        readonly List<Transform> saucers=new List<Transform>();
        float coldExposure;bool cloaked;
        public bool Inside=>Vector3.Distance(Player.transform.position,Centre)<Radius;
        public int Temperature=>Inside?22:GovernmentTeleport.InUsa(Player.transform.position)?18:-35;
        public void RevealForArrival(bool inside){warmScenery.gameObject.SetActive(inside);warmTraffic.gameObject.SetActive(inside);}
        void Awake(){Instance=this;}
        void OnDestroy(){if(Instance==this)Instance=null;}
        public void Build(Transform scenery,Transform moving)
        {
            warmScenery=scenery;warmTraffic=moving;
            var ice=WorldShapes.Material("Antarctic snow",new Color(.88f,.93f,.95f));var rock=WorldShapes.Material("Antarctic ice cliffs",new Color(.62f,.78f,.86f));
            WorldShapes.Box(transform,"Western Antarctic ice sheet",new Vector3(3000,.1f,7000),new Vector3(-1800,-.2f,250),ice,true);
            WorldShapes.Box(transform,"Eastern Antarctic ice sheet",new Vector3(3400,.1f,7000),new Vector3(2000,-.2f,250),ice,true);
            WorldShapes.Box(transform,"Southern Antarctic ice sheet",new Vector3(600,.1f,3458),new Vector3(0,-.2f,-1521),ice,true);
            WorldShapes.Box(transform,"Northern Antarctic ice sheet",new Vector3(600,.1f,2850),new Vector3(0,-.2f,2325),ice,true);
            var cone=SmoothShapes.Profile("Ice peak",new[]{new Vector2(1,0),new Vector2(0,1)},12);
            for(int n=0;n<36;n++){float a=n*Mathf.PI/18;var p=Centre+new Vector3(Mathf.Cos(a)*(Radius+260),-.15f,Mathf.Sin(a)*(Radius+260));var peak=SmoothShapes.Part(transform,"Antarctic ice ridge",cone,new Vector3(150,60+n%3*25,150),p,rock,true);peak.AddComponent<MeshCollider>().sharedMesh=cone;}
            var vertices=new List<Vector3>();var uv=new List<Vector2>();var triangles=new List<int>();const int sides=96,rings=24;
            for(int ring=0;ring<=rings;ring++)for(int side=0;side<=sides;side++)
            {
                float elevation=ring*Mathf.PI*.5f/rings,angle=side*Mathf.PI*2/sides;
                vertices.Add(new Vector3(Mathf.Cos(angle)*Mathf.Cos(elevation)*Radius,Mathf.Sin(elevation)*Radius,Mathf.Sin(angle)*Mathf.Cos(elevation)*Radius));uv.Add(new Vector2((float)side/sides,(float)ring/rings));
                if(ring<rings&&side<sides){int i=ring*(sides+1)+side;triangles.AddRange(new[]{i,i+sides+1,i+1,i+1,i+sides+1,i+sides+2});}
            }
            var mesh=new Mesh{name="Hidrok protective hemisphere"};mesh.SetVertices(vertices);mesh.SetUVs(0,uv);mesh.SetTriangles(triangles,0);mesh.RecalculateNormals();mesh.RecalculateBounds();
            var material=new Material(Resources.Load<Shader>("Shaders/HidrokShield"));var dome=SmoothShapes.Part(transform,"Hidrok climate and cloaking dome",mesh,Vector3.one,Centre,material);dome.layer=28;
            View.cullingMask&=~(1<<28);
            shieldView=new GameObject("Distant shield camera").AddComponent<Camera>();shieldView.depth=-1;shieldView.cullingMask=1<<28;shieldView.nearClipPlane=.1f;shieldView.farClipPlane=5000;shieldView.clearFlags=CameraClearFlags.Skybox;View.clearFlags=CameraClearFlags.Depth;
            var viewData=View.GetUniversalAdditionalCameraData();viewData.renderType=CameraRenderType.Overlay;shieldView.GetUniversalAdditionalCameraData().cameraStack.Add(View);
            var alloy=WorldShapes.Material("Hidrok alloy",new Color(.36f,.48f,.53f),null,.7f);var glow=WorldShapes.Material("Hidrok technology",new Color(.12f,.76f,.85f));
            for(int n=0;n<12;n++){float a=n*Mathf.PI/6;var p=Centre+new Vector3(Mathf.Cos(a)*Radius,0,Mathf.Sin(a)*Radius);WorldShapes.Box(transform,"Shield emitter",new Vector3(5,14,5),p+Vector3.up*7,alloy,true);WorldShapes.Box(transform,"Shield emitter core",new Vector3(5.1f,5,5.1f),p+Vector3.up*10,glow);}
            for(int n=0;n<4;n++)
            {
                var saucer=new GameObject("Hidrok research saucer").transform;saucer.SetParent(transform,false);saucers.Add(saucer);
                SmoothShapes.Part(saucer,"Saucer hull",SmoothShapes.Ellipsoid,new Vector3(14,2,14),Vector3.zero,alloy);
                SmoothShapes.Part(saucer,"Saucer cockpit",SmoothShapes.Ellipsoid,new Vector3(5,2.5f,5),Vector3.up*1.3f,glow);
                SmoothShapes.Part(saucer,"Hover ring",SmoothShapes.Tube,new Vector3(12,.12f,12),Vector3.down*.12f,glow);
            }
            CivicArchitecture.Build(scenery,new Vector3(32,0,-224),"technology","Hidrok Climate Control");
            CityServices.Instance.Notify("Welcome to Hidrok. Cloaking shield online. Interior climate: 22 C.");
        }
        void Update()
        {
            bool outside=!Inside;
            if(GovernmentTeleport.Instance)GovernmentTeleport.Instance.SetRegionVisible(Player.transform.position);
            if(outside!=cloaked){cloaked=outside;warmScenery.gameObject.SetActive(!outside);warmTraffic.gameObject.SetActive(!outside);}
            if(outside&&!GovernmentTeleport.InUsa(Player.transform.position)){coldExposure+=Time.deltaTime;if(coldExposure>=1){Player.Health=Mathf.Max(0,Player.Health-2);coldExposure=0;}}else coldExposure=0;
            for(int n=0;n<saucers.Count;n++){float a=Time.time*.035f+n*Mathf.PI*.5f;saucers[n].position=new Vector3(100+Mathf.Cos(a)*180,28+n*7+Mathf.Sin(Time.time*.4f+n),80+Mathf.Sin(a)*160);saucers[n].rotation=Quaternion.Euler(0,-a*Mathf.Rad2Deg,0);saucers[n].gameObject.SetActive(!outside);}
        }
        void LateUpdate(){if(!shieldView)return;shieldView.transform.SetPositionAndRotation(View.transform.position,View.transform.rotation);shieldView.fieldOfView=View.fieldOfView;}
        void OnGUI(){GUI.Label(new Rect(14,Screen.height-28,700,25),GovernmentTeleport.InUsa(Player.transform.position)?"USA | WASHINGTON, D.C. | 18 C":"HIDROK | "+(Inside?"CLOAK AND CLIMATE ONLINE | 22 C":"ANTARCTIC EXTERIOR | -35 C | cold exposure"));}
    }
}
