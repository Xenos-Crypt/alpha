using System.Collections.Generic;
using UnityEngine;
namespace AnotherWorld.World
{
    public sealed class CityServices : MonoBehaviour
    {
        public static CityServices Instance { get; private set; }
        public readonly List<WorldFacility> Places=new List<WorldFacility>();
        public NeighbourhoodPlayer Player;
        public bool MenuOpen;
        WorldFacility selected,waypoint;string message="";float until;
        Vector2 scroll;
        bool regionalMap;
        void Awake(){Instance=this;}
        void OnDestroy(){if(Instance==this)Instance=null;}
        void Update(){if(Input.GetKeyDown(KeyCode.M)){MenuOpen=!MenuOpen;selected=null;}MilitaryAlert.Update(Time.deltaTime);}
        public WorldFacility Nearby(Vector3 p){foreach(var place in Places)if(Vector3.Distance(p,place.Door)<3||(place.Kind=="space"||place.Kind=="hangar"||place.Kind=="rail")&&Mathf.Abs(p.x-place.transform.position.x)<10&&Mathf.Abs(p.z-place.transform.position.z)<8)return place;return null;}
        [System.Serializable] sealed class IndustryDiagnostic {public int[] Stock;public int RunningJobs,OwnedVehicles;}
        public void ReportIndustry()
        {
            var industry=IndustrySystem.Instance;if(!industry)return;int running=0,owned=0;
            foreach(var job in industry.Orders.Values)if(job.Running)running++;
            foreach(var vehicle in Traffic.RoadNetwork.Instance.Vehicles)if(vehicle&&vehicle.Owned)owned++;
            Debug.Log("HIDROK_INDUSTRY:"+JsonUtility.ToJson(new IndustryDiagnostic{Stock=industry.Ledger.Stock,RunningJobs=running,OwnedVehicles=owned}));
        }
        public void ReportRegion(){Debug.Log("HIDROK_REGION:"+(GovernmentTeleport.InUsa(Player.transform.position)?"USA":"HIDROK"));}
        public void OnRegionChanged(){scroll=Vector2.zero;waypoint=null;selected=null;regionalMap=true;}
        public void Open(WorldFacility place){selected=place;MenuOpen=true;}
        public void Notify(string text){message=text;until=Time.time+8;}
        public void TravelTo(string name)
        {
            var place=Places.Find(p=>p.Name==name);if(!place)return;
            if(Player.Powers.Invulnerable){Notify("Finish Water Dash before travelling.");return;}
            if(Player.IsDriving||Player.IsRidingTransit){Notify("Leave your vehicle before travelling.");return;}
            if(Traffic.PoliceDispatch.Instance.Wanted>0){Notify("Cannot travel during a police pursuit.");return;}
            if(GovernmentTeleport.InUsa(place.Door)!=GovernmentTeleport.InUsa(Player.transform.position)){Notify("Use the government teleport circle to travel between Antarctica and the USA.");return;}
            var controller=Player.GetComponent<CharacterController>();controller.enabled=false;Player.transform.position=place.Door+Vector3.back*2;controller.enabled=true;Player.Face(place.Kind=="zoo"?place.Door+Vector3.back*30:place.transform.position+Vector3.forward*30);MenuOpen=false;waypoint=place;
        }
        void OnGUI()
        {
            if(!Player)return;
            GUI.Label(new Rect(14,43,600,25),"Coins "+Player.Coins+" | Health "+Player.Health+" | Knowledge "+Player.Knowledge+" | Groceries "+Player.Groceries+" | M: city map");
            if(Time.time<until)GUI.Label(new Rect(14,72,780,28),message);
            if(waypoint)GUI.Label(new Rect(14,99,650,24),waypoint.Name+" — "+Mathf.RoundToInt(Vector3.Distance(Player.transform.position,waypoint.Door))+" m");
            if(!MenuOpen)return;
            float width=Mathf.Min(640,Screen.width-20),x=(Screen.width-width)/2;GUI.Box(new Rect(x,85,width,Screen.height-100),selected?selected.Name:GovernmentTeleport.InUsa(Player.transform.position)?"USA - Washington, D.C.":CountryAtlas.Current.name+" - five-city world");
            if(GUI.Button(new Rect(x+width-80,92,70,28),"Close")){MenuOpen=false;return;}
            if(selected)
            {
                GUI.Label(new Rect(x+20,130,width-40,90),selected.Description);
                if(GUI.Button(new Rect(x+20,235,Mathf.Min(320,width-40),45),selected.Action)){Use(selected);return;}
                DrawIndustryControls(selected,x,width);
                if(selected.Kind=="bank"&&GUI.Button(new Rect(x+20,290,Mathf.Min(320,width-40),45),"Withdraw savings")){Player.Coins+=Player.Savings;Player.Savings=0;Notify("Savings withdrawn.");MenuOpen=false;}
                return;
            }
            if(GUI.Button(new Rect(x+15,99,180,25),regionalMap?"Show Ashford streets":"Show regional map"))regionalMap=!regionalMap;
            bool narrow=width<550;float mapSize=Mathf.Min(275,width-30);var map=new Rect(x+15,132,mapSize,mapSize);DrawMap(map);
            var list=narrow?new Rect(x+15,145+mapSize,width-30,Mathf.Max(90,Screen.height-mapSize-180)):new Rect(x+305,132,width-320,Screen.height-160);
            scroll=GUI.BeginScrollView(list,scroll,new Rect(0,0,list.width-20,Places.Count*42));
            int n=0;foreach(var p in Places)
            {
                if(GovernmentTeleport.InUsa(p.Door)!=GovernmentTeleport.InUsa(Player.transform.position))continue;
                if(GUI.Button(new Rect(0,n*42,list.width-22,35),p.Name)){waypoint=p;regionalMap=Mathf.Abs(p.Door.x)>208||Mathf.Abs(p.Door.z)>208;}
                n++;
            }
            GUI.EndScrollView();
            if(waypoint&&GUI.Button(new Rect(x+15,Screen.height-48,270,30),"Travel to "+waypoint.Name))
            {
                TravelTo(waypoint.Name);
            }
        }
        Vector2 MapPoint(Rect r,Vector3 p)=>GovernmentTeleport.InUsa(Player.transform.position)?new Vector2(r.x+(p.x-GovernmentTeleport.UsaOrigin.x+600)/1200*r.width,r.y+(400-p.z+GovernmentTeleport.UsaOrigin.z)/800*r.height):regionalMap?new Vector2(r.x+(p.x+900)/2200*r.width,r.y+(1000-p.z)/1650*r.height):new Vector2(r.x+(p.x+208)/416*r.width,r.y+(208-p.z)/416*r.height);
        void DrawMap(Rect r)
        {
            var previous=GUI.color;GUI.color=new Color(.25f,.33f,.25f);GUI.DrawTexture(r,Texture2D.whiteTexture);
            if(regionalMap&&!GovernmentTeleport.InUsa(Player.transform.position))
            {
                var seaTop=MapPoint(r,new Vector3(-300,0,900));var seaBottom=MapPoint(r,new Vector3(300,0,208));GUI.color=new Color(.08f,.39f,.53f);GUI.DrawTexture(new Rect(seaTop.x,seaTop.y,seaBottom.x-seaTop.x,seaBottom.y-seaTop.y),Texture2D.whiteTexture);
                GUI.color=new Color(.34f,.43f,.3f);foreach(var district in WorldGeography.Districts){var a=MapPoint(r,new Vector3(district.x,0,district.yMax));var b=MapPoint(r,new Vector3(district.xMax,0,district.y));GUI.DrawTexture(new Rect(a.x,a.y,b.x-a.x,b.y-a.y),Texture2D.whiteTexture);}
                GUI.color=new Color(.75f,.66f,.43f);foreach(var island in WorldGeography.Islands){var p=MapPoint(r,island.Centre);GUI.DrawTexture(new Rect(p.x-3,p.y-3,6,6),Texture2D.whiteTexture);}
            }
            GUI.color=new Color(.48f,.5f,.5f);float road=28/416f*r.width;
            if(!regionalMap&&!GovernmentTeleport.InUsa(Player.transform.position))for(int i=-3;i<=3;i++){var p=MapPoint(r,new Vector3(i*64,0,i*64));GUI.DrawTexture(new Rect(p.x-road/2,r.y,road,r.height),Texture2D.whiteTexture);GUI.DrawTexture(new Rect(r.x,p.y-road/2,r.width,road),Texture2D.whiteTexture);}
            foreach(var c in Traffic.LaneRoute.Roundabouts){var p=MapPoint(r,c);GUI.color=new Color(.25f,.45f,.2f);GUI.DrawTexture(new Rect(p.x-4,p.y-4,8,8),Texture2D.whiteTexture);}
            GUI.color=previous;
            foreach(var place in Places){var p=MapPoint(r,place.transform.position);if(!r.Contains(p))continue;if(GUI.Button(new Rect(p.x-7,p.y-7,14,14),"")){waypoint=place;}}
            var player=MapPoint(r,Player.transform.position);GUI.color=Color.yellow;GUI.DrawTexture(new Rect(player.x-3,player.y-3,6,6),Texture2D.whiteTexture);GUI.color=previous;
            GUI.Label(new Rect(r.x,r.y+r.height+2,r.width,22),"Yellow: you · Select a place for directions");
        }
        void DrawIndustryControls(WorldFacility place,float x,float width)
        {
            if(!place||!IndustrySystem.Instance||!IndustrySystem.Instance.Orders.TryGetValue(place,out var job))return;
            var industry=IndustrySystem.Instance;float buttonWidth=Mathf.Min(260,(width-60)*.5f);
            GUI.Label(new Rect(x+20,290,width-40,25),job.Running?"Producing "+job.Output+": "+Mathf.FloorToInt(job.Elapsed)+" / "+job.Duration+" s":"Production line ready: "+job.OutputAmount+" "+job.Output);
            GUI.Label(new Rect(x+20,318,width-40,30),"Cost: "+job.InputAmount+" "+job.Input+" + "+job.EnergyCost+" energy");
            if(GUI.Button(new Rect(x+20,355,buttonWidth,35),job.Running?"Job running":"Start production batch"))industry.StartOrder(place);
            if(job.Output!=IndustrialResource.Energy&&job.Output!=IndustrialResource.Materials&&GUI.Button(new Rect(x+20,400,buttonWidth,35),"Sell one "+job.Output))industry.Sell(job.Output);
            if((job.Output==IndustrialResource.Hovercraft||job.Output==IndustrialResource.Airframes||job.Output==IndustrialResource.Saucers)&&GUI.Button(new Rect(x+20,445,buttonWidth,35),"Collect finished vehicle"))industry.Deploy(place);
            if(GUI.Button(new Rect(x+30+buttonWidth,355,buttonWidth,35),"Materials +5 (10 coins)"))industry.BuySupplies(IndustrialResource.Materials);
            if(GUI.Button(new Rect(x+30+buttonWidth,400,buttonWidth,35),"Energy +10 (10 coins)"))industry.BuySupplies(IndustrialResource.Energy);
            GUI.Label(new Rect(x+20,490,width-40,75),"Shared stock: Materials "+industry.Ledger[IndustrialResource.Materials]+" | Energy "+industry.Ledger[IndustrialResource.Energy]+" | Components "+industry.Ledger[IndustrialResource.Components]+"\nHovercraft "+industry.Ledger[IndustrialResource.Hovercraft]+" | Airframes "+industry.Ledger[IndustrialResource.Airframes]+" | Saucers "+industry.Ledger[IndustrialResource.Saucers]);
        }
        void Use(WorldFacility p)
        {
            if(p.Kind=="portal"){GovernmentTeleport.Instance.Travel();}
            else if(p.Kind=="aircraft")
            {
                if(p.Vehicle&&Vector3.Distance(Player.transform.position,p.Vehicle.transform.position)<Mathf.Max(p.Vehicle.Width,p.Vehicle.Length)*.5f+4)Player.TakeVehicle(p.Vehicle);
                else Notify("This aircraft has left its pad.");
            }
            else if(p.Kind=="rail")
            {var body=Player.GetComponent<CharacterController>();body.enabled=false;bool up=Player.transform.position.y<4;Player.transform.position=p.transform.position+(up?new Vector3(0,6.55f,0):new Vector3(14,.3f,4));body.enabled=true;Notify(up?"Maglev platform. E to board when the train stops.":"Station street entrance.");}
            else if(p.Kind=="hangar")
            {var body=Player.GetComponent<CharacterController>();body.enabled=false;bool down=Player.transform.position.y>-5;Player.transform.position=p.transform.position+new Vector3(0,down?-11.5f:.4f,-5);body.enabled=true;Notify(down?"Underground saucer engineering hangar. Use the lift to return.":"Returned to street level.");}
            else if(p.Kind=="space")
            {p.Level=(p.Level+1)%9;var body=Player.GetComponent<CharacterController>();body.enabled=false;Player.transform.position=p.transform.position+new Vector3(0,.4f+p.Level*4,-5);body.enabled=true;Notify("Space centre lift: floor "+(p.Level+1));}
            else if(p.Kind=="market"){if(Player.Coins<10){Notify("Groceries cost 10 coins.");return;}Player.Coins-=10;Player.Groceries++;Notify("Bought groceries.");}
            else if(p.Kind=="hospital"){if(Player.Coins<5){Notify("Treatment costs 5 coins.");return;}Player.Coins-=5;Player.Health=100;Notify("Treatment completed.");}
            else if(p.Kind=="school"||p.Kind=="library"){Player.Knowledge++;Notify("Completed a study session.");}
            else if(p.Kind=="police"||p.Kind=="court"){if(Traffic.PoliceDispatch.Instance)Traffic.PoliceDispatch.Instance.Surrender();else Notify("No active traffic report.");}
            else if(p.Kind=="bank"){Player.Savings+=Player.Coins;Player.Coins=0;Notify("Deposited coins. Savings: "+Player.Savings);}
            else if(p.Kind=="military"){if(p.Looted){Notify("Already stripped. Nothing left to take.");return;}p.Looted=true;Player.Coins+=120;MilitaryAlert.Raise();Notify("You grab weapons and gear from "+p.Name+". +120 coins. The military is now hunting you.");}
            else if(IndustrySystem.Instance&&IndustrySystem.Instance.Orders.ContainsKey(p))IndustrySystem.Instance.StartOrder(p);
            else Notify(p.Description);
            MenuOpen=false;
        }
    }
}
