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
    [InitializeOnLoad] public static class VillaReview
    {
        const string Key="Hidrok.VillaReview";static readonly List<string> errors=new List<string>();static Transform villa;static VillaDetail detail;static int steps;
        static VillaReview(){if(SessionState.GetBool(Key,false))Hook();}
        static void Hook(){EditorApplication.update-=Tick;EditorApplication.update+=Tick;Application.logMessageReceived+=Log;}
        static void Log(string message,string stack,LogType type){if((type==LogType.Error||type==LogType.Exception||type==LogType.Assert)&&!errors.Contains(message))errors.Add(message);}
        static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
        public static void Run(){ProjectSetup.Setup();EditorSceneManager.OpenScene("Assets/Scenes/Neighbourhood.unity");SessionState.SetBool(Key,true);SessionState.SetInt(Key+"stage",0);Hook();EditorApplication.EnterPlaymode();}
        static void Next(int step,float delay){SessionState.SetInt(Key+"stage",step);SessionState.SetFloat(Key+"time",Time.time+delay);}
        static void Place(NeighbourhoodPlayer player,Vector3 point){var body=player.GetComponent<CharacterController>();body.enabled=false;player.transform.position=point;body.enabled=true;player.Face(point+Vector3.forward*30);}
        static void Tick()
        {
            EditorApplication.QueuePlayerLoopUpdate();if(!EditorApplication.isPlaying||Time.time<1||Time.time<SessionState.GetFloat(Key+"time",0)||!RoadNetwork.Instance)return;
            try
            {
                var player=RoadNetwork.Instance.Player.GetComponent<NeighbourhoodPlayer>();int step=SessionState.GetInt(Key+"stage",0);
                if(step==0)
                {
                    var homes=UnityEngine.Object.FindObjectsByType<VillaDetail>(FindObjectsInactive.Include,FindObjectsSortMode.None);
                    Check(homes.Length>10,"Expected villa homes throughout the generated world, not only the showcase");
                    bool compact=false,regional=false;
                    foreach(var home in homes)
                    {
                        Check(home.Interior&&home.Panes.Length==6&&home.ClearGlass.shader.name=="AnotherWorld/VillaGlass","A regional house is missing the shared glass villa design");
                        compact|=home.transform.localScale.x<.9f;
                        regional|=Vector3.Distance(home.transform.position,new Vector3(32,0,32))>500;
                    }
                    Check(compact&&regional,"Villa design was not applied to both compact city plots and distant regional homes");
                    Debug.Log("PASS: shared glass villa design on "+homes.Length+" homes, including compact and regional plots");
                    var place=CityServices.Instance.Places.Find(p=>p.Name=="Hidrok Glass Villa");Check(place&&place.HasLookAt,"Villa map destination missing");villa=place.transform;detail=villa.GetComponent<VillaDetail>();Check(detail&&detail.Interior,"Villa detail group missing");Check(detail.Panes.Length==6&&detail.ClearGlass.shader.name=="AnotherWorld/VillaGlass"&&detail.ClearGlass.renderQueue>=2500,"Glazing is not transparent");
                    int cushions=0,curtains=0,pools=0,lights=0;foreach(var child in villa.GetComponentsInChildren<Transform>(true)){if(child.name=="Linen seat cushion")cushions++;if(child.name=="Pleated full-height curtain")curtains++;if(child.name=="Rippled reflecting water"){pools++;Check(child.GetComponent<Renderer>().sharedMaterial.shader.name=="AnotherWorld/VillaWater","Pool water shader missing");}if(child.name=="Cyan roofline")lights++;}
                    Check(cushions==3&&curtains==4&&pools==3&&lights==4,"Villa furniture, curtains, pools or lighting missing");player.Powers.SelectElement(0);Place(player,villa.TransformPoint(new Vector3(0,.3f,-11.3f)));steps=0;Next(1,.1f);return;
                }
                if(step==1)
                {
                    player.MoveOnFoot(Vector3.forward,false,.05f);steps++;var p=villa.InverseTransformPoint(player.transform.position);if(p.z<-3.7f&&steps<100)return;
                    Check(p.z>-4&&p.y>.7f&&p.y<1.2f,"Player cannot walk over lit steps into raised villa: "+p);Next(2,.1f);return;
                }
                if(step==2)
                {
                    Check(!villa.GetComponent<HouseRoof>().Roof.activeSelf,"Villa roof obstructs inside camera");Place(player,villa.TransformPoint(new Vector3(3,.85f,-4)));for(int i=0;i<12;i++)player.GetComponent<CharacterController>().Move(Vector3.back*.35f);Check(villa.InverseTransformPoint(player.transform.position).z>-5,"Player passes through front glass");
                    Place(player,villa.TransformPoint(new Vector3(0,7,0)));player.GetComponent<CharacterController>().Move(Vector3.down*8);Check(villa.InverseTransformPoint(player.transform.position).y>4.4f,"Player falls through roof");Next(3,.1f);return;
                }
                if(step==3)
                {
                    Check(villa.GetComponent<HouseRoof>().Roof.activeSelf,"Roof disappears when player stands above it");Place(player,villa.position+new Vector3(110,.3f,0));Next(4,1.2f);return;
                }
                if(step==4)
                {
                    Check(!detail.Interior.activeSelf&&detail.Panes[0].sharedMaterial!=detail.ClearGlass,"Distant villa detail was not reduced");Place(player,villa.TransformPoint(new Vector3(0,.3f,-10)));Rendering.ScalableQuality.Instance.SetQuality("Low");Next(5,1.2f);return;
                }
                if(step==5){Check(detail.Interior.activeSelf&&detail.Panes[0].sharedMaterial==detail.ClearGlass,"Nearby glazing and furniture were not restored");Check(!detail.RoomLight.enabled,"Low quality enabled dynamic villa light");Check(errors.Count==0,string.Join("; ",errors));Directory.CreateDirectory("Logs");File.WriteAllText("Logs/villa-check.json","{\"passed\":true,\"transparentGlazing\":true,\"furnishedInterior\":true,\"litStairsTraversable\":true,\"glassAndRoofCollision\":true,\"poolMaterials\":true,\"distanceDetail\":true,\"lowQualityLighting\":true}");Debug.Log("PASS: glass villa glazing, furniture, curtains, water, roof/step/glass collision, distance detail and Low lighting");SessionState.SetBool(Key,false);EditorApplication.Exit(0);}
            }
            catch(Exception error){Debug.LogException(error);SessionState.SetBool(Key,false);EditorApplication.Exit(1);}
        }
    }
}
