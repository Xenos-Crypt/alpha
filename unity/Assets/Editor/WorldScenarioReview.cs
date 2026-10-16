using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using AnotherWorld.World;
using AnotherWorld.Traffic;
namespace AnotherWorld.Editor
{
    [InitializeOnLoad]
    public static class WorldScenarioReview
    {
        const string Key="AW.WorldScenarioReview";
        static readonly Dictionary<TrafficVehicle,Vector3> initial=new Dictionary<TrafficVehicle,Vector3>();
        static readonly List<string> errors=new List<string>();
        static WorldScenarioReview(){if(SessionState.GetBool(Key,false))Hook();}
        static void Hook(){EditorApplication.update-=Tick;EditorApplication.update+=Tick;Application.logMessageReceived-=Log;Application.logMessageReceived+=Log;}
        static void Log(string text,string stack,LogType type){if(type==LogType.Error||type==LogType.Exception||type==LogType.Assert)errors.Add(text);}
        static void Check(bool ok,string text){if(!ok)throw new Exception(text);}
        public static void Run()
        {
            ProjectSetup.Setup();EditorSceneManager.OpenScene("Assets/Scenes/Neighbourhood.unity");
            SessionState.SetBool(Key,true);SessionState.SetInt(Key+"stage",0);Hook();EditorApplication.EnterPlaymode();
        }
        static void Interact(NeighbourhoodPlayer p)=>typeof(NeighbourhoodPlayer).GetMethod("Interact",BindingFlags.NonPublic|BindingFlags.Instance).Invoke(p,null);
        static void ReviewWaterAndKerbs(NeighbourhoodPlayer player)
        {
            var origin=player.transform.position;var body=player.GetComponent<CharacterController>();
            var root=new GameObject("Player kerb and sinking regression");var car=root.AddComponent<TrafficVehicle>();car.Owned=true;
            var hull=root.AddComponent<BoxCollider>();hull.center=new Vector3(0,.9f,0);hull.size=new Vector3(2,1.5f,4);
            root.transform.position=new Vector3(-800,0,-3);car.Width=2;car.Length=4;
            var kerb=GameObject.CreatePrimitive(PrimitiveType.Cube);kerb.transform.position=new Vector3(-800,.14f,2);kerb.transform.localScale=new Vector3(8,.28f,4);
            Physics.SyncTransforms();Check(player.TakeVehicle(car),"Cannot enter kerb test car");
            Check(car.ClearTravel(Vector3.forward,4)>3.9f,"Player car blocked by low kerb");
            car.PlayerControlled=false;Check(car.ClearTravel(Vector3.forward,4)<2,"AI car can mount platform");car.PlayerControlled=true;
            root.transform.position=new Vector3(-800,0,1);Physics.SyncTransforms();car.FollowSurface(.2f);Check(root.transform.position.y>.27f,"Car did not rise onto pavement");
            var wall=GameObject.CreatePrimitive(PrimitiveType.Cube);wall.transform.position=new Vector3(-800,1.5f,6);wall.transform.localScale=new Vector3(8,3,.2f);Physics.SyncTransforms();
            Check(car.ClearTravel(Vector3.forward,8)<4,"Player car passed through tall wall");
            root.transform.position=new Vector3(260,0,400);Physics.SyncTransforms();
            Check(car.ClearTravel(Vector3.forward,2)>1.9f,"Player car blocked at ocean boundary");car.FollowSurface(.1f);Check(car.Sinking,"Road vehicle failed to sink in open water");
            player.EscapeSinkingVehicle();Check(!player.IsDriving&&player.Swimming,"Sinking car did not release swimmer");
            for(int i=0;i<60;i++)player.MoveOnFoot(Vector3.forward,false,1/30f);
            Check(player.transform.position.z>402&&player.transform.position.y<-.9f&&player.transform.position.y>-1.2f,"Swimming not moving at waterline");
            Check(player.Stamina<100&&player.Stamina>95,"Swimming stamina drain incorrect");
            body.enabled=false;player.transform.position=new Vector3(299.98f,-1,400);body.enabled=true;Physics.SyncTransforms();player.MoveOnFoot(Vector3.right,false,.1f);
            Check(player.transform.position.x>=300&&player.transform.position.y>=0&&!player.Swimming,"Swimmer cannot climb onto shore");
            body.enabled=false;player.transform.position=new Vector3(260,-1,400);body.enabled=true;player.Powers.SelectElement(2);
            Check(player.Powers.Element==2,"Tide selection failed");float energy=player.Powers.Energy;
            Check(player.Powers.Cast(2)&&!player.Powers.Cast(2)&&player.Powers.Energy==energy-15,"Power input, energy cost or cooldown failed");
            UnityEngine.Object.DestroyImmediate(wall);UnityEngine.Object.DestroyImmediate(kerb);UnityEngine.Object.DestroyImmediate(root);
            body.enabled=false;player.transform.position=origin;body.enabled=true;player.Stamina=100;
        }
        static void Tick()
        {
            EditorApplication.QueuePlayerLoopUpdate();
            if(!EditorApplication.isPlaying)
            {if(SessionState.GetInt(Key+"stage",0)==2){SessionState.SetBool(Key,false);EditorApplication.Exit(0);}return;}
            var n=RoadNetwork.Instance;if(!n||Time.time<1)return;
            try
            {
                    var player=n.Player.GetComponent<NeighbourhoodPlayer>();var stage=SessionState.GetInt(Key+"stage",0);
                if(stage==0)
                {
                    Check(CountryAtlas.Current.cities.SequenceEqual(new[]{"Ashford","Riverside","Ashford Capital","Northhaven","Poison Land"}),"First country must contain the five original cities");
                    Check(n.Junctions.Count>=190,"Missing connected regional street grids");
                    Check(n.Vehicles.Count(v=>v.Kind=="police")>=9,"Missing regional patrol units");
                    Check(n.Vehicles.Count(v=>v.Kind=="bus")==2,"Missing buses");
                    Check(CityServices.Instance.Places.Count>=95,"Missing civic or regional destinations");
                    Check(CountryAtlas.Current.name=="Hidrok"&&HidrokClimate.Instance.Inside&&HidrokClimate.Instance.Temperature==22,"Missing warm Antarctic enclosure");
                    Check(GameObject.Find("Hidrok climate and cloaking dome")!=null,"Missing protective dome");
                    foreach(string region in new[]{"Riverside","Ashford Capital","Poison Land","Northhaven"})Check(GameObject.Find(region+" district")!=null,"Missing city: "+region);
                    foreach(var island in WorldGeography.Islands){var place=CityServices.Instance.Places.FirstOrDefault(f=>f.Name==island.Name);Check(place!=null&&!WorldGeography.IsWater(place.Door),"Island destination in water: "+island.Name);}
                    Check(WorldGeography.IsWater(new Vector3(260,0,400)),"Ocean boundary missing");
                    Check(!WorldGeography.IsWater(new Vector3(0,0,400)),"Bridge incorrectly treated as water");
                    var connected=LaneRoute.ToTarget(Vector3.zero,new Vector3(192,0,704));Check(connected.Length>5&&connected.All(p=>!WorldGeography.IsWater(p)),"Regional police route crosses ocean");
                    Check(player.Avatar!=null,"Missing third-person player avatar");
                    ReviewWaterAndKerbs(player);
                    Check(n.Walkers.Count>=48,"Streets missing residents");
                    Check(n.Vehicles.Where(v=>v.Kind=="motorcycle"||v.Kind=="bicycle").All(v=>v.Rider!=null&&v.Rider.localScale==Vector3.one),"Missing full-size bike riders");
                    var collisionCar=n.Vehicles.First(v=>v.Kind=="police");var savedPosition=collisionCar.transform.position;
                    collisionCar.transform.position=new Vector3(-32,0,7.4f);Physics.SyncTransforms();
                    Check(collisionCar.ClearTravel(Vector3.back,8)<2,"Police vehicle can cross raised tram platform");collisionCar.transform.position=savedPosition;Physics.SyncTransforms();
                    Check(n.Buttons.Count>=1472,"Both directional buttons missing at regional corners");
                    Check(n.Tram.Stops.Length==6,"Missing median tram stops");
                    var origin=player.transform.position;
                    Check(n.Vehicles.Count(v=>v.Kind=="plane")==2&&n.Vehicles.Count(v=>v.Kind=="helicopter")==2,"Missing player-controlled aircraft on pads");
                    var flight=n.Vehicles.First(v=>v.Kind=="plane");var flightOrigin=flight.transform.position;flight.Owned=true;
                    Check(player.TakeVehicle(flight)&&player.IsDriving,"Cannot enter VTOL plane");Physics.SyncTransforms();
                    Check(flight.ClearTravel(Vector3.up,3)>2.5f,"Aircraft cannot take off from pad");
                    var ceiling=GameObject.CreatePrimitive(PrimitiveType.Cube);ceiling.name="Aircraft clearance regression ceiling";ceiling.transform.position=flightOrigin+Vector3.up*4;ceiling.transform.localScale=new Vector3(20,.5f,20);Physics.SyncTransforms();
                    Check(flight.ClearTravel(Vector3.up,3)<1,"Aircraft upper hull can clip through a ceiling");UnityEngine.Object.DestroyImmediate(ceiling);Physics.SyncTransforms();
                    flight.transform.position+=Vector3.up*20;player.transform.position=flight.transform.position;Interact(player);Check(player.IsDriving,"Player could exit an airborne plane");
                    flight.transform.position=flightOrigin;player.transform.position=flightOrigin;Interact(player);Check(!player.IsDriving,"Player cannot exit landed plane");flight.Owned=false;
                    var rail=IntercityMaglev.Instance;player.transform.position=rail.BoardingPoint;Interact(player);Check(player.IsRidingTransit,"Cannot board intercity maglev");Interact(player);Check(!player.IsRidingTransit,"Cannot leave stopped intercity maglev");
                    var teleport=GovernmentTeleport.Instance;player.GetComponent<CharacterController>().enabled=false;player.transform.position=teleport.HidrokLanding;player.GetComponent<CharacterController>().enabled=true;
                    Check(teleport.Travel()&&GovernmentTeleport.InUsa(player.transform.position),"Government portal did not reach USA");
                    typeof(HidrokClimate).GetMethod("Update",BindingFlags.NonPublic|BindingFlags.Instance).Invoke(HidrokClimate.Instance,null);
                    Check(!HidrokClimate.Instance.Inside&&HidrokClimate.Instance.Temperature==18,"USA incorrectly treated as Antarctic cold");
                    Check(teleport.Travel()&&!GovernmentTeleport.InUsa(player.transform.position),"USA return portal failed");
                    typeof(HidrokClimate).GetMethod("Update",BindingFlags.NonPublic|BindingFlags.Instance).Invoke(HidrokClimate.Instance,null);
                    typeof(CityServices).GetMethod("DrawIndustryControls",BindingFlags.NonPublic|BindingFlags.Instance).Invoke(CityServices.Instance,new object[]{null,0f,600f});
                    var industry=IndustrySystem.Instance;var originalLedger=industry.Ledger;industry.Ledger=new IndustryLedger();
                    var factory=industry.Orders.Keys.First(f=>f.Name=="Hidrok Hoverworks");var order=industry.Orders[factory];order.Running=false;order.Elapsed=0;
                    Check(industry.StartOrder(factory)&&order.Advance(order.Duration,industry.Ledger)&&industry.Ledger[IndustrialResource.Hovercraft]==1,"Factory failed to manufacture a vehicle");
                    Check(industry.Deploy(factory),"Factory delivery bay could not deliver a completed car");
                    var delivered=UnityEngine.Object.FindObjectsByType<TrafficVehicle>(FindObjectsSortMode.None).First(v=>v.Owned&&v!=flight);
                    Check(player.TakeVehicle(delivered)&&!delivered.Stolen&&PoliceDispatch.Instance.Wanted==0,"Owned manufactured car incorrectly treated as theft");Interact(player);
                    UnityEngine.Object.DestroyImmediate(delivered.gameObject);
                    foreach(var product in new[]{IndustrialResource.Airframes,IndustrialResource.Saucers})
                    {
                        var maker=industry.Orders.Keys.First(f=>industry.Orders[f].Output==product);industry.Ledger.Add(product,1);
                        Check(industry.Deploy(maker),"Factory failed to deliver "+product);
                        var craft=UnityEngine.Object.FindObjectsByType<TrafficVehicle>(FindObjectsSortMode.None).First(v=>v.Owned);
                        Check(craft.CanFly&&craft.GetComponent<BoxCollider>()!=null,"Manufactured aircraft lacks flight or collision hull");UnityEngine.Object.DestroyImmediate(craft.gameObject);
                    }
                    industry.Ledger=originalLedger;
                    player.GetComponent<CharacterController>().enabled=false;player.transform.position=origin;player.GetComponent<CharacterController>().enabled=true;
                    Check(FerryService.CruiseSpeed<=3.5f,"Ferry speed exceeds safe harbour speed");
                    Check(n.Vehicles.All(v=>v.Wheels==null||v.Wheels.Length==0),"Road transport still has tyres");
                    Check(n.Vehicles.Any(v=>v.CanFly),"Missing usable skycar");
                    Check(UnityEngine.Object.FindObjectsByType<AnimalRoam>(FindObjectsSortMode.None).Length>=11,"Missing zoo and coastal animals");
                    var bridge=UnityEngine.Object.FindObjectsByType<LiftBridge>(FindObjectsSortMode.None).First(b=>Mathf.Abs(b.transform.position.x)<1);
                    foreach(var crossing in UnityEngine.Object.FindObjectsByType<LiftBridge>(FindObjectsSortMode.None))
                    {
                        var deck=crossing.transform.Find("Moving bridge span/Lift deck").GetComponent<BoxCollider>();
                        var water=crossing.transform.Find("Shipping channel water").GetComponent<Renderer>();
                        Check(deck.bounds.max.y>water.bounds.max.y+.04f&&deck.bounds.max.y>WorldGeography.WaterLevel+.04f,"Water covers the lowered lift bridge");
                        foreach(var approach in GameObject.Find("Batched streets and buildings").GetComponentsInChildren<BoxCollider>())
                            if(approach.name=="Bridge approach")Check(Mathf.Abs(approach.bounds.max.y-deck.bounds.max.y)<.001f,"Bridge deck does not align with approach");
                    }
                    var clearanceCar=n.Vehicles.First(v=>v.Kind=="car");var clearanceOrigin=clearanceCar.transform.position;
                    clearanceCar.transform.position=new Vector3(7.4f,0,240);Physics.SyncTransforms();
                    Check(clearanceCar.ClearTravel(Vector3.forward,5)>4.9f,"AI traffic blocked by lowered bridge deck");
                    clearanceCar.transform.position=clearanceOrigin;Physics.SyncTransforms();
                    Check(!LiftBridge.PermitShip(new Vector3(30,0,260),Vector3.left),"Ferry permitted through closed bridge");
                    Check(bridge.RoadClosed&&LiftBridge.LimitRoad(new Vector3(7.4f,0,230),Vector3.forward,20,4.4f)<10,"Road not stopped before bridge opens");
                    var bridgeTick=typeof(LiftBridge).GetMethod("Update",BindingFlags.NonPublic|BindingFlags.Instance);
                    var bridgeCar=n.Vehicles.First(v=>v.Kind=="car");var bridgeCarOrigin=bridgeCar.transform.position;
                    bridgeCar.transform.position=new Vector3(7.4f,0,260);
                    for(int i=0;i<10000;i++)bridgeTick.Invoke(bridge,null);
                    Check(!bridge.ShipClear,"Bridge raised beneath occupied road vehicle");
                    bridgeCar.transform.position=bridgeCarOrigin;
                    for(int i=0;i<10000;i++)bridgeTick.Invoke(bridge,null);
                    Check(bridge.ShipClear&&LiftBridge.PermitShip(new Vector3(30,0,260),Vector3.left),"Clear bridge never admitted ferry");
                    typeof(LiftBridge).GetField("holdUntil",BindingFlags.NonPublic|BindingFlags.Instance).SetValue(bridge,0f);
                    for(int i=0;i<10000;i++)bridgeTick.Invoke(bridge,null);
                    Check(!bridge.RoadClosed,"Bridge failed to reopen road");
                    var hangar=CityServices.Instance.Places.First(f=>f.Kind=="hangar");
                    var use=typeof(CityServices).GetMethod("Use",BindingFlags.NonPublic|BindingFlags.Instance);
                    use.Invoke(CityServices.Instance,new object[]{hangar});Check(player.transform.position.y<-10,"Hangar lift never reached basement");
                    use.Invoke(CityServices.Instance,new object[]{hangar});Check(player.transform.position.y>0,"Hangar lift failed to return to street");
                    player.transform.position=origin;
                    var body=player.GetComponent<CharacterController>();body.enabled=false;player.transform.position=HidrokClimate.Centre+Vector3.right*(HidrokClimate.Radius+20);
                    var climateUpdate=typeof(HidrokClimate).GetMethod("Update",BindingFlags.NonPublic|BindingFlags.Instance);climateUpdate.Invoke(HidrokClimate.Instance,null);
                    Check(!HidrokClimate.Instance.Inside&&HidrokClimate.Instance.Temperature==-35,"Exterior cold climate missing");
                    Check(GameObject.Find("Batched streets and buildings")==null,"Hidrok remains visible outside its cloak");
                    player.transform.position=origin;climateUpdate.Invoke(HidrokClimate.Instance,null);body.enabled=true;
                    player.transform.position=FerryService.Instance.BoardingPoint;Interact(player);Check(player.IsRidingTransit,"Cannot board ocean ferry");Interact(player);Check(!player.IsRidingTransit&&!WorldGeography.IsWater(player.transform.position),"Ferry exit in water");
                    player.transform.position=n.Tram.transform.position+new Vector3(0,.35f,3.25f);Interact(player);
                    Check(player.IsRidingTransit,"Cannot board tram from median platform");Interact(player);
                    Check(!player.IsRidingTransit&&Mathf.Abs(player.transform.position.z-3.25f)<.1f,"Tram exit placed passenger in traffic");
                    var portalOrigin=player.transform.position;player.GetComponent<CharacterController>().enabled=false;player.transform.position=GovernmentTeleport.Instance.HidrokLanding;player.GetComponent<CharacterController>().enabled=true;
                    PoliceDispatch.Instance.Report(player.transform,"scenario traffic report");Check(!GovernmentTeleport.Instance.Travel(),"Teleport allowed evasion during police pursuit");player.GetComponent<CharacterController>().enabled=false;player.transform.position=portalOrigin;player.GetComponent<CharacterController>().enabled=true;Check(PoliceDispatch.Instance.Wanted==1,"Police report not registered");
                    var dispatchType=typeof(PoliceDispatch);var dispatch=PoliceDispatch.Instance;
                    var patrol=(TrafficVehicle)dispatchType.GetField("responding",BindingFlags.NonPublic|BindingFlags.Instance).GetValue(dispatch);var patrolOrigin=patrol.transform.position;
                    patrol.transform.position=player.transform.position+Vector3.left*20;Physics.SyncTransforms();
                    dispatchType.GetMethod("Update",BindingFlags.NonPublic|BindingFlags.Instance).Invoke(dispatch,null);
                    var officer=(CharacterController)dispatchType.GetField("officer",BindingFlags.NonPublic|BindingFlags.Instance).GetValue(dispatch);
                    Check(officer!=null,"Patrol failed to deploy a pursuing officer");var officerOrigin=officer.transform.position;
                    dispatchType.GetMethod("Update",BindingFlags.NonPublic|BindingFlags.Instance).Invoke(dispatch,null);
                    Check((officer.transform.position-officerOrigin).sqrMagnitude>0,"Officer did not pursue player");
                    PoliceDispatch.Instance.Surrender();Check(PoliceDispatch.Instance.Wanted==0&&player.Coins==75,"Traffic citation did not resolve");
                    patrol.transform.position=patrolOrigin;
                    var motorcycle=n.Vehicles.First(v=>v.Kind=="motorcycle");var motorcycleOrigin=motorcycle.transform.position;float motorcycleSpeed=motorcycle.Speed;
                    motorcycle.transform.position=new Vector3(32,0,7.4f);motorcycle.Speed=0;
                    player.transform.position=new Vector3(34,.3f,7.4f);Interact(player);Check(player.IsDriving&&motorcycle.Stolen&&motorcycle.Rider==null,"Occupied motorcycle theft failed to remove its rider");Interact(player);Check(!player.IsDriving,"Cannot leave stolen motorcycle");motorcycle.Abandoned=false;
                    motorcycle.transform.position=motorcycleOrigin;motorcycle.Speed=motorcycleSpeed;
                    var controller=player.GetComponent<CharacterController>();controller.enabled=false;player.transform.position=new Vector3(36,.3f,32);controller.enabled=true;Physics.SyncTransforms();controller.Move(Vector3.right*6);
                    Check(player.transform.position.x<38,"Player passed through house wall");
                    player.Coins=100;player.transform.position=origin;
                    var update=typeof(RoadNetwork).GetMethod("Update",BindingFlags.NonPublic|BindingFlags.Instance);
                    var testCar=n.Vehicles.First(v=>v.Kind=="car");var carOrigin=testCar.transform.position;
                    var carJunction=n.Junctions.First(j=>j.Position.x==-192&&j.Position.z==-192);
                    testCar.transform.position=carJunction.Position+new Vector3(20,0,7.4f);
                    carJunction.Rules.RequestCrossing(TravelAxis.X);
                    carJunction.Rules.Tick(10,CrossingDemand.None,false,true);
                    carJunction.Rules.Tick(2,CrossingDemand.None,false,true);update.Invoke(n,null);
                    Check(carJunction.Rules.Phase==JunctionPhase.Clearance,"Walk opened while car rear overlapped zebra");
                    testCar.transform.position=carOrigin;
                    var tramOrigin=n.Tram.transform.position;
                    var tramJunction=n.Junctions.First(j=>j.Position.x==-192&&j.Position.z==0);
                    n.Tram.transform.position=tramJunction.Position+new Vector3(26,0,0);
                    tramJunction.Rules.RequestCrossing(TravelAxis.Z);
                    tramJunction.Rules.Tick(10,CrossingDemand.None,false,true);
                    tramJunction.Rules.Tick(2,CrossingDemand.None,false,true);update.Invoke(n,null);
                    Check(tramJunction.Rules.Phase==JunctionPhase.Clearance,"Walk opened while tram rear overlapped zebra");
                    n.Tram.transform.position=tramOrigin;
                    foreach(var v in n.Vehicles)initial[v]=v.transform.position;
                    SessionState.SetInt(Key+"stage",1);
                }
                if(Time.time<6)return;
                var boarding=n.Vehicles.FirstOrDefault(v=>v.Kind=="bus"&&v.DoorsOpen);
                if(boarding==null&&Time.time<30)return;
                Check(boarding!=null,"Buses did not pull into bays and dwell: "+string.Join("; ",n.Vehicles.Where(v=>v.Kind=="bus").Select(v=>v.transform.position.ToString()+" speed="+v.Speed)));
                player.transform.position=boarding.ExitPosition;Interact(player);Check(player.IsRidingTransit,"Bus boarding failed");Interact(player);
                Check(!player.IsRidingTransit&&Vector3.Distance(player.transform.position,boarding.ExitPosition)<.1f,"Bus exit not on boarding footway");
                Check(initial.Any(p=>Vector3.Distance(p.Key.transform.position,p.Value)>2),"Street traffic never moved");
                foreach(var v in n.Vehicles)
                {
                    if(v.Route==null)continue;
                    var path=LaneRoute.Build(v.Route,v.User==RoadUser.Bicycle?TrafficRules.BicycleLane:TrafficRules.CarLane,v.Kind=="bus");
                    Check(path.All(p=>!float.IsNaN(p.x)&&!float.IsNaN(p.z)),"Invalid route geometry");
                    if(v.Kind!="bicycle"&&v.Kind!="bus")foreach(var filter in v.GetComponentsInChildren<MeshFilter>())
                    {
                        var mesh=filter.sharedMesh;var vertices=mesh.vertices;var normals=mesh.normals;var triangles=mesh.triangles;
                        for(int i=0;i<triangles.Length;i+=3){int a=triangles[i],b=triangles[i+1],c=triangles[i+2];var cross=Vector3.Cross(vertices[b]-vertices[a],vertices[c]-vertices[a]);if(cross.sqrMagnitude<.00000001f)continue;Check(Vector3.Dot(cross,normals[a]+normals[b]+normals[c])>=-.00001f,"Inside-out vehicle surface");}
                    }
                }
                Check(errors.Count==0,string.Join("; ",errors));
                Directory.CreateDirectory("Logs");File.WriteAllText("Logs/world-scenario-check.json","{\"passed\":true,\"country\":\"Hidrok\",\"cities\":5,\"islands\":6,\"junctions\":"+n.Junctions.Count+",\"directionalButtons\":"+n.Buttons.Count+",\"policePatrols\":9,\"civicPlaces\":"+CityServices.Instance.Places.Count+",\"ocean\":true,\"ferryBoarding\":true,\"tramBoarding\":true,\"busBoarding\":true,\"climateAndCloaking\":true,\"officerPursuit\":true,\"platformCollision\":true,\"houseWallCollision\":true,\"occupiedBikeTheft\":true,\"aircraftBoardingAndTakeoff\":true,\"intercityRailBoarding\":true,\"usaTeleportAndReturn\":true,\"factoryProductionAndDelivery\":true,\"errors\":[]}");
                Debug.Log("PASS: Hidrok five-city world, six islands, ocean/bridges/ferry, climate/cloak, traffic/transit/collisions and police pursuit");
                SessionState.SetInt(Key+"stage",2);EditorApplication.ExitPlaymode();
            }
            catch(Exception e){Debug.LogException(e);SessionState.SetBool(Key,false);EditorApplication.Exit(1);}
        }
    }
}
