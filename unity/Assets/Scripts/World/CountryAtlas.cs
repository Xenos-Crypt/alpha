using System;
using UnityEngine;
namespace AnotherWorld.World
{
    [Serializable] public sealed class CountryDefinition
    {
        public string id,name,source;
        public string[] cities;
    }
    [Serializable] public sealed class CountryCatalogue { public CountryDefinition[] countries; }
    public static class CountryAtlas
    {
        static CountryCatalogue catalogue;
        public static CountryCatalogue Catalogue
        {
            get{if(catalogue==null)catalogue=JsonUtility.FromJson<CountryCatalogue>(Resources.Load<TextAsset>("World/atlas").text);return catalogue;}
        }
        public static CountryDefinition Current=>Catalogue.countries[0];
    }
}
