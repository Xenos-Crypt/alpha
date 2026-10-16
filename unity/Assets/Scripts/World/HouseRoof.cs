using UnityEngine;
namespace AnotherWorld.World
{
    public sealed class HouseRoof : MonoBehaviour
    {
        public GameObject Roof;
        public float HalfWidth=6,HalfDepth=5;
        void LateUpdate()
        {
            var player=Traffic.RoadNetwork.Instance?.Player;if(!player)return;
            var p=transform.InverseTransformPoint(player.position);
            Roof.SetActive(!(Mathf.Abs(p.x)<HalfWidth&&Mathf.Abs(p.z)<HalfDepth));
        }
    }
}
