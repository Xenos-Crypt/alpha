using UnityEngine;
namespace AnotherWorld.World
{
    public sealed class WorldFacility : MonoBehaviour
    {
        public string Name,Kind,Description,Action;
        public Vector3 Door;
        public bool HasLookAt;
        public Vector3 LookAt;
        public bool HasUseAt;
        public Vector3 UseAt;
        public int Level;
        public bool Looted;
        public Traffic.TrafficVehicle Vehicle;
    }
}
