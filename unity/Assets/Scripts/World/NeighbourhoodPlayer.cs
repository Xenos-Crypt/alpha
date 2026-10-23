using UnityEngine;
using AnotherWorld.Traffic;
using AnotherWorld.Rendering;

namespace AnotherWorld.World
{
    public sealed class NeighbourhoodPlayer : MonoBehaviour
    {
        public Camera View;
        public Transform Avatar;
        CharacterController body;
        TrafficVehicle driving;
        Transform drivingRider;
        TrafficVehicle bus;
        TramService tram;
        FerryService ferry;
        IntercityMaglev train;
        public int Coins=100,Savings,Knowledge,Groceries;
        int health=100;
        public int Health {get=>health;set{if(value<health&&Powers&&Powers.Invulnerable)return;health=Mathf.Clamp(value,0,100);}}
        float yaw=-110,pitch=3,verticalSpeed,driveSpeed,pendingLaunch,drowningDamage;
        bool thirdPerson=true;
        public bool IsThirdPerson=>thirdPerson;
        public bool TouchControlsVisible=>Application.isMobilePlatform||Screen.width<=900;
        public Rect InteractTouchRect=>new Rect(Screen.width-84,Screen.height-220,60,52);
        public bool PointerOverInteract=>TouchControlsVisible&&InteractTouchRect.Contains(new Vector2(Input.mousePosition.x,Screen.height-Input.mousePosition.y));
        public bool IsDriving=>driving!=null;
        public bool IsRidingTransit=>tram!=null||bus!=null||ferry!=null||train!=null;
        public float VehicleSpeed=>driving?driving.Speed:0;
        public float WalkingSpeed=>body&&body.enabled?body.velocity.magnitude:0;
        public bool Swimming=>!driving&&!tram&&!bus&&!ferry&&!train&&transform.position.y<.6f&&WorldGeography.IsWater(transform.position);
        public float Stamina=100;
        public PlayerPowers Powers { get; private set; }
        // Unbuckled by default on entering a vehicle — matches the real risk
        // the offence models (you have to deliberately buckle up). B toggles,
        // P holds for handheld-phone use while driving.
        public bool SeatbeltOn,PhoneInUse;
        float touchMove,touchTurn,touchLift;
        bool resting;float restTimer;Vector3 restPosition;Vector3 avatarBaseScale=Vector3.one,avatarBaseLocalPos;
        void Awake(){body=GetComponent<CharacterController>();Powers=gameObject.AddComponent<PlayerPowers>();if(Avatar){avatarBaseScale=Avatar.localScale;avatarBaseLocalPos=Avatar.localPosition;}}
        // No skeletal animation exists for sitting/lying — approximated by
        // pinning position and squashing the avatar for a held duration,
        // the same cheap trick non-animated character controllers use.
        public void Rest(Vector3 position,Vector3 facing,float seconds)
        {
            resting=true;restTimer=seconds;restPosition=position;Face(facing);
            if(Avatar){Avatar.localScale=new Vector3(avatarBaseScale.x,avatarBaseScale.y*.55f,avatarBaseScale.z);Avatar.localPosition=avatarBaseLocalPos+Vector3.down*avatarBaseScale.y*.18f;}
        }
        public void Face(Vector3 point)
        {
            var direction=point-transform.position;direction.y=0;if(direction.sqrMagnitude<.01f)return;
            yaw=Quaternion.LookRotation(direction).eulerAngles.y;pitch=GovernmentTeleport.InUsa(transform.position)?-8:8;if(Avatar)Avatar.rotation=Quaternion.LookRotation(direction);
        }
        void Update()
        {
            if(resting)
            {
                restTimer-=Time.deltaTime;transform.position=restPosition;touchMove=touchTurn=touchLift=0;
                if(restTimer<=0){resting=false;if(Avatar){Avatar.localScale=avatarBaseScale;Avatar.localPosition=avatarBaseLocalPos;}CityServices.Instance.Notify("You get up.");}
                return;
            }
            bool menu=ScalableQuality.Instance&&ScalableQuality.Instance.MenuOpen||CityServices.Instance&&CityServices.Instance.MenuOpen;
            if(Input.GetKeyDown(KeyCode.F))thirdPerson=!thirdPerson;
            if(!menu&&!Powers.Invulnerable&&Input.GetKeyDown(KeyCode.E))Interact();
            if(!menu&&!Powers.Invulnerable&&Input.GetKeyDown(KeyCode.G)&&!IsDriving&&!IsRidingTransit)TryStealNearby();
            if(!menu&&IsDriving&&Input.GetKeyDown(KeyCode.B))SeatbeltOn=!SeatbeltOn;
            PhoneInUse=!menu&&IsDriving&&Input.GetKey(KeyCode.P);
            if(menu){touchMove=touchTurn=touchLift=0;return;}
            var before=transform.position;
            float dt=Time.deltaTime,forward=Mathf.Clamp(Input.GetAxisRaw("Vertical")+touchMove,-1,1),side=Mathf.Clamp(Input.GetAxisRaw("Horizontal")+touchTurn,-1,1);
            if(Input.GetMouseButton(1)){yaw+=Input.GetAxis("Mouse X")*2.4f;pitch=Mathf.Clamp(pitch-Input.GetAxis("Mouse Y")*2,-55,65);}
            if(driving)
            {
                bool nitro=forward>0&&(Input.GetKey(KeyCode.LeftShift)||Input.GetKey(KeyCode.RightShift));
                float topSpeed=forward<0?6:driving.MaxDriveSpeed*(nitro?1.75f:1);
                driveSpeed=Mathf.MoveTowards(driveSpeed,driving.Integrity<=0||driving.Stunned?0:forward*topSpeed,dt*(forward==0?10:nitro?12:6));
                driving.transform.Rotate(0,side*driving.TurnRate*dt*(driving.CanFly?1:Mathf.Min(1,Mathf.Abs(driveSpeed)/3)),0);
                Vector3 direction=driving.transform.forward*Mathf.Sign(driveSpeed);
                float travel=driving.CanFly&&driving.transform.position.y>5?Mathf.Abs(driveSpeed)*dt:RoadNetwork.Instance.Limit(driving.transform.position,direction,Mathf.Abs(driveSpeed)*dt,RoadUser.Car,driving.Length,driving,false);
                travel=driving.ClearTravel(direction,travel);
                driving.transform.position+=direction*travel;driving.Speed=dt>0?travel/dt:0;if(travel<Mathf.Abs(driveSpeed)*dt-.001f)driveSpeed=0;
                driving.FollowSurface(dt);
                if(driving.Sinking){EscapeSinkingVehicle();return;}
                if(driving.CanFly)
                {
                    float lift=Input.GetKey(KeyCode.Space)?1:Input.GetKey(KeyCode.Q)?-1:touchLift;
                    var vertical=Vector3.up*lift;float amount=driving.ClearTravel(vertical,Mathf.Abs(lift)*driving.LiftSpeed*dt);
                    var next=driving.transform.position+vertical*amount;next.y=Mathf.Clamp(next.y,.1f,100);driving.transform.position=next;
                }
                transform.position=driving.transform.position;yaw=driving.transform.eulerAngles.y;
            }
            else if(train){transform.position=train.transform.position+Vector3.up*.5f;}
            else if(tram){transform.position=tram.transform.position+new Vector3(2,0,-.6f);}
            else if(bus){transform.position=bus.transform.position+Vector3.up*.8f;}
            else if(ferry){transform.position=ferry.Vessel.position+Vector3.up*1.4f;}
            else
            {
                yaw+=touchTurn*70*dt;
                var movement=Quaternion.Euler(0,yaw,0)*new Vector3(side,0,forward);if(movement.sqrMagnitude>1)movement.Normalize();
                MoveOnFoot(movement,Input.GetKey(KeyCode.LeftShift)||Input.GetKey(KeyCode.RightShift),dt);
                if(Avatar&&movement.sqrMagnitude>.01f)Avatar.rotation=Quaternion.LookRotation(movement);
            }
            touchMove=touchTurn=touchLift=0;
            if(!tram&&!bus&&!ferry&&!train&&PoliceDispatch.Instance)PoliceDispatch.Instance.ObserveTravel(before,transform.position,driving?RoadUser.Car:RoadUser.Pedestrian,driving?driving.Length:0);
        }
        public void MoveOnFoot(Vector3 movement,bool sprint,float dt)
        {
            if(Powers&&Powers.Invulnerable){Powers.Presentation.MovePuddle(movement,dt);return;}
            if(Powers&&Powers.EarthWind&&Powers.EarthWind.Air&&Powers.EarthWind.Air.ControlsMovement){Powers.EarthWind.MoveFlight(movement,dt,touchLift);return;}
            bool wet=Swimming;
            if(wet)
            {
                pendingLaunch=0;
                bool tide=Powers&&Powers.Element==2;
                Stamina=Mathf.Max(0,Stamina-dt*(tide?.12f:sprint?1.8f:movement.sqrMagnitude>.01f?.65f:.2f));
                if(Stamina<=0){drowningDamage+=12*dt;int damage=Mathf.FloorToInt(drowningDamage);Health=Mathf.Max(0,Health-damage);drowningDamage-=damage;}
                verticalSpeed=Mathf.Clamp((-1.05f-transform.position.y)*4,-3,3);
                var next=transform.position+movement*(sprint?4:2.3f)*(tide?1.3f:1)*dt;
                if(!WorldGeography.IsWater(next))
                {
                    var landing=new Vector3(next.x,.12f,next.z);
                    bool blocked=false;foreach(var hit in Physics.OverlapCapsule(landing+Vector3.up*.4f,landing+Vector3.up*1.5f,.3f,~0,QueryTriggerInteraction.Ignore))if(!hit.transform.IsChildOf(transform))blocked=true;
                    if(!blocked)
                    {body.enabled=false;transform.position=landing;body.enabled=true;verticalSpeed=-2;return;}
                }
                body.Move((movement*(Stamina<=0?1:sprint?4:2.3f)*(tide?1.3f:1)+Vector3.up*verticalSpeed)*dt);
            }
            else
            {
                Stamina=Mathf.Min(100,Stamina+dt*8);
                if(pendingLaunch!=0){verticalSpeed=pendingLaunch;pendingLaunch=0;}
                else if(body.isGrounded){verticalSpeed=-2;if(Input.GetKeyDown(KeyCode.Space))verticalSpeed=Powers&&Powers.Element==1?12:9;}else verticalSpeed-=20*dt;
                body.Move((movement*(sprint?6:3.8f)+Vector3.up*verticalSpeed)*dt);
            }
        }
        public void EscapeSinkingVehicle()
        {
            if(!driving)return;var old=driving;driving=null;old.PlayerControlled=false;driveSpeed=0;
            if(drivingRider)Destroy(drivingRider.gameObject);drivingRider=null;
            var escape=old.transform.position+old.transform.right*(old.Width*.5f+.8f);transform.position=new Vector3(escape.x,-.8f,escape.z);body.enabled=true;
            CityServices.Instance.Notify("Vehicle sinking! You escaped into the water. Swim toward shore; Shift swims faster.");
        }
        public void Launch(float speed){pendingLaunch=speed;}
        public void RequestLift(float lift){touchLift=lift;}
        [System.Serializable] sealed class MovementReport {public bool Swimming,Driving;public float Stamina,Energy;public int Element;public Vector3 Position;}
        public void ReportMovement(){Debug.Log("HIDROK_MOVEMENT:"+JsonUtility.ToJson(new MovementReport{Swimming=Swimming,Driving=IsDriving,Stamina=Stamina,Energy=Powers.Energy,Element=Powers.Element,Position=transform.position}));}
        void LateUpdate()
        {
            var rotation=Quaternion.Euler(pitch,yaw,0);var target=transform.position+Vector3.up*(tram||bus?2:driving?1.25f:1.65f);
            View.transform.rotation=rotation;
            var offset=-(rotation*Vector3.forward)*(driving?Mathf.Max(5,driving.Length*.8f):5)+Vector3.up*1.2f;
            float distance=offset.magnitude;
            foreach(var hit in Physics.SphereCastAll(target,.2f,offset.normalized,distance,~0,QueryTriggerInteraction.Ignore))
                if(!hit.transform.IsChildOf(transform)&&!(driving&&hit.transform.IsChildOf(driving.transform)))distance=Mathf.Min(distance,Mathf.Max(.35f,hit.distance-.2f));
            View.transform.position=thirdPerson?target+offset.normalized*distance:target;
            if(Avatar)Avatar.gameObject.SetActive(thirdPerson&&!driving&&!tram&&!bus&&!train&&!Powers.Invulnerable);
        }
        void Interact()
        {
            if(PoliceDispatch.Instance&&PoliceDispatch.Instance.CanSurrender){PoliceDispatch.Instance.Surrender();return;}
            if(train){if(!train.DoorsOpen)return;transform.position=train.BoardingPoint;train=null;body.enabled=true;return;}
            if(ferry){if(!ferry.DoorsOpen)return;transform.position=ferry.BoardingPoint;ferry=null;body.enabled=true;return;}
            if(tram){if(!tram.DoorsOpen)return;transform.position=tram.transform.position+new Vector3(0,.35f,3.25f);tram=null;body.enabled=true;return;}
            if(bus){if(!bus.DoorsOpen)return;transform.position=bus.ExitPosition;bus=null;body.enabled=true;return;}
            if(driving)
            {
                if(Mathf.Abs(driveSpeed)>1)return;if(driving.CanFly&&driving.transform.position.y>1){CityServices.Instance.Notify("Land the skycar before leaving.");return;}var old=driving;
                var exit=old.transform.position+old.transform.right*(old.Width*.5f+1)+Vector3.up*.3f;
                if(Physics.CheckCapsule(exit+Vector3.up*.4f,exit+Vector3.up*1.5f,.3f)){CityServices.Instance.Notify("Exit blocked. Move to a clear place.");return;}
                driving=null;old.Speed=0;old.PlayerControlled=false;old.Abandoned=true;if(drivingRider)Destroy(drivingRider.gameObject);drivingRider=null;transform.position=exit;body.enabled=true;return;
            }
            var network=RoadNetwork.Instance;
            if(FerryService.Instance&&FerryService.Instance.DoorsOpen&&Vector3.Distance(transform.position,FerryService.Instance.BoardingPoint)<4){ferry=FerryService.Instance;body.enabled=false;return;}
            if(IntercityMaglev.Instance&&IntercityMaglev.Instance.DoorsOpen&&Vector3.Distance(transform.position,IntercityMaglev.Instance.BoardingPoint)<3){train=IntercityMaglev.Instance;body.enabled=false;return;}
            var button=network.NearestButton(transform.position);if(button){button.Press();return;}
            var place=CityServices.Instance.Nearby(transform.position);if(place){CityServices.Instance.Open(place);return;}
            if(network.Tram&&network.Tram.DoorsOpen&&Mathf.Abs(transform.position.x-network.Tram.transform.position.x)<9&&Mathf.Abs(Mathf.Abs(transform.position.z)-3.25f)<1.4f){tram=network.Tram;body.enabled=false;return;}
            foreach(var vehicle in network.Vehicles)if(vehicle.Kind=="bus"&&vehicle.DoorsOpen&&Vector3.Distance(vehicle.ExitPosition,transform.position)<4){bus=vehicle;body.enabled=false;return;}
            TryStealNearby(false);
        }
        public bool TakeVehicle(TrafficVehicle car)
        {
            if(Powers.Invulnerable||!car||car.Sinking||car.Integrity<=0||IsDriving||IsRidingTransit||car.Kind=="tram"||car.Kind=="train"||car.PlayerControlled||car.Speed>2.5f)return false;
            // Licences are only required for motor vehicles — a suspended driver can still cycle.
            if(car.Kind!="bicycle"&&Traffic.PoliceDispatch.Instance&&Traffic.PoliceDispatch.Instance.Disqualified)
            {CityServices.Instance.Notify("Licence suspended — too many penalty points. Can't drive for "+Mathf.CeilToInt(Traffic.PoliceDispatch.Instance.DisqualifiedUntil-Time.time)+"s.");return false;}
            if(car.Rider)
            {
                // Retire the seated rig and create a walking civilian on the nearest safe footway.
                Destroy(car.Rider.gameObject);car.Rider=null;
                var junction=RoadNetwork.Instance.NearestJunction(car.transform.position);
                var local=car.transform.position-junction.Position;
                var p=junction.Position+new Vector3(local.x>=0?22:-22,.2f,local.z>=0?22:-22);
                var person=WorldShapes.Person(car.transform.parent,new Color(.18f,.24f,.28f));person.position=p;
                person.gameObject.AddComponent<CrossingWalker>().Waypoints=new[]{p,p+new Vector3(0,0,local.z>=0?18:-18)};
            }
            driving=car;car.Stolen=!car.Owned;car.Insured=car.Owned;car.Abandoned=false;car.PlayerControlled=true;car.Speed=0;SeatbeltOn=false;
            body.enabled=false;driveSpeed=0;thirdPerson=true;
            if(car.Kind=="motorcycle"||car.Kind=="bicycle")
            {drivingRider=WorldShapes.Person(car.transform,new Color(.2f,.45f,.38f),true);drivingRider.localPosition=new Vector3(0,.2f,-.31f);}
            if(!car.Owned)PoliceDispatch.Instance.Report(transform,"vehicle theft: "+car.Kind);
            CityServices.Instance.Notify(car.Owned?"Your vehicle. E to leave when stopped.":"Stolen vehicle. Police alerted. E to leave when stopped.");return true;
        }
        void TryStealNearby(bool includeBus=true)
        {
            TrafficVehicle best=null;float nearest=3.5f;
            foreach(var car in RoadNetwork.Instance.Vehicles)
            {
                if((!includeBus&&car.Kind=="bus")||car.Speed>2.5f||car.PlayerControlled)continue;
                var collider=car.GetComponent<Collider>();float distance=Vector3.Distance(transform.position,collider?collider.ClosestPoint(transform.position):car.transform.position);
                if(distance<nearest){nearest=distance;best=car;}
            }
            if(best)TakeVehicle(best);
        }
        void OnGUI()
        {
            if(Swimming)GUI.Label(new Rect(14,110,800,25),"Swimming | Stamina "+Mathf.CeilToInt(Stamina)+" | WASD to shore, Shift to swim faster | Tide uses less stamina");
            GUI.Label(new Rect(14,14,850,28),"Another World — WASD move · Right mouse look · E enter / leave � G steal road vehicle · F camera");
            if(IsDriving)GUI.Label(new Rect(14,Screen.height-56,1100,24),(SeatbeltOn?"Seat belt ON":"Seat belt OFF — press B")+"   ·   Hold Shift: nitro"+(driving.CanFly?"   ·   Space up / Q down":"")+"   ·   Hold P: use phone (distracted driving)");
            if(!IsDriving&&!tram&&!bus&&!(ScalableQuality.Instance&&ScalableQuality.Instance.MenuOpen)&&!(CityServices.Instance&&CityServices.Instance.MenuOpen))
            {
                var button=RoadNetwork.Instance.NearestButton(transform.position);
                if(button)
                {
                    GUI.Label(new Rect(18,Screen.height-300,650,28),"Press a crossing button and wait for that direction's green.");
                    float width=Mathf.Min(150,(Screen.width-48)/3f);
                    var d=transform.position-button.Junction.Position;
                    if(GUI.Button(new Rect(18,Screen.height-268,width,42),d.x>0?"Cross west":"Cross east"))button.Junction.Rules.RequestCrossing(TravelAxis.X);
                    if(GUI.Button(new Rect(24+width,Screen.height-268,width,42),d.z>0?"Cross south":"Cross north"))button.Junction.Rules.RequestCrossing(TravelAxis.Z);
                    if(GUI.Button(new Rect(30+width*2,Screen.height-268,width,42),"Both crossings")){button.Junction.Rules.RequestCrossing(TravelAxis.X);button.Junction.Rules.RequestCrossing(TravelAxis.Z);}
                }
                var place=CityServices.Instance.Nearby(transform.position);if(place)GUI.Label(new Rect(18,Screen.height-40,600,25),"E — Enter "+place.Name);
            }
            if(!Application.isMobilePlatform&&Screen.width>900)return;
            if(ScalableQuality.Instance&&ScalableQuality.Instance.MenuOpen)return;
            if(CityServices.Instance&&CityServices.Instance.MenuOpen)return;
            float y=Screen.height-76;
            if(GUI.RepeatButton(new Rect(18,y,60,56),"◀"))touchTurn=-1;
            if(GUI.RepeatButton(new Rect(84,y,60,56),"▶"))touchTurn=1;
            if(GUI.RepeatButton(new Rect(Screen.width-150,y,60,56),"▼"))touchMove=-1;
            if(GUI.RepeatButton(new Rect(Screen.width-84,y,60,56),"▲"))touchMove=1;
            if(GUI.Button(InteractTouchRect,"E"))Interact();
            if(driving&&driving.CanFly)
            {
                if(GUI.RepeatButton(new Rect(Screen.width-220,y-62,60,52),"Up"))touchLift=1;
                if(GUI.RepeatButton(new Rect(Screen.width-288,y-62,60,52),"Down"))touchLift=-1;
            }
        }
    }
}
