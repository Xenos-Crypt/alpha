using System.Collections.Generic;
using UnityEngine;
using AnotherWorld.Rendering;
namespace AnotherWorld.World
{
    public static class TransportDesign
    {
        static readonly Dictionary<string,Mesh> meshes=new Dictionary<string,Mesh>();
        public static Material Pearl=>WorldShapes.Material("Transport pearl ceramic",new Color(.86f,.91f,.95f),null,.65f);
        static Material glass;
        public static Material Glass {get{if(!glass)glass=new Material(Resources.Load<Shader>("Shaders/VehicleGlass")){name="Reflective transport glazing",enableInstancing=true};return glass;}}
        public static Material Graphite=>WorldShapes.Material("Transport graphite",new Color(.055f,.075f,.1f),null,.6f);
        public static Material Cyan=>ElementalVisuals.Paint("Transport cyan induction",new Color(.035f,.78f,1),true);
        // Lofted eight-sided cross sections share one mesh per vehicle family.
        public static Mesh Loft(string key,Vector4[] sections)
        {
            if(meshes.TryGetValue(key,out var cached))return cached;
            var vertices=new List<Vector3>();var triangles=new List<int>();
            foreach(var s in sections)
            {
                float w=s.y*.5f,low=s.z,high=s.w,bevel=Mathf.Min(.1f,(high-low)*.3f);
                vertices.AddRange(new[]{new Vector3(-w*.78f,high,s.x),new Vector3(w*.78f,high,s.x),new Vector3(w,high-bevel,s.x),new Vector3(w,low+bevel,s.x),new Vector3(w*.78f,low,s.x),new Vector3(-w*.78f,low,s.x),new Vector3(-w,low+bevel,s.x),new Vector3(-w,high-bevel,s.x)});
            }
            for(int n=0;n<sections.Length-1;n++)for(int side=0;side<8;side++){int a=n*8+side,b=n*8+(side+1)%8;triangles.AddRange(new[]{a,a+8,b,b,a+8,b+8});}
            int cap=vertices.Count;for(int n=0;n<8;n++)vertices.Add(vertices[n]);for(int n=0;n<8;n++)vertices.Add(vertices[(sections.Length-1)*8+n]);
            for(int n=1;n<7;n++){triangles.AddRange(new[]{cap,cap+n,cap+n+1,cap+8,cap+8+n+1,cap+8+n});}
            var mesh=new Mesh{name=key};mesh.SetVertices(vertices);mesh.SetTriangles(triangles,0);mesh.RecalculateNormals();mesh.RecalculateBounds();meshes[key]=mesh;return mesh;
        }
        public static void Part(Transform parent,string name,Mesh mesh,Vector3 scale,Vector3 point,Material material)
        {var part=SmoothShapes.Part(parent,name,mesh,scale,point,material);GpuMeshBatch.Register(part.GetComponent<MeshRenderer>());}
        public static void Patch(Transform root,string key,Vector3 a,Vector3 b,Vector3 c,Vector3 d,Material material)
        {
            if(!meshes.TryGetValue(key,out var mesh)){mesh=new Mesh{name=key,vertices=new[]{a,b,c,d},triangles=new[]{0,3,1,1,3,2}};mesh.RecalculateNormals();mesh.RecalculateBounds();meshes[key]=mesh;}
            Part(root,key,mesh,Vector3.one,Vector3.zero,material);
        }
        public static Mesh Hull=>Loft("Transport tapered hull",new[]{new Vector4(-.5f,.68f,.34f,.58f),new Vector4(-.36f,1,.22f,.87f),new Vector4(.16f,1,.2f,.87f),new Vector4(.41f,.84f,.32f,.65f),new Vector4(.5f,.46f,.39f,.51f)});
        public static Mesh Canopy=>Loft("Transport swept canopy",new[]{new Vector4(-.36f,.62f,0,.13f),new Vector4(-.22f,.85f,0,.85f),new Vector4(.12f,.82f,0,.88f),new Vector4(.39f,.57f,0,.1f)});
        public static void Rail(Transform root,float length,float width,float height,bool train=false)
        {
            var lower=Loft("Purpose built rail lower body",new[]{new Vector4(-.5f,.88f,.22f,.62f),new Vector4(-.42f,1,.18f,.68f),new Vector4(.3f,1,.18f,.68f),new Vector4(.42f,.94f,.23f,.59f),new Vector4(.48f,.7f,.28f,.48f),new Vector4(.5f,.48f,.33f,.44f)});
            Part(root,"Upright pearl rail body",lower,new Vector3(width,height,length),Vector3.zero,Pearl);
            var glazing=Loft("Rail continuous upright glazing",new[]{new Vector4(-.48f,.86f,.63f,1),new Vector4(-.4f,.998f,.64f,1.12f),new Vector4(.28f,.998f,.64f,1.12f),new Vector4(.39f,.94f,.6f,1.07f),new Vector4(.47f,.72f,.51f,.91f),new Vector4(.49f,.54f,.48f,.76f)});
            Part(root,"Continuous rail window band",glazing,new Vector3(width,height,length),Vector3.zero,Glass);
            var cap=Loft("Rounded rail roof crown",new[]{new Vector4(-.49f,.85f,1,1.04f),new Vector4(-.4f,1,1.12f,1.17f),new Vector4(.28f,1,1.12f,1.17f),new Vector4(.39f,.92f,1.07f,1.11f),new Vector4(.47f,.68f,.91f,.94f)});
            Part(root,"Rounded ceramic rail roof",cap,new Vector3(width,height,length),Vector3.zero,Pearl);
            foreach(int side in new[]{-1,1})
            {
                WorldShapes.Box(root,"Continuous cyan rail sill",new Vector3(.035f,.055f,length*.75f),new Vector3(side*width*.5f,height*.37f,-length*.03f),Cyan,false,false);
                WorldShapes.Box(root,"Blue rail service band",new Vector3(.026f,.13f,length*.73f),new Vector3(side*width*.501f,height*.61f,-length*.04f),WorldShapes.Material("Rail blue livery",new Color(.025f,.26f,.48f)),false,false);
                for(float z=-length*.32f;z<length*.27f;z+=1.6f)WorldShapes.Box(root,"Rail window mullion",new Vector3(.045f,height*.49f,.07f),new Vector3(side*width*.5f,height*.88f,z),Pearl,false,false);
                foreach(float z in new[]{-length*.2f,length*.13f})WorldShapes.Box(root,"Sliding rail door joint",new Vector3(.035f,height*.82f,.025f),new Vector3(side*width*.502f,height*.7f,z),Graphite,false,false);
            }
            WorldShapes.Box(root,"Rail nose running light",new Vector3(width*.38f,.055f,.035f),new Vector3(0,height*.42f,length*.501f),Cyan,false,false);
        }
        public static void Aircraft(Transform root,bool helicopter)
        {
            if(helicopter)
            {
                var fuselage=Loft("Rotorless shuttle body",new[]{new Vector4(-3.5f,1.2f,.5f,1.1f),new Vector4(-2.3f,2.8f,.25f,1.55f),new Vector4(0,3.3f,.2f,1.6f),new Vector4(2.1f,2.6f,.35f,1.4f),new Vector4(3.5f,1.1f,.7f,1.05f)});
                Part(root,"Rotorless passenger fuselage",fuselage,Vector3.one,Vector3.zero,Pearl);
                var cabin=Loft("Shuttle curved cabin glazing",new[]{new Vector4(-2.2f,2.3f,1.4f,1.7f),new Vector4(-1.4f,2.65f,1.4f,2.35f),new Vector4(.8f,2.6f,1.4f,2.4f),new Vector4(2.5f,1.8f,1.25f,1.55f)});
                Part(root,"Shuttle panoramic cabin",cabin,Vector3.one,Vector3.zero,Glass);
                Part(root,"Shuttle roof cap",Loft("Shuttle ceramic crown",new[]{new Vector4(-1.5f,2.2f,2.29f,2.36f),new Vector4(-.5f,2.3f,2.39f,2.46f),new Vector4(.8f,2.15f,2.39f,2.46f)}),Vector3.one,Vector3.zero,Pearl);
                foreach(int side in new[]{-1,1})
                {
                    Part(root,"Shuttle lift sponson",Hull,new Vector3(1.4f,.9f,4.7f),new Vector3(side*2,.15f,-.4f),Pearl);
                    foreach(float z in new[]{-1.7f,1.1f})Part(root,"Downward shuttle induction lens",SmoothShapes.Tube,new Vector3(1.05f,.035f,1.05f),new Vector3(side*2,.25f,z),Cyan);
                    WorldShapes.Box(root,"Shuttle cyan belt",new Vector3(.035f,.055f,3.6f),new Vector3(side*1.62f,.85f,-.2f),Cyan,false,false);
                }
                return;
            }
            var body=Loft("Airliner spindle fuselage",new[]{new Vector4(-6.5f,.3f,1,1.35f),new Vector4(-4.5f,1.7f,.5f,2.1f),new Vector4(-1,2.9f,.3f,2.75f),new Vector4(1.5f,3,.3f,2.8f),new Vector4(4,2.6f,.6f,2.5f),new Vector4(5.5f,1.7f,.8f,2),new Vector4(6.5f,.2f,1.2f,1.4f)});
            Part(root,"Airliner fuselage",body,Vector3.one,Vector3.zero,Pearl);
            Part(root,"Swept airliner wings",Wing,new Vector3(16,.18f,13),new Vector3(0,1,-.7f),Pearl);
            Part(root,"Horizontal tailplane",Wing,new Vector3(5,.12f,4),new Vector3(0,1.35f,-4.5f),Pearl);
            var fin=WorldShapes.Box(root,"Vertical tail fin",new Vector3(.12f,1.5f,1.8f),new Vector3(0,2.1f,-4.7f),Pearl,false,false);fin.transform.localRotation=Quaternion.Euler(-20,0,0);
            Patch(root,"Airliner exterior flight deck glazing",new Vector3(-.8f,2.58f,3.7f),new Vector3(.8f,2.58f,3.7f),new Vector3(.63f,2.265f,4.8f),new Vector3(-.63f,2.265f,4.8f),Glass);
            foreach(int side in new[]{-1,1})
            {
                for(float z=-3;z<3;z+=.55f)
                {
                    float half=z< -1?Mathf.Lerp(.85f,1.45f,(z+4.5f)/3.5f):z<1.5f?Mathf.Lerp(1.45f,1.5f,(z+1)/2.5f):Mathf.Lerp(1.5f,1.3f,(z-1.5f)/2.5f);
                    Part(root,"Airliner passenger window",SmoothShapes.Ellipsoid,new Vector3(.025f,.22f,.28f),new Vector3(side*(half+.015f),1.85f,z),Glass);
                }
                var nacelle=SmoothShapes.Profile("Round airliner induction nacelle",new[]{new Vector2(0,0),new Vector2(.36f,0),new Vector2(.48f,.12f),new Vector2(.5f,.7f),new Vector2(.44f,1),new Vector2(0,1)},20);
                var engine=SmoothShapes.Part(root,"Round electric engine nacelle",nacelle,new Vector3(1,2.4f,1),new Vector3(side*3.6f,.75f,-2.35f),Pearl);engine.transform.localRotation=Quaternion.Euler(90,0,0);GpuMeshBatch.Register(engine.GetComponent<MeshRenderer>());
                Part(root,"Engine induction face",SmoothShapes.Disc,new Vector3(.65f,.65f,1),new Vector3(side*3.6f,.75f,.065f),Cyan);
            }
        }
        static Mesh Wing
        {
            get
            {
                if(meshes.TryGetValue("Swept wing prism",out var mesh))return mesh;
                var outline=new[]{new Vector2(.05f,.12f),new Vector2(.5f,-.22f),new Vector2(.5f,-.32f),new Vector2(.05f,-.08f),new Vector2(-.05f,-.08f),new Vector2(-.5f,-.32f),new Vector2(-.5f,-.22f),new Vector2(-.05f,.12f)};
                var v=new List<Vector3>();var t=new List<int>();for(int layer=0;layer<2;layer++){v.Add(new Vector3(0,layer,-.04f));foreach(var p in outline)v.Add(new Vector3(p.x,layer,p.y));}
                for(int n=0;n<8;n++){int a=n+1,b=(n+1)%8+1;t.AddRange(new[]{0,b,a,9,a+9,b+9,a,b,a+9,b,b+9,a+9});}
                mesh=new Mesh{name="Swept wing prism"};mesh.SetVertices(v);mesh.SetTriangles(t,0);mesh.RecalculateNormals();mesh.RecalculateBounds();meshes["Swept wing prism"]=mesh;return mesh;
            }
        }
        public static void Marine(Transform root)
        {
            foreach(int side in new[]{-1,1})Part(root,"Separate catamaran hull",Hull,new Vector3(2.2f,1.5f,15),new Vector3(side*2.2f,-.15f,0),Pearl);
            var cabin=Loft("Ferry upright cabin",new[]{new Vector4(-5,4.8f,1.3f,1.65f),new Vector4(-4,5.7f,1.3f,1.7f),new Vector4(2.5f,5.7f,1.3f,1.7f),new Vector4(4.4f,4.8f,1.3f,1.6f)});
            Part(root,"Raised marine cabin base",cabin,Vector3.one,Vector3.zero,Pearl);
            Part(root,"Marine wraparound window band",Loft("Ferry upright panoramic glazing",new[]{new Vector4(-4.7f,4.7f,1.63f,2.65f),new Vector4(-3.8f,5.5f,1.68f,2.9f),new Vector4(2.5f,5.5f,1.68f,2.9f),new Vector4(4.1f,4.7f,1.58f,2.3f)}),Vector3.one,Vector3.zero,Glass);
            Part(root,"Marine contoured roof",Loft("Ferry ceramic roof",new[]{new Vector4(-4.8f,4.9f,2.65f,2.74f),new Vector4(-3.8f,5.7f,2.9f,3),new Vector4(2.5f,5.7f,2.9f,3),new Vector4(4.15f,4.9f,2.3f,2.4f)}),Vector3.one,Vector3.zero,Pearl);
            foreach(int side in new[]{-1,1})
            {
                for(int n=-3;n<=2;n++)WorldShapes.Box(root,"Marine window mullion",new Vector3(.06f,1.2f,.09f),new Vector3(side*2.76f,2.27f,n*1.1f),Pearl,false,false);
                WorldShapes.Box(root,"Cyan marine waterline",new Vector3(.04f,.06f,10),new Vector3(side*3.25f,.6f,0),Cyan,false,false);
                WorldShapes.Box(root,"Passenger safety handrail",new Vector3(.055f,.055f,12.6f),new Vector3(side*3.1f,2.08f,0),Graphite,false,false);
                foreach(int end in new[]{-1,1})WorldShapes.Box(root,"Passenger rail stanchion",new Vector3(.055f,.76f,.055f),new Vector3(side*3.1f,1.7f,end*6),Graphite,false,false);
            }
        }
    }
}
