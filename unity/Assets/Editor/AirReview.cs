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
    [InitializeOnLoad] public static class AirReview
    {
        const string Key="Hidrok.AirReview";static readonly List<string> errors=new List<string>();
        static CrossingWalker caught,far,blocked,ranged;static GameObject wall;static float originY,health;static int craters;
        static AirReview(){if(SessionState.GetBool(Key,false))Hook();}
        static void Hook(){EditorApplication.update-=Tick;EditorApplication.update+=Tick;Application.logMessageReceived+=Log;}
        static void Log(string message,string stack,LogType type){if(type==LogType.Error||type==LogType.Exception||type==LogType.Assert)errors.Add(message);}
        static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
        public static void Run(){ProjectSetup.Setup();EditorSceneManager.OpenScene("Assets/Scenes/Neighbourhood.unity");SessionState.SetBool(Key,true);SessionState.SetInt(Key+"stage",0);Hook();EditorApplication.EnterPlaymode();}
        static void Next(int step,float delay){SessionState.SetInt(Key+"stage",step);SessionState.SetFloat(Key+"time",Time.time+delay);}
        static CrossingWalker Target(Vector3 point){var go=WorldShapes.Person(null,Color.gray);go.position=point;var walker=go.gameObject.AddComponent<CrossingWalker>();walker.TrainingTarget=true;var capsule=go.gameObject.AddComponent<CapsuleCollider>();capsule.height=1.8f;capsule.radius=.3f;capsule.center=Vector3.up*.9f;return walker;}
        static void Place(NeighbourhoodPlayer player,Vector3 point){var body=player.GetComponent<CharacterController>();body.enabled=false;player.transform.position=point;body.enabled=true;player.Face(point+Vector3.forward*30);}
        static void Tick()
        {
            EditorApplication.QueuePlayerLoopUpdate();if(!EditorApplication.isPlaying||Time.time<1||Time.time<SessionState.GetFloat(Key+"time",0)||!RoadNetwork.Instance)return;
            try
            {
                var player=RoadNetwork.Instance.Player.GetComponent<NeighbourhoodPlayer>();var powers=player.Powers;if(!powers||!powers.EarthWind||!powers.EarthWind.Air)return;var air=powers.EarthWind.Air;
                int step=SessionState.GetInt(Key+"stage",0);
                if(step==0)
                {
                    Place(player,new Vector3(-820,.3f,122));powers.SelectElement(1);powers.Energy=100;originY=player.transform.position.y;
                    Check(powers.Cast(0)&&air.Flying&&GameObject.Find("Gale Flight limb trails"),"Flight activation or limb trails missing");air.Move(Vector3.zero,.5f,1);Check(player.transform.position.y>originY+3,"Flight did not lift freely");Check(!powers.Invulnerable,"Flight incorrectly grants invulnerability");Next(1,8.15f);return;
                }
                if(step==1){Check(!air.Flying&&air.Landing,"Flight did not transition to controlled landing");Next(2,2);return;}
                if(step==2)
                {
                    Check(!air.Landing&&player.transform.position.y<.5f,"Controlled landing did not reach ground");Place(player,new Vector3(-820,.3f,122));caught=Target(new Vector3(-817,.1f,126));far=Target(new Vector3(-809,.1f,126));blocked=Target(new Vector3(-820,.1f,131));
                    wall=WorldShapes.Box(null,"Wind test wall",new Vector3(2,4,.5f),new Vector3(-820,2,129),WorldShapes.Material("Wind test",Color.gray),true,false);Next(3,.1f);return;
                }
                if(step==3){powers.Energy=100;Check(powers.Cast(1)&&air.Active&&!air.CycloneVisible,"Cyclone missing cast wind-up");Check(Mathf.Abs(powers.Cooldowns[1]-8)<.1f,"Cyclone cooldown is not 8 seconds");Next(4,1.6f);return;}
                if(step==4)
                {
                    Check(air.CycloneVisible&&GameObject.Find("Transparent air funnel"),"Cyclone funnel not formed");Check(caught.Health<100&&caught.GetComponent<WindSuspension>()&&caught.transform.position.y>1,"Cyclone did not damage and visibly lift target");Check(far.Health==100&&!far.GetComponent<WindSuspension>(),"Cyclone exceeded radius");Check(blocked.Health==100&&!blocked.GetComponent<WindSuspension>(),"Cyclone pulled through a wall");health=caught.Health;Next(5,2.8f);return;
                }
                if(step==5)
                {
                    Check(!air.Active&&!air.CycloneVisible&&caught.Health<health,"Cyclone did not repeatedly damage or end");var lift=caught.GetComponent<WindSuspension>();Check(!lift||!lift.Caught,"Cyclone did not release target");UnityEngine.Object.Destroy(wall);Next(6,1.4f);return;
                }
                if(step==6)
                {
                    Check(!caught.GetComponent<WindSuspension>()&&caught.transform.position.y<.4f,"Released target did not land");caught.transform.position+=Vector3.right*40;blocked.transform.position+=Vector3.right*40;far.transform.position+=Vector3.right*40;Place(player,new Vector3(-820,.3f,122));ranged=Target(new Vector3(-820,.1f,138));Next(7,.1f);return;
                }
                if(step==7){powers.Energy=100;powers.Cooldowns[2]=0;Check(powers.Cast(2)&&air.LastEffect=="Wind Blades","Ranged Wind Blades missing");Next(8,2.8f);return;}
                if(step==8)
                {
                    Check(ranged.Health<100,"Wind Blades failed to hit a distant target: health="+ranged.Health);Check(!air.BladesVisible,"Wind Blades did not expire");Place(player,new Vector3(-820,.3f,122));caught.transform.position=player.transform.position+Vector3.right*3;caught.Health=100;craters=ImpactCrater.ActiveCount;powers.Energy=100;powers.Cooldowns[3]=0;
                    Check(powers.Cast(3)&&air.Active,"Sky Breaker did not start");Next(9,2.1f);return;
                }
                if(step==9)
                {
                    Check(air.SlamImpact&&!air.Active&&ImpactCrater.ActiveCount>craters&&caught.Health<100&&caught.Stunned,"Sky Breaker did not slam, dent and stun");Check(!StormSurge.Current,"Sky Breaker summoned old weather behavior");powers.Ultimate=100;Check(powers.CastUltimate()&&air.Empowered&&GameObject.Find("Sky Dominion awakening aura"),"Sky Dominion awakening missing");powers.Energy=100;powers.Cooldowns[0]=0;Check(powers.Cast(0)&&air.Flying,"Sky Dominion blocked regular skills");Next(10,12.3f);return;
                }
                if(step==10)
                {
                    Check(!air.Empowered&&!GameObject.Find("Sky Dominion awakening aura"),"Sky Dominion did not expire");powers.Ultimate=100;Check(powers.CastUltimate(),"Sky Dominion could not recharge");powers.SelectElement(2);Check(!air.Empowered&&!air.ControlsMovement,"Switching elements left Air effects active");Next(11,.1f);return;
                }
                Check(errors.Count==0,string.Join("; ",errors));Directory.CreateDirectory("Logs");File.WriteAllText("Logs/air-check.json","{\"passed\":true,\"flightAndControlledLanding\":true,\"cycloneTimingRadiusPullLiftDamageRelease\":true,\"wallOcclusion\":true,\"rangedBlades\":true,\"aerialSlam\":true,\"skyDominionExpiryAndCleanup\":true}");Debug.Log("PASS: Air flight/landing, cyclone timing/radius/pull/lift/ticks/release, wall occlusion, ranged blades, Sky Breaker slam and Sky Dominion awakening");SessionState.SetBool(Key,false);EditorApplication.Exit(0);
            }
            catch(Exception error){Debug.LogException(error);SessionState.SetBool(Key,false);EditorApplication.Exit(1);}
        }
    }
}
