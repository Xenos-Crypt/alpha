using UnityEngine;
namespace AnotherWorld.World
{
    public static class NeighbourhoodLife
    {
        public static int Residents,Children,Flowers,Butterflies,Ducks;
        public static void Build(Transform scenery,Transform moving)
        {
            Residents=Children=Flowers=Butterflies=Ducks=0;
            var field=new GameObject("Elemental practice field").transform;field.SetParent(scenery,false);field.position=new Vector3(-820,0,140);
            WorldShapes.Box(field,"Practice ground",new Vector3(40,.1f,40),Vector3.zero,WorldShapes.Material("Practice stone",new Color(.38f,.4f,.36f),"paving"),true);
            var practice=field.gameObject.AddComponent<WorldFacility>();practice.Name="Elemental practice field";practice.Kind="park";practice.Door=field.position+new Vector3(0,.3f,-18);practice.Action="Practice elemental powers";practice.Description="Open ground away from homes. 1-4: abilities, T: element. Meteor Slam: select ability, then click or tap the ground.";CityServices.Instance.Places.Add(practice);
            foreach(int side in new[]{-1,1})
            {
                var target=WorldShapes.Person(moving,new Color(.45f,.38f,.2f));target.name="Practice training target";target.position=field.position+new Vector3(side*8,.1f,6);
                var walker=target.gameObject.AddComponent<Traffic.CrossingWalker>();walker.Waypoints=new[]{target.position,target.position};walker.TrainingTarget=true;walker.WalkSpeed=0;
                var capsule=target.gameObject.AddComponent<CapsuleCollider>();capsule.height=1.8f;capsule.radius=.3f;capsule.center=Vector3.up*.9f;
            }
            for(int x=-3;x<3;x++)for(int z=-3;z<3;z++)Populate(scenery,moving,new Vector3(x*64+32,0,z*64+32),true);
            foreach(var district in WorldGeography.Districts)
                for(float x=district.xMin;x<district.xMax;x+=64)for(float z=district.yMin;z<district.yMax;z+=64)Populate(scenery,moving,new Vector3(x+32,0,z+32),false);
            Pond(scenery,moving,new Vector3(-260,.08f,150));Pond(scenery,moving,new Vector3(285,.08f,-90));
            foreach(int radius in new[]{64,192})
            {
                var loop=new[]{new Vector3(-radius,0,-radius),new Vector3(radius,0,-radius),new Vector3(radius,0,radius),new Vector3(-radius,0,radius)};
                for(int side=0;side<4;side++)for(int n=0;n<(radius==64?2:4);n++)UnityNeighbourhood.SpawnVehicle(moving,n==0&&side==0?"ambulance":"car",loop,side,24+n*64,new Color(.2f+(n%3)*.2f,.3f+side*.12f,.45f));
            }
            foreach(var district in WorldGeography.Districts)
            {
                var loop=new[]{new Vector3(district.xMin,0,district.yMin),new Vector3(district.xMax,0,district.yMin),new Vector3(district.xMax,0,district.yMax),new Vector3(district.xMin,0,district.yMax)};
                for(int side=0;side<4;side++)for(int n=0;n<2;n++)UnityNeighbourhood.SpawnVehicle(moving,n==0&&side==0?"ambulance":"car",loop,side,58+n*64,new Color(.25f+side*.12f,.42f,.35f+n*.2f));
            }
            var cycle=new[]{new Vector3(-192,0,0),new Vector3(192,0,0)};
            for(int i=0;i<4;i++){UnityNeighbourhood.SpawnVehicle(moving,"bicycle",cycle,i%2,30+i*47,new Color(.35f,.5f,.22f));UnityNeighbourhood.SpawnVehicle(moving,"motorcycle",cycle,i%2,70+i*47,new Color(.5f,.3f,.2f));}
            for(int i=0;i<22;i++)
            {
                var p=new Vector3(234+i%8*7,.15f,192+i/8*4);
                Resident(moving,p,new[]{p,p+Vector3.right*3,p+Vector3.forward*4},i%5==0);
            }
        }
        static void Populate(Transform scenery,Transform moving,Vector3 centre,bool central)
        {
            // Leave the original home and its collision regression fixture unchanged.
            for(int i=0;i<(central?5:3);i++)
            {
                var home=centre+new Vector3(-9+i*4,.2f,-11);
                var a=centre+new Vector3(-18,.2f,-18);var b=centre+new Vector3(18,.2f,-18);var c=centre+new Vector3(18,.2f,18);
                Resident(moving,i==0?home:Vector3.Lerp(a,b,i/5f),new[]{home,a,b,c,b,a},i==1);
            }
            foreach(int side in new[]{-1,1})
            {
                var tree=centre+new Vector3(side*12,.18f,-side*12);WorldShapes.Tree(scenery,tree);
                for(int f=0;f<6;f++)Flower(scenery,centre+new Vector3(side*13,.2f,-13+f*.65f),f);
            }
            if(central)
            {
                var root=new GameObject("Garden butterfly").transform;root.SetParent(moving,false);root.position=centre+new Vector3(13,1,-12);root.gameObject.AddComponent<GardenButterfly>();Butterflies++;
                if(Mathf.RoundToInt(centre.x+centre.z)%128==0)AnimalRoam.Create(moving,centre+new Vector3(-12,.2f,9),"Dog",0);
            }
        }
        static void Resident(Transform parent,Vector3 position,Vector3[] route,bool child)
        {
            var resident=WorldShapes.Person(parent,new Color(.25f+(Residents%4)*.12f,.35f+(Residents%3)*.12f,.42f));resident.name=child?"Child resident":"Neighbourhood resident";resident.position=position;
            if(child){resident.localScale=Vector3.one*.68f;Children++;}
            var walker=resident.gameObject.AddComponent<Traffic.CrossingWalker>();walker.Waypoints=route;walker.WalkSpeed=child?1.35f:1.15f+(Residents%3)*.15f;Residents++;
        }
        static void Flower(Transform parent,Vector3 p,int index)
        {
            WorldShapes.Box(parent,"Flower stem",new Vector3(.025f,.24f,.025f),p+Vector3.up*.12f,WorldShapes.Material("Flower green",new Color(.15f,.36f,.1f)));
            var colour=index%3==0?new Color(1,.55f,.1f):index%3==1?new Color(.9f,.2f,.55f):Color.white;
            for(int petal=0;petal<4;petal++){float a=petal*Mathf.PI*.5f;var flower=SmoothShapes.Part(parent,"Flower petals",SmoothShapes.Disc,new Vector3(.13f,.09f,1),p+new Vector3(Mathf.Cos(a)*.055f,.25f,Mathf.Sin(a)*.055f),WorldShapes.Material("Flower "+index%3,colour),true);flower.transform.localRotation=Quaternion.Euler(-90,0,0);}Flowers++;
        }
        static void Pond(Transform scenery,Transform moving,Vector3 p)
        {
            var root=new GameObject("Duck pond garden").transform;root.SetParent(scenery,false);root.position=p;
            var place=root.gameObject.AddComponent<WorldFacility>();place.Name=p.x<0?"West duck pond":"East duck pond";place.Kind="park";place.Door=p+new Vector3(-10,.3f,-8);place.Action="Visit garden";place.Description="Community pond with ducks, flower beds and garden wildlife.";CityServices.Instance.Places.Add(place);
            SmoothShapes.Part(root,"Pond bank",SmoothShapes.Tube,new Vector3(17,.2f,13),Vector3.zero,WorldShapes.Material("Pond bank",new Color(.32f,.43f,.22f)),true);
            SmoothShapes.Part(root,"Pond water",SmoothShapes.Tube,new Vector3(15,.025f,11),Vector3.up*.21f,WorldShapes.Material("Pond blue",new Color(.12f,.42f,.5f),null,.85f),true);
            for(int i=0;i<5;i++){var duck=new GameObject("Pond duck").transform;duck.SetParent(moving,false);duck.position=p+new Vector3(-4+i*2,.25f,i%2*2-1);duck.gameObject.AddComponent<PondDuck>();Ducks++;}
            for(int i=0;i<14;i++){float a=i*Mathf.PI/7;Flower(root,new Vector3(Mathf.Cos(a)*8.4f,.2f,Mathf.Sin(a)*6.5f),i);}
        }
    }
    public sealed class GardenButterfly : MonoBehaviour
    {
        Vector3 home;Transform left,right;float seed;
        void Start()
        {
            home=transform.position;seed=home.x*.17f+home.z*.13f;
            left=ElementalVisuals.Blob(transform,"Butterfly left wing",new Vector3(-.1f,0,0),new Vector3(.21f,.025f,.25f),new Color(1,.5f,.08f)).transform;
            right=ElementalVisuals.Blob(transform,"Butterfly right wing",new Vector3(.1f,0,0),new Vector3(.21f,.025f,.25f),new Color(.8f,.4f,.9f)).transform;
        }
        void Update()
        {
            if(Camera.main&&(Camera.main.transform.position-home).sqrMagnitude>10000)return;
            float t=Time.time+seed;transform.position=home+new Vector3(Mathf.Sin(t*.7f)*1.3f,Mathf.Sin(t*1.7f)*.4f,Mathf.Cos(t*.8f));left.localRotation=Quaternion.Euler(0,0,Mathf.Sin(t*24)*65);right.localRotation=Quaternion.Euler(0,0,-Mathf.Sin(t*24)*65);
        }
    }
    public sealed class PondDuck : MonoBehaviour
    {
        Vector3 home;float phase;
        void Start()
        {
            home=transform.position;phase=home.x;
            ElementalVisuals.Blob(transform,"Duck body",Vector3.up*.1f,new Vector3(.55f,.35f,.8f),new Color(.55f,.43f,.27f));
            ElementalVisuals.Blob(transform,"Duck head",new Vector3(0,.4f,.3f),Vector3.one*.3f,new Color(.06f,.3f,.15f));
            WorldShapes.Box(transform,"Duck bill",new Vector3(.16f,.06f,.2f),new Vector3(0,.43f,.48f),WorldShapes.Material("Duck bill",new Color(1,.65f,.06f)),false,false);
        }
        void Update(){if(Camera.main&&(Camera.main.transform.position-home).sqrMagnitude>22500)return;float t=Time.time*.25f+phase;transform.position=home+new Vector3(Mathf.Sin(t)*1.1f,Mathf.Sin(t*3)*.025f,Mathf.Cos(t)*.7f);transform.rotation=Quaternion.Euler(0,-t*Mathf.Rad2Deg,0);}
    }
}
