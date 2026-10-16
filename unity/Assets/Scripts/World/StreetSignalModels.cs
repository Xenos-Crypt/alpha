using UnityEngine;
using AnotherWorld.Traffic;
using AnotherWorld.Rendering;

namespace AnotherWorld.World
{
    public static class StreetSignalModels
    {
        public static void Create(Transform scenery,Junction junction)
        {
            var pole=WorldShapes.Material("Galvanized signal pole",new Color(.33f,.36f,.35f),null,.45f);
            var shell=WorldShapes.Material("Signal casing",new Color(.045f,.055f,.055f),null,.23f);
            foreach(var approach in new[]{new Vector3(20.5f,0,15.5f),new Vector3(-20.5f,0,-15.5f),new Vector3(-15.5f,0,20.5f),new Vector3(15.5f,0,-20.5f)})
            {
                if(junction.Rules.Roundabout)continue;
                var root=new GameObject("Junction signals").transform;root.SetParent(scenery,false);root.position=junction.Position+approach;
                var axis=Mathf.Abs(approach.x)>Mathf.Abs(approach.z)?TravelAxis.X:TravelAxis.Z;
                root.rotation=Quaternion.LookRotation(axis==TravelAxis.X?new Vector3(Mathf.Sign(approach.x),0,0):new Vector3(0,0,Mathf.Sign(approach.z)));
                SmoothShapes.Part(root,"Round mast",SmoothShapes.Tube,new Vector3(.105f,3.7f,.105f),new Vector3(0,.18f,-.16f),pole,true);
                SmoothShapes.Part(root,"Mounting foot",SmoothShapes.Tube,new Vector3(.19f,.16f,.19f),new Vector3(0,.18f,-.16f),pole,true);
                if(!junction.Rules.Roundabout){Head(root,junction,axis,RoadUser.Car,new Vector3(0,3.3f,0),.36f,1.09f,shell,pole);
                Head(root,junction,axis,RoadUser.Bicycle,new Vector3(.46f,2.54f,0),.26f,.59f,shell,pole);}
            }
            foreach(int sx in new[]{-1,1})foreach(int sz in new[]{-1,1})
            {
                var post=new GameObject("Directional crossing push buttons").transform;post.SetParent(scenery,false);post.position=junction.Position+new Vector3(sx*18,.18f,sz*18);
                SmoothShapes.Part(post,"Crossing mast",SmoothShapes.Tube,new Vector3(.085f,2.75f,.085f),Vector3.zero,pole,true);
                foreach(var axis in new[]{TravelAxis.X,TravelAxis.Z})
                {
                    var face=new GameObject("Cross "+axis).transform;face.SetParent(post,false);face.localRotation=Quaternion.LookRotation(axis==TravelAxis.X?new Vector3(sx,0,0):new Vector3(0,0,sz));
                    Head(face,junction,axis,RoadUser.Pedestrian,new Vector3(0,2.25f,.15f),.29f,.64f,shell,pole);
                    WorldShapes.Box(face,"Yellow push-button box",new Vector3(.18f,.25f,.1f),new Vector3(0,1,.15f),WorldShapes.Material("Push button yellow",new Color(.88f,.65f,.09f)));
                    SmoothShapes.Part(face,"Press pad",SmoothShapes.Disc,new Vector3(.085f,.085f,1),new Vector3(0,1,.209f),shell,true);
                    var led=WorldShapes.Box(face,"Request accepted",new Vector3(.07f,.025f,.015f),new Vector3(0,1.085f,.21f),Glow("Request lamp",new Color(1,.62f,.035f)),false,false);
                    Register(led);var button=face.gameObject.AddComponent<CrossingButton>();button.Junction=junction;button.Axis=axis;button.RequestedLight=led;
                    if(RoadNetwork.Instance)RoadNetwork.Instance.Buttons.Add(button);
                }
            }
            if(Mathf.Abs(junction.Position.z)<.1f)foreach(int side in new[]{-1,1})
            {
                var mast=new GameObject("Track-facing tram signal").transform;mast.SetParent(scenery,false);mast.position=junction.Position+new Vector3(side*20.5f,0,side*1.8f);mast.rotation=Quaternion.LookRotation(new Vector3(side,0,0));
                SmoothShapes.Part(mast,"Tram signal pole",SmoothShapes.Tube,new Vector3(.09f,3.2f,.09f),Vector3.zero,pole,true);
                Head(mast,junction,TravelAxis.X,RoadUser.Tram,new Vector3(0,2.9f,0),.29f,.46f,shell,pole);
            }
        }
        static void Head(Transform root,Junction junction,TravelAxis axis,RoadUser user,Vector3 centre,float width,float height,Material shell,Material pole)
        {
            WorldShapes.Box(root,"Mounting bracket",new Vector3(Mathf.Abs(centre.x)+.12f,.07f,.08f),new Vector3(centre.x*.5f,centre.y,-.13f),pole);
            WorldShapes.Box(root,"Signal backing plate",new Vector3(width+.095f,height+.085f,.025f),centre+new Vector3(0,0,-.105f),shell);
            WorldShapes.Box(root,"Weatherproof signal housing",new Vector3(width,height,.19f),centre,shell);
            if(user==RoadUser.Tram)
            {
                var white=Glow("Tram white aspect",new Color(.95f,.92f,.8f));
                foreach(var state in new[]{SignalState.Red,SignalState.Green})
                {
                    var aspect=new GameObject(state==SignalState.Red?"Tram stop bar":"Tram proceed bar").transform;aspect.SetParent(root,false);aspect.localPosition=centre+new Vector3(0,0,.107f);
                    var go=WorldShapes.Box(aspect,"White indicator",state==SignalState.Red?new Vector3(.19f,.035f,.018f):new Vector3(.035f,.29f,.018f),Vector3.zero,white,false,false);
                    GpuMeshBatch.Register(go.GetComponent<MeshRenderer>());junction.Lamps.Add(new SignalLamp{View=aspect.gameObject,User=user,Axis=axis,State=state});
                }
                return;
            }
            int count=user==RoadUser.Car?3:2;float diameter=width*.73f,spacing=height/count;
            for(int i=0;i<count;i++)
            {
                var state=i==0?SignalState.Red:count==3&&i==1?SignalState.Amber:SignalState.Green;
                var color=state==SignalState.Red?new Color(.96f,.025f,.015f):state==SignalState.Amber?new Color(1,.5f,.025f):new Color(.035f,.75f,.2f);
                var at=centre+new Vector3(0,height*.5f-spacing*(i+.5f),.102f);
                SmoothShapes.Part(root,"Dark circular lens",SmoothShapes.Disc,new Vector3(diameter,diameter,1),at,WorldShapes.Material("Unlit lens "+state,color*.065f),true);
                WorldShapes.Box(root,"Lens sun visor",new Vector3(diameter+.025f,.027f,.16f),at+new Vector3(0,diameter*.52f,.045f),shell);
                var aspect=new GameObject(user+" "+state).transform;aspect.SetParent(root,false);aspect.localPosition=at+new Vector3(0,0,.007f);
                var lit=Glow("Signal glow "+state,color);
                if(user==RoadUser.Car)Register(SmoothShapes.Part(aspect,"Round illuminated lens",SmoothShapes.Disc,new Vector3(diameter*.89f,diameter*.89f,1),Vector3.zero,lit));
                else if(user==RoadUser.Pedestrian)Pedestrian(aspect,lit,state==SignalState.Green,diameter);
                else Bicycle(aspect,lit,diameter);
                junction.Lamps.Add(new SignalLamp{View=aspect.gameObject,User=user,Axis=axis,State=state});
            }
        }
        static Material Glow(string name,Color color){var material=WorldShapes.Material(name,color,null,.3f);material.EnableKeyword("_EMISSION");material.SetColor("_EmissionColor",color*1.1f);return material;}
        static void Register(GameObject go){GpuMeshBatch.Register(go.GetComponent<MeshRenderer>());}
        static void Line(Transform parent,Vector2 a,Vector2 b,float thickness,Material material)
        {
            var middle=(a+b)*.5f;var line=WorldShapes.Box(parent,"Indicator stroke",new Vector3(thickness,Vector2.Distance(a,b),.006f),new Vector3(middle.x,middle.y,0),material,false,false);
            line.transform.localRotation=Quaternion.Euler(0,0,-Mathf.Atan2(b.x-a.x,b.y-a.y)*Mathf.Rad2Deg);Register(line);
        }
        static void Pedestrian(Transform p,Material m,bool walk,float d)
        {
            Register(SmoothShapes.Part(p,"Head symbol",SmoothShapes.Disc,Vector3.one*d*.18f,new Vector3(0,d*.28f,0),m));
            Line(p,new Vector2(0,d*.16f),new Vector2(0,-d*.08f),d*.1f,m);
            for(int side=-1;side<=1;side+=2){Line(p,new Vector2(0,d*.1f),new Vector2(side*d*(walk?.26f:.14f),-d*.1f),d*.065f,m);Line(p,new Vector2(0,-d*.07f),new Vector2(side*d*(walk?.25f:.11f),-d*.34f),d*.075f,m);}
        }
        static void Bicycle(Transform p,Material m,float d)
        {
            foreach(int side in new[]{-1,1})
                for(int n=0;n<10;n++){float a=n*Mathf.PI*.2f,b=(n+1)*Mathf.PI*.2f;var c=new Vector2(side*d*.25f,-d*.15f);Line(p,c+new Vector2(Mathf.Cos(a),Mathf.Sin(a))*d*.18f,c+new Vector2(Mathf.Cos(b),Mathf.Sin(b))*d*.18f,d*.025f,m);}
            var rear=new Vector2(-d*.25f,-d*.15f);var front=new Vector2(d*.25f,-d*.15f);var seat=new Vector2(-d*.12f,d*.17f);var stem=new Vector2(d*.13f,d*.18f);var crank=new Vector2(0,-d*.15f);
            foreach(var pair in new[]{new[]{rear,seat},new[]{seat,crank},new[]{crank,rear},new[]{seat,stem},new[]{stem,crank},new[]{stem,front}})Line(p,pair[0],pair[1],d*.035f,m);
            Line(p,stem,new Vector2(d*.1f,d*.3f),d*.04f,m);
        }
    }
}
