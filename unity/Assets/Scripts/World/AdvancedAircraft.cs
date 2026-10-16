using UnityEngine;
using AnotherWorld.Traffic;
namespace AnotherWorld.World
{
    public sealed class AdvancedAircraft : MonoBehaviour
    {
        Vector3 centre;float phase;public float OrbitRadius=90,Altitude=40;
        void Start(){centre=transform.position;phase=Random.value*Mathf.PI*2;}
        void Update()
        {
            phase+=Time.deltaTime*.065f;
            var p=centre+new Vector3(Mathf.Cos(phase)*OrbitRadius,Altitude,Mathf.Sin(phase)*OrbitRadius);
            var d=p-transform.position;if(d.sqrMagnitude>.01f)transform.rotation=Quaternion.LookRotation(d);
            transform.position=p;
        }
        public static void Build(Transform scenery,Transform moving)
        {
            var white=WorldShapes.Material("Aerospace pearl",new Color(.8f,.87f,.9f),null,.7f);
            var glass=WorldShapes.Material("Aircraft canopy",new Color(.04f,.18f,.25f),null,.9f);
            var glow=WorldShapes.Material("Aircraft thrust",new Color(.08f,.8f,1));
            for(int n=0;n<8;n++)
            {
                bool helicopter=n%4<2;
                var root=new GameObject(helicopter?"Polar ducted-fan helicopter":"Polar electric VTOL plane").transform;root.SetParent(moving,false);root.position=n<4?new Vector3(-500+n*160,0,-50+n*40):new Vector3(-665+(n%2)*40,.1f,helicopter?25:-30);
                SmoothShapes.Part(root,"Aerodynamic fuselage",SmoothShapes.Ellipsoid,new Vector3(helicopter?2.3f:3,2,helicopter?7:13),Vector3.zero,white);
                SmoothShapes.Part(root,"Cockpit",SmoothShapes.Ellipsoid,new Vector3(1.7f,1.2f,3.6f),new Vector3(0,1,1.5f),glass);
                var wing=WorldShapes.Box(root,"Swept wing",new Vector3(helicopter?7:16,.18f,2),new Vector3(0,.8f,-1),white,false,false);wing.transform.localRotation=Quaternion.Euler(0,-10,0);
                foreach(int side in new[]{-1,1})
                {
                    var ring=SmoothShapes.Profile("Ducted lift ring",new[]{new Vector2(1.2f,0),new Vector2(1.2f,.3f),new Vector2(.9f,.3f),new Vector2(.9f,0),new Vector2(1.2f,0)},24);
                    SmoothShapes.Part(root,"Shrouded lift fan",ring,Vector3.one,new Vector3(side*(helicopter?2.8f:5),.8f,-1),white);
                    SmoothShapes.Part(root,"Fan induction core",SmoothShapes.Tube,new Vector3(1.7f,.08f,1.7f),new Vector3(side*(helicopter?2.8f:5),.88f,-1),glow);
                }
                var collision=root.gameObject.AddComponent<BoxCollider>();collision.size=new Vector3(helicopter?7:16,3,helicopter?7:13);collision.center=Vector3.up*1.5f;
                if(n<4){var patrol=root.gameObject.AddComponent<AdvancedAircraft>();patrol.Altitude=30+n*10;patrol.OrbitRadius=70+n*15;}
                else
                {
                    var vehicle=root.gameObject.AddComponent<TrafficVehicle>();vehicle.Kind=helicopter?"helicopter":"plane";vehicle.CanFly=true;vehicle.Abandoned=true;vehicle.Width=helicopter?7:16;vehicle.Length=helicopter?7:13;vehicle.MaxDriveSpeed=helicopter?22:32;vehicle.LiftSpeed=helicopter?4:6;vehicle.TurnRate=helicopter?55:35;
                    var pad=new GameObject((helicopter?"Helicopter":"VTOL plane")+" pad "+(n%2+1)).transform;pad.SetParent(scenery,false);pad.position=root.position;
                    var facility=pad.gameObject.AddComponent<WorldFacility>();facility.Name=pad.name;facility.Kind="aircraft";facility.Vehicle=vehicle;facility.Door=pad.position+new Vector3(vehicle.Width*.5f+1,.3f,0);facility.Action="Enter aircraft";facility.Description="WASD: flight and heading. Space: take off / ascend. Left Ctrl: descend. Land before E to leave. Taking this aircraft alerts police.";CityServices.Instance.Places.Add(facility);
                    SmoothShapes.Part(pad,"Landing pad",SmoothShapes.Tube,new Vector3(helicopter?12:22,.05f,helicopter?12:22),Vector3.down*.03f,WorldShapes.Material("Landing pad",new Color(.22f,.27f,.29f)),true);
                    WorldShapes.Label(pad,helicopter?"HELICOPTER / E":"VTOL PLANE / E",new Vector3(0,2,-12),.12f);
                }
            }
            // A separate parked craft has player controls, rather than attaching input to scenery aircraft.
            var model=HoverVehicleModel.Create("car",moving,new Color(.7f,.8f,.88f),out var wheels);model.name="Flyable Hidrok skycar";model.transform.position=new Vector3(-176,.1f,-276);
            var car=model.AddComponent<TrafficVehicle>();car.Kind="skycar";car.CanFly=true;car.Abandoned=true;car.Wheels=wheels;
            WorldShapes.Label(scenery,"SKYCAR PAD / G TO TAKE / SPACE UP / CTRL DOWN",new Vector3(-176,3,-276),.08f);
        }
    }
}
