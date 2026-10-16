using System.Collections.Generic;
using UnityEngine;
namespace AnotherWorld.World
{
    public static class CoastalGround
    {
        public static void Build(Transform parent,Material grass)
        {
            // Keep land solid, but leave actual water columns open to swimmers and sinking vehicles.
            WorldShapes.Box(parent,"Western mainland",new Vector3(600,.12f,1800),new Vector3(-600,-.08f,100),grass,true);
            WorldShapes.Box(parent,"Eastern mainland",new Vector3(1100,.12f,1800),new Vector3(850,-.08f,100),grass,true);
            WorldShapes.Box(parent,"Southern mainland",new Vector3(600,.12f,1008),new Vector3(0,-.08f,-296),grass,true);
            WorldShapes.Box(parent,"Northern mainland",new Vector3(600,.12f,100),new Vector3(0,-.08f,950),grass,true);
            var vertices=new List<Vector3>();var triangles=new List<int>();var uv=new List<Vector2>();
            for(float x=-300;x<300;x+=4)for(float z=208;z<900;z+=4)
            {
                if(WorldGeography.IsWater(new Vector3(x+2,0,z+2)))continue;
                int start=vertices.Count;vertices.AddRange(new[]{new Vector3(x,-.02f,z),new Vector3(x,-.02f,z+4),new Vector3(x+4,-.02f,z+4),new Vector3(x+4,-.02f,z)});
                uv.AddRange(new[]{new Vector2(x,z)/4,new Vector2(x,z+4)/4,new Vector2(x+4,z+4)/4,new Vector2(x+4,z)/4});triangles.AddRange(new[]{start,start+1,start+2,start,start+2,start+3});
            }
            var mesh=new Mesh{name="Coastal land with open water",indexFormat=UnityEngine.Rendering.IndexFormat.UInt32};mesh.SetVertices(vertices);mesh.SetUVs(0,uv);mesh.SetTriangles(triangles,0);mesh.RecalculateNormals();mesh.RecalculateBounds();
            var ground=SmoothShapes.Part(parent,"Coastal ground",mesh,Vector3.one,Vector3.zero,grass,true);ground.AddComponent<MeshCollider>().sharedMesh=mesh;
            WorldShapes.Box(parent,"Seabed",new Vector3(600,.2f,692),new Vector3(0,-10,554),grass,true);
        }
    }
}
