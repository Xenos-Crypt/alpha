using System.Collections.Generic;
using UnityEngine;
namespace AnotherWorld.Traffic
{
    [DefaultExecutionOrder(-100)]
    public sealed class RoadNetwork : MonoBehaviour
    {
        public readonly List<Junction> Junctions=new List<Junction>();
        public readonly List<TrafficVehicle> Vehicles=new List<TrafficVehicle>();
        public readonly List<CrossingWalker> Walkers=new List<CrossingWalker>();
        public readonly List<CrossingButton> Buttons=new List<CrossingButton>();
        public TramService Tram;
        public Transform Player;
        public static RoadNetwork Instance { get; private set; }
        void Awake(){Instance=this;}
        void OnDestroy(){if(Instance==this)Instance=null;}
        public static TravelAxis Axis(Vector3 d)=>Mathf.Abs(d.x)>Mathf.Abs(d.z)?TravelAxis.X:TravelAxis.Z;
        public static bool OnZebra(Vector3 p,Vector3 j)
        {var d=p-j;float a=Mathf.Abs(d.x),b=Mathf.Abs(d.z);return a<=TrafficRules.CrossingOffset&&b>=16.7f&&b<=19.3f||b<=TrafficRules.CrossingOffset&&a>=16.7f&&a<=19.3f;}
        void Update()
        {
            foreach(var j in Junctions)
            {
                bool occupied=false,tram=false;var bicycles=CrossingDemand.None;
                foreach(var v in Vehicles)
                {
                    var p=v.transform.position-j.Position;
                    float clearanceExtent=TrafficRules.CrossingOffset+1.3f+v.Length*.5f+.3f;
                    occupied|=Mathf.Abs(p.x)<clearanceExtent&&Mathf.Abs(p.z)<clearanceExtent;
                    var axis=Axis(v.transform.forward);float ahead=Vector3.Dot(j.Position-v.transform.position,v.transform.forward);
                    float lateral=axis==TravelAxis.X?Mathf.Abs(p.z):Mathf.Abs(p.x);
                    if(v.User==RoadUser.Bicycle&&ahead>0&&ahead<34&&lateral<TrafficRules.RoadHalfWidth)
                        bicycles|=axis==TravelAxis.X?CrossingDemand.X:CrossingDemand.Z;
                }
                foreach(var w in Walkers)occupied|=OnZebra(w.transform.position,j.Position)&&InsideRoad(w.transform.position,j.Position);
                if(Player)occupied|=OnZebra(Player.position,j.Position)&&InsideRoad(Player.position,j.Position);
                if(Tram&&Mathf.Abs(Tram.transform.position.z-j.Position.z)<2)
                {
                    float ahead=(j.Position.x-Tram.transform.position.x)*Tram.Direction;
                    tram=!Tram.DoorsOpen&&ahead>-28.6f&&ahead<48;occupied|=Mathf.Abs(ahead)<28.6f;
                }
                j.Rules.Tick(Time.deltaTime,bicycles,tram,occupied);j.UpdateLamps();
            }
        }
        static bool InsideRoad(Vector3 p,Vector3 j)
        {var d=p-j;return Mathf.Min(Mathf.Abs(d.x),Mathf.Abs(d.z))<TrafficRules.RoadHalfWidth;}
        public void PressAtCorner(Vector3 position,TravelAxis axis)
        {
            foreach(var button in Buttons)if(button.Axis==axis&&Vector3.Distance(position,button.transform.position)<2.5f){button.Press();return;}
        }
        public CrossingButton NearestButton(Vector3 position)
        {
            CrossingButton best=null;float distance=3.3f;
            foreach(var button in Buttons){float d=Vector3.Distance(position,button.transform.position);if(d<distance){best=button;distance=d;}}
            return best;
        }
        public float Limit(Vector3 position,Vector3 direction,float requested,RoadUser user,float length,TrafficVehicle self=null,bool obeySignals=true)
        {
            var axis=Axis(direction);float sign=Mathf.Sign(axis==TravelAxis.X?direction.x:direction.z),allowed=requested;
            if(obeySignals)foreach(var j in Junctions)
            {
                var d=j.Position-position;float lateral=axis==TravelAxis.X?Mathf.Abs(d.z):Mathf.Abs(d.x);
                if(lateral>TrafficRules.RoadHalfWidth)continue;
                float ahead=(axis==TravelAxis.X?d.x:d.z)*sign;if(ahead<0)continue;
                allowed=Mathf.Min(allowed,j.Rules.LimitTravel(ahead,requested,length,user,axis));
                if(j.Rules.Roundabout&&Vector3.Distance(position,j.Position)>18&&ahead<26)
                    foreach(var other in Vehicles)if(other!=self&&Vector3.Distance(other.transform.position,j.Position)<15&&Vector3.Distance(other.transform.position,j.Position+(position-j.Position).normalized*11.5f)<8)
                        allowed=Mathf.Min(allowed,Mathf.Max(0,ahead-TrafficRules.StopLine-length*.5f));
            }
            if(user!=RoadUser.Tram)
            {
                foreach(var other in Vehicles)
                {
                    if(other==self)continue;Vector3 d=other.transform.position-position;
                    float ahead=Vector3.Dot(d,direction),lateral=Mathf.Abs(d.x*direction.z-d.z*direction.x);
                    if(ahead>0&&lateral<((self?self.Width:2)+other.Width)*.5f+.15f)
                        allowed=Mathf.Min(allowed,Mathf.Max(0,ahead-(length+other.Length)*.5f-1.2f));
                }
                foreach(var walker in Walkers)
                {
                    Vector3 d=walker.transform.position-position;float ahead=Vector3.Dot(d,direction);
                    if(ahead>0&&Mathf.Abs(d.x*direction.z-d.z*direction.x)<(self?self.Width:2)*.5f+.4f)
                        allowed=Mathf.Min(allowed,Mathf.Max(0,ahead-length*.5f-1));
                }
                if(Tram&&Mathf.Abs(direction.z)>.7f&&Mathf.Abs(position.x-Tram.transform.position.x)<10)
                {float ahead=(Tram.transform.position.z-position.z)*Mathf.Sign(direction.z);if(ahead>0)allowed=Mathf.Min(allowed,Mathf.Max(0,ahead-1.65f-length*.5f-1));}
            }
            allowed=AnotherWorld.World.LiftBridge.LimitRoad(position,direction,allowed,length);
            return Mathf.Max(0,allowed);
        }
        public bool CanCross(Vector3 p,Vector3 destination)
        {
            foreach(var j in Junctions)
            {
                bool x=Axis(destination-p)==TravelAxis.X;
                float side=x?p.x-j.Position.x:p.z-j.Position.z,other=x?p.z-j.Position.z:p.x-j.Position.x;
                float end=x?destination.x-j.Position.x:destination.z-j.Position.z;
                if(Mathf.Abs(other)<16.7f||Mathf.Abs(other)>19.3f||side*end>=0)continue;
                if(Mathf.Abs(side)<TrafficRules.RoadHalfWidth)return true;
                if(Mathf.Abs(side)<=21)return j.Rules.Signal(RoadUser.Pedestrian,x?TravelAxis.X:TravelAxis.Z)==SignalState.Green;
            }
            return true;
        }
        public Junction NearestJunction(Vector3 p)
        {Junction best=null;float distance=float.MaxValue;foreach(var j in Junctions){float d=(p-j.Position).sqrMagnitude;if(d<distance){best=j;distance=d;}}return best;}
    }
    public sealed class Junction
    {
        public Vector3 Position;
        public readonly TrafficRules Rules=new TrafficRules();
        public readonly List<SignalLamp> Lamps=new List<SignalLamp>();
        public void UpdateLamps(){foreach(var lamp in Lamps)lamp.View.SetActive(Rules.Signal(lamp.User,lamp.Axis)==lamp.State);}
    }
    public struct SignalLamp { public GameObject View;public RoadUser User;public TravelAxis Axis;public SignalState State; }
}
