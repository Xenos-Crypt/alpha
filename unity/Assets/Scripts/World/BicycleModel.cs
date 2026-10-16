using UnityEngine;
using AnotherWorld.Rendering;
namespace AnotherWorld.World
{
    public static class BicycleModel
    {
        static void Part(Transform p,string n,Mesh mesh,Vector3 size,Vector3 pos,Material m,Quaternion rotation)
        {var go=SmoothShapes.Part(p,n,mesh,size,pos,m);go.transform.localRotation=rotation;GpuMeshBatch.Register(go.GetComponent<MeshRenderer>());}
        static void Tube(Transform p,Vector3 a,Vector3 b,float diameter,Material m)
        {Part(p,"Frame tube",SmoothShapes.Tube,new Vector3(diameter,(b-a).magnitude,diameter),a,m,Quaternion.FromToRotation(Vector3.up,b-a));}
        public static GameObject Create(Transform parent,Color color,out Transform[] wheels)
        {
            var root=new GameObject("Commuter bicycle");root.transform.SetParent(parent,false);wheels=new Transform[2];
            var rubber=WorldShapes.Material("Bicycle rubber",new Color(.035f,.04f,.04f),null,.12f);
            var steel=WorldShapes.Material("Bicycle alloy",new Color(.56f,.59f,.58f),null,.65f);
            var paint=WorldShapes.Material("Bicycle frame",color,null,.42f);
            var tyre=SmoothShapes.Profile("Open bicycle tyre",new[]{new Vector2(.345f,0),new Vector2(.365f,.014f),new Vector2(.365f,.041f),new Vector2(.345f,.055f),new Vector2(.325f,.041f),new Vector2(.325f,.014f),new Vector2(.345f,0)},24);
            var rim=SmoothShapes.Profile("Open bicycle rim",new[]{new Vector2(.324f,0),new Vector2(.328f,.004f),new Vector2(.328f,.023f),new Vector2(.312f,.023f),new Vector2(.312f,0),new Vector2(.324f,0)},24);
            for(int i=0;i<2;i++)
            {
                var wheel=new GameObject("Spoked wheel").transform;wheel.SetParent(root.transform,false);wheel.localPosition=new Vector3(0,.365f,i==0?-.85f:.85f);wheels[i]=wheel;
                Part(wheel,"Tyre ring",tyre,Vector3.one,new Vector3(.0275f,0,0),rubber,Quaternion.Euler(0,0,90));
                Part(wheel,"Alloy rim",rim,Vector3.one,new Vector3(.0115f,0,0),steel,Quaternion.Euler(0,0,90));
                Tube(wheel,new Vector3(-.045f,0,0),new Vector3(.045f,0,0),.065f,steel);
                for(int n=0;n<16;n++){float angle=n*Mathf.PI/8;Tube(wheel,new Vector3(n%2==0?.02f:-.02f,0,0),new Vector3(0,Mathf.Sin(angle)*.314f,Mathf.Cos(angle)*.314f),.006f,steel);}
            }
            var rear=new Vector3(0,.365f,-.85f);var crank=new Vector3(0,.49f,-.13f);var seat=new Vector3(0,1.04f,-.31f);var stem=new Vector3(0,1.09f,.55f);
            Tube(root.transform,rear,seat,.035f,paint);Tube(root.transform,rear,crank,.035f,paint);Tube(root.transform,crank,seat,.035f,paint);
            Tube(root.transform,seat,stem,.035f,paint);Tube(root.transform,crank,stem,.035f,paint);
            foreach(int side in new[]{-1,1}){Tube(root.transform,new Vector3(side*.055f,.365f,.85f),stem,.03f,steel);Tube(root.transform,stem,new Vector3(side*.33f,1.25f,.26f),.026f,steel);Tube(root.transform,new Vector3(side*.23f,1.25f,.26f),new Vector3(side*.34f,1.25f,.26f),.045f,rubber);}
            Tube(root.transform,seat,seat+Vector3.up*.04f,.026f,steel);
            Part(root.transform,"Saddle",SmoothShapes.Ellipsoid,new Vector3(.19f,.055f,.29f),new Vector3(0,1.07f,-.31f),rubber,Quaternion.identity);
            foreach(int side in new[]{-1,1}){Tube(root.transform,crank,new Vector3(side*.2f,.49f,-.13f),.02f,steel);Part(root.transform,"Pedal",SmoothShapes.Ellipsoid,new Vector3(.12f,.035f,.1f),new Vector3(side*.2f,.49f,-.13f),rubber,Quaternion.identity);}
            var collider=root.AddComponent<BoxCollider>();collider.size=new Vector3(.7f,1.3f,2);collider.center=Vector3.up*.65f;return root;
        }
    }
}
