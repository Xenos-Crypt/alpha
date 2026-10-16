using UnityEngine;
using AnotherWorld.Rendering;
namespace AnotherWorld.World
{
    public static class HoverVehicleModel
    {
        public static GameObject Create(string kind,Transform parent,Color color,out Transform[] wheels)
        {
            var root=new GameObject("Hidrok hover "+kind);root.transform.SetParent(parent,false);wheels=new Transform[0];
            bool bike=kind=="bicycle"||kind=="motorcycle",bus=kind=="bus",ambulance=kind=="ambulance";
            float length=bus?10:ambulance?5.65f:bike?2.1f:4.4f,width=bus?2.5f:ambulance?2.3f:bike?.8f:2.1f;
            var paint=WorldShapes.Material("Hover paint",kind=="police"?Color.white:ambulance?new Color(.93f,.95f,.94f):color,null,.65f);
            var glass=WorldShapes.Material("Polarised canopy",new Color(.055f,.15f,.21f),null,.92f);
            var alloy=WorldShapes.Material("Hover graphite",new Color(.11f,.16f,.2f),null,.65f);
            var glow=WorldShapes.Material("Induction cyan",new Color(.05f,.8f,1),null,.8f);glow.EnableKeyword("_EMISSION");glow.SetColor("_EmissionColor",new Color(0,.75f,1)*2);
            Part(root.transform,"Streamlined hull",SmoothShapes.Ellipsoid,new Vector3(width,bike?.45f:.85f,length),new Vector3(0,.38f,0),paint);
            if(bike)
            {
                Part(root.transform,"Saddle",SmoothShapes.Ellipsoid,new Vector3(.45f,.18f,.75f),new Vector3(0,.95f,-.25f),alloy);
                WorldShapes.Box(root.transform,"Control bar",new Vector3(.75f,.08f,.1f),new Vector3(0,1.28f,.45f),alloy,false,false);
                Part(root.transform,"Front cowling",SmoothShapes.Ellipsoid,new Vector3(.65f,.5f,.6f),new Vector3(0,.75f,.65f),paint);
            }
            else
            {
                float height=bus?2:ambulance?1.65f:1.15f;
                Part(root.transform,"Passenger canopy",SmoothShapes.Ellipsoid,new Vector3(width*.9f,height,length*.76f),new Vector3(0,1,-.15f),glass);
                WorldShapes.Box(root.transform,"Floating roof",new Vector3(width*.72f,.12f,length*.55f),new Vector3(0,1+height*.89f,-.2f),paint,false,false);
                foreach(int side in new[]{-1,1})
                {
                    WorldShapes.Box(root.transform,"Belt trim",new Vector3(.055f,.1f,length*.7f),new Vector3(side*width*.47f,1.12f,0),paint,false,false);
                    if(bus)for(int n=-3;n<=3;n++)WorldShapes.Box(root.transform,"Window pillar",new Vector3(.045f,1.05f,.09f),new Vector3(side*width*.4f,1.7f,n*1.05f),paint,false,false);
                    if(ambulance)
                    {
                        WorldShapes.Box(root.transform,"Medical cross upright",new Vector3(.06f,.7f,.2f),new Vector3(side*1.06f,1.6f,-.7f),WorldShapes.Material("Medical red",new Color(.9f,.025f,.04f)),false,false);
                        WorldShapes.Box(root.transform,"Medical cross arm",new Vector3(.06f,.2f,.7f),new Vector3(side*1.07f,1.6f,-.7f),WorldShapes.Material("Medical red",new Color(.9f,.025f,.04f)),false,false);
                    }
                }
                if(kind=="police"||ambulance)
                {
                    WorldShapes.Box(root.transform,"Emergency blue",new Vector3(.65f,.14f,.27f),new Vector3(-.36f,1+height,.05f),WorldShapes.Material("Emergency blue",new Color(.02f,.15f,1)),false,false);
                    WorldShapes.Box(root.transform,"Emergency red",new Vector3(.65f,.14f,.27f),new Vector3(.36f,1+height,.05f),WorldShapes.Material("Emergency red",Color.red),false,false);
                    WorldShapes.Label(root.transform,ambulance?"AMBULANCE":"POLICE",new Vector3(0,1.05f,-length*.5f-.02f),.065f);
                }
            }
            foreach(int side in new[]{-1,1})foreach(int end in new[]{-1,1})
            {
                Part(root.transform,"Induction nacelle",SmoothShapes.Ellipsoid,new Vector3(width*.27f,.26f,length*.24f),new Vector3(side*width*.38f,.28f,end*length*.31f),alloy);
                Part(root.transform,"Levitation field",SmoothShapes.Tube,new Vector3(width*.23f,.035f,length*.18f),new Vector3(side*width*.38f,.25f,end*length*.31f),glow);
            }
            WorldShapes.Box(root.transform,"Headlight strip",new Vector3(width*.65f,.08f,.035f),new Vector3(0,.85f,length*.47f),glow,false,false);
            WorldShapes.Box(root.transform,"Tail lights",new Vector3(width*.7f,.065f,.035f),new Vector3(0,.8f,-length*.47f),WorldShapes.Material("Tail red",new Color(.9f,.02f,.04f)),false,false);
            var collider=root.AddComponent<BoxCollider>();collider.size=new Vector3(width,bus?3:ambulance?2.7f:bike?1.5f:2.1f,length);collider.center=Vector3.up*(collider.size.y*.5f);
            return root;
        }
        static void Part(Transform parent,string name,Mesh mesh,Vector3 size,Vector3 position,Material m)
        {var go=SmoothShapes.Part(parent,name,mesh,size,position,m);GpuMeshBatch.Register(go.GetComponent<MeshRenderer>());}
    }
}
