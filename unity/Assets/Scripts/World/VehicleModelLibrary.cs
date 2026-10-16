using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace AnotherWorld.World
{
    public static class VehicleModelLibrary
    {
        [Serializable] public sealed class Model { public string kind;public float length,width;public Point[] wheels;public Surface[] materials;public Geometry[] meshes; }
        [Serializable] public struct Point { public float x,y,z; }
        [Serializable] public sealed class Surface { public string color,emission;public float emissionIntensity,roughness,metallic;public bool paint; }
        [Serializable] public sealed class Geometry { public int wheel,material;public float[] positions,normals,uv;public int[] triangles; }
        sealed class Cached { public Model Data;public Mesh[] Meshes;public Material[] Materials; }
        static readonly Dictionary<string,Cached> cache=new Dictionary<string,Cached>();
        static Cached Load(string name)
        {
            if(cache.TryGetValue(name,out var result))return result;
            var json=Resources.Load<TextAsset>("VehicleModels/"+name);if(!json)throw new InvalidOperationException("Missing vehicle model: "+name);
            var data=JsonUtility.FromJson<Model>(json.text);result=new Cached{Data=data,Meshes=new Mesh[data.meshes.Length],Materials=new Material[data.materials.Length]};
            for(int i=0;i<data.materials.Length;i++)
            {
                var s=data.materials[i];var material=new Material(Shader.Find("Universal Render Pipeline/Lit")){enableInstancing=true};
                ColorUtility.TryParseHtmlString(s.color,out var color);material.SetColor("_BaseColor",color);
                material.SetFloat("_Smoothness",1-s.roughness);material.SetFloat("_Metallic",s.metallic);
                if(s.emissionIntensity>0){ColorUtility.TryParseHtmlString(s.emission,out var e);material.EnableKeyword("_EMISSION");material.SetColor("_EmissionColor",e*s.emissionIntensity);}
                result.Materials[i]=material;
            }
            for(int i=0;i<data.meshes.Length;i++)
            {
                var g=data.meshes[i];var vertices=new Vector3[g.positions.Length/3];var normals=new Vector3[vertices.Length];var uv=new Vector2[vertices.Length];
                for(int v=0;v<vertices.Length;v++){vertices[v]=new Vector3(g.positions[v*3],g.positions[v*3+1],g.positions[v*3+2]);normals[v]=new Vector3(g.normals[v*3],g.normals[v*3+1],g.normals[v*3+2]);uv[v]=new Vector2(g.uv[v*2],g.uv[v*2+1]);}
                var mesh=new Mesh{name=name+" part "+i};if(vertices.Length>65535)mesh.indexFormat=IndexFormat.UInt32;
                mesh.vertices=vertices;mesh.normals=normals;mesh.uv=uv;mesh.triangles=g.triangles;mesh.RecalculateBounds();result.Meshes[i]=mesh;
            }
            cache[name]=result;return result;
        }
        public static GameObject Create(string kind,Transform parent,Color paint,out Transform[] wheels)
        { return HoverVehicleModel.Create(kind,parent,paint,out wheels); }
        public static GameObject CreateLegacy(string kind,Transform parent,Color paint,out Transform[] wheels)
        {
            if(kind=="bicycle")return BicycleModel.Create(parent,paint,out wheels);
            if(kind=="bus")return BusModel.Create(parent,out wheels);
            var model=Load(kind);var root=new GameObject(kind);root.transform.SetParent(parent,false);wheels=new Transform[model.Data.wheels.Length];
            for(int i=0;i<wheels.Length;i++){var wheel=new GameObject("Wheel "+i);wheel.transform.SetParent(root.transform,false);var p=model.Data.wheels[i];wheel.transform.localPosition=new Vector3(p.x,p.y,p.z);wheels[i]=wheel.transform;}
            var materials=(Material[])model.Materials.Clone();for(int i=0;i<materials.Length;i++)if(model.Data.materials[i].paint){materials[i]=new Material(materials[i]);materials[i].SetColor("_BaseColor",paint);}
            for(int i=0;i<model.Meshes.Length;i++)
            {
                var part=new GameObject("Body part "+i);var g=model.Data.meshes[i];part.transform.SetParent(g.wheel<0?root.transform:wheels[g.wheel],false);
                part.AddComponent<MeshFilter>().sharedMesh=model.Meshes[i];var renderer=part.AddComponent<MeshRenderer>();renderer.sharedMaterial=materials[g.material];
                Rendering.GpuMeshBatch.Register(renderer);
            }
            var collider=root.AddComponent<BoxCollider>();collider.size=new Vector3(model.Data.width,kind=="ambulance"?2.7f:kind=="motorcycle"||kind=="bicycle"?1.5f:1.8f,model.Data.length);collider.center=new Vector3(0,collider.size.y*.5f,0);
            return root;
        }
    }
}
