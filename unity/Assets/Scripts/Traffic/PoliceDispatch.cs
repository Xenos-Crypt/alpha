using UnityEngine;
using AnotherWorld.World;
namespace AnotherWorld.Traffic
{
    public sealed class PoliceDispatch : MonoBehaviour
    {
        public static PoliceDispatch Instance { get; private set; }
        public NeighbourhoodPlayer Player;
        public int Wanted { get; private set; }
        public string Reason { get; private set; }
        TrafficVehicle responding;Transform offender;Vector3[] patrol;float reportCooldown,reroute,stopped;
        AudioSource siren;
        CharacterController officer;float officerVertical;
        void Awake(){Instance=this;}
        void OnDestroy(){if(Instance==this)Instance=null;}
        void Start(){siren=gameObject.AddComponent<AudioSource>();siren.clip=Resources.Load<AudioClip>("Audio/siren");siren.loop=true;siren.volume=.12f;siren.playOnAwake=false;}
        public void Report(Transform target,string reason)
        {
            if(!target||Time.time<reportCooldown)return;reportCooldown=Time.time+8;offender=target;Reason=reason;Wanted=Mathf.Min(3,Wanted+1);
            if(!responding)
            {
                float best=float.MaxValue;foreach(var car in RoadNetwork.Instance.Vehicles)
                    if(car.Kind=="police"&&!car.PlayerControlled){float d=(car.transform.position-target.position).sqrMagnitude;if(d<best){responding=car;best=d;}}
                if(responding){patrol=responding.Route;reroute=0;}
            }
            CityServices.Instance.Notify("Police pursuing: "+reason+". Stop and press E when an officer reaches you.");
            if(siren&&siren.clip&&!siren.isPlaying)siren.Play();
        }
        public void ObserveTravel(Vector3 from,Vector3 to,RoadUser user,float length)
        {
            var delta=to-from;if(delta.sqrMagnitude<.00001f)return;var axis=RoadNetwork.Axis(delta);var direction=delta.normalized;
            foreach(var j in RoadNetwork.Instance.Junctions)
            {
                var a=from-j.Position;var b=to-j.Position;
                if(user==RoadUser.Pedestrian)
                {
                    float before=axis==TravelAxis.X?Mathf.Abs(a.x):Mathf.Abs(a.z),after=axis==TravelAxis.X?Mathf.Abs(b.x):Mathf.Abs(b.z);
                    float lateral=axis==TravelAxis.X?Mathf.Abs(b.z):Mathf.Abs(b.x);
                    if(before>=TrafficRules.RoadHalfWidth&&after<TrafficRules.RoadHalfWidth&&lateral>=16.7f&&lateral<=19.3f&&j.Rules.Signal(user,axis)!=SignalState.Green)
                        Report(Player.transform,"crossed against the pedestrian signal");
                    continue;
                }
                float side=axis==TravelAxis.X?Mathf.Abs(a.z):Mathf.Abs(a.x);if(side>TrafficRules.RoadHalfWidth)continue;
                float beforeAhead=Vector3.Dot(j.Position-from,direction),afterAhead=Vector3.Dot(j.Position-to,direction);
                float line=TrafficRules.StopLine+length*.5f;
                if(beforeAhead>=line&&afterAhead<line&&j.Rules.Signal(user,axis)==SignalState.Red)Report(Player.transform,"ran a red signal");
                if(j.Rules.Roundabout&&beforeAhead>=line&&afterAhead<line)
                    foreach(var car in RoadNetwork.Instance.Vehicles)if(!car.PlayerControlled&&Vector3.Distance(car.transform.position,j.Position)<15&&Vector3.Distance(car.transform.position,j.Position+(from-j.Position).normalized*11.5f)<8){Report(Player.transform,"failed to yield at a roundabout");break;}
            }
            if(user==RoadUser.Car&&Player.VehicleSpeed>4)
            {
                var near=RoadNetwork.Instance.NearestJunction(to);
                if(near!=null&&near.Rules.Roundabout&&Vector3.Distance(to,near.Position)<7)Report(Player.transform,"cut across the roundabout island");
                if(near!=null&&Vector3.Distance(to,near.Position)<26)return;
                float centre=axis==TravelAxis.X?Mathf.Round(to.z/64)*64:Mathf.Round(to.x/64)*64;
                var offset=axis==TravelAxis.X?new Vector3(0,0,to.z-centre):new Vector3(to.x-centre,0,0);
                if(Vector3.Dot(offset,LaneRoute.Right(direction))<-2)Report(Player.transform,"drove against traffic");
                if(offset.magnitude>TrafficRules.RoadHalfWidth)Report(Player.transform,"drove on the pavement");
            }
        }
        void Update()
        {
            if(Wanted==0||!responding||!offender)return;
            float distance=Vector3.Distance(responding.transform.position,offender.position);
            reroute-=Time.deltaTime;
            if(reroute<=0)
            {
                var from=RoadNetwork.Instance.NearestJunction(responding.transform.position);var to=RoadNetwork.Instance.NearestJunction(offender.position);
                if(from!=null&&to!=null)responding.SetRoute(LaneRoute.ToTarget(from.Position,to.Position));reroute=1.5f;
            }
            bool near=distance<28;
            responding.DispatchHold=near;
            if(near&&!officer)
            {
                var root=new GameObject("Pursuing police officer");root.transform.position=responding.transform.position+responding.transform.right*2+Vector3.up*.3f;
                WorldShapes.Person(root.transform,new Color(.08f,.16f,.28f));officer=root.AddComponent<CharacterController>();officer.height=1.85f;officer.radius=.3f;officer.center=Vector3.up*.925f;officer.stepOffset=.25f;
            }
            if(officer)
            {
                var delta=offender.position-officer.transform.position;delta.y=0;
                var direction=delta.normalized;
                if(Physics.SphereCast(officer.transform.position+Vector3.up,.32f,direction,out var obstacle,1.2f)&&!obstacle.transform.IsChildOf(offender))
                    direction=(direction+LaneRoute.Right(direction)*1.5f).normalized;
                officerVertical=officer.isGrounded?-2:officerVertical-20*Time.deltaTime;
                officer.Move(((delta.magnitude>1.6f?direction*5:Vector3.zero)+Vector3.up*officerVertical)*Time.deltaTime);
                if(delta.magnitude>1.6f)officer.transform.rotation=Quaternion.LookRotation(direction);
                near=delta.magnitude<2.3f;
                if(distance>35){Destroy(officer.gameObject);officer=null;responding.DispatchHold=false;}
            }
            if(near&&officer&&offender==Player.transform&&!Player.Powers.Invulnerable&&Player.VehicleSpeed<.5f&&Player.WalkingSpeed<.2f)stopped+=Time.deltaTime;else stopped=0;
            if(stopped>4)Surrender();
        }
        public bool CanSurrender=>Wanted>0&&officer&&Vector3.Distance(officer.transform.position,Player.transform.position)<3&&Player.VehicleSpeed<1;
        public void Surrender()
        {
            if(Wanted==0){CityServices.Instance.Notify("No active traffic report.");return;}
            if(Player.VehicleSpeed>=1){CityServices.Instance.Notify("Stop your vehicle first.");return;}
            int fine=25*Wanted;Player.Coins=Mathf.Max(0,Player.Coins-fine);Wanted=0;offender=null;stopped=0;
            if(officer){Destroy(officer.gameObject);officer=null;}
            if(responding){responding.DispatchHold=false;responding.SetRoute(patrol);responding=null;}if(siren)siren.Stop();
            CityServices.Instance.Notify("Traffic report settled. Fine: "+fine+" coins. Patrol resumed.");
        }
        void OnGUI(){if(Wanted>0)GUI.Label(new Rect(14,125,850,28),"WANTED "+Wanted+" — "+Reason+" — patrol responding");}
    }
}
