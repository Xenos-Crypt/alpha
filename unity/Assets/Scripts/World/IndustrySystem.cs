using System.Collections.Generic;
using UnityEngine;
using AnotherWorld.Traffic;
namespace AnotherWorld.World
{
    public sealed class IndustrySystem : MonoBehaviour
    {
        public static IndustrySystem Instance { get; private set; }
        public IndustryLedger Ledger=new IndustryLedger();
        public readonly Dictionary<WorldFacility,ProductionOrder> Orders=new Dictionary<WorldFacility,ProductionOrder>();
        readonly Dictionary<WorldFacility,Transform> machines=new Dictionary<WorldFacility,Transform>();float saveTimer;
        static string SaveKey=>Application.isBatchMode?"HidrokIndustry.test.v1":"HidrokIndustry.v1";
        [System.Serializable] sealed class SavedJob {public string Name;public ProductionOrder Order;}
        [System.Serializable] sealed class SaveData {public IndustryLedger Ledger;public SavedJob[] Jobs;}
        void Awake(){Instance=this;}
        void OnDestroy(){if(Instance==this)Instance=null;}
        void OnApplicationQuit(){Save();}
        public void Build(Transform moving)
        {
            foreach(var place in CityServices.Instance.Places)
            {
                if(place.Kind!="industrial"&&place.Kind!="utility"&&place.Kind!="hangar")continue;
                var job=new ProductionOrder{Input=IndustrialResource.Materials,InputAmount=3,EnergyCost=3,Output=IndustrialResource.Components,OutputAmount=2};
                if(place.Name.Contains("Energy")){job.EnergyCost=0;job.InputAmount=1;job.Output=IndustrialResource.Energy;job.OutputAmount=30;job.Duration=12;}
                else if(place.Name.Contains("Materials")){job.InputAmount=0;job.EnergyCost=2;job.Output=IndustrialResource.Materials;job.OutputAmount=8;}
                else if(place.Name.Contains("Hoverworks")){job.Input=IndustrialResource.Components;job.InputAmount=2;job.EnergyCost=4;job.Output=IndustrialResource.Hovercraft;job.OutputAmount=1;job.Duration=25;}
                else if(place.Name.Contains("Aerospace")){job.Input=IndustrialResource.Components;job.InputAmount=3;job.EnergyCost=5;job.Output=IndustrialResource.Airframes;job.OutputAmount=1;job.Duration=35;}
                else if(place.Kind=="hangar"){job.Input=IndustrialResource.Components;job.InputAmount=5;job.EnergyCost=8;job.Output=IndustrialResource.Saucers;job.OutputAmount=1;job.Duration=45;}
                Orders.Add(place,job);
                var machine=new GameObject(place.Name+" production machinery").transform;machine.SetParent(moving,false);machine.position=place.transform.position+new Vector3(-6,place.Kind=="hangar"?-11.8f:.3f,1);
                var steel=WorldShapes.Material("Manufacturing graphite",new Color(.18f,.28f,.32f),null,.6f);
                var light=WorldShapes.Material("Manufacturing cyan",new Color(.04f,.8f,1));
                WorldShapes.Box(machine,"Assembly bed",new Vector3(3,.4f,4),Vector3.up*.2f,steel,true,false);
                var arm=new GameObject("Working robot arm").transform;arm.SetParent(machine,false);arm.localPosition=new Vector3(-1,1.5f,0);
                WorldShapes.Box(arm,"Robot upper arm",new Vector3(.2f,1.5f,.2f),Vector3.up*.3f,steel,false,false);
                WorldShapes.Box(arm,"Robot tool head",new Vector3(1.5f,.16f,.2f),new Vector3(.6f,1,0),light,false,false);machines[place]=arm;
                if(place.Kind!="hangar")place.Action="Open production controls";
            }
            AddDeliveryBay(moving,"Aerospace delivery bay",new Vector3(-585,.08f,10),18);
            AddDeliveryBay(moving,"Saucer delivery bay",new Vector3(-625,.08f,-85),17);
            try
            {
                var data=JsonUtility.FromJson<SaveData>(PlayerPrefs.GetString(SaveKey,""));
                if(data!=null&&data.Ledger!=null&&data.Ledger.Stock!=null&&data.Ledger.Stock.Length==6)
                {
                    Ledger=data.Ledger;
                    if(data.Jobs!=null)foreach(var saved in data.Jobs)foreach(var entry in Orders)
                        if(entry.Key.Name==saved.Name&&saved.Order!=null){entry.Value.Running=saved.Order.Running;entry.Value.Elapsed=Mathf.Clamp(saved.Order.Elapsed,0,entry.Value.Duration);}
                }
            }
            catch(System.ArgumentException){Debug.LogWarning("Discarded an invalid local industry save.");}
        }
        void AddDeliveryBay(Transform parent,string name,Vector3 position,float width)
        {
            var root=new GameObject(name).transform;root.SetParent(parent,false);root.position=position;
            SmoothShapes.Part(root,"Aircraft delivery pad",SmoothShapes.Tube,new Vector3(width,.035f,width),Vector3.zero,WorldShapes.Material("Delivery apron",new Color(.2f,.3f,.34f)));
            WorldShapes.Label(root,name.ToUpperInvariant()+" / G TO ENTER",new Vector3(0,2,-width*.6f),.09f);
            var place=root.gameObject.AddComponent<WorldFacility>();place.Name=name;place.Kind="delivery";place.Door=position+new Vector3(width*.5f+1,.3f,0);place.Description="Finished aircraft arrive here from Polar Aerospace or the saucer engineering factory. Keep the pad clear. G enters your delivered vehicle.";place.Action="Inspect delivery bay";CityServices.Instance.Places.Add(place);
        }
        void Update()
        {
            foreach(var entry in Orders)
            {
                if(entry.Value.Advance(Time.deltaTime,Ledger)){CityServices.Instance.Notify(entry.Key.Name+" completed "+entry.Value.OutputAmount+" "+entry.Value.Output);Save();}
                if(entry.Value.Running&&machines.TryGetValue(entry.Key,out var arm)&&arm.gameObject.activeInHierarchy)arm.localRotation=Quaternion.Euler(0,Mathf.Sin(Time.time*1.8f)*55,0);
            }
            saveTimer+=Time.deltaTime;if(saveTimer>=10){saveTimer=0;foreach(var job in Orders.Values)if(job.Running){Save();break;}}
        }
        public bool StartOrder(WorldFacility place)
        {bool ok=Orders.TryGetValue(place,out var job)&&job.Start(Ledger);CityServices.Instance.Notify(ok?"Production started. Resources reserved.":"Job already running or insufficient materials / energy.");if(ok)Save();return ok;}
        public bool Sell(IndustrialResource product)
        {
            if(product==IndustrialResource.Materials||product==IndustrialResource.Energy||!Ledger.Spend(product,1))return false;
            CityServices.Instance.Player.Coins+=product==IndustrialResource.Components?15:100;Save();return true;
        }
        public bool BuySupplies(IndustrialResource resource)
        {
            var player=CityServices.Instance.Player;
            if((resource!=IndustrialResource.Materials&&resource!=IndustrialResource.Energy)||player.Coins<10){CityServices.Instance.Notify("Supplies cost 10 coins.");return false;}
            player.Coins-=10;Ledger.Add(resource,resource==IndustrialResource.Energy?10:5);Save();return true;
        }
        public bool Deploy(WorldFacility place)
        {
            if(!Orders.TryGetValue(place,out var job)||Ledger[job.Output]<1||(job.Output!=IndustrialResource.Hovercraft&&job.Output!=IndustrialResource.Airframes&&job.Output!=IndustrialResource.Saucers))return false;
            bool aircraft=job.Output==IndustrialResource.Airframes,saucer=job.Output==IndustrialResource.Saucers;
            var bay=aircraft?new Vector3(-585,.1f,10):saucer?new Vector3(-625,.1f,-85):place.transform.position+new Vector3(0,.1f,-24.6f);
            if(Physics.CheckBox(bay+Vector3.up, aircraft?new Vector3(8.2f,.9f,6.5f):saucer?new Vector3(7.1f,.9f,7.1f):new Vector3(1.2f,.9f,2.4f),Quaternion.identity,~0,QueryTriggerInteraction.Ignore))
            {CityServices.Instance.Notify("Delivery bay occupied. Move the vehicle before collecting another.");return false;}
            GameObject model;TrafficVehicle vehicle;var parent=GameObject.Find("Moving road users").transform;
            if(aircraft||saucer)
            {
                GameObject template=null;
                if(aircraft)foreach(var candidate in RoadNetwork.Instance.Vehicles)if(candidate&&candidate.Kind=="plane"){template=candidate.gameObject;break;}
                if(saucer)template=GameObject.Find("Hidrok research saucer");
                if(!template){CityServices.Instance.Notify("Aircraft delivery is temporarily unavailable.");return false;}
                model=Instantiate(template,parent);model.name=saucer?"Manufactured saucer":"Manufactured VTOL plane";
                vehicle=model.GetComponent<TrafficVehicle>();if(!vehicle)vehicle=model.AddComponent<TrafficVehicle>();
                vehicle.Kind=saucer?"saucer":"plane";vehicle.CanFly=true;vehicle.Width=saucer?14:16.3f;vehicle.Length=saucer?14:13;vehicle.MaxDriveSpeed=30;vehicle.LiftSpeed=6;vehicle.TurnRate=40;
                if(saucer){var hull=model.AddComponent<BoxCollider>();hull.size=new Vector3(14,3.8f,14);hull.center=Vector3.up*1.9f;}
            }
            else
            {model=HoverVehicleModel.Create("car",parent,new Color(.3f,.65f,.72f),out var wheels);vehicle=model.AddComponent<TrafficVehicle>();vehicle.Kind="car";vehicle.Wheels=wheels;}
            model.transform.SetPositionAndRotation(bay,Quaternion.identity);vehicle.Abandoned=true;vehicle.Owned=true;vehicle.PlayerControlled=false;vehicle.Stolen=false;vehicle.Speed=0;
            Ledger.Spend(job.Output,1);Save();CityServices.Instance.Notify(aircraft||saucer?"Your aircraft is ready at the airport delivery area. G to enter.":"Your manufactured hovercar is waiting in the road delivery bay.");return true;
        }
        void OnApplicationPause(bool pause){if(pause)Save();}
        void Save()
        {
            var jobs=new List<SavedJob>();foreach(var entry in Orders)if(entry.Key)jobs.Add(new SavedJob{Name=entry.Key.Name,Order=entry.Value});
            PlayerPrefs.SetString(SaveKey,JsonUtility.ToJson(new SaveData{Ledger=Ledger,Jobs=jobs.ToArray()}));PlayerPrefs.Save();
        }
    }
}
