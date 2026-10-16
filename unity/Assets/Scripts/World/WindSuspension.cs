using UnityEngine;
using AnotherWorld.Traffic;
namespace AnotherWorld.World
{
    public sealed class WindSuspension : MonoBehaviour
    {
        public PlayerPowers Source {get;private set;}
        public bool Caught {get;private set;}
        float expires,baseY,phase;Vector3 centre,drift;CrossingWalker walker;
        public static void Capture(CrossingWalker target,PlayerPowers source,Vector3 point)
        {
            var lift=target.GetComponent<WindSuspension>();if(!lift){lift=target.gameObject.AddComponent<WindSuspension>();lift.baseY=target.transform.position.y;lift.walker=target;lift.phase=Random.value*Mathf.PI*2;}
            lift.Source=source;lift.centre=point;lift.Caught=true;lift.expires=Time.time+.75f;
        }
        public void Release(Vector3 force){Caught=false;drift=force;if(walker)walker.ClearImpulse();}
        void Update()
        {
            if(Caught&&(Time.time>expires||!Source||walker.Health<=0))Release(Vector3.zero);
            Vector3 delta;
            if(Caught){var target=new Vector3(centre.x,baseY+2.4f+Mathf.Sin(Time.time*3+phase)*.3f,centre.z);delta=Vector3.ClampMagnitude(target-transform.position,3.2f)*Time.deltaTime;transform.Rotate(0,45*Time.deltaTime,0);var gait=GetComponent<ResidentGait>();if(gait){gait.ActionUntil=Time.time+.15f;gait.ArmPitch=-110;gait.ArmSpread=35;gait.BothArms=true;}}
            else{drift=Vector3.MoveTowards(drift,Vector3.zero,Time.deltaTime*8);delta=(drift+Vector3.down*5.5f)*Time.deltaTime;}
            float length=delta.magnitude;RaycastHit? nearest=null;
            if(length>.0001f)foreach(var hit in Physics.CapsuleCastAll(transform.position+Vector3.up*.35f,transform.position+Vector3.up*1.5f,.28f,delta/length,length,~0,QueryTriggerInteraction.Ignore))if(!hit.transform.IsChildOf(transform)&&(!nearest.HasValue||hit.distance<nearest.Value.distance))nearest=hit;
            if(nearest.HasValue)
            {
                transform.position+=delta.normalized*Mathf.Max(0,nearest.Value.distance-.025f);
                if(!Caught&&nearest.Value.normal.y>.5f){enabled=false;Destroy(this);return;}
            }
            else transform.position+=delta;
            // Water has no solid ground at its surface; stop a released target at swimming height.
            if(!Caught&&WorldGeography.IsWater(transform.position)&&transform.position.y<-.7f){var p=transform.position;p.y=-.7f;transform.position=p;enabled=false;Destroy(this);}
        }
    }
}
