using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using AnotherWorld.World;
using AnotherWorld.Traffic;
namespace AnotherWorld.Editor
{
    [InitializeOnLoad]
    public static class PowerPresentationReview
    {
        const string Key="Hidrok.PowerPresentationReview";
        static readonly List<string> errors=new List<string>();static GameObject wall;static CrossingWalker dummy;
        static PowerPresentationReview(){if(SessionState.GetBool(Key,false))Hook();}
        static void Hook(){EditorApplication.update-=Tick;EditorApplication.update+=Tick;Application.logMessageReceived-=Log;Application.logMessageReceived+=Log;}
        static void Log(string message,string stack,LogType type){if(type==LogType.Error||type==LogType.Exception||type==LogType.Assert)errors.Add(message);}
        static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
        public static void Run(){ProjectSetup.Setup();EditorSceneManager.OpenScene("Assets/Scenes/Neighbourhood.unity");SessionState.SetBool(Key,true);SessionState.SetInt(Key+"stage",0);Hook();EditorApplication.EnterPlaymode();}
        static void Next(int step,float wait){SessionState.SetInt(Key+"stage",step);SessionState.SetFloat(Key+"time",Time.time+wait);}
        static void Tick()
        {
            EditorApplication.QueuePlayerLoopUpdate();if(!EditorApplication.isPlaying||Time.time<1||Time.time<SessionState.GetFloat(Key+"time",0)||!RoadNetwork.Instance)return;
            try
            {
                var player=RoadNetwork.Instance.Player.GetComponent<NeighbourhoodPlayer>();var powers=player.Powers;var fx=powers.Presentation;if(!fx)return;
                int step=SessionState.GetInt(Key+"stage",0);
                if(step==0)
                {
                    var body=player.GetComponent<CharacterController>();body.enabled=false;player.transform.position=new Vector3(-820,.3f,122);body.enabled=true;player.Face(new Vector3(-820,0,180));powers.SelectElement(0);powers.Energy=100;
                    Check(powers.Cast(3)&&fx.Targeting,"Meteor does not enter pointer targeting mode");Check(powers.Energy==100,"Meteor spends energy before confirmation");
                    Check(powers.CommitMeteor(new Vector3(-820,.05f,150))&&!fx.Targeting&&powers.Energy==85,"Meteor confirmation or energy reservation failed");Next(1,2.1f);return;
                }
                if(step==1)
                {
                    Check(!fx.Active&&Vector3.Distance(fx.LastImpact,new Vector3(-820,.05f,150))<.1f&&ImpactCrater.ActiveCount>0,"Meteor did not strike its chosen position");
                    Check(Physics.Raycast(new Vector3(-820,3,150),Vector3.down,out var ground,8)&&ground.point.y<-.6f,"Meteor crater did not dent ground collision");
                    powers.Energy=100;Check(powers.Cast(0)&&fx.LastEffect=="Flame Dash","Flame Dash did not start");Check(UnityEngine.Object.FindObjectsByType<ParticleSystem>().Length>=2,"Flame Dash missing ankle flames");Next(2,.9f);return;
                }
                if(step==2){Check(powers.Cast(1)&&GameObject.Find("Rising Blaze sword"),"Rising Blaze missing actual sword");Next(3,.9f);return;}
                if(step==3)
                {
                    powers.SelectElement(2);powers.Energy=100;powers.Cooldowns[0]=0;var before=player.transform.position;
                    Check(powers.Cast(0)&&fx.Phasing&&powers.Invulnerable,"Water Dash did not enter puddle form");player.Health=100;player.Health=25;Check(player.Health==100,"Puddle form takes damage");
                    wall=GameObject.CreatePrimitive(PrimitiveType.Cube);wall.transform.position=before+Vector3.forward*2+Vector3.up;wall.transform.localScale=new Vector3(6,3,.3f);Physics.SyncTransforms();player.MoveOnFoot(Vector3.forward,false,.5f);
                    Check(player.transform.position.z>before.z+4.9f,"Puddle form cannot pass through solid objects");Next(4,3.3f);return;
                }
                if(step==4)
                {
                    Check(!fx.Phasing&&!powers.Invulnerable&&player.GetComponent<CharacterController>().enabled,"Water Dash did not expire after three seconds");player.Health=75;Check(player.Health==75,"Invulnerability persists after Water Dash");UnityEngine.Object.DestroyImmediate(wall);
                    powers.Energy=100;powers.Cooldowns[1]=0;Check(powers.Cast(1)&&GameObject.Find("Pressurized water column"),"Geyser does not produce a water fountain");Next(5,1.9f);return;
                }
                if(step==5){powers.Cooldowns[2]=0;Check(powers.Cast(2)&&GameObject.Find("Curving water barrage"),"Water Barrage missing curved water stream");Next(6,1.7f);return;}
                if(step==6)
                {
                    powers.Energy=100;powers.Cooldowns[3]=0;Check(powers.Cast(3),"Tsunami cast failed");var wave=GameObject.Find("Travelling tsunami");Check(wave&&wave.GetComponent<MeshFilter>().sharedMesh.bounds.max.y>=5.9f,"Tsunami is not a full-height curling wave");Next(7,3.5f);return;
                }
                if(step==7)
                {
                    Check(!fx.Active,"Tsunami did not finish");powers.SelectElement(3);powers.Energy=100;powers.Cooldowns[0]=0;
                    var target=WorldShapes.Person(null,Color.gray);target.name="Elemental training opponent";target.position=player.transform.position+Vector3.forward*1.7f;dummy=target.gameObject.AddComponent<CrossingWalker>();dummy.TrainingTarget=true;dummy.Waypoints=new[]{target.position,target.position};
                    Next(71,.1f);return;
                }
                if(step==71){Check(powers.Cast(0)&&powers.EarthWind.LastEffect=="Bull Charge","Bull charge did not start");Next(8,1);return;}
                if(step==8)
                {
                    Check(dummy.Health<100&&dummy.Stunned,"Bull charge failed to damage and stun opponent: health="+dummy.Health+" stunned="+dummy.Stunned);powers.Cooldowns[1]=0;powers.Energy=100;Check(powers.Cast(1)&&powers.EarthWind.StoneFists&&GameObject.Find("Stone-covered fist"),"Stone Fist missing gauntlets or punch buff");
                    dummy.Health=100;dummy.transform.position=player.transform.position+Vector3.forward*1.8f;Check(powers.Punch()&&dummy.Health<=78,"Stone Fist did not increase punch damage");Next(9,.7f);return;
                }
                if(step==9){powers.Cooldowns[2]=0;dummy.Health=100;dummy.transform.position=player.transform.position+Vector3.forward*6;Check(powers.Cast(2)&&GameObject.Find("Flying jagged rock"),"Rock Barrage missing sharp rock projectiles");Next(10,1.5f);return;}
                if(step==10)
                {
                    Check(dummy.Health<100,"Rock barrage did not damage opponent");powers.Cooldowns[3]=0;powers.Energy=100;dummy.transform.position=player.transform.position+Vector3.forward*2;Check(powers.Cast(3),"Ground Pound did not start");Next(11,1.4f);return;
                }
                if(step==11)
                {
                    Check(dummy.Stunned&&ImpactCrater.ActiveCount>=2,"Ground Pound did not dent and stun");powers.SelectElement(1);powers.Cooldowns[0]=0;powers.Energy=100;Check(powers.Cast(0)&&powers.EarthWind.Flying,"Gale Flight did not start");float altitude=player.transform.position.y;powers.EarthWind.MoveFlight(Vector3.zero,.5f,1);Check(player.transform.position.y>altitude+2,"Gale cannot freely fly upward");
                    powers.Cooldowns[1]=0;Check(powers.Cast(1)&&powers.EarthWind.Air.Active,"Cyclone does not begin its cast");Next(12,4.4f);return;
                }
                if(step==12){powers.Cooldowns[2]=0;Check(powers.Cast(2)&&GameObject.Find("Ranged cutting wind blade"),"Wind Blades missing ranged crescents");Next(13,1.8f);return;}
                if(step==13){powers.Cooldowns[3]=0;powers.Energy=100;Check(powers.Cast(3)&&powers.EarthWind.Air.Active,"Sky Breaker did not start its aerial slam");Next(14,3);return;}
                Check(powers.EarthWind.Air.SlamImpact,"Sky Breaker did not impact the ground");
                Check(!fx.Active&&errors.Count==0,string.Join("; ",errors));Check(NeighbourhoodLife.Residents>350&&NeighbourhoodLife.Children>50&&NeighbourhoodLife.Flowers>1000&&NeighbourhoodLife.Butterflies>=30&&NeighbourhoodLife.Ducks==10,"Living neighbourhood content missing");
                Check(RoadNetwork.Instance.Vehicles.Count>=100,"Traffic density increase missing");
                Directory.CreateDirectory("Logs");File.WriteAllText("Logs/power-presentation-check.json","{\"passed\":true,\"targetedMeteorAndGroundDent\":true,\"ankleFlames\":true,\"swordUppercut\":true,\"threeSecondInvulnerableWaterPhase\":true,\"geyser\":true,\"curvedWaterBarrage\":true,\"curlingTsunami\":true,\"residents\":"+NeighbourhoodLife.Residents+",\"children\":"+NeighbourhoodLife.Children+",\"flowers\":"+NeighbourhoodLife.Flowers+",\"ducks\":"+NeighbourhoodLife.Ducks+"}");
                Debug.Log("PASS: four elemental kits, meteor dent, timed invulnerability, bull stun, boosted stone punches, rock hits, ground-pound stun, flight, cyclones, cutting wind, aerial slam and living neighbourhoods");SessionState.SetBool(Key,false);EditorApplication.Exit(0);
            }
            catch(Exception error){Debug.LogException(error);SessionState.SetBool(Key,false);EditorApplication.Exit(1);}
        }
    }
}
