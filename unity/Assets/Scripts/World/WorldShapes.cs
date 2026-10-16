using System.Collections.Generic;
using UnityEngine;

namespace AnotherWorld.World
{
    public static class WorldShapes
    {
        static readonly Dictionary<string,Material> materials=new Dictionary<string,Material>();
        static readonly Dictionary<Vector3,Mesh> texturedBoxes=new Dictionary<Vector3,Mesh>();
        public static Material Material(string name,Color color,string texture=null,float smoothness=.15f)
        {
            string key=name+"|"+color+"|"+texture+"|"+smoothness;if(materials.TryGetValue(key,out var result))return result;
            var reference=Resources.Load<Material>("Materials/URPReference");result=reference?new Material(reference):new Material(Shader.Find("Universal Render Pipeline/Lit"));
            result.name=name;result.enableInstancing=true;result.DisableKeyword("_NORMALMAP");result.DisableKeyword("_EMISSION");result.SetColor("_BaseColor",color);result.SetFloat("_Smoothness",smoothness);
            if(texture!=null){var map=Resources.Load<Texture2D>("Textures/"+texture+"-diff");if(map){result.SetTexture("_BaseMap",map);result.SetTextureScale("_BaseMap",Vector2.one);}
                var normal=Resources.Load<Texture2D>("Textures/"+texture+"-normal");if(normal){result.SetTexture("_BumpMap",normal);result.SetFloat("_BumpScale",.3f);result.EnableKeyword("_NORMALMAP");}}
            materials[key]=result;return result;
        }
        public static GameObject Box(Transform parent,string name,Vector3 size,Vector3 position,Material material,bool collider=false,bool batching=true)
        {
            var go=GameObject.CreatePrimitive(PrimitiveType.Cube);go.name=name;go.transform.SetParent(parent,false);go.transform.localPosition=position;go.transform.localScale=size;
            if(material.GetTexture("_BaseMap"))
            {
                if(!texturedBoxes.TryGetValue(size,out var mesh))
                {
                    mesh=Object.Instantiate(go.GetComponent<MeshFilter>().sharedMesh);mesh.name="Texture-scaled box "+size;var vertices=mesh.vertices;var normals=mesh.normals;var uv=new Vector2[vertices.Length];
                    for(int i=0;i<vertices.Length;i++){var p=vertices[i]+Vector3.one*.5f;var n=normals[i];uv[i]=Mathf.Abs(n.y)>.5f?new Vector2(p.x*size.x,p.z*size.z)*.5f:Mathf.Abs(n.z)>.5f?new Vector2(p.x*size.x,p.y*size.y)*.5f:new Vector2(p.z*size.z,p.y*size.y)*.5f;}
                    mesh.uv=uv;mesh.RecalculateTangents();texturedBoxes[size]=mesh;
                }
                go.GetComponent<MeshFilter>().sharedMesh=mesh;
            }
            go.GetComponent<Renderer>().sharedMaterial=material;if(!collider)Object.Destroy(go.GetComponent<Collider>());go.isStatic=batching;return go;
        }
        public static GameObject Sphere(Transform parent,string name,Vector3 size,Vector3 position,Material material,bool batching=true)
        {
            var go=GameObject.CreatePrimitive(PrimitiveType.Sphere);go.name=name;go.transform.SetParent(parent,false);go.transform.localPosition=position;go.transform.localScale=size;
            go.GetComponent<Renderer>().sharedMaterial=material;Object.Destroy(go.GetComponent<SphereCollider>());go.isStatic=batching;return go;
        }
        public static void Label(Transform parent,string text,Vector3 position,float scale=.075f,bool faceNegativeZ=true)
        {
            var go=new GameObject(text);go.transform.SetParent(parent,false);go.transform.localPosition=position;go.transform.localRotation=Quaternion.Euler(0,faceNegativeZ?0:180,0);
            var label=go.AddComponent<TextMesh>();label.text=text;label.characterSize=scale;label.fontSize=32;label.anchor=TextAnchor.MiddleCenter;label.color=new Color(.88f,.88f,.77f);
        }
        public static void Tree(Transform parent,Vector3 p)
        {
            var bark=Material("Bark",new Color(.32f,.24f,.17f),"wood");var leaf=Material("Leaves",new Color(.28f,.4f,.24f));
            Box(parent,"Trunk",new Vector3(.28f,3.1f,.28f),p+Vector3.up*1.55f,bark,true);
            for(int i=0;i<4;i++)Sphere(parent,"Canopy",new Vector3(2.3f,1.9f,2.25f),p+new Vector3(Mathf.Cos(i*2.1f)*.65f,3.25f+i*.28f,Mathf.Sin(i*2.1f)*.65f),leaf);
        }
        public static Transform Person(Transform parent,Color color,bool seated=false)
        {
            return HumanModels.Create(parent,color,seated);
        }
    }
}
