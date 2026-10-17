using UnityEngine;

namespace AnotherWorld.World
{
    public static class NeighbourhoodArchitecture
    {
        public static void House(Transform parent,Vector3 location,float scale=1,bool interactive=false){VillaArchitecture.Build(parent,location,scale,interactive);}
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
            FutureArchitecture.Apartments(root,floors);

        }
    }
}

