using UnityEngine;
using AnotherWorld.Traffic;
namespace AnotherWorld.World
{
    // Refresh one status, never stack components or multiply tick frequency.
    public sealed class BurningStatus : MonoBehaviour
    {
        public const float Duration=4,TickInterval=.5f;
        public float Remaining=>Mathf.Max(0,expires-Time.time);
        public float DamagePerSecond {get;private set;}
        float expires,nextTick,lastTime;CrossingWalker walker;TrafficVehicle vehicle;GameObject flames;Transform heat;float heatRadius;
        public static BurningStatus Ignite(Component target,bool empowered)
        {
            var burn=target.GetComponent<BurningStatus>();if(!burn)burn=target.gameObject.AddComponent<BurningStatus>();
            burn.Refresh(empowered);return burn;
        }
        void Refresh(bool empowered)
        {
            bool fresh=Time.time>=expires;expires=Time.time+Duration;
            if(fresh){DamagePerSecond=0;nextTick=Time.time+TickInterval;lastTime=Time.time;}
            DamagePerSecond=Mathf.Max(DamagePerSecond,empowered?8:4);
            if(flames)return;
            walker=GetComponent<CrossingWalker>();vehicle=GetComponent<TrafficVehicle>();flames=new GameObject("Visible burning status");flames.transform.SetParent(transform,false);
            float width=vehicle?1.05f:.28f;float height=vehicle?1.4f:1.1f;
            for(int i=0;i<3;i++){float a=i*Mathf.PI*2/3;ElementalVisuals.Flame(flames.transform,new Vector3(Mathf.Cos(a)*width,height*.5f,Mathf.Sin(a)*width),vehicle?1.2f:.7f);}
            flames.AddComponent<FireEmbers>().Configure(width,height,12);
            var shimmer=ElementalVisuals.Ring(Vector3.zero,width,new Color(1,.45f,.08f));shimmer.name="Burn heat shimmer";shimmer.transform.SetParent(flames.transform,false);heat=shimmer.transform;heatRadius=width;
            var line=shimmer.GetComponent<LineRenderer>();line.useWorldSpace=false;line.widthMultiplier=.018f;
        }
        void Update()
        {
            if(walker&&walker.Health<=0||vehicle&&(vehicle.Integrity<=0||vehicle.Sinking)){Clear();return;}
            // Integrate only to expiry, including a final partial tick, even on slow frames.
            if(Time.time>=nextTick||Time.time>=expires)
            {
                float until=Mathf.Min(Time.time,expires),damage=Mathf.Max(0,until-lastTime)*DamagePerSecond;lastTime=until;nextTick=Time.time+TickInterval;
                if(walker)walker.ApplyHit(damage,Vector3.zero,0);else if(vehicle)vehicle.Damage(damage);
            }
            if(Time.time>=expires){Clear();return;}
            if(heat){float f=Mathf.Repeat(Time.time*1.4f,1);var line=heat.GetComponent<LineRenderer>();for(int i=0;i<49;i++){float a=i*Mathf.PI/24;line.SetPosition(i,new Vector3(Mathf.Cos(a)*(heatRadius+f*.14f),.4f+f,Mathf.Sin(a)*(heatRadius+f*.14f)));}}
        }
        void Clear(){if(flames)Destroy(flames);flames=null;Destroy(this);}
        void OnDisable(){if(flames)Destroy(flames);flames=null;}
    }
}
