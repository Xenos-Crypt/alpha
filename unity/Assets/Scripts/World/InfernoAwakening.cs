using System.Collections;
using UnityEngine;
namespace AnotherWorld.World
{
    // One timed aura per player. Switching elements or boarding a vehicle ends it.
    public sealed class InfernoAwakening : MonoBehaviour
    {
        public const float Duration=12;
        public bool Empowered=>Time.time<endsAt&&aura;
        public float Remaining=>Empowered?endsAt-Time.time:0;
        float endsAt;GameObject aura;LineRenderer[] spirals;NeighbourhoodPlayer player;PlayerPowers powers;
        public void Activate()
        {
            End();player=GetComponent<NeighbourhoodPlayer>();powers=GetComponent<PlayerPowers>();endsAt=Time.time+Duration;
            aura=new GameObject("Inferno Awakening fiery aura");aura.transform.SetParent(transform,false);
            for(int i=0;i<5;i++){float angle=i*Mathf.PI*2/5;ElementalVisuals.Flame(aura.transform,new Vector3(Mathf.Cos(angle)*.55f,.15f,Mathf.Sin(angle)*.55f),1.7f);}
            var embers=aura.AddComponent<FireEmbers>();embers.Configure(.85f,1.9f,45);
            spirals=new LineRenderer[3];
            for(int i=0;i<3;i++){spirals[i]=ElementalVisuals.Ribbon(aura.transform,"Spiralling inferno",i==1?new Color(1,.8f,.08f):ElementalVisuals.Fire,.09f);spirals[i].useWorldSpace=false;spirals[i].positionCount=36;}
            StartCoroutine(Eruption());
            powers.HitArea(transform.position+Vector3.up*.6f,10,45,Vector3.zero,1,fireAttack:true,empoweredFire:true);
        }
        IEnumerator Eruption()
        {
            var ring=ElementalVisuals.Ring(transform.position,.5f,ElementalVisuals.Fire);ring.name="Inferno outward blast";
            var line=ring.GetComponent<LineRenderer>();line.widthMultiplier=.4f;var origin=transform.position;
            for(int i=0;i<12;i++){float a=i*Mathf.PI/6;var flame=ElementalVisuals.Flame(null,origin+new Vector3(Mathf.Cos(a)*3,.1f,Mathf.Sin(a)*3),3);Destroy(flame,1.5f);}
            for(float t=0;t<.7f;t+=Time.deltaTime){float radius=Mathf.Lerp(.5f,10,t/.7f);for(int i=0;i<49;i++){float a=i*Mathf.PI/24;line.SetPosition(i,origin+new Vector3(Mathf.Cos(a)*radius,.12f,Mathf.Sin(a)*radius));}line.widthMultiplier=Mathf.Lerp(.4f,.03f,t/.7f);yield return null;}
            Destroy(ring);
        }
        void LateUpdate()
        {
            if(!aura)return;if(Time.time>=endsAt||!player||player.IsDriving||player.IsRidingTransit||powers.Element!=0){End();return;}
            for(int strand=0;strand<spirals.Length;strand++)for(int i=0;i<36;i++)
            {float f=i/35f;float a=f*Mathf.PI*3+Time.time*5+strand*Mathf.PI*2/3;float radius=.65f+Mathf.Sin(f*Mathf.PI)*.12f;spirals[strand].SetPosition(i,new Vector3(Mathf.Cos(a)*radius,.12f+f*2.1f,Mathf.Sin(a)*radius));}
        }
        public void End(){endsAt=0;if(aura)Destroy(aura);aura=null;}
        void OnDisable(){End();}
    }
    // Small, bounded mesh particles work without extra textures or distortion shaders.
    public sealed class FireEmbers : MonoBehaviour
    {
        public void Configure(float radius,float height,int rate)
        {
            var ps=gameObject.AddComponent<ParticleSystem>();var main=ps.main;main.startLifetime=.9f;main.startSpeed=1.7f;main.startSize=.035f;main.maxParticles=75;main.simulationSpace=ParticleSystemSimulationSpace.World;
            var shape=ps.shape;shape.shapeType=ParticleSystemShapeType.Box;shape.scale=new Vector3(radius*2,height,radius*2);shape.position=Vector3.up*height*.5f;shape.rotation=new Vector3(-90,0,0);
            var emission=ps.emission;emission.rateOverTime=rate;var renderer=ps.GetComponent<ParticleSystemRenderer>();renderer.renderMode=ParticleSystemRenderMode.Mesh;renderer.mesh=SmoothShapes.Ellipsoid;renderer.sharedMaterial=ElementalVisuals.Paint("Hot fire embers",new Color(1,.55f,.06f),true);
            var size=ps.sizeOverLifetime;size.enabled=true;size.size=new ParticleSystem.MinMaxCurve(1,AnimationCurve.Linear(0,1,1,0));
        }
    }
}
