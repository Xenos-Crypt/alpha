using System.Collections;
using UnityEngine;
namespace AnotherWorld.World
{
    public sealed class StormSurge : MonoBehaviour
    {
        public static StormSurge Current {get;private set;}
        public int Severity {get;private set;}=1;
        public float EndsAt {get;private set;}
        PlayerPowers owner;ParticleSystem rain;Color oldFog;float oldEnd;bool applied;float nextStrike;
        AudioSource audioSource;AudioClip thunder;
        public static void Summon(Vector3 point,PlayerPowers powers)
        {
            if(Current){Current.Severity=Mathf.Min(3,Current.Severity+1);Current.EndsAt=Time.time+18;Current.transform.position=point;return;}
            var storm=new GameObject("Sky Breaker storm").AddComponent<StormSurge>();Current=storm;storm.owner=powers;storm.transform.position=point;storm.EndsAt=Time.time+18;
        }
        void Start()
        {
            oldFog=RenderSettings.fogColor;oldEnd=RenderSettings.fogEndDistance;
            audioSource=gameObject.AddComponent<AudioSource>();audioSource.volume=.18f;audioSource.playOnAwake=false;
            thunder=AudioClip.Create("Procedural thunder",12000,1,12000,false);var samples=new float[12000];var random=new System.Random(148);float low=0;
            for(int i=0;i<samples.Length;i++){float t=i/12000f;low=low*.94f+((float)random.NextDouble()*2-1)*.06f;samples[i]=(low*2+Mathf.Sin(t*83)*.1f)*Mathf.Exp(-t*3);}thunder.SetData(samples,0);
            for(int i=0;i<7;i++){float a=i*Mathf.PI/3.5f;ElementalVisuals.Blob(transform,"Storm cloud",new Vector3(Mathf.Cos(a)*14,25,Mathf.Sin(a)*14),new Vector3(16,4,11),new Color(.12f,.15f,.2f));}
            var opening=ElementalVisuals.Ribbon(transform,"Split sky fissure",new Color(.5f,.75f,1),.3f);opening.useWorldSpace=false;opening.positionCount=49;
            for(int i=0;i<49;i++){float a=i*Mathf.PI/24;opening.SetPosition(i,new Vector3(Mathf.Cos(a)*(5+i%2),27,Mathf.Sin(a)*(5+i%2)));}
            rain=new GameObject("Heavy storm precipitation").AddComponent<ParticleSystem>();rain.transform.SetParent(transform,false);rain.transform.localPosition=Vector3.up*17;rain.transform.localRotation=Quaternion.Euler(90,0,0);
            var main=rain.main;main.startLifetime=1.3f;main.startSpeed=19;main.startSize=.045f;main.maxParticles=650;main.simulationSpace=ParticleSystemSimulationSpace.World;
            var shape=rain.shape;shape.shapeType=ParticleSystemShapeType.Box;shape.scale=new Vector3(30,30,1);
            rain.GetComponent<ParticleSystemRenderer>().sharedMaterial=ElementalVisuals.Paint("Storm rain",ElementalVisuals.Foam);
            var renderer=rain.GetComponent<ParticleSystemRenderer>();renderer.renderMode=ParticleSystemRenderMode.Stretch;renderer.lengthScale=5;renderer.velocityScale=.03f;
        }
        void Update()
        {
            if(Time.time>=EndsAt){Destroy(gameObject);return;}
            var emission=rain.emission;emission.rateOverTime=180*Severity;
            var wind=rain.velocityOverLifetime;wind.enabled=true;wind.x=Severity*2;wind.z=Severity;
            bool nearby=Camera.main&&(Camera.main.transform.position-transform.position).sqrMagnitude<22500;
            if(nearby){RenderSettings.fogColor=new Color(.22f,.28f,.34f);RenderSettings.fogEndDistance=110/Severity;applied=true;}
            else if(applied){RenderSettings.fogColor=oldFog;RenderSettings.fogEndDistance=oldEnd;applied=false;}
            if(Time.time>=nextStrike){nextStrike=Time.time+2.2f/Severity;StartCoroutine(Lightning());}
        }
        IEnumerator Lightning()
        {
            var offset=Random.insideUnitCircle*10;var point=transform.position+new Vector3(offset.x,.1f,offset.y);
            float closest=float.MaxValue;foreach(var hit in Physics.RaycastAll(point+Vector3.up*40,Vector3.down,120,~0,QueryTriggerInteraction.Ignore))if(!hit.transform.IsChildOf(owner.transform)&&hit.normal.y>.6f&&hit.distance<closest){closest=hit.distance;point=hit.point;}
            var bolt=ElementalVisuals.Ribbon(null,"Sky Breaker lightning",new Color(.65f,.82f,1),.2f);bolt.positionCount=12;
            for(int i=0;i<12;i++){float t=i/11f;bolt.SetPosition(i,Vector3.Lerp(point+Vector3.up*26,point,t)+new Vector3(i==11?0:Mathf.Sin(i*19)*.7f,0,i==11?0:Mathf.Cos(i*13)*.7f));}
            owner.HitArea(point+Vector3.up,3,12*Severity,Vector3.zero,1);
            if(audioSource)audioSource.PlayOneShot(thunder);
            yield return new WaitForSeconds(.16f);Destroy(bolt.gameObject);
        }
        void OnDestroy(){if(applied){RenderSettings.fogColor=oldFog;RenderSettings.fogEndDistance=oldEnd;}if(thunder)Destroy(thunder);if(Current==this)Current=null;}
    }
}
