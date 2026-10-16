using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace AnotherWorld.World
{
    public sealed class EarthWindPresentation : MonoBehaviour
    {
        bool active;public bool Active {get=>active||Air&&Air.Active;private set=>active=value;}
        public AirAbilities Air {get;private set;}
        public bool Flying=>Air&&Air.Flying;
        public bool StoneFists=>Time.time<stoneUntil;
        string lastEffect="";public string LastEffect {get=>powers&&powers.Element==1&&Air?Air.LastEffect:lastEffect;private set=>lastEffect=value;}
        NeighbourhoodPlayer player;PlayerPowers powers;CharacterController body;float stoneUntil;
        readonly List<GameObject> fists=new List<GameObject>();
        void Ready(){if(player)return;player=GetComponent<NeighbourhoodPlayer>();powers=GetComponent<PlayerPowers>();body=GetComponent<CharacterController>();Air=gameObject.AddComponent<AirAbilities>();}
        Vector3 Forward {get{Ready();var d=player.View.transform.forward;d.y=0;return d.sqrMagnitude>.01f?d.normalized:Vector3.forward;}}
        public void Play(int slot)
        {
            Ready();if(player.Avatar)player.Avatar.rotation=Quaternion.LookRotation(Forward);if(powers.Element==3){if(slot==0)StartCoroutine(BullCharge());else if(slot==1)ArmStoneFists();else if(slot==2)StartCoroutine(RockBarrage());else StartCoroutine(GroundPound());}
            else Air.Play(slot);
        }
        void Update()
        {
            Ready();
            if(!StoneFists&&fists.Count>0){foreach(var fist in fists)if(fist)Destroy(fist);fists.Clear();}
        }
        public void ClearBuffs(){stoneUntil=0;if(Air)Air.Clear();}
        public void StartFlight(){Ready();Air.StartFlight();}
        public void MoveFlight(Vector3 direction,float dt,float touchLift=0){Ready();Air.Move(direction,dt,touchLift);}
        public void ArmStoneFists()
        {
            Ready();LastEffect="Stone Fist";stoneUntil=Time.time+8;foreach(var fist in fists)if(fist)Destroy(fist);fists.Clear();
            foreach(var hand in player.Avatar.GetComponentsInChildren<Transform>(true))if(hand.name=="Hand")
            {
                var glove=new GameObject("Stone-covered fist");glove.transform.SetParent(hand.parent,false);glove.transform.localPosition=hand.localPosition;
                SmoothShapes.Part(glove.transform,"Stone gauntlet",SmoothShapes.Profile("Jagged stone fist",new[]{new Vector2(0,0),new Vector2(.4f,.05f),new Vector2(.55f,.4f),new Vector2(.42f,1),new Vector2(0,1)},7),new Vector3(.29f,.24f,.27f),new Vector3(0,-.1f,0),ElementalVisuals.Paint("Stone armour",new Color(.38f,.34f,.28f)));
                for(int n=0;n<4;n++)ElementalVisuals.Blob(glove.transform,"Stone knuckle",new Vector3((n-1.5f)*.06f,.05f,.09f),Vector3.one*.09f,new Color(.47f,.43f,.34f));fists.Add(glove);
            }
        }
        IEnumerator BullCharge()
        {
            Active=true;LastEffect="Bull Charge";var direction=Forward;var armour=new GameObject("Charging stone bull mantle");armour.transform.SetParent(transform,false);armour.transform.rotation=Quaternion.LookRotation(direction);
            for(int side=-1;side<=1;side+=2)
            {
                var horn=SmoothShapes.Part(armour.transform,"Stone bull horn",SmoothShapes.Profile("Bull horn",new[]{new Vector2(.12f,0),new Vector2(.11f,.2f),new Vector2(.05f,.45f),new Vector2(0,.7f)},8),Vector3.one,new Vector3(side*.35f,1.5f,.25f),ElementalVisuals.Paint("Bull horn stone",new Color(.58f,.5f,.34f)));horn.transform.localRotation=Quaternion.Euler(55,0,-side*20);
            }
            var hit=new HashSet<UnityEngine.Object>();var gait=player.Avatar.GetComponent<ResidentGait>();
            for(float t=0;t<.8f;t+=Time.deltaTime)
            {
                var before=transform.position;body.Move(direction*17*Time.deltaTime);gait.ActionUntil=Time.time+.1f;gait.ArmPitch=-65;
                float distance=Vector3.Distance(before,transform.position);for(float d=0;d<=distance;d+=.7f)powers.HitArea(Vector3.Lerp(before,transform.position,d/Mathf.Max(.01f,distance))+Vector3.up,2.6f,18,direction*10,2,hit);
                powers.HitArea(transform.position+Vector3.up,2.6f,18,direction*10,2,hit);yield return null;
            }
            Destroy(armour);Active=false;
        }
        static Mesh Shard()
        {
            var mesh=new Mesh{name="Jagged sharp rock shard"};mesh.vertices=new[]{new Vector3(-.28f,-.2f,0),new Vector3(.23f,-.15f,0),new Vector3(.05f,.3f,.1f),new Vector3(0,0,1.2f)};mesh.triangles=new[]{0,2,1,0,1,3,1,2,3,2,0,3};mesh.RecalculateNormals();mesh.RecalculateBounds();return mesh;
        }
        IEnumerator RockBarrage()
        {
            Active=true;LastEffect="Rock Barrage";var direction=Forward;
            for(int i=0;i<5;i++){StartCoroutine(ThrownShard(transform.position+Vector3.up*1.3f+direction*.8f,Quaternion.Euler(0,(i-2)*4,0)*direction));yield return new WaitForSeconds(.12f);}Active=false;
        }
        IEnumerator ThrownShard(Vector3 position,Vector3 direction)
        {
            var shard=SmoothShapes.Part(null,"Flying jagged rock",Shard(),Vector3.one,position,ElementalVisuals.Paint("Thrown rock",new Color(.4f,.33f,.23f)));shard.transform.rotation=Quaternion.LookRotation(direction);var hits=new HashSet<UnityEngine.Object>();
            ElementalVisuals.OwnMesh(shard);
            for(float t=0;t<1.8f;t+=Time.deltaTime)
            {
                float distance=24*Time.deltaTime;RaycastHit? nearest=null;
                foreach(var hit in Physics.RaycastAll(position,direction,distance,~0,QueryTriggerInteraction.Ignore))if(!hit.transform.IsChildOf(transform)&&(!nearest.HasValue||hit.distance<nearest.Value.distance))nearest=hit;
                if(nearest.HasValue){powers.HitArea(nearest.Value.point,1.5f,12,direction*4,.4f,hits);break;}
                for(float d=0;d<=distance;d+=.6f)powers.HitArea(position+direction*d,1,12,direction*4,.4f,hits);
                position+=direction*distance;shard.transform.position=position;yield return null;
            }
            Destroy(shard);
        }
        IEnumerator GroundPound()
        {
            Active=true;LastEffect="Ground Pound";var gait=player.Avatar.GetComponent<ResidentGait>();
            for(float t=0;t<.65f;t+=Time.deltaTime)
            {
                gait.ActionUntil=Time.time+.1f;gait.ArmPitch=t<.35f?-165:Mathf.Lerp(-165,-20,(t-.35f)/.3f);gait.BothArms=true;
                foreach(var arm in gait.Shoulders)arm.localRotation=Quaternion.Euler(gait.ArmPitch,0,0);yield return null;
            }
            var point=transform.position+Forward*.8f;foreach(var hit in Physics.RaycastAll(point+Vector3.up*2,Vector3.down,4,~0,QueryTriggerInteraction.Ignore))if(!hit.transform.IsChildOf(transform)&&hit.normal.y>.6f){point=hit.point;break;}
            ImpactCrater.Create(point);powers.HitArea(point+Vector3.up*.5f,6,32,Vector3.zero,2.5f);
            var ring=ElementalVisuals.Ring(point,1,new Color(.7f,.57f,.36f));var line=ring.GetComponent<LineRenderer>();
            for(float t=0;t<.6f;t+=Time.deltaTime){for(int i=0;i<49;i++){float a=i*Mathf.PI/24;line.SetPosition(i,point+new Vector3(Mathf.Cos(a)*(1+t*10),.07f,Mathf.Sin(a)*(1+t*10)));}yield return null;}
            Destroy(ring);Active=false;
        }
        void OnDisable(){ClearBuffs();foreach(var fist in fists)if(fist)Destroy(fist);fists.Clear();}
        void OnGUI()
        {
            if(StoneFists)GUI.Label(new Rect(14,168,900,25),"STONE FIST | left click / Punch to strike | 22 damage | "+(stoneUntil-Time.time).ToString("0.0")+" s");
        }
    }
    public sealed class SurfaceCuts : MonoBehaviour
    {
        float health=100;
        public static void Slash(Collider collider,Vector3 source)
        {
            var cuts=collider.GetComponent<SurfaceCuts>();if(!cuts)cuts=collider.gameObject.AddComponent<SurfaceCuts>();cuts.health-=24;
            var point=collider.bounds.ClosestPoint(source);
            if(!(collider is MeshCollider)||((MeshCollider)collider).convex)point=collider.ClosestPoint(source);
            else if(collider.Raycast(new Ray(source,(collider.bounds.center-source).normalized),out var hit,collider.bounds.size.magnitude+5))point=hit.point;
            var normal=(source-point).normalized;if(normal.sqrMagnitude<.1f)normal=Vector3.forward;var sideways=Vector3.Cross(normal,Vector3.up).normalized;
            var mark=ElementalVisuals.Ribbon(collider.transform,"Wind blade cut",new Color(.12f,.16f,.14f),.045f);mark.useWorldSpace=false;mark.positionCount=2;mark.SetPosition(0,collider.transform.InverseTransformPoint(point+normal*.025f-sideways*.5f-Vector3.up*.25f));mark.SetPosition(1,collider.transform.InverseTransformPoint(point+normal*.025f+sideways*.5f+Vector3.up*.25f));Destroy(mark.gameObject,20);
            if(cuts.health<=0){collider.enabled=false;var renderer=collider.GetComponent<Renderer>();if(renderer)renderer.enabled=false;}
        }
    }
}
