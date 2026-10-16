using System.Collections.Generic;
using UnityEngine;
using AnotherWorld.Traffic;
namespace AnotherWorld.World
{
    public static class WorldGeography
    {
        public const float WaterLevel=0;
        public struct Island
        {
            public string Name;public Vector3 Centre;public float Radius;
            public Island(string name,float x,float z,float radius){Name=name;Centre=new Vector3(x,0,z);Radius=radius;}
        }
        public static readonly Island[] Islands={new Island("Driftwood Island",-220,500,24),new Island("Palm Cove",-70,545,19),new Island("Pine Rock",-165,820,26),new Island("Gull Rest",95,300,17),new Island("Ember Island",155,520,29),new Island("Boneharrow Island",-80,480,26)};
        public static readonly Rect[] Districts={new Rect(-128,640,192,192),new Rect(192,640,320,320),new Rect(576,192,256,256),new Rect(960,-384,256,320)};
        public static bool IsWater(Vector3 p)
        {
            if(p.x<=-300||p.x>=300||p.z<=208||p.z>=900)return false;
            foreach(var r in Districts)if(Rect.MinMaxRect(r.xMin-14,r.yMin-14,r.xMax+14,r.yMax+14).Contains(new Vector2(p.x,p.z)))return false;
            foreach(var island in Islands)if(Vector2.Distance(new Vector2(p.x,p.z),new Vector2(island.Centre.x,island.Centre.z))<island.Radius)return false;
            if(Mathf.Abs(p.x)<14&&p.z<640||Mathf.Abs(p.x-192)<14&&p.z<640)return false;
            if(p.x>=64&&p.x<=192&&Mathf.Abs(p.z-704)<14)return false;
            if(p.x<-205&&p.z<240||p.x>80&&p.x<124&&p.z<230)return false;
            return true;
        }
        static void Destination(Transform parent,string name,Vector3 p,string kind="landmark")
        {
            var root=new GameObject(name).transform;root.SetParent(parent,false);root.localPosition=p;
            var f=root.gameObject.AddComponent<WorldFacility>();f.Name=name;f.Kind=kind;f.Door=root.position;f.Action="Read information";f.Description="Explore "+name+". Use the regional map to travel between destinations.";CityServices.Instance.Places.Add(f);
            var sign=WorldShapes.Material("Destination sign",new Color(.08f,.22f,.29f));
            WorldShapes.Box(root,"Information sign post",new Vector3(.08f,2,.08f),new Vector3(3,1,0),sign,true);
            WorldShapes.Box(root,"Information sign panel",new Vector3(3.8f,.6f,.12f),new Vector3(3,2,0),sign);
            WorldShapes.Label(root,name,new Vector3(3,2,-.065f),.045f);
        }
        public static void Build(Transform scenery,Transform moving,Material road,Material paving,Material grass)
        {
            Destination(scenery,"Ashford city centre",new Vector3(32,.3f,16));
            District(scenery,moving,"Riverside",Districts[0],new[]{"Police Station","Hospital","School","Market","Estate Reception"},new[]{"police","hospital","school","market","townhall"},road,paving,grass);
            District(scenery,moving,"Ashford Capital",Districts[1],new[]{"Capitol","Government Offices","Supermarket","Clinic","School","Police Reception","Community Market","Community Centre","Presidential Residence","Nine-storey Space Centre"},new[]{"townhall","townhall","market","hospital","school","police","market","community","townhall","space"},road,paving,grass);
            District(scenery,moving,"Poison Land",Districts[2],new[]{"Police Station","Venom Refinery","Toxic Waste Vault","Great Venom Sovereign","Industrial Safety Office"},new[]{"police","industrial","industrial","industrial","office"},road,paving,grass);
            District(scenery,moving,"Northhaven",Districts[3],new[]{"Hospital","Police Station","Fire Station","School","City Hall","Bank","Supermarket","Post Office","Library","Community Centre","Water and Power Office","Health Centre","Market"},new[]{"hospital","police","fire","school","townhall","bank","market","office","library","community","utility","hospital","market"},road,paving,grass);
            Connect(scenery,new Vector3(0,0,192),new Vector3(0,0,640),road,paving,true);
            Connect(scenery,new Vector3(192,0,192),new Vector3(192,0,640),road,paving,true);
            Connect(scenery,new Vector3(64,0,704),new Vector3(192,0,704),road,paving,true);
            Connect(scenery,new Vector3(192,0,192),new Vector3(576,0,192),road,paving,false);
            Connect(scenery,new Vector3(192,0,-64),new Vector3(960,0,-64),road,paving,false);
            Connect(scenery,new Vector3(-192,0,64),new Vector3(-640,0,64),road,paving,false);
            Ocean(scenery);
            var sand=WorldShapes.Material("Coastal sand",new Color(.74f,.67f,.47f));
            foreach(var island in Islands)
            {
                var root=new GameObject(island.Name).transform;root.SetParent(scenery,false);root.position=island.Centre;
                var ground=SmoothShapes.Part(root,"Island shore",SmoothShapes.Tube,new Vector3(island.Radius*2,.32f,island.Radius*2),Vector3.zero,island.Name=="Ember Island"?WorldShapes.Material("Volcanic rock",new Color(.23f,.22f,.2f)):sand,true);ground.AddComponent<MeshCollider>().sharedMesh=ground.GetComponent<MeshFilter>().sharedMesh;
                WorldShapes.Box(root,"Island jetty",new Vector3(3,.24f,12),new Vector3(0,.12f,-island.Radius),paving,true);
                Destination(root,island.Name,new Vector3(0,.35f,-island.Radius+5));
                for(int n=0;n<5;n++){float a=n*Mathf.PI*.4f;WorldShapes.Tree(root,new Vector3(Mathf.Cos(a)*island.Radius*.5f,.32f,Mathf.Sin(a)*island.Radius*.5f));}
                if(island.Name=="Boneharrow Island")
                {for(int n=0;n<3;n++)NeighbourhoodArchitecture.House(root,new Vector3((n-1)*12,.32f,5));Destination(root,"Ghost Town",new Vector3(0,.35f,-5));CivicArchitecture.Build(root,island.Centre+new Vector3(0,.32f,20),"crypt","The Bone Crypt");}
                if(island.Name=="Ember Island")
                {
                    var cone=SmoothShapes.Profile("Volcano cone",new[]{new Vector2(17,0),new Vector2(6,18)} ,24);
                    var volcano=SmoothShapes.Part(root,"Volcano",cone,Vector3.one,new Vector3(0,.32f,6),WorldShapes.Material("Lava stone",new Color(.28f,.23f,.2f)),true);volcano.AddComponent<MeshCollider>().sharedMesh=cone;
                    SmoothShapes.Part(root,"Lava crater",SmoothShapes.Tube,new Vector3(11.8f,.08f,11.8f),new Vector3(0,18.35f,6),WorldShapes.Material("Lava",new Color(1,.24f,.02f)),true);
                }
            }
            Highlands(scenery,grass);
            WildlifeSpawner.SpawnHighlandWolves(scenery);
            Dock(scenery,"Ashford Harbour",new Vector3(100,0,210),paving);
            Dock(scenery,"Navy and submarine dock",new Vector3(-235,0,226),paving);
            CivicArchitecture.Build(scenery,new Vector3(470,0,-96),"construction","Ashford Construction");
            CivicArchitecture.Build(scenery,new Vector3(590,0,-96),"market","Ashford Supermarket East");
            CivicArchitecture.Build(scenery,new Vector3(625,0,55),"market","Ashford Galleria");
            CivicArchitecture.Build(scenery,new Vector3(430,0,62),"military","Military Visitor Reception");
            CivicArchitecture.Build(scenery,new Vector3(-718,0,80),"airport","Airport Arrivals and Baggage");
            CivicArchitecture.Build(scenery,new Vector3(-665,0,-115),"airport","Aircraft Maintenance");
            for(int n=0;n<3;n++)CivicArchitecture.Build(scenery,new Vector3(449+n*27,0,108),"military","Military Barracks "+(n+1));
            Destination(scenery,"Rocket launch pad",new Vector3(452,.3f,950));
            var rocket=SmoothShapes.Part(scenery,"Launch rocket",SmoothShapes.Tube,new Vector3(4,18,4),new Vector3(452,1,955),paving,true);rocket.AddComponent<MeshCollider>().sharedMesh=rocket.GetComponent<MeshFilter>().sharedMesh;
            WorldShapes.Box(scenery,"Launch tower",new Vector3(2,26,2),new Vector3(458,13,955),paving,true);
            new GameObject("Ocean ferry").AddComponent<FerryService>().Build(moving,paving);
            var exterior=new GameObject("Strategic facility exterior").transform;
            var baseGround=new Vector3(9000,0,9000);WorldShapes.Box(exterior,"Strategic facility ground",new Vector3(360,.3f,360),baseGround,grass,true);
            CivicArchitecture.Build(exterior,baseGround+new Vector3(0,.15f,-80),"military","Strategic Missile Storage");
            for(int n=0;n<6;n++){var p=baseGround+new Vector3(-100+n*40,.3f,30);var missile=SmoothShapes.Part(exterior,"Stored strategic missile",SmoothShapes.Tube,new Vector3(2.4f,15,2.4f),p,paving,true);missile.AddComponent<MeshCollider>().sharedMesh=missile.GetComponent<MeshFilter>().sharedMesh;}
            WildlifeSpawner.SpawnMilitaryGuards(scenery);
        }
        static void District(Transform scenery,Transform moving,string name,Rect bounds,string[] names,string[] kinds,Material road,Material paving,Material grass)
        {
            var root=new GameObject(name+" district").transform;root.SetParent(scenery,false);int nx=Mathf.RoundToInt(bounds.width/64),nz=Mathf.RoundToInt(bounds.height/64);
            for(int x=0;x<=nx;x++)WorldShapes.Box(root,"Avenue",new Vector3(28,.08f,bounds.height+28),new Vector3(bounds.x+x*64,.005f,bounds.center.y),road,true);
            for(int z=0;z<=nz;z++)WorldShapes.Box(root,"Street",new Vector3(bounds.width+28,.08f,28),new Vector3(bounds.center.x,.01f,bounds.y+z*64),road,true);
            for(int x=0;x<=nx;x++)for(int z=0;z<=nz;z++)
            {
                var p=new Vector3(bounds.x+x*64,0,bounds.y+z*64);var j=new Junction{Position=p};RoadNetwork.Instance.Junctions.Add(j);StreetSignalModels.Create(root,j);
                var paint=WorldShapes.Material("Regional road paint",new Color(.9f,.89f,.8f));
                foreach(int side in new[]{-1,1})for(float stripe=-13;stripe<=13;stripe+=1.1f)
                {WorldShapes.Box(root,"Zebra",new Vector3(2.6f,.015f,.52f),p+new Vector3(side*18,.064f,stripe),paint);WorldShapes.Box(root,"Zebra",new Vector3(.52f,.015f,2.6f),p+new Vector3(stripe,.065f,side*18),paint);}
                foreach(int side in new[]{-1,1}){WorldShapes.Box(root,"Car stop line",new Vector3(.18f,.015f,4.8f),p+new Vector3(side*20.5f,.066f,side*7.4f),paint);WorldShapes.Box(root,"Car stop line",new Vector3(4.8f,.015f,.18f),p+new Vector3(-side*7.4f,.066f,side*20.5f),paint);}
            }
            int plot=0;
            for(int x=0;x<nx;x++)for(int z=0;z<nz;z++,plot++)
            {
                var p=new Vector3(bounds.x+x*64+32,0,bounds.y+z*64+32);WorldShapes.Box(root,"Pavement",new Vector3(36,.18f,36),p+Vector3.up*.09f,paving,true);
                if(plot<names.Length)
                {
                    CivicArchitecture.Build(root,p,kinds[plot],name+" "+names[plot]);
                    if(kinds[plot]=="space")for(int floor=1;floor<9;floor++)
                    {
                        var level=p+Vector3.up*(floor*4);WorldShapes.Box(root,"Space centre floor "+(floor+1),new Vector3(22,.18f,18),level+Vector3.up*.2f,paving,true);
                        foreach(int side in new[]{-1,1}){WorldShapes.Box(root,"Space centre wall",new Vector3(.3f,3.8f,18),level+new Vector3(side*11,2,0),paving,true);WorldShapes.Box(root,"Space centre wall",new Vector3(22,3.8f,.3f),level+new Vector3(0,2,side*9),paving,true);}
                        for(int desk=0;desk<4;desk++)WorldShapes.Box(root,"Laboratory workstation",new Vector3(3,.9f,1.3f),level+new Vector3((desk%2==0?-5:5),.65f,desk<2?-3:3),paving,true);
                    }
                    if(kinds[plot]=="industrial"){WorldShapes.Box(root,"Refinery stack",new Vector3(2,18,2),p+new Vector3(6,9,5),paving,true);WorldShapes.Box(root,"Industrial tank",new Vector3(4,7,4),p+new Vector3(-6,3.7f,5),paving,true);}
                    if(names[plot]=="Capitol"){SmoothShapes.Part(root,"Capitol civic drum",SmoothShapes.Tube,new Vector3(10,3,10),p+new Vector3(0,4.3f,0),paving,true);SmoothShapes.Part(root,"Capitol crown",SmoothShapes.Profile("Hidrok Capitol crown",new[]{new Vector2(5,0),new Vector2(4.5f,1),new Vector2(3,2.5f),new Vector2(0,3.4f)},24),Vector3.one,p+new Vector3(0,7.3f,0),paving,true);}
                }
                else NeighbourhoodArchitecture.House(root,p);
                WorldShapes.Tree(root,p+new Vector3(12,.18f,12));
                WorldShapes.Box(root,"Lamp post",new Vector3(.09f,4.7f,.09f),p+new Vector3(17,2.53f,0),paving,true);
                WorldShapes.Box(root,"Lamp",new Vector3(.7f,.15f,.3f),p+new Vector3(17,4.85f,0),paving);
                foreach(int side in new[]{-1,1}){WorldShapes.Box(root,"Bicycle lane",new Vector3(23,.015f,1.6f),p+new Vector3(0,.067f,-32+side*11.8f),grass);WorldShapes.Box(root,"Bicycle lane",new Vector3(1.6f,.015f,23),p+new Vector3(-32+side*11.8f,.067f,0),grass);}
                for(int i=0;i<2;i++){var resident=WorldShapes.Person(moving,new Color(.3f+plot%3*.08f,.42f,.48f));var walker=resident.gameObject.AddComponent<CrossingWalker>();var c=p-new Vector3(32,0,32);walker.Waypoints=new[]{c+new Vector3(18,.2f,18),c+new Vector3(46,.2f,18),c+new Vector3(46,.2f,46),c+new Vector3(18,.2f,46)};resident.position=walker.Waypoints[i*2];}
            }
            var loop=new[]{new Vector3(bounds.x,0,bounds.y),new Vector3(bounds.xMax,0,bounds.y),new Vector3(bounds.xMax,0,bounds.yMax),new Vector3(bounds.x,0,bounds.yMax)};
            for(int n=0;n<4;n++)UnityNeighbourhood.SpawnVehicle(moving,n==0?"police":"car",loop,n,25,Color.white);
            Destination(root,name+" city centre",new Vector3(bounds.x+32,.3f,bounds.y+16));
        }
        static void Connect(Transform parent,Vector3 from,Vector3 to,Material road,Material paving,bool bridge)
        {
            var d=to-from;
            bool lift=bridge&&Mathf.Abs(d.z)>400;
            if(lift)
            {
                foreach(var span in new[]{new Vector2(from.z-14,244),new Vector2(276,to.z+14)})
                {
                    WorldShapes.Box(parent,"Bridge approach",new Vector3(28,LiftBridge.DeckThickness,span.y-span.x),new Vector3(from.x,LiftBridge.DeckCentreHeight,(span.x+span.y)*.5f),road,true);
                    foreach(int side in new[]{-1,1})WorldShapes.Box(parent,"Approach parapet",new Vector3(.18f,1.1f,span.y-span.x),new Vector3(from.x+side*14,.6f,(span.x+span.y)*.5f),paving,true);
                }
                LiftBridge.Build(parent,new Vector3(from.x,0,260),road,paving);
            }
            else WorldShapes.Box(parent,bridge?"Intercity bridge":"Intercity road",new Vector3(Mathf.Abs(d.x)+28,.08f,Mathf.Abs(d.z)+28),(from+to)*.5f+Vector3.up*.01f,road,true);
            int count=Mathf.RoundToInt(d.magnitude/64);var dir=d.normalized;
            for(int i=0;i<=count;i++){var p=from+dir*i*64;bool exists=false;foreach(var j in RoadNetwork.Instance.Junctions)if((j.Position-p).sqrMagnitude<1)exists=true;if(!exists)RoadNetwork.Instance.Junctions.Add(new Junction{Position=p});}
            if(bridge&&!lift)foreach(int side in new[]{-1,1})WorldShapes.Box(parent,"Bridge safety barrier",new Vector3(Mathf.Abs(d.x)+.18f,1.3f,Mathf.Abs(d.z)+.18f),(from+to)*.5f+LaneRoute.Right(dir)*side*14+Vector3.up*.65f,paving,true);
        }
        static void Ocean(Transform parent)
        {
            var water=WorldShapes.Material("Ocean",new Color(.08f,.39f,.53f),null,.8f);var mesh=new Mesh{name="Coastline ocean"};var vertices=new List<Vector3>();var triangles=new List<int>();
            for(int x=-300;x<300;x+=4)for(int z=208;z<900;z+=4)
            {
                var p=new Vector3(x+2,0,z+2);if(!IsWater(p))continue;
                int start=vertices.Count;vertices.AddRange(new[]{new Vector3(x,WaterLevel,z),new Vector3(x,WaterLevel,z+4),new Vector3(x+4,WaterLevel,z+4),new Vector3(x+4,WaterLevel,z)});triangles.AddRange(new[]{start,start+1,start+2,start,start+2,start+3});
            }
            mesh.indexFormat=UnityEngine.Rendering.IndexFormat.UInt32;mesh.SetVertices(vertices);mesh.SetTriangles(triangles,0);mesh.RecalculateNormals();mesh.RecalculateBounds();SmoothShapes.Part(parent,"Ocean",mesh,Vector3.one,Vector3.zero,water,true);
        }
        static void Highlands(Transform parent,Material grass)
        {
            var rock=WorldShapes.Material("Highland rock",new Color(.4f,.4f,.35f));var cone=SmoothShapes.Profile("Mountain slope",new[]{new Vector2(1,0),new Vector2(0,1)},16);
            for(int n=0;n<14;n++){var p=new Vector3(-350-n%4*45,0,620+n/4*85);var go=SmoothShapes.Part(parent,"Highland mountain",cone,new Vector3(60,32+n%3*8,60),p,rock,true);go.AddComponent<MeshCollider>().sharedMesh=cone;}
            for(int n=0;n<180;n++)WorldShapes.Tree(parent,new Vector3(-530+n%15*15,0,580+n/15*27));
            Destination(parent,"Ashford Highlands",new Vector3(-310,.3f,660));
            string[] names={"Crystal Hollow","Deepstone Cavern","Forgotten Mine"};Vector3[] sites={new Vector3(-620,0,700),new Vector3(-650,0,860),new Vector3(-720,0,760)};
            for(int n=0;n<3;n++)CivicArchitecture.Build(parent,sites[n],"cave",names[n]);
        }
        static void Dock(Transform parent,string name,Vector3 p,Material paving)
        {
            WorldShapes.Box(parent,name,new Vector3(40,.45f,30),p,paving,true);Destination(parent,name,p+new Vector3(0,.5f,-8));
            var hull=WorldShapes.Material("Ship hull",new Color(.18f,.28f,.31f));WorldShapes.Box(parent,"Moored vessel",new Vector3(9,3,30),p+new Vector3(26,1.5f,12),hull,true);WorldShapes.Box(parent,"Wheelhouse",new Vector3(6,3,8),p+new Vector3(26,4.5f,10),paving,true);
        }
    }
}
