using UnityEngine;
using AnotherWorld.Traffic;
namespace AnotherWorld.World
{
    public static class RegionalWorld
    {
        public static void Build(Transform scenery,Transform moving,Material road,Material paving,Material grass)
        {
            // Original regional coordinates from places.js and world-expansion.js.
            WorldShapes.Box(scenery,"Northhaven connecting road",new Vector3(780,.08f,28),new Vector3(598,.01f,-64),road,true);
            WorldShapes.Box(scenery,"Airport access road",new Vector3(560,.08f,28),new Vector3(-488,.01f,64),road,true);
            CivicArchitecture.Build(scenery,new Vector3(410,0,-96),"police","Ashford Police Headquarters");
            CivicArchitecture.Build(scenery,new Vector3(-661,0,80),"airport","Ashford Regional Airport");
            var asphalt=WorldShapes.Material("Runway asphalt",new Color(.27f,.29f,.3f));var white=WorldShapes.Material("Runway paint",Color.white);
            WorldShapes.Box(scenery,"Airport runway",new Vector3(48,.08f,480),new Vector3(-550,.01f,100),asphalt,true);
            WorldShapes.Box(scenery,"Aircraft apron",new Vector3(100,.08f,110),new Vector3(-635,.02f,0),asphalt,true);
            for(int n=0;n<24;n++)WorldShapes.Box(scenery,"Runway centre marking",new Vector3(1,.015f,8),new Vector3(-550,.06f,-120+n*19),white);
            for(int i=0;i<12;i++)
            {var person=WorldShapes.Person(moving,new Color(.4f,.36f,.27f));person.position=new Vector3(-670+i%4*4,.3f,70+i/4*4);}
        }
    }
}
