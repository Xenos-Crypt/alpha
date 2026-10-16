using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using AnotherWorld.Traffic;
namespace AnotherWorld.World
{
    public sealed class ElementalPresentation : MonoBehaviour
    {
        public const float WaterDashSeconds=3;
        public bool Active {get;private set;}
        public bool Phasing {get;private set;}
        public bool Targeting {get;private set;}
        public Vector3 LastImpact {get;private set;}
        public string LastEffect {get;private set;}="";
        NeighbourhoodPlayer player;PlayerPowers powers;CharacterController body;GameObject marker,puddle;Vector3 aim,lastSafe;float phaseEnd;
        bool Menu=>Rendering.ScalableQuality.Instance&&Rendering.ScalableQuality.Instance.MenuOpen||CityServices.Instance&&CityServices.Instance.MenuOpen;
        void Ready(){if(player)return;player=GetComponent<NeighbourhoodPlayer>();powers=GetComponent<PlayerPowers>();body=GetComponent<CharacterController>();}
        Vector3 Forward {get{Ready();var d=player.View.transform.forward;d.y=0;return d.sqrMagnitude>.01f?d.normalized:Vector3.forward;}}
        public void AimMeteor(){Ready();Targeting=true;CityServices.Instance.Notify("Meteor Slam: aim at the ground, then click or tap the red target. Escape cancels.");}
        public void CancelTarget(){Targeting=false;if(marker)Destroy(marker);marker=null;}
        public Vector3 PointerGround(Vector2 screen)
        {
            Ready();var ray=player.View.ScreenPointToRay(screen);float distance=float.MaxValue;Vector3 point=transform.position+Forward*16;
            foreach(var hit in Physics.RaycastAll(ray,180,~0,QueryTriggerInteraction.Ignore))
                if(!hit.transform.IsChildOf(transform)&&hit.normal.y>.55f&&hit.distance<distance){distance=hit.distance;point=hit.point;}
            var offset=point-transform.position;offset.y=0;if(offset.magnitude>55)point=new Vector3(transform.position.x,point.y,transform.position.z)+offset.normalized*55;
            distance=float.MaxValue;foreach(var hit in Physics.RaycastAll(point+Vector3.up*60,Vector3.down,180,~0,QueryTriggerInteraction.Ignore))if(!hit.transform.IsChildOf(transform)&&hit.normal.y>.55f&&hit.distance<distance){distance=hit.distance;point=hit.point;}return point;
        }
        void Update()
        {
            Ready();if(Phasing&&Time.time>=phaseEnd)EndWaterDash();
            if(!Targeting)return;if(Menu||Input.GetKeyDown(KeyCode.Escape)){CancelTarget();return;}
            Vector2 pointer=Input.mousePosition;
            if(Input.touchCount>0)pointer=Input.GetTouch(0).position;
            if(pointer.y<150||pointer.x>Screen.width-150&&pointer.y>Screen.height-70)return;
            aim=PointerGround(pointer);
            if(!marker){marker=ElementalVisuals.Ring(aim,2.8f,Color.red);ElementalVisuals.Blob(marker.transform,"Red impact dot",Vector3.zero,Vector3.one*.16f,Color.red);}
            var ring=marker.GetComponent<LineRenderer>();for(int n=0;n<49;n++){float a=n*Mathf.PI/24;ring.SetPosition(n,aim+new Vector3(Mathf.Cos(a)*2.8f,.035f,Mathf.Sin(a)*2.8f));}marker.transform.GetChild(0).position=aim+Vector3.up*.08f;
            if(Input.touchCount>0?Input.GetTouch(0).phase==TouchPhase.Ended:Input.GetMouseButtonDown(0))powers.CommitMeteor(aim);
        }
        public void Play(int slot)
        {
            Ready();if(player.Avatar)player.Avatar.rotation=Quaternion.LookRotation(Forward);if(powers.Element==0)StartCoroutine(slot==0?FlameDash():RisingBlaze());
            else if(slot==0)BeginWaterDash();else if(slot==1)StartCoroutine(Geyser());else if(slot==2)StartCoroutine(WaterBarrage());else StartCoroutine(Tsunami());
        }
        public void DropMeteor(Vector3 point){CancelTarget();StartCoroutine(Meteor(point));}
        IEnumerator Meteor(Vector3 point)
        {
            Ready();Active=true;LastEffect="Meteor Slam";bool empowered=powers.FireEmpowered;var target=ElementalVisuals.Ring(point,2.8f,Color.red);var dot=ElementalVisuals.Blob(target.transform,"Confirmed red impact dot",Vector3.zero,Vector3.one*.18f,Color.red);dot.transform.position=point+Vector3.up*.08f;yield return new WaitForSeconds(.35f);
            var rock=GameObject.CreatePrimitive(PrimitiveType.Sphere);rock.name="Falling meteorite";rock.GetComponent<Collider>().enabled=false;Destroy(rock.GetComponent<Collider>());
            var mesh=Instantiate(rock.GetComponent<MeshFilter>().sharedMesh);var vertices=mesh.vertices;
            for(int i=0;i<vertices.Length;i++)vertices[i]*=.82f+Mathf.PerlinNoise(vertices[i].x*7+12,vertices[i].z*7+vertices[i].y*4)*.4f;
            mesh.vertices=vertices;mesh.RecalculateNormals();rock.GetComponent<MeshFilter>().sharedMesh=mesh;ElementalVisuals.OwnMesh(rock);rock.transform.localScale=Vector3.one*3;
            if(empowered)rock.transform.localScale*=1.4f;
            rock.GetComponent<Renderer>().sharedMaterial=ElementalVisuals.Paint("Meteor basalt",new Color(.16f,.075f,.025f));var fire=ElementalVisuals.Flame(rock.transform,Vector3.zero,empowered?5:3);
            var start=point+new Vector3(-12,34,-8);
            for(float t=0;t<1.2f;t+=Time.deltaTime){rock.transform.position=Vector3.Lerp(start,point+Vector3.up*1.2f,t/1.2f);rock.transform.Rotate(80*Time.deltaTime,60*Time.deltaTime,0);yield return null;}
            Destroy(rock);Destroy(target);LastImpact=point;powers.HitArea(point+Vector3.up*.5f,7,30,Vector3.zero,fireAttack:true,empoweredFire:empowered);ImpactCrater.Create(point);
            for(int i=0;i<10;i++){float a=i*Mathf.PI/5;var flame=ElementalVisuals.Flame(null,point+new Vector3(Mathf.Cos(a)*2.5f,.08f,Mathf.Sin(a)*2.5f),1.7f);Destroy(flame,7);}
            Active=false;
        }
        IEnumerator FlameDash()
        {
            Active=true;LastEffect="Flame Dash";bool empowered=powers.FireEmpowered;var direction=Forward;var feet=new GameObject[2];
            for(int i=0;i<2;i++){feet[i]=ElementalVisuals.Flame(player.Avatar,new Vector3(i==0?-.12f:.12f,.05f,0),empowered?3:1.7f);feet[i].name="Flame Dash ankle fire";}
            var hits=new HashSet<UnityEngine.Object>();
            for(float t=0;t<.6f;t+=Time.deltaTime)
            {
                var before=transform.position;body.Move(direction*20*Time.deltaTime);float distance=Vector3.Distance(before,transform.position);
                for(float d=0;d<=distance;d+=.7f)powers.HitArea(Vector3.Lerp(before,transform.position,d/Mathf.Max(.01f,distance))+Vector3.up,2.5f,14,direction*7,.2f,hits,fireAttack:true,empoweredFire:empowered);
                yield return null;
            }
            foreach(var foot in feet)ElementalVisuals.StopFlames(foot);Active=false;
        }
        IEnumerator RisingBlaze()
        {
            Active=true;LastEffect="Rising Blaze";bool empowered=powers.FireEmpowered;var direction=Forward;var sword=new GameObject("Rising Blaze sword");
            WorldShapes.Box(sword.transform,"White hot blade",new Vector3(.13f,1.9f,.06f),Vector3.up*.95f,ElementalVisuals.Paint("Sword core",new Color(1,.95f,.6f),true),false,false);
            WorldShapes.Box(sword.transform,"Sword guard",new Vector3(.5f,.08f,.14f),Vector3.zero,ElementalVisuals.Paint("Sword gold",new Color(1,.5f,.05f)),false,false);
            if(empowered)sword.transform.localScale=Vector3.one*1.4f;
            var flame=ElementalVisuals.Flame(sword.transform,Vector3.up*.5f,empowered?3:1.5f);var gait=player.Avatar.GetComponent<ResidentGait>();
            for(float t=0;t<.65f;t+=Time.deltaTime)
            {
                float fraction=t/.65f;sword.transform.position=transform.position+Vector3.up*1.1f+Vector3.Cross(Vector3.up,direction)*.3f+direction*.3f;
                sword.transform.rotation=Quaternion.LookRotation(direction)*Quaternion.Euler(Mathf.Lerp(80,-35,fraction),0,0);
                if(gait){gait.ActionUntil=Time.time+.1f;gait.ArmPitch=Mathf.Lerp(-40,-165,fraction);gait.BothArms=false;}
                yield return null;
            }
            powers.HitArea(transform.position+direction*3+Vector3.up,4,18,direction*9,fireAttack:true,empoweredFire:empowered);
            for(int i=0;i<5;i++){var plume=ElementalVisuals.Flame(null,transform.position+direction*(2+i)+Vector3.up*.1f,(2+i*.25f)*(empowered?1.7f:1));Destroy(plume,1.7f);}
            Destroy(sword);Active=false;
        }
        public void BeginWaterDash()
        {
            Ready();Active=Phasing=true;LastEffect="Water Dash";phaseEnd=Time.time+WaterDashSeconds;lastSafe=transform.position;body.enabled=false;
            puddle=ElementalVisuals.Blob(null,"Water Dash puddle",Vector3.zero,new Vector3(1.7f,.045f,1.3f),ElementalVisuals.Water);puddle.transform.position=transform.position+Vector3.up*.04f;
        }
        bool Clear(Vector3 point)
        {
            foreach(var hit in Physics.OverlapCapsule(point+Vector3.up*.4f,point+Vector3.up*1.5f,.3f,~0,QueryTriggerInteraction.Ignore))if(!hit.transform.IsChildOf(transform))return false;return true;
        }
        public void MovePuddle(Vector3 direction,float dt)
        {
            if(!Phasing)return;transform.position+=direction*10*dt;
            if(WorldGeography.IsWater(transform.position))transform.position=new Vector3(transform.position.x,.03f,transform.position.z);
            if(Clear(transform.position))lastSafe=transform.position;
            if(puddle){puddle.transform.position=transform.position+Vector3.up*.04f;puddle.transform.localScale=new Vector3(1.7f+Mathf.Sin(Time.time*12)*.12f,.045f,1.3f);}
        }
        public void EndWaterDash()
        {
            if(!Phasing)return;if(!Clear(transform.position))transform.position=lastSafe;
            if(WorldGeography.IsWater(transform.position))transform.position=new Vector3(transform.position.x,-.8f,transform.position.z);
            Phasing=Active=false;if(puddle)Destroy(puddle);body.enabled=true;
        }
        IEnumerator Geyser()
        {
            Active=true;LastEffect="Geyser Burst";var centre=transform.position+Forward*5;var jet=new GameObject("Geyser fountain");jet.transform.position=centre;
            SmoothShapes.Part(jet.transform,"Pressurized water column",SmoothShapes.Profile("Geyser flare",new[]{new Vector2(.3f,0),new Vector2(.25f,2),new Vector2(.7f,4),new Vector2(1.5f,6)},14),Vector3.one,Vector3.zero,ElementalVisuals.Paint("Geyser water",ElementalVisuals.Water));
            for(int i=0;i<8;i++){var spray=ElementalVisuals.Ribbon(jet.transform,"Fountain spray",ElementalVisuals.Foam,.16f);spray.positionCount=12;float a=i*Mathf.PI/4;for(int n=0;n<12;n++){float t=n/11f;spray.SetPosition(n,centre+new Vector3(Mathf.Cos(a)*t*3,6+t*2-t*t*7,Mathf.Sin(a)*t*3));}}
            bool splashed=false;for(float t=0;t<1.7f;t+=Time.deltaTime){jet.transform.localScale=new Vector3(1,Mathf.Clamp01(t*4),1);if(t>.2f&&!splashed){powers.HitArea(centre+Vector3.up,5,18,Vector3.zero);splashed=true;}yield return null;}
            Destroy(jet);Active=false;
        }
        IEnumerator WaterBarrage()
        {
            Active=true;LastEffect="Water Barrage";var direction=Forward;var target=PointerGround(Input.mousePosition)+Vector3.up;
            if(Vector3.Distance(target,transform.position)<3)target=transform.position+direction*20+Vector3.up;
            var gait=player.Avatar.GetComponent<ResidentGait>();
            for(int shot=0;shot<3;shot++)
            {
                var startPoint=transform.position+Vector3.up*1.2f;var previous=startPoint;
                for(int n=1;n<=16;n++)
                {
                    float f=n/16f;var next=Vector3.Lerp(startPoint,target,f)+Vector3.up*Mathf.Sin(f*Mathf.PI)*3+Vector3.Cross(Vector3.up,direction)*Mathf.Sin(f*Mathf.PI)*(shot%2==0?-2:2);
                    RaycastHit? blocked=null;foreach(var h in Physics.RaycastAll(previous,(next-previous).normalized,Vector3.Distance(previous,next),~0,QueryTriggerInteraction.Ignore))if(!h.transform.IsChildOf(transform)&&(!blocked.HasValue||h.distance<blocked.Value.distance))blocked=h;
                    if(blocked.HasValue){target=blocked.Value.point;break;}previous=next;
                }
                var stream=ElementalVisuals.Ribbon(null,"Curving water barrage",ElementalVisuals.Water,.32f);stream.positionCount=16;
                for(float elapsed=0;elapsed<.45f;elapsed+=Time.deltaTime)
                {
                    if(gait){gait.ActionUntil=Time.time+.12f;gait.ArmPitch=-80;gait.BothArms=true;}
                    var start=transform.position+Vector3.up*1.2f+Vector3.Cross(Vector3.up,direction)*(shot%2==0?-.5f:.5f);
                    for(int n=0;n<16;n++){float t=(n/15f)*Mathf.Clamp01(elapsed/.3f);stream.SetPosition(n,Vector3.Lerp(start,target,t)+Vector3.up*Mathf.Sin(t*Mathf.PI)*3+Vector3.Cross(Vector3.up,direction)*Mathf.Sin(t*Mathf.PI)*(shot%2==0?-2:2));}
                    yield return null;
                }
                powers.HitArea(target,2.5f,11,direction*6);Destroy(stream.gameObject);
            }
            Active=false;
        }
        IEnumerator Tsunami()
        {
            Active=true;LastEffect="Tsunami Slam";var direction=Forward;var origin=transform.position+direction*2;
            var waveMaterial=ElementalVisuals.Paint("Tsunami water",ElementalVisuals.Water);waveMaterial.SetFloat("_Cull",0);
            var wave=SmoothShapes.Part(null,"Travelling tsunami",ElementalVisuals.WaveMesh(),Vector3.one,origin,waveMaterial);wave.transform.rotation=Quaternion.LookRotation(direction);
            ElementalVisuals.OwnMesh(wave);
            var foam=ElementalVisuals.Ribbon(null,"Breaking white crest",ElementalVisuals.Foam,.5f);foam.positionCount=17;var hit=new HashSet<TrafficVehicle>();var pushed=new HashSet<CrossingWalker>();
            for(float t=0;t<3;t+=Time.deltaTime)
            {
                float distance=t*8;var centre=origin+direction*distance;
                if(Physics.Raycast(centre+Vector3.up*2,direction,1.5f,~0,QueryTriggerInteraction.Ignore))break;
                wave.transform.position=centre;wave.transform.localScale=new Vector3(1,Mathf.Min(1,t*3),1);
                for(int n=0;n<17;n++)foam.SetPosition(n,wave.transform.TransformPoint(new Vector3(n-8,5.95f,3.5f)));
                foreach(var vehicle in RoadNetwork.Instance.Vehicles)if(!hit.Contains(vehicle)&&Vector3.Distance(vehicle.transform.position,centre+direction*2)<8){hit.Add(vehicle);vehicle.Damage(30);PoliceDispatch.Instance.Report(transform,"tsunami damage to a vehicle");}
                foreach(var resident in RoadNetwork.Instance.Walkers)if(!pushed.Contains(resident)&&Vector3.Distance(resident.transform.position,centre+direction*2)<8){pushed.Add(resident);resident.ApplyHit(30,direction*12,1.5f);if(!resident.TrainingTarget)PoliceDispatch.Instance.Report(transform,"tsunami attack on a resident");}
                yield return null;
            }
            Destroy(wave);Destroy(foam.gameObject);Active=false;
        }
        void OnDisable(){CancelTarget();if(Phasing)EndWaterDash();}
        [System.Serializable] sealed class PowerReport {public bool Phasing,Targeting,Active,Flying,StoneFists,MeteorVisible,SwordVisible,WaveVisible,AnkleFlames,Inferno,AirLanding,CycloneVisible,AirBladesVisible,SlamImpact,SkyDominion;public string Effect;public Vector3 Impact,Position;public float Energy,Ultimate,InfernoSeconds,GameTime,FlightSeconds,DominionSeconds;public float[] Cooldowns;public int Element,WeatherSeverity,Craters,Residents,Children,Flowers,Butterflies,Ducks,BurningTargets,LiftedTargets;}
        public void ReportPresentation(){Ready();Debug.Log("HIDROK_POWERS:"+JsonUtility.ToJson(new PowerReport{Position=transform.position,GameTime=Time.time,AirLanding=powers.EarthWind.Air&&powers.EarthWind.Air.Landing,CycloneVisible=powers.EarthWind.Air&&powers.EarthWind.Air.CycloneVisible,AirBladesVisible=powers.EarthWind.Air&&powers.EarthWind.Air.BladesVisible,SlamImpact=powers.EarthWind.Air&&powers.EarthWind.Air.SlamImpact,SkyDominion=powers.EarthWind.Air&&powers.EarthWind.Air.Empowered,FlightSeconds=powers.EarthWind.Air?powers.EarthWind.Air.FlightRemaining:0,DominionSeconds=powers.EarthWind.Air?powers.EarthWind.Air.DominionRemaining:0,LiftedTargets=Object.FindObjectsByType<WindSuspension>(FindObjectsSortMode.None).Length,Inferno=powers.FireEmpowered,InfernoSeconds=powers.Inferno?powers.Inferno.Remaining:0,Ultimate=powers.Ultimate,BurningTargets=Object.FindObjectsByType<BurningStatus>(FindObjectsSortMode.None).Length,Phasing=Phasing,Targeting=Targeting,Active=Active||powers.EarthWind.Active,Flying=powers.EarthWind.Flying,StoneFists=powers.EarthWind.StoneFists,MeteorVisible=GameObject.Find("Falling meteorite"),SwordVisible=GameObject.Find("Rising Blaze sword"),WaveVisible=GameObject.Find("Travelling tsunami"),AnkleFlames=GameObject.Find("Flame Dash ankle fire"),Element=powers.Element,WeatherSeverity=StormSurge.Current?StormSurge.Current.Severity:0,Effect=powers.Element==1||powers.Element==3?powers.EarthWind.LastEffect:LastEffect,Impact=LastImpact,Energy=powers.Energy,Cooldowns=powers.Cooldowns,Craters=ImpactCrater.ActiveCount,Residents=NeighbourhoodLife.Residents,Children=NeighbourhoodLife.Children,Flowers=NeighbourhoodLife.Flowers,Butterflies=NeighbourhoodLife.Butterflies,Ducks=NeighbourhoodLife.Ducks}));}
        void OnGUI(){if(Targeting)GUI.Label(new Rect(14,140,900,28),"METEOR TARGET: move pointer, click ground / tap ground to confirm. Escape cancels.");if(Phasing)GUI.Label(new Rect(14,140,900,28),"WATER DASH: invulnerable puddle | "+Mathf.Max(0,phaseEnd-Time.time).ToString("0.0")+" s");}
    }
}
