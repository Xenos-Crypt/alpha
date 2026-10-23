using UnityEngine;
namespace AnotherWorld.World
{
    public sealed class HouseRoof : MonoBehaviour
    {
        public GameObject Roof;
        public float HalfWidth=6,HalfDepth=5;
        public float CeilingHeight=float.PositiveInfinity;
        public bool CutawayOnlyInThirdPerson;
        NeighbourhoodPlayer movement;
        void LateUpdate()
        {
            var player=Traffic.RoadNetwork.Instance?.Player;if(!player)return;
            var p=transform.InverseTransformPoint(player.position);
            if(!movement)movement=player.GetComponent<NeighbourhoodPlayer>();
            bool cutaway=!CutawayOnlyInThirdPerson||!movement||movement.IsThirdPerson;
            Roof.SetActive(!(cutaway&&Mathf.Abs(p.x)<HalfWidth&&Mathf.Abs(p.z)<HalfDepth&&p.y<CeilingHeight));
        }
    }
}
