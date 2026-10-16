using UnityEngine;
namespace AnotherWorld.Traffic
{
    public sealed class TrafficVehicle : MonoBehaviour
    {
        public RoadUser User=RoadUser.Car;
        public string Kind="car";
        public float Length=4.4f,Width=2.1f,CruiseSpeed=9,Speed;
        public Vector3[] Route,Stops;
        public int Segment;
        public float Progress;
        public bool PlayerControlled,DoorsOpen,DispatchHold,Stolen,Abandoned,CanFly,Owned;
        // Insurance lapses the moment a vehicle is stolen (no policy covers a
        // thief); cargo only applies to "truck" kind, unsecured until loaded.
        public bool Insured=true,HasCargo,CargoSecured=true;
        public float MaxDriveSpeed=18,LiftSpeed=4,TurnRate=65;
        public bool Sinking { get; private set; }
        public float Integrity=100;
        public float StunnedUntil;
        public bool Stunned=>Time.time<StunnedUntil;
        public Transform[] Wheels;
        public Transform Rider;
        public Vector3 ExitPosition;
        Vector3[] path;int target;float dwell;int lastStop=-1;
        void Start(){RoadNetwork.Instance.Vehicles.Add(this);SetRoute(Route);}
        void OnDestroy(){if(RoadNetwork.Instance)RoadNetwork.Instance.Vehicles.Remove(this);}
        public void SetRoute(Vector3[] route)
        {
            if(route==null||route.Length<2)return;Route=route;
            path=LaneRoute.Build(route,User==RoadUser.Bicycle?TrafficRules.BicycleLane:TrafficRules.CarLane,Kind=="bus");
            target=0;float best=float.MaxValue;
            for(int i=0;i<path.Length;i++)
            {
                var a=path[i];var b=path[(i+1)%path.Length];var edge=b-a;
                var nearest=a+edge*Mathf.Clamp01(Vector3.Dot(transform.position-a,edge)/Mathf.Max(.001f,edge.sqrMagnitude));
                float d=(transform.position-nearest).sqrMagnitude;if(d<best){target=(i+1)%path.Length;best=d;}
            }
        }
        void Update()
        {
            if(Sinking){transform.position+=Vector3.down*Mathf.Min(1.4f*Time.deltaTime,Mathf.Max(0,transform.position.y+9));return;}
            if(PlayerControlled||Abandoned||path==null)return;
            if(Stunned){Speed=0;return;}
            if(DispatchHold){Speed=0;return;}
            if(dwell>0){dwell-=Time.deltaTime;Speed=0;DoorsOpen=true;return;}DoorsOpen=false;
            var destination=path[target];var delta=destination-transform.position;delta.y=0;
            if(delta.magnitude<.08f){target=(target+1)%path.Length;return;}
            var direction=delta.normalized;float requested=Mathf.Min(CruiseSpeed*Time.deltaTime,delta.magnitude);
            float travel=RoadNetwork.Instance.Limit(transform.position,direction,requested,User,Length,this);
            travel=ClearTravel(direction,travel);
            var before=transform.position;
            transform.position+=direction*travel;Speed=Time.deltaTime>0?travel/Time.deltaTime:0;
            // Same Highway Code enforcement the player gets (NeighbourhoodPlayer
            // calls the equivalent Observe for on-foot/player-driven travel) —
            // police on an active stop are exempt, matching rule 219's emergency
            // vehicle allowance; everyone else is held to the same rules.
            if(Kind!="police"&&PoliceDispatch.Instance)PoliceDispatch.Instance.Observe(transform,before,transform.position,User,Length,Speed);
            transform.rotation=Quaternion.RotateTowards(transform.rotation,Quaternion.LookRotation(direction),150*Time.deltaTime);
            if(Wheels!=null)foreach(var wheel in Wheels)wheel.Rotate(Vector3.right,travel/(User==RoadUser.Bicycle?.365f:.43f)*Mathf.Rad2Deg,Space.Self);
            if(Kind=="bus"&&Stops!=null)for(int i=0;i<Stops.Length;i++)
            {
                if(Vector3.Distance(transform.position,Stops[i])>8){if(lastStop==i)lastStop=-1;continue;}
                if(lastStop!=i&&Vector3.Distance(transform.position,Stops[i])<.12f){lastStop=i;dwell=9;DoorsOpen=true;ExitPosition=Stops[i]+LaneRoute.Right(transform.forward)*6.2f+Vector3.up*.2f;}
            }
        }
        public float ClearTravel(Vector3 direction,float requested)
        {
            if(requested<=0)return 0;
            if(!PlayerControlled&&(!CanFly||transform.position.y<5)&&AnotherWorld.World.WorldGeography.IsWater(transform.position+direction*(requested+Length*.5f)))return 0;
            var hull=GetComponent<BoxCollider>();
            var centre=hull?transform.TransformPoint(hull.center):transform.position+Vector3.up*.9f;
            float halfHeight=hull?Mathf.Max(.1f,hull.size.y*.5f-.06f):.84f;
            foreach(var hit in Physics.BoxCastAll(centre,new Vector3(CanFly?Width*.5f-.03f:Width*.47f,halfHeight,CanFly?Length*.5f-.03f:Length*.46f),direction,transform.rotation,requested+.05f,~0,QueryTriggerInteraction.Ignore))
                if(!hit.transform.IsChildOf(transform)&&!(PlayerControlled&&RoadNetwork.Instance.Player&&hit.transform.IsChildOf(RoadNetwork.Instance.Player))&&!(PlayerControlled&&!CanFly&&direction.y==0&&hit.collider.bounds.max.y<=transform.position.y+.4f))
                    requested=Mathf.Min(requested,Mathf.Max(0,hit.distance-.05f));
            return requested;
        }
        public void FollowSurface(float dt)
        {
            if((CanFly&&transform.position.y>.6f)||Sinking)return;
            float floor=float.NegativeInfinity;
            foreach(var hit in Physics.RaycastAll(transform.position+Vector3.up*.5f,Vector3.down,1,~0,QueryTriggerInteraction.Ignore))
                if(!hit.transform.IsChildOf(transform)&&!(RoadNetwork.Instance.Player&&hit.transform.IsChildOf(RoadNetwork.Instance.Player))&&hit.normal.y>.7f)floor=Mathf.Max(floor,hit.point.y);
            if(AnotherWorld.World.WorldGeography.IsWater(transform.position)&&float.IsNegativeInfinity(floor)){Sink();return;}
            if(!CanFly&&!float.IsNegativeInfinity(floor))transform.position=new Vector3(transform.position.x,Mathf.MoveTowards(transform.position.y,floor+.02f,dt*4),transform.position.z);
        }
        public void Sink(){Sinking=true;Abandoned=true;Speed=0;Integrity=0;}
        public void Damage(float amount){Integrity=Mathf.Max(0,Integrity-amount);if(Integrity==0){Abandoned=true;Speed=0;}}
    }
}
