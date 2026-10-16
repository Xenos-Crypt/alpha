using UnityEngine;
using AnotherWorld.Traffic;
namespace AnotherWorld.World
{
    public sealed class GovernmentTeleport : MonoBehaviour
    {
        public static GovernmentTeleport Instance { get; private set; }
        public static readonly Vector3 UsaOrigin=new Vector3(12000,0,12000);
        public Vector3 HidrokLanding,UsaLanding;
        Transform usa;
        public static bool InUsa(Vector3 p)=>Mathf.Abs(p.x-UsaOrigin.x)<700&&Mathf.Abs(p.z-UsaOrigin.z)<500;
        void Awake(){Instance=this;}
        void OnDestroy(){if(Instance==this)Instance=null;}
        public void Build()
        {
            var office=CityServices.Instance.Places.Find(p=>p.Name=="Ashford Capital Government Offices");
            HidrokLanding=office.transform.position+new Vector3(0,.4f,-2);
            AddCircle(office.transform,HidrokLanding,"Government teleport circle","Teleport to USA - Washington, D.C.");
            usa=CountryGateway.Build();UsaLanding=UsaOrigin+new Vector3(-100,.3f,-55);
            AddCircle(usa,UsaLanding,"USA return teleport circle","Return to Hidrok government building");
            SetRegionVisible(CityServices.Instance.Player.transform.position);
        }
        void AddCircle(Transform parent,Vector3 position,string name,string action)
        {
            var root=new GameObject(name).transform;root.SetParent(parent,true);root.position=position;
            var alloy=WorldShapes.Material("Teleport ring alloy",new Color(.18f,.25f,.33f),null,.7f);
            var light=WorldShapes.Material("Teleport cyan",new Color(.02f,.85f,1));light.EnableKeyword("_EMISSION");light.SetColor("_EmissionColor",new Color(0,.7f,1)*2);
            var ring=SmoothShapes.Profile("Teleport annulus",new[]{new Vector2(1.6f,0),new Vector2(1.6f,.08f),new Vector2(1.4f,.08f),new Vector2(1.4f,0),new Vector2(1.6f,0)},48);
            SmoothShapes.Part(root,"Illuminated teleport circle",ring,Vector3.one,Vector3.zero,light,true);
            for(int n=0;n<8;n++){float a=n*Mathf.PI/4;var part=WorldShapes.Box(root,"Teleport rune",new Vector3(.12f,.025f,.32f),new Vector3(Mathf.Cos(a)*1.8f,.02f,Mathf.Sin(a)*1.8f),alloy);part.transform.localRotation=Quaternion.Euler(0,-a*Mathf.Rad2Deg,0);}
            WorldShapes.Label(root,action+" / E",new Vector3(0,2,2),.08f);
            var place=root.gameObject.AddComponent<WorldFacility>();place.Name=name;place.Kind="portal";place.Door=position;place.Action=action;place.Description="Government transit gate. Stand by the circle and activate it. Travel is unavailable in a vehicle or during police pursuit.";CityServices.Instance.Places.Add(place);
        }
        public void SetRegionVisible(Vector3 position){if(usa)usa.gameObject.SetActive(InUsa(position));}
        public bool Travel()
        {
            var services=CityServices.Instance;var player=services.Player;
            if(player.Powers.Invulnerable||player.IsDriving||player.IsRidingTransit||PoliceDispatch.Instance.Wanted>0){services.Notify("Finish your power, leave transport and resolve the police pursuit before teleporting.");return false;}
            bool returning=InUsa(player.transform.position);var source=returning?UsaLanding:HidrokLanding;
            if(Vector3.Distance(player.transform.position,source)>3.2f){services.Notify("Stand inside the government teleport circle.");return false;}
            var target=returning?HidrokLanding:UsaLanding;
            SetRegionVisible(target);Physics.SyncTransforms();
            // Main world may be cloaked on return; its reserved landing aisle is checked after revealing it.
            HidrokClimate.Instance.RevealForArrival(returning);
            var controller=player.GetComponent<CharacterController>();controller.enabled=false;
            if(Physics.CheckCapsule(target+Vector3.up*.4f,target+Vector3.up*1.5f,.3f,~0,QueryTriggerInteraction.Ignore))
            {controller.enabled=true;SetRegionVisible(player.transform.position);HidrokClimate.Instance.RevealForArrival(!returning);services.Notify("Teleport landing is obstructed. Try again shortly.");return false;}
            player.transform.position=target;controller.enabled=true;player.Face(target+(returning?Vector3.back:Vector3.forward)*30);
            services.OnRegionChanged();services.MenuOpen=false;services.Notify(returning?"Returned to Hidrok, Antarctica.":"Arrived in Washington, D.C., USA. Return circle is behind you.");return true;
        }
    }
}
