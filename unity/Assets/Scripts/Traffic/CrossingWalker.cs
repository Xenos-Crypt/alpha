using UnityEngine;

namespace AnotherWorld.Traffic
{
    public sealed class CrossingWalker : MonoBehaviour
    {
        public Vector3[] Waypoints;
        public float WalkSpeed=1.65f;
        public float Health=100,StunnedUntil;
        public bool TrainingTarget;
        float recoverAt;
        public bool Stunned=>Time.time<StunnedUntil;
        public void ApplyHit(float damage,Vector3 force,float stun)
        {if(Health<=0)return;Health=Mathf.Max(0,Health-damage);StunnedUntil=Mathf.Max(StunnedUntil,Time.time+stun);ApplyImpulse(force);if(Health==0)recoverAt=Time.time+10;}
        int target;
        Vector3 impulse;
        public void ApplyImpulse(Vector3 force){impulse+=force;}
        public void ClearImpulse(){impulse=Vector3.zero;}
        void Start()
        {
            RoadNetwork.Instance.Walkers.Add(this);
            if(Waypoints==null)return;
            for(int i=0;i<Waypoints.Length;i++)
            {
                var j=RoadNetwork.Instance.NearestJunction(Waypoints[i]);if(j==null)continue;
                var d=Waypoints[i]-j.Position;
                if(Mathf.Abs(Mathf.Abs(d.x)-18)<.2f&&Mathf.Abs(Mathf.Abs(d.z)-18)<.2f)
                    Waypoints[i]=j.Position+new Vector3(Mathf.Sign(d.x)*19.1f,d.y,Mathf.Sign(d.z)*19.1f);
            }
            float nearest=float.MaxValue;
            for(int i=0;i<Waypoints.Length;i++){float d=Vector3.Distance(transform.position,Waypoints[i]);if(d<nearest){nearest=d;target=i;}}
            if(nearest<2)transform.position=Waypoints[target];
        }
        void OnDestroy(){if(RoadNetwork.Instance)RoadNetwork.Instance.Walkers.Remove(this);}
        void Update()
        {
            var wind=GetComponent<AnotherWorld.World.WindSuspension>();if(wind&&wind.enabled)return;
            if(Camera.main&&(Camera.main.transform.position-transform.position).sqrMagnitude>32400)return;
            if(Health<=0){if(Time.time>=recoverAt)Health=50;else return;}
            if(impulse.sqrMagnitude>.01f)
            {
                var delta=impulse*Time.deltaTime;float distance=delta.magnitude;
                if(!Physics.SphereCast(transform.position+Vector3.up,.3f,delta.normalized,out _,distance,~0,QueryTriggerInteraction.Ignore))transform.position+=delta;
                impulse=Vector3.MoveTowards(impulse,Vector3.zero,Time.deltaTime*12);return;
            }
            if(Waypoints==null||Waypoints.Length==0)return;
            if(Stunned)return;
            var destination=Waypoints[target];if(!RoadNetwork.Instance.CanCross(transform.position,destination))
            {RoadNetwork.Instance.PressAtCorner(transform.position,RoadNetwork.Axis(destination-transform.position));return;}
            transform.position=Vector3.MoveTowards(transform.position,destination,WalkSpeed*Time.deltaTime);
            var direction=destination-transform.position;if(direction.sqrMagnitude>.01f)transform.rotation=Quaternion.LookRotation(direction);
            if(Vector3.Distance(transform.position,destination)<.1f)target=(target+1)%Waypoints.Length;
        }
    }
}
