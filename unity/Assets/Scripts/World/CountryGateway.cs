using UnityEngine;
namespace AnotherWorld.World
{
    public static class CountryGateway
    {
        // Compact playable interpretation of the National Mall's east/west sequence, not a full USA map.
        // Reference: https://www.nps.gov/nama/index.htm and /nama/planyourvisit/maps.htm
        public static Transform Build()
        {
            var root=new GameObject("USA - Washington DC arrival district").transform;root.position=GovernmentTeleport.UsaOrigin;
            var grass=WorldShapes.Material("Washington lawns",new Color(.31f,.45f,.24f));var stone=WorldShapes.Material("Washington limestone",new Color(.84f,.82f,.72f),null,.3f);
            var path=WorldShapes.Material("Washington gravel paths",new Color(.68f,.66f,.55f));var road=WorldShapes.Material("Washington asphalt",new Color(.16f,.18f,.19f));
            WorldShapes.Box(root,"USA district terrain",new Vector3(1400,.2f,1000),Vector3.down*.1f,grass,true);
            foreach(int side in new[]{-1,1})
            {
                WorldShapes.Box(root,"District park boundary",new Vector3(1380,2.4f,2),new Vector3(0,1.2f,side*490),grass,true);
                WorldShapes.Box(root,"District park boundary",new Vector3(2,2.4f,980),new Vector3(side*690,1.2f,0),grass,true);
            }
            WorldShapes.Box(root,"National Mall promenade",new Vector3(840,.04f,12),new Vector3(0,.025f,0),path,true);
            foreach(int side in new[]{-1,1})
            {
                WorldShapes.Box(root,side>0?"Constitution Avenue":"Independence Avenue",new Vector3(1000,.04f,18),new Vector3(0,.025f,side*90),road,true);
                WorldShapes.Box(root,"Mall pedestrian path",new Vector3(960,.04f,5),new Vector3(0,.03f,side*72),path,true);
                for(int n=0;n<30;n++)WorldShapes.Tree(root,new Vector3(-440+n*30,0,side*60));
            }
            var needle=SmoothShapes.Profile("Washington obelisk",new[]{new Vector2(0,0),new Vector2(3.4f,0),new Vector2(2.6f,37),new Vector2(0,42)},4);
            var monument=SmoothShapes.Part(root,"Washington Monument",needle,Vector3.one,new Vector3(-100,0,0),stone,true);monument.AddComponent<MeshCollider>().sharedMesh=needle;
            Landmark(root,"Washington Monument",new Vector3(-100,.3f,-12),"An abbreviated landmark model on the National Mall.");
            WorldShapes.Box(root,"Lincoln Reflecting Pool",new Vector3(180,.03f,22),new Vector3(-280,.06f,0),WorldShapes.Material("Reflecting pool water",new Color(.16f,.4f,.48f),null,.85f));
            ClassicBuilding(root,new Vector3(-420,0,0),"Lincoln Memorial",stone,36,24,false);
            ClassicBuilding(root,new Vector3(420,0,-12),"United States Capitol",stone,70,40,true);
            ClassicBuilding(root,new Vector3(-100,0,230),"White House",stone,38,23,false);
            for(int n=0;n<8;n++)
            {
                var p=new Vector3(-40+n%4*110,0,n<4?135:-135);ClassicBuilding(root,p,n==0?"National Mall visitor centre":"Washington museum block "+n,stone,46,25,false);
            }
            WorldShapes.Box(root,"Visitor arrival plaza",new Vector3(44,.1f,30),new Vector3(-100,.05f,-55),path,true);
            WorldShapes.Box(root,"Visitor connection",new Vector3(5,.04f,55),new Vector3(-100,.035f,-27.5f),path,true);
            WorldShapes.Label(root,"WASHINGTON, D.C. / UNITED STATES",new Vector3(-100,3,-75),.18f);
            for(int n=0;n<36;n++)
            {
                var person=WorldShapes.Person(root,new Color(.22f+(n%3)*.16f,.34f,.45f));var p=new Vector3(-350+n%12*60,.15f,n<12?8:n<24?-72:72);person.localPosition=p;
                person.gameObject.AddComponent<Traffic.CrossingWalker>().Waypoints=new[]{root.position+p,root.position+p+Vector3.right*24};
            }
            var statics=new System.Collections.Generic.List<GameObject>();foreach(var renderer in root.GetComponentsInChildren<MeshRenderer>())if(renderer.gameObject.isStatic&&renderer.enabled)statics.Add(renderer.gameObject);
            StaticBatchingUtility.Combine(statics.ToArray(),root.gameObject);return root;
        }
        static void ClassicBuilding(Transform parent,Vector3 p,string name,Material stone,float width,float depth,bool dome)
        {
            var root=new GameObject(name).transform;root.SetParent(parent,false);root.localPosition=p;
            WorldShapes.Box(root,"Classical building mass",new Vector3(width,8,depth),Vector3.up*4,stone,true);
            WorldShapes.Box(root,"Entablature",new Vector3(width+2,.6f,depth+2),new Vector3(0,8.2f,0),stone,true);
            for(int n=0;n<10;n++)SmoothShapes.Part(root,"Portico column",SmoothShapes.Tube,new Vector3(.9f,6,.9f),new Vector3(-width*.45f+n*width*.1f,1,-depth*.5f-2),stone,true);
            var glass=WorldShapes.Material("American window glass",new Color(.15f,.24f,.29f),null,.7f);
            for(int n=0;n<12;n++)WorldShapes.Box(root,"Tall window",new Vector3(1.1f,2,.06f),new Vector3(-width*.44f+n*width*.08f,4,-depth*.5f-.04f),glass);
            if(dome)
            {
                SmoothShapes.Part(root,"Capitol drum",SmoothShapes.Tube,new Vector3(13,7,13),Vector3.up*8.5f,stone,true);
                SmoothShapes.Part(root,"Capitol dome",SmoothShapes.Profile("USA Capitol hemisphere",new[]{new Vector2(6.5f,0),new Vector2(6,2),new Vector2(4.8f,4),new Vector2(3,5.5f),new Vector2(0,6)},32),Vector3.one,Vector3.up*15.5f,stone,true);
                SmoothShapes.Part(root,"Capitol lantern",SmoothShapes.Tube,new Vector3(1.2f,3,1.2f),Vector3.up*21,stone,true);
            }
            WorldShapes.Label(root,name.ToUpperInvariant(),new Vector3(0,9,-depth*.5f-2),.16f);Landmark(parent,name,p+new Vector3(0,.3f,-depth*.5f-6),"Washington, D.C. - compact landmark district. Full nationwide geography is not yet built.");
        }
        static void Landmark(Transform parent,string name,Vector3 position,string description)
        {
            var go=new GameObject(name+" visitor marker").transform;go.SetParent(parent,false);go.localPosition=position;
            var place=go.gameObject.AddComponent<WorldFacility>();place.Name=name;place.Kind="usa";place.Door=go.position;place.Description=description;place.Action="Explore landmark";CityServices.Instance.Places.Add(place);
        }
    }
}
