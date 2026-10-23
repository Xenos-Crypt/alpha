using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using AnotherWorld.Traffic;
using AnotherWorld.Rendering;
namespace AnotherWorld.World
{
    public sealed class PlayerPowers : MonoBehaviour
    {
        public int Element { get; private set; }
        public float Energy=80,Ultimate;
        public readonly float[] Cooldowns=new float[4];
        public static readonly string[] Elements={"Ember (Fire)","Gale (Wind)","Tide (Water)","Terra (Earth)"};
        static readonly string[,] Skills={{"Flame Dash","Rising Blaze","Fireball Barrage","Meteor Slam"},{"Gale Flight","Cyclone","Wind Blades","Sky Breaker"},{"Water Dash","Geyser Burst","Water Barrage","Tsunami Slam"},{"Bull Charge","Stone Fist","Rock Barrage","Ground Pound"}};
        static readonly string[] Ultimates={"Inferno Awakening","Sky Dominion","Tidal Sovereign","Terra Sovereign"};
        static readonly Color[] Colours={new Color(1,.22f,.04f),new Color(.3f,1,.74f),new Color(.08f,.65f,1),new Color(.65f,.45f,.2f)};
        NeighbourhoodPlayer player;CharacterController body;bool busy;float boostUntil;
        public ElementalPresentation Presentation {get;private set;}
        public EarthWindPresentation EarthWind {get;private set;}
        public InfernoAwakening Inferno {get;private set;}
        public bool FireEmpowered=>Inferno&&Inferno.Empowered;
        public bool Invulnerable=>Presentation&&Presentation.Phasing;
        bool Active=>busy||Presentation&&Presentation.Active||EarthWind&&EarthWind.Active;
        float punchReady;
        bool Menu=>ScalableQuality.Instance&&ScalableQuality.Instance.MenuOpen||CityServices.Instance&&CityServices.Instance.MenuOpen;
        void Start(){player=GetComponent<NeighbourhoodPlayer>();body=GetComponent<CharacterController>();Element=Mathf.Clamp(PlayerPrefs.GetInt("HidrokPowerElement",0),0,3);Presentation=gameObject.AddComponent<ElementalPresentation>();EarthWind=gameObject.AddComponent<EarthWindPresentation>();Inferno=gameObject.AddComponent<InfernoAwakening>();}
        void Update()
        {
            for(int i=0;i<4;i++)Cooldowns[i]=Mathf.Max(0,Cooldowns[i]-Time.deltaTime);
            Energy=Mathf.Min(100,Energy+Time.deltaTime*5);Ultimate=Mathf.Min(100,Ultimate+Time.deltaTime*1.5f);
            if(Menu||!player||player.IsDriving||player.IsRidingTransit)return;
            if(Input.GetKeyDown(KeyCode.T))SelectElement((Element+1)%4);
            for(int i=0;i<4;i++)if(Input.GetKeyDown((KeyCode)((int)KeyCode.Alpha1+i)))Cast(i);
            if(Input.GetKeyDown(KeyCode.R))CastUltimate();
            if(!Presentation.Targeting&&!player.PointerOverInteract&&Input.GetMouseButtonDown(0)&&Input.mousePosition.y>150&&!(Input.mousePosition.x>Screen.width-150&&Input.mousePosition.y>Screen.height-70))Punch();
        }
        public void SelectElement(int element)
        {if(Active)return;if(Presentation)Presentation.CancelTarget();if(EarthWind)EarthWind.ClearBuffs();if(element!=0&&Inferno)Inferno.End();Element=Mathf.Clamp(element,0,3);PlayerPrefs.SetInt("HidrokPowerElement",Element);}
        Vector3 Direction {get{var d=player.View.transform.forward;d.y=0;return d.sqrMagnitude>.01f?d.normalized:transform.forward;}}
        public bool Cast(int slot)
        {
            if(slot<0||slot>3||Menu||!player||player.IsDriving||player.IsRidingTransit||Active||Cooldowns[slot]>0||Energy<15)return false;
            if(Element==0&&slot==3){Presentation.AimMeteor();return true;}
            if(Presentation.Targeting)Presentation.CancelTarget();
            Energy-=15;Cooldowns[slot]=slot==0?5:slot==1?7:slot==2?8:10;
            if(Element==1)Cooldowns[slot]=new[]{12f,8f,6f,14f}[slot];
            if(Element==3)Cooldowns[slot]=new[]{6f,10f,8f,12f}[slot];
            CityServices.Instance.Notify(Skills[Element,slot]);
            if(Element==1||Element==3)EarthWind.Play(slot);
            else if((Element==0&&slot<2)||Element==2)Presentation.Play(slot);
            else if(slot==0)StartCoroutine(Dash());
            else if(slot==1){if(Element==1)StartCoroutine(Cyclone());else{Pulse(transform.position+Direction*2,4,18,true);player.Launch(7);}}
            else if(slot==2)StartCoroutine(Barrage());
            else StartCoroutine(Slam());return true;
        }
        public bool CastUltimate()
        {
            if(Menu||!player||player.IsDriving||player.IsRidingTransit||Active||Ultimate<100)return false;
            if(Element==0&&FireEmpowered)return false;
            if(Element==1&&EarthWind.Air&&EarthWind.Air.Empowered)return false;
            if(Presentation)Presentation.CancelTarget();
            Ultimate=0;CityServices.Instance.Notify(Ultimates[Element]);
            if(Element==0){Inferno.Activate();return true;}
            if(Element==1){EarthWind.Air.Awaken();return true;}
            boostUntil=Time.time+10;
            if(Element==1)StartCoroutine(Cyclone());else Pulse(transform.position,12,60,true);return true;
        }
        public bool CommitMeteor(Vector3 point)
        {
            if(Element!=0||Active||Energy<15||Cooldowns[3]>0||Menu||player.IsDriving||player.IsRidingTransit)return false;
            Energy-=15;Cooldowns[3]=10;Presentation.DropMeteor(point);return true;
        }
        public void HitArea(Vector3 centre,float radius,float damage,Vector3 force,float stun=0,HashSet<UnityEngine.Object> hitIds=null,bool pull=false,bool fireAttack=false,bool empoweredFire=false,bool lift=false)
        {
            Damage(centre,radius,damage,new HashSet<TrafficVehicle>(),stun,hitIds,fireAttack,empoweredFire);
            foreach(var walker in RoadNetwork.Instance.Walkers)
            {
                var d=walker.transform.position-centre;d.y=0;if(d.magnitude>radius||hitIds!=null&&hitIds.Contains(walker))continue;
                bool blocked=false;foreach(var h in Physics.RaycastAll(centre+Vector3.up*.5f,(walker.transform.position+Vector3.up-centre-Vector3.up*.5f).normalized,Vector3.Distance(centre,walker.transform.position),~0,QueryTriggerInteraction.Ignore))if(!h.transform.IsChildOf(transform)&&!h.transform.IsChildOf(walker.transform)){blocked=true;break;}
                if(!blocked){walker.ApplyHit(damage,lift?Vector3.zero:force.sqrMagnitude>.01f?force:d.normalized*(pull?-4:7),stun);if(lift&&walker.Health>0)WindSuspension.Capture(walker,this,centre);if(fireAttack&&walker.Health>0)BurningStatus.Ignite(walker,empoweredFire);if(hitIds!=null)hitIds.Add(walker);if(!walker.TrainingTarget)PoliceDispatch.Instance.Report(transform,"elemental attack on a resident");}
            }
            HostileCreature.HitArea(centre,radius,damage,stun,hitIds);
        }
        public bool Punch()
        {
            if(Menu||Active||Presentation.Targeting||player.IsDriving||player.IsRidingTransit||Time.time<punchReady)return false;
            punchReady=Time.time+.55f;var direction=Direction;player.Avatar.rotation=Quaternion.LookRotation(direction);var gait=player.Avatar.GetComponent<ResidentGait>();gait.ActionUntil=Time.time+.3f;gait.ArmPitch=-90;gait.BothArms=false;
            HitArea(transform.position+direction*1.2f+Vector3.up,1.4f,EarthWind.StoneFists?22:8,direction*3,EarthWind.StoneFists?.6f:.15f);return true;
        }
        IEnumerator Dash()
        {
            busy=true;var hit=new HashSet<TrafficVehicle>();var direction=Direction;
            for(float t=0;t<.4f;t+=Time.deltaTime)
            {if(player.IsDriving||player.IsRidingTransit)break;body.Move(direction*18*Time.deltaTime);Damage(transform.position,2.5f,14,hit);Effect(transform.position+Vector3.up*.4f,1,.3f);yield return null;}
            busy=false;
        }
        IEnumerator Barrage()
        {
            busy=true;int count=Element==1?5:3;var forward=Direction;bool fire=Element==0,empowered=fire&&FireEmpowered;
            for(int i=0;i<count;i++){var direction=Quaternion.Euler(0,Element==1?(i-2)*9:0,0)*forward;StartCoroutine(Projectile(transform.position+Vector3.up*1.3f+direction*.8f,direction,Element==3?12:11,fire,empowered));yield return new WaitForSeconds(.12f);}busy=false;
        }
        IEnumerator Projectile(Vector3 position,Vector3 direction,float damage,bool fire,bool empowered)
        {
            var orb=Effect(position,empowered?.85f:.45f,3);if(fire)ElementalVisuals.Flame(orb.transform,Vector3.zero,empowered?2.5f:1);var hit=new HashSet<UnityEngine.Object>();
            for(float t=0;t<2;t+=Time.deltaTime)
            {
                float step=22*Time.deltaTime;
                RaycastHit? blocker=null;foreach(var h in Physics.RaycastAll(position,direction,step,~0,QueryTriggerInteraction.Ignore))if(!h.transform.IsChildOf(transform)&&(!blocker.HasValue||h.distance<blocker.Value.distance))blocker=h;
                if(blocker.HasValue){Effect(blocker.Value.point,empowered?4.5f:3,.5f);HitArea(blocker.Value.point,3,damage,Vector3.zero,.15f,hit,fireAttack:fire,empoweredFire:empowered);break;}
                position+=direction*step;if(orb)orb.transform.position=position;HitArea(position,1.2f,damage,direction*4,.15f,hit,fireAttack:fire,empoweredFire:empowered);yield return null;
            }
            if(orb)Destroy(orb);
        }
        IEnumerator Slam()
        {
            busy=true;player.Launch(10);yield return new WaitForSeconds(.6f);player.Launch(-16);
            float deadline=Time.time+3;while(Time.time<deadline&&!body.isGrounded&&!player.Swimming)yield return null;
            Pulse(transform.position,6,Element==3?32:30,true);busy=false;
        }
        IEnumerator Cyclone()
        {
            busy=true;for(int i=0;i<4;i++){Pulse(transform.position+Direction*3,6,4,true);yield return new WaitForSeconds(.5f);}Pulse(transform.position+Direction*3,6,12,true);busy=false;
        }
        void Pulse(Vector3 centre,float radius,float damage,bool push)
        {
            Effect(centre+Vector3.up*.5f,radius*2,.55f);Damage(centre,radius,damage,new HashSet<TrafficVehicle>());
            if(push)foreach(var walker in RoadNetwork.Instance.Walkers)
            {
                var d=walker.transform.position-centre;d.y=0;if(d.magnitude>radius||d.sqrMagnitude<.01f)continue;
                walker.ApplyImpulse(d.normalized*4);
            }
        }
        void Damage(Vector3 centre,float radius,float damage,HashSet<TrafficVehicle> hits,float stun=0,HashSet<UnityEngine.Object> hitIds=null,bool fireAttack=false,bool empoweredFire=false)
        {
            foreach(var vehicle in RoadNetwork.Instance.Vehicles)
            {
                if(vehicle.Sinking||vehicle.Integrity<=0||hits.Contains(vehicle)||hitIds!=null&&hitIds.Contains(vehicle))continue;
                var hull=vehicle.GetComponent<Collider>();var p=hull?hull.ClosestPoint(centre):vehicle.transform.position;
                if(Vector3.Distance(p,centre)>radius)continue;
                // Powers cannot hit through buildings or scenery.
                bool blocked=false;foreach(var h in Physics.RaycastAll(centre,p-centre,Vector3.Distance(p,centre),~0,QueryTriggerInteraction.Ignore))if(!h.transform.IsChildOf(transform)&&!h.transform.IsChildOf(vehicle.transform)){blocked=true;break;}
                if(blocked)continue;hits.Add(vehicle);if(hitIds!=null)hitIds.Add(vehicle);vehicle.Damage(damage*(Time.time<boostUntil?1.3f:1));if(fireAttack&&vehicle.Integrity>0&&!vehicle.Sinking)BurningStatus.Ignite(vehicle,empoweredFire);vehicle.StunnedUntil=Mathf.Max(vehicle.StunnedUntil,Time.time+stun);Ultimate=Mathf.Min(100,Ultimate+5);PoliceDispatch.Instance.Report(transform,"power damage to a vehicle");
            }
        }
        GameObject Effect(Vector3 position,float size,float lifetime)
        {
            var fx=WorldShapes.Sphere(null,"Elemental power",Vector3.one*size,position,WorldShapes.Material("Power "+Element,Colours[Element]),false);var collider=fx.GetComponent<Collider>();if(collider)collider.enabled=false;Destroy(fx,lifetime);return fx;
        }
        void OnGUI()
        {
            if(!player||Menu||player.IsDriving||player.IsRidingTransit)return;
            if(FireEmpowered)GUI.Label(new Rect(14,170,600,24),"INFERNO AWAKENING | "+Inferno.Remaining.ToString("0.0")+" s | empowered flames and burning");
            float y=Screen.height-112;GUI.Label(new Rect(14,y-24,900,24),Elements[Element]+" | T: change element | Energy "+Mathf.FloorToInt(Energy)+" | R: "+Ultimates[Element]+" "+Mathf.FloorToInt(Ultimate)+"%");
            float width=Mathf.Min(220,(Screen.width-28)/4f);
            for(int i=0;i<4;i++)if(GUI.Button(new Rect(14+i*width,y,width-4,32),(i+1)+": "+Skills[Element,i]+(Cooldowns[i]>0?" "+Mathf.CeilToInt(Cooldowns[i])+"s":"")))Cast(i);
            if(Application.isMobilePlatform||Screen.width<=900){if(GUI.Button(new Rect(14,y-56,90,30),"Element"))SelectElement((Element+1)%4);if(GUI.Button(new Rect(110,y-56,90,30),"Ultimate"))CastUltimate();}
            if(GUI.Button(new Rect(Screen.width-115,y-56,100,30),EarthWind&&EarthWind.StoneFists?"Stone punch":"Punch"))Punch();
        }
    }
}
