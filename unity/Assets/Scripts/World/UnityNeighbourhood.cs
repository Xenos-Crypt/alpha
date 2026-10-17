using UnityEngine;
using UnityEngine.Rendering;
using AnotherWorld.Traffic;
using AnotherWorld.Rendering;
namespace AnotherWorld.World
{
    public sealed class UnityNeighbourhood : MonoBehaviour
    {
        void Awake()
        {
            var network=new GameObject("Road network").AddComponent<RoadNetwork>();
            var services=new GameObject("City services").AddComponent<CityServices>();
            var police=new GameObject("Police dispatch").AddComponent<PoliceDispatch>();
            var scenery=new GameObject("Batched streets and buildings").transform;var moving=new GameObject("Moving road users").transform;
            var sun=new GameObject("Sun").AddComponent<Light>();sun.type=LightType.Directional;sun.intensity=1.7f;sun.color=new Color(1,.93f,.8f);sun.transform.rotation=Quaternion.Euler(42,-35,0);
            RenderSettings.ambientMode=AmbientMode.Trilight;RenderSettings.ambientSkyColor=new Color(.52f,.63f,.73f);RenderSettings.ambientEquatorColor=new Color(.4f,.44f,.42f);RenderSettings.ambientGroundColor=new Color(.2f,.23f,.18f);
            RenderSettings.fog=true;RenderSettings.fogColor=new Color(.66f,.74f,.79f);RenderSettings.fogMode=FogMode.Linear;RenderSettings.fogStartDistance=140;RenderSettings.fogEndDistance=300;
            var sky=new Material(Resources.Load<Material>("Materials/SkyReference"));sky.SetFloat("_AtmosphereThickness",.75f);RenderSettings.skybox=sky;RenderSettings.sun=sun;
            var grass=WorldShapes.Material("Grass",new Color(.78f,.82f,.66f),"grass");var road=WorldShapes.Material("Asphalt",Color.white,"asphalt");
            var paving=WorldShapes.Material("Paving",new Color(.87f,.86f,.79f),"paving");var white=WorldShapes.Material("Road paint",new Color(.89f,.89f,.79f));var metal=WorldShapes.Material("Steel",new Color(.42f,.48f,.49f));
            CoastalGround.Build(scenery,grass);
            for(int i=-3;i<=3;i++)
            {
                WorldShapes.Box(scenery,"East–west street",new Vector3(416,.08f,28),new Vector3(0,.005f,i*64),road,true);
                WorldShapes.Box(scenery,"North–south street",new Vector3(28,.08f,416),new Vector3(i*64,.01f,0),road,true);
                for(int j=-3;j<=3;j++)
                {
                    var centre=new Vector3(i*64,0,j*64);var junction=new Junction{Position=centre};junction.Rules.Roundabout=LaneRoute.IsRoundabout(centre);network.Junctions.Add(junction);
                    foreach(int side in new[]{-1,1})
                    {
                        for(float stripe=-13.3f;stripe<=13.3f;stripe+=1.1f)
                        {
                            if(j!=0||Mathf.Abs(stripe)>1.7f)WorldShapes.Box(scenery,"Zebra",new Vector3(2.6f,.015f,.52f),centre+new Vector3(side*18,.063f,stripe),white);
                            WorldShapes.Box(scenery,"Zebra",new Vector3(.52f,.015f,2.6f),centre+new Vector3(stripe,.064f,side*18),white);
                        }
                        WorldShapes.Box(scenery,"Car stop line",new Vector3(.18f,.015f,4.8f),centre+new Vector3(side*20.5f,.065f,side*7.4f),white);
                        WorldShapes.Box(scenery,"Car stop line",new Vector3(4.8f,.015f,.18f),centre+new Vector3(-side*7.4f,.065f,side*20.5f),white);
                        WorldShapes.Box(scenery,"Bicycle stop line",new Vector3(.18f,.015f,1.6f),centre+new Vector3(side*20.5f,.066f,side*11.8f),white);
                        WorldShapes.Box(scenery,"Bicycle stop line",new Vector3(1.6f,.015f,.18f),centre+new Vector3(-side*11.8f,.066f,side*20.5f),white);
                    }
                    StreetSignalModels.Create(scenery,junction);
                    if(junction.Rules.Roundabout)BuildRoundabout(scenery,centre,paving,grass,white);
                }
                for(int block=-3;block<3;block++)foreach(int side in new[]{-1,1})
                {
                    var cycle=WorldShapes.Material("Cycle surface",new Color(.39f,.45f,.38f));
                    // Paint ends before the zebra, with a separate bicycle waiting line.
                    WorldShapes.Box(scenery,"Cycle lane",new Vector3(23,.015f,1.6f),new Vector3(block*64+32,.062f,i*64+side*11.8f),cycle);
                    WorldShapes.Box(scenery,"Cycle lane",new Vector3(1.6f,.015f,23),new Vector3(i*64+side*11.8f,.062f,block*64+32),cycle);
                    for(int dash=0;dash<5;dash++)
                    {
                        WorldShapes.Box(scenery,"Lane divider",new Vector3(2,.015f,.1f),new Vector3(block*64+23+dash*4.5f,.065f,i*64+side*9.8f),white);
                        WorldShapes.Box(scenery,"Lane divider",new Vector3(.1f,.015f,2),new Vector3(i*64+side*9.8f,.065f,block*64+23+dash*4.5f),white);
                    }
                }
            }
            string[] kinds={"school","market","hospital","police","fire","library","court","bank","townhall","depot"};
            string[] names={"Ashford School","Ashford Supermarket","Ashford Hospital","Ashford Police Station","Ashford Fire Station","Ashford Library","Ashford Courthouse","Ashford Bank","Ashford Town Hall","Ashford Bus Depot"};
            var sites=new[]{new Vector2Int(-2,-2),new Vector2Int(1,1),new Vector2Int(1,-1),new Vector2Int(-1,1),new Vector2Int(2,-2),new Vector2Int(0,-2),new Vector2Int(-2,1),new Vector2Int(0,1),new Vector2Int(-1,-1),new Vector2Int(-3,0)};
            for(int bx=-3;bx<3;bx++)for(int bz=-3;bz<3;bz++)
            {
                var p=new Vector3(bx*64+32,0,bz*64+32);TransitStops.Pavement(scenery,p,paving);
                WorldShapes.Box(scenery,"Garden",new Vector3(28,.025f,28),p+Vector3.up*.19f,grass);
                int facility=-1;for(int n=0;n<sites.Length;n++)if(sites[n]==new Vector2Int(bx,bz))facility=n;
                if(facility>=0)CivicArchitecture.Build(scenery,p,kinds[facility],names[facility]);
                else if(bx==0&&bz==0)NeighbourhoodArchitecture.House(scenery,p,1,true);
                else if((bx+bz)%3==0){NeighbourhoodArchitecture.House(scenery,p+new Vector3(-6.4f,0,2),.75f);NeighbourhoodArchitecture.House(scenery,p+new Vector3(6.4f,0,2),.75f);}
                else
                {
                    for(int row=-1;row<=1;row+=2)
                    {
                        NeighbourhoodArchitecture.Apartments(scenery,p+new Vector3(-8,0,row*8),5+Mathf.Abs(bx+bz+row)%3);
                        NeighbourhoodArchitecture.Apartments(scenery,p+new Vector3(8,0,row*8),6+Mathf.Abs(bx-bz+row)%3);
                    }
                }
                LandscapeDesign.Plot(scenery,p);
                WorldShapes.Tree(scenery,p+new Vector3(-14.6f,.18f,-4));WorldShapes.Tree(scenery,p+new Vector3(14.6f,.18f,4));
                foreach(int side in new[]{-1,1})
                {
                    WorldShapes.Box(scenery,"Streetlight mast",new Vector3(.09f,4.7f,.09f),p+new Vector3(side*17,2.53f,0),metal);
                    WorldShapes.Box(scenery,"Streetlight arm",new Vector3(1.5f,.06f,.06f),p+new Vector3(side*17+side*.7f,4.84f,0),metal);
                    WorldShapes.Box(scenery,"Streetlight housing",new Vector3(.6f,.13f,.23f),p+new Vector3(side*18.3f,4.77f,0),white);
                }
                WorldShapes.Box(scenery,"Street name pole",new Vector3(.065f,2.3f,.065f),p+new Vector3(-17,1.33f,-16.8f),metal);
                WorldShapes.Box(scenery,"Street name plate",new Vector3(2.2f,.4f,.055f),p+new Vector3(-17,1.9f,-16.8f),white);
                WorldShapes.Label(scenery,StreetName(bz)+" / "+(bx+4)+" Avenue",p+new Vector3(-17,1.9f,-16.835f),.055f);
            }
            WorldShapes.Box(scenery,"Reserved tram corridor",new Vector3(416,.03f,3.3f),new Vector3(0,.065f,0),WorldShapes.Material("Track bed",new Color(.39f,.44f,.4f)));
            foreach(int side in new[]{-1,1})WorldShapes.Box(scenery,"Rail",new Vector3(416,.055f,.085f),new Vector3(0,.105f,side*.8f),metal);
            BuildTram(moving,scenery,paving,metal);TransitStops.BuildBusStops(scenery);
            var outer=new[]{new Vector3(-128,0,-128),new Vector3(128,0,-128),new Vector3(128,0,128),new Vector3(-128,0,128)};
            for(int i=0;i<16;i++)SpawnVehicle(moving,i==0?"ambulance":i<5?"police":"car",outer,i%4,24+(i/4)*43,new Color(.3f+(i%3)*.16f,.37f+(i%2)*.17f,.42f));
            var bikeLoop=new[]{new Vector3(-192,0,0),new Vector3(192,0,0)};
            for(int i=0;i<6;i++){SpawnVehicle(moving,"bicycle",bikeLoop,i%2,120+i*31,new Color(.2f,.44f,.37f));SpawnVehicle(moving,"motorcycle",bikeLoop,i%2,40+i*37,new Color(.42f,.3f,.23f));}
            for(int i=0;i<2;i++){var bus=SpawnVehicle(moving,"bus",TransitStops.BusRoute,i*2,21,Color.white);bus.Stops=TransitStops.BusBays();}
            for(int i=0;i<48;i++)
            {
                var person=WorldShapes.Person(moving,new Color(.42f,.52f,.49f));var walker=person.gameObject.AddComponent<CrossingWalker>();
                var c=new Vector3((i%6-3)*64,0,(i/6%6-3)*64);
                walker.Waypoints=new[]{c+new Vector3(-18,.2f,18),c+new Vector3(18,.2f,18),c+new Vector3(18,.2f,46),c+new Vector3(-18,.2f,46)};person.position=walker.Waypoints[i%4];
            }
            var player=new GameObject("Player");player.transform.position=new Vector3(32,.3f,16);var body=player.AddComponent<CharacterController>();body.height=1.8f;body.radius=.32f;body.center=new Vector3(0,.9f,0);body.stepOffset=.28f;
            var camera=new GameObject("Main Camera").AddComponent<Camera>();camera.tag="MainCamera";camera.fieldOfView=64;camera.nearClipPlane=.1f;camera.farClipPlane=330;camera.backgroundColor=RenderSettings.fogColor;camera.gameObject.AddComponent<AudioListener>();
            network.Player=player.transform;var movement=player.AddComponent<NeighbourhoodPlayer>();movement.View=camera;movement.Avatar=WorldShapes.Person(player.transform,new Color(.2f,.42f,.49f));services.Player=movement;police.Player=movement;
            var settings=new GameObject("GameSettings").AddComponent<ScalableQuality>();settings.Initialize(camera,sun);
            RegionalWorld.Build(scenery,moving,road,paving,grass);
            WorldGeography.Build(scenery,moving,road,paving,grass);
            FutureDistrict.Build(scenery,moving,road,paving,grass);
            NeighbourhoodLife.Build(scenery,moving);
            var climate=new GameObject("Hidrok Antarctic enclosure").AddComponent<HidrokClimate>();climate.Player=movement;climate.View=camera;climate.Build(scenery,moving);
            var teleport=new GameObject("Government teleport network").AddComponent<GovernmentTeleport>();teleport.Build();
            var industry=new GameObject("Hidrok industry simulation").AddComponent<IndustrySystem>();industry.Build(moving);
            new GameObject("Preloaded world audio").AddComponent<NeighbourhoodAudio>().Player=movement;
            StaticBatchingUtility.Combine(scenery.gameObject);
        }
        static string StreetName(int row)=>new[]{"School Street","Market Street","Civic Street","Tram Boulevard","Library Street","Hospital Street"}[Mathf.Clamp(row+3,0,5)];
        static void BuildRoundabout(Transform parent,Vector3 p,Material paving,Material grass,Material white)
        {
            var curb=SmoothShapes.Part(parent,"Circular island curb",SmoothShapes.Tube,new Vector3(12,.25f,12),p,paving,true);
            curb.AddComponent<MeshCollider>().sharedMesh=curb.GetComponent<MeshFilter>().sharedMesh;
            SmoothShapes.Part(parent,"Roundabout planted island",SmoothShapes.Tube,new Vector3(11.5f,.04f,11.5f),p+Vector3.up*.25f,grass,true);
            WorldShapes.Tree(parent,p+Vector3.up*.29f);
            var triangle=new Mesh{name="Inverted yield sign"};triangle.vertices=new[]{new Vector3(-.5f,.5f,0),new Vector3(0,-.5f,0),new Vector3(.5f,.5f,0)};triangle.triangles=new[]{0,1,2};triangle.RecalculateNormals();triangle.RecalculateBounds();
            foreach(var approach in new[]{new Vector3(20.5f,0,15.5f),new Vector3(-20.5f,0,-15.5f),new Vector3(-15.5f,0,20.5f),new Vector3(15.5f,0,-20.5f)})
            {
                var sign=new GameObject("Roundabout yield sign").transform;sign.SetParent(parent,false);sign.position=p+approach;
                sign.rotation=Quaternion.LookRotation(Mathf.Abs(approach.x)>Mathf.Abs(approach.z)?new Vector3(Mathf.Sign(approach.x),0,0):new Vector3(0,0,Mathf.Sign(approach.z)));
                WorldShapes.Box(sign,"Yield sign post",new Vector3(.065f,2.5f,.065f),Vector3.up*1.4f,paving);
                SmoothShapes.Part(sign,"Red triangle border",triangle,new Vector3(.85f,.85f,1),new Vector3(0,2.5f,.06f),WorldShapes.Material("Yield red",new Color(.75f,.07f,.04f)),true);
                SmoothShapes.Part(sign,"White yield face",triangle,new Vector3(.66f,.66f,1),new Vector3(0,2.51f,.065f),white,true);
            }
            for(int n=0;n<24;n++){float a=n*Mathf.PI/12;var go=WorldShapes.Box(parent,"Circulating lane marking",new Vector3(.09f,.015f,1),p+new Vector3(Mathf.Cos(a)*13,.069f,Mathf.Sin(a)*13),white);go.transform.rotation=Quaternion.Euler(0,-a*Mathf.Rad2Deg,0);}
        }
        internal static TrafficVehicle SpawnVehicle(Transform parent,string kind,Vector3[] route,int segment,float progress,Color color)
        {
            var model=VehicleModelLibrary.Create(kind,parent,color,out var wheels);var vehicle=model.AddComponent<TrafficVehicle>();vehicle.Kind=kind;vehicle.Route=route;vehicle.Segment=segment;vehicle.Progress=progress;vehicle.Wheels=wheels;
            vehicle.User=kind=="bicycle"?RoadUser.Bicycle:RoadUser.Car;vehicle.Length=kind=="bus"?10:kind=="ambulance"?5.65f:kind=="bicycle"||kind=="motorcycle"?2.1f:4.4f;vehicle.Width=kind=="bus"?2.5f:kind=="ambulance"?2.3f:kind=="bicycle"||kind=="motorcycle"?.8f:2.1f;vehicle.CruiseSpeed=kind=="bicycle"?4.5f:kind=="motorcycle"?10:8;
            var direction=(route[(segment+1)%route.Length]-route[segment]).normalized;model.transform.position=route[segment]+direction*progress+LaneRoute.Right(direction)*(vehicle.User==RoadUser.Bicycle?TrafficRules.BicycleLane:TrafficRules.CarLane);model.transform.rotation=Quaternion.LookRotation(direction);
            if(kind=="motorcycle"||kind=="bicycle")
            {
                var rider=WorldShapes.Person(model.transform,new Color(.18f,.24f,.28f),true);vehicle.Rider=rider;rider.localPosition=new Vector3(0,kind=="bicycle"?.15f:.2f,-.31f);
                var helmet=SmoothShapes.Profile("Open-face helmet",new[]{new Vector2(0,0),new Vector2(.48f,0),new Vector2(.5f,.15f),new Vector2(.46f,.55f),new Vector2(.3f,.85f),new Vector2(0,1)});
                SmoothShapes.Part(rider,"Helmet",helmet,new Vector3(.275f,.15f,.28f),new Vector3(0,1.78f,-.02f),WorldShapes.Material("Helmet",new Color(.2f,.26f,.29f),null,.5f));
            }
            return vehicle;
        }
        static void BuildTram(Transform moving,Transform scenery,Material paving,Material metal)
        {
            var root=new GameObject("Tram").transform;root.SetParent(moving,false);root.position=new Vector3(-160,0,0);
            var paint=WorldShapes.Material("Tram paint",new Color(.18f,.44f,.46f));var glass=WorldShapes.Material("Tram glass",new Color(.18f,.27f,.32f),null,.7f);var ivory=WorldShapes.Material("Tram trim",new Color(.82f,.83f,.76f));
            var visual=new GameObject("Pearl hover tram body").transform;visual.SetParent(root,false);visual.localRotation=Quaternion.Euler(0,90,0);TransportDesign.Rail(visual,18,2.7f,2.1f);
            var tramHull=root.gameObject.AddComponent<BoxCollider>();tramHull.size=new Vector3(18,2.35f,2.7f);tramHull.center=new Vector3(0,1.58f,0);
            foreach(float x in new[]{-160f,-96f,-32f,32f,96f,160f})foreach(int side in new[]{-1,1})
            {
                var stop=new GameObject("Median tram platform").transform;stop.SetParent(scenery,false);stop.position=new Vector3(x,0,side*3.25f);
                WorldShapes.Box(stop,"Raised boarding island",new Vector3(28,.22f,2.8f),Vector3.up*.11f,paving,true);
                WorldShapes.Box(stop,"Tactile platform edge",new Vector3(26,.025f,.22f),new Vector3(0,.235f,-side*1.25f),ivory);
                WorldShapes.Box(stop,"Shelter canopy",new Vector3(16,.14f,2.6f),new Vector3(0,3.1f,0),paint);
                foreach(int end in new[]{-1,1})WorldShapes.Box(stop,"Shelter support",new Vector3(.09f,2.9f,.09f),new Vector3(end*7.6f,1.65f,side*1.08f),metal);
                WorldShapes.Box(stop,"Traffic-side safety rail",new Vector3(24,.07f,.07f),new Vector3(0,1.15f,side*1.32f),metal,true);
                for(int n=-3;n<=3;n++)WorldShapes.Box(stop,"Safety rail post",new Vector3(.07f,.9f,.07f),new Vector3(n*3.8f,.7f,side*1.32f),metal,true);
                WorldShapes.Label(stop,"TRAM — "+(Mathf.RoundToInt((x+160)/64)+1),new Vector3(0,2.8f,-side*1.34f),.1f,side>0);
                WorldShapes.Box(scenery,"Overhead line support",new Vector3(.09f,4.7f,.09f),new Vector3(x,2.5f,side*4.8f),metal);
                if(side==1)WorldShapes.Box(scenery,"Overhead crossarm",new Vector3(.07f,.07f,9.6f),new Vector3(x,4.48f,0),metal);
            }
            WorldShapes.Box(scenery,"Contact wire",new Vector3(416,.025f,.025f),new Vector3(0,4.48f,0),metal);
            foreach(int side in new[]{-1,1})WorldShapes.Box(root,"Magnetic lift field",new Vector3(16,.12f,.14f),new Vector3(0,.28f,side*1.22f),WorldShapes.Material("Tram induction",new Color(.03f,.85f,1)),false,false);
            WorldShapes.Label(root,"HIDROK MAGLEV",new Vector3(0,1.15f,-1.38f),.13f);
            root.gameObject.AddComponent<TramService>();
        }
    }
}

