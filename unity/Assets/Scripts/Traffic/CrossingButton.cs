using UnityEngine;
namespace AnotherWorld.Traffic
{
    public sealed class CrossingButton : MonoBehaviour
    {
        public Junction Junction;
        public TravelAxis Axis;
        public GameObject RequestedLight;
        public void Press(){Junction.Rules.RequestCrossing(Axis);}
        void Update(){if(RequestedLight)RequestedLight.SetActive((Junction.Rules.PendingCrossings&(Axis==TravelAxis.X?CrossingDemand.X:CrossingDemand.Z))!=0);}
    }
}
