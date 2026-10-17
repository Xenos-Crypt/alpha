using System.Collections.Generic;
using UnityEngine;
namespace AnotherWorld.World
{
    public static class VillaArchitecture
    {
        const float Floor=.79f;
        static Material Pearl=>WorldShapes.Material("Villa pearl stone",new Color(.79f,.83f,.89f),null,.55f);
        static Material Metal=>WorldShapes.Material("Villa midnight aluminium",new Color(.035f,.07f,.13f),null,.8f);
        static Material Oak=>WorldShapes.Material("Villa warm oak",new Color(.69f,.49f,.31f),"wood",.3f);
        static Material Fabric=>WorldShapes.Material("Villa lavender linen",new Color(.54f,.53f,.67f),null,.2f);
        static Material Glow {get{var material=ElementalVisuals.Paint("Villa cyan lighting",new Color(.025f,.6f,1),true);material.SetColor("_EmissionColor",new Color(.025f,.6f,1)*4);return material;}}
        static Material Warm=>ElementalVisuals.Paint("Villa warm lighting",new Color(1,.76f,.4f),true);
        public static void Build(Transform parent,Vector3 location,float scale=1,bool interactive=false)
        {
            var root=new GameObject("Hidrok glass villa").transform;root.SetParent(parent,false);root.localPosition=location;root.localScale=Vector3.one*scale;
            var roof=new GameObject("Floating villa roof").transform;roof.SetParent(root,false);
            var interior=new GameObject("Furnished villa interior").transform;interior.SetParent(root,false);
            var glass=Resources.Load<Material>("Materials/VillaGlass");var water=Resources.Load<Material>("Materials/VillaWater");
            var panes=new List<Renderer>();
            Box(root,"Front limestone terrace",new Vector3(13.6f,.04f,2.1f),new Vector3(0,.235f,-6.45f),Pearl,true);
            Box(root,"Pool promenade",new Vector3(14.8f,.05f,1.35f),new Vector3(0,.23f,-12),Pearl,true);
            Box(root,"Side garden promenade",new Vector3(.6f,.05f,18.3f),new Vector3(-7.05f,.23f,-2.2f),Pearl,true);
            Box(root,"Rear garden terrace",new Vector3(14.8f,.05f,1.5f),new Vector3(0,.23f,6.2f),Pearl,true);
            // Raised, layered terrace and warm continuous interior floor.
            Box(root,"Floating stone plinth",new Vector3(13,.48f,10.8f),new Vector3(0,.46f,0),Pearl,true);
            Box(root,"Dark plinth reveal",new Vector3(13.1f,.09f,10.9f),new Vector3(0,.715f,0),Metal);
            Box(root,"Oak living floor",new Vector3(12.3f,.12f,10.2f),new Vector3(0,Floor-.06f,0),Oak,true);
            Box(root,"Illuminated terrace edge",new Vector3(13.1f,.035f,.035f),new Vector3(0,.68f,-5.47f),Glow);
            foreach(int side in new[]{-1,1})
            {
                Box(root,"Slender corner column",new Vector3(.095f,3.52f,.095f),new Vector3(side*6,2.5f,-5),Metal,true);
                Box(root,"Slender rear column",new Vector3(.095f,3.52f,.095f),new Vector3(side*6,2.5f,5),Metal,true);
                Pane(root,"Clear front glazing",new Vector3(4.85f,3.36f,.055f),new Vector3(side*3.56f,2.48f,-5),glass,panes);
                Pane(root,"Full-height side glazing",new Vector3(.055f,3.36f,9.9f),new Vector3(side*6,2.48f,0),glass,panes);
                Pane(root,"Rear garden glazing",new Vector3(4.2f,3.36f,.055f),new Vector3(side*3.85f,2.48f,5),glass,panes);
                Box(root,"Sliding door jamb",new Vector3(.07f,3.4f,.12f),new Vector3(side*1.1f,2.48f,-5.03f),Metal,true);
                Box(root,"Side glass joint",new Vector3(.07f,3.4f,.055f),new Vector3(side*6.01f,2.48f,.6f),Metal);
                Box(root,"Side window base rail",new Vector3(.09f,.055f,10),new Vector3(side*6,.82f,0),Metal);
            }
            // The central two-metre doorway stays open and traversable.
            Box(root,"Recessed entry header",new Vector3(2.22f,.08f,.14f),new Vector3(0,4.12f,-5.03f),Metal);
            Box(root,"Oak privacy core",new Vector3(3.35f,3.4f,.14f),new Vector3(0,2.48f,4.95f),Oak,true);
            Box(roof,"Deep midnight roof fascia",new Vector3(13.8f,.32f,11.8f),new Vector3(0,4.43f,0),Metal);
            var roofHull=new GameObject("Structural roof collider");roofHull.transform.SetParent(root,false);var roofCollider=roofHull.AddComponent<BoxCollider>();roofCollider.center=new Vector3(0,4.43f,0);roofCollider.size=new Vector3(13.8f,.32f,11.8f);
            Box(roof,"Pale cantilever roof cap",new Vector3(13.86f,.1f,11.86f),new Vector3(0,4.64f,0),Pearl);
            Box(roof,"Recessed warm ceiling",new Vector3(12.6f,.08f,10.6f),new Vector3(0,4.2f,0),WorldShapes.Material("Villa ceiling",new Color(.75f,.72f,.76f)));
            foreach(int side in new[]{-1,1})
            {
                Box(roof,"Cyan roofline",new Vector3(13.82f,.045f,.045f),new Vector3(0,4.275f,side*5.91f),Glow);
                Box(roof,"Cyan roofline",new Vector3(.045f,.045f,11.82f),new Vector3(side*6.91f,4.275f,0),Glow);
                Box(roof,"Inset ceiling light",new Vector3(10.9f,.025f,.035f),new Vector3(0,4.145f,side*4.3f),Glow);
            }
            for(int i=0;i<6;i++)SmoothShapes.Part(roof,"Recessed warm downlight",SmoothShapes.Disc,new Vector3(.14f,.015f,.14f),new Vector3(-4+(i%3)*4,4.14f,i<3?-2.5f:2.5f),Warm,true);
            for(int i=0;i<5;i++)
            {
                float top=.31f+i*.12f;Box(root,"Entry terrace step",new Vector3(2.4f,top-.18f,.48f),new Vector3(0,(top+.18f)/2,-7.05f+i*.4f),Pearl,true);
                Box(root,"Illuminated stair nosing",new Vector3(2.25f,.025f,.035f),new Vector3(0,top-.035f,-7.30f+i*.4f),Warm);
            }
            Box(root,"Entrance garden walk",new Vector3(2.45f,.065f,4.5f),new Vector3(0,.215f,-9.5f),Pearl,true);
            Pool(root,new Vector3(-4.05f,0,-9.4f),new Vector2(5.25f,3.65f),water);
            Pool(root,new Vector3(4.05f,0,-9.4f),new Vector2(5.25f,3.65f),water);
            Pool(root,new Vector3(6.92f,0,-.1f),new Vector2(.85f,10.6f),water);
            Furnish(interior,interactive);
            Curtains(interior);
            Planter(root,new Vector3(-5.9f,.24f,-6.4f),.65f);Planter(root,new Vector3(5.7f,.24f,-6.45f),.65f);
            Planter(root,new Vector3(-6.3f,.24f,6.3f),.7f);Planter(root,new Vector3(6.2f,.24f,6.3f),.7f);
            WorldShapes.Label(root,"20",new Vector3(1.46f,1.7f,-5.08f),.09f);
            var hide=root.gameObject.AddComponent<HouseRoof>();hide.Roof=roof.gameObject;hide.CeilingHeight=4.2f;hide.CutawayOnlyInThirdPerson=true;
            var detail=root.gameObject.AddComponent<VillaDetail>();detail.Interior=interior.gameObject;detail.Panes=panes.ToArray();detail.ClearGlass=glass;
            var lamp=new GameObject("Warm villa interior light").AddComponent<Light>();lamp.transform.SetParent(root,false);lamp.transform.localPosition=new Vector3(0,3.7f,0);lamp.type=LightType.Point;lamp.range=10;lamp.intensity=7;lamp.color=new Color(1,.73f,.45f);lamp.shadows=LightShadows.None;lamp.enabled=false;detail.RoomLight=lamp;
            if(Vector3.Distance(root.position,new Vector3(32,0,32))<.5f)
            {
                var destination=root.gameObject.AddComponent<WorldFacility>();destination.Name="Hidrok Glass Villa";destination.Kind="home";destination.Action="Explore villa";destination.Description="Walk through the open entrance into a furnished glass pavilion, with cyan roof lighting, warm interiors and reflecting pools.";destination.Door=root.TransformPoint(new Vector3(-7,.3f,-10.5f));destination.HasLookAt=true;destination.LookAt=root.position;CityServices.Instance.Places.Add(destination);
            }
        }
        static GameObject Box(Transform parent,string name,Vector3 size,Vector3 position,Material material,bool collider=false)=>WorldShapes.Box(parent,name,size,position,material,collider);
        static void Pane(Transform root,string name,Vector3 size,Vector3 position,Material glass,List<Renderer> panes)
        {var go=WorldShapes.Box(root,name,size,position,glass,true,false);panes.Add(go.GetComponent<Renderer>());}
        static void Pool(Transform root,Vector3 p,Vector2 size,Material water)
        {
            var lining=WorldShapes.Material("Villa pool lining",new Color(.035f,.12f,.2f),null,.85f);
            Box(root,"Shallow reflecting pool bed",new Vector3(size.x,.06f,size.y),p+Vector3.up*.04f,lining,true);
            Box(root,"Rippled reflecting water",new Vector3(size.x-.15f,.015f,size.y-.15f),p+Vector3.up*.21f,water);
            foreach(int side in new[]{-1,1})
            {
                Box(root,"Pool stone coping",new Vector3(size.x+.15f,.18f,.13f),p+new Vector3(0,.18f,side*size.y*.5f),Pearl,true);
                Box(root,"Pool cyan waterline",new Vector3(size.x-.15f,.025f,.025f),p+new Vector3(0,.225f,side*(size.y*.5f-.09f)),Glow);
                Box(root,"Pool stone coping",new Vector3(.13f,.18f,size.y),p+new Vector3(side*size.x*.5f,.18f,0),Pearl,true);
            }
        }
        static void Furnish(Transform root,bool interactive=false)
        {
            var upholstery=Fabric;var ivory=WorldShapes.Material("Villa ivory upholstery",new Color(.78f,.77f,.81f),null,.2f);
            Box(root,"Woven lounge rug",new Vector3(5.7f,.018f,3.4f),new Vector3(-2.7f,Floor+.015f,-1.7f),WorldShapes.Material("Villa woven rug",new Color(.36f,.37f,.48f)));
            Rounded(root,"Sofa upholstered base",new Vector3(3.85f,.35f,1.28f),new Vector3(-2.7f,Floor+.3f,.25f),upholstery,.12f,true);
            Rounded(root,"Sofa backrest",new Vector3(3.85f,.85f,.27f),new Vector3(-2.7f,Floor+.8f,.77f),upholstery,.13f,true);
            foreach(int side in new[]{-1,1})Rounded(root,"Sofa soft arm",new Vector3(.28f,.65f,1.3f),new Vector3(-2.7f+side*1.8f,Floor+.62f,.25f),upholstery,.13f,true);
            for(int i=0;i<3;i++)
            {
                Rounded(root,"Linen seat cushion",new Vector3(1.04f,.19f,1.02f),new Vector3(-3.8f+i*1.1f,Floor+.55f,.12f),ivory,.085f);
                var pillow=Rounded(root,"Plush lavender pillow",new Vector3(.65f,.57f,.19f),new Vector3(-3.8f+i*1.1f,Floor+.88f,.51f),i==1?ivory:upholstery,.085f);pillow.transform.localRotation=Quaternion.Euler(-12,0,i==0?-12:i==2?13:0);
            }
            Rounded(root,"Walnut coffee table",new Vector3(2.4f,.1f,1.15f),new Vector3(-2.7f,Floor+.43f,-1.6f),Oak,.045f,true);
            foreach(int side in new[]{-1,1})Box(root,"Coffee table pedestal",new Vector3(.14f,.38f,.75f),new Vector3(-2.7f+side*.85f,Floor+.2f,-1.6f),Metal,true);
            Box(root,"Art book",new Vector3(.44f,.04f,.31f),new Vector3(-3.25f,Floor+.51f,-1.6f),Pearl);
            Planter(root,new Vector3(-2.1f,Floor+.48f,-1.6f),.18f);
            Rounded(root,"Lounge chair seat",new Vector3(1.05f,.22f,1.1f),new Vector3(-4.9f,Floor+.48f,-2.8f),ivory,.1f,true);
            Rounded(root,"Lounge chair back",new Vector3(.22f,.85f,1.12f),new Vector3(-5.3f,Floor+.85f,-2.8f),ivory,.1f,true);
            Box(root,"Floating media console",new Vector3(.48f,.4f,3.5f),new Vector3(-5.65f,Floor+.3f,-1.7f),Oak,true);
            Box(root,"Large television",new Vector3(.065f,1.25f,2.4f),new Vector3(-5.72f,Floor+1.22f,-1.7f),Metal);
            Box(root,"Quiet blue television display",new Vector3(.008f,1.12f,2.28f),new Vector3(-5.675f,Floor+1.22f,-1.7f),WorldShapes.Material("Villa screen",new Color(.06f,.13f,.23f),null,.8f));
            Rounded(root,"Dining table",new Vector3(2.1f,.1f,1.25f),new Vector3(3.4f,Floor+.88f,-1.9f),Pearl,.045f,true);
            SmoothShapes.Part(root,"Dining pedestal",SmoothShapes.Tube,new Vector3(.45f,.8f,.45f),new Vector3(3.4f,Floor,-1.9f),Metal,true).AddComponent<BoxCollider>();
            foreach(int side in new[]{-1,1})for(int row=0;row<2;row++)
            {
                float x=3.4f+side*1.35f,z=-2.3f+row*.8f;
                Rounded(root,"Dining chair cushion",new Vector3(.58f,.12f,.58f),new Vector3(x,Floor+.5f,z),upholstery,.055f,true);
                Rounded(root,"Dining chair back",new Vector3(.1f,.75f,.61f),new Vector3(x+side*.23f,Floor+.84f,z),upholstery,.045f,true);
                foreach(int leg in new[]{-1,1})Box(root,"Dining chair leg",new Vector3(.045f,.45f,.045f),new Vector3(x+leg*.19f,Floor+.23f,z-.18f),Metal);
            }
            Planter(root,new Vector3(3.4f,Floor+.94f,-1.9f),.22f);
            Rounded(root,"Bedroom upholstered base",new Vector3(2.45f,.42f,2.7f),new Vector3(-3.6f,Floor+.27f,3.1f),upholstery,.16f,true);
            Rounded(root,"White duvet",new Vector3(2.38f,.2f,2.55f),new Vector3(-3.6f,Floor+.56f,3.05f),ivory,.09f);
            Rounded(root,"Bed headboard",new Vector3(2.6f,1.05f,.18f),new Vector3(-3.6f,Floor+.62f,4.45f),upholstery,.08f,true);
            foreach(int side in new[]{-1,1})Rounded(root,"Bed pillow",new Vector3(.92f,.17f,.55f),new Vector3(-3.6f+side*.56f,Floor+.74f,3.94f),ivory,.08f);
            Box(root,"Kitchen walnut cabinets",new Vector3(3.5f,.92f,.7f),new Vector3(3.5f,Floor+.46f,4.45f),Oak,true);
            Rounded(root,"Kitchen stone worktop",new Vector3(3.6f,.09f,.8f),new Vector3(3.5f,Floor+.97f,4.42f),Pearl,.035f);
            Box(root,"Induction cooktop",new Vector3(.8f,.015f,.47f),new Vector3(3.5f,Floor+1.025f,4.4f),Metal);
            Box(root,"Refrigerator",new Vector3(.8f,2.15f,.8f),new Vector3(1.18f,Floor+1.075f,4.4f),Pearl,true);
            Box(root,"Floor lamp stem",new Vector3(.035f,1.75f,.035f),new Vector3(-5.3f,Floor+.9f,.5f),Metal);
            SmoothShapes.Part(root,"Warm floor lamp shade",SmoothShapes.Profile("Villa lamp shade",new[]{new Vector2(.38f,0),new Vector2(.24f,.45f)},16),Vector3.one,new Vector3(-5.3f,Floor+1.65f,.5f),Warm,true);
            Planter(root,new Vector3(5.25f,Floor,2.6f),.55f);
            if(!interactive)return;
            Interact(root,"Bed","bed","Press E to sleep and restore health and stamina.",new Vector3(-3.6f,Floor,4.6f));
            Interact(root,"Sofa","sofa","Press E to sit and rest a while.",new Vector3(-2.7f,Floor,-1f));
            Interact(root,"Television","television","Press E to watch a movie.",new Vector3(-5f,Floor,-1.7f),new Vector3(-5.72f,Floor+1.22f,-1.7f));
            Interact(root,"Kitchen cooktop","kitchen","Press E to cook a meal from your groceries.",new Vector3(3.5f,Floor,3.6f));
            Interact(root,"Refrigerator","fridge","Press E to grab a snack from your groceries.",new Vector3(1.18f,Floor,3.6f));
        }
        static void Interact(Transform root,string name,string kind,string description,Vector3 door,Vector3? lookAt=null)
        {
            var spot=new GameObject(name+" interaction").transform;spot.SetParent(root,false);spot.localPosition=door;
            var facility=spot.gameObject.AddComponent<WorldFacility>();facility.Name=name;facility.Kind=kind;facility.Description=description;facility.Action=name;facility.Door=spot.position;
            if(lookAt.HasValue){var at=new GameObject(name+" look target").transform;at.SetParent(root,false);at.localPosition=lookAt.Value;facility.HasLookAt=true;facility.LookAt=at.position;}
            CityServices.Instance.Places.Add(facility);
        }
        static void Curtains(Transform parent)
        {
            var fabric=WorldShapes.Material("Villa sheer lilac curtains",new Color(.48f,.56f,.7f),null,.15f);
            fabric.SetFloat("_Cull",0);
            foreach(int side in new[]{-1,1})foreach(float z in new[]{-4.88f,4.88f})
            {
                var go=new GameObject("Pleated full-height curtain");go.transform.SetParent(parent,false);go.transform.localPosition=new Vector3(side*5.35f,Floor,z);var mesh=VillaMeshes.Curtain;
                go.AddComponent<MeshFilter>().sharedMesh=mesh;go.AddComponent<MeshRenderer>().sharedMaterial=fabric;go.isStatic=true;
            }
        }
        static void Planter(Transform parent,Vector3 point,float scale)
        {
            var pot=WorldShapes.Material("Villa brushed planters",new Color(.22f,.3f,.36f),null,.8f);var leaf=WorldShapes.Material("Villa planting",new Color(.12f,.31f,.2f));
            SmoothShapes.Part(parent,"Sculpted planter",SmoothShapes.Profile("Villa plant pot",new[]{new Vector2(.34f,0),new Vector2(.43f,.85f),new Vector2(.44f,.9f)},12),Vector3.one*scale,point,pot,true);
            for(int i=0;i<5;i++){float a=i*Mathf.PI*2/5;var go=SmoothShapes.Part(parent,"Broad garden leaf",SmoothShapes.Ellipsoid,new Vector3(.26f,.85f,.12f)*scale,point+new Vector3(Mathf.Cos(a)*.17f,.65f,Mathf.Sin(a)*.17f)*scale,leaf,true);go.transform.localRotation=Quaternion.Euler(Mathf.Sin(a)*30,a*Mathf.Rad2Deg,Mathf.Cos(a)*25);}
        }
        static GameObject Rounded(Transform parent,string name,Vector3 size,Vector3 position,Material material,float radius,bool collider=false)
        {var go=SmoothShapes.Part(parent,name,VillaMeshes.Rounded(size,radius),Vector3.one,position,material,true);if(collider)go.AddComponent<BoxCollider>().size=size;return go;}
    }
    public static class VillaMeshes
    {
        static readonly Dictionary<string,Mesh> cache=new Dictionary<string,Mesh>();
        public static Mesh Rounded(Vector3 size,float radius)
        {
            string key=size+"/"+radius;if(cache.TryGetValue(key,out var mesh))return mesh;
            var vertices=new List<Vector3>();var normals=new List<Vector3>();var uv=new List<Vector2>();var triangles=new List<int>();var half=size*.5f;var inner=half-Vector3.one*radius;
            foreach(var normal in new[]{Vector3.up,Vector3.down,Vector3.left,Vector3.right,Vector3.forward,Vector3.back})
            {
                var u=Vector3.Cross(normal,Mathf.Abs(normal.y)>.9f?Vector3.forward:Vector3.up).normalized;var v=Vector3.Cross(normal,u);int start=vertices.Count;
                for(int y=0;y<=6;y++)for(int x=0;x<=6;x++)
                {
                    var q=Vector3.Scale(normal+u*(x/3f-1)+v*(y/3f-1),half);var centre=new Vector3(Mathf.Clamp(q.x,-inner.x,inner.x),Mathf.Clamp(q.y,-inner.y,inner.y),Mathf.Clamp(q.z,-inner.z,inner.z));var n=(q-centre).normalized;vertices.Add(centre+n*radius);normals.Add(n);uv.Add(new Vector2(x/6f,y/6f));
                    if(x<6&&y<6){int a=start+y*7+x;triangles.AddRange(new[]{a,a+1,a+7,a+1,a+8,a+7});}
                }
            }
            mesh=new Mesh{name="Bevelled villa furniture",vertices=vertices.ToArray(),normals=normals.ToArray(),uv=uv.ToArray(),triangles=triangles.ToArray()};mesh.RecalculateBounds();cache[key]=mesh;return mesh;
        }
        public static Mesh Curtain
        {
            get
            {
                if(cache.TryGetValue("Curtain",out var mesh))return mesh;var vertices=new List<Vector3>();var triangles=new List<int>();
                for(int x=0;x<=32;x++){float u=x/32f;vertices.Add(new Vector3((u-.5f)*1.05f,0,Mathf.Sin(u*Mathf.PI*16)*.045f));vertices.Add(new Vector3((u-.5f)*1.05f,3.29f,Mathf.Sin(u*Mathf.PI*16)*.045f));if(x<32){int a=x*2;triangles.AddRange(new[]{a,a+1,a+2,a+1,a+3,a+2});}}
                mesh=new Mesh{name="Pleated curtain",vertices=vertices.ToArray(),triangles=triangles.ToArray()};mesh.RecalculateNormals();mesh.RecalculateBounds();cache["Curtain"]=mesh;return mesh;
            }
        }
    }
    public sealed class VillaDetail : MonoBehaviour
    {
        public GameObject Interior;public Renderer[] Panes;public Material ClearGlass;public Light RoomLight;
        float next;bool near=true;Material distant;
        void Start(){distant=WorldShapes.Material("Distant villa glazing",new Color(.12f,.27f,.36f),null,.8f);}
        void Update()
        {
            if(Time.time<next||!Camera.main)return;next=Time.time+.7f;float distance=Vector3.Distance(Camera.main.transform.position,transform.position);bool detail=distance<70;
            if(detail!=near){near=detail;Interior.SetActive(near);foreach(var pane in Panes)pane.sharedMaterial=near?ClearGlass:distant;}
            if(RoomLight)RoomLight.enabled=distance<28&&Rendering.ScalableQuality.Instance&&Rendering.ScalableQuality.Instance.Preset!=Rendering.QualityPreset.Low;
        }
    }
}
