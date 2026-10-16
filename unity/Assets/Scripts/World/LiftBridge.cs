using System.Collections.Generic;
using UnityEngine;
using AnotherWorld.Traffic;

namespace AnotherWorld.World
{
    // The road and shipping channel share one reservation. Closing the road never traps a vehicle on the span.
    public sealed class LiftBridge : MonoBehaviour
    {
        static readonly List<LiftBridge> bridges=new List<LiftBridge>();
        Transform deck; Renderer[] lamps; readonly List<GameObject> gates=new List<GameObject>();
        Material red,green;
        float holdUntil,height;
        public const float DeckThickness=.24f,DeckCentreHeight=-.07f;
        public bool RoadClosed=>Time.time<holdUntil||height>.01f;
        public bool ShipClear=>height>=11.9f;
        [System.Serializable] sealed class DeckReport {public float Height,DeckTop,WaterTop;public bool RoadClosed;}
        public void ReportClearance()
        {
            Debug.Log("HIDROK_BRIDGE:"+JsonUtility.ToJson(new DeckReport{Height=height,DeckTop=deck.Find("Lift deck").GetComponent<BoxCollider>().bounds.max.y,WaterTop=transform.Find("Shipping channel water").GetComponent<Renderer>().bounds.max.y,RoadClosed=RoadClosed}));
        }
        void Awake(){bridges.Add(this);}
        void OnDestroy(){bridges.Remove(this);}
        public static LiftBridge Build(Transform parent,Vector3 centre,Material road,Material trim)
        {
            var root=new GameObject(centre.x<1?"Ashford shipping lift bridge":"Capital shipping lift bridge").transform;root.SetParent(GameObject.Find("Moving road users").transform,false);root.position=centre;
            var b=root.gameObject.AddComponent<LiftBridge>();
            b.deck=new GameObject("Moving bridge span").transform;b.deck.SetParent(root,false);
            WorldShapes.Box(b.deck,"Lift deck",new Vector3(28,DeckThickness,32),Vector3.up*DeckCentreHeight,road,true,false);
            foreach(int side in new[]{-1,1})WorldShapes.Box(b.deck,"Moving parapet",new Vector3(.18f,1.1f,32),new Vector3(side*14,.6f,0),trim,true,false);
            b.red=WorldShapes.Material("Bridge closed",new Color(1,.08f,.02f));b.green=WorldShapes.Material("Bridge open",new Color(.05f,1,.4f));
            WorldShapes.Box(root,"Shipping channel water",new Vector3(28,.025f,32),new Vector3(0,WorldGeography.WaterLevel-.0125f,0),WorldShapes.Material("Ocean",new Color(.08f,.39f,.53f),null,.8f),false,false);
            foreach(int side in new[]{-1,1})
            {
                var gate=WorldShapes.Box(root,"Closed bridge barrier",new Vector3(28,1.3f,.18f),new Vector3(0,.8f,side*21),b.red,true,false);gate.SetActive(false);b.gates.Add(gate);
            }
            var lights=new List<Renderer>();
            foreach(int z in new[]{-1,1})foreach(int x in new[]{-1,1})
            {
                WorldShapes.Box(root,"Lift tower",new Vector3(.7f,15,.7f),new Vector3(x*14.8f,7.5f,z*16.8f),trim,true);
                var lamp=WorldShapes.Sphere(root,"Bridge road signal",new Vector3(.45f,.45f,.45f),new Vector3(x*14.8f,3,z*19),b.green,false);lights.Add(lamp.GetComponent<Renderer>());
                WorldShapes.Label(root,"LIFT BRIDGE / STOP ON RED",new Vector3(x*15,4,z*20),.08f,z<0);
            }
            var place=root.gameObject.AddComponent<WorldFacility>();place.Name=centre.x<1?"Ashford lift bridge":"Capital lift bridge";place.Kind="landmark";place.Door=centre+new Vector3(10,.3f,-28);place.Action="Observe bridge";place.Description="The road deck lifts for ships. Wait behind the barriers while the road signals show red.";CityServices.Instance.Places.Add(place);
            b.lamps=lights.ToArray();return b;
        }
        bool Occupied()
        {
            foreach(var v in RoadNetwork.Instance.Vehicles)
            {var d=v.transform.position-transform.position;if(Mathf.Abs(d.x)<16&&Mathf.Abs(d.z)<18+v.Length*.5f)return true;}
            var p=RoadNetwork.Instance.Player;if(p){var d=p.position-transform.position;if(Mathf.Abs(d.x)<16&&Mathf.Abs(d.z)<19)return true;}
            return false;
        }
        void Update()
        {
            bool request=Time.time<holdUntil;
            if(!request||!Occupied())height=Mathf.MoveTowards(height,request?12:0,Time.deltaTime*2);
            deck.localPosition=Vector3.up*height;
            foreach(var gate in gates)gate.SetActive(height>.01f);
            foreach(var lamp in lamps)lamp.sharedMaterial=RoadClosed?red:green;
        }
        public static bool PermitShip(Vector3 position,Vector3 direction)
        {
            bool clear=true;
            foreach(var b in bridges)
            {
                var d=b.transform.position-position;
                if(Mathf.Abs(d.z)>12||Mathf.Abs(direction.x)<.8f||Mathf.Abs(d.x)>80)continue;
                // Keep the reservation until the entire stern is safely clear, in either direction.
                b.holdUntil=Time.time+2;
                float ahead=Vector3.Dot(d,direction);
                if(ahead>-25&&ahead<35&&!b.ShipClear)clear=false;
            }
            return clear;
        }
        public static float LimitRoad(Vector3 position,Vector3 direction,float requested,float length)
        {
            foreach(var b in bridges)
            {
                if(!b.RoadClosed||Mathf.Abs(position.x-b.transform.position.x)>15||Mathf.Abs(direction.z)<.5f)continue;
                float d=(b.transform.position.z-position.z)*Mathf.Sign(direction.z);
                // Traffic already inside clears the span before it can lift.
                if(d<19+length*.5f)continue;
                requested=Mathf.Min(requested,Mathf.Max(0,d-21-length*.5f));
            }
            return requested;
        }
    }
}
