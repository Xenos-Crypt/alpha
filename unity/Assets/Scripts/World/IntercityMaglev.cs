using UnityEngine;
namespace AnotherWorld.World
{
    public sealed class IntercityMaglev : MonoBehaviour
    {
        public static IntercityMaglev Instance { get; private set; }
        readonly float[] stations={-128,448,1088};int station,direction=1;float dwell=12;
        public bool DoorsOpen=>dwell>0;
        public Vector3 BoardingPoint=>new Vector3(stations[station],6.55f,-516);
        void Awake(){Instance=this;}
        void OnDestroy(){if(Instance==this)Instance=null;}
        void Update()
        {
            if(dwell>0){dwell-=Time.deltaTime;return;}
            int next=station+direction;
            float distance=Mathf.Abs(stations[next]-transform.position.x);
            transform.position=Vector3.MoveTowards(transform.position,new Vector3(stations[next],6,-520),Mathf.Min(14,Mathf.Sqrt(distance*3))*Time.deltaTime);
            if(distance<.05f){station=next;dwell=12;if(station==0)direction=1;else if(station==stations.Length-1)direction=-1;}
        }
        public static void Build(Transform scenery,Transform moving)
        {
            var metal=WorldShapes.Material("Maglev viaduct",new Color(.31f,.4f,.44f),null,.6f);
            var glow=WorldShapes.Material("Maglev guide light",new Color(.02f,.8f,1));
            WorldShapes.Box(scenery,"Elevated magnetic guideway",new Vector3(1236,.35f,3.3f),new Vector3(480,5.7f,-520),metal,true);
            foreach(int side in new[]{-1,1})WorldShapes.Box(scenery,"Magnetic guide strip",new Vector3(1236,.06f,.14f),new Vector3(480,5.95f,-520+side*1.2f),glow);
            for(int x=-128;x<=1088;x+=64)WorldShapes.Box(scenery,"Viaduct pier",new Vector3(.8f,5.5f,1.4f),new Vector3(x,2.75f,-520),metal,true);
            var root=new GameObject("Public intercity maglev train").transform;root.SetParent(moving,false);root.position=new Vector3(-128,6,-520);
            for(int n=-1;n<=1;n++)
            {
                var carriage=new GameObject("Pearl elevated maglev carriage").transform;carriage.SetParent(root,false);carriage.localPosition=new Vector3(n*9.4f,0,0);carriage.localRotation=Quaternion.Euler(0,90,0);TransportDesign.Rail(carriage,9,2.7f,2.1f,true);
                WorldShapes.Box(root,"Train collision hull",new Vector3(9,2.6f,2.7f),new Vector3(n*9.4f,1.6f,0),metal,true,false).GetComponent<Renderer>().enabled=false;
            }
            root.gameObject.AddComponent<IntercityMaglev>();
            foreach(int side in new[]{-1,1})WorldShapes.Box(root,"Flexible inter-car gangway",new Vector3(.55f,1.7f,1.45f),new Vector3(side*4.7f,1.38f,0),TransportDesign.Graphite,false,false);
            string[] names={"Ashford Maglev Station","Capital Maglev Station","Northhaven Maglev Station"};float[] stops={-128,448,1088};
            for(int i=0;i<stops.Length;i++)
            {
                var p=new Vector3(stops[i],0,-516);var station=new GameObject(names[i]).transform;station.SetParent(scenery,false);station.position=p;
                WorldShapes.Box(station,"Raised station platform",new Vector3(40,.3f,3),new Vector3(0,6.2f,0),metal,true);
                WorldShapes.Box(station,"Station canopy",new Vector3(36,.15f,3.6f),new Vector3(0,9.3f,0),metal);
                foreach(int side in new[]{-1,1})WorldShapes.Box(station,"Station column",new Vector3(.2f,9,.2f),new Vector3(side*16,4.5f,1.3f),metal,true);
                WorldShapes.Box(station,"Station lift",new Vector3(3,6.4f,3),new Vector3(18,3.2f,4),metal,true);
                WorldShapes.Label(station,names[i].ToUpperInvariant()+" / E LIFT",new Vector3(0,2,2),.1f,false);
                var place=station.gameObject.AddComponent<WorldFacility>();place.Name=names[i];place.Kind="rail";place.Door=p+new Vector3(14,.3f,4);place.Action="Use platform lift";place.Description="Public elevated maglev. Use lift, then E near the stopped train. Trains cannot be stolen.";CityServices.Instance.Places.Add(place);
            }
        }
    }
}

