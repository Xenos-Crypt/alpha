using System.Collections.Generic;
using UnityEngine;
namespace AnotherWorld.World
{
    public static class ElementalVisuals
    {
        public static void OwnMesh(GameObject owner){owner.AddComponent<EffectMeshLifetime>().Value=owner.GetComponent<MeshFilter>().sharedMesh;}
        public static readonly Color Water=new Color(.08f,.48f,.9f),Foam=new Color(.8f,.96f,1),Fire=new Color(1,.18f,.015f);
        public static Material Paint(string name,Color colour,bool glow=false)
        {
            var material=WorldShapes.Material(name,colour,null,.65f);
            if(glow){material.EnableKeyword("_EMISSION");material.SetColor("_EmissionColor",colour*2);}
            return material;
        }
        public static GameObject Blob(Transform parent,string name,Vector3 position,Vector3 scale,Color colour)
        {return SmoothShapes.Part(parent,name,SmoothShapes.Ellipsoid,scale,position,Paint(name,colour));}
        public static LineRenderer Ribbon(Transform parent,string name,Color colour,float width)
        {
            var line=new GameObject(name).AddComponent<LineRenderer>();line.transform.SetParent(parent,false);line.sharedMaterial=Paint(name,colour,true);line.widthMultiplier=width;line.numCapVertices=4;line.numCornerVertices=3;line.useWorldSpace=true;line.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;return line;
        }
        public static GameObject Flame(Transform parent,Vector3 position,float scale=1)
        {
            var root=new GameObject("Flames");root.transform.SetParent(parent,false);root.transform.localPosition=position;
            var mesh=SmoothShapes.Profile("Flame tongue",new[]{new Vector2(0,0),new Vector2(.45f,.15f),new Vector2(.3f,.6f),new Vector2(.13f,.9f),new Vector2(0,1.5f)},8);
            for(int i=0;i<2;i++)
            {
                var emitter=new GameObject("Fire particles").AddComponent<ParticleSystem>();emitter.transform.SetParent(root.transform,false);
                var main=emitter.main;main.startLifetime=.5f;main.startSpeed=i==0?1.8f:1.3f;main.startSize=scale*(i==0?.38f:.2f);main.maxParticles=45;main.simulationSpace=ParticleSystemSimulationSpace.World;
                var emission=emitter.emission;emission.rateOverTime=28;
                var shape=emitter.shape;shape.shapeType=ParticleSystemShapeType.Cone;shape.radius=.12f*scale;shape.angle=18;shape.rotation=new Vector3(-90,0,0);
                var renderer=emitter.GetComponent<ParticleSystemRenderer>();renderer.renderMode=ParticleSystemRenderMode.Mesh;renderer.mesh=mesh;renderer.sharedMaterial=Paint(i==0?"Flame orange":"Flame core",i==0?Fire:new Color(1,.8f,.1f),true);
                var size=emitter.sizeOverLifetime;size.enabled=true;size.size=new ParticleSystem.MinMaxCurve(1,AnimationCurve.EaseInOut(0,1,1,0));
            }
            return root;
        }
        public static void StopFlames(GameObject flames)
        {if(!flames)return;foreach(var ps in flames.GetComponentsInChildren<ParticleSystem>())ps.Stop();Object.Destroy(flames,1);}
        public static GameObject Ring(Vector3 point,float radius,Color colour)
        {
            var line=Ribbon(null,"Ground target",colour,.075f);line.positionCount=49;
            for(int i=0;i<49;i++){float a=i*Mathf.PI/24;line.SetPosition(i,point+new Vector3(Mathf.Cos(a)*radius,.035f,Mathf.Sin(a)*radius));}return line.gameObject;
        }
        public static Mesh WaveMesh()
        {
            var profile=new[]{new Vector2(0,0),new Vector2(.1f,1.5f),new Vector2(.45f,3.4f),new Vector2(1.2f,5.1f),new Vector2(2.4f,6),new Vector2(3.6f,5.9f),new Vector2(4.2f,5.2f),new Vector2(3.6f,4.5f)};
            var vertices=new List<Vector3>();var triangles=new List<int>();
            for(int x=0;x<=16;x++)for(int j=0;j<profile.Length;j++)
            {
                vertices.Add(new Vector3(x-8,profile[j].y,profile[j].x));
                if(x==16||j==profile.Length-1)continue;int a=x*profile.Length+j,b=a+profile.Length;
                triangles.AddRange(new[]{a,b,a+1,a+1,b,b+1});
            }
            var mesh=new Mesh{name="Curling tsunami wall"};mesh.SetVertices(vertices);mesh.SetTriangles(triangles,0);mesh.RecalculateNormals();mesh.RecalculateBounds();return mesh;
        }
    }
    public sealed class EffectMeshLifetime : MonoBehaviour
    {
        public Mesh Value;
        void OnDestroy(){if(Value)Destroy(Value);}
    }
}
