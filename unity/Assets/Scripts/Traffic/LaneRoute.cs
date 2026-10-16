using System.Collections.Generic;
using UnityEngine;
namespace AnotherWorld.Traffic
{
    public static class LaneRoute
    {
        public static readonly Vector3[] Roundabouts={new Vector3(-128,0,-128),new Vector3(128,0,128)};
        public static Vector3 Right(Vector3 direction)=>new Vector3(direction.z,0,-direction.x);
        public static bool IsRoundabout(Vector3 p){foreach(var c in Roundabouts)if((c-p).sqrMagnitude<1)return true;return false;}
        public static Vector3[] Build(Vector3[] nodes,float lane,bool bus=false)
        {
            var path=new List<Vector3>();
            for(int i=0;i<nodes.Length;i++)
            {
                var c=nodes[i];var incoming=(c-nodes[(i+nodes.Length-1)%nodes.Length]).normalized;var outgoing=(nodes[(i+1)%nodes.Length]-c).normalized;
                var start=c-incoming*TrafficRules.StopLine+Right(incoming)*lane;var end=c+outgoing*TrafficRules.StopLine+Right(outgoing)*lane;
                path.Add(start);
                if(IsRoundabout(c))
                {
                    float a=Mathf.Atan2(start.z-c.z,start.x-c.x),b=Mathf.Atan2(end.z-c.z,end.x-c.x);
                    while(b<=a+.05f)b+=Mathf.PI*2;
                    int steps=Mathf.CeilToInt((b-a)*12);
                    for(int n=0;n<=steps;n++){float angle=Mathf.Lerp(a,b,(float)n/steps);path.Add(c+new Vector3(Mathf.Cos(angle)*11.5f,0,Mathf.Sin(angle)*11.5f));}
                }
                else
                {
                    var control=c+Right(incoming)*lane+Right(outgoing)*lane;
                    if(Vector3.Dot(incoming,outgoing)<-.9f)control=c+incoming*20;
                    for(int n=1;n<=12;n++){float t=n/12f;path.Add((1-t)*(1-t)*start+2*(1-t)*t*control+t*t*end);}
                }
                path.Add(end);
                if(bus&&Vector3.Distance(c,nodes[(i+1)%nodes.Length])>=TrafficRules.Spacing)
                {
                    var stop=c+outgoing*32+Right(outgoing)*15.4f;
                    for(int n=0;n<=24;n++)
                    {
                        float t=n/24f;float lateral=8*(t*t*(3-2*t));
                        path.Add(stop-outgoing*12+outgoing*(12*t)-Right(outgoing)*(8-lateral));
                    }
                    for(int n=1;n<=24;n++)
                    {
                        float t=n/24f;float lateral=8*(t*t*(3-2*t));
                        path.Add(stop+outgoing*(12*t)-Right(outgoing)*lateral);
                    }
                }
            }
            return path.ToArray();
        }
        public static Vector3[] ToTarget(Vector3 from,Vector3 to)
        {
            var queue=new Queue<Vector3>();var previous=new Dictionary<Vector3,Vector3>();queue.Enqueue(from);previous[from]=from;
            while(queue.Count>0&&!previous.ContainsKey(to))
            {
                var current=queue.Dequeue();foreach(var j in RoadNetwork.Instance.Junctions)
                {var delta=j.Position-current;if(Mathf.Abs(delta.magnitude-64)>.1f||Mathf.Abs(delta.x)>.1f&&Mathf.Abs(delta.z)>.1f||previous.ContainsKey(j.Position))continue;previous[j.Position]=current;queue.Enqueue(j.Position);}
            }
            var nodes=new List<Vector3>();
            if(previous.ContainsKey(to)){var current=to;while(current!=from){nodes.Add(current);current=previous[current];}nodes.Add(from);nodes.Reverse();}
            else nodes.Add(from);
            if(nodes.Count==1)foreach(var j in RoadNetwork.Instance.Junctions)if(Mathf.Abs((j.Position-from).magnitude-64)<.1f){nodes.Add(j.Position);break;}
            for(int i=nodes.Count-2;i>0;i--)nodes.Add(nodes[i]);
            return nodes.ToArray();
        }
    }
}
