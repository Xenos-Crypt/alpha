using System;
using System.IO;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using AnotherWorld.World;
using AnotherWorld.Traffic;
namespace AnotherWorld.Editor
{
    [InitializeOnLoad] public static class InfernoReview
    {
        const string Key="Hidrok.InfernoReview";static readonly List<string> errors=new List<string>();
        static CrossingWalker normal,awakened;static float health,time,expiry;static TrafficVehicle vehicle;
        static InfernoReview(){if(SessionState.GetBool(Key,false))Hook();}
        static void Hook(){EditorApplication.update-=Tick;EditorApplication.update+=Tick;Application.logMessageReceived+=Log;}
        static void Log(string message,string stack,LogType type){if(type==LogType.Error||type==LogType.Exception||type==LogType.Assert)errors.Add(message);}
        static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
        public static void Run(){ProjectSetup.Setup();EditorSceneManager.OpenScene("Assets/Scenes/Neighbourhood.unity");SessionState.SetBool(Key,true);SessionState.SetInt(Key+"stage",0);Hook();EditorApplication.EnterPlaymode();}
        static void Next(int step,float delay){SessionState.SetInt(Key+"stage",step);SessionState.SetFloat(Key+"time",Time.time+delay);}
        static CrossingWalker Target(Vector3 point){var go=WorldShapes.Person(null,Color.gray);go.position=point;var walker=go.gameObject.AddComponent<CrossingWalker>();walker.TrainingTarget=true;return walker;}
        static void Tick()
        {
            EditorApplication.QueuePlayerLoopUpdate();if(!EditorApplication.isPlaying||Time.time<1||Time.time<SessionState.GetFloat(Key+"time",0)||!RoadNetwork.Instance)return;
            try
            {
                var player=RoadNetwork.Instance.Player.GetComponent<NeighbourhoodPlayer>();var powers=player.Powers;if(!powers||!powers.Inferno)return;
                int step=SessionState.GetInt(Key+"stage",0);
                if(step==0)
                {
                    var body=player.GetComponent<CharacterController>();body.enabled=false;player.transform.position=new Vector3(-820,.3f,122);body.enabled=true;powers.SelectElement(0);powers.Energy=100;
                    normal=Target(player.transform.position+Vector3.right*3);awakened=Target(player.transform.position+Vector3.left*3);Next(1,.1f);return;
                }
                if(step==1)
                {
                    powers.HitArea(normal.transform.position+Vector3.up,.8f,10,Vector3.zero,fireAttack:true);
                    Check(normal.Health==90,"Fire direct hit missing");Check(normal.GetComponent<BurningStatus>().DamagePerSecond==4,"Normal burn rate wrong");health=normal.Health;Next(2,.7f);return;
                }
                if(step==2)
                {
                    Check(normal.Health<health,"Burn does not deal delayed damage");time=normal.GetComponent<BurningStatus>().Remaining;BurningStatus.Ignite(normal,false);Check(normal.GetComponents<BurningStatus>().Length==1&&normal.GetComponent<BurningStatus>().Remaining>time,"Burn refresh stacked or did not extend");
                    normal.transform.position=player.transform.position+Vector3.right*30;powers.Ultimate=100;health=awakened.Health;
                    Check(powers.CastUltimate()&&powers.FireEmpowered,"Inferno not activated");Check(awakened.Health==health-45,"Ultimate initial explosion missing or repeated");Check(awakened.GetComponent<BurningStatus>().DamagePerSecond==8,"Awakened burn not stronger");Check(GameObject.Find("Inferno Awakening fiery aura")&&GameObject.Find("Spiralling inferno"),"Aura or spiral missing");Check(!powers.CastUltimate(),"Ultimate recast accepted while empowered");expiry=Time.time+InfernoAwakening.Duration;health=awakened.Health;Next(3,.7f);return;
                }
                if(step==3)
                {
                    Check(awakened.Health<health,"Empowered burn does not tick");BurningStatus.Ignite(awakened,false);Check(awakened.GetComponents<BurningStatus>().Length==1&&awakened.GetComponent<BurningStatus>().DamagePerSecond==8,"Weaker fire stacks or downgrades stronger burn");
                    Check(powers.Cast(0)&&GameObject.Find("Flame Dash ankle fire"),"Regular fire skills blocked by awakening");
                    vehicle=RoadNetwork.Instance.Vehicles[0];vehicle.Integrity=100;BurningStatus.Ignite(vehicle,true);Next(4,1);return;
                }
                if(step==4)
                {
                    Check(vehicle.Integrity<100,"Vehicle burning missing");Next(5,4.2f);return;
                }
                if(step==5)
                {
                    Check(!normal.GetComponent<BurningStatus>()&&!awakened.GetComponent<BurningStatus>(),"Burn did not expire");health=awakened.Health;Check(powers.FireEmpowered,"Awakening ended early");Next(6,Mathf.Max(.1f,expiry-Time.time+.2f));return;
                }
                if(step==6)
                {
                    Check(!powers.FireEmpowered&&!GameObject.Find("Inferno Awakening fiery aura"),"Awakening or aura outlived duration");Check(awakened.Health==health,"Burn damage continued after expiry");powers.Ultimate=100;Check(powers.CastUltimate(),"Cannot awaken again after expiry");powers.SelectElement(2);Check(!powers.FireEmpowered,"Element switch did not end aura");Next(7,.1f);return;
                }
                Check(errors.Count==0,string.Join("; ",errors));Directory.CreateDirectory("Logs");File.WriteAllText("Logs/inferno-check.json","{\"passed\":true,\"immediateBlast\":true,\"normalAndEnhancedBurn\":true,\"refreshWithoutStacking\":true,\"finiteDuration\":true,\"vehicleBurn\":true,\"auraCleanup\":true}");Debug.Log("PASS: Inferno blast, spiral aura, empowered abilities, normal/enhanced burning, refresh without stacking, vehicle burn, expiry and element-switch cleanup");SessionState.SetBool(Key,false);EditorApplication.Exit(0);
            }
            catch(Exception error){Debug.LogException(error);SessionState.SetBool(Key,false);EditorApplication.Exit(1);}
        }
    }
}
