using UnityEngine;
namespace AnotherWorld.World
{
    public sealed class FerryService : MonoBehaviour
    {
        public static FerryService Instance { get; private set; }
        public Transform Vessel;
        readonly Vector3[] route={new Vector3(128,0,226),new Vector3(128,0,260),new Vector3(-220,0,260),new Vector3(-220,0,464)};
        int target=1,direction=1;float dwell=10;
        public const float CruiseSpeed=3.5f;
        public float Speed { get; private set; }
        public bool DoorsOpen=>dwell>0;
        public Vector3 BoardingPoint=>direction>0?new Vector3(115,.5f,220):new Vector3(-220,.35f,477);
        void Awake(){Instance=this;}
        void OnDestroy(){if(Instance==this)Instance=null;}
        public void Build(Transform parent,Material trim)
        {
            Vessel=new GameObject("Driftwood passenger ferry").transform;Vessel.SetParent(parent,false);Vessel.position=route[0];
            var hull=WorldShapes.Material("Ferry blue",new Color(.12f,.28f,.4f));
            TransportDesign.Marine(Vessel);
            var collision=Vessel.gameObject.AddComponent<BoxCollider>();collision.size=new Vector3(7,1.2f,15);collision.center=Vector3.up*.6f;
            WorldShapes.Box(Vessel,"Passenger deck",new Vector3(6.4f,.15f,14),Vector3.up*1.3f,trim,true,false);

            var cabin=Vessel.gameObject.AddComponent<BoxCollider>();cabin.size=new Vector3(5,2.1f,5);cabin.center=new Vector3(0,2.4f,3);

            foreach(int side in new[]{-1,1})WorldShapes.Box(Vessel,"Marine cyan waterline",new Vector3(.045f,.09f,11.2f),new Vector3(side*3.45f,.65f,0),TransportDesign.Cyan,false,false);
        }
        void Update()
        {
            if(!Vessel)return;if(dwell>0){Speed=0;dwell-=Time.deltaTime;return;}
            var delta=route[target]-Vessel.position;
            bool clear=LiftBridge.PermitShip(Vessel.position,delta.normalized);
            float desired=clear?Mathf.Min(CruiseSpeed,Mathf.Sqrt(delta.magnitude*1.4f)):0;
            Speed=Mathf.MoveTowards(Speed,desired,Time.deltaTime*.7f);
            float travel=clear?Mathf.Min(delta.magnitude,Speed*Time.deltaTime):0;
            if(delta.sqrMagnitude>.001f){Vessel.position+=delta.normalized*travel;Vessel.rotation=Quaternion.RotateTowards(Vessel.rotation,Quaternion.LookRotation(delta),60*Time.deltaTime);}
            if(Vector3.Distance(Vessel.position,route[target])<.05f)
            {
                if(target==route.Length-1){direction=-1;dwell=12;}else if(target==0){direction=1;dwell=12;}
                target+=direction;
            }
        }
    }
}

