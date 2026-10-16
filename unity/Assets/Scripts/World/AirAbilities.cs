using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using AnotherWorld.Traffic;
namespace AnotherWorld.World
{
    public sealed class AirAbilities : MonoBehaviour
    {
        public const float FlightDuration=8,CycloneCast=.6f,CycloneDuration=3.5f,CycloneRadius=6,DominionDuration=12;
        public bool Active {get;private set;}
        public bool Flying=>Time.time<flightUntil;
        public bool Landing {get;private set;}
        public bool Empowered=>Time.time<dominionUntil;
        public bool ControlsMovement=>Flying||Landing||lockMovement;
        public bool CycloneVisible=>vortex;
        public bool SlamImpact {get;private set;}
        public bool BladesVisible=>blades.Count>0;
        public string LastEffect {get;private set;}="";
        public float FlightRemaining=>Mathf.Max(0,flightUntil-Time.time);
        public float DominionRemaining=>Mathf.Max(0,dominionUntil-Time.time);
        NeighbourhoodPlayer player;PlayerPowers powers;CharacterController body;float flightUntil,dominionUntil;bool lockMovement;
        GameObject flightFlow,landingFlow,dominionFlow,vortex;readonly List<GameObject> blades=new List<GameObject>();
        readonly List<WindSuspension> captures=new List<WindSuspension>();
        void Ready(){if(player)return;player=GetComponent<NeighbourhoodPlayer>();powers=GetComponent<PlayerPowers>();body=GetComponent<CharacterController>();}
        Vector3 Forward {get{Ready();var d=player.View.transform.forward;d.y=0;return d.sqrMagnitude>.01f?d.normalized:transform.forward;}}
        public void Play(int slot){Ready();if(slot==0)StartFlight();else if(slot==1)StartCoroutine(Cyclone());else if(slot==2)StartCoroutine(WindBlades());else StartCoroutine(SkyBreaker());}
        void Update()
        {
            Ready();if(player.IsDriving||player.IsRidingTransit||powers.Element!=1){if(Flying||Landing||Active||flightFlow||landingFlow||dominionFlow)Clear();return;}
            if(!Flying&&flightFlow){Destroy(flightFlow);flightFlow=null;Landing=true;landingFlow=WindVisuals.Aura(transform,"Gathering landing wind",.7f);}
            if(!Empowered&&dominionFlow){Destroy(dominionFlow);dominionFlow=null;}
        }
        public void StartFlight()
        {
            Ready();LastEffect="Gale Flight";Landing=false;if(landingFlow)Destroy(landingFlow);if(flightFlow)Destroy(flightFlow);
            flightUntil=Time.time+FlightDuration;flightFlow=WindVisuals.Aura(player.Avatar,"Gale Flight limb trails",Empowered?1.5f:1);
            WindVisuals.Burst(transform.position,3);body.Move(Vector3.up*1.4f);player.Launch(-2);
        }
        public void Move(Vector3 direction,float dt,float touchLift)
        {
            if(lockMovement)return;
            if(Flying)
            {
                float lift=Input.GetKey(KeyCode.Space)?1:Input.GetKey(KeyCode.LeftControl)?-1:touchLift;
                body.Move((direction*(Empowered?10:8)+Vector3.up*(lift*6+.2f))*dt);
                if(transform.position.y>80)body.Move(Vector3.down*(transform.position.y-80));
            }
            else if(Landing)
            {
                var collision=body.Move((direction*3.5f+Vector3.down*6)*dt);
                if((collision&CollisionFlags.Below)!=0||body.isGrounded){Landing=false;if(landingFlow)Destroy(landingFlow);WindVisuals.Burst(transform.position,3.5f);player.Launch(-2);}
            }
        }
        void Pose(float pitch,float spread=0)
        {var gait=player.Avatar.GetComponent<ResidentGait>();if(!gait)return;gait.ActionUntil=Time.time+.12f;gait.ArmPitch=pitch;gait.BothArms=true;gait.ArmSpread=spread;}
        IEnumerator Cyclone()
        {
            Active=lockMovement=true;LastEffect="Cyclone";bool empowered=Empowered;var centre=Ground(transform.position+Forward*4);float multiplier=empowered?1.35f:1;
            var castFlow=WindVisuals.Aura(player.Avatar,"Cyclone cast spiral",.7f);Destroy(castFlow,CycloneCast+.1f);WindVisuals.Burst(centre,CycloneRadius,CycloneCast);
            for(float t=0;t<CycloneCast;t+=Time.deltaTime){Pose(-65,Mathf.Lerp(5,75,t/CycloneCast));yield return null;}
            lockMovement=false;vortex=new GameObject("Cyclone vortex");vortex.transform.position=centre;vortex.AddComponent<WindVortex>().Strength=empowered?1.15f:1;
            float next=0;
            for(float t=0;t<CycloneDuration;t+=Time.deltaTime)
            {
                if(t>=next)
                {
                    powers.HitArea(centre+Vector3.up*.5f,CycloneRadius,4*multiplier,Vector3.zero,.65f,pull:true,lift:true);
                    foreach(var walker in RoadNetwork.Instance.Walkers){var capture=walker.GetComponent<WindSuspension>();if(capture&&capture.Source==powers&&!captures.Contains(capture))captures.Add(capture);}next=t+.5f;
                }
                yield return null;
            }
            powers.HitArea(centre+Vector3.up,CycloneRadius,8*multiplier,Vector3.zero,.6f);
            ReleaseCaptured(centre,true);WindVisuals.Burst(centre,CycloneRadius+2,.7f);if(vortex)Destroy(vortex);vortex=null;Active=false;
        }
        void ReleaseCaptured(Vector3 centre,bool push)
        {foreach(var capture in captures)if(capture)capture.Release(push?(capture.transform.position-centre).normalized*7:Vector3.zero);captures.Clear();}
        IEnumerator WindBlades()
        {
            Active=true;LastEffect="Wind Blades";bool empowered=Empowered;var forward=Forward;Pose(-85,35);
            for(int i=0;i<3;i++){StartCoroutine(ThrownBlade(transform.position+Vector3.up*1.2f+forward*.9f,Quaternion.Euler(0,(i-1)*6,0)*forward,empowered));yield return new WaitForSeconds(.12f);}Active=false;
        }
        IEnumerator ThrownBlade(Vector3 position,Vector3 direction,bool empowered)
        {
            var line=WindVisuals.Line(null,"Ranged cutting wind blade",empowered?.19f:.11f,25);var root=line.gameObject;root.transform.rotation=Quaternion.LookRotation(direction);blades.Add(root);Destroy(root,2.1f);
            for(int n=0;n<25;n++){float a=-1.1f+n/24f*2.2f;line.SetPosition(n,new Vector3(Mathf.Sin(a)*1.4f,Mathf.Cos(a)*.65f,0));}
            var hits=new HashSet<UnityEngine.Object>();
            for(float t=0;t<1.4f;t+=Time.deltaTime)
            {
                float distance=Mathf.Min(35*Time.deltaTime,50-t*35);RaycastHit? blocker=null;
                foreach(var hit in Physics.SphereCastAll(position,.2f,direction,distance,~0,QueryTriggerInteraction.Ignore))if(!hit.transform.IsChildOf(transform)&&(!blocker.HasValue||hit.distance<blocker.Value.distance))blocker=hit;
                if(blocker.HasValue)
                {
                    var point=blocker.Value.point;powers.HitArea(point,1.6f,empowered?22:16,direction*4,.25f,hits);
                    if(blocker.Value.collider.GetComponent<Renderer>()&&blocker.Value.collider.bounds.size.y>.4f&&!blocker.Value.collider.GetComponent<DeformedImpactSurface>())SurfaceCuts.Slash(blocker.Value.collider,position);
                    WindVisuals.Burst(point,1.8f,.3f);break;
                }
                for(float d=0;d<=distance;d+=.6f)powers.HitArea(position+direction*d,1.2f,empowered?22:16,direction*4,.25f,hits);
                position+=direction*distance;root.transform.position=position;yield return null;
            }
            blades.Remove(root);if(root)Destroy(root);
        }
        IEnumerator SkyBreaker()
        {
            Active=lockMovement=true;SlamImpact=false;LastEffect="Sky Breaker";bool empowered=Empowered;
            flightUntil=0;Landing=false;if(flightFlow)Destroy(flightFlow);if(landingFlow)Destroy(landingFlow);flightFlow=landingFlow=null;
            var flow=WindVisuals.Aura(player.Avatar,"Sky Breaker aerial wind",1.4f);Destroy(flow,6);WindVisuals.Burst(transform.position,4);
            for(float t=0;t<.55f;t+=Time.deltaTime){body.Move(Vector3.up*12*Time.deltaTime);Pose(-155,15);yield return null;}
            float deadline=Time.time+5;bool landed=false;
            while(Time.time<deadline)
            {Pose(-35,20);var collision=body.Move(Vector3.down*32*Time.deltaTime);if((collision&CollisionFlags.Below)!=0||body.isGrounded){landed=true;break;}if(transform.position.y<-.8f&&WorldGeography.IsWater(transform.position))break;yield return null;}
            if(flow)Destroy(flow);
            if(landed){var point=Ground(transform.position);SlamImpact=true;ImpactCrater.Create(point);powers.HitArea(point+Vector3.up*.6f,7,empowered?48:36,Vector3.zero,1.8f);WindVisuals.Burst(point,9,.8f);yield return new WaitForSeconds(.45f);}
            player.Launch(-2);Active=lockMovement=false;
        }
        static Vector3 Ground(Vector3 point)
        {
            float closest=float.MaxValue;Vector3 ground=point;
            foreach(var hit in Physics.RaycastAll(point+Vector3.up*3,Vector3.down,100,~0,QueryTriggerInteraction.Ignore))if(hit.normal.y>.6f&&!hit.collider.GetComponentInParent<NeighbourhoodPlayer>()&&!hit.collider.GetComponentInParent<CrossingWalker>()&&hit.distance<closest){closest=hit.distance;ground=hit.point;}
            return ground;
        }
        public void Awaken()
        {
            Ready();dominionUntil=Time.time+DominionDuration;LastEffect="Sky Dominion";if(dominionFlow)Destroy(dominionFlow);dominionFlow=WindVisuals.Aura(player.Avatar,"Sky Dominion awakening aura",1.8f);WindVisuals.Burst(Ground(transform.position),11,.8f);powers.HitArea(transform.position+Vector3.up,10,35,Vector3.zero,1);
        }
        public void Clear()
        {
            StopAllCoroutines();flightUntil=dominionUntil=0;Landing=Active=lockMovement=false;ReleaseCaptured(transform.position,false);
            if(flightFlow)Destroy(flightFlow);if(landingFlow)Destroy(landingFlow);if(dominionFlow)Destroy(dominionFlow);if(vortex)Destroy(vortex);
            foreach(var blade in blades)if(blade)Destroy(blade);blades.Clear();
        }
        void OnDisable(){Clear();}
        void OnGUI()
        {
            if(Flying||Landing){GUI.Label(new Rect(14,168,900,25),Landing?"GALE FLIGHT | controlled landing":"GALE FLIGHT | WASD steer, Space up, Ctrl down | "+FlightRemaining.ToString("0.0")+" s");if(Flying&&(Application.isMobilePlatform||Screen.width<=900)){if(GUI.RepeatButton(new Rect(Screen.width-220,Screen.height-220,60,50),"Up"))player.RequestLift(1);if(GUI.RepeatButton(new Rect(Screen.width-288,Screen.height-220,60,50),"Down"))player.RequestLift(-1);}}
            if(Empowered)GUI.Label(new Rect(14,196,700,24),"SKY DOMINION | "+DominionRemaining.ToString("0.0")+" s | empowered Air abilities");
        }
    }
}
