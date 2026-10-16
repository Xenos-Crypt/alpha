using UnityEngine;

namespace AnotherWorld.World
{
    public static class NeighbourhoodArchitecture
    {
        public static void House(Transform parent,Vector3 location)
        {
            var root=new GameObject("Hidrok courtyard residence").transform;root.SetParent(parent,false);root.localPosition=location;
            var brick=WorldShapes.Material("Pearl ceramic",new Color(.7f,.8f,.82f),null,.5f);var trim=WorldShapes.Material("Limestone",new Color(.78f,.75f,.66f));
            var roof=WorldShapes.Material("Photovoltaic roof",new Color(.07f,.19f,.26f),null,.75f);var dark=WorldShapes.Material("Frame",new Color(.16f,.2f,.2f));var glass=WorldShapes.Material("Glass",new Color(.28f,.4f,.46f),null,.82f);
            var wood=WorldShapes.Material("Floor",Color.white,"wood");var pavement=WorldShapes.Material("Path",Color.white,"paving");
            WorldShapes.Box(root,"Floor",new Vector3(12,.1f,10),new Vector3(0,.1f,0),wood,true);
            WorldShapes.Box(root,"Back",new Vector3(12,3,.3f),new Vector3(0,1.65f,5),brick,true);
            foreach(int side in new[]{-1,1})
            {
                WorldShapes.Box(root,"Side wall",new Vector3(.3f,3,10),new Vector3(side*6,1.65f,0),brick,true);
                // Openings in the front wall are assembled from sill, lintel and jamb sections.
                float cx=side*3.5f;WorldShapes.Box(root,"Window sill wall",new Vector3(5,.98f,.3f),new Vector3(cx,.64f,-5),brick,true);
                WorldShapes.Box(root,"Window lintel wall",new Vector3(5,.75f,.3f),new Vector3(cx,2.78f,-5),brick,true);
                foreach(float offset in new[]{-1.8f,1.8f})WorldShapes.Box(root,"Jamb wall",new Vector3(1.4f,1.27f,.3f),new Vector3(cx+offset,1.765f,-5),brick,true);
                Window(root,new Vector3(cx,1.76f,-5.01f),trim,dark,glass);
                WorldShapes.Box(root,"Stone corner",new Vector3(.44f,3,.44f),new Vector3(side*6,1.65f,-5),trim);
            }
            WorldShapes.Box(root,"Door lintel",new Vector3(2,.75f,.3f),new Vector3(0,2.78f,-5),brick);
            foreach(int side in new[]{-1,1})WorldShapes.Box(root,"Door frame",new Vector3(.12f,2.24f,.36f),new Vector3(side*1.04f,1.28f,-5.04f),trim);
            WorldShapes.Box(root,"Porch canopy",new Vector3(2.8f,.15f,1.1f),new Vector3(0,2.55f,-5.4f),dark);
            WorldShapes.Box(root,"Path",new Vector3(2,.04f,5),new Vector3(0,.18f,-7.5f),pavement);
            var roofRoot=new GameObject("Roof").transform;roofRoot.SetParent(root,false);
            WorldShapes.Box(roofRoot,"Floating ceramic roof",new Vector3(12.8f,.22f,10.8f),new Vector3(0,3.3f,0),trim);
            WorldShapes.Box(roofRoot,"Inset solar roof",new Vector3(11.6f,.08f,9.6f),new Vector3(0,3.46f,0),roof);
            WorldShapes.Box(roofRoot,"Living roof garden",new Vector3(4,.12f,2.1f),new Vector3(3.2f,3.55f,3.1f),WorldShapes.Material("Roof garden",new Color(.25f,.42f,.22f)));
            WorldShapes.Box(roofRoot,"Roof pergola",new Vector3(3.5f,.12f,2.5f),new Vector3(-3.4f,4.35f,2.9f),dark);
            foreach(int side in new[]{-1,1})WorldShapes.Box(roofRoot,"Pergola upright",new Vector3(.08f,.9f,.08f),new Vector3(-3.4f+side*1.65f,3.9f,3.9f),dark);
            FutureArchitecture.House(root,roofRoot);
            var hide=root.gameObject.AddComponent<HouseRoof>();hide.Roof=roofRoot.gameObject;
            WorldShapes.Label(root,"20",new Vector3(1.62f,1.7f,-5.2f),.11f);
            // A few visible interior objects retain a traversable central aisle.
            WorldShapes.Box(root,"Sofa",new Vector3(2.3f,.7f,.8f),new Vector3(-3.7f,.5f,1.7f),WorldShapes.Material("Sofa",new Color(.26f,.4f,.42f)),true);
            WorldShapes.Box(root,"Table",new Vector3(1.5f,.12f,.9f),new Vector3(3.4f,.8f,1.5f),wood,true);
            WorldShapes.Box(root,"Bed",new Vector3(2,.6f,2.8f),new Vector3(-3.7f,.4f,3.2f),trim,true);
            WorldShapes.Box(root,"Kitchen counter",new Vector3(3,.9f,.65f),new Vector3(3.9f,.65f,4.45f),wood,true);
            WorldShapes.Box(root,"Worktop",new Vector3(3.1f,.08f,.75f),new Vector3(3.9f,1.14f,4.45f),trim);
            WorldShapes.Box(root,"Fridge",new Vector3(.8f,1.8f,.75f),new Vector3(1.7f,1.1f,4.35f),trim,true);
            WorldShapes.Box(root,"Wardrobe",new Vector3(1.6f,2.1f,.7f),new Vector3(-5.3f,1.25f,3.8f),wood,true);
            WorldShapes.Box(root,"Television stand",new Vector3(1.4f,.5f,.5f),new Vector3(-3.7f,.45f,-1.5f),wood,true);
            WorldShapes.Box(root,"Television",new Vector3(1.35f,.8f,.08f),new Vector3(-3.7f,1.1f,-1.5f),dark);
            WorldShapes.Box(root,"Living room rug",new Vector3(3,.015f,2),new Vector3(-3.7f,.158f,.1f),WorldShapes.Material("Woven rug",new Color(.55f,.3f,.22f)));
            for(int side=-1;side<=1;side+=2){WorldShapes.Box(root,"Dining chair seat",new Vector3(.55f,.1f,.55f),new Vector3(3.4f+side*1.1f,.62f,1.5f),wood,true);WorldShapes.Box(root,"Dining chair back",new Vector3(.12f,.7f,.55f),new Vector3(3.4f+side*1.35f,.85f,1.5f),wood,true);}
        }
        static void Window(Transform root,Vector3 p,Material trim,Material dark,Material glass)
        {
            foreach(int side in new[]{-1,1})
            {
                WorldShapes.Box(root,"Window frame",new Vector3(.11f,1.3f,.21f),p+new Vector3(side*.95f,0,-.05f),trim);
                WorldShapes.Box(root,"Window frame",new Vector3(2,.1f,.21f),p+new Vector3(0,side*.6f,-.05f),trim);
            }
            WorldShapes.Box(root,"Glass",new Vector3(1.82f,1.1f,.045f),p+new Vector3(0,0,.08f),glass,true);
            WorldShapes.Box(root,"Mullion",new Vector3(.06f,1.2f,.09f),p+new Vector3(0,0,-.07f),dark);
            WorldShapes.Box(root,"Mullion",new Vector3(1.9f,.06f,.09f),p+new Vector3(0,0,-.07f),dark);
            WorldShapes.Box(root,"Stone sill",new Vector3(2.15f,.12f,.42f),p+new Vector3(0,-.72f,-.12f),trim);
        }
        public static void Apartments(Transform parent,Vector3 p,int floors)
        {
            var root=new GameObject("Apartment block").transform;root.SetParent(parent,false);root.localPosition=p;
            var brick=WorldShapes.Material("Apartment brick",new Color(.65f,.75f,.79f),null,.5f);var trim=WorldShapes.Material("Apartment trim",new Color(.64f,.65f,.59f));var glass=WorldShapes.Material("Apartment glass",new Color(.23f,.32f,.36f),null,.7f);
            WorldShapes.Box(root,"Walls",new Vector3(9,floors*3,9),new Vector3(0,floors*1.5f+.15f,0),brick,true);
            for(int floor=0;floor<floors;floor++)
            {
                WorldShapes.Box(root,"Cornice",new Vector3(9.3f,.14f,9.3f),new Vector3(0,(floor+1)*3+.12f,0),trim);
                for(int side=-1;side<=1;side+=2)for(int col=-1;col<=1;col++)
                {
                    WorldShapes.Box(root,"Window",new Vector3(1.6f,1.3f,.06f),new Vector3(col*2.6f,floor*3+1.8f,side*4.55f),glass);
                    WorldShapes.Box(root,"Window sill",new Vector3(1.84f,.14f,.3f),new Vector3(col*2.6f,floor*3+1.05f,side*4.57f),trim);
                    WorldShapes.Box(root,"Window",new Vector3(.06f,1.3f,1.6f),new Vector3(side*4.55f,floor*3+1.8f,col*2.6f),glass);
                }
            }
            FutureArchitecture.Apartments(root,floors);
            WorldShapes.Box(root,"Roof coping",new Vector3(9.5f,.3f,9.5f),new Vector3(0,floors*3+.4f,0),trim);
        }
    }
}
