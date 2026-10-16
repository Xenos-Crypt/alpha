using UnityEngine;
using AnotherWorld.Traffic;
namespace AnotherWorld.World
{
    public static class FutureDistrict
    {
        public static void Build(Transform scenery,Transform moving,Material road,Material paving,Material grass)
        {
            var root=new GameObject("Hidrok innovation quarter").transform;root.SetParent(scenery,false);
            var alloy=WorldShapes.Material("Industry titanium",new Color(.21f,.32f,.37f),null,.65f);
            var cyan=WorldShapes.Material("Industry induction",new Color(.05f,.75f,.9f));
            var white=WorldShapes.Material("Traffic white",new Color(.92f,.94f,.91f));
            for(int x=-192;x<=192;x+=64)WorldShapes.Box(root,"Innovation avenue",new Vector3(28,.08f,270),new Vector3(x,.01f,-327),road,true);
            for(int z=-256;z>=-448;z-=64)
            {
                WorldShapes.Box(root,"Innovation cross street",new Vector3(412,.08f,28),new Vector3(0,.01f,z),road,true);
                for(int x=-192;x<=192;x+=64)
                {
                    var junction=new Junction{Position=new Vector3(x,0,z)};RoadNetwork.Instance.Junctions.Add(junction);StreetSignalModels.Create(root,junction);
                    foreach(int side in new[]{-1,1})for(int n=-6;n<=6;n++)
                    {
                        WorldShapes.Box(root,"Zebra crossing",new Vector3(.65f,.015f,2),new Vector3(x+n*1.6f,.065f,z+side*18),white);
                        WorldShapes.Box(root,"Zebra crossing",new Vector3(2,.015f,.65f),new Vector3(x+side*18,.065f,z+n*1.6f),white);
                    }
                    foreach(int side in new[]{-1,1})
                    {
                        WorldShapes.Box(root,"Stop line",new Vector3(6.2f,.015f,.25f),new Vector3(x+side*7.4f,.065f,z-side*20.5f),white);
                        var sign=new GameObject("Roadside speed sign").transform;sign.SetParent(root,false);sign.position=new Vector3(x+side*16,0,z+side*26);
                        WorldShapes.Box(sign,"Sign post",new Vector3(.08f,2.5f,.08f),Vector3.up*1.3f,alloy,true);
                        WorldShapes.Box(sign,"Sign board",new Vector3(1.2f,.8f,.08f),Vector3.up*2.4f,alloy);
                        WorldShapes.Label(sign,"30\nHOVER ZONE",new Vector3(0,2.4f,-.045f),.065f);
                    }
                }
            }
            string[] names={"Hidrok Hoverworks","Polar Aerospace","Helix Nuclear Energy","Saucer Engineering and Hangar","St Aurora Church","The Aurora Pub","Innovation School","Innovation Market","Hidrok Wildlife Park","Robotics and Transit Company","Ocean Research Institute","Hidrok Materials Factory","Aurora Apartments","Garden Residences","Technology College","Polar Clinic","Public Library","Engineers Community Hall"};
            string[] kinds={"industrial","industrial","utility","hangar","church","pub","school","market","zoo","industrial","office","industrial","community","community","school","hospital","library","community"};
            for(int i=0;i<names.Length;i++)
            {
                var p=new Vector3(-160+(i%6)*64,0,-288-(i/6)*64);
                WorldShapes.Box(root,"Raised district footway",new Vector3(36,.18f,36),p+Vector3.up*.09f,paving,true);
                CivicArchitecture.Build(root,p,kinds[i],names[i]);
                WorldShapes.Tree(root,p+new Vector3(13,.18f,12));
                for(int n=0;n<4;n++)
                {
                    var person=WorldShapes.Person(moving,new Color(.2f+(i%3)*.15f,.35f,.44f));var a=p+new Vector3(-14,.2f,-14);var b=p+new Vector3(14,.2f,-14);
                    person.position=Vector3.Lerp(a,b,n/4f);person.gameObject.AddComponent<CrossingWalker>().Waypoints=new[]{a,b,p+new Vector3(14,.2f,13),p+new Vector3(-14,.2f,13)};
                }
                if(kinds[i]=="utility")
                {
                    for(int n=0;n<2;n++)
                    {
                        SmoothShapes.Part(root,"Containment reactor",SmoothShapes.Ellipsoid,new Vector3(6,7,6),p+new Vector3(-5+n*10,4.3f,3),alloy,true);
                        SmoothShapes.Part(root,"Cooling induction band",SmoothShapes.Tube,new Vector3(6.1f,.16f,6.1f),p+new Vector3(-5+n*10,7,3),cyan,true);
                    }
                    WorldShapes.Label(root,names[i].ToUpperInvariant(),p+new Vector3(0,6,-9.2f),.12f);
                }
                if(kinds[i]=="hangar")Hangar(root,p,alloy,cyan);
                if(kinds[i]=="zoo")
                {Zoo(root,moving,new Vector3(-160,0,-490),alloy);var wildlife=CityServices.Instance.Places.Find(f=>f.Name==names[i]);wildlife.Door=new Vector3(-160,.3f,-474);wildlife.Description="Penguin and deer habitats are beyond the south avenue. Keep outside the enclosure rails.";}
            }
            var loop=new[]{new Vector3(-192,0,-256),new Vector3(192,0,-256),new Vector3(192,0,-448),new Vector3(-192,0,-448)};
            for(int n=0;n<12;n++)UnityNeighbourhood.SpawnVehicle(moving,n==0?"police":n==1?"ambulance":"car",loop,n%4,30+n/4*48,new Color(.21f,.45f,.57f));
            Beach(scenery,moving,paving);
            AdvancedAircraft.Build(scenery,moving);
            IntercityMaglev.Build(scenery,moving);
        }
        static void Hangar(Transform root,Vector3 p,Material alloy,Material cyan)
        {
            var place=CityServices.Instance.Places.Find(f=>f.Name=="Saucer Engineering and Hangar");place.Action="Use hangar lift";place.Description="Passenger lift to the underground saucer assembly and maintenance floor. Use the lift again to return.";
            var basement=new GameObject("Underground saucer assembly basement").transform;basement.SetParent(root,false);basement.position=p+Vector3.down*12;
            WorldShapes.Box(basement,"Basement floor",new Vector3(22,.2f,18),Vector3.zero,alloy,true);
            foreach(int side in new[]{-1,1})WorldShapes.Box(basement,"Retaining wall",new Vector3(.3f,7,18),new Vector3(side*11,3.5f,0),alloy,true);
            WorldShapes.Box(basement,"Retaining wall",new Vector3(22,7,.3f),new Vector3(0,3.5f,9),alloy,true);
            WorldShapes.Box(basement,"Retaining wall",new Vector3(22,7,.3f),new Vector3(0,3.5f,-9),alloy,true);
            SmoothShapes.Part(basement,"Saucer under construction",SmoothShapes.Ellipsoid,new Vector3(9,1.4f,9),new Vector3(2,1,2),alloy,true);
            SmoothShapes.Part(basement,"Saucer cockpit",SmoothShapes.Ellipsoid,new Vector3(3,1.5f,3),new Vector3(2,2.2f,2),cyan,true);
            foreach(int side in new[]{-1,1})WorldShapes.Box(basement,"Assembly gantry",new Vector3(.25f,6,.25f),new Vector3(side*6,3,2),cyan,true);
            WorldShapes.Label(basement,"SAUCER ASSEMBLY / E: LIFT TO STREET",new Vector3(0,2,-8.8f),.12f,false);
            var light=new GameObject("Hangar work light").AddComponent<Light>();light.transform.SetParent(basement,false);light.transform.localPosition=new Vector3(0,5,0);light.type=LightType.Point;light.range=24;light.intensity=5;light.shadows=LightShadows.None;
        }
        static void Zoo(Transform root,Transform moving,Vector3 p,Material rail)
        {
            // Two enclosures sit in the park beyond the district; the visitor path remains outside the fences.
            for(int pen=0;pen<2;pen++)
            {
                var centre=p+new Vector3(pen==0?-13:13,0,0);
                WorldShapes.Box(root,"Wildlife habitat",new Vector3(22,.14f,22),centre,WorldShapes.Material("Habitat grass",new Color(.32f,.46f,.24f)),true);
                foreach(int side in new[]{-1,1})
                {
                    WorldShapes.Box(root,"Enclosure rail",new Vector3(22,1,.12f),centre+new Vector3(0,.8f,side*11),rail,true);
                    WorldShapes.Box(root,"Enclosure rail",new Vector3(.12f,1,22),centre+new Vector3(side*11,.8f,0),rail,true);
                }
                for(int n=0;n<4;n++)AnimalRoam.Create(moving,centre+new Vector3((n%2)*3-1.5f,.15f,(n/2)*3-1.5f),pen==0?"Penguin":"Deer",n);
            }
        }
        static void Beach(Transform scenery,Transform moving,Material paving)
        {
            var p=new Vector3(260,0,198);WorldShapes.Box(scenery,"Ashford public beach",new Vector3(64,.16f,18),p,WorldShapes.Material("Beach sand",new Color(.86f,.78f,.55f)),true);
            var entry=new GameObject("Ashford Beach").transform;entry.SetParent(scenery,false);entry.position=p;
            var f=entry.gameObject.AddComponent<WorldFacility>();f.Name="Ashford Beach";f.Kind="beach";f.Door=p+Vector3.back*7;f.Description="Public sheltered shore, sun loungers and coastal wildlife.";f.Action="Visit beach";CityServices.Instance.Places.Add(f);
            for(int n=0;n<6;n++)
            {
                WorldShapes.Box(entry,"Sun lounger",new Vector3(.8f,.35f,2),new Vector3(-23+n*9,.3f,0),paving,true);
                var person=WorldShapes.Person(moving,new Color(.3f,.5f,.6f));person.position=p+new Vector3(-23+n*9,.2f,-5);
            }
            for(int n=0;n<3;n++)AnimalRoam.Create(moving,p+new Vector3(-15+n*10,.2f,4),"Penguin",n);
            WorldShapes.Label(entry,"ASHFORD BEACH",new Vector3(0,2,-7),.16f);
        }
    }
}
