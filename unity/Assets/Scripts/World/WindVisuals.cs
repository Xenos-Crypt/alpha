using UnityEngine;
namespace AnotherWorld.World
{
    public static class WindVisuals
    {
        public static readonly Color Cyan=new Color(.12f,.85f,1);
        public static LineRenderer Line(Transform parent,string name,float width,int points)
        {var line=ElementalVisuals.Ribbon(parent,name,Cyan,width);line.useWorldSpace=false;line.positionCount=points;return line;}
        public static GameObject Burst(Vector3 centre,float radius,float duration=.55f)
        {var go=new GameObject("Outward wind gust");go.transform.position=centre;var gust=go.AddComponent<WindBurst>();gust.Radius=radius;gust.Duration=duration;return go;}
        public static GameObject Aura(Transform parent,string name,float strength=1)
        {
            var root=new GameObject(name);root.transform.SetParent(parent,false);var flow=root.AddComponent<WindBodyFlow>();flow.Strength=strength;return root;
        }
        public static void Particles(Transform parent,float radius,int rate,bool orbit)
        {
            var ps=new GameObject(orbit?"Orbiting dust and leaves":"Trailing wind motes").AddComponent<ParticleSystem>();ps.transform.SetParent(parent,false);
            var main=ps.main;main.startLifetime=orbit?2: .65f;main.startSize=orbit?.09f:.045f;main.startSpeed=orbit?0:1;main.maxParticles=orbit?70:45;main.simulationSpace=orbit?ParticleSystemSimulationSpace.Local:ParticleSystemSimulationSpace.World;
            var emission=ps.emission;emission.rateOverTime=rate;var shape=ps.shape;shape.shapeType=ParticleSystemShapeType.Circle;shape.radius=radius;shape.rotation=new Vector3(90,0,0);
            var velocity=ps.velocityOverLifetime;velocity.enabled=true;velocity.space=ParticleSystemSimulationSpace.Local;velocity.y=orbit?1.9f:.4f;if(orbit)velocity.orbitalY=4;
            var renderer=ps.GetComponent<ParticleSystemRenderer>();renderer.renderMode=ParticleSystemRenderMode.Mesh;renderer.mesh=SmoothShapes.Ellipsoid;renderer.sharedMaterial=ElementalVisuals.Paint(orbit?"Wind-carried leaves":"Cyan wind motes",orbit?new Color(.44f,.51f,.34f):Cyan,!orbit);
            var size=ps.sizeOverLifetime;size.enabled=true;size.size=new ParticleSystem.MinMaxCurve(1,AnimationCurve.Linear(0,1,1,0));
        }
    }
    public sealed class WindBurst : MonoBehaviour
    {
        public float Radius=6,Duration=.55f;float started;LineRenderer[] rings;
        void Start(){started=Time.time;rings=new LineRenderer[2];for(int i=0;i<2;i++)rings[i]=WindVisuals.Line(transform,"Circular wind shockwave",.12f,65);}
        void Update(){float f=(Time.time-started)/Duration;if(f>=1){Destroy(gameObject);return;}for(int j=0;j<2;j++){float radius=Mathf.Max(.05f,f*Radius-j*.35f);rings[j].widthMultiplier=.12f*(1-f);for(int i=0;i<65;i++){float a=i*Mathf.PI/32;rings[j].SetPosition(i,new Vector3(Mathf.Cos(a)*radius,.09f+j*.12f,Mathf.Sin(a)*radius));}}}
    }
    public sealed class WindBodyFlow : MonoBehaviour
    {
        public float Strength=1;LineRenderer[] streams;
        void Start(){streams=new LineRenderer[6];for(int i=0;i<6;i++)streams[i]=WindVisuals.Line(transform,"Cyan limb wind stream",.055f*Strength,24);WindVisuals.Particles(transform,.45f,24,false);}
        void LateUpdate()
        {
            for(int i=0;i<streams.Length;i++)for(int n=0;n<24;n++)
            {float f=n/23f,a=f*Mathf.PI*3+Time.time*7+i*Mathf.PI/3;bool leg=i<2;float side=i%2==0?-1:1;float radius=(leg?.13f:.2f)*Strength;streams[i].SetPosition(n,new Vector3(side*(leg?.15f:.48f)+Mathf.Cos(a)*radius,(leg?.06f:.8f)+f*(leg?.7f:1),Mathf.Sin(a)*radius));}
        }
    }
    public sealed class WindVortex : MonoBehaviour
    {
        public float Strength=1;LineRenderer[] ribbons;GameObject funnel;float born;
        void Start()
        {
            born=Time.time;ribbons=new LineRenderer[3];for(int i=0;i<3;i++)ribbons[i]=WindVisuals.Line(transform,"Bright cyan cyclone ribbon",.075f,96);
            var reference=Resources.Load<Material>("Materials/WindAir");
            if(reference){funnel=SmoothShapes.Part(transform,"Transparent air funnel",SmoothShapes.Profile("Air cyclone funnel",new[]{new Vector2(.25f,0),new Vector2(.7f,1),new Vector2(1.4f,3),new Vector2(2.6f,5.5f),new Vector2(4.2f,8)},28),Vector3.one,Vector3.zero,reference);}
            WindVisuals.Particles(transform,3,28,true);
        }
        void Update()
        {
            float growth=Mathf.Clamp01((Time.time-born)/.4f);transform.localScale=Vector3.one*growth*Strength;
            for(int j=0;j<3;j++)for(int n=0;n<96;n++){float f=n/95f,a=f*Mathf.PI*10-Time.time*10+j*Mathf.PI*2/3,r=.25f+f*f*3.9f;ribbons[j].SetPosition(n,new Vector3(Mathf.Cos(a)*r,f*8,Mathf.Sin(a)*r));}
            if(funnel)funnel.transform.localRotation=Quaternion.Euler(0,Time.time*90,0);
        }
    }
}
