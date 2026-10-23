using System.IO;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using AnotherWorld.World;
namespace AnotherWorld.Editor
{
    public static class LandscapeAssets
    {
        const string Folder="Assets/Resources/Landscaping/";
        public static void Ensure()
        {
            Directory.CreateDirectory(Folder);
            Surface("Grass",new Color(.35f,.53f,.14f),"grass",.12f);
            Surface("Light paving",new Color(.88f,.91f,.92f),"paving",.25f);
            Surface("Dark asphalt",new Color(.72f,.76f,.79f),"asphalt",.12f);
            Surface("Soil",new Color(.26f,.16f,.09f),null,.05f);
            Surface("Decorative gravel",new Color(.65f,.66f,.61f),null,.18f);
            Prefab("Tree",0);Prefab("Small tree",1);Prefab("Shrub",2);Prefab("Purple flowers",3);Prefab("Gold flowers",4);
            AssetDatabase.SaveAssets();
        }
        static float Noise(int x,int y)
        {unchecked{uint n=(uint)(x*374761393+y*668265263);n=(n^(n>>13))*1274126177;return (n&65535)/65535f;}}
        static Material Surface(string name,Color tint,string existing,float smoothness)
        {
            string path=Folder+name+".mat";var material=AssetDatabase.LoadAssetAtPath<Material>(path);
            if(!material){material=new Material(Shader.Find("Universal Render Pipeline/Lit"));AssetDatabase.CreateAsset(material,path);}
            material.enableInstancing=true;material.SetFloat("_Smoothness",smoothness);
            if(existing=="grass"||existing=="paving"||existing==null)
            {
                foreach(bool normal in new[]{false,true})
                {
                    string texturePath=Folder+name+(normal?"-normal.png":"-diff.png");
                    if(!File.Exists(texturePath))
                    {
                        var texture=new Texture2D(256,256,TextureFormat.RGB24,false);
                        for(int y=0;y<256;y++)for(int x=0;x<256;x++)
                        {
                            float value=Height(name,x,y);
                            Color pixel=tint*Mathf.Lerp(.64f,1.28f,value);
                            if(normal){float dx=Height(name,(x+1)%256,y)-Height(name,(x+255)%256,y),dy=Height(name,x,(y+1)%256)-Height(name,x,(y+255)%256);var n=new Vector3(-dx*.6f,-dy*.6f,1).normalized;pixel=new Color(n.x*.5f+.5f,n.y*.5f+.5f,n.z*.5f+.5f);}
                            texture.SetPixel(x,y,pixel);
                        }
                        texture.Apply();File.WriteAllBytes(texturePath,texture.EncodeToPNG());Object.DestroyImmediate(texture);AssetDatabase.ImportAsset(texturePath);
                        var importer=(TextureImporter)AssetImporter.GetAtPath(texturePath);importer.textureType=normal?TextureImporterType.NormalMap:TextureImporterType.Default;importer.wrapMode=TextureWrapMode.Repeat;importer.maxTextureSize=256;importer.mipmapEnabled=true;importer.SaveAndReimport();
                    }
                    material.SetTexture(normal?"_BumpMap":"_BaseMap",AssetDatabase.LoadAssetAtPath<Texture2D>(texturePath));
                }
                material.SetColor("_BaseColor",Color.white);
            }
            else
            {
                material.SetColor("_BaseColor",tint);
                material.SetTexture("_BaseMap",Resources.Load<Texture2D>("Textures/"+existing+"-diff"));
                material.SetTexture("_BumpMap",Resources.Load<Texture2D>("Textures/"+existing+"-normal"));
            }
            material.SetFloat("_BumpScale",.35f);material.EnableKeyword("_NORMALMAP");EditorUtility.SetDirty(material);return material;
        }
        static float Height(string kind,int x,int y)
        {
            if(kind=="Light paving"){int edge=Mathf.Min(x%64,y%64,63-x%64,63-y%64);return edge<2?.12f:.76f+Noise(x,y)*.09f;}
            if(kind=="Decorative gravel")
            {
                float best=100;for(int a=-1;a<=1;a++)for(int b=-1;b<=1;b++){int cx=x/9+a,cy=y/9+b;float px=(cx+.15f+Noise((cx+29)%29,(cy+29)%29)*.7f)*9,py=(cy+.15f+Noise((cy+29)%29,(cx+29)%29)*.7f)*9;best=Mathf.Min(best,new Vector2(x-px,y-py).magnitude);}
                return Mathf.Clamp01(best/5)*.7f+Noise(x,y)*.3f;
            }
            return Noise(x,y)*.55f+Noise(x/3,y/3)*.3f+Noise(x/11,y/11)*.15f;
        }
        static Material Paint(string name,Color color)
        {
            string path=Folder+name+".mat";var m=AssetDatabase.LoadAssetAtPath<Material>(path);if(m)return m;m=new Material(Shader.Find("Universal Render Pipeline/Lit")){name=name,enableInstancing=true};m.SetColor("_BaseColor",color);m.SetFloat("_Smoothness",.12f);AssetDatabase.CreateAsset(m,path);return m;
        }
        static void Prefab(string name,int kind)
        {
            string path=Folder+name+".prefab";
            if(File.Exists(path))
            {
                var saved=AssetDatabase.LoadAssetAtPath<GameObject>(path);if(saved&&saved.GetComponent<VegetationAsset>())return;
                var contents=PrefabUtility.LoadPrefabContents(path);GameObjectUtility.RemoveMonoBehavioursWithMissingScript(contents);contents.AddComponent<VegetationAsset>().ViewDistance=kind<2?240:95;PrefabUtility.SaveAsPrefabAsset(contents,path);PrefabUtility.UnloadPrefabContents(contents);return;
            }
            var root=new GameObject(name);root.AddComponent<VegetationAsset>().ViewDistance=kind<2?240:95;
            var leaf=Paint("Leaf green",new Color(.23f,.42f,.075f));var bright=Paint("Leaf sunlit",new Color(.45f,.62f,.12f));
            var stems=new List<CombineInstance>();var leaves=new List<CombineInstance>();var tips=new List<CombineInstance>();
            if(kind<2)
            {
                float size=kind==0?1:.72f;
                Add(stems,SmoothShapes.Tube,new Vector3(0,0,0),new Vector3(.26f,3.8f*size,.26f));
                for(int n=0;n<18;n++)
                {
                    float angle=n*2.399f,r=1.5f*size*Mathf.Sqrt((n+.5f)/18);var p=new Vector3(Mathf.Cos(angle)*r,3*size+Noise(n,8)*1.6f*size,Mathf.Sin(angle)*r);
                    Add(n%3==0?tips:leaves,SmoothShapes.Ellipsoid,p,new Vector3(1.5f,.9f,1.35f)*size);
                }
                var collision=root.AddComponent<CapsuleCollider>();collision.radius=.2f;collision.height=3.3f*size;collision.center=Vector3.up*collision.height*.5f;
            }
            else for(int n=0;n<(kind==2?13:9);n++)
            {
                float angle=n*2.399f;var p=new Vector3(Mathf.Cos(angle)*.35f,Noise(n,5)*.2f,Mathf.Sin(angle)*.35f);
                if(kind==2)Add(n%3==0?tips:leaves,SmoothShapes.Ellipsoid,p,new Vector3(.58f,.55f,.58f));
                else
                {
                    float height=.35f+Noise(n,3)*.5f;Add(stems,SmoothShapes.Tube,p,new Vector3(.025f,height,.025f));
                    Add(leaves,SmoothShapes.Ellipsoid,p+Vector3.up*.1f,new Vector3(.3f,.14f,.18f));
                    for(int petal=0;petal<4;petal++)Add(tips,SmoothShapes.Ellipsoid,p+Vector3.up*height+new Vector3(Mathf.Cos(petal*1.57f)*.065f,0,Mathf.Sin(petal*1.57f)*.065f),new Vector3(.13f,.11f,.13f));
                }
            }
            SaveMesh(root,name,"Stems",stems,kind<2?Paint("Bark",new Color(.28f,.2f,.12f)):leaf);
            SaveMesh(root,name,"Foliage",leaves,leaf);
            SaveMesh(root,name,"Tips",tips,kind<3?bright:Paint(kind==3?"Purple petals":"Gold petals",kind==3?new Color(.64f,.28f,.75f):new Color(1,.65f,.12f)));
            PrefabUtility.SaveAsPrefabAsset(root,path);Object.DestroyImmediate(root);
        }
        static void Add(List<CombineInstance> parts,Mesh mesh,Vector3 p,Vector3 scale)=>parts.Add(new CombineInstance{mesh=mesh,transform=Matrix4x4.TRS(p,Quaternion.identity,scale)});
        static void SaveMesh(GameObject root,string asset,string part,List<CombineInstance> pieces,Material material)
        {
            if(pieces.Count==0)return;var mesh=new Mesh{name=asset+" "+part};mesh.CombineMeshes(pieces.ToArray());AssetDatabase.CreateAsset(mesh,Folder+asset+"-"+part+".asset");
            var child=new GameObject(part);child.transform.SetParent(root.transform,false);child.AddComponent<MeshFilter>().sharedMesh=mesh;child.AddComponent<MeshRenderer>().sharedMaterial=material;
        }
    }
}
