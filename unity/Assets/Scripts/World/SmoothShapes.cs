using System.Collections.Generic;
using UnityEngine;

namespace AnotherWorld.World
{
    public static class SmoothShapes
    {
        static readonly Dictionary<string,Mesh> meshes=new Dictionary<string,Mesh>();
        public static Mesh Profile(string key,Vector2[] rings,int sides=12)
        {
            if(meshes.TryGetValue(key,out var cached))return cached;
            var vertices=new Vector3[rings.Length*(sides+1)];var uv=new Vector2[vertices.Length];var triangles=new List<int>();
            for(int ring=0;ring<rings.Length;ring++)for(int side=0;side<=sides;side++)
            {
                int i=ring*(sides+1)+side;float angle=side*Mathf.PI*2/sides;
                vertices[i]=new Vector3(Mathf.Sin(angle)*rings[ring].x,rings[ring].y,Mathf.Cos(angle)*rings[ring].x);uv[i]=new Vector2((float)side/sides,rings[ring].y);
                if(ring==rings.Length-1||side==sides)continue;
                int up=i+sides+1;triangles.AddRange(new[]{i,i+1,up,up,i+1,up+1});
            }
            var mesh=new Mesh{name=key,vertices=vertices,uv=uv,triangles=triangles.ToArray()};mesh.RecalculateNormals();mesh.RecalculateBounds();meshes[key]=mesh;return mesh;
        }
        public static Mesh Ellipsoid=>Profile("Smooth ellipsoid",new[]{new Vector2(0,0),new Vector2(.3f,.1f),new Vector2(.46f,.3f),new Vector2(.5f,.5f),new Vector2(.46f,.7f),new Vector2(.3f,.9f),new Vector2(0,1)});
        public static Mesh Tube=>Profile("Round tube",new[]{new Vector2(0,0),new Vector2(.5f,0),new Vector2(.5f,1),new Vector2(0,1)});
        public static Mesh Disc
        {
            get
            {
                if(meshes.TryGetValue("Round lens",out var cached))return cached;
                var v=new Vector3[21];var uv=new Vector2[21];var triangles=new int[60];uv[0]=Vector2.one*.5f;
                for(int i=0;i<20;i++){float a=i*Mathf.PI*2/20;v[i+1]=new Vector3(Mathf.Cos(a)*.5f,Mathf.Sin(a)*.5f,0);uv[i+1]=new Vector2(v[i+1].x+.5f,v[i+1].y+.5f);triangles[i*3]=0;triangles[i*3+1]=i+1;triangles[i*3+2]=(i+1)%20+1;}
                var mesh=new Mesh{name="Round lens",vertices=v,uv=uv,triangles=triangles};mesh.RecalculateNormals();mesh.RecalculateBounds();meshes["Round lens"]=mesh;return mesh;
            }
        }
        public static GameObject Part(Transform parent,string name,Mesh mesh,Vector3 size,Vector3 position,Material material,bool batching=false)
        {
            var go=new GameObject(name);go.transform.SetParent(parent,false);go.transform.localPosition=position;go.transform.localScale=size;
            go.AddComponent<MeshFilter>().sharedMesh=mesh;go.AddComponent<MeshRenderer>().sharedMaterial=material;go.isStatic=batching;return go;
        }
    }
}
