using UnityEngine;
using AnotherWorld.Traffic;
namespace AnotherWorld.World
{
    public static class TransitStops
    {
        public static readonly Vector3[] BusRoute={new Vector3(-128,0,-64),new Vector3(128,0,-64),new Vector3(128,0,64),new Vector3(-128,0,64)};
        public static readonly string[] BusNames={"School","Hospital","Supermarket","Civic square"};
        public static Vector3[] BusBays()
        {
            var stops=new Vector3[BusRoute.Length];
            for(int i=0;i<stops.Length;i++){var dir=(BusRoute[(i+1)%stops.Length]-BusRoute[i]).normalized;stops[i]=BusRoute[i]+dir*32+LaneRoute.Right(dir)*15.4f;}
            return stops;
        }
        public static void BuildBusStops(Transform parent)
        {
            var stops=BusBays();var paint=WorldShapes.Material("Bus stop yellow",new Color(.88f,.68f,.14f));var glass=WorldShapes.Material("Shelter glass",new Color(.36f,.5f,.52f),null,.6f);var paving=WorldShapes.Material("Stop paving",Color.white,"paving");
            for(int i=0;i<stops.Length;i++)
            {
                var direction=(BusRoute[(i+1)%stops.Length]-BusRoute[i]).normalized;var right=LaneRoute.Right(direction);
                var root=new GameObject(BusNames[i]+" bus stop").transform;root.SetParent(parent,false);root.position=stops[i];root.rotation=Quaternion.LookRotation(direction);
                WorldShapes.Box(root,"Recessed bus bay",new Vector3(9.8f,.04f,36),new Vector3(0,.04f,0),WorldShapes.Material("Bay asphalt",Color.white,"asphalt"));
                WorldShapes.Box(root,"Boarding footway",new Vector3(2.4f,.18f,14),new Vector3(6.6f,.09f,0),paving,true);
                WorldShapes.Box(root,"Shelter roof",new Vector3(2,.13f,7),new Vector3(6,2.8f,0),paint);
                WorldShapes.Box(root,"Shelter screen",new Vector3(.07f,2.4f,7),new Vector3(7,1.5f,0),glass);
                foreach(int s in new[]{-1,1})WorldShapes.Box(root,"Shelter support",new Vector3(.09f,2.6f,.09f),new Vector3(5,1.5f,s*3),paint);
                WorldShapes.Box(root,"Bench",new Vector3(.55f,.6f,3),new Vector3(7.2f,.55f,0),paving,true);
                WorldShapes.Box(root,"Stop sign post",new Vector3(.09f,3,.09f),new Vector3(5.2f,1.6f,5),paint);
                WorldShapes.Label(root,"BUS 01 — "+BusNames[i],new Vector3(5.1f,2.85f,5.06f),.075f,false);
            }
        }
        public static void Pavement(Transform parent,Vector3 centre,Material paving)
        {
            foreach(var bay in BusBays())
            {
                var d=bay-centre;if(Mathf.Abs(d.x)>19||Mathf.Abs(d.z)>19)continue;
                bool x=Mathf.Abs(d.x)>Mathf.Abs(d.z);float sign=Mathf.Sign(x?d.x:d.z);
                WorldShapes.Box(parent,"Pavement behind bus bay",x?new Vector3(29.2f,.18f,36):new Vector3(36,.18f,29.2f),centre+new Vector3(x?-sign*3.4f:0,.09f,x?0:-sign*3.4f),paving,true);
                // Keep the full block-length opening clear for the bus overhang during docking.
                return;
            }
            WorldShapes.Box(parent,"Pavement block",new Vector3(36,.18f,36),centre+Vector3.up*.09f,paving,true);
        }
    }
}
