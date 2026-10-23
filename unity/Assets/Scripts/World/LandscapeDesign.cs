using UnityEngine;
using AnotherWorld.Rendering;
namespace AnotherWorld.World
{
    public static class LandscapeDesign
    {
        public static Material Surface(string name)=>Resources.Load<Material>("Landscaping/"+name);
        public static void Plant(Transform parent,string kind,Vector3 point,float scale=1)
        {
            var prefab=Resources.Load<GameObject>("Landscaping/"+kind);if(!prefab)return;
            var plant=Object.Instantiate(prefab,parent,false);plant.name=kind;plant.transform.localPosition=point;plant.transform.localScale=Vector3.one*scale;
            float yaw=Mathf.Repeat(point.x*31+point.z*19,360);plant.transform.localRotation=Quaternion.Euler(0,yaw,0);
            foreach(var renderer in plant.GetComponentsInChildren<MeshRenderer>())GpuMeshBatch.Register(renderer);
        }
        public static void Plot(Transform parent,Vector3 centre)
        {
            // Preserve the full docking recess and its pedestrian boarding area.
            foreach(var bay in TransitStops.BusBays())if((bay-centre).sqrMagnitude<26*26)return;
            var root=new GameObject("Landscaped plot edges").transform;root.SetParent(parent,false);root.localPosition=centre;
            var stone=Surface("Light paving");var glow=ElementalVisuals.Paint("Landscape cyan path inlay",new Color(.02f,.75f,.95f),true);
            foreach(int side in new[]{-1,1})
            {
                WorldShapes.Box(root,"Roadside stone kerb",new Vector3(.18f,.14f,27),new Vector3(side*17.85f,.2f,0),stone,true);
                WorldShapes.Box(root,"Roadside stone kerb",new Vector3(27,.14f,.18f),new Vector3(0,.2f,side*17.85f),stone,true);
                WorldShapes.Box(root,"Cyan pedestrian path edge",new Vector3(.035f,.018f,25),new Vector3(side*16.4f,.191f,0),glow);
                WorldShapes.Box(root,"Cyan pedestrian path edge",new Vector3(25,.018f,.035f),new Vector3(0,.191f,side*16.4f),glow);
                foreach(int end in new[]{-1,1})Bed(root,new Vector3(side*14.7f,0,end*10.5f));
                WorldShapes.Box(root,"Decorative gravel transition",new Vector3(.65f,.025f,8),new Vector3(side*14.8f,.205f,0),Surface("Decorative gravel"));
                var frontBed=new GameObject("Front lawn flower border").transform;frontBed.SetParent(root,false);frontBed.localPosition=new Vector3(side*9.5f,0,-14.7f);frontBed.localRotation=Quaternion.Euler(0,90,0);Bed(frontBed,Vector3.zero);
            }
            WorldShapes.Box(root,"Front entry path",new Vector3(3,.025f,4),new Vector3(0,.218f,-15.7f),stone);
        }
        static void Bed(Transform root,Vector3 p)
        {
            WorldShapes.Box(root,"Rich soil planting bed",new Vector3(1.5f,.08f,3.6f),p+Vector3.up*.23f,Surface("Soil"));
            foreach(int side in new[]{-1,1})WorldShapes.Box(root,"Narrow planting stone border",new Vector3(.1f,.15f,3.8f),p+new Vector3(side*.8f,.255f,0),Surface("Light paving"));
            foreach(int end in new[]{-1,1})WorldShapes.Box(root,"Narrow planting stone border",new Vector3(1.7f,.15f,.1f),p+new Vector3(0,.255f,end*1.85f),Surface("Light paving"));
            for(int n=0;n<3;n++)
            {
                Plant(root,"Shrub",p+new Vector3(.1f,.27f,n*1.05f-1.05f),.7f);
                Plant(root,n%2==0?"Purple flowers":"Gold flowers",p+new Vector3(-.4f,.27f,n*1.05f-.85f),.8f);
            }
        }
    }
}
