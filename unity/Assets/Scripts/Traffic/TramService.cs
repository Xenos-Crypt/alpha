using UnityEngine;

namespace AnotherWorld.Traffic
{
    public sealed class TramService : MonoBehaviour
    {
        public float[] Stops={-160,-96,-32,32,96,160};
        public int Direction=1;
        public bool DoorsOpen=true;
        public float Speed;
        int index;float dwell=8;
        void Start(){RoadNetwork.Instance.Tram=this;}
        void Update()
        {
            if(DoorsOpen){dwell-=Time.deltaTime;Speed=0;if(dwell<=0){DoorsOpen=false;Direction=index==Stops.Length-1?-1:index==0?1:Direction;index+=Direction;}return;}
            float distance=Mathf.Abs(Stops[index]-transform.position.x);
            float requested=Mathf.Min(distance,Mathf.Min(8,Mathf.Sqrt(distance*6))*Time.deltaTime);
            float travel=RoadNetwork.Instance.Limit(transform.position,new Vector3(Direction,0,0),requested,RoadUser.Tram,18);
            transform.position+=new Vector3(Direction*travel,0,0);Speed=Time.deltaTime>0?travel/Time.deltaTime:0;
            if(distance<.08f){transform.position=new Vector3(Stops[index],0,0);DoorsOpen=true;dwell=8;Speed=0;}
        }
    }
}
