using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace AnotherWorld.Rendering
{
    /// <summary>Explicit GPU instancing for shared vehicle parts and traffic lamps.</summary>
    [DefaultExecutionOrder(100)]
    public sealed class GpuMeshBatch : MonoBehaviour
    {
        sealed class Batch
        {
            public Mesh Mesh;public Material Material;
            public float MaxDistance=10000;
            public readonly List<Transform> Transforms=new List<Transform>();
            public readonly Matrix4x4[] Matrices=new Matrix4x4[500];
        }
        static GpuMeshBatch instance;
        readonly Dictionary<string,Batch> batches=new Dictionary<string,Batch>();
        public static void Register(MeshRenderer renderer)
        {
            if(!Application.isPlaying||!SystemInfo.supportsInstancing)return;
            if(!instance)instance=new GameObject("GPU mesh batches").AddComponent<GpuMeshBatch>();
            var mesh=renderer.GetComponent<MeshFilter>().sharedMesh;var material=renderer.sharedMaterial;
            if(!mesh||!material)return;material.enableInstancing=true;
            string key=mesh.GetEntityId()+":"+material.GetEntityId();
            if(!instance.batches.TryGetValue(key,out var batch))
            {batch=new Batch{Mesh=mesh,Material=material};instance.batches[key]=batch;}
            if(renderer.GetComponentInParent<AnotherWorld.World.ResidentGait>())batch.MaxDistance=160;
            batch.Transforms.Add(renderer.transform);renderer.enabled=false;
        }
        void LateUpdate()
        {
            var camera=Camera.main;if(!camera)return;
            foreach(var batch in batches.Values)
            {
                int count=0;
                float radius=Mathf.Min(batch.MaxDistance,camera.farClipPlane+20),distanceSquared=radius*radius;
                var parameters=new RenderParams(batch.Material){camera=camera,shadowCastingMode=ShadowCastingMode.On,receiveShadows=true,worldBounds=new Bounds(camera.transform.position,Vector3.one*((camera.farClipPlane+40)*2))};
                foreach(var transform in batch.Transforms)
                {
                    if(!transform||!transform.gameObject.activeInHierarchy||(transform.position-camera.transform.position).sqrMagnitude>distanceSquared)continue;
                    batch.Matrices[count++]=transform.localToWorldMatrix;
                    if(count==batch.Matrices.Length){Graphics.RenderMeshInstanced(parameters,batch.Mesh,0,batch.Matrices,count);count=0;}
                }
                if(count>0)Graphics.RenderMeshInstanced(parameters,batch.Mesh,0,batch.Matrices,count);
            }
        }
        void OnDestroy(){if(instance==this)instance=null;}
    }
}
