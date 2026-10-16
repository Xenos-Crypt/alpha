using UnityEngine;
namespace AnotherWorld.World
{
    public static class CivicArchitecture
    {
        public static void Build(Transform parent,Vector3 p,string kind,string name)
        {
            var root=new GameObject(name).transform;root.SetParent(parent,false);root.position=p;
            var wall=WorldShapes.Material("Civic ceramic",new Color(.62f,.73f,.77f),null,.5f);var trim=WorldShapes.Material("Civic stone",new Color(.76f,.74f,.66f));
            var wood=WorldShapes.Material("Civic furniture",new Color(.68f,.55f,.4f),"wood");var glass=WorldShapes.Material("Civic windows",new Color(.16f,.32f,.37f),null,.7f);
            WorldShapes.Box(root,"Public floor",new Vector3(22,.12f,18),new Vector3(0,.2f,0),trim,true);
            foreach(int s in new[]{-1,1})
            {
                WorldShapes.Box(root,"Side wall",new Vector3(.3f,3.6f,18),new Vector3(s*11,2,0),wall,true);
                WorldShapes.Box(root,"Front wing",new Vector3(8.8f,3.6f,.3f),new Vector3(s*6.6f,2,-9),wall,true);
                for(int n=0;n<3;n++)WorldShapes.Box(root,"Tall framed window",new Vector3(1.6f,1.6f,.055f),new Vector3(s*(3.2f+n*2.6f),2.1f,-9.18f),glass);
                WorldShapes.Box(root,"Entrance pillar",new Vector3(.35f,3.3f,.4f),new Vector3(s*2.2f,1.85f,-9.05f),trim,true);
            }
            WorldShapes.Box(root,"Rear wall",new Vector3(22,3.6f,.3f),new Vector3(0,2,9),wall,true);
            var roof=new GameObject("Civic roof").transform;roof.SetParent(root,false);
            WorldShapes.Box(roof,"Flat roof and coping",new Vector3(22.6f,.3f,18.6f),new Vector3(0,3.95f,0),trim);
            WorldShapes.Box(root,"Entrance canopy",new Vector3(5,.18f,1.8f),new Vector3(0,3,-9.5f),trim);
            WorldShapes.Label(root,name.ToUpperInvariant(),new Vector3(0,3.55f,-9.25f),name.Length>20?.075f:.1f);
            FutureArchitecture.Civic(root,roof,kind);
            var hide=root.gameObject.AddComponent<HouseRoof>();hide.Roof=roof.gameObject;hide.HalfWidth=11;hide.HalfDepth=9;
            if(kind=="market")
            {
                for(int i=0;i<8;i++){float x=(i%4-1.5f)*4,z=i<4?-2:4;
                    WorldShapes.Box(root,"Market stall",new Vector3(2.8f,.85f,1.4f),new Vector3(x,.7f,z),wood,true);
                    for(int n=0;n<4;n++)WorldShapes.Box(root,"Produce crate",new Vector3(.55f,.27f,.75f),new Vector3(x+(n-1.5f)*.62f,1.25f,z),WorldShapes.Material("Produce "+n,n%2==0?new Color(.5f,.64f,.19f):new Color(.78f,.23f,.15f)));
                }
            }
            else if(kind=="school"||kind=="library")
            {
                for(int row=0;row<3;row++)for(int col=0;col<4;col++){var at=new Vector3((col-1.5f)*3.7f,0,row*3-2);
                    WorldShapes.Box(root,"Study desk",new Vector3(1.4f,.12f,.85f),at+Vector3.up*.95f,wood,true);
                    WorldShapes.Box(root,"Desk support",new Vector3(.12f,.75f,.7f),at+new Vector3(-.55f,.55f,0),trim);
                    WorldShapes.Box(root,"Study chair",new Vector3(.6f,.6f,.6f),at+new Vector3(0,.5f,1),wood,true);
                }
                WorldShapes.Box(root,"Blackboard / bookshelves",new Vector3(14,1.6f,.3f),new Vector3(0,2.1f,8.7f),WorldShapes.Material("School green",new Color(.12f,.28f,.2f)));
            }
            else if(kind=="hospital")
            {
                for(int i=0;i<6;i++){var at=new Vector3(i%2==0?-6:6,0,(i/2)*3-2);WorldShapes.Box(root,"Patient bed",new Vector3(2,.7f,2.3f),at+Vector3.up*.6f,trim,true);WorldShapes.Box(root,"Pillow",new Vector3(1.3f,.2f,.45f),at+new Vector3(0,1.05f,.75f),glass);}
            }
            else
            {
                WorldShapes.Box(root,"Reception counter",new Vector3(7,1,1),new Vector3(0,.8f,4),wood,true);
                for(int s=-1;s<=1;s+=2)WorldShapes.Box(root,"Public bench",new Vector3(3,.7f,.7f),new Vector3(s*6,.6f,-3),wood,true);
            }
            if(kind=="police")for(int n=0;n<10;n++)WorldShapes.Box(root,"Custody partition",new Vector3(.055f,2.6f,.055f),new Vector3(5+n*.3f,1.6f,6),glass,true);
            var facility=root.gameObject.AddComponent<WorldFacility>();facility.Name=name;facility.Kind=kind;facility.Door=p+new Vector3(0,.3f,-10);
            facility.Description=kind=="market"?"Browse the food stalls and buy groceries for 10 coins.":kind=="school"?"Enter the classrooms and study to increase knowledge.":kind=="hospital"?"Public reception and patient ward. Treatment costs 5 coins.":kind=="library"?"Study desks and public reading room.":kind=="police"||kind=="court"?"Public reception. Settle an active traffic report here.":kind=="bank"?"Deposit your pocket money into savings.":"Public reception is open.";
            facility.Action=kind=="market"?"Buy groceries (10)":kind=="hospital"?"Receive treatment (5)":kind=="school"||kind=="library"?"Study":kind=="police"||kind=="court"?"Settle traffic report":kind=="bank"?"Deposit coins":"Visit reception";
            if(kind=="space"){facility.Description="Nine floors of mission control, engineering, laboratories and administration. Use the lift to visit the next floor.";facility.Action="Take lift to next floor";}
            CityServices.Instance.Places.Add(facility);
        }
    }
}
