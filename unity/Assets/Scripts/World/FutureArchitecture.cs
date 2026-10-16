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
            var glass=WorldShapes.Material("Balcony glass",new Color(.13f,.32f,.4f),null,.85f);
            foreach(int side in new[]{-1,1})
            {
                WorldShapes.Box(root,"Full height facade rib",new Vector3(.18f,floors*3+.5f,.4f),new Vector3(side*4.35f,floors*1.5f,-4.65f),Alloy);
                for(int floor=0;floor<floors;floor++)
                {
                    WorldShapes.Box(root,"Cantilevered balcony",new Vector3(7.7f,.16f,1.1f),new Vector3(0,floor*3+.45f,side*4.9f),Alloy);
                    WorldShapes.Box(root,"Balcony balustrade",new Vector3(7.4f,.65f,.07f),new Vector3(0,floor*3+.85f,side*5.4f),glass);
                    WorldShapes.Box(root,"Floor light ribbon",new Vector3(8.6f,.055f,.04f),new Vector3(0,(floor+1)*3+.22f,side*4.74f),Light);
                }
            }
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
