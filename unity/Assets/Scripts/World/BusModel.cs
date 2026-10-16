using UnityEngine;
using AnotherWorld.Rendering;
namespace AnotherWorld.World
{
    public static class BusModel
    {
        public static GameObject Create(Transform parent,out Transform[] wheels)
        {
            var root=new GameObject("City bus");root.transform.SetParent(parent,false);
            var paint=WorldShapes.Material("Bus body",new Color(.2f,.44f,.58f));var trim=WorldShapes.Material("Bus trim",new Color(.82f,.84f,.78f));
            var glass=WorldShapes.Material("Bus windows",new Color(.12f,.23f,.27f),null,.75f);var tyre=WorldShapes.Material("Bus tyres",new Color(.035f,.04f,.04f));
            WorldShapes.Box(root.transform,"Lower body",new Vector3(2.5f,.9f,10),new Vector3(0,.95f,0),paint,true,false);
            WorldShapes.Box(root.transform,"Cabin",new Vector3(2.45f,1.65f,9.9f),new Vector3(0,2.15f,0),trim,false,false);
            WorldShapes.Box(root.transform,"Roof",new Vector3(2.55f,.2f,10),new Vector3(0,3.05f,0),paint,false,false);
            foreach(int side in new[]{-1,1})for(int n=0;n<7;n++)WorldShapes.Box(root.transform,"Passenger window",new Vector3(.035f,.95f,1.08f),new Vector3(side*1.24f,2.3f,-3.9f+n*1.3f),glass,false,false);
            WorldShapes.Box(root.transform,"Windscreen",new Vector3(2.1f,1.08f,.04f),new Vector3(0,2.15f,5.015f),glass,false,false);
            WorldShapes.Label(root.transform,"ASHFORD 01",new Vector3(0,2.86f,5.025f),.065f,false);
            wheels=new Transform[4];int i=0;
            foreach(int side in new[]{-1,1})foreach(float z in new[]{-3.15f,3.15f})
            {
                var pivot=new GameObject("Bus wheel").transform;pivot.SetParent(root.transform,false);pivot.localPosition=new Vector3(side*1.22f,.48f,z);wheels[i++]=pivot;
                var go=SmoothShapes.Part(pivot,"Tyre",SmoothShapes.Tube,new Vector3(.96f,.24f,.96f),new Vector3(.12f,0,0),tyre);go.transform.localRotation=Quaternion.Euler(0,0,90);GpuMeshBatch.Register(go.GetComponent<MeshRenderer>());
                var rim=SmoothShapes.Part(pivot,"Hub",SmoothShapes.Tube,new Vector3(.55f,.255f,.55f),new Vector3(.1275f,0,0),trim);rim.transform.localRotation=Quaternion.Euler(0,0,90);GpuMeshBatch.Register(rim.GetComponent<MeshRenderer>());
            }
            var collider=root.AddComponent<BoxCollider>();collider.size=new Vector3(2.5f,3,10);collider.center=Vector3.up*1.5f;return root;
        }
    }
}
