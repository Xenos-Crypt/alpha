using System.Collections.Generic;
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
        // A citation: what was recorded, when, and what it cost — the "evidence"
        // trail the source rulebook calls for (time, offence, amount). No
        // dispute/virtual-court UI yet — this is the data it would need.
        public readonly struct Citation { public readonly Offence Offence; public readonly float Time; public readonly Vector3 Location; public readonly int Fine; public readonly int Points;
            public Citation(Offence o,float t,Vector3 l,int f,int p){Offence=o;Time=t;Location=l;Fine=f;Points=p;} }
        // One record per driver — player or NPC — so repeat-offender escalation
        // and rolling-window points work identically for both.
        sealed class DriverRecord { public readonly List<Citation> History=new(); public float SuspendedUntil; public float LastCitedAt=-999; }
        readonly Dictionary<Transform,DriverRecord> records=new();
        DriverRecord RecordFor(Transform t){if(!records.TryGetValue(t,out var r)){r=new DriverRecord();records[t]=r;}return r;}
        int pendingFine; TrafficVehicle responding;Transform offender;Vector3[] patrol;float reportCooldown,reroute,stopped;
        AudioSource siren;
        CharacterController officer;float officerVertical;
        void Awake(){Instance=this;}
        void OnDestroy(){if(Instance==this)Instance=null;}
        void Start(){siren=gameObject.AddComponent<AudioSource>();siren.clip=Resources.Load<AudioClip>("Audio/siren");siren.loop=true;siren.volume=.12f;siren.playOnAwake=false;}
        public int PenaltyPoints=>RollingPoints(Player?Player.transform:null,Time.time);
        public bool Disqualified=>Player&&records.TryGetValue(Player.transform,out var r)&&Time.time<r.SuspendedUntil;
        public float DisqualifiedUntil=>Player&&records.TryGetValue(Player.transform,out var r)?r.SuspendedUntil:0;
        int RollingPoints(Transform driver,float now)
        {
            if(!driver||!records.TryGetValue(driver,out var r))return 0;
            int total=0;foreach(var c in r.History)if(now-c.Time<TrafficOffences.PointRollingWindow)total+=c.Points;return total;
        }
        // How many times this SAME offence has already been cited (within the
        // repeat-offender window) before this one — 0 the first time, 1 the
        // second (1.5x fine), 2+ the third onward (2x fine).
        int RepeatCount(DriverRecord r,Offence offence,float now)
        {
            int n=0;foreach(var c in r.History)if(c.Offence==offence&&now-c.Time<TrafficOffences.RepeatWindow)n++;return n;
        }
        // Legacy string-reason entry point (kept for anything not yet ported to
        // the Offence catalogue, e.g. power/vehicle damage reports elsewhere).
        public void Report(Transform target,string reason)
        {
            if(!target||target==Player?.transform&&Time.time<reportCooldown)return;
            if(target==Player?.transform)reportCooldown=Time.time+8;
            offender=target;Reason=reason;Wanted=Mathf.Min(3,Wanted+1);pendingFine+=25;
            if(!responding)
            {
                float best=float.MaxValue;foreach(var car in RoadNetwork.Instance.Vehicles)
                    if(car.Kind=="police"&&!car.PlayerControlled){float d=(car.transform.position-target.position).sqrMagnitude;if(d<best){responding=car;best=d;}}
                if(responding){patrol=responding.Route;reroute=0;}
            }
            CityServices.Instance.Notify("Police pursuing: "+reason+". Stop and press E when an officer reaches you.");
            if(siren&&siren.clip&&!siren.isPlaying)siren.Play();
        }
        // Real offence: applies the catalogue's fine/points — escalated if this
        // is a repeat of the same offence — and branches player vs NPC
        // consequences. Police responding to a call are exempt (fair-enforcement
        // allowance for emergency situations, same as the source rulebook asks for).
        public void Report(Transform target,Offence offence)
        {
            var info=TrafficOffences.Describe(offence);
            var record=RecordFor(target);
            float now=Time.time;
            int repeats=RepeatCount(record,offence,now);
            int fine=Mathf.RoundToInt(info.Fine*(repeats<=0?1f:repeats==1?1.5f:2f));
            record.History.Add(new Citation(offence,now,target.position,fine,info.Points));
            if(info.Points>0&&RollingPoints(target,now)>=TrafficOffences.SuspendAtPoints||info.ImmediateSuspension)
                record.SuspendedUntil=Mathf.Max(record.SuspendedUntil,now+TrafficOffences.SuspensionSeconds);
            if(target==Player?.transform)
            {
                if(now<reportCooldown)return;reportCooldown=now+8;
                offender=target;Reason=info.Reason;Wanted=Mathf.Min(3,Wanted+1);pendingFine+=fine;
                if(!responding)
                {
                    float best=float.MaxValue;foreach(var car in RoadNetwork.Instance.Vehicles)
                        if(car.Kind=="police"&&!car.PlayerControlled){float d=(car.transform.position-target.position).sqrMagnitude;if(d<best){responding=car;best=d;}}
                    if(responding){patrol=responding.Route;reroute=0;}
                }
                CityServices.Instance.Notify("Police pursuing: "+info.Reason+(repeats>0?" (repeat offence, fine x"+(repeats==1?"1.5":"2"):"")+(repeats>0?")":"")+". Stop and press E when an officer reaches you.");
                if(siren&&siren.clip&&!siren.isPlaying)siren.Play();
            }
            else CiteNpc(target,record,info,fine,now);
        }
        // NPCs can't pay a fine or hold a licence — the realistic in-world
        // consequence is being pulled over on the spot: a short, silent stop
        // (no chase, no player-facing HUD spam) rather than skipping
        // enforcement for them entirely.
        void CiteNpc(Transform target,DriverRecord record,OffenceInfo info,int fine,float now)
        {
            if(now<record.LastCitedAt+10)return;
            record.LastCitedAt=now;
            var car=target.GetComponent<TrafficVehicle>();
            if(car&&!car.PlayerControlled&&car.Kind!="police")StartCoroutine(PullOver(car));
            Debug.Log("Traffic citation: "+target.name+" — "+info.Reason+" ("+fine+" coins"+(info.Points>0?", "+info.Points+" pts":"")+")");
        }
        System.Collections.IEnumerator PullOver(TrafficVehicle car)
        {
            car.DispatchHold=true;yield return new WaitForSeconds(3);if(car)car.DispatchHold=false;
        }
        public void ObserveTravel(Vector3 from,Vector3 to,RoadUser user,float length)=>Observe(Player.transform,from,to,user,length,Player.VehicleSpeed);
        // driver: whoever travelled from -> to (player or an NPC TrafficVehicle's
        // transform) — every rule below applies identically regardless of who's driving.
        public void Observe(Transform driver,Vector3 from,Vector3 to,RoadUser user,float length,float speed)
        {
            // Fair enforcement: a vehicle already being pulled over, or the
            // responding patrol itself, doesn't get double-cited mid-stop.
            if(records.TryGetValue(driver,out var active)&&Time.time<active.LastCitedAt+3)return;
            var delta=to-from;if(delta.sqrMagnitude<.00001f)return;var axis=RoadNetwork.Axis(delta);var direction=delta.normalized;
            foreach(var j in RoadNetwork.Instance.Junctions)
            {
                var a=from-j.Position;var b=to-j.Position;
                if(user==RoadUser.Pedestrian)
                {
                    float before=axis==TravelAxis.X?Mathf.Abs(a.x):Mathf.Abs(a.z),after=axis==TravelAxis.X?Mathf.Abs(b.x):Mathf.Abs(b.z);
                    float lateral=axis==TravelAxis.X?Mathf.Abs(b.z):Mathf.Abs(b.x);
                    if(before>=TrafficRules.RoadHalfWidth&&after<TrafficRules.RoadHalfWidth&&lateral>=16.7f&&lateral<=19.3f&&j.Rules.Signal(user,axis)!=SignalState.Green)
                        Report(driver,Offence.FailGiveWayPedestrian);
                    continue;
                }
                float side=axis==TravelAxis.X?Mathf.Abs(a.z):Mathf.Abs(a.x);if(side>TrafficRules.RoadHalfWidth)continue;
                float beforeAhead=Vector3.Dot(j.Position-from,direction),afterAhead=Vector3.Dot(j.Position-to,direction);
                float line=TrafficRules.StopLine+length*.5f;
                if(beforeAhead>=line&&afterAhead<line&&j.Rules.Signal(user,axis)==SignalState.Red)
                    Report(driver,j.Rules.Phase==JunctionPhase.Pedestrians?Offence.FailGiveWayPedestrian:user==RoadUser.Tram?Offence.TramYield:Offence.RedSignal);
                if(j.Rules.Roundabout&&beforeAhead>=line&&afterAhead<line)
                    foreach(var car in RoadNetwork.Instance.Vehicles)if(car.transform!=driver&&Vector3.Distance(car.transform.position,j.Position)<15&&Vector3.Distance(car.transform.position,j.Position+(from-j.Position).normalized*11.5f)<8){Report(driver,Offence.FailGiveWay);break;}
            }
            if(user==RoadUser.Car&&speed>4)
            {
                float over=speed-TrafficRules.SpeedLimit;
                if(over>12)Report(driver,Offence.Speeding4);
                else if(over>6)Report(driver,Offence.Speeding3);
                else if(over>3)Report(driver,Offence.Speeding2);
                else if(over>0)Report(driver,Offence.Speeding1);
                var near=RoadNetwork.Instance.NearestJunction(to);
                if(near!=null&&near.Rules.Roundabout&&Vector3.Distance(to,near.Position)<7)Report(driver,Offence.BlockingIntersection);
                if(near!=null&&Vector3.Distance(to,near.Position)<26)return;
                float centre=axis==TravelAxis.X?Mathf.Round(to.z/64)*64:Mathf.Round(to.x/64)*64;
                var offset=axis==TravelAxis.X?new Vector3(0,0,to.z-centre):new Vector3(to.x-centre,0,0);
                if(Vector3.Dot(offset,LaneRoute.Right(direction))<-2)Report(driver,Offence.WrongWay);
                float lane=Mathf.Abs(Vector3.Dot(offset,LaneRoute.Right(direction)));
                if(lane>TrafficRules.CarLane+1.5f&&lane<=TrafficRules.RoadHalfWidth)Report(driver,Offence.CycleLane);
                else if(lane>TrafficRules.RoadHalfWidth&&lane<=TrafficRules.RoadHalfWidth+8)Report(driver,Offence.PavementDriving);
            }
        }
        // Seatbelt, phone, insurance, cargo and air-corridor offences aren't
        // one-off boundary crossings like a red light — they're an ongoing
        // state that's wrong for as long as it holds. Checked periodically
        // (every 4s, via Update()) rather than every frame; Report()'s own
        // per-driver cooldowns stop this from citing the same offender twice
        // in the same window.
        void ScanCompliance()
        {
            if(Player&&Player.IsDriving)
            {
                if(Player.VehicleSpeed>2&&!Player.SeatbeltOn)Report(Player.transform,Offence.NoSeatbelt);
                if(Player.PhoneInUse)Report(Player.transform,Offence.HandheldPhone);
            }
            foreach(var car in RoadNetwork.Instance.Vehicles)
            {
                if(car.Abandoned||car.Sinking)continue;
                // A player-driven car's own transform isn't Player.transform —
                // route the citation to the actual driver either way.
                var driver=car.PlayerControlled&&Player!=null?Player.transform:car.transform;
                if(car.Speed>2&&!car.Insured)Report(driver,Offence.NoInsurance);
                if(car.HasCargo&&!car.CargoSecured&&car.Speed>2)Report(driver,Offence.UnsecuredCargo);
                if(car.CanFly&&car.transform.position.y>AirCorridor.Floor&&!AirCorridor.InPermittedCorridor(car.transform.position))
                    Report(driver,Offence.ProhibitedAirCorridor);
            }
        }
        float complianceTimer;
        void Update()
        {
            complianceTimer-=Time.deltaTime;
            if(complianceTimer<=0){complianceTimer=4;ScanCompliance();}
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
            int fine=Mathf.Max(25*Wanted,pendingFine);Player.Coins=Mathf.Max(0,Player.Coins-fine);Wanted=0;offender=null;stopped=0;pendingFine=0;
            if(officer){Destroy(officer.gameObject);officer=null;}
            if(responding){responding.DispatchHold=false;responding.SetRoute(patrol);responding=null;}if(siren)siren.Stop();
            CityServices.Instance.Notify(Disqualified
                ?"Traffic report settled. Fine: "+fine+" coins. Licence SUSPENDED ("+PenaltyPoints+" points) — no driving for "+Mathf.CeilToInt(DisqualifiedUntil-Time.time)+"s."
                :"Traffic report settled. Fine: "+fine+" coins. Points: "+PenaltyPoints+"/"+TrafficOffences.SuspendAtPoints+". Patrol resumed.");
        }
        void OnGUI()
        {
            if(Wanted>0)GUI.Label(new Rect(14,125,850,28),"WANTED "+Wanted+" — "+Reason+" — patrol responding");
            if(Disqualified)GUI.Label(new Rect(14,153,850,28),"LICENCE SUSPENDED — "+Mathf.CeilToInt(DisqualifiedUntil-Time.time)+"s remaining ("+PenaltyPoints+" points)");
        }
    }
}
