using System.Collections.Generic;
using UnityEngine;
namespace AnotherWorld.World
{
    public sealed class ImpactCrater : MonoBehaviour
    {
        readonly List<Collider> originals=new List<Collider>();readonly List<Renderer> renderers=new List<Renderer>();
        public const float Radius=3.2f,Depth=.85f;
        public static int ActiveCount {get;private set;}
        public static ImpactCrater Create(Vector3 point)
        {
            var crater=new GameObject("Meteor impact dent").AddComponent<ImpactCrater>();crater.transform.position=point;ActiveCount++;
            foreach(var collider in Physics.OverlapSphere(point,Radius+.5f,~0,QueryTriggerInteraction.Ignore))
            {
                var existing=collider.GetComponent<DeformedImpactSurface>();if(existing){existing.Dent(point);continue;}
                if(!(collider is BoxCollider)||collider.bounds.size.y>.4f||Mathf.Abs(collider.bounds.max.y-point.y)>.4f)continue;
                var renderer=collider.GetComponent<MeshRenderer>();if(!renderer)continue;var bounds=collider.bounds;
                var xs=Axis(bounds.min.x,bounds.max.x,point.x);var zs=Axis(bounds.min.z,bounds.max.z,point.z);
                var vertices=new List<Vector3>();var uv=new List<Vector2>();var triangles=new List<int>();
                for(int x=0;x<xs.Count;x++)for(int z=0;z<zs.Count;z++)
                {
                    float r=Vector2.Distance(new Vector2(xs[x],zs[z]),new Vector2(point.x,point.z))/Radius;
                    float dent=r<1?Depth*Mathf.Pow(1-r*r,1.4f):0;
                    vertices.Add(new Vector3(xs[x],bounds.max.y-dent,zs[z])-point);uv.Add(new Vector2(xs[x],zs[z])*.5f);
                    if(x==xs.Count-1||z==zs.Count-1)continue;int a=x*zs.Count+z,b=a+zs.Count;triangles.AddRange(new[]{a,a+1,b,b,a+1,b+1});
                }
                var mesh=new Mesh{name="Deformed impact ground"};mesh.SetVertices(vertices);mesh.SetUVs(0,uv);mesh.SetTriangles(triangles,0);mesh.RecalculateNormals();mesh.RecalculateBounds();
                var patch=SmoothShapes.Part(crater.transform,"Dented ground surface",mesh,Vector3.one,Vector3.zero,renderer.sharedMaterial);patch.AddComponent<MeshCollider>().sharedMesh=mesh;
                var surface=patch.AddComponent<DeformedImpactSurface>();surface.GroundBounds=bounds;
                crater.originals.Add(collider);crater.renderers.Add(renderer);collider.enabled=false;renderer.enabled=false;
            }
            // A visible scorched rim follows the deformed bowl rather than covering it with a flat disk.
            var rim=ElementalVisuals.Ring(point,Radius,new Color(.15f,.075f,.025f));rim.name="Scorched crater rim";rim.transform.SetParent(crater.transform,true);rim.GetComponent<LineRenderer>().widthMultiplier=.35f;
            Destroy(crater.gameObject,120);return crater;
        }
        public static List<float> Axis(float min,float max,float centre)
        {
            var values=new SortedSet<float>{min,max};for(float v=min+128;v<max;v+=128)values.Add(v);
            for(float v=Mathf.Max(min,centre-Radius-.5f);v<Mathf.Min(max,centre+Radius+.5f);v+=.45f)if(v>min+.01f)values.Add(v);
            return new List<float>(values);
        }
        void OnDestroy(){foreach(var collider in originals)if(collider)collider.enabled=true;foreach(var renderer in renderers)if(renderer)renderer.enabled=true;ActiveCount--;}
    }
    public sealed class DeformedImpactSurface : MonoBehaviour
    {
        public Bounds GroundBounds;
        void OnDestroy(){var filter=GetComponent<MeshFilter>();if(filter&&filter.sharedMesh)Destroy(filter.sharedMesh);}
        public void Dent(Vector3 point)
        {
            var filter=GetComponent<MeshFilter>();var collider=GetComponent<MeshCollider>();var old=filter.sharedMesh;
            var xs=new SortedSet<float>(ImpactCrater.Axis(GroundBounds.min.x,GroundBounds.max.x,point.x));var zs=new SortedSet<float>(ImpactCrater.Axis(GroundBounds.min.z,GroundBounds.max.z,point.z));
            foreach(var vertex in old.vertices){var world=transform.TransformPoint(vertex);xs.Add(world.x);zs.Add(world.z);}
            var xValues=new List<float>(xs);var zValues=new List<float>(zs);var vertices=new List<Vector3>();var uv=new List<Vector2>();var triangles=new List<int>();
            for(int x=0;x<xValues.Count;x++)for(int z=0;z<zValues.Count;z++)
            {
                var world=new Vector3(xValues[x],GroundBounds.max.y+2,zValues[z]);float y=GroundBounds.max.y;
                if(collider.Raycast(new Ray(world,Vector3.down),out var hit,5))y=hit.point.y;
                float r=Vector2.Distance(new Vector2(world.x,world.z),new Vector2(point.x,point.z))/ImpactCrater.Radius;
                if(r<1)y=Mathf.Min(y,GroundBounds.max.y-ImpactCrater.Depth*Mathf.Pow(1-r*r,1.4f));
                vertices.Add(transform.InverseTransformPoint(new Vector3(world.x,y,world.z)));uv.Add(new Vector2(world.x,world.z)*.5f);
                if(x==xValues.Count-1||z==zValues.Count-1)continue;int a=x*zValues.Count+z,b=a+zValues.Count;triangles.AddRange(new[]{a,a+1,b,b,a+1,b+1});
            }
            var mesh=new Mesh{name="Repeated impact deformation",indexFormat=UnityEngine.Rendering.IndexFormat.UInt32};mesh.SetVertices(vertices);mesh.SetUVs(0,uv);mesh.SetTriangles(triangles,0);mesh.RecalculateNormals();mesh.RecalculateBounds();filter.sharedMesh=mesh;collider.sharedMesh=mesh;Destroy(old);
        }
    }
}
