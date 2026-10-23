using UnityEngine;
namespace AnotherWorld.World
{
    public static class FutureArchitecture
    {
        static Material Alloy=>WorldShapes.Material("Architectural titanium",new Color(.18f,.29f,.34f),null,.7f);
        static Material Light=>WorldShapes.Material("Architectural cyan",new Color(.1f,.8f,.92f),null,.65f);
        public static void House(Transform root,Transform roof)
        {
            foreach(int side in new[]{-1,1})
            {
                WorldShapes.Box(root,"Luminous entrance reveal",new Vector3(.055f,2.2f,.06f),new Vector3(side*1.15f,1.3f,-5.22f),Light);
                WorldShapes.Box(root,"Ceramic facade fin",new Vector3(.2f,3.1f,.65f),new Vector3(side*5.4f,1.7f,-5.15f),Alloy);
            }
            WorldShapes.Box(roof,"Solar ridge spine",new Vector3(12.9f,.08f,.5f),new Vector3(0,3.55f,0),Light);
            for(int n=0;n<5;n++)WorldShapes.Box(roof,"Solar cell seam",new Vector3(.055f,.05f,8.5f),new Vector3(-5+n*2.5f,3.53f,0),Alloy).transform.localRotation=Quaternion.identity;
        }
        public static void Apartments(Transform root,int floors)
        {
            var shell=WorldShapes.Material("Hidrok pearl armour",new Color(.58f,.64f,.75f),null,.45f);
            var dark=WorldShapes.Material("Hidrok graphite recess",new Color(.045f,.065f,.105f),null,.6f);
            var glass=WorldShapes.Material("Hidrok midnight glazing",new Color(.065f,.15f,.23f),null,.85f);
            var glow=ElementalVisuals.Paint("Hidrok architectural glow",new Color(.08f,.88f,.86f),true);
            shell.SetFloat("_Metallic",.3f);dark.SetFloat("_Metallic",.45f);
            float height=floors*3;
            WorldShapes.Box(root,"Structural graphite core",new Vector3(8.7f,height,8.7f),new Vector3(0,height*.5f+.15f,0),dark,true);
            for(int floor=0;floor<floors;floor++)
            {
                float y=floor*3;
                WorldShapes.Box(root,"Layered cantilever floor",new Vector3(10.1f,.28f,10.1f),new Vector3(0,y+.3f,0),shell,true);
                for(int face=0;face<4;face++)
                {
                    var facade=new GameObject("Armoured facade module").transform;facade.SetParent(root,false);facade.localRotation=Quaternion.Euler(0,face*90,0);
                    WorldShapes.Box(facade,"Recessed panoramic glazing",new Vector3(8.65f,1.18f,.12f),new Vector3(0,y+1.2f,-4.45f),glass);
                    WorldShapes.Box(facade,"Titanium spandrel panel",new Vector3(9.45f,.85f,.42f),new Vector3(0,y+2.3f,-4.52f),shell);
                    WorldShapes.Box(facade,"Dark panel reveal",new Vector3(8.9f,.07f,.025f),new Vector3(0,y+2.27f,-4.745f),dark);
                    WorldShapes.Box(facade,"Cyan service ribbon",new Vector3(9.1f,.065f,.045f),new Vector3(0,y+.52f,-4.73f),glow);
                    for(int n=-1;n<=1;n++)
                    {
                        WorldShapes.Box(facade,"Glazing mullion",new Vector3(.12f,1.2f,.18f),new Vector3(n*2.8f,y+1.2f,-4.55f),dark);
                        WorldShapes.Box(facade,"Panel joint",new Vector3(.055f,.64f,.03f),new Vector3(n*2.8f,y+2.3f,-4.75f),dark);
                    }
                    foreach(int side in new[]{-1,1})
                    {
                        var brace=WorldShapes.Box(facade,"Angled corner armour",new Vector3(.42f,2.5f,.52f),new Vector3(side*4.5f,y+1.65f,-4.55f),shell);
                        brace.transform.localRotation=Quaternion.Euler(0,0,side*9);
                    }
                }
            }
            WorldShapes.Box(root,"Overhanging armoured crown",new Vector3(10.3f,.36f,10.3f),new Vector3(0,height+.3f,0),shell,true);
            WorldShapes.Box(root,"Recessed roof machinery",new Vector3(7.4f,.85f,6.6f),new Vector3(0,height+.9f,0),dark);
            WorldShapes.Box(root,"Stepped crown cap",new Vector3(7.9f,.18f,7.1f),new Vector3(0,height+1.4f,0),shell);
            for(int n=-2;n<=2;n++)WorldShapes.Box(root,"Roof heat exchanger",new Vector3(5.8f,.12f,.13f),new Vector3(0,height+1.52f,n*.85f),Alloy);
            if(floors>=7)
            {
                var tower=SmoothShapes.Profile("Hidrok octagonal crown",new[]{new Vector2(0,0),new Vector2(2.2f,0),new Vector2(2.2f,7),new Vector2(0,7)},16);
                SmoothShapes.Part(root,"Cylindrical communications crown",tower,Vector3.one,new Vector3(0,height+1.5f,0),dark,true);
                for(int n=0;n<5;n++)SmoothShapes.Part(root,"Crown cyan band",SmoothShapes.Tube,new Vector3(4.5f,.12f,4.5f),new Vector3(0,height+1.8f+n*1.4f,0),glow,true);
            }
            // Stay within each existing plot: no skybridges across traffic lanes.
        }
        public static void Civic(Transform root,Transform roof,string kind)
        {
            foreach(int side in new[]{-1,1})
            {
                WorldShapes.Box(root,"Facade blade",new Vector3(.38f,5.3f,1),new Vector3(side*10.8f,2.8f,-9.2f),Alloy);
                WorldShapes.Box(root,"Architectural light seam",new Vector3(.07f,4.9f,.06f),new Vector3(side*10.57f,2.8f,-9.74f),Light);
            }
            WorldShapes.Box(roof,"Floating roof lip",new Vector3(23.3f,.12f,19.3f),new Vector3(0,4.2f,0),Alloy);
            for(int n=0;n<4;n++)WorldShapes.Box(roof,"Roof photovoltaic panel",new Vector3(3.5f,.1f,5),new Vector3(-7+n*4.5f,4.32f,3),Alloy);
            if(kind=="townhall"||kind=="office"||kind=="school"||kind=="technology")
            {
                var glass=WorldShapes.Material("Atrium glass",new Color(.1f,.3f,.38f),null,.85f);
                WorldShapes.Box(roof,"Raised glass atrium",new Vector3(10,2.4f,7),new Vector3(0,5.5f,2),glass);
                WorldShapes.Box(roof,"Atrium sunshade",new Vector3(11,.12f,8),new Vector3(0,6.8f,2),Alloy);
                for(int n=-2;n<=2;n++)if(n!=0)WorldShapes.Box(root,"Vertical facade shading",new Vector3(.08f,2,.55f),new Vector3(n*2.9f,2,-9.4f),Alloy);
            }
            if(kind=="industrial"||kind=="hangar")
            {
                foreach(int side in new[]{-1,1})WorldShapes.Box(roof,"Manufacturing skylight",new Vector3(6,.22f,10),new Vector3(side*5.5f,4.5f,1),Light);
                for(int n=-1;n<=1;n++)WorldShapes.Box(roof,"Ventilation stack",new Vector3(1.1f,1.5f,1.1f),new Vector3(n*3.2f,5,-4),Alloy);
            }
            if(kind=="church")
            {
                WorldShapes.Box(roof,"Chapel tower",new Vector3(2.4f,8,2.4f),new Vector3(7,8,4),Alloy,true);
                WorldShapes.Box(roof,"Chapel cross",new Vector3(.18f,2.4f,.18f),new Vector3(7,13,4),Light);
                WorldShapes.Box(roof,"Chapel cross arm",new Vector3(1.5f,.18f,.18f),new Vector3(7,13.4f,4),Light);
            }
            if(kind=="pub")
            {
                var wood=WorldShapes.Material("Pub walnut",new Color(.3f,.17f,.09f),"wood");
                WorldShapes.Box(root,"Pub bar",new Vector3(7,1.05f,1.2f),new Vector3(-5,.75f,4),wood,true);
                for(int n=0;n<4;n++)WorldShapes.Box(root,"Pub dining table",new Vector3(1.8f,.12f,1.4f),new Vector3(-6+n*4,.95f,-1),wood,true);
            }
        }
    }
}

