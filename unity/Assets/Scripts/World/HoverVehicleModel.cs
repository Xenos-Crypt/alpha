using UnityEngine;
using AnotherWorld.Rendering;
namespace AnotherWorld.World
{
    public static class HoverVehicleModel
    {
        static void Part(Transform p,string name,Mesh mesh,Vector3 size,Vector3 point,Material m)=>TransportDesign.Part(p,name,mesh,size,point,m);
        static GameObject Box(Transform p,string name,Vector3 size,Vector3 point,Material m)
        {var go=WorldShapes.Box(p,name,size,point,m,false,false);GpuMeshBatch.Register(go.GetComponent<MeshRenderer>());return go;}
        static void Line(Transform p,string name,Vector3 a,Vector3 b,float thickness,Material m)
        {var go=Box(p,name,new Vector3(thickness,thickness,Vector3.Distance(a,b)),(a+b)*.5f,m);go.transform.localRotation=Quaternion.FromToRotation(Vector3.forward,b-a);}
        public static GameObject Create(string kind,Transform parent,Color color,out Transform[] wheels)
        {
            var root=new GameObject("Hidrok hover "+kind);root.transform.SetParent(parent,false);wheels=new Transform[0];
            bool bike=kind=="bicycle"||kind=="motorcycle",bus=kind=="bus",medical=kind=="ambulance";
            float length=bus?10:medical?5.65f:bike?2.1f:4.4f,width=bus?2.5f:medical?2.3f:bike?.8f:2.1f;
            var paint=WorldShapes.Material("Ceramic vehicle paint",kind=="police"||medical?new Color(.88f,.92f,.96f):Color.Lerp(color,new Color(.88f,.92f,.96f),.72f),null,.72f);paint.SetFloat("_Metallic",.25f);
            if(bike)Bike(root.transform,kind=="bicycle",paint);
            else if(bus)TransportDesign.Rail(root.transform,10,2.5f,2.05f);
            else if(medical)Ambulance(root.transform,paint);
            else Car(root.transform,paint,kind=="police");
            if(!bike)for(int side=-1;side<=1;side+=2)for(int end=-1;end<=1;end+=2)
            {
                // Induction lenses sit under body-integrated fairings, without tyre-like pods.
                float z=end*length*.32f;var fairing=TransportDesign.Loft("Integrated lift fairing",new[]{new Vector4(-.5f,.6f,.1f,.19f),new Vector4(-.3f,1,0,.32f),new Vector4(.3f,1,0,.32f),new Vector4(.5f,.4f,.1f,.17f)});
                Part(root.transform,"Integrated ceramic lift cover",fairing,new Vector3(width*.22f,1,length*.23f),new Vector3(side*width*.37f,.24f,z),paint);
                Part(root.transform,"Underside induction lens",SmoothShapes.Tube,new Vector3(width*.18f,.025f,length*.14f),new Vector3(side*width*.37f,.235f,z),TransportDesign.Cyan);
            }
            var hull=root.AddComponent<BoxCollider>();hull.size=new Vector3(width,bus?3:medical?2.7f:bike?1.5f:2.1f,length);hull.center=Vector3.up*hull.size.y*.5f;
            return root;
        }
        static void Car(Transform p,Material paint,bool police)
        {
            var body=TransportDesign.Loft("Sculpted saloon body",new[]{new Vector4(-2.2f,1.35f,.43f,.66f),new Vector4(-1.9f,1.85f,.34f,.81f),new Vector4(-1.4f,2.06f,.29f,.86f),new Vector4(-.6f,2.1f,.28f,.85f),new Vector4(.6f,2.1f,.3f,.78f),new Vector4(1.35f,2.05f,.34f,.7f),new Vector4(1.9f,1.8f,.4f,.61f),new Vector4(2.2f,1.35f,.45f,.56f)});
            Part(p,"Sculpted saloon shell",body,Vector3.one,Vector3.zero,paint);
            var cabin=TransportDesign.Loft("Low saloon glazing",new[]{new Vector4(-1.3f,1.6f,.79f,.84f),new Vector4(-.85f,1.62f,.78f,1.28f),new Vector4(-.5f,1.58f,.77f,1.43f),new Vector4(.15f,1.54f,.76f,1.4f),new Vector4(.55f,1.52f,.75f,1.24f),new Vector4(1,1.5f,.73f,.77f)});
            Part(p,"Individual panoramic cabin",cabin,Vector3.one,Vector3.zero,TransportDesign.Glass);
            var roof=TransportDesign.Loft("Saloon contoured roof panel",new[]{new Vector4(-.7f,1.15f,1.32f,1.36f),new Vector4(-.43f,1.24f,1.43f,1.465f),new Vector4(.13f,1.2f,1.4f,1.435f),new Vector4(.33f,1.08f,1.34f,1.37f)});
            Part(p,"Contoured ceramic roof",roof,Vector3.one,Vector3.zero,paint);
            foreach(int side in new[]{-1,1})
            {
                float s=side;
                Line(p,"Window B pillar",new Vector3(s*.8f,.83f,-.42f),new Vector3(s*.63f,1.42f,-.42f),.045f,paint);
                Line(p,"Door panel joint",new Vector3(s*1.052f,.42f,-.42f),new Vector3(s*1.052f,.75f,-.42f),.018f,TransportDesign.Graphite);
                Box(p,"Recessed door handle",new Vector3(.025f,.035f,.18f),new Vector3(s*1.04f,.75f,-.2f),TransportDesign.Graphite);
                Box(p,"Graphite side intake",new Vector3(.028f,.12f,.48f),new Vector3(s*1.035f,.47f,1.12f),TransportDesign.Graphite);
                Line(p,"Cyan sill inset",new Vector3(s*1.025f,.38f,-1.3f),new Vector3(s*1.025f,.38f,1.25f),.025f,TransportDesign.Cyan);
                Line(p,"Split front running light",new Vector3(s*.22f,.53f,2.205f),new Vector3(s*.62f,.53f,2.205f),.035f,TransportDesign.Cyan);
                Box(p,"Graphite mirror",new Vector3(.19f,.09f,.26f),new Vector3(s*1.03f,1.03f,.54f),TransportDesign.Graphite);
                Line(p,"Mirror support",new Vector3(s*.76f,1,.54f),new Vector3(s*1.03f,1.03f,.54f),.035f,TransportDesign.Graphite);
            }
            Box(p,"Front lower air intake",new Vector3(.75f,.09f,.028f),new Vector3(0,.48f,2.213f),TransportDesign.Graphite);
            Box(p,"Rear lamp blade",new Vector3(1.15f,.045f,.025f),new Vector3(0,.55f,-2.215f),ElementalVisuals.Paint("Transport rear lamp",new Color(.9f,.02f,.03f),true));
            if(police)
            {
                foreach(int side in new[]{-1,1})Box(p,"Police blue door band",new Vector3(.03f,.16f,1.8f),new Vector3(side*1.052f,.63f,-.1f),WorldShapes.Material("Police midnight blue",new Color(.02f,.1f,.26f)));
                Emergency(p,1.53f);
                Box(p,"Police rear identification panel",new Vector3(1.2f,.18f,.025f),new Vector3(0,.48f,-2.225f),TransportDesign.Graphite);WorldShapes.Label(p,"POLICE",new Vector3(0,.48f,-2.245f),.055f);
                p.GetChild(p.childCount-1).gameObject.AddComponent<VehicleMarking>();
            }
        }
        static void Bike(Transform p,bool light,Material paint)
        {
            var spine=TransportDesign.Loft("Open hover cycle spine",new[]{new Vector4(-1,.25f,.55f,.65f),new Vector4(-.65f,.3f,.43f,.78f),new Vector4(.25f,.27f,.38f,.62f),new Vector4(.8f,.25f,.48f,.66f)});
            Part(p,"Exposed graphite cycle frame",spine,Vector3.one,Vector3.zero,TransportDesign.Graphite);
            Part(p,"Separate rider saddle",SmoothShapes.Ellipsoid,new Vector3(.34f,.13f,.64f),new Vector3(0,.94f,-.4f),TransportDesign.Graphite);
            Line(p,"Saddle support",new Vector3(0,.7f,-.4f),new Vector3(0,.97f,-.4f),.07f,TransportDesign.Graphite);
            var fairing=TransportDesign.Loft(light?"Light cycle fairing":"Sport bike fairing",new[]{new Vector4(.05f,.28f,.62f,.82f),new Vector4(.3f,light?.36f:.58f,.5f,1),new Vector4(.65f,light?.4f:.62f,.48f,.92f),new Vector4(1.02f,.25f,.62f,.7f)});
            Part(p,"Separate swept front fairing",fairing,Vector3.one,Vector3.zero,paint);
            var screen=TransportDesign.Loft("Sport cycle windscreen",new[]{new Vector4(.32f,.33f,.96f,.98f),new Vector4(.5f,.34f,.99f,1.2f),new Vector4(.72f,.28f,.9f,1)});
            if(!light)Part(p,"Small bike windscreen",screen,Vector3.one,Vector3.zero,TransportDesign.Glass);
            Line(p,"Handlebar bridge",new Vector3(-.34f,1.23f,.25f),new Vector3(.34f,1.23f,.25f),.055f,TransportDesign.Graphite);
            Line(p,"Steering column",new Vector3(0,.75f,.25f),new Vector3(0,1.23f,.25f),.055f,TransportDesign.Graphite);
            foreach(int side in new[]{-1,1})
            {
                Line(p,"Open rear chassis strut",new Vector3(side*.12f,.78f,-.5f),new Vector3(side*.21f,.43f,-.85f),.055f,paint);
                Line(p,"Footrest",new Vector3(side*.15f,.5f,-.15f),new Vector3(side*.33f,.5f,-.15f),.06f,TransportDesign.Graphite);
                Line(p,"Front fairing cyan inlay",new Vector3(side*.27f,.72f,.24f),new Vector3(side*.27f,.85f,.73f),.025f,TransportDesign.Cyan);
                if(!light)Box(p,"Recessed bike intake",new Vector3(.018f,.1f,.24f),new Vector3(side*.296f,.66f,.43f),TransportDesign.Graphite);
            }
            foreach(float z in new[]{-.8f,.77f})
            {
                Part(p,"Enclosed cycle lift housing",SmoothShapes.Ellipsoid,new Vector3(.5f,.3f,.5f),new Vector3(0,.25f,z),paint);
                Part(p,"Downward cycle induction lens",SmoothShapes.Tube,new Vector3(.36f,.025f,.36f),new Vector3(0,.24f,z),TransportDesign.Cyan);
            }
            Box(p,"Bike headlamp",new Vector3(.18f,.035f,.025f),new Vector3(0,.68f,1.025f),TransportDesign.Cyan);
        }
        static void Ambulance(Transform p,Material paint)
        {
            Part(p,"Medical van lower hull",TransportDesign.Hull,new Vector3(2.3f,1,5.65f),Vector3.zero,paint);
            Box(p,"Enclosed medical module",new Vector3(2.05f,1.6f,2.9f),new Vector3(0,1.5f,-.8f),paint);
            var cab=TransportDesign.Loft("Medical driving cab",new[]{new Vector4(.5f,1.95f,.8f,2.1f),new Vector4(1,1.9f,.8f,2.04f),new Vector4(1.85f,1.8f,.75f,1.15f),new Vector4(2.2f,1.7f,.7f,.85f)});
            Part(p,"Medical ceramic driving cab",cab,Vector3.one,Vector3.zero,paint);
            TransportDesign.Patch(p,"Medical framed windscreen",new Vector3(-.72f,2.07f,1),new Vector3(.72f,2.07f,1),new Vector3(.77f,1.32f,1.75f),new Vector3(-.77f,1.32f,1.75f),TransportDesign.Glass);
            Box(p,"Cab roof panel",new Vector3(1.75f,.09f,.65f),new Vector3(0,2.14f,.78f),paint);
            var red=WorldShapes.Material("Medical vermilion",new Color(.85f,.025f,.035f));
            foreach(int side in new[]{-1,1})
            {
                var a=new Vector3(side*.99f,1.05f,.55f);var b=new Vector3(side*.93f,1.05f,1.65f);var c=new Vector3(side*.953f,1.81f,1.1f);var d=new Vector3(side*.99f,1.98f,.55f);
                if(side>0)TransportDesign.Patch(p,"Medical right cab window",a,b,c,d,TransportDesign.Glass);else TransportDesign.Patch(p,"Medical left cab window",a,d,c,b,TransportDesign.Glass);
                Box(p,"Ambulance side stripe",new Vector3(.025f,.18f,3.6f),new Vector3(side*1.04f,.98f,-.4f),red);
                Box(p,"Medical cross upright",new Vector3(.03f,.66f,.19f),new Vector3(side*1.04f,1.65f,-.65f),red);Box(p,"Medical cross arm",new Vector3(.03f,.19f,.66f),new Vector3(side*1.045f,1.65f,-.65f),red);
                Line(p,"Rear medical door joint",new Vector3(0,.9f,-2.26f),new Vector3(0,2.23f,-2.26f),.018f,TransportDesign.Graphite);
            }
            Emergency(p,2.4f);Box(p,"Medical front running lamp",new Vector3(1.1f,.06f,.03f),new Vector3(0,.68f,2.66f),TransportDesign.Cyan);
        }
        static void Emergency(Transform p,float height)
        {
            Box(p,"Emergency lightbar base",new Vector3(1.15f,.055f,.25f),new Vector3(0,height-.045f,0),TransportDesign.Graphite);
            foreach(int side in new[]{-1,1})Box(p,side<0?"Emergency blue":"Emergency red",new Vector3(.5f,.1f,.22f),new Vector3(side*.3f,height,0),ElementalVisuals.Paint(side<0?"Emergency blue lens":"Emergency red lens",side<0?new Color(.025f,.2f,1):new Color(1,.025f,.035f),true));
        }
    }
}
