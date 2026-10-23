using UnityEngine;
namespace AnotherWorld.World
{
    // The built-in text shader draws both faces. Hide a rear-facing marking
    // when the viewer is on its back side instead of showing mirrored letters.
    public sealed class VehicleMarking : MonoBehaviour
    {
        Renderer marking;
        void Awake(){marking=GetComponent<Renderer>();}
        void LateUpdate(){var camera=Camera.main;if(marking&&camera)marking.enabled=Vector3.Dot(camera.transform.position-transform.position,transform.forward)<0;}
    }
}
